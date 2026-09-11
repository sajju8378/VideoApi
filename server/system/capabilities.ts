import os from 'os';
import { execSync } from 'child_process';

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
  pytorch_version: string | null;
  test_mode_enabled: boolean;
  active_model: string;
  hardware_recommendation: {
    minimum_gpu: string;
    minimum_vram_gb: number;
    recommended_vram_gb: number;
    recommended_gpu: string;
    warning?: string;
  };
}

class SystemCapabilityDetector {
  private cachedCapabilities: SystemCapabilities | null = null;
  private lastChecked: number = 0;

  getCapabilities(): SystemCapabilities {
    const now = Date.now();
    // Cache for 15 seconds to avoid repeatedly executing shell commands
    if (this.cachedCapabilities && now - this.lastChecked < 15000) {
      return this.cachedCapabilities;
    }

    const cpuCores = os.cpus().length;
    const totalRamGb = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
    const freeRamGb = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;

    let cuda = false;
    let gpuName = 'None';
    let vramGb = 0;
    let cudaVersion: string | null = null;

    // 1. Probe for NVIDIA CUDA GPU
    try {
      const smiOutput = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).trim();

      if (smiOutput) {
        const parts = smiOutput.split('\n')[0].split(',');
        if (parts.length >= 2) {
          gpuName = parts[0].trim();
          vramGb = Math.round((parseFloat(parts[1].trim()) / 1024) * 10) / 10;
          cuda = true;
        }
      }
    } catch {
      // No nvidia-smi or no NVIDIA GPU detected
    }

    // Check CUDA version
    if (cuda) {
      try {
        const nvcc = execSync('nvcc --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const match = nvcc.match(/release\s+([0-9.]+)/);
        if (match) cudaVersion = match[1];
      } catch {
        cudaVersion = 'CUDA Driver Present';
      }
    }

    // 2. Probe for FFmpeg
    let ffmpegAvailable = false;
    let ffmpegVersion: string | null = null;
    try {
      const ffmpegOut = execSync('ffmpeg -version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      ffmpegAvailable = true;
      const match = ffmpegOut.match(/ffmpeg version\s+([^\s]+)/);
      ffmpegVersion = match ? match[1] : 'installed';
    } catch {
      ffmpegAvailable = false;
    }

    // 3. Probe for PyTorch
    let pytorchAvailable = false;
    let pytorchVersion: string | null = null;
    try {
      const pyOut = execSync('python3 -c "import torch; print(torch.__version__)"', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).trim();
      if (pyOut) {
        pytorchAvailable = true;
        pytorchVersion = pyOut;
      }
    } catch {
      pytorchAvailable = false;
    }

    // Evaluate compatibility against model requirements
    // SVD / CogVideoX / LTX-Video require 16-24GB VRAM for standard full precision/fp16 inference
    const testMode = process.env.TEST_MODE === 'true' || !cuda;
    const isGpuSupported = cuda && vramGb >= 16;
    const isSupported = isGpuSupported || testMode;

    let maxResolution = 'None';
    let estimatedTime = 'N/A';

    if (cuda && vramGb >= 24) {
      maxResolution = '1080p';
      estimatedTime = '~15-30 seconds (24fps 5s)';
    } else if (cuda && vramGb >= 16) {
      maxResolution = '720p';
      estimatedTime = '~30-60 seconds (24fps 5s)';
    } else if (cuda && vramGb >= 8) {
      maxResolution = '512p';
      estimatedTime = '~60-120 seconds (24fps 5s, low VRAM mode)';
    } else if (testMode) {
      maxResolution = '720p';
      estimatedTime = '~5-12 seconds (Pipeline test/CPU synthesis mode)';
    }

    const capabilities: SystemCapabilities = {
      cuda,
      gpu: gpuName,
      vram_gb: vramGb,
      cuda_version: cudaVersion,
      supported: isSupported,
      max_resolution: maxResolution,
      estimated_generation_time: estimatedTime,
      cpu_cores: cpuCores,
      system_ram_gb: totalRamGb,
      free_ram_gb: freeRamGb,
      ffmpeg_available: ffmpegAvailable,
      ffmpeg_version: ffmpegVersion,
      pytorch_available: pytorchAvailable,
      pytorch_version: pytorchVersion,
      test_mode_enabled: testMode,
      active_model: process.env.MODEL_ID || 'stabilityai/stable-video-diffusion-img2vid-xt',
      hardware_recommendation: {
        minimum_gpu: 'NVIDIA RTX 3090 / RTX 4080 / A10G / T4 (quantized)',
        minimum_vram_gb: 16,
        recommended_vram_gb: 24,
        recommended_gpu: 'NVIDIA RTX 4090 / A100 / H100 (24GB-80GB VRAM)',
        warning: !cuda
          ? 'No NVIDIA CUDA GPU detected on this host. Full production neural diffusion requires an NVIDIA GPU with >= 16GB VRAM. Running in Test Mode / CPU Verification Pipeline.'
          : vramGb < 16
          ? `Detected GPU has only ${vramGb} GB VRAM. Recommended minimum is 16 GB VRAM.`
          : undefined,
      },
    };

    this.cachedCapabilities = capabilities;
    this.lastChecked = now;
    return capabilities;
  }
}

export const systemDetector = new SystemCapabilityDetector();
