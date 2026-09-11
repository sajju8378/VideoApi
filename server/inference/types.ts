export type ModelStatus =
  | 'MODEL_UNLOADED'
  | 'MODEL_LOADING'
  | 'MODEL_READY'
  | 'MODEL_BUSY'
  | 'MODEL_ERROR';

export interface GenerationSettings {
  duration: number; // seconds (2, 4, 5, 8)
  fps: number; // 16, 20, 24, 25, 30
  resolution: string; // 512p, 720p, 1080p
  aspectRatio: string; // 16:9, 9:16, 1:1, 4:3
  width: number;
  height: number;
  seed: number;
  cameraMotion: string;
  motionStrength: number; // 0-100
  preserveSubject: number; // 0-100
  cameraMovement: number; // 0-100
  backgroundMovement: number; // 0-100
  facialStability: number; // 0-100
  temporalConsistency: number; // 0-100
  qualityPreset: 'draft' | 'balanced' | 'high' | 'max';
  negativePrompt?: string;
}

export interface ProgressCallback {
  (stage: string, progressPercent: number, details?: Record<string, any>): void;
}

export interface GenerationResult {
  videoPath: string;
  thumbnailPath: string;
  fileSizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hardwareUsed: {
    engine: string;
    model: string;
    cuda: boolean;
    gpu?: string;
    vramMb?: number;
    durationMs: number;
  };
}

export interface ModelMetadata {
  id: string;
  name: string;
  license: string;
  licenseUrl: string;
  commercialUse: boolean;
  architecture: string;
  minVramGb: number;
  recommendedVramGb: number;
  nativeResolution: string;
  description: string;
  sourceRepo: string;
}

export interface VideoGenerationModel {
  readonly metadata: ModelMetadata;
  getStatus(): ModelStatus;
  loadModel(): Promise<void>;
  unloadModel(): Promise<void>;
  generate(
    jobId: string,
    imagePath: string,
    prompt: string,
    settings: GenerationSettings,
    onProgress: ProgressCallback
  ): Promise<GenerationResult>;
}
