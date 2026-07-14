import { auth } from '../auth.js';
import {
    initProfileForm,
    uploadAvatar,
    getUserStats,
    updateSettings,
    setTheme,
    deleteAccount
} from '../profile.js';
import notify from '../notifications.js';

export async function initProfile() {
    const profile = await auth.getProfile();
    if (profile) {
        // Fill form
        const el = (id) => document.getElementById(id);
        if (el('fullName')) el('fullName').value = profile.full_name || '';
        if (el('username')) el('username').value = profile.username || '';
        if (el('phone')) el('phone').value = profile.phone || '';
        if (el('bio')) el('bio').value = profile.bio || '';
        if (el('country')) el('country').value = profile.country || 'US';

        // Theme select
        if (el('themeSelect')) el('themeSelect').value = profile.theme || localStorage.getItem('harmony_theme') || 'dark';
    }

    // Load stats
    const stats = await getUserStats();
    if (stats) {
        const el = (id) => document.getElementById(id);
        if (el('pStatSongs')) el('pStatSongs').textContent = stats.songsPlayed;
        if (el('pStatLiked')) el('pStatLiked').textContent = stats.favoritesCount;
        if (el('pStatLists')) el('pStatLists').textContent = stats.playlistCount;
    }

    // Panel switching
    const navItems = document.querySelectorAll('.profile-nav-item[data-panel]');
    navItems.forEach(btn => {
        // Clone trick to remove dupes
        const clone = btn.cloneNode(true);
        btn.replaceWith(clone);
        clone.addEventListener('click', () => {
            document.querySelectorAll('.profile-nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.profile-panel').forEach(p => p.classList.add('hidden'));
            clone.classList.add('active');
            const panel = document.getElementById(`panel-${clone.dataset.panel}`);
            if (panel) panel.classList.remove('hidden');
        });
    });

    // Re-init form
    initProfileForm();

    // Settings Buttons
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        const tsClone = themeSelect.cloneNode(true);
        themeSelect.replaceWith(tsClone);
        tsClone.addEventListener('change', (e) => setTheme(e.target.value));
    }

    const savePrefsBtn = document.getElementById('savePrefsBtn');
    if (savePrefsBtn) {
        const btnClone = savePrefsBtn.cloneNode(true);
        savePrefsBtn.replaceWith(btnClone);
        btnClone.addEventListener('click', async () => {
            const settings = {
                autoplay: document.getElementById('autoplayToggle')?.checked,
                quality: document.getElementById('qualitySelect')?.value,
                notifications_enabled: document.getElementById('pushToggle')?.checked,
                email_notifications: document.getElementById('emailToggle')?.checked,
            };
            const { error } = await updateSettings(settings);
            if (error) notify.error('Error', error);
            else notify.success('Settings saved');
        });
    }

    // Delete account button
    const delBtn = document.getElementById('deleteAccountBtn');
    if (delBtn) {
        const delClone = delBtn.cloneNode(true);
        delBtn.replaceWith(delClone);
        delClone.addEventListener('click', async () => {
            const confirmed = confirm('Are you absolutely sure? This will permanently delete your account and ALL your data. Type "DELETE" in the next prompt to confirm.');
            if (!confirmed) return;
            const typed = prompt('Type DELETE to confirm account deletion:');
            if (typed !== 'DELETE') { notify.info('Cancelled', 'Account deletion cancelled.'); return; }
            const { error } = await deleteAccount();
            if (error) notify.error('Error', error);
            else {
                notify.success('Account Deleted', 'Your account has been removed.');
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const outClone = logoutBtn.cloneNode(true);
        logoutBtn.replaceWith(outClone);
        outClone.addEventListener('click', () => auth.logout());
    }
}
