/**
 * Songs Routes — /api/songs
 */

import { Router } from 'express';
import { adminSupabase } from '../config/supabase.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/songs ─────────────────────────────── public listing ────────────
// Query params: ?limit=20&offset=0&genre=Pop&featured=true&trending=true&q=title
router.get('/', optionalAuth, async (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit  || '20'), 100);
  const offset   = parseInt(req.query.offset || '0');
  const { genre, featured, trending, q } = req.query;

  let query = adminSupabase
    .from('songs')
    .select('id, title, cover_url, audio_url, duration, genre, year, play_count, likes_count, is_featured, is_trending, artists(id, name, image_url), albums(id, title, cover_url)', { count: 'exact' })
    .eq('is_active', true)
    .range(offset, offset + limit - 1)
    .order('play_count', { ascending: false });

  if (genre)    query = query.eq('genre', genre);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (trending  === 'true') query = query.eq('is_trending', true);
  if (q)        query = query.ilike('title', `%${q}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, limit, offset });
});

// ─── GET /api/songs/:id ─────────────────────────── single song ───────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('songs')
    .select('*, artists(id, name, image_url, genre), albums(id, title, cover_url, release_date)')
    .eq('id', req.params.id)
    .eq('is_active', true)
    .single();

  if (error) return res.status(404).json({ error: 'Song not found.' });
  res.json({ data });
});

// ─── POST /api/songs/:id/play ───────────────────── log play count ────────────
router.post('/:id/play', requireAuth, async (req, res) => {
  const songId = req.params.id;
  const userId = req.user.id;

  // Insert recently_played row — trigger on DB handles play_count increment
  const { error } = await adminSupabase
    .from('recently_played')
    .insert({ user_id: userId, song_id: songId, played_at: new Date().toISOString() });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─── GET /api/songs/recently-played ──────────────── user history ────────────
router.get('/recently-played', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20'), 50);

  const { data, error } = await adminSupabase
    .from('recently_played')
    .select('song_id, played_at, songs(id,title,cover_url,audio_url,duration,artists(name))')
    .eq('user_id', req.user.id)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  const songs = (data || []).map(r => r.songs).filter(Boolean);
  res.json({ data: songs });
});

export default router;
