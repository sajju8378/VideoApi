import EventEmitter from 'events';
import { db, GenerationJob, JobStatus } from '../database/db';
import { modelManager } from '../inference/modelManager';
import { storage } from '../storage/localStorageProvider';
import { GenerationSettings } from '../inference/types';

export interface ProgressEventPayload {
  job_id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  message?: string;
  details?: Record<string, any>;
  timestamp: string;
}

class JobQueueService extends EventEmitter {
  private queue: string[] = []; // Job IDs waiting
  private activeJobId: string | null = null;
  private isProcessing: boolean = false;
  private sseSubscribers: Map<string, Set<(event: ProgressEventPayload) => void>> = new Map();
  private cancellationTokens: Set<string> = new Set();

  constructor() {
    super();
    // Maximum event listeners for high concurrency
    this.setMaxListeners(100);
  }

  /**
   * Enqueue a job for execution
   */
  async enqueue(jobId: string) {
    this.queue.push(jobId);
    this.emitProgress(jobId, {
      job_id: jobId,
      status: 'queued',
      progress: 0,
      stage: 'queued',
      message: `Job queued at position #${this.queue.length}`,
      timestamp: new Date().toISOString(),
    });

    this.processNext();
  }

  /**
   * Register an SSE listener for real-time progress updates
   */
  subscribe(jobId: string, listener: (event: ProgressEventPayload) => void): () => void {
    if (!this.sseSubscribers.has(jobId)) {
      this.sseSubscribers.set(jobId, new Set());
    }
    this.sseSubscribers.get(jobId)!.add(listener);

    // Send immediate current state
    const job = db.getJobById(jobId);
    if (job) {
      listener({
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        message: job.error_message || `Current status: ${job.status}`,
        timestamp: new Date().toISOString(),
      });
    }

    return () => {
      const set = this.sseSubscribers.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.sseSubscribers.delete(jobId);
        }
      }
    };
  }

  private emitProgress(jobId: string, payload: ProgressEventPayload) {
    db.updateJob(jobId, {
      status: payload.status,
      progress: payload.progress,
      stage: payload.stage,
      ...(payload.details ? { error_details: payload.details } : {}),
    });

    const listeners = this.sseSubscribers.get(jobId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {}
      }
    }
    this.emit('progress', payload);
  }

  /**
   * Cancel an in-flight or queued job
   */
  cancelJob(jobId: string): boolean {
    const queueIndex = this.queue.indexOf(jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.emitProgress(jobId, {
        job_id: jobId,
        status: 'cancelled',
        progress: 0,
        stage: 'cancelled',
        message: 'Job was cancelled before execution started',
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (this.activeJobId === jobId) {
      this.cancellationTokens.add(jobId);
      this.emitProgress(jobId, {
        job_id: jobId,
        status: 'cancelled',
        progress: 0,
        stage: 'cancelled',
        message: 'Job cancelled by user request',
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    return false;
  }

  private async processNext() {
    if (this.isProcessing || this.activeJobId !== null || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const jobId = this.queue.shift()!;
    this.activeJobId = jobId;

    try {
      const job = db.getJobById(jobId);
      if (!job) {
        this.activeJobId = null;
        this.isProcessing = false;
        this.processNext();
        return;
      }

      if (this.cancellationTokens.has(jobId)) {
        this.cancellationTokens.delete(jobId);
        this.activeJobId = null;
        this.isProcessing = false;
        this.processNext();
        return;
      }

      const upload = db.getUploadById(job.input_image_id);
      const params = db.getParametersById(job.parameter_id);

      if (!upload || !params) {
        throw new Error('CORRUPTED_JOB: Input image or parameters not found');
      }

      const inputImagePath = storage.getFilePath(upload.storage_path);
      const model = modelManager.getModel(params.model_id);

      db.updateJob(jobId, {
        status: 'preparing',
        started_at: new Date().toISOString(),
      });

      const settings: GenerationSettings = {
        duration: params.duration_seconds,
        fps: params.fps,
        resolution: params.resolution,
        aspectRatio: params.aspect_ratio,
        width: params.width,
        height: params.height,
        seed: params.seed,
        cameraMotion: params.camera_motion,
        motionStrength: params.motion_strength,
        preserveSubject: params.preserve_subject,
        cameraMovement: params.camera_movement,
        backgroundMovement: params.background_movement,
        facialStability: params.facial_stability,
        temporalConsistency: params.temporal_consistency,
        qualityPreset: params.quality_preset as any,
        negativePrompt: params.negative_prompt,
      };

      const result = await model.generate(
        jobId,
        inputImagePath,
        params.prompt,
        settings,
        (stage, progressPercent, details) => {
          if (this.cancellationTokens.has(jobId)) {
            throw new Error('JOB_CANCELLED: Execution cancelled by user');
          }

          let mappedStatus: JobStatus = 'generating';
          if (stage === 'preparing') mappedStatus = 'preparing';
          else if (stage === 'loading') mappedStatus = 'loading';
          else if (stage === 'post_processing') mappedStatus = 'post_processing';
          else if (stage === 'encoding') mappedStatus = 'encoding';
          else if (stage === 'completed') mappedStatus = 'completed';

          this.emitProgress(jobId, {
            job_id: jobId,
            status: mappedStatus,
            progress: progressPercent,
            stage,
            message: details?.message,
            details,
            timestamp: new Date().toISOString(),
          });
        }
      );

      // Create output record
      db.createOutput({
        job_id: jobId,
        video_storage_path: result.videoPath,
        thumbnail_storage_path: result.thumbnailPath,
        file_size_bytes: result.fileSizeBytes,
        duration_seconds: result.durationSeconds,
        video_codec: 'h264',
        container_format: 'mp4',
        fps: result.fps,
        width: result.width,
        height: result.height,
        aspect_ratio: params.aspect_ratio,
      });

      db.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        stage: 'completed',
        completed_at: new Date().toISOString(),
        generation_duration_ms: result.hardwareUsed.durationMs,
        hardware_used: result.hardwareUsed,
      });

      this.emitProgress(jobId, {
        job_id: jobId,
        status: 'completed',
        progress: 100,
        stage: 'completed',
        message: 'Generation completed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const isCancelled = err.message?.includes('CANCELLED') || this.cancellationTokens.has(jobId);
      const errorCode = err.code || (isCancelled ? 'JOB_CANCELLED' : 'INFERENCE_FAILED');
      const errorMessage = err.message || 'An unexpected error occurred during generation';

      db.updateJob(jobId, {
        status: isCancelled ? 'cancelled' : 'failed',
        stage: isCancelled ? 'cancelled' : 'failed',
        error_code: errorCode,
        error_message: errorMessage,
        error_details: err.details || null,
        completed_at: new Date().toISOString(),
      });

      this.emitProgress(jobId, {
        job_id: jobId,
        status: isCancelled ? 'cancelled' : 'failed',
        progress: 0,
        stage: isCancelled ? 'cancelled' : 'failed',
        message: errorMessage,
        details: { errorCode, details: err.details },
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.cancellationTokens.delete(jobId);
      this.activeJobId = null;
      this.isProcessing = false;
      // Trigger next job in queue
      setImmediate(() => this.processNext());
    }
  }

  getQueueStatus() {
    return {
      active_job_id: this.activeJobId,
      queued_count: this.queue.length,
      queued_job_ids: [...this.queue],
      is_busy: this.activeJobId !== null,
    };
  }
}

export const jobQueue = new JobQueueService();
