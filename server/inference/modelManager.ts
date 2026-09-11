import { VideoGenerationModel, ModelMetadata } from './types';
import { PipelineEngine, pipelineEngine } from './models/pipelineEngine';
import { SvdVideoModel } from './models/svdModel';
import { CogVideoXModel, LtxVideoModel } from './models/cogVideoXModel';
import { veoModel } from './models/veoModel';

class ModelManager {
  private models: Map<string, VideoGenerationModel> = new Map();
  private activeModelId: string;

  constructor() {
    const svd = new SvdVideoModel();
    const cog = new CogVideoXModel();
    const ltx = new LtxVideoModel();

    this.models.set(veoModel.metadata.id, veoModel);
    this.models.set(pipelineEngine.metadata.id, pipelineEngine);
    this.models.set(svd.metadata.id, svd);
    this.models.set(cog.metadata.id, cog);
    this.models.set(ltx.metadata.id, ltx);

    this.activeModelId = pipelineEngine.metadata.id;
  }

  listModels(): ModelMetadata[] {
    return Array.from(this.models.values()).map((m) => m.metadata);
  }

  getModel(id?: string): VideoGenerationModel {
    if (id && this.models.has(id)) {
      return this.models.get(id)!;
    }
    return this.models.get(this.activeModelId) || pipelineEngine;
  }

  setActiveModel(id: string): boolean {
    if (this.models.has(id)) {
      this.activeModelId = id;
      return true;
    }
    return false;
  }

  getActiveModelId(): string {
    return this.activeModelId;
  }
}

export const modelManager = new ModelManager();
