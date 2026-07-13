/**
 * Harmony Music Player - Core Player Module
 * Full-featured audio engine with queue, shuffle, repeat, visualizer
 */

import supabase from './supabase.js';
import { formatTime, shuffleArray, storage } from './utils.js';
import notify from './notifications.js';

// ─── Player State ─────────────────────────────────────────────────────────────
export const playerState = {
  audio: new Audio(),
  currentSong: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  repeatMode: 'none', // 'none' | 'one' | 'all'
  volume: 1,
  isMuted: false,
  playbackSpeed: 1,
  isLoading: false,
};

// ─── Audio Context for Visualizer ────────────────────────────────────────────
let audioContext = null;
let analyser = null;
let source = null;
let animFrameId = null;

// ─── Restore Settings from localStorage ──────────────────────────────────────
function restoreSettings() {
  playerState.volume = storage.get('volume', 1);
  playerState.isShuffle = storage.get('shuffle', false);
  playerState.repeatMode = storage.get('repeat', 'none');
  playerState.playbackSpeed = storage.get('speed', 1);
  playerState.audio.volume = playerState.isMuted ? 0 : playerState.volume;
  playerState.audio.playbackRate = playerState.playbackSpeed;
}

// ─── Event Emitter ────────────────────────────────────────────────────────────
const listeners = {};

export const playerEvents = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  },
};

// ─── Core Player Functions ────────────────────────────────────────────────────

/**
 * Load and optionally play a song
 * @param {Object} song - Song object from database
 * @param {boolean} autoPlay
 */
