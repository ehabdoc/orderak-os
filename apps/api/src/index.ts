import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './middleware/error.js';
import authRouter from './routes/auth.js';
import categoriesRouter from './routes/categories.js';
import menuItemsRouter from './routes/menuItems.js';
import ordersRouter from './routes/orders.js';
import shiftsRouter from './routes/shifts.js';
import syncRouter from './routes/sync.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(',').map((s) => s.trim()) : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'orderak-api', time: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/categories', categoriesRouter);
app.use('/menu-items', menuItemsRouter);
app.use('/orders', ordersRouter);
app.use('/shifts', shiftsRouter);
app.use('/sync', syncRouter);

// Aliases under /api/* for single-service deployment (frontend + API on one
// domain, e.g. Render/Railway/Fly). In docker-compose mode nginx strips the
// /api prefix before proxying, so these aliases are harmless duplicates there.
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/menu-items', menuItemsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/sync', syncRouter);
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'orderak-api', time: new Date().toISOString() });
});

// ---- Optional: serve the built web app from the same process ----
// Enabled when SERVE_WEB=true (single-container hosts) and the web dist
// exists next to the API (copied at Docker build time).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/index.js -> dist/ ; web dist is copied to ../../web-dist in the image
const WEB_DIST = process.env.WEB_DIST || path.resolve(__dirname, '../../web-dist');
const SERVE_WEB = process.env.SERVE_WEB === 'true' || process.env.SERVE_WEB === '1';
if (SERVE_WEB && fs.existsSync(WEB_DIST)) {
  console.log(`[api] serving web UI from ${WEB_DIST}`);
  // Long-cache hashed assets; index.html + SW are never cached aggressively
  // (Vite emits hashed filenames, nginx config handled this in compose mode).
  app.use(
    express.static(WEB_DIST, {
      index: false,
      maxAge: '30d',
      setHeaders: (res, filePath) => {
        if (/(sw\.js|workbox-.*\.js|registerSW\.js|index\.html|manifest\.webmanifest)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }),
  );
  // SPA fallback: everything that is not an API route serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

// Unknown API routes → 404 (instead of a leaked 500 "Cannot GET /x")
app.use((_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
