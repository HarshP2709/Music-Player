/**
 * Harmony Music Player - Storage Module
 * Upload, manage, and retrieve files from Supabase Storage
 */

import supabase, { BUCKETS, storageHelpers } from './supabase.js';
import { auth } from './auth.js';
import notify from './notifications.js';

// ─── Upload with Progress ─────────────────────────────────────────────────────

/**
 * Upload a song file to Supabase Storage
 * @param {File} file
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadSong(file, onProgress) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];

  if (file.size > MAX_SIZE) return { error: 'Audio file must be under 50MB.' };
  if (!ALLOWED.includes(file.type)) return { error: 'Unsupported audio format.' };

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    await storageHelpers.upload(BUCKETS.SONGS, path, file, { contentType: file.type });
    const url = storageHelpers.getPublicUrl(BUCKETS.SONGS, path);
    if (onProgress) onProgress(100);
    return { url, path };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Upload an album/song cover image
 * @param {File} file
 * @param {string} songId
 * @returns {Promise<{url: string}>}
 */
export async function uploadCover(file, songId) {
  const user = await auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) return { error: 'Cover image must be under 10MB.' };
  if (!file.type.startsWith('image/')) return { error: 'Please select an image file.' };

  const ext = file.name.split('.').pop();
  const path = `${songId || Date.now()}.${ext}`;

  try {
    await storageHelpers.upload(BUCKETS.COVERS, path, file, { contentType: file.type });
    const url = storageHelpers.getPublicUrl(BUCKETS.COVERS, path);
    return { url, path };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Delete a file from storage
 * @param {string} bucket
 * @param {string} path
 */
export async function deleteFile(bucket, path) {
  try {
    await storageHelpers.remove(bucket, [path]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── File Input Helper ────────────────────────────────────────────────────────

/**
 * Create a drag-and-drop upload zone
 * @param {string} elementId
 * @param {Object} options
 */
export function initDropZone(elementId, options = {}) {
  const zone = document.getElementById(elementId);
  if (!zone) return;

  const { accept = '*', onFile } = options;

  zone.setAttribute('tabindex', '0');
  zone.setAttribute('role', 'button');
  zone.setAttribute('aria-label', 'Drop files or click to upload');

  // Click to select
  zone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file && onFile) onFile(file);
    };
    input.click();
  });

  // Drag events
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && onFile) onFile(file);
  });
}

/**
 * Render an upload progress bar
 * @param {HTMLElement} container
 * @param {number} progress 0-100
 * @param {string} fileName
 */
export function renderUploadProgress(container, progress, fileName) {
  if (!container) return;
  container.innerHTML = `
    <div class="upload-progress">
      <div class="upload-progress__name">${fileName}</div>
      <div class="upload-progress__bar">
        <div class="upload-progress__fill" style="width: ${progress}%"></div>
      </div>
      <div class="upload-progress__pct">${progress}%</div>
    </div>
  `;
}

export { storageHelpers, BUCKETS };
