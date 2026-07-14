import { initDashboard } from './pages/dashboard.js';
import { initFavorites } from './pages/favorites.js';
import { initPlaylist } from './pages/playlist.js';
import { initProfile } from './pages/profile.js';

export function initRouter() {
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || link.target === '_blank') return;

        // Only intercept for main app pages
        const isAppPage = ['dashboard.html', 'favorites.html', 'playlist.html', 'profile.html'].some(p => href.includes(p));
        if (!isAppPage) return; // Allow normal navigation to login/register etc.

        e.preventDefault();
        navigate(href);
    });

    window.addEventListener('popstate', () => {
        navigate(location.pathname + location.search, true);
    });
}

async function navigate(url, isPopState = false) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network error');

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Extract new main content
        const newMain = doc.querySelector('.page-content');
        const currMain = document.querySelector('.page-content');

        if (newMain && currMain) {
            currMain.innerHTML = newMain.innerHTML;
            document.title = doc.title;

            if (!isPopState) {
                history.pushState(null, '', url);
            }

            // Update sidebar active states
            document.querySelectorAll('.sidebar__nav .nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') && url.includes(link.getAttribute('href')));
            });

            // Re-initialize specific page logic
            initCurrentPage();
        } else {
            // Fallback
            window.location = url;
        }
    } catch (err) {
        window.location = url;
    }
}

export function initCurrentPage() {
    const path = window.location.pathname;

    // Toggle body class for profile-specific layout adjustments (e.g. hiding topbar)
    if (path.includes('profile.html')) {
        document.body.classList.add('in-profile');
    } else {
        document.body.classList.remove('in-profile');
    }

    if (path.includes('dashboard.html')) initDashboard();
    else if (path.includes('favorites.html')) initFavorites();
    else if (path.includes('playlist.html')) initPlaylist();
    else if (path.includes('profile.html')) initProfile();
}
