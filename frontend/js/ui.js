/**
 * Harmony Music Player - UI Module
 * Player UI bindings, skeleton loaders, bottom player, song cards, modals
 */

import {
  playerState, playerEvents,
  togglePlay, playNext, playPrev,
  toggleShuffle, cycleRepeat,
  setVolume, toggleMute, seekTo,
  setPlaybackSpeed, addToQueue,
} from './player.js';
import { toggleFavorite, isFavorite, syncHeartButtons } from './favorites.js';
import { formatTime, sanitizeHTML, extractDominantColor, $, $$, truncate } from './utils.js';
import { createPlaylist, getUserPlaylists, addSongToPlaylist } from './playlist.js';
import notify from './notifications.js';

// ─── Bottom Player Bar ────────────────────────────────────────────────────────

/**
 * Initialize the sticky bottom music player
 */
export function initBottomPlayer() {
  const player = document.getElementById('bottomPlayer');
  if (!player) return;

  // Bind buttons
  const bindBtn = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bindBtn('btnPlayPause', togglePlay);
  bindBtn('btnNext', playNext);
  bindBtn('btnPrev', playPrev);
  bindBtn('btnShuffle', toggleShuffle);
  bindBtn('btnRepeat', cycleRepeat);
  bindBtn('btnMute', toggleMute);
  bindBtn('btnHeart', () => {
    if (playerState.currentSong) toggleFavorite(playerState.currentSong.id)
      .then(({ liked }) => updateHeartBtn(liked));
  });
  bindBtn('btnQueue', toggleQueuePanel);

  // Seek bar
  const seekBar = document.getElementById('seekBar');
  if (seekBar) {
    seekBar.addEventListener('input', () => {
      const dur = playerState.audio.duration || 0;
      seekTo((seekBar.value / 100) * dur);
    });
  }

  // Volume slider
  const volSlider = document.getElementById('volumeSlider');
  if (volSlider) {
    volSlider.value = playerState.volume * 100;
    volSlider.addEventListener('input', () => {
      setVolume(volSlider.value / 100);
    });
  }

  // Playback speed
  const speedBtn = document.getElementById('btnSpeed');
  const speedMenu = document.getElementById('speedMenu');
  if (speedBtn && speedMenu) {
    speedBtn.addEventListener('click', () => speedMenu.classList.toggle('visible'));
    speedMenu.querySelectorAll('[data-speed]').forEach(opt => {
      opt.addEventListener('click', () => {
        setPlaybackSpeed(parseFloat(opt.dataset.speed));
        speedMenu.classList.remove('visible');
        speedBtn.textContent = `${opt.dataset.speed}x`;
      });
    });
  }

  // Listen to player events
  playerEvents.on('songChange', updatePlayerUI);
  playerEvents.on('play', () => updatePlayBtn(true));
  playerEvents.on('pause', () => updatePlayBtn(false));
  playerEvents.on('loading', updateLoadingState);
  playerEvents.on('timeUpdate', updateProgress);
  playerEvents.on('volumeChange', (v) => {
    if (volSlider) volSlider.value = v * 100;
    updateVolumeIcon(v, playerState.isMuted);
  });
  playerEvents.on('muteChange', (m) => updateVolumeIcon(playerState.volume, m));
  playerEvents.on('shuffleChange', (s) => {
    const btn = document.getElementById('btnShuffle');
    if (btn) btn.classList.toggle('active', s);
  });
  playerEvents.on('repeatChange', (mode) => {
    const btn = document.getElementById('btnRepeat');
    if (!btn) return;
    btn.classList.toggle('active', mode !== 'none');
    const icon = btn.querySelector('i');
    if (icon) icon.className = mode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';
    btn.title = `Repeat: ${mode}`;
  });

  // Show player bar when a song loads
  playerEvents.on('songChange', () => player.classList.add('visible'));
}

// ─── Update Player UI ─────────────────────────────────────────────────────────

