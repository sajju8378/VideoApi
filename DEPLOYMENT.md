# Production Deployment Guide

## 1. Production Topology

In production, decouple the lightweight web/API server from the heavy GPU inference compute node:

```
[Internet Ingress / Cloudflare / Nginx]
       │
       ▼
[Web & API Container] (Node.js + React SPA, Port 3000)
       ├── PostgreSQL (Database metadata & job queue records)
       ├── Redis (Distributed pub/sub and lock coordination)
       └── S3/Object Storage (Raw uploads, MP4 outputs, Thumbnails)
       │
       ▼ Internal VPC / Private Network (mTLS / Worker Token)
[Dedicated GPU Inference Worker] (Python 3.10 + PyTorch + CUDA, 24GB+ VRAM)
```

## 2. Docker Compose Deployment

```bash
# 1. Clone repo
git clone <repo-url>
cd ai-video-generator

# 2. Configure production secrets
cp .env.example .env
# Edit JWT_SECRET, DATABASE_URL, STORAGE_DRIVER in .env

# 3. Launch with Docker Compose
docker compose up -d
```

## 3. GPU Container Passthrough

Ensure NVIDIA Container Toolkit is installed on the host machine:

```bash
# Verify nvidia runtime
nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU passthrough
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```
