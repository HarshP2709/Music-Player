/**
 * Storage Routes — /api/storage
 * Handles signed upload URLs and file deletion via Supabase Storage admin.
 */

import { Router } from 'express';
import multer from 'multer';
import { adminSupabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router  = Router();

// Multer: store in memory (max 60 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});

// ─── POST /api/storage/upload/song ──────────────── upload audio ──────────────
router.post('/upload/song', requireAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Unsupported audio format.' });
  }

  const ext  = file.originalname.split('.').pop();
  const path = `${req.user.id}/${uuidv4()}.${ext}`;

  const { error } = await adminSupabase.storage
    .from('songs')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = adminSupabase.storage.from('songs').getPublicUrl(path);
  res.status(201).json({ url: publicUrl, path });
});

// ─── POST /api/storage/upload/cover ─────────────── upload image ──────────────
router.post('/upload/cover', requireAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded.' });
  if (!file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'File must be an image.' });
  }
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Cover image must be under 10 MB.' });
  }

  const ext  = file.originalname.split('.').pop();
  const path = `${uuidv4()}.${ext}`;

  const { error } = await adminSupabase.storage
    .from('covers')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = adminSupabase.storage.from('covers').getPublicUrl(path);
  res.status(201).json({ url: publicUrl, path });
});

// ─── POST /api/storage/upload/avatar ────────────── upload avatar ─────────────
router.post('/upload/avatar', requireAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded.' });
  if (!file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'File must be an image.' });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Avatar must be under 5 MB.' });
  }

  const ext  = file.originalname.split('.').pop();
  const path = `${req.user.id}/avatar.${ext}`;

  const { error } = await adminSupabase.storage
    .from('avatars')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = adminSupabase.storage.from('avatars').getPublicUrl(path);

  // Update profile avatar_url
  await adminSupabase
    .from('profiles')
    .update({ avatar_url: publicUrl + `?t=${Date.now()}` })
    .eq('id', req.user.id);

  res.status(201).json({ url: publicUrl, path });
});

// ─── DELETE /api/storage ─────────────────────────── delete file ──────────────
router.delete('/', requireAuth, async (req, res) => {
  const { bucket, path } = req.body;
  if (!bucket || !path) return res.status(400).json({ error: 'bucket and path are required.' });

  // Only allow users to delete their own files
  if (!path.startsWith(req.user.id + '/') && bucket !== 'covers') {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const { error } = await adminSupabase.storage.from(bucket).remove([path]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
