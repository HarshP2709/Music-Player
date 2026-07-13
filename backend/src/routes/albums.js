/**
 * Albums Routes — /api/albums
 */

import { Router } from 'express';
import { adminSupabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/albums ────────────────────────────────────────────────────────────
// Query params: ?limit=20&offset=0&q=title&trending=true&featured=true
router.get('/', optionalAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
  const offset = parseInt(req.query.offset || '0');
  const { q, trending, featured } = req.query;

  let query = adminSupabase
    .from('albums')
    .select('id, title, slug, cover_url, release_date, genre, total_tracks, total_duration, play_count, is_featured, is_trending, artists(id, name)', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('play_count', { ascending: false });

  if (q)                  query = query.ilike('title', `%${q}%`);
  if (trending  === 'true') query = query.eq('is_trending', true);
  if (featured  === 'true') query = query.eq('is_featured', true);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, limit, offset });
});

// ─── GET /api/albums/:id ────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('albums')
    .select('*, artists(id, name, image_url), songs(id, title, cover_url, audio_url, duration, track_number, play_count)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Album not found.' });

  // Sort songs by track number
  if (data?.songs) {
    data.songs.sort((a, b) => (a.track_number || 999) - (b.track_number || 999));
  }
  res.json({ data });
});

export default router;
