/**
 * Harmony Music Player - Toast Notification System
 * Beautiful animated toast notifications (success, error, warning, info)
 */

// ─── Notification Queue ───────────────────────────────────────────────────────
let container = null;
const queue = [];
const MAX_VISIBLE = 4;

// ─── Create Container ─────────────────────────────────────────────────────────
function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'harmony-notifications';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }
  return container;
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────
const ICONS = {
  success: '<i class="fas fa-check-circle"></i>',
  error: '<i class="fas fa-times-circle"></i>',
  warning: '<i class="fas fa-exclamation-triangle"></i>',
  info: '<i class="fas fa-info-circle"></i>',
};

const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// ─── Show Notification ────────────────────────────────────────────────────────
/**
 * Display a toast notification
 * @param {Object} options
 * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} options.title - Notification title
 * @param {string} [options.message] - Optional body text
 * @param {number} [options.duration=4000] - Auto-dismiss ms (0 = persistent)
 * @param {Function} [options.onClick] - Click handler
 */
export function showNotification({ type = 'info', title, message, duration = 4000, onClick }) {
  const c = getContainer();

  // Limit visible toasts
  const visible = c.querySelectorAll('.toast:not(.toast-exit)');
  if (visible.length >= MAX_VISIBLE) {
    queue.push({ type, title, message, duration, onClick });
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-atomic', 'true');
  toast.style.setProperty('--toast-color', COLORS[type]);

  toast.innerHTML = `
    <div class="toast-icon">${ICONS[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Close notification">
      <i class="fas fa-times"></i>
    </button>
    ${duration > 0 ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
  `;

  const close = () => dismiss(toast);

  toast.querySelector('.toast-close').addEventListener('click', close);
  if (onClick) toast.addEventListener('click', (e) => {
    if (!e.target.closest('.toast-close')) onClick();
  });

  c.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-enter'));
  });

  // Progress bar & auto dismiss
  if (duration > 0) {
    const bar = toast.querySelector('.toast-progress-bar');
    if (bar) bar.style.animationDuration = `${duration}ms`;
    setTimeout(close, duration);
  }
}

// ─── Dismiss Toast ────────────────────────────────────────────────────────────
function dismiss(toast) {
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => {
    toast.remove();
    // Show queued notifications
    if (queue.length > 0) showNotification(queue.shift());
  }, { once: true });
}

// ─── Convenience Shortcuts ────────────────────────────────────────────────────
export const notify = {
  success: (title, message, opts = {}) => showNotification({ type: 'success', title, message, ...opts }),
  error: (title, message, opts = {}) => showNotification({ type: 'error', title, message, ...opts }),
  warning: (title, message, opts = {}) => showNotification({ type: 'warning', title, message, ...opts }),
  info: (title, message, opts = {}) => showNotification({ type: 'info', title, message, ...opts }),
};

export default notify;
