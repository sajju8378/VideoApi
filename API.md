# API Reference Specification

Base URL: `/api/v1`

All responses adhere to standard JSON formats. Errors return structured objects containing a machine-readable code, clear message, and optional details.

---

### Authentication

#### `POST /api/v1/auth/register`
Creates a new user account.
```json
// Request Body
{
  "email": "creator@example.com",
  "password": "strongPassword123",
  "name": "Alex Morgan"
}
```

#### `POST /api/v1/auth/login`
Returns user information and a JWT bearer token.
```json
// Response (200 OK)
{
  "user": {
    "id": "uuid-v4",
    "email": "creator@example.com",
    "name": "Alex Morgan",
    "role": "user"
  },
  "token": "header.payload.signature"
}
```

#### `GET /api/v1/auth/me`
Retrieves current authenticated profile.

---

### Uploads

#### `POST /api/v1/uploads/image`
Uploads a conditioning image. Validates magic bytes, dimensions, and enforces max size (25MB).
```json
// Response (201 Created)
{
  "upload": {
    "id": "7f8c-uuid",
    "original_filename": "portrait.png",
    "width": 1024,
    "height": 1024,
    "aspect_ratio": "1:1",
    "file_size_bytes": 1420500,
    "mime_type": "image/png",
    "url": "/api/v1/media/uploads/7f8c-uuid/input.png"
  }
}
```

---

### Video Generation

#### `POST /api/v1/video/generate`
Submits an image-to-video generation job.
```json
// Request Body
{
  "image_id": "7f8c-uuid",
  "prompt": "Subject slowly pushes forward while hair moves in the breeze. Cinematic lighting.",
  "duration": 5,
  "fps": 24,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "camera_motion": "slow push-in",
  "motion_strength": 55,
  "preserve_subject": 85,
  "seed": 421950
}
```

```json
// Response (202 Accepted)
{
  "job_id": "job-uuid-v4",
  "status": "queued",
  "progress": 0,
  "stage": "queued",
  "created_at": "2026-09-11T12:00:00.000Z"
}
```

#### `GET /api/v1/video/jobs/:id`
Retrieves status, progress, stage, parameters, and output results.

#### `GET /api/v1/video/jobs/:id/events`
Server-Sent Events (SSE) stream delivering real-time stage transitions:
- `preparing` (12%)
- `loading` (25%)
- `generating` (58%)
- `post_processing` (72%)
- `encoding` (92%)
- `completed` (100%)

#### `POST /api/v1/video/jobs/:id/cancel`
Cancels an active or waiting generation job.

---

### History & Outputs

#### `GET /api/v1/generations`
Lists past video generations with thumbnails and metadata.

#### `DELETE /api/v1/generations/:id`
Deletes generation record and removes video and thumbnail files from storage.

---

### System & Hardware Diagnostics

#### `GET /api/v1/system/capabilities`
Returns detected CUDA status, GPU device, VRAM, and compatibility recommendation.
```json
{
  "cuda": false,
  "gpu": "None",
  "vram_gb": 0,
  "supported": true,
  "max_resolution": "720p",
  "estimated_generation_time": "~5-12 seconds (Pipeline test/CPU synthesis mode)",
  "cpu_cores": 8,
  "system_ram_gb": 32,
  "ffmpeg_available": true
}
```
