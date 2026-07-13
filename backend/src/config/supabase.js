/**
 * Supabase Admin Client — server-side only
 * Uses the SERVICE ROLE KEY — never send this to the browser.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[Harmony Backend] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
  );
}

/** Admin client — bypasses RLS. Use only for trusted server operations. */
export const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Build a user-scoped Supabase client from a JWT.
 * Respects RLS just like the browser client does.
 * @param {string} accessToken
 */
export function userSupabase(accessToken) {
  return createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
