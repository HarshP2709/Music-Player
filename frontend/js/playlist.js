/**
 * Harmony Music Player - Playlist Module
 * CRUD operations for playlists, drag-and-drop reordering, statistics
 */

import supabase from './supabase.js';
import { auth } from './auth.js';
import notify from './notifications.js';
import { sanitizeHTML, formatDuration } from './utils.js';

// ─── Playlist CRUD ────────────────────────────────────────────────────────────

/**
 * Fetch all playlists for the current user
 */
export async function getUserPlaylists() {
  const user = await auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      playlist_songs (
        id,
        songs ( id, title, duration, cover_url, artists ( name ) )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('Playlist fetch error:', error); return []; }
  return data || [];
}

/**
 * Get a single playlist with all songs
 * @param {string} playlistId
 */
export async function getPlaylist(playlistId) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      profiles ( username, avatar_url ),
      playlist_songs (
        id, position,
        songs (
          id, title, duration, cover_url, audio_url, genre, year,
          play_count, likes_count,
          artists ( id, name, image_url ),
          albums ( id, title, cover_url )
        )
      )
    `)
    .eq('id', playlistId)
    .single();

  if (error) return null;

  // Sort by position
  if (data?.playlist_songs) {
    data.playlist_songs.sort((a, b) => a.position - b.position);
  }
  return data;
}

/**
 * Create a new playlist
 * @param {Object} payload - { name, description, cover_url, is_public }
 */
export async function createPlaylist(payload) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: sanitizeHTML(payload.name),
      description: sanitizeHTML(payload.description || ''),
      cover_url: payload.cover_url || null,
      is_public: payload.is_public || false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  notify.success('Playlist Created', `"${data.name}" is ready!`);
  return { data };
}

/**
 * Update playlist details
 * @param {string} playlistId
 * @param {Object} updates
 */
export async function updatePlaylist(playlistId, updates) {
  const { data, error } = await supabase
    .from('playlists')
    .update({
      name: sanitizeHTML(updates.name),
      description: sanitizeHTML(updates.description || ''),
      cover_url: updates.cover_url,
      is_public: updates.is_public,
    })
    .eq('id', playlistId)
    .select()
    .single();

  if (error) return { error: error.message };
  notify.success('Playlist Updated', 'Changes saved successfully.');
  return { data };
}

/**
 * Delete a playlist
 * @param {string} playlistId
 */
export async function deletePlaylist(playlistId) {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (error) return { error: error.message };
  notify.success('Playlist Deleted', 'Playlist has been removed.');
  return { success: true };
}

// ─── Playlist Songs ───────────────────────────────────────────────────────────

/**
 * Add a song to a playlist
 * @param {string} playlistId
 * @param {string} songId
 */
export async function addSongToPlaylist(playlistId, songId) {
  const user = await auth.getUser();

  // Check if already in playlist
  const { data: existing } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)
    .maybeSingle();

  if (existing) {
    notify.warning('Already Added', 'This song is already in the playlist.');
    return { error: 'Duplicate' };
  }

  // Get current max position
  const { data: posData } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (posData?.position || 0) + 1;

  const { error } = await supabase
    .from('playlist_songs')
    .insert({ playlist_id: playlistId, song_id: songId, added_by: user?.id, position });

  if (error) return { error: error.message };
  notify.success('Added to Playlist', 'Song added successfully!');
  return { success: true };
}

/**
 * Remove a song from a playlist
 * @param {string} playlistId
 * @param {string} songId
 */
export async function removeSongFromPlaylist(playlistId, songId) {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);

  if (error) return { error: error.message };
  notify.info('Removed', 'Song removed from playlist.');
  return { success: true };
}

/**
 * Reorder songs in a playlist (after drag-and-drop)
 * @param {string} playlistId
 * @param {Array} orderedSongIds
 */
export async function reorderPlaylist(playlistId, orderedSongIds) {
  const updates = orderedSongIds.map((songId, index) => ({
    playlist_id: playlistId,
    song_id: songId,
    position: index + 1,
  }));

  for (const update of updates) {
    await supabase
      .from('playlist_songs')
      .update({ position: update.position })
      .eq('playlist_id', update.playlist_id)
      .eq('song_id', update.song_id);
  }
  return { success: true };
}

// ─── Playlist UI Render ───────────────────────────────────────────────────────

/**
 * Render playlist cards grid
 * @param {HTMLElement} container
 * @param {Array} playlists
 * @param {Function} onPlay - Callback(playlist)
 */
export function renderPlaylistGrid(container, playlists, onPlay) {
  if (!container) return;

  if (playlists.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-music"></i>
        <h3>No playlists yet</h3>
        <p>Create your first playlist to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = playlists.map(pl => {
    const songsCount = pl.playlist_songs?.length || pl.total_tracks || 0;
    const duration = formatDuration(pl.total_duration || 0);
    const cover = pl.cover_url || `https://picsum.photos/seed/${pl.id}/300/300`;

    return `
      <div class="playlist-card" data-id="${pl.id}">
        <div class="playlist-card__cover">
          <img src="${cover}" alt="${sanitizeHTML(pl.name)}" loading="lazy">
          <button class="playlist-card__play btn-play" data-playlist-id="${pl.id}" aria-label="Play ${sanitizeHTML(pl.name)}">
            <i class="fas fa-play"></i>
          </button>
          ${pl.is_public ? '<span class="playlist-badge">Public</span>' : ''}
        </div>
        <div class="playlist-card__info">
          <h3 class="playlist-card__name">${sanitizeHTML(pl.name)}</h3>
          <p class="playlist-card__meta">${songsCount} songs · ${duration}</p>
        </div>
        <div class="playlist-card__actions">
          <button class="btn-icon" data-action="edit" data-id="${pl.id}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-danger" data-action="delete" data-id="${pl.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');

  // Attach play buttons
  container.querySelectorAll('.playlist-card__play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pl = playlists.find(p => p.id === btn.dataset.playlistId);
      if (pl && onPlay) onPlay(pl);
    });
  });
}

/**
 * Initialize drag-and-drop sorting for a playlist
 * @param {string} containerId
 * @param {string} playlistId
 */
export function initDragDrop(containerId, playlistId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let draggedEl = null;

  container.addEventListener('dragstart', (e) => {
    draggedEl = e.target.closest('[draggable]');
    if (draggedEl) draggedEl.classList.add('dragging');
  });

  container.addEventListener('dragend', () => {
    if (draggedEl) draggedEl.classList.remove('dragging');
    draggedEl = null;

    const orderedIds = [...container.querySelectorAll('[data-song-id]')]
      .map(el => el.dataset.songId);
    reorderPlaylist(playlistId, orderedIds);
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('[draggable]');
    if (!target || target === draggedEl) return;
    const rect = target.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    container.insertBefore(draggedEl, after ? target.nextSibling : target);
  });
}
