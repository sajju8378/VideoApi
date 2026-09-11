# ==============================================================================
# AI Video Generator - Container Dockerfile
# Supports Node.js 22, Python 3.10, FFmpeg, and optional NVIDIA CUDA Container Toolkit
# ==============================================================================
FROM nvidia/cuda:12.2.0-base-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=3000

# Install system dependencies, FFmpeg, Python, Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    ffmpeg \
    python3 \
    python3-pip \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Build Vite frontend & Express bundle
RUN npm run build

# Expose single port 3000
EXPOSE 3000

CMD ["npm", "start"]
