import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  project_id?: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  width: number;
  height: number;
  aspect_ratio: string;
  checksum_sha256?: string;
  created_at: string;
}

export interface GenerationParameters {
  id: string;
  prompt: string;
  negative_prompt?: string;
  duration_seconds: number;
  fps: number;
  resolution: string;
  aspect_ratio: string;
  width: number;
  height: number;
  seed: number;
  camera_motion: string;
  motion_strength: number;
  preserve_subject: number;
  camera_movement: number;
  background_movement: number;
  facial_stability: number;
  temporal_consistency: number;
  quality_preset: string;
  model_id: string;
  structured_spec?: Record<string, any>;
  created_at: string;
}

export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'loading'
  | 'generating'
  | 'post_processing'
  | 'encoding'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface GenerationJob {
  id: string;
  user_id: string;
  project_id?: string;
  input_image_id: string;
  parameter_id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  error_code?: string;
  error_message?: string;
  error_details?: Record<string, any>;
  hardware_used?: Record<string, any>;
  generation_duration_ms?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Output {
  id: string;
  job_id: string;
  video_storage_path: string;
  thumbnail_storage_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  video_codec: string;
  container_format: string;
  fps: number;
  width: number;
  height: number;
  aspect_ratio: string;
  created_at: string;
}

export interface GenerationVariation {
  id: string;
  parent_job_id: string;
  variation_job_id: string;
  variation_type: string;
  created_at: string;
}

export interface DatabaseState {
  users: User[];
  projects: Project[];
  uploads: Upload[];
  generation_parameters: GenerationParameters[];
  generation_jobs: GenerationJob[];
  outputs: Output[];
  generation_variations: GenerationVariation[];
}

class DatabaseManager {
  private dbPath: string;
  private state: DatabaseState;
  private isLoaded: boolean = false;

  constructor() {
    const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
    this.dbPath = path.join(storageDir, 'database.json');
    this.state = {
      users: [],
      projects: [],
      uploads: [],
      generation_parameters: [],
      generation_jobs: [],
      outputs: [],
      generation_variations: [],
    };
    this.init();
  }

  private init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.state = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse existing database.json, initializing empty state:', err);
      }
    }

    // Ensure default demo user exists
    if (!this.state.users || this.state.users.length === 0) {
      const demoSalt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('demo123', demoSalt, 64).toString('hex') + ':' + demoSalt;
      const demoUser: User = {
        id: crypto.randomUUID(),
        email: 'demo@example.com',
        password_hash: hash,
        name: 'Demo Creator',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.state.users = [demoUser];

      const demoProject: Project = {
        id: crypto.randomUUID(),
        user_id: demoUser.id,
        name: 'Default Video Project',
        description: 'Default project workspace for AI video generation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.state.projects = [demoProject];
      this.persist();
    }

    this.isLoaded = true;
  }

  private persist() {
    try {
      const tmpPath = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error('Database persist error:', err);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.persist();
    return newUser;
  }

  // Projects
  getProjectsByUserId(userId: string): Project[] {
    return this.state.projects.filter((p) => p.user_id === userId);
  }

  // Uploads
  createUpload(upload: Omit<Upload, 'id' | 'created_at'>): Upload {
    const newUpload: Upload = {
      ...upload,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.uploads.push(newUpload);
    this.persist();
    return newUpload;
  }

  getUploadById(id: string): Upload | undefined {
    return this.state.uploads.find((u) => u.id === id);
  }

  // Parameters
  createParameters(params: Omit<GenerationParameters, 'id' | 'created_at'>): GenerationParameters {
    const newParams: GenerationParameters = {
      ...params,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.generation_parameters.push(newParams);
    this.persist();
    return newParams;
  }

  getParametersById(id: string): GenerationParameters | undefined {
    return this.state.generation_parameters.find((p) => p.id === id);
  }

  // Generation Jobs
  createJob(job: Omit<GenerationJob, 'id' | 'created_at' | 'progress' | 'stage' | 'status'> & { status?: JobStatus; stage?: string }): GenerationJob {
    const newJob: GenerationJob = {
      ...job,
      id: crypto.randomUUID(),
      status: job.status || 'queued',
      progress: 0,
      stage: job.stage || 'queued',
      created_at: new Date().toISOString(),
    };
    this.state.generation_jobs.push(newJob);
    this.persist();
    return newJob;
  }

  getJobById(id: string): GenerationJob | undefined {
    return this.state.generation_jobs.find((j) => j.id === id);
  }

  updateJob(id: string, updates: Partial<GenerationJob>): GenerationJob | undefined {
    const job = this.getJobById(id);
    if (!job) return undefined;
    Object.assign(job, updates);
    this.persist();
    return job;
  }

  getJobsByUserId(userId: string): GenerationJob[] {
    return this.state.generation_jobs
      .filter((j) => j.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  deleteJob(id: string): boolean {
    const index = this.state.generation_jobs.findIndex((j) => j.id === id);
    if (index === -1) return false;
    this.state.generation_jobs.splice(index, 1);
    // Also remove associated outputs
    this.state.outputs = this.state.outputs.filter((o) => o.job_id !== id);
    this.state.generation_variations = this.state.generation_variations.filter(
      (v) => v.parent_job_id !== id && v.variation_job_id !== id
    );
    this.persist();
    return true;
  }

  // Outputs
  createOutput(output: Omit<Output, 'id' | 'created_at'>): Output {
    const newOutput: Output = {
      ...output,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.outputs.push(newOutput);
    this.persist();
    return newOutput;
  }

  getOutputByJobId(jobId: string): Output | undefined {
    return this.state.outputs.find((o) => o.job_id === jobId);
  }

  // Variations
  createVariation(parentJobId: string, variationJobId: string, variationType: string = 'seed'): GenerationVariation {
    const item: GenerationVariation = {
      id: crypto.randomUUID(),
      parent_job_id: parentJobId,
      variation_job_id: variationJobId,
      variation_type: variationType,
      created_at: new Date().toISOString(),
    };
    this.state.generation_variations.push(item);
    this.persist();
    return item;
  }

  getVariationsForJob(jobId: string): GenerationVariation[] {
    return this.state.generation_variations.filter(
      (v) => v.parent_job_id === jobId || v.variation_job_id === jobId
    );
  }

  // System Stats
  getStats() {
    return {
      total_users: this.state.users.length,
      total_uploads: this.state.uploads.length,
      total_jobs: this.state.generation_jobs.length,
      queued_jobs: this.state.generation_jobs.filter((j) => j.status === 'queued').length,
      generating_jobs: this.state.generation_jobs.filter((j) =>
        ['preparing', 'loading', 'generating', 'post_processing', 'encoding'].includes(j.status)
      ).length,
      completed_jobs: this.state.generation_jobs.filter((j) => j.status === 'completed').length,
      failed_jobs: this.state.generation_jobs.filter((j) => j.status === 'failed').length,
    };
  }
}

export const db = new DatabaseManager();
