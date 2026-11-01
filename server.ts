import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './server/src/config/env';
import { apiRouter } from './server/src/routes/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = config.port;

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite dev server and Google Fonts compatibility
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS headers for split frontend (Vercel) / backend (Render) deployment
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = process.env.FRONTEND_URL;
    if (allowed && origin && (allowed === '*' || allowed.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Rate limiting for verification endpoint
  const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60, // 60 requests per 15 min
    message: {
      success: false,
      error: 'Too many verification requests submitted from this IP. Please try again shortly.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/verify', verifyLimiter);

  // Mount API Router
  app.use('/api', apiRouter);

  // Development vs Production
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Central error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  app.listen(port, '0.0.0.0', () => {
    const status = validateConfig();
    console.log(`[TruthLens AI] Server running on http://0.0.0.0:${port}`);
    if (!status.valid) {
      console.warn(`[TruthLens AI] Config warnings: ${status.issues.join('; ')}`);
    }
  });
}

startServer().catch(err => {
  console.error('[TruthLens AI] Fatal server startup error:', err);
  process.exit(1);
});
