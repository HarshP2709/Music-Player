/**
 * Harmony Music Player — Backend Entry Point
 * Express server wiring: middleware → routes → error handler → listen
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import songsRouter    from './routes/songs.js';
import artistsRouter  from './routes/artists.js';
import albumsRouter   from './routes/albums.js';
import playlistsRouter from './routes/playlists.js';
import profileRouter  from './routes/profile.js';
import storageRouter  from './routes/storage.js';
import authRouter     from './routes/auth.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman) in development
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX       || '200'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests — please try again later.' },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/songs',     songsRouter);
app.use('/api/artists',   artistsRouter);
app.use('/api/albums',    albumsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/profile',   profileRouter);
app.use('/api/storage',   storageRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Harmony API listening on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
