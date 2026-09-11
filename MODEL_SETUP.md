# Model Selection, Licensing & Weights Setup

## 1. Selected Open Foundation Models

The application incorporates a pluggable `VideoGenerationModel` interface supporting three primary open-source foundation architectures:

### Candidate A: Stable Video Diffusion XT 1.1 (`stabilityai/stable-video-diffusion-img2vid-xt-1-1`)
- **License**: Stability AI Community License. Free for research and commercial use for organizations under $1M annual revenue.
- **Architecture**: Latent Diffusion UNet with interleaved spatial and temporal attention.
- **Input**: Image + Motion Bucket ID (0–255) + FPS conditioning.
- **Frames**: 25 frames at native 1024x576 or 576x1024.
- **Hardware Requirement**: 16–24 GB VRAM (FP16 or quantized).

### Candidate B: CogVideoX-5B (`THUDM/CogVideoX-5b`)
- **License**: Apache 2.0 (Completely permissive commercial use).
- **Architecture**: 3D Causal Convolutional VAE + Expert Diffusion Transformer (DiT).
- **Input**: Image + Text Prompt.
- **Resolution**: 720p (1280x720) or 480p.
- **Hardware Requirement**: 18–24 GB VRAM (BF16).

### Candidate C: LTX-Video (`Lightricks/LTX-Video`)
- **License**: Apache 2.0.
- **Architecture**: Spatial-temporal DiT with fast inference scheduling (approx 20–30 steps).
- **Hardware Requirement**: 14–20 GB VRAM.

---

## 2. Downloading Model Weights

Weights must be downloaded directly through official distribution mechanisms. Never scrape or access unauthorized private endpoints.

```bash
# Using official huggingface-cli
pip install "huggingface_hub[cli]"

# Download SVD-XT weights
huggingface-cli download stabilityai/stable-video-diffusion-img2vid-xt-1-1 \
  --local-dir ./models/svd-xt

# Or download CogVideoX-5B weights
huggingface-cli download THUDM/CogVideoX-5b \
  --local-dir ./models/cogvideox-5b
```

---

## 3. Verification Script

Run the built-in setup script to verify licenses, hardware, and weight locations:

```bash
./scripts/setup_models.sh
```
