import supabase from '../supabase.js';
import { auth } from '../auth.js';
import { setQueue } from '../player.js';
import { renderSongCards, renderSkeletons } from '../ui.js';
import { getUserPlaylists, createPlaylist, renderPlaylistGrid } from '../playlist.js';
import { getUserStats } from '../profile.js';
import { formatNumber } from '../utils.js';

export async function initDashboard() {
    // Load Stats
    getUserStats().then(stats => {
        if (!stats) return;
        const el = (id, val) => document.getElementById(id) && (document.getElementById(id).textContent = val);
        el('statSongsPlayed', formatNumber(stats.songsPlayed));
        el('statFavorites', formatNumber(stats.favoritesCount));
        el('statPlaylists', formatNumber(stats.playlistCount));
        el('statListenTime', Math.floor(stats.totalListenTime / 3600) + 'h');
    });

    // Load Featured Songs
    const { data: featuredSongs } = await supabase
        .from('songs')
        .select('id, title, cover_url, audio_url, duration, artists(id,name), albums(title)')
        .eq('is_featured', true)
        .eq('is_active', true)
        .limit(12);

    const featuredGrid = document.getElementById('featuredSongsGrid');
    if (featuredGrid) {
        renderSkeletons(featuredGrid, 6);
        setTimeout(() => {
            renderSongCards(featuredGrid, featuredSongs || [], (songs, idx) => setQueue(songs, idx));
        }, 400);
    }

    // Load Recently Played
    const user = await auth.getUser();
    if (user) {
        const { data: recentData } = await supabase
            .from('recently_played')
            .select('song_id, played_at, songs(id,title,cover_url,audio_url,duration,artists(name))')
            .eq('user_id', user.id)
            .order('played_at', { ascending: false })
            .limit(10);

        const recentSongs = (recentData || []).map(r => r.songs).filter(Boolean);
        const recentGrid = document.getElementById('recentlyPlayedGrid');
        if (recentGrid) {
            renderSkeletons(recentGrid, 4);
            setTimeout(() => {
                renderSongCards(recentGrid, recentSongs, (songs, idx) => setQueue(songs, idx));
            }, 300);
        }
    }

    // Load Playlists
    const playlists = await getUserPlaylists();
    const playlistGrid = document.getElementById('myPlaylistsGrid');
    if (playlistGrid) {
        renderPlaylistGrid(playlistGrid, playlists.slice(0, 6), (pl) => {
            const songs = pl.playlist_songs?.map(ps => ps.songs).filter(Boolean) || [];
            if (songs.length) setQueue(songs, 0);
        });
    }

    // Sidebar Playlists
    const sidebarPls = document.getElementById('sidebarPlaylists');
    if (sidebarPls) {
        sidebarPls.innerHTML = playlists.slice(0, 6).map(pl => `
      <div class="sidebar-playlist-item" onclick="window.location='playlist.html?id=${pl.id}'">
        <img src="${pl.cover_url || 'https://picsum.photos/seed/' + pl.id + '/60/60'}" alt="">
        <span>${pl.name}</span>
      </div>
    `).join('');
    }

    // Load Albums
    const { data: albums } = await supabase
        .from('albums')
        .select('id, title, cover_url, artists(name), total_tracks')
        .eq('is_trending', true)
        .limit(8);

    const albumGrid = document.getElementById('trendingAlbumsGrid');
    if (albumGrid) {
        albumGrid.innerHTML = (albums || []).map(album => `
      <div class="song-card hover-lift">
        <div class="song-card__cover">
          <img src="${album.cover_url || 'https://picsum.photos/seed/' + album.id + '/300/300'}" alt="" loading="lazy">
          <div class="song-card__overlay">
            <button class="btn-play-card"><i class="fas fa-play"></i></button>
          </div>
        </div>
        <div class="song-card__info">
          <h4 class="song-card__title">${album.title}</h4>
          <p class="song-card__artist">${album.artists?.name || 'Unknown'}</p>
          <span class="song-card__duration">${album.total_tracks || 0} tracks</span>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><i class="fas fa-record-vinyl"></i><h3>No albums yet</h3></div>';
    }

    // Shuffle All
    document.getElementById('shuffleAllBtn')?.addEventListener('click', async () => {
        const { data: allSongs } = await supabase.from('songs').select('id,title,cover_url,audio_url,duration,artists(name)').eq('is_active', true).limit(50);
        if (allSongs?.length) setQueue(allSongs, 0);
    });

    // Play Featured
    document.getElementById('playFeaturedBtn')?.addEventListener('click', () => {
        if (featuredSongs?.length) setQueue(featuredSongs, 0);
    });
}
