# Troubleshooting & Error Codes

| Error Code | Meaning | Remediation |
|---|---|---|
| `GPU_UNAVAILABLE` | No NVIDIA CUDA GPU detected on host. | Switch `TEST_MODE=true` in settings or deploy to an NVIDIA GPU host with >= 16GB VRAM. |
| `INSUFFICIENT_VRAM` | GPU has less memory than required by the model. | Lower resolution to 512p or 720p, reduce duration to 2–4s, or use a quantized model. |
| `UNSUPPORTED_FORMAT` | File is not valid JPG, PNG, or WEBP. | Ensure image file matches allowed formats and is not corrupt. |
| `JOB_CANCELLED` | Job was cancelled by user request. | Normal behavior if cancel button was clicked. |
| `VIDEO_ENCODING_FAILED` | FFmpeg failed to assemble frames. | Check `ffmpeg -version` and verify disk space in storage directory. |
