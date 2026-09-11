import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Health route compatibility
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'AI Video Self-Hosted Inference Pipeline' });
  });

  // Ensure any unmatched /api route returns clean JSON (never fall through to Vite HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'API_ENDPOINT_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Global API error handler ensuring JSON response on unexpected errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('API Error caught by middleware:', err);
      res.status(err.status || 500).json({
        error: {
          code: err.code || 'INTERNAL_SERVER_ERROR',
          message: err.message || 'An unexpected error occurred processing your request',
        },
      });
      return;
    }
    next(err);
  });

  // Vite middleware for development vs. Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Video Generator Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
