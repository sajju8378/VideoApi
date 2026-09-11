import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db';
import { storage } from '../storage/localStorageProvider';
import { imagePreprocessor } from '../pipeline/imagePreprocessor';
import { promptProcessor } from '../pipeline/promptProcessor';
import { jobQueue, ProgressEventPayload } from '../queue/jobQueue';
import { systemDetector } from '../system/capabilities';
import { modelManager } from '../inference/modelManager';
import { authMiddleware, AuthenticatedRequest, generateToken } from '../middleware/auth';
import { openApiSpec } from './openapi';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

export const apiRouter = Router();

// ==========================================
// 1. Authentication Endpoints
// ==========================================
apiRouter.post('/auth/register', (req: Request, res: Response): void => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' },
      });
      return;
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' },
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex') + ':' + salt;

    const user = db.createUser({
      email,
      password_hash: hash,
      name: name || email.split('@')[0],
      role: 'user',
    });

    const token = generateToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'REGISTRATION_FAILED', message: err.message } });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' },
      });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const [storedHash, salt] = user.password_hash.split(':');
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');

    if (computedHash !== storedHash) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const token = generateToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'LOGIN_FAILED', message: err.message } });
  }
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
});

// ==========================================
// 2. Image Upload Endpoint
// ==========================================
apiRouter.post(
  '/uploads/image',
  authMiddleware,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: { code: 'NO_FILE_PROVIDED', message: 'An image file must be provided in the form field "image"' },
        });
        return;
      }

      const originalFilename = req.file.originalname || 'upload.png';
      const fileBuffer = req.file.buffer;

      // Validate image safety, magic bytes, dimensions
      const metadata = imagePreprocessor.validate(fileBuffer, originalFilename);

      const uploadId = crypto.randomUUID();
      const ext = metadata.mimeType === 'image/jpeg' ? '.jpg' : metadata.mimeType === 'image/webp' ? '.webp' : '.png';
      const safeFilename = `input${ext}`;

      const storagePath = await storage.saveFile('uploads', uploadId, safeFilename, fileBuffer);

      const record = db.createUpload({
        user_id: req.user!.id,
        original_filename: originalFilename,
        storage_path: storagePath,
        mime_type: metadata.mimeType,
        file_size_bytes: fileBuffer.length,
        width: metadata.width,
        height: metadata.height,
        aspect_ratio: metadata.aspectRatio,
        checksum_sha256: metadata.checksumSha256,
      });

      res.status(201).json({
        upload: {
          id: record.id,
          original_filename: record.original_filename,
          width: record.width,
          height: record.height,
          aspect_ratio: record.aspect_ratio,
          file_size_bytes: record.file_size_bytes,
          mime_type: record.mime_type,
          url: `/api/v1/media/uploads/${record.id}/${safeFilename}`,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        error: {
          code: err.message?.startsWith('UNSUPPORTED') ? 'UNSUPPORTED_FORMAT' : 'INVALID_IMAGE',
          message: err.message || 'Image upload validation failed',
        },
      });
    }
  }
);