export async function loadSong(song, autoPlay = true) {
  if (!song?.audio_url) {
    notify.error('Playback Error', 'Song file not available.');
    return;
  }

  playerState.currentSong = song;
  playerState.isLoading = true;
  playerEvents.emit('loading', true);
  playerEvents.emit('songChange', song);

  // Update audio element
  playerState.audio.src = song.audio_url;
  playerState.audio.load();

  // Update media session (browser media controls)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: song.artists?.name || song.artist || 'Unknown Artist',
      album: song.albums?.title || song.album || '',
      artwork: song.cover_url ? [{ src: song.cover_url, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }

  if (autoPlay) {
    try {
      await playerState.audio.play();
      playerState.isPlaying = true;
      playerEvents.emit('play');
    } catch (err) {
      notify.warning('Autoplay blocked', 'Click play to start.');
    }
  }

  // Record to recently played (debounced - only after 5s)
  setTimeout(() => logRecentlyPlayed(song.id), 5000);
}

/**
 * Play / Pause toggle
 */
export function togglePlay() {
  if (!playerState.currentSong) return;
  if (playerState.isPlaying) {
    playerState.audio.pause();
    playerState.isPlaying = false;
    playerEvents.emit('pause');
  } else {
    playerState.audio.play().catch(() => {});
    playerState.isPlaying = true;
    playerEvents.emit('play');
  }
}

/**
 * Play next track in queue
 */
export function playNext() {
  if (playerState.queue.length === 0) return;

  if (playerState.repeatMode === 'one') {
    playerState.audio.currentTime = 0;
    playerState.audio.play();
    return;
  }

  let nextIndex = playerState.currentIndex + 1;

  if (nextIndex >= playerState.queue.length) {
    if (playerState.repeatMode === 'all') {
      nextIndex = 0;
    } else {
      playerState.isPlaying = false;
      playerEvents.emit('pause');
      playerEvents.emit('queueEnd');
      return;
    }
  }

  playerState.currentIndex = nextIndex;
  loadSong(playerState.queue[nextIndex]);
}

/**
 * Play previous track
 */
export function playPrev() {
  // If more than 3s in, restart current song
  if (playerState.audio.currentTime > 3) {
    playerState.audio.currentTime = 0;
    return;
  }

  let prevIndex = playerState.currentIndex - 1;
  if (prevIndex < 0) {
    prevIndex = playerState.repeatMode === 'all' ? playerState.queue.length - 1 : 0;
  }

  playerState.currentIndex = prevIndex;
  loadSong(playerState.queue[prevIndex]);
}

/**
 * Set the playback queue
 * @param {Array} songs - Array of song objects
 * @param {number} startIndex - Index to start from
 */
export function setQueue(songs, startIndex = 0) {
  playerState.originalQueue = [...songs];
  playerState.queue = playerState.isShuffle
    ? [songs[startIndex], ...shuffleArray(songs.filter((_, i) => i !== startIndex))]
    : [...songs];
  playerState.currentIndex = playerState.isShuffle ? 0 : startIndex;
  loadSong(playerState.queue[playerState.currentIndex]);
}

/**
 * Add song to end of queue
 * @param {Object} song
 */
export function addToQueue(song) {
  playerState.queue.push(song);
  playerState.originalQueue.push(song);
  notify.info('Added to queue', song.title);
  playerEvents.emit('queueUpdate', playerState.queue);
}

/**
 * Toggle shuffle mode
 */
export function toggleShuffle() {
  playerState.isShuffle = !playerState.isShuffle;
  storage.set('shuffle', playerState.isShuffle);

  if (playerState.isShuffle) {
    const current = playerState.queue[playerState.currentIndex];
    const rest = playerState.queue.filter((_, i) => i !== playerState.currentIndex);
    playerState.queue = [current, ...shuffleArray(rest)];
    playerState.currentIndex = 0;
  } else {
    const current = playerState.queue[playerState.currentIndex];
    playerState.queue = [...playerState.originalQueue];
    playerState.currentIndex = playerState.originalQueue.findIndex(s => s.id === current?.id);
  }

  playerEvents.emit('shuffleChange', playerState.isShuffle);
}

/**
 * Cycle repeat modes: none → one → all → none
 */
export function cycleRepeat() {
  const modes = ['none', 'one', 'all'];
  const idx = modes.indexOf(playerState.repeatMode);
  playerState.repeatMode = modes[(idx + 1) % modes.length];
  storage.set('repeat', playerState.repeatMode);
  playerEvents.emit('repeatChange', playerState.repeatMode);
}

/**
 * Set volume (0 to 1)
 * @param {number} val
 */
export function setVolume(val) {
  playerState.volume = Math.max(0, Math.min(1, val));
  if (!playerState.isMuted) playerState.audio.volume = playerState.volume;
  storage.set('volume', playerState.volume);
  playerEvents.emit('volumeChange', playerState.volume);
}

/**
 * Toggle mute
 */
export function toggleMute() {
  playerState.isMuted = !playerState.isMuted;
  playerState.audio.volume = playerState.isMuted ? 0 : playerState.volume;
  playerEvents.emit('muteChange', playerState.isMuted);
}

/**
 * Seek to a specific time
 * @param {number} time - Seconds
 */
export function seekTo(time) {
  if (isFinite(playerState.audio.duration)) {
    playerState.audio.currentTime = Math.max(0, Math.min(time, playerState.audio.duration));
  }
}

/**
 * Set playback speed
 * @param {number} speed
 */
export function setPlaybackSpeed(speed) {
  playerState.playbackSpeed = speed;
  playerState.audio.playbackRate = speed;
  storage.set('speed', speed);
  playerEvents.emit('speedChange', speed);
}

// ─── Audio Event Listeners ────────────────────────────────────────────────────
export function initAudioListeners() {
  const { audio } = playerState;

  audio.addEventListener('timeupdate', () => {
    playerEvents.emit('timeUpdate', {
      current: audio.currentTime,
      duration: audio.duration || 0,
      percent: audio.duration ? (audio.currentTime / audio.duration) * 100 : 0,
    });
  });

  audio.addEventListener('canplay', () => {
    playerState.isLoading = false;
    playerEvents.emit('loading', false);
  });

  audio.addEventListener('ended', () => {
    playerEvents.emit('ended');
    playNext();
  });

  audio.addEventListener('error', (e) => {
    playerState.isLoading = false;
    playerEvents.emit('loading', false);
    playerEvents.emit('error', e);
    notify.error('Playback Error', 'Could not load the audio file.');
  });

  audio.addEventListener('waiting', () => {
    playerState.isLoading = true;
    playerEvents.emit('loading', true);
  });

  audio.addEventListener('playing', () => {
    playerState.isLoading = false;
    playerEvents.emit('loading', false);
  });

  // Media session handlers
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      audio.play(); playerState.isPlaying = true; playerEvents.emit('play');
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause(); playerState.isPlaying = false; playerEvents.emit('pause');
    });
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  }
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in inputs
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        if (e.altKey) { e.preventDefault(); playNext(); }
        else { seekTo(playerState.audio.currentTime + 5); }
        break;
      case 'ArrowLeft':
        if (e.altKey) { e.preventDefault(); playPrev(); }
        else { seekTo(playerState.audio.currentTime - 5); }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(playerState.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(playerState.volume - 0.1);
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyS':
        if (e.shiftKey) toggleShuffle();
        break;
      case 'KeyR':
        if (e.shiftKey) cycleRepeat();
        break;
    }
  });
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
export function initVisualizer(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  playerEvents.on('play', () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source = audioContext.createMediaElementSource(playerState.audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    }
    drawVisualizer(canvas, ctx, analyser);
  });

  playerEvents.on('pause', () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });
}

function drawVisualizer(canvas, ctx, analyser) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const hue = (i / bufferLength) * 220 + 180;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
}

// ─── Database Logging ─────────────────────────────────────────────────────────
async function logRecentlyPlayed(songId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('recently_played').insert({
      user_id: user.id,
      song_id: songId,
      played_at: new Date().toISOString(),
    });
  } catch {}
}

// ─── Init Player ──────────────────────────────────────────────────────────────
export function initPlayer() {
  restoreSettings();
  initAudioListeners();
  initKeyboardShortcuts();
}
