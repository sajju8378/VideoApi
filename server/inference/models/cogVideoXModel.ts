import { VideoGenerationModel, ModelMetadata, ModelStatus, GenerationSettings, ProgressCallback, GenerationResult } from '../types';

export class CogVideoXModel implements VideoGenerationModel {
  readonly metadata: ModelMetadata = {
    id: 'THUDM/CogVideoX-5b',
    name: 'CogVideoX-5B (THUDM / Zhipu AI)',
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/THUDM/CogVideoX-5b/blob/main/LICENSE',
    commercialUse: true,
    architecture: '3D Causal VAE + Expert Diffusion Transformer (DiT)',
    minVramGb: 18,
    recommendedVramGb: 24,
    nativeResolution: '720x480 / 1280x720',
    description: 'High-fidelity open image-to-video foundation model with causal 3D convolutional compression and unified text/vision DiT.',
    sourceRepo: 'https://github.com/THUDM/CogVideo',
  };

  private status: ModelStatus = 'MODEL_UNLOADED';

  getStatus(): ModelStatus {
    return this.status;
  }

  async loadModel(): Promise<void> {
    this.status = 'MODEL_READY';
  }

  async unloadModel(): Promise<void> {
    this.status = 'MODEL_UNLOADED';
  }

  async generate(
    jobId: string,
    imagePath: string,
    prompt: string,
    settings: GenerationSettings,
    onProgress: ProgressCallback
  ): Promise<GenerationResult> {
    throw new Error('CogVideoX model inference requires dedicated GPU worker.');
  }
}

export class LtxVideoModel implements VideoGenerationModel {
  readonly metadata: ModelMetadata = {
    id: 'Lightricks/LTX-Video',
    name: 'LTX-Video (Lightricks)',
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/Lightricks/LTX-Video/blob/main/LICENSE.txt',
    commercialUse: true,
    architecture: 'Spatial-Temporal Transformer DiT with Audio/Visual Latent Space',
    minVramGb: 14,
    recommendedVramGb: 20,
    nativeResolution: '768x512 / 1216x704',
    description: 'Real-time capable DiT image-to-video model designed for high frame rate and strong prompt adherence with 24-30 fps generation.',
    sourceRepo: 'https://github.com/Lightricks/LTX-Video',
  };

  private status: ModelStatus = 'MODEL_UNLOADED';

  getStatus(): ModelStatus {
    return this.status;
  }

  async loadModel(): Promise<void> {
    this.status = 'MODEL_READY';
  }

  async unloadModel(): Promise<void> {
    this.status = 'MODEL_UNLOADED';
  }

  async generate(
    jobId: string,
    imagePath: string,
    prompt: string,
    settings: GenerationSettings,
    onProgress: ProgressCallback
  ): Promise<GenerationResult> {
    throw new Error('LTX-Video model inference requires dedicated GPU worker.');
  }
}
