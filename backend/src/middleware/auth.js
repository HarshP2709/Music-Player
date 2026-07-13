/**
 * Authentication middleware
 * Verifies the Bearer JWT sent by the frontend and attaches user to req.
 */

import { adminSupabase } from '../config/supabase.js';

/**
 * requireAuth — reject requests without a valid JWT.
 * Attaches req.user and req.accessToken on success.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user        = user;
  req.accessToken = token;
  next();
}

/**
 * optionalAuth — attach user if present but don't reject unauthenticated requests.
 */
export async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  const { data: { user } } = await adminSupabase.auth.getUser(token);
  req.user        = user || null;
  req.accessToken = user ? token : null;
  next();
}
