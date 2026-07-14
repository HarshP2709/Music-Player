import { setQueue } from '../player.js';
import { renderSkeletons } from '../ui.js';
import {
    getUserPlaylists,
    getPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    renderPlaylistGrid,
    removeSongFromPlaylist,
    initDragDrop
} from '../playlist.js';
import notify from '../notifications.js';

export async function initPlaylist() {
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('id');

    if (playlistId) {
        // We are viewing a specific playlist
        await loadSinglePlaylist(playlistId);
    } else {
        // We are viewing the "My Playlists" grid
        await loadAllPlaylists();
    }
}

async function loadAllPlaylists() {
    const allPlaylists = await getUserPlaylists();
    const grid = document.getElementById('playlistGrid');
    if (!grid) return;

    renderSkeletons(grid, 6, 'playlist');
    setTimeout(() => {
        if (allPlaylists.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-list"></i><h3>No playlists yet</h3></div>';
            return;
        }
        renderPlaylistGrid(grid, allPlaylists, (pl) => {
            const songs = pl.playlist_songs?.map(ps => ps.songs).filter(Boolean) || [];
            if (songs.length) setQueue(songs, 0);
        });
        attachPlaylistCardActions();
    }, 300);

    // Sidebar
    const sidebarPls = document.getElementById('sidebarPlaylists');
    if (sidebarPls) {
        sidebarPls.innerHTML = allPlaylists.slice(0, 6).map(pl => `
      <div class="sidebar-playlist-item" onclick="window.location='playlist.html?id=${pl.id}'">
        <img src="${pl.cover_url || 'https://picsum.photos/seed/' + pl.id + '/60/60'}" alt="">
        <span>${pl.name}</span>
      </div>
    `).join('');
    }
}

async function loadSinglePlaylist(id) {
    const { data: pl } = await getPlaylist(id);

    const viewGrid = document.getElementById('viewGrid');
    const viewSingle = document.getElementById('viewSingle');

    if (viewGrid) viewGrid.style.display = 'none';
    if (viewSingle) viewSingle.style.display = 'block';

    if (!pl) {
        if (viewSingle) viewSingle.innerHTML = '<div class="empty-state"><h3>Playlist not found</h3></div>';
        return;
    }

    // Cover & Details
    const coverEl = document.getElementById('singlePlaylistCover');
    if (coverEl) coverEl.src = pl.cover_url || 'assets/images/default-cover.jpg';

    const titleEl = document.getElementById('singlePlaylistTitle');
    if (titleEl) titleEl.textContent = pl.name;

    const byEl = document.getElementById('singlePlaylistBy');
    if (byEl) {
        byEl.textContent = `By ${pl.profiles?.full_name || pl.profiles?.username || 'Unknown'}`;
    }

    const statEl = document.getElementById('singlePlaylistStat');
    if (statEl) {
        statEl.textContent = `${pl.total_tracks} songs • ${Math.floor((pl.total_duration || 0) / 60)} min`;
    }

    // Songs
    const songs = pl.playlist_songs?.map(ps => ({ ...ps.songs, _playlist_song_id: ps.id })) || [];
    const listEl = document.getElementById('singlePlaylistSongs');

    if (listEl) {
        listEl.innerHTML = '';

        if (songs.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><h3>No songs in this playlist</h3></div>';
        } else {
            songs.forEach((song, idx) => {
                const item = document.createElement('div');
                item.className = 'playlist-item draggable';
                item.draggable = true;
                item.dataset.id = song._playlist_song_id;
                item.dataset.position = idx;

                item.innerHTML = `
          <div class="playlist-item__drag" aria-label="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
          <img src="${song.cover_url || 'assets/images/default-cover.jpg'}" class="playlist-item__cover" alt="">
          <div class="playlist-item__info">
            <h4 class="playlist-item__title">${song.title}</h4>
            <p class="playlist-item__artist">${song.artists?.name || 'Unknown'}</p>
          </div>
          <button class="btn-icon playlist-item__remove" aria-label="Remove song"><i class="fas fa-times"></i></button>
        `;
                listEl.appendChild(item);

                item.addEventListener('dblclick', () => {
                    setQueue(songs, idx);
                });

                item.querySelector('.playlist-item__remove').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const { error } = await removeSongFromPlaylist(id, song.id);
                    if (error) notify.error('Error', error);
                    else {
                        item.remove();
                        notify.success('Song removed');
                    }
                });
            });
            initDragDrop(listEl, id);
        }
    }

    // Play button
    const playBtn = document.getElementById('singlePlaylistPlay');
    if (playBtn) {
        const newBtn = playBtn.cloneNode(true);
        playBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => {
            if (songs.length) setQueue(songs, 0);
        });
    }

    // Edit / Delete Buttons
    const editBtn = document.getElementById('editPlaylistBtn');
    const deleteBtn = document.getElementById('deletePlaylistBtn');

    if (editBtn) {
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.replaceWith(newEditBtn);
        newEditBtn.addEventListener('click', () => {
            const newName = prompt('Enter new playlist name:', pl.name);
            if (newName) {
                updatePlaylist(id, { name: newName }).then(({ error }) => {
                    if (!error) {
                        if (titleEl) titleEl.textContent = newName;
                    }
                });
            }
        });
    }

    if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.replaceWith(newDeleteBtn);
        newDeleteBtn.addEventListener('click', async () => {
            if (confirm('Delete this playlist permanently?')) {
                const { error } = await deletePlaylist(id);
                if (!error) {
                    notify.success('Playlist deleted');
                    setTimeout(() => location.href = 'playlist.html', 1000);
                }
            }
        });
    }
}

function attachPlaylistCardActions() {
    document.querySelectorAll('.playlist-card').forEach(card => {
        // The play and context menu actions
    });
}
