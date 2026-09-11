# AI Video Generator (Self-Hosted Image-to-Video Platform)

A complete, production-ready, autonomous AI image-to-video generation web application featuring its own independent inference pipeline, asynchronous job queue, real-time Server-Sent Events (SSE) tracking, and fast-start MP4 delivery.

> **Zero Third-Party APIs**: This application runs entirely through its own backend architecture and self-hostable open-weights models (Stable Video Diffusion XT 1.1, CogVideoX-5B, LTX-Video, or native pipeline engine). It never delegates inference to hosted commercial APIs (no Replicate, Runway, Kling, Luma, Pika, Veo, etc.).

---

## Key Features

1. **Self-Hosted AI Inference**: Pluggable `VideoGenerationModel` abstraction managing model loading, GPU memory caching, spatial-temporal conditioning, and multi-stage generation.
2. **Asynchronous Job Queue**: GPU-safe concurrency control (one generation per GPU), job cancellation, real-time progress broadcasts, and temporary file management.
3. **Structured Prompt Processor**: Transforms natural-language prompts into structured generation specifications (subject, environment, action, camera motion, lighting, style, motion intensity).
4. **Camera & Motion Controls**: 10+ camera motion trajectories (push-in, pull-out, pan left/right, tilt up/down, orbit, handheld, dolly, tracking shot) and fine-grained sliders (motion strength, subject preservation, facial stability, background movement, temporal consistency).
5. **Real-Time Progress & Fast-Start Video Streaming**: Server-Sent Events stream frame synthesis stages without browser reloads; generated MP4s feature H.264 video with `+faststart` metadata and HTTP 206 byte-range seeking.
6. **Automatic Hardware Detection**: Dynamic capability probe (`/api/v1/system/capabilities`) inspecting CUDA devices, VRAM limits, FFmpeg codecs, and PyTorch versions.
7. **Production Database & Storage**: PostgreSQL schema (with embedded ACID disk persistence for immediate zero-config operation) and abstracted `StorageProvider` for local or S3 object storage.

---

## Quick Start (Local Development)

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-video-generator

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Hardware Requirements

| Configuration | Minimum | Recommended |
|---|---|---|
| **GPU** | NVIDIA RTX 3090 / RTX 4080 (16 GB VRAM) | NVIDIA RTX 4090 / A100 / H100 (24–80 GB VRAM) |
| **CUDA Version** | CUDA 11.8+ / 12.x | CUDA 12.2+ |
| **System RAM** | 16 GB | 32+ GB |
| **Storage** | 20 GB free disk space | 100+ GB NVMe SSD |
| **Test Mode (CPU)**| 4 Cores, 8 GB RAM | For dev verification without CUDA GPU |

---

## Complete End-to-End Workflow

```
[User Image] + [Natural Language Prompt]
       ↓
[/api/v1/uploads/image] (Magic bytes & dimension validation, UUID storage)
       ↓
[/api/v1/video/generate] (Structured prompt parsing, parameters in DB)
       ↓
[In-Memory / Redis FIFO Job Queue] (Concurrency lock = 1 per GPU)
       ↓
[Inference Worker & Engine] (Image conditioning → Latent space → Denoising steps)
       ↓
[Optical Consistency & Temporal Filter] (Preserves face, subject, background)
       ↓
[Video Encoder] (FFmpeg H.264 + faststart MP4 + thumbnail poster)
       ↓
[Server-Sent Events / Browser Stream] (Play, scrub, download, variation, history)
```

---

## Documentation Links

- [Architecture Overview](ARCHITECTURE.md)
- [REST API Reference & OpenAPI](API.md)
- [Model Selection & Weights Setup](MODEL_SETUP.md)
- [Production Deployment Guide](DEPLOYMENT.md)
- [Security & Privacy Architecture](SECURITY.md)
- [Troubleshooting & FAQs](TROUBLESHOOTING.md)
