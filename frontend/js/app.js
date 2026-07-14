import { auth } from './auth.js';
import { initPlayer } from './player.js';
import { initBottomPlayer, initSidebar, initThemeToggle, initModals, initIntersectionObserver } from './ui.js';
import { loadFavoriteIds } from './favorites.js';
import { getAvatarUrl } from './utils.js';
import { initRouter, initCurrentPage } from './router.js';
import { applyTheme } from './profile.js';
import { initSearch } from './search.js';
import { setQueue } from './player.js';
import supabase from './supabase.js';

async function bootstrap() {
    // Remove loading screen immediately
    const _ls = document.getElementById('loadingScreen');
    if (_ls) {
        _ls.classList.add('fade-out');
        setTimeout(() => _ls.remove(), 400);
    }

    applyTheme();

    const authed = await auth.requireAuth();
    if (!authed) return;

    // Initialize global components (Player, Sidebar, Modals, etc)
    initPlayer();
    initBottomPlayer();
    initSidebar();
    initThemeToggle();
    initModals();
    initIntersectionObserver();
    initRouter();

    // Search
    initSearch(async (type, id) => {
        if (type === 'song') {
            const { data: song } = await supabase.from('songs').select('*,artists(name),albums(title)').eq('id', id).single();
            if (song) setQueue([song], 0);
        }
    });

    // Load User Profile (Shared across sidebar & topbar)
    const profile = await auth.getProfile();
    if (profile) {
        const sidebarName = document.getElementById('sidebarName');
        if (sidebarName) sidebarName.textContent = profile.full_name || profile.username;

        const avatarSrc = getAvatarUrl(profile);
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        const topbarAvatar = document.getElementById('topbarAvatar');
        const profileAvatar = document.getElementById('profileAvatar');

        if (sidebarAvatar) sidebarAvatar.src = avatarSrc;
        if (topbarAvatar) topbarAvatar.src = avatarSrc;
        if (profileAvatar) profileAvatar.src = avatarSrc; // Only in profile.html, but safe to set if null
    }

    // Load User Favorites globally
    await loadFavoriteIds();

    // Initialize the specific logic for the page we landed on
    initCurrentPage();
}

bootstrap();
