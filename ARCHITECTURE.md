# Application Architecture Specification

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Modern React + TypeScript UI                │
│   (Upload, Prompt, Camera Controls, Player, History, Stats) │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE (/api/v1/...)
┌──────────────────────────────▼──────────────────────────────┐
│                    Application API Layer                    │
│   - Auth & Session Verification                             │
│   - Image Preprocessing & MIME/Magic Byte Validator         │
│   - Structured Prompt NLP Processor                         │
│   - Streaming Media Server (HTTP 206 Partial Content)       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     PostgreSQL Database     ││   StorageProvider (Local/S3) │
│ (Users, Jobs, Parameters,   ││ (uploads/, outputs/,         │
│  Uploads, Outputs)          ││  thumbnails/)                │
└─────────────────────────────┘└──────────────┬───────────────┘
                                              │
┌─────────────────────────────────────────────▼───────────────┐
│              Asynchronous Job Queue Manager                 │
│   - 1 GPU Concurrency Barrier (VRAM protection)             │
│   - Job Cancellation & Cleanup                              │
│   - SSE Event Dispatching & Heartbeats                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                Dedicated Inference Worker                   │
│   - Model Lifecycle: LOADING -> READY -> BUSY               │
│   - Supported: SVD-XT, CogVideoX-5B, LTX-Video, Native      │
│   - Temporal Attention & Optical Flow Filter                │
│   - FFmpeg H.264 Faststart MP4 Video Encoder                │
└─────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

- `/src`: Frontend React application (hooks, views, components, controls, player).
- `/server`: Node.js Express backend, API routing, and security.
- `/server/inference`: Model abstraction interface (`VideoGenerationModel`), lifecycle manager, model implementations.
- `/server/pipeline`: Image preprocessing, prompt NLP structuring, video encoding.
- `/server/queue`: Asynchronous job queue, single-job GPU scheduler, SSE streamer.
- `/server/storage`: Abstracted filesystem and S3 storage providers.
- `/server/database`: PostgreSQL schema and type-safe relational data manager.
- `/scripts`: Automated model weights setup, environment verification, and integration tests.
- `/docs`: Technical architectural specifications and deployment manuals.
