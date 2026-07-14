import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

const APP_NAME = 'HarmonyMusicPlayer';

async function getAudiusHost() {
    const sample = await fetch('https://api.audius.co/');
    const { data } = await sample.json();
    return data[Math.floor(Math.random() * data.length)];
}

async function searchAudiusTracks(host, query) {
    const url = `${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}`;
    const res = await fetch(url);
    const { data } = await res.json();
    return data;
}

async function seedAudiusData() {
    console.log('🎵 Connecting to Audius Network...');
    const host = await getAudiusHost();
    console.log(`✅ Connected to discovery node: ${host}`);

    const searchQueries = ['hindi', 'bollywood', 'lofi beat', 'electronic'];
    let allTracks = [];

    for (const q of searchQueries) {
        console.log(`🔍 Searching Audius for: "${q}"...`);
        const tracks = await searchAudiusTracks(host, q);
        if (tracks && tracks.length > 0) {
            allTracks = allTracks.concat(tracks);
        }
    }

    // Remove duplicates
    allTracks = Array.from(new Map(allTracks.map(t => [t.id, t])).values());
    console.log(`Found ${allTracks.length} unique tracks. Processing and inserting into Supabase...`);

    // We need to extract unique artists
    const artistsMap = new Map();
    allTracks.forEach(track => {
        if (track.user && !artistsMap.has(track.user.id)) {
            artistsMap.set(track.user.id, {
                name: track.user.name,
                slug: track.user.handle,
                image_url: track.user.profile_picture?.['480x480'] || 'https://picsum.photos/seed/art/300/300',
                cover_url: track.user.cover_photo?.['2000x'] || null,
                verified: track.user.is_verified,
                genre: [track.genre].filter(Boolean)
            });
        }
    });

    console.log(`Saving ${artistsMap.size} artists...`);
    const localArtistMap = {};
    for (const [audiusId, artist] of artistsMap.entries()) {
        const { data: dbArtist, error } = await adminSupabase.from('artists').upsert(
            {
                name: artist.name,
                slug: artist.slug + '-' + audiusId,
                image_url: artist.image_url,
                verified: artist.verified,
                genre: artist.genre
            },
            { onConflict: 'slug' }
        ).select().single();

        if (error) {
            console.error(`Error inserting artist ${artist.name}:`, error.message);
        } else {
            localArtistMap[audiusId] = dbArtist.id;
        }
    }

    console.log('Saving tracks...');
    const songsToInsert = [];

    allTracks.forEach((track) => {
        const localArtistId = localArtistMap[track.user.id];
        if (!localArtistId) return;

        // Use a random host for streaming to distribute load, or the current host
        const audioUrl = `${host}/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`;
        const coverUrl = track.artwork?.['480x480'] || track.artwork?.['150x150'] || 'https://picsum.photos/seed/audius/300/300';

        songsToInsert.push({
            title: track.title,
            artist_id: localArtistId,
            audio_url: audioUrl,
            cover_url: coverUrl,
            duration: track.duration,
            genre: track.genre || 'Unknown',
            is_active: true,
            is_trending: track.play_count > 1000,
            is_featured: track.repost_count > 100
        });
    });

    // Batch insert songs 50 at a time
    for (let i = 0; i < songsToInsert.length; i += 50) {
        const batch = songsToInsert.slice(i, i + 50);
        const { error } = await adminSupabase.from('songs').insert(batch);
        if (error) {
            console.error('Error inserting songs batch:', error.message);
        }
    }

    console.log(`✅ Success! Inserted ${songsToInsert.length} REAL streaming songs from Audius into the database!`);
}

seedAudiusData().catch(console.error);
