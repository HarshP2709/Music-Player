/**
 * Harmony Music Player - Utility Functions
 * Pure helper functions used across the application
 */

// ─── Time Formatters ─────────────────────────────────────────────────────────

/**
 * Format seconds into MM:SS display string
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string e.g. "3:45"
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into human readable duration e.g. "1h 23m"
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Format large numbers (e.g. 1200000 → "1.2M")
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format a date to relative time string (e.g. "2 days ago")
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'week', secs: 604800 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// ─── DOM Helpers ─────────────────────────────────────────────────────────────

/**
 * Query selector shorthand
 * @param {string} selector
 * @param {Element} context
 * @returns {Element|null}
 */
export const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Query selector all shorthand
 * @param {string} selector
 * @param {Element} context
 * @returns {NodeList}
 */
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Create a DOM element with optional properties
 * @param {string} tag
 * @param {Object} props
 * @param {...(string|Element)} children
 * @returns {Element}
 */
export function createElement(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key === 'style') Object.assign(el.style, val);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

// ─── Function Utilities ───────────────────────────────────────────────────────

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls
 * @param {Function} fn
 * @param {number} limit - ms
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * Extract profile name for avatar, generate UI Avatar URL if missing
 */
export function getAvatarUrl(profile) {
  if (profile?.avatar_url) return profile.avatar_url;
  const name = profile?.full_name || profile?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c5cd8&color=fff&size=150`;
}

/**
 * Truncate text to max length with ellipsis
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate(text, max = 30) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function uniqueId() {
  return `_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Array Utilities ──────────────────────────────────────────────────────────

/**
 * Shuffle an array (Fisher-Yates)
 * @param {Array} arr
 * @returns {Array} New shuffled array
 */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Local Storage Helpers ────────────────────────────────────────────────────

export const storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(`harmony_${key}`);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`harmony_${key}`, JSON.stringify(value)); } catch { }
  },
  remove(key) {
    localStorage.removeItem(`harmony_${key}`);
  },
};

// ─── URL Utilities ────────────────────────────────────────────────────────────

/**
 * Get query parameter from current URL
 * @param {string} name
 * @returns {string|null}
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Redirect to a page
 * @param {string} url
 */
export function redirect(url) {
  window.location.href = url;
}

// ─── Color Utilities ──────────────────────────────────────────────────────────

/**
 * Generate a gradient from an image using canvas (for dynamic backgrounds)
 * @param {string} imageUrl
 * @returns {Promise<string>} CSS gradient string
 */
export async function extractDominantColor(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    img.onerror = () => resolve('rgb(99, 102, 241)');
    img.src = imageUrl;
  });
}

// ─── Validation Utilities ─────────────────────────────────────────────────────

export const validate = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  password: (v) => v && v.length >= 8,
  required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
};
