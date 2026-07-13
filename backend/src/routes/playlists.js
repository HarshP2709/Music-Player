/**
 * Playlists Routes — /api/playlists
 */

import { Router } from 'express';
import { adminSupabase, userSupabase } from '../config/supabase.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireFields, sanitize } from '../middleware/validate.js';

const router = Router();

// ─── GET /api/playlists — current user's playlists ────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const db = userSupabase(req.accessToken);
  const { data, error } = await db
    .from('playlists')
    .select('*, playlist_songs(id, songs(id, title, duration, cover_url, artists(name)))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// ─── GET /api/playlists/:id ───────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const db = req.accessToken ? userSupabase(req.accessToken) : adminSupabase;

  const { data, error } = await db
    .from('playlists')
    .select('*, profiles(username, avatar_url), playlist_songs(id, position, songs(id, title, duration, cover_url, audio_url, genre, year, play_count, likes_count, artists(id, name, image_url), albums(id, title, cover_url)))')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Playlist not found.' });

  if (data?.playlist_songs) {
    data.playlist_songs.sort((a, b) => a.position - b.position);
  }
  res.json({ data });
});

// ─── POST /api/playlists ─────────────────────────── create ──────────────────
router.post('/', requireAuth, requireFields('name'), async (req, res) => {
  const { name, description = '', cover_url, is_public = false } = req.body;
  const db = userSupabase(req.accessToken);

  const { data, error } = await db
    .from('playlists')
    .insert({
      user_id:     req.user.id,
      name:        sanitize(name),
      description: sanitize(description),
      cover_url:   cover_url || null,
      is_public,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ data });
});

// ─── PATCH /api/playlists/:id ────────────────────── update ──────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const { name, description, cover_url, is_public } = req.body;
  const db = userSupabase(req.accessToken);

  const updates = {};
  if (name        !== undefined) updates.name        = sanitize(name);
  if (description !== undefined) updates.description = sanitize(description);
  if (cover_url   !== undefined) updates.cover_url   = cover_url;
  if (is_public   !== undefined) updates.is_public   = is_public;

  const { data, error } = await db
    .from('playlists')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// ─── DELETE /api/playlists/:id ───────────────────── delete ──────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const db = userSupabase(req.accessToken);
  const { error } = await db
    .from('playlists')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ─── POST /api/playlists/:id/songs ──────────────── add song ─────────────────
router.post('/:id/songs', requireAuth, requireFields('song_id'), async (req, res) => {
  const { song_id } = req.body;
  const playlistId  = req.params.id;
  const db = userSupabase(req.accessToken);

  // Duplicate check
  const { data: existing } = await db
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('song_id', song_id)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'Song already in playlist.' });

  // Get next position
  const { data: posRow } = await db
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (posRow?.position || 0) + 1;

  const { error } = await db
    .from('playlist_songs')
    .insert({ playlist_id: playlistId, song_id, added_by: req.user.id, position });

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ success: true });
});

// ─── DELETE /api/playlists/:id/songs/:songId ─────── remove song ─────────────
router.delete('/:id/songs/:songId', requireAuth, async (req, res) => {
  const db = userSupabase(req.accessToken);
  const { error } = await db
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', req.params.id)
    .eq('song_id', req.params.songId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ─── PATCH /api/playlists/:id/reorder ────────────── reorder songs ────────────
router.patch('/:id/reorder', requireAuth, async (req, res) => {
  const { ordered_song_ids } = req.body;
  if (!Array.isArray(ordered_song_ids)) {
    return res.status(400).json({ error: 'ordered_song_ids must be an array.' });
  }

  const db = userSupabase(req.accessToken);
  const updates = ordered_song_ids.map((songId, index) =>
    db.from('playlist_songs')
      .update({ position: index + 1 })
      .eq('playlist_id', req.params.id)
      .eq('song_id', songId)
  );

  await Promise.all(updates);
  res.json({ success: true });
});

export default router;
