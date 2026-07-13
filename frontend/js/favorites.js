/**
 * Harmony Music Player - Favorites Module
 * Toggle favorites, fetch favorites list, render favorites UI
 */

import supabase from './supabase.js';
import { auth } from './auth.js';
import notify from './notifications.js';
import { sanitizeHTML, formatTime } from './utils.js';

// ─── Cache ────────────────────────────────────────────────────────────────────
let favoriteIds = new Set();

/**
 * Load all favorite song IDs for the current user into memory cache
 */
export async function loadFavoriteIds() {
  const user = await auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('favorites')
    .select('song_id')
    .eq('user_id', user.id);

  favoriteIds = new Set((data || []).map(f => f.song_id));
  return favoriteIds;
}

/**
 * Check if a song is in favorites
 * @param {string} songId
 * @returns {boolean}
 */
export function isFavorite(songId) {
  return favoriteIds.has(songId);
}

/**
 * Toggle favorite status for a song
 * @param {string} songId
 * @returns {Promise<{liked: boolean}>}
 */
export async function toggleFavorite(songId) {
  const user = await auth.getUser();
  if (!user) {
    notify.warning('Sign In Required', 'Please sign in to save favorites.');
    return { liked: false };
  }

  if (isFavorite(songId)) {
    // Remove from favorites
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', songId);

    if (error) {
      notify.error('Error', 'Could not remove from favorites.');
      return { liked: true };
    }

    favoriteIds.delete(songId);
    notify.info('Removed', 'Removed from your favorites.');
    return { liked: false };
  } else {
    // Add to favorites
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, song_id: songId });

    if (error) {
      notify.error('Error', 'Could not add to favorites.');
      return { liked: false };
    }

    favoriteIds.add(songId);
    notify.success('Added to Favorites', '❤ Song saved to favorites!');
    return { liked: true };
  }
}

/**
 * Fetch all favorite songs with full song data
 * @returns {Promise<Array>}
 */
export async function getFavorites() {
  const user = await auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id, created_at,
      songs (
        id, title, duration, cover_url, audio_url, genre, year, play_count,
        artists ( id, name, image_url ),
        albums ( id, title, cover_url )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('Favorites fetch error:', error); return []; }
  return (data || []).map(f => f.songs).filter(Boolean);
}

/**
 * Get favorites count
 * @returns {Promise<number>}
 */
export async function getFavoritesCount() {
  const user = await auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return count || 0;
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

/**
 * Render favorites list
 * @param {HTMLElement} container
 * @param {Array} songs
 * @param {Function} onPlay
 */
export function renderFavoritesList(container, songs, onPlay) {
  if (!container) return;

  if (songs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-heart"></i>
        <h3>No favorites yet</h3>
        <p>Heart songs you love and they'll appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="song-list">
      <div class="song-list__header">
        <span class="col-num">#</span>
        <span class="col-title">Title</span>
        <span class="col-album">Album</span>
        <span class="col-added">Date Added</span>
        <span class="col-duration"><i class="fas fa-clock"></i></span>
      </div>
      ${songs.map((song, idx) => `
        <div class="song-row" data-song-id="${song.id}" tabindex="0" role="row">
          <span class="col-num">
            <span class="song-num">${idx + 1}</span>
            <button class="btn-play-song" data-idx="${idx}" aria-label="Play ${sanitizeHTML(song.title)}">
              <i class="fas fa-play"></i>
            </button>
          </span>
          <div class="col-title">
            <img class="song-thumb" src="${song.cover_url || 'assets/images/default-cover.jpg'}" alt="" loading="lazy">
            <div>
              <div class="song-title">${sanitizeHTML(song.title)}</div>
              <div class="song-artist">${sanitizeHTML(song.artists?.name || 'Unknown')}</div>
            </div>
          </div>
          <div class="col-album">${sanitizeHTML(song.albums?.title || '—')}</div>
          <div class="col-added">${song.created_at ? new Date(song.created_at).toLocaleDateString() : '—'}</div>
          <div class="col-duration">
            <button class="btn-heart active" data-song-id="${song.id}" aria-label="Remove from favorites">
              <i class="fas fa-heart"></i>
            </button>
            <span>${formatTime(song.duration)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Attach play handlers
  container.querySelectorAll('.btn-play-song').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (onPlay) onPlay(songs, idx);
    });
  });

  container.querySelectorAll('.song-row').forEach((row, idx) => {
    row.addEventListener('dblclick', () => {
      if (onPlay) onPlay(songs, idx);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onPlay?.(songs, idx);
    });
  });

  // Attach heart toggle
  container.querySelectorAll('.btn-heart').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { liked } = await toggleFavorite(btn.dataset.songId);
      if (!liked) {
        const row = btn.closest('.song-row');
        row.style.opacity = '0';
        row.style.transition = 'opacity 0.3s';
        setTimeout(() => row.remove(), 300);
      }
    });
  });
}

/**
 * Update all heart buttons on the page based on favorites cache
 */
export function syncHeartButtons() {
  document.querySelectorAll('.btn-heart[data-song-id]').forEach(btn => {
    const active = isFavorite(btn.dataset.songId);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-label', active ? 'Remove from favorites' : 'Add to favorites');
  });
}
