import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
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

// Unknown API routes → 404 (instead of a leaked 500 "Cannot GET /x")
app.use((_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