async function updatePlayerUI(song) {
  if (!song) return;

  // Song info
  setText('playerSongTitle', truncate(song.title, 28));
  setText('playerArtist', truncate(song.artists?.name || song.artist || 'Unknown', 24));
  setText('playerAlbum', truncate(song.albums?.title || song.album || '', 24));

  // Cover art
  const coverEl = document.getElementById('playerCover');
  if (coverEl) {
    coverEl.src = song.cover_url || 'assets/images/default-cover.jpg';
    coverEl.alt = song.title;
    coverEl.classList.add('spin-anim');
    setTimeout(() => coverEl.classList.remove('spin-anim'), 600);
  }

  // Dynamic background color
  if (song.cover_url) {
    const color = await extractDominantColor(song.cover_url);
    document.documentElement.style.setProperty('--player-accent', color);
  }

  // Heart state
  const liked = isFavorite(song.id);
  updateHeartBtn(liked);

  // Reset progress
  const seekBar = document.getElementById('seekBar');
  if (seekBar) seekBar.value = 0;
  setText('currentTime', '0:00');
  setText('totalTime', formatTime(song.duration));
}

function updatePlayBtn(isPlaying) {
  const btn = document.getElementById('btnPlayPause');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
  btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

function updateLoadingState(loading) {
  const btn = document.getElementById('btnPlayPause');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (loading && icon) icon.className = 'fas fa-circle-notch fa-spin';
  else if (!loading) updatePlayBtn(playerState.isPlaying);
}

function updateProgress({ current, duration, percent }) {
  const seekBar = document.getElementById('seekBar');
  if (seekBar) seekBar.value = percent;
  setText('currentTime', formatTime(current));
  setText('totalTime', formatTime(duration));

  // Update page title
  if (playerState.currentSong) {
    document.title = `${playerState.currentSong.title} — Harmony`;
  }
}

function updateHeartBtn(liked) {
  const btn = document.getElementById('btnHeart');
  if (!btn) return;
  btn.classList.toggle('active', liked);
  const icon = btn.querySelector('i');
  if (icon) icon.className = liked ? 'fas fa-heart' : 'far fa-heart';
  btn.setAttribute('aria-label', liked ? 'Remove from favorites' : 'Add to favorites');
}

function updateVolumeIcon(volume, muted) {
  const btn = document.getElementById('btnMute');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  if (muted || volume === 0) icon.className = 'fas fa-volume-mute';
  else if (volume < 0.5) icon.className = 'fas fa-volume-down';
  else icon.className = 'fas fa-volume-up';
}

// ─── Queue Panel ──────────────────────────────────────────────────────────────

export function toggleQueuePanel() {
  const panel = document.getElementById('queuePanel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderQueue();
}

function renderQueue() {
  const list = document.getElementById('queueList');
  if (!list) return;

  list.innerHTML = playerState.queue.map((song, idx) => `
    <div class="queue-item ${idx === playerState.currentIndex ? 'queue-item--active' : ''}"
         data-idx="${idx}" role="listitem">
      <img src="${song.cover_url || 'assets/images/default-cover.jpg'}" alt="" loading="lazy">
      <div class="queue-item__info">
        <div class="queue-item__title">${sanitizeHTML(truncate(song.title, 25))}</div>
        <div class="queue-item__artist">${sanitizeHTML(song.artists?.name || 'Unknown')}</div>
      </div>
      <span class="queue-item__dur">${formatTime(song.duration)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      playerState.currentIndex = parseInt(item.dataset.idx);
      import('./player.js').then(({ loadSong }) => loadSong(playerState.queue[playerState.currentIndex]));
    });
  });
}

// ─── Song Cards ───────────────────────────────────────────────────────────────

/**
 * Render a grid of song cards
 * @param {HTMLElement} container
 * @param {Array} songs
 * @param {Function} onPlay
 */
export function renderSongCards(container, songs, onPlay) {
  if (!container) return;

  if (!songs?.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><h3>No songs found</h3></div>`;
    return;
  }

  container.innerHTML = songs.map((song, idx) => `
    <div class="song-card" data-song-id="${song.id}" role="article">
      <div class="song-card__cover">
        <img src="${song.cover_url || 'assets/images/default-cover.jpg'}" alt="${sanitizeHTML(song.title)}" loading="lazy">
        <div class="song-card__overlay">
          <button class="btn-play-card" data-idx="${idx}" aria-label="Play ${sanitizeHTML(song.title)}">
            <i class="fas fa-play"></i>
          </button>
        </div>
        <button class="btn-heart ${isFavorite(song.id) ? 'active' : ''}" data-song-id="${song.id}" aria-label="Favorite">
          <i class="${isFavorite(song.id) ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="song-card__info">
        <h4 class="song-card__title">${sanitizeHTML(truncate(song.title, 22))}</h4>
        <p class="song-card__artist">${sanitizeHTML(song.artists?.name || 'Unknown')}</p>
        <span class="song-card__duration">${formatTime(song.duration)}</span>
      </div>
      <div class="song-card__actions">
        <button class="btn-icon btn-add-queue" data-song-id="${song.id}" title="Add to queue">
          <i class="fas fa-plus"></i>
        </button>
        <button class="btn-icon btn-add-playlist" data-song-id="${song.id}" title="Add to playlist">
          <i class="fas fa-list-ul"></i>
        </button>
        <button class="btn-icon btn-more" data-song-id="${song.id}" title="More options">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Play button
  container.querySelectorAll('.btn-play-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onPlay?.(songs, parseInt(btn.dataset.idx));
    });
  });

  // Double-click card to play
  container.querySelectorAll('.song-card').forEach((card, idx) => {
    card.addEventListener('dblclick', () => onPlay?.(songs, idx));
  });

  // Heart buttons
  container.querySelectorAll('.btn-heart[data-song-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { liked } = await toggleFavorite(btn.dataset.songId);
      btn.classList.toggle('active', liked);
      const icon = btn.querySelector('i');
      if (icon) icon.className = liked ? 'fas fa-heart' : 'far fa-heart';
    });
  });

  // Add to queue
  container.querySelectorAll('.btn-add-queue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const song = songs.find(s => s.id === btn.dataset.songId);
      if (song) addToQueue(song);
    });
  });
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

/**
 * Inject skeleton cards for loading state
 * @param {HTMLElement} container
 * @param {number} count
 * @param {string} type - 'song' | 'playlist'
 */
export function renderSkeletons(container, count = 6, type = 'song') {
  if (!container) return;
  const items = Array.from({ length: count }, () =>
    type === 'song'
      ? `<div class="song-card skeleton">
           <div class="skeleton-block skeleton-cover"></div>
           <div class="skeleton-block skeleton-line w-80"></div>
           <div class="skeleton-block skeleton-line w-50"></div>
         </div>`
      : `<div class="playlist-card skeleton">
           <div class="skeleton-block skeleton-cover"></div>
           <div class="skeleton-block skeleton-line w-70"></div>
           <div class="skeleton-block skeleton-line w-40"></div>
         </div>`
  ).join('');
  container.innerHTML = items;
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────

/**
 * Open a modal by ID
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.querySelector('[autofocus]')?.focus();
}

/**
 * Close a modal by ID
 */
export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Initialize all modal close-on-backdrop behavior
 */
export function initModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modalClose || btn.closest('.modal')?.id));
  });

  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.modalOpen));
  });

  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = document.querySelector('.modal.open');
      if (open) closeModal(open.id);
    }
  });
}

// ─── Navigation Helpers ───────────────────────────────────────────────────────

export function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('visible');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });

  // Highlight current nav item
  const currentPath = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    link.classList.toggle('active', href === currentPath);
  });

  // Global Create Playlist Button Handler
  const createPlBtn = document.getElementById('createPlaylistBtn');
  if (createPlBtn) {
    createPlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('createPlaylistModal');
      // If modal exists heavily on the current page, open it.
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      } else {
        // Fallback navigate to playlist.html where modal is always accessible
        const a = document.createElement('a');
        a.href = 'playlist.html?action=create';
        a.classList.add('nav-link');
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });
  }
}

// ─── Intersection Observer (Lazy Load + Animations) ──────────────────────────

export function initIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in, .slide-up, .zoom-in').forEach(el => {
    observer.observe(el);
  });
}

// ─── Theme Toggle ──────────────────────────────────────────────────────────────

export function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('harmony_theme', theme);
    const icon = btn.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  };

  // Load saved theme
  apply(localStorage.getItem('harmony_theme') || 'dark');

  btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    apply(current === 'dark' ? 'light' : 'dark');
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
