import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { initDb } from './db/schema.js';
import searchRouter from './routes/search.js';
import productsRouter from './routes/products.js';
import imagesRouter from './routes/images.js';
import compareRouter from './routes/compare.js';
import historyRouter from './routes/history.js';
import basketRouter from './routes/basket.js';
import alertsRouter from './routes/alerts.js';
import storesRouter from './routes/stores.js';
import chatRouter from './routes/chat.js';
import aiSearchRouter from './routes/ai-search.js';
import analysisRouter from './routes/analysis.js';
import authRouter from './routes/auth.js';
import { startScheduler } from './jobs/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS for mobile app dev
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Init database
initDb();

// Routes
app.use('/api/search', searchRouter);
app.use('/api/product', productsRouter);
app.use('/api/compare', compareRouter);
app.use('/api/basket', basketRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/history', historyRouter);
app.use('/api/images', imagesRouter);
app.use('/api/stores', storesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/ai', aiSearchRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SHEADARE running on http://localhost:${PORT}`);
  startScheduler();
});
