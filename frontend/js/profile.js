/**
 * Harmony Music Player - Profile Module
 * Profile update, avatar upload, settings, account deletion
 */

import supabase, { storageHelpers, BUCKETS } from './supabase.js';
import { auth } from './auth.js';
import notify from './notifications.js';
import { sanitizeHTML, validate } from './utils.js';

// ─── Profile Operations ───────────────────────────────────────────────────────

/**
 * Update user profile fields
 * @param {Object} updates
 */
export async function updateProfile(updates) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const sanitized = {
    full_name: sanitizeHTML(updates.full_name || ''),
    username: sanitizeHTML(updates.username || '').toLowerCase(),
    phone: sanitizeHTML(updates.phone || ''),
    bio: sanitizeHTML(updates.bio || ''),
    country: updates.country || 'US',
    language: updates.language || 'en',
  };

  // Check username uniqueness (exclude self)
  if (sanitized.username) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', sanitized.username)
      .neq('id', user.id)
      .maybeSingle();
    if (data) return { error: 'Username is already taken.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(sanitized)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  notify.success('Profile Updated', 'Your profile has been saved.');
  return { data };
}

/**
 * Upload and update avatar
 * @param {File} file
 */
export async function uploadAvatar(file) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  // Validate file
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) return { error: 'Image must be under 5MB.' };
  if (!file.type.startsWith('image/')) return { error: 'Please select an image file.' };

  try {
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    await storageHelpers.upload(BUCKETS.AVATARS, path, file, { contentType: file.type });
    const avatarUrl = storageHelpers.getPublicUrl(BUCKETS.AVATARS, path) + `?t=${Date.now()}`;

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (error) return { error: error.message };
    notify.success('Avatar Updated', 'Profile picture changed successfully!');
    return { data, avatarUrl };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Update user settings (volume, theme, etc.)
 * @param {Object} settings
 */
export async function updateSettings(settings) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('settings')
    .update(settings)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

/**
 * Get user settings
 */
export async function getSettings() {
  const user = await auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return data;
}

/**
 * Update theme preference
 * @param {'dark'|'light'|'system'} theme
 */
export async function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('harmony_theme', theme);

  const user = await auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ theme }).eq('id', user.id);
  }
}

/**
 * Load and apply saved theme
 */
export function applyTheme() {
  const saved = localStorage.getItem('harmony_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  return saved;
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const user = await auth.getUser();
  if (!user) return null;

  const [songsPlayed, favCount, playlistCount, totalTime] = await Promise.all([
    supabase.from('recently_played').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('listening_history').select('duration_listened').eq('user_id', user.id),
  ]);

  const totalListenTime = (totalTime.data || []).reduce((sum, r) => sum + (r.duration_listened || 0), 0);

  return {
    songsPlayed: songsPlayed.count || 0,
    favoritesCount: favCount.count || 0,
    playlistCount: playlistCount.count || 0,
    totalListenTime,
  };
}

/**
 * Delete account permanently
 */
export async function deleteAccount() {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  // Delete profile (cascade handles related data)
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (error) return { error: error.message };

  await supabase.auth.signOut();
  return { success: true };
}

// ─── Profile Form Init ────────────────────────────────────────────────────────

export function initProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Saving...';

    const { data, error } = await updateProfile({
      full_name: form.querySelector('#fullName')?.value,
      username: form.querySelector('#username')?.value,
      phone: form.querySelector('#phone')?.value,
      bio: form.querySelector('#bio')?.value,
      country: form.querySelector('#country')?.value,
    });

    btn.disabled = false;
    btn.innerHTML = 'Save Changes';

    if (error) notify.error('Update Failed', error);
  });

  // Avatar upload
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Preview
      const reader = new FileReader();
      reader.onload = (ev) => { if (avatarPreview) avatarPreview.src = ev.target.result; };
      reader.readAsDataURL(file);

      const { avatarUrl, error } = await uploadAvatar(file);
      if (error) notify.error('Upload Failed', error);
      else if (avatarUrl && avatarPreview) avatarPreview.src = avatarUrl;
    });
  }

  // Password change form
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = passwordForm.querySelector('#newPassword')?.value;
      const confirm = passwordForm.querySelector('#confirmPassword')?.value;

      if (newPass !== confirm) { notify.error('Error', 'Passwords do not match.'); return; }

      const { error } = await auth.updatePassword(newPass);
      if (error) notify.error('Error', error);
      else {
        notify.success('Password Updated', 'Your password has been changed.');
        passwordForm.reset();
      }
    });
  }
}
