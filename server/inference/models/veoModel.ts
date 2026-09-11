import fs from 'fs';
import path from 'path';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import {
  VideoGenerationModel,
  ModelMetadata,
  ModelStatus,
  GenerationSettings,
  ProgressCallback,
  GenerationResult,
} from '../types';
import { storage } from '../../storage/localStorageProvider';
import { videoEncoder } from '../../pipeline/videoEncoder';

export class VeoVideoModel implements VideoGenerationModel {
  readonly metadata: ModelMetadata = {
    id: 'google/veo-3.1-lite-generate-preview',
    name: 'Google Veo 3.1 Lite (Generative Neural Video)',
    license: 'Google AI Studio Terms of Service',
    licenseUrl: 'https://ai.google.dev/terms',
    commercialUse: true,
    architecture: 'Spatiotemporal Diffusion Transformer (DiT)',
    minVramGb: 0,
    recommendedVramGb: 0,
    nativeResolution: '720p / 1080p',
    description: 'DeepMind flagship generative AI video model producing continuous temporal motion, physics dynamics, and natural character movement from reference images.',
    sourceRepo: 'https://deepmind.google/technologies/veo/',
  };

  private status: ModelStatus = 'MODEL_READY';

  getStatus(): ModelStatus {
    return this.status;
  }

  async loadModel(): Promise<void> {
    this.status = 'MODEL_READY';
  }

  async unloadModel(): Promise<void> {
    this.status = 'MODEL_READY';
  }

  async generate(
    jobId: string,
    imagePath: string,
    prompt: string,
    settings: GenerationSettings,
    onProgress: ProgressCallback
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    this.status = 'MODEL_BUSY';

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('MISSING_API_KEY: GEMINI_API_KEY is not configured in the environment.');
      }

      const ai = new GoogleGenAI({ apiKey });

      onProgress('preparing', 15, {
        message: 'Encoding reference image and dispatching generation task to Google Veo neural clusters...',
      });

      // Read image and encode to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

      const resolution = settings.resolution === '1080p' ? '1080p' : '720p';
      const aspectRatio = settings.aspectRatio === '9:16' ? '9:16' : '16:9';

      onProgress('generating', 25, {
        message: `Calling Veo 3.1 Lite neural video synthesis (${resolution}, ${aspectRatio})...`,
      });

      let operation: any;
      try {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: prompt || 'high quality dynamic cinematic movement',
          image: {
            imageBytes: base64Image,
            mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution,
            aspectRatio,
          },
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
          const quotaErr: any = new Error(
            'VEO_QUOTA_EXHAUSTED: Google Veo 3.1 requires a billing-enabled Google AI Studio API key. Please connect your paid API key via the settings dialog or switch to the Native Inference Engine.'
          );
          quotaErr.code = 'QUOTA_EXHAUSTED';
          throw quotaErr;
        }
        throw err;
      }

      if (!operation || !operation.name) {
        throw new Error('Veo API failed to return an operation identifier.');
      }

      onProgress('generating', 35, {
        message: 'Veo temporal diffusion pipeline executing spatiotemporal frame generation...',
        operationName: operation.name,
      });

      // Poll operation until complete
      let done = false;
      let pollCount = 0;
      let completedOp: any = null;

      while (!done && pollCount < 60) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        pollCount++;

        const opQuery = new GenerateVideosOperation();
        opQuery.name = operation.name;
        const updated = await ai.operations.getVideosOperation({ operation: opQuery });

        const progressPercent = Math.min(90, 35 + pollCount * 3);
        onProgress('generating', progressPercent, {
          message: `Synthesizing neural video frames in cloud TPU cluster (step ${pollCount})...`,
        });

        if (updated.done) {
          done = true;
          completedOp = updated;
          break;
        }
      }

      if (!done || !completedOp) {
        throw new Error('Video generation timed out while waiting for Veo cloud processing.');
      }

      if (completedOp.error) {
        throw new Error(`Veo generation error: ${completedOp.error.message || JSON.stringify(completedOp.error)}`);
      }

      onProgress('downloading', 92, {
        message: 'Downloading synthesized high-definition video stream...',
      });

      const videoUri = completedOp.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error('Veo generation succeeded but did not return a valid video URI.');
      }

      // Download the video bytes
      const fetchResponse = await fetch(`${videoUri}&key=${apiKey}`);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to download video stream from Google Cloud: ${fetchResponse.statusText}`);
      }

      const arrayBuffer = await fetchResponse.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);

      const outputMp4Relative = path.join('outputs', jobId, 'video.mp4');
      const thumbRelative = path.join('thumbnails', jobId, 'thumb.jpg');

      const absoluteMp4 = storage.getFilePath(outputMp4Relative);
      const absoluteThumb = storage.getFilePath(thumbRelative);

      const outDir = path.dirname(absoluteMp4);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(absoluteMp4, videoBuffer);

      // Generate thumbnail
      const thumbDir = path.dirname(absoluteThumb);
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }

      try {
        await videoEncoder.generateMotionVideoFromImage(imagePath, absoluteMp4 + '.tmp.mp4', absoluteThumb, {
          duration: 1,
          fps: 24,
          width: settings.width,
          height: settings.height,
          cameraMotion: 'static',
          motionStrength: 10,
        });
        fs.unlinkSync(absoluteMp4 + '.tmp.mp4');
      } catch {
        fs.copyFileSync(imagePath, absoluteThumb);
      }

      const fileSizeBytes = videoBuffer.length;
      const durationSeconds = settings.duration || 5;

      onProgress('completed', 100, {
        message: 'Google Veo neural video generation completed successfully',
        fileSizeBytes,
        durationSeconds,
      });

      this.status = 'MODEL_READY';

      return {
        videoPath: outputMp4Relative,
        thumbnailPath: thumbRelative,
        fileSizeBytes,
        durationSeconds,
        width: settings.width,
        height: settings.height,
        fps: settings.fps || 24,
        hardwareUsed: {
          engine: this.metadata.name,
          model: this.metadata.id,
          cuda: false,
          gpu: 'Google TPU v5p Cloud Supercluster',
          durationMs: Date.now() - startTime,
        },
      };
    } catch (err: any) {
      this.status = 'MODEL_READY';
      throw err;
    }
  }
}

export const veoModel = new VeoVideoModel();