// ==========================================
// 3. Video Generation Endpoints
// ==========================================
apiRouter.post('/video/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      image_id,
      prompt,
      negative_prompt,
      duration = 5,
      fps = 24,
      resolution = '720p',
      aspect_ratio = '16:9',
      camera_motion = 'static',
      motion_strength = 50,
      preserve_subject = 80,
      camera_movement = 50,
      background_movement = 50,
      facial_stability = 85,
      temporal_consistency = 75,
      seed,
      quality_preset = 'balanced',
      model_id,
      parent_job_id,
    } = req.body;

    if (!image_id) {
      res.status(400).json({ error: { code: 'MISSING_IMAGE_ID', message: 'image_id is required' } });
      return;
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: { code: 'EMPTY_PROMPT', message: 'Video prompt description cannot be empty' } });
      return;
    }

    let upload = db.getUploadById(image_id);
    if (!upload && req.body.image_base64) {
      try {
        const rawBase64 = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const meta = imagePreprocessor.validate(buffer, req.body.image_filename || 'source.png');
        const storagePath = await storage.saveFile('uploads', image_id, 'input.png', buffer);
        upload = db.createUpload({
          user_id: req.user!.id,
          original_filename: req.body.image_filename || 'source.png',
          storage_path: storagePath,
          mime_type: meta.mimeType,
          file_size_bytes: buffer.length,
          width: meta.width,
          height: meta.height,
          aspect_ratio: meta.aspectRatio,
          checksum_sha256: meta.checksumSha256,
        });
      } catch (uploadErr) {
        console.warn('Could not auto-create upload from base64 fallback:', uploadErr);
      }
    }

    if (!upload) {
      res.status(404).json({ error: { code: 'IMAGE_NOT_FOUND', message: 'Specified uploaded image was not found. Please re-select the image.' } });
      return;
    }

    // Determine target dimensions
    const dimensions = imagePreprocessor.getTargetDimensions(resolution, aspect_ratio);

    // Compute or sanitize seed
    const effectiveSeed = typeof seed === 'number' && !isNaN(seed) ? seed : Math.floor(Math.random() * 2147483647);

    // Parse structured prompt
    const structuredSpec = promptProcessor.process(prompt, {
      camera_motion,
      motion_strength,
      duration: Number(duration),
      fps: Number(fps),
      seed: effectiveSeed,
      negative_prompt,
    });

    const activeModelId = model_id || modelManager.getActiveModelId();

    // Store generation parameters
    const params = db.createParameters({
      prompt: prompt.trim(),
      negative_prompt: negative_prompt?.trim(),
      duration_seconds: Number(duration),
      fps: Number(fps),
      resolution,
      aspect_ratio,
      width: dimensions.width,
      height: dimensions.height,
      seed: effectiveSeed,
      camera_motion,
      motion_strength: Number(motion_strength),
      preserve_subject: Number(preserve_subject),
      camera_movement: Number(camera_movement),
      background_movement: Number(background_movement),
      facial_stability: Number(facial_stability),
      temporal_consistency: Number(temporal_consistency),
      quality_preset,
      model_id: activeModelId,
      structured_spec: structuredSpec,
    });

    // Create generation job
    const job = db.createJob({
      user_id: req.user!.id,
      input_image_id: upload.id,
      parameter_id: params.id,
    });

    // Record variation relation if requested
    if (parent_job_id) {
      db.createVariation(parent_job_id, job.id, 'seed');
    }

    // Enqueue asynchronously
    jobQueue.enqueue(job.id);

    res.status(202).json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      created_at: job.created_at,
      parameters: {
        resolution,
        aspect_ratio,
        duration: params.duration_seconds,
        fps: params.fps,
        seed: params.seed,
        camera_motion,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'GENERATION_FAILED', message: err.message } });
  }
});

apiRouter.get('/video/jobs/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Generation job not found' } });
    return;
  }

  const output = db.getOutputByJobId(job.id);
  const params = db.getParametersById(job.parameter_id);

  res.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error_code: job.error_code,
    error_message: job.error_message,
    error_details: job.error_details,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    duration_ms: job.generation_duration_ms,
    hardware_used: job.hardware_used,
    parameters: params,
    output: output
      ? {
          video_url: `/api/v1/media/${output.video_storage_path}`,
          thumbnail_url: `/api/v1/media/${output.thumbnail_storage_path}`,
          duration: output.duration_seconds,
          file_size_bytes: output.file_size_bytes,
          width: output.width,
          height: output.height,
          fps: output.fps,
          aspect_ratio: output.aspect_ratio,
        }
      : null,
  });
});

// SSE Events stream
apiRouter.get('/video/jobs/:id/events', (req: Request, res: Response): void => {
  const jobId = req.params.id;
  const job = db.getJobById(jobId);

  if (!job) {
    res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Generation job not found' } });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = jobQueue.subscribe(jobId, (event: ProgressEventPayload) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.status === 'completed' || event.status === 'failed' || event.status === 'cancelled') {
      setTimeout(() => res.end(), 500);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

apiRouter.post('/video/jobs/:id/cancel', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const jobId = req.params.id;
  const success = jobQueue.cancelJob(jobId);
  res.json({
    job_id: jobId,
    cancelled: success,
    message: success ? 'Job cancellation requested' : 'Job could not be cancelled or has already completed',
  });
});

// ==========================================
// 4. Generation History Endpoints
// ==========================================
apiRouter.get('/generations', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const jobs = db.getJobsByUserId(req.user!.id);
  const items = jobs.map((j) => {
    const upload = db.getUploadById(j.input_image_id);
    const params = db.getParametersById(j.parameter_id);
    const output = db.getOutputByJobId(j.id);
    return {
      id: j.id,
      status: j.status,
      progress: j.progress,
      stage: j.stage,
      created_at: j.created_at,
      completed_at: j.completed_at,
      error_message: j.error_message,
      prompt: params?.prompt || '',
      resolution: params?.resolution || '720p',
      aspect_ratio: params?.aspect_ratio || '16:9',
      duration: params?.duration_seconds || 5,
      fps: params?.fps || 24,
      seed: params?.seed || 0,
      camera_motion: params?.camera_motion || 'static',
      motion_strength: params?.motion_strength || 50,
      input_image_url: upload ? `/api/v1/media/${upload.storage_path}` : null,
      input_image_id: upload ? upload.id : null,
      video_url: output ? `/api/v1/media/${output.video_storage_path}` : null,
      thumbnail_url: output ? `/api/v1/media/${output.thumbnail_storage_path}` : null,
      file_size_bytes: output?.file_size_bytes,
    };
  });

  res.json({ generations: items });
});

apiRouter.get('/generations/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: { code: 'GENERATION_NOT_FOUND', message: 'Generation record not found' } });
    return;
  }

  const upload = db.getUploadById(job.input_image_id);
  const params = db.getParametersById(job.parameter_id);
  const output = db.getOutputByJobId(job.id);
  const variations = db.getVariationsForJob(job.id);

  res.json({
    generation: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error_message: job.error_message,
      parameters: params,
      input_image: upload
        ? {
            id: upload.id,
            url: `/api/v1/media/${upload.storage_path}`,
            filename: upload.original_filename,
            width: upload.width,
            height: upload.height,
          }
        : null,
      output: output
        ? {
            video_url: `/api/v1/media/${output.video_storage_path}`,
            thumbnail_url: `/api/v1/media/${output.thumbnail_storage_path}`,
            file_size_bytes: output.file_size_bytes,
            duration: output.duration_seconds,
            width: output.width,
            height: output.height,
            fps: output.fps,
            aspect_ratio: output.aspect_ratio,
          }
        : null,
      variations,
    },
  });
});

