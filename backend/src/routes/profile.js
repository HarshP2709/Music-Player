/**
 * Profile Routes — /api/profile
 * Handles user profile, settings, stats, and favorites.
 */

import { Router } from 'express';
import { adminSupabase, userSupabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitize } from '../middleware/validate.js';

const router = Router();

// ─── GET /api/profile ────────────────────────────── fetch my profile ─────────
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// ─── PATCH /api/profile ──────────────────────────── update profile ────────────
router.patch('/', requireAuth, async (req, res) => {
  const { full_name, username, phone, bio, country, language } = req.body;
  const db = userSupabase(req.accessToken);

  // Unique username check
  if (username) {
    const { data: existing } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('username', sanitize(username).toLowerCase())
      .neq('id', req.user.id)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Username already taken.' });
  }

  const updates = {};
  if (full_name !== undefined) updates.full_name = sanitize(full_name);
  if (username  !== undefined) updates.username  = sanitize(username).toLowerCase();
  if (phone     !== undefined) updates.phone     = sanitize(phone);
  if (bio       !== undefined) updates.bio       = sanitize(bio);
  if (country   !== undefined) updates.country   = country;
  if (language  !== undefined) updates.language  = language;

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// ─── GET /api/profile/stats ──────────────────────── user stats ───────────────
router.get('/stats', requireAuth, async (req, res) => {
  const [songsPlayed, favCount, plCount, listenTime] = await Promise.all([
    adminSupabase.from('recently_played').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id),
    adminSupabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id),
    adminSupabase.from('playlists').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id),
    adminSupabase.from('listening_history').select('duration_listened').eq('user_id', req.user.id),
  ]);

  const totalListenTime = (listenTime.data || []).reduce((s, r) => s + (r.duration_listened || 0), 0);

  res.json({
    data: {
      songsPlayed:    songsPlayed.count  || 0,
      favoritesCount: favCount.count     || 0,
      playlistCount:  plCount.count      || 0,
      totalListenTime,
    },
  });
});

// ─── GET /api/profile/settings ────────────────────── user settings ───────────
router.get('/settings', requireAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('settings')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

// ─── PATCH /api/profile/settings ─────────────────── update settings ──────────
router.patch('/settings', requireAuth, async (req, res) => {
  const allowed = ['volume', 'playback_speed', 'shuffle', 'repeat_mode',
                   'equalizer_preset', 'quality', 'autoplay', 'crossfade',
                   'notifications_enabled', 'email_notifications', 'sleep_timer'];

  const updates = {};
  allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const db = userSupabase(req.accessToken);
  const { data, error } = await db
    .from('settings')
    .update(updates)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// ─── GET /api/profile/favorites ──────────────────── favorites list ───────────
router.get('/favorites', requireAuth, async (req, res) => {
  const { data, error } = await adminSupabase
    .from('favorites')
    .select('id, created_at, songs(id, title, duration, cover_url, audio_url, genre, year, play_count, artists(id, name, image_url), albums(id, title, cover_url))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: (data || []).map(f => f.songs).filter(Boolean) });
});

// ─── POST /api/profile/favorites/:songId ────────── toggle favorite ───────────
router.post('/favorites/:songId', requireAuth, async (req, res) => {
  const { songId } = req.params;
  const db = userSupabase(req.accessToken);

  const { data: existing } = await db
    .from('favorites')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('song_id', songId)
    .maybeSingle();

  if (existing) {
    await db.from('favorites').delete().eq('id', existing.id);
    return res.json({ liked: false });
  }

  const { error } = await db.from('favorites').insert({ user_id: req.user.id, song_id: songId });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ liked: true });
});

export default router;
