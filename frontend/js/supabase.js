/**
 * Harmony Music Player - Supabase Client Configuration
 * Reads credentials from Vite environment variables (VITE_* prefix)
 */

import { createClient } from '@supabase/supabase-js';

// ─── Configuration ────────────────────────────────────────────────────────────
// Vite injects VITE_* vars at build/dev time via import.meta.env.
// The fallback literals ensure the app works when opened directly in a browser.
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL
  || 'https://orobcfjiaasgtrsabbaw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yb2JjZmppYWFzZ3Ryc2FiYmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDI5NjcsImV4cCI6MjA5OTUxODk2N30.SbSPLngkWwvUzE3EOaa7cZ5FyDPf9nG25gwlWL31tvE';

// ─── Storage Bucket Names ────────────────────────────────────────────────────
export const BUCKETS = {
  SONGS: import.meta.env?.VITE_SUPABASE_STORAGE_BUCKET || 'songs',
  COVERS: 'covers',
  AVATARS: 'avatars',
  ARTISTS: 'artists',
};

// ─── Create Supabase Client ──────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'harmony-auth-token',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ─── Auth Helpers ────────────────────────────────────────────────────────────
export const authHelpers = {
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateLastSeen(userId) {
    await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
  },
};

// ─── Storage Helpers ─────────────────────────────────────────────────────────
export const storageHelpers = {
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async upload(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, ...options });
    if (error) throw error;
    return data;
  },

  async remove(bucket, paths) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
};

// ─── Realtime Subscriptions ──────────────────────────────────────────────────
export const realtimeHelpers = {
  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  },
};

export default supabase;