apiRouter.delete('/generations/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const jobId = req.params.id;
  const job = db.getJobById(jobId);
  if (!job) {
    res.status(404).json({ error: { code: 'GENERATION_NOT_FOUND', message: 'Generation record not found' } });
    return;
  }

  // Cancel if currently in queue or processing
  jobQueue.cancelJob(jobId);

  const output = db.getOutputByJobId(jobId);
  if (output) {
    await storage.deleteFile(output.video_storage_path);
    await storage.deleteFile(output.thumbnail_storage_path);
  }

  db.deleteJob(jobId);
  res.json({ success: true, message: 'Generation record and associated media deleted' });
});

// ==========================================
// 5. System, Capabilities & Telemetry
// ==========================================
apiRouter.get('/system/capabilities', (req: Request, res: Response): void => {
  const capabilities = systemDetector.getCapabilities();
  res.json(capabilities);
});

apiRouter.get('/system/models', (req: Request, res: Response): void => {
  const models = modelManager.listModels();
  res.json({
    active_model_id: modelManager.getActiveModelId(),
    models,
  });
});

apiRouter.get('/system/telemetry', (req: Request, res: Response): void => {
  const capabilities = systemDetector.getCapabilities();
  const queueStatus = jobQueue.getQueueStatus();
  const dbStats = db.getStats();

  res.json({
    hardware: {
      cuda: capabilities.cuda,
      gpu: capabilities.gpu,
      vram_gb: capabilities.vram_gb,
      cpu_cores: capabilities.cpu_cores,
      system_ram_gb: capabilities.system_ram_gb,
      free_ram_gb: capabilities.free_ram_gb,
      ffmpeg_available: capabilities.ffmpeg_available,
    },
    queue: queueStatus,
    jobs: dbStats,
  });
});

// ==========================================
// 6. Media Streaming with HTTP 206 Partial Content
// ==========================================
apiRouter.get('/media/*', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPath = req.params[0];
    const absolutePath = storage.getFilePath(rawPath);

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Requested media file not found' } });
      return;
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    // Support partial content range for video seeking
    if (range && ext === '.mp4') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(absolutePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(absolutePath).pipe(res);
    }
  } catch (err: any) {
    res.status(500).json({ error: { code: 'MEDIA_STREAM_FAILED', message: err.message } });
  }
});

// ==========================================
// 7. Health & Docs Endpoints
// ==========================================
apiRouter.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    engine: 'AI Video Self-Hosted Generation Pipeline',
  });
});

apiRouter.get('/docs', (req: Request, res: Response): void => {
  res.json(openApiSpec);
});

// ==========================================
// 8. Internal Worker API
// ==========================================
apiRouter.post('/internal/generate', (req: Request, res: Response): void => {
  const token = req.headers['x-internal-worker-token'];
  const expectedToken = process.env.INFERENCE_INTERNAL_TOKEN || 'internal-worker-secret-token';

  if (token !== expectedToken) {
    res.status(403).json({ error: 'FORBIDDEN: Unauthorized internal worker request' });
    return;
  }

  const { job_id, image_path, prompt, duration, fps, width, height, seed } = req.body;
  res.json({
    status: 'accepted',
    job_id,
    message: 'Internal inference job queued on GPU worker',
  });
});
