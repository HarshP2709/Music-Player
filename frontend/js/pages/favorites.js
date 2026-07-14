import { setQueue, toggleShuffle } from '../player.js';
import { getFavorites, renderFavoritesList } from '../favorites.js';
import notify from '../notifications.js';

export async function initFavorites() {
    const favoriteSongs = await getFavorites();

    const container = document.getElementById('favoritesList');
    const countText = document.getElementById('favCountText');
    if (countText) countText.textContent = `${favoriteSongs.length} song${favoriteSongs.length !== 1 ? 's' : ''}`;

    if (container) {
        renderFavoritesList(container, favoriteSongs, (songs, idx) => setQueue(songs, idx));
    }

    // Relink dynamic buttons
    const playAllBtn = document.getElementById('playAllFavBtn');
    if (playAllBtn) {
        // replace node to safely remove old event listeners from duplicate routing
        const newBtn = playAllBtn.cloneNode(true);
        playAllBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => {
            if (favoriteSongs.length) setQueue(favoriteSongs, 0);
            else notify.info('No favorites', 'Add songs to favorites first.');
        });
    }

    const shuffleBtn = document.getElementById('shuffleFavBtn');
    if (shuffleBtn) {
        const newBtn = shuffleBtn.cloneNode(true);
        shuffleBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => {
            if (favoriteSongs.length) {
                toggleShuffle();
                setQueue(favoriteSongs, 0);
            }
        });
    }
}
