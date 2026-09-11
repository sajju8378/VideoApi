export type CameraMotion =
  | 'static'
  | 'slow push-in'
  | 'slow pull-out'
  | 'pan left'
  | 'pan right'
  | 'tilt up'
  | 'tilt down'
  | 'orbit'
  | 'tracking shot'
  | 'handheld'
  | 'dolly'
  | 'cinematic camera movement';

export type QualityPreset = 'draft' | 'balanced' | 'high' | 'max';

export interface SystemCapabilities {
  cuda: boolean;
  gpu: string;
  vram_gb: number;
  cuda_version: string | null;
  supported: boolean;
  max_resolution: string;
  estimated_generation_time: string;
  cpu_cores: number;
  system_ram_gb: number;
  free_ram_gb: number;
  ffmpeg_available: boolean;
  ffmpeg_version: string | null;
  pytorch_available: boolean;
  test_mode_enabled: boolean;
  active_model: string;
  hardware_recommendation?: {
    minimum_gpu: string;
    minimum_vram_gb: number;
    recommended_vram_gb: number;
    recommended_gpu: string;
    warning?: string;
  };
}

export interface UploadedImage {
  id: string;
  original_filename: string;
  width: number;
  height: number;
  aspect_ratio: string;
  file_size_bytes: number;
  mime_type: string;
  url: string;
}

export interface GenerationSettings {
  prompt: string;
  negative_prompt?: string;
  duration: number; // 2, 4, 5, 8
  fps: number; // 16, 20, 24, 25, 30
  resolution: '512p' | '720p' | '1080p';
  aspect_ratio: '16:9' | '9:16' | '1:1' | '4:3';
  camera_motion: CameraMotion;
  motion_strength: number; // 0-100
  preserve_subject: number; // 0-100
  camera_movement: number; // 0-100
  background_movement: number; // 0-100
  facial_stability: number; // 0-100
  temporal_consistency: number; // 0-100
  seed?: number;
  random_seed: boolean;
  quality_preset: QualityPreset;
}

export interface ActiveJob {
  job_id: string;
  status: 'queued' | 'preparing' | 'loading' | 'generating' | 'post_processing' | 'encoding' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  message?: string;
  error_code?: string;
  error_message?: string;
  output?: {
    video_url: string;
    thumbnail_url: string;
    duration: number;
    file_size_bytes: number;
    width: number;
    height: number;
    fps: number;
    aspect_ratio: string;
  };
}

export interface HistoryItem {
  id: string;
  status: string;
  progress: number;
  stage: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  prompt: string;
  resolution: string;
  aspect_ratio: string;
  duration: number;
  fps: number;
  seed: number;
  camera_motion: string;
  motion_strength: number;
  input_image_url: string | null;
  input_image_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  file_size_bytes?: number;
}
