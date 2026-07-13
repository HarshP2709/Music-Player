/**
 * Auth Routes — /api/auth
 * Server-side helpers: admin-level user management (e.g., delete, disable)
 * Note: register/login are handled directly by Supabase Auth on the frontend.
 */

import { Router } from 'express';
import { adminSupabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns current user + profile
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile, error } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ user: req.user, profile });
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────
// Permanently delete user account + cascade all data
router.delete('/account', requireAuth, async (req, res) => {
  const { error } = await adminSupabase.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─── PATCH /api/auth/last-seen ────────────────────────────────────────────────
router.patch('/last-seen', requireAuth, async (req, res) => {
  const { error } = await adminSupabase
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
