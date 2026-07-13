/**
 * Harmony Music Player - Search Module
 * Live search across songs, artists, albums, playlists
 */

import supabase from './supabase.js';
import { debounce, sanitizeHTML, formatTime } from './utils.js';

let searchOverlay = null;
let searchInput = null;
let resultsContainer = null;
let currentQuery = '';

/**
 * Search database across all entities
 * @param {string} query
 * @returns {Promise<Object>} { songs, artists, albums, playlists }
 */
export async function search(query) {
  if (!query || query.trim().length < 2) return { songs: [], artists: [], albums: [], playlists: [] };

  const q = query.trim().toLowerCase();

  const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.all([
    supabase
      .from('songs')
      .select('id, title, cover_url, duration, artists(name), albums(title)')
      .ilike('title', `%${q}%`)
      .eq('is_active', true)
      .limit(8),

    supabase
      .from('artists')
      .select('id, name, image_url, monthly_listeners, genre')
      .ilike('name', `%${q}%`)
      .limit(5),

    supabase
      .from('albums')
      .select('id, title, cover_url, release_date, artists(name)')
      .ilike('title', `%${q}%`)
      .limit(5),

    supabase
      .from('playlists')
      .select('id, name, cover_url, total_tracks, is_public')
      .ilike('name', `%${q}%`)
      .eq('is_public', true)
      .limit(5),
  ]);

  return {
    songs: songsRes.data || [],
    artists: artistsRes.data || [],
    albums: albumsRes.data || [],
    playlists: playlistsRes.data || [],
  };
}

/**
 * Render search results HTML
 * @param {Object} results
 * @param {string} query
 */
function renderResults(results, query) {
  const { songs, artists, albums, playlists } = results;
  const total = songs.length + artists.length + albums.length + playlists.length;

  if (total === 0) {
    return `
      <div class="search-empty">
        <i class="fas fa-search"></i>
        <p>No results for "<strong>${sanitizeHTML(query)}</strong>"</p>
        <p class="muted">Try a different spelling or search term.</p>
      </div>
    `;
  }

  let html = '';

  if (songs.length > 0) {
    html += `
      <div class="search-section">
        <h4 class="search-section__title">Songs</h4>
        ${songs.map(song => `
          <div class="search-result-item" data-type="song" data-id="${song.id}" role="option" tabindex="0">
            <img src="${song.cover_url || 'assets/images/default-cover.jpg'}" alt="" loading="lazy">
            <div class="search-result__info">
              <div class="search-result__name">${highlightMatch(sanitizeHTML(song.title), query)}</div>
              <div class="search-result__sub">${sanitizeHTML(song.artists?.name || 'Unknown')} · ${formatTime(song.duration)}</div>
            </div>
            <i class="fas fa-play search-result__icon"></i>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (artists.length > 0) {
    html += `
      <div class="search-section">
        <h4 class="search-section__title">Artists</h4>
        ${artists.map(artist => `
          <div class="search-result-item" data-type="artist" data-id="${artist.id}" role="option" tabindex="0">
            <img src="${artist.image_url || 'assets/images/default-artist.jpg'}" alt="" class="rounded" loading="lazy">
            <div class="search-result__info">
              <div class="search-result__name">${highlightMatch(sanitizeHTML(artist.name), query)}</div>
              <div class="search-result__sub">${(artist.genre || []).join(', ')}</div>
            </div>
            <i class="fas fa-chevron-right search-result__icon"></i>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (albums.length > 0) {
    html += `
      <div class="search-section">
        <h4 class="search-section__title">Albums</h4>
        ${albums.map(album => `
          <div class="search-result-item" data-type="album" data-id="${album.id}" role="option" tabindex="0">
            <img src="${album.cover_url || 'assets/images/default-cover.jpg'}" alt="" loading="lazy">
            <div class="search-result__info">
              <div class="search-result__name">${highlightMatch(sanitizeHTML(album.title), query)}</div>
              <div class="search-result__sub">${sanitizeHTML(album.artists?.name || 'Unknown')} · ${album.release_date ? new Date(album.release_date).getFullYear() : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (playlists.length > 0) {
    html += `
      <div class="search-section">
        <h4 class="search-section__title">Playlists</h4>
        ${playlists.map(pl => `
          <div class="search-result-item" data-type="playlist" data-id="${pl.id}" role="option" tabindex="0">
            <img src="${pl.cover_url || 'assets/images/default-playlist.jpg'}" alt="" loading="lazy">
            <div class="search-result__info">
              <div class="search-result__name">${highlightMatch(sanitizeHTML(pl.name), query)}</div>
              <div class="search-result__sub">${pl.total_tracks || 0} songs</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return html;
}

/**
 * Highlight matching text in a string
 */
function highlightMatch(text, query) {
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// ─── Search Overlay UI ────────────────────────────────────────────────────────

/**
 * Initialize the search overlay and live search functionality
 */
export function initSearch(onResultClick) {
  searchInput = document.getElementById('searchInput') || document.querySelector('.search-input');
  searchOverlay = document.getElementById('searchOverlay');
  resultsContainer = document.getElementById('searchResults');

  if (!searchInput) return;

  const debouncedSearch = debounce(async (query) => {
    currentQuery = query;
    if (!query || query.length < 2) {
      if (resultsContainer) resultsContainer.innerHTML = '';
      hideOverlay();
      return;
    }

    showLoadingState();
    showOverlay();

    const results = await search(query);
    if (currentQuery !== query) return; // Stale result

    if (resultsContainer) {
      resultsContainer.innerHTML = renderResults(results, query);

      // Attach result click handlers
      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          if (onResultClick) onResultClick(item.dataset.type, item.dataset.id);
          hideOverlay();
          searchInput.value = '';
        });
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') item.click();
        });
      });
    }
  }, 300);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value.trim());
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.length >= 2) showOverlay();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) hideOverlay();
  });

  // Keyboard navigation for results
  searchInput.addEventListener('keydown', (e) => {
    if (!resultsContainer) return;
    const items = [...resultsContainer.querySelectorAll('.search-result-item')];
    const current = document.activeElement;
    const idx = items.indexOf(current);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') {
      hideOverlay();
      searchInput.blur();
    }
  });
}

function showLoadingState() {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = `
    <div class="search-loading">
      <div class="spinner"></div>
      <span>Searching...</span>
    </div>
  `;
}

function showOverlay() {
  if (searchOverlay) searchOverlay.classList.add('visible');
}

function hideOverlay() {
  if (searchOverlay) searchOverlay.classList.remove('visible');
}
