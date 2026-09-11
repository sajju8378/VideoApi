export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AI Video Generator API',
    version: '1.0.0',
    description:
      'Autonomous self-hosted image-to-video generation platform with custom AI inference pipeline, asynchronous job queues, real-time Server-Sent Events, and fast-start MP4 delivery.',
    contact: {
      name: 'AI Video Engine Engineering Team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Primary API Server',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'creator@example.com' },
                  password: { type: 'string', minLength: 6, example: 'secret123' },
                  name: { type: 'string', example: 'Alex Morgan' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created successfully' },
          400: { description: 'Validation error or email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in and acquire JWT bearer token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'demo@example.com' },
                  password: { type: 'string', example: 'demo123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful with bearer token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/uploads/image': {
      post: {
        summary: 'Upload conditioning source image',
        tags: ['Uploads'],
        description: 'Accepts JPG, PNG, WEBP files up to 25MB. Generates secure UUID storage path.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Image preprocessed and stored successfully' },
          400: { description: 'Corrupted image or unsupported MIME format' },
        },
      },
    },
    '/video/generate': {
      post: {
        summary: 'Submit an image-to-video generation job',
        tags: ['Video Generation'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['image_id', 'prompt'],
                properties: {
                  image_id: { type: 'string', format: 'uuid' },
                  prompt: { type: 'string', example: 'A young man beside a motorcycle, hair moving in the wind, slow camera push-in' },
                  negative_prompt: { type: 'string' },
                  duration: { type: 'integer', enum: [2, 4, 5, 8], default: 5 },
                  fps: { type: 'integer', enum: [16, 20, 24, 25, 30], default: 24 },
                  resolution: { type: 'string', enum: ['512p', '720p', '1080p'], default: '720p' },
                  aspect_ratio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3'], default: '16:9' },
                  camera_motion: { type: 'string', default: 'static' },
                  motion_strength: { type: 'integer', minimum: 0, maximum: 100, default: 50 },
                  preserve_subject: { type: 'integer', minimum: 0, maximum: 100, default: 80 },
                  seed: { type: 'integer' },
                  quality_preset: { type: 'string', enum: ['draft', 'balanced', 'high', 'max'], default: 'balanced' },
                  model_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Job enqueued successfully with initial status' },
          400: { description: 'Invalid generation parameters' },
          404: { description: 'Uploaded image not found' },
        },
      },
    },
    '/video/jobs/{job_id}': {
      get: {
        summary: 'Get generation job status',
        tags: ['Video Generation'],
        parameters: [
          { name: 'job_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Current job status and progress' },
          404: { description: 'Job not found' },
        },
      },
    },
    '/video/jobs/{job_id}/events': {
      get: {
        summary: 'Server-Sent Events (SSE) stream for real-time progress',
        tags: ['Video Generation'],
        parameters: [
          { name: 'job_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'SSE stream sending stage updates' },
        },
      },
    },
    '/video/jobs/{job_id}/cancel': {
      post: {
        summary: 'Cancel an active or queued generation job',
        tags: ['Video Generation'],
        parameters: [
          { name: 'job_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Job cancellation acknowledged' },
        },
      },
    },
    '/generations': {
      get: {
        summary: 'List user generation history',
        tags: ['History & Outputs'],
        responses: {
          200: { description: 'List of past video generations' },
        },
      },
    },
    '/generations/{id}': {
      delete: {
        summary: 'Delete a generation record and all stored media files',
        tags: ['History & Outputs'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Generation deleted successfully' },
        },
      },
    },
    '/system/capabilities': {
      get: {
        summary: 'Detect and inspect hardware capabilities (CUDA, VRAM, FFmpeg, CPU)',
        tags: ['System'],
        responses: {
          200: { description: 'Hardware diagnostics and model compatibility' },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check endpoint',
        tags: ['System'],
        responses: {
          200: { description: 'System healthy' },
        },
      },
    },
  },
};
