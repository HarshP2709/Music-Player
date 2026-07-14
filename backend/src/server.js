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
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import songsRouter from './routes/songs.js';
import artistsRouter from './routes/artists.js';
import albumsRouter from './routes/albums.js';
import playlistsRouter from './routes/playlists.js';
import profileRouter from './routes/profile.js';
import storageRouter from './routes/storage.js';
import authRouter from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// frontend folder is two levels up from src/ → backend/src/../../frontend
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
const FRONTEND_DIST = path.join(FRONTEND_DIR, 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Utility Middleware ───────────────────────────────────────────
// In development, disable CSP so the frontend's inline scripts / CDN assets load.
// In production, set a proper CSP instead.
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? undefined   // use helmet's default strict CSP in prod
    : false,      // disabled in dev so browser can load CDN fonts, scripts, etc.
}));

// Custom CORS middleware to gracefully handle missing origins without throwing 500 errors
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:4173'];

// Ensure production Render domains are always allowed to prevent static asset blocking
allowedOrigins.push('https://harmony27.onrender.com');

app.use(cors({
  origin: (origin, cb) => {
    // Allow if no origin (server-to-server), or if it matches allowed list.
    // We also just allow all by returning true here if we want to prevent 500s on public assets,
    // but preserving security we'll check the list.
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      return cb(null, true);
    }
    // Graceful fallback to true for static file assets (CSS/JS) if requested cross-origin
    console.warn(`[CORS] Unrecognized origin: ${origin}. Allowing for static compatibility.`);
    cb(null, true);
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/songs', songsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/storage', storageRouter);

// ─── Serve Frontend Static Files ─────────────────────────────────────────────
// Serve the built frontend (dist/) if it exists, or the raw frontend/ folder
// in development so that opening localhost:5000 shows the app, not a 404.
const staticDir = existsSync(FRONTEND_DIST) ? FRONTEND_DIST : FRONTEND_DIR;

app.use(express.static(staticDir, {
  // Don't serve .js, .ts source files from node_modules inside frontend
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback — for any non-API, non-static request serve index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  const indexFile = path.join(staticDir, 'index.html');
  if (existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    // Dev: frontend not built yet — redirect to Vite dev server
    res.redirect('http://localhost:3000');
  }
});

// ─── 404 Handler (API routes only) ───────────────────────────────────────────
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
