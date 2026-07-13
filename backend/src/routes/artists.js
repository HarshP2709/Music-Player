/**
 * Artists Routes — /api/artists
 */

import { Router } from 'express';
import { adminSupabase } from '../config/supabase.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/artists ──────────────────────────────────────────────────────────
// Query params: ?limit=20&offset=0&q=name&genre=Pop
router.get('/', optionalAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
  const offset = parseInt(req.query.offset || '0');
  const { q, genre } = req.query;

  let query = adminSupabase
    .from('artists')
    .select('id, name, slug, image_url, cover_url, genre, verified, monthly_listeners', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('monthly_listeners', { ascending: false });

  if (q)     query = query.ilike('name', `%${q}%`);
  if (genre) query = query.contains('genre', [genre]);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, limit, offset });
});

// ─── GET /api/artists/:id ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('artists')
    .select('*, albums(id, title, cover_url, release_date, total_tracks)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Artist not found.' });
  res.json({ data });
});

// ─── GET /api/artists/:id/songs ────────────────────────────────────────────────
router.get('/:id/songs', optionalAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit || '50'), 200);
  const offset = parseInt(req.query.offset || '0');

  const { data, error } = await adminSupabase
    .from('songs')
    .select('id, title, cover_url, audio_url, duration, track_number, genre, year, play_count, albums(id, title)')
    .eq('artist_id', req.params.id)
    .eq('is_active', true)
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

export default router;
