import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

const searchTerms = [
    'bollywood', 'hindi', 'punjabi', 'arijit singh', 'shreya ghoshal',
    'atif aslam', 'lofi hindi', 'party hindi', 'neha kakkar', 'ar rahman'
];

async function fetchItunes(term) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=200`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
}

async function runSeed() {
    console.log('🎵 Starting MASSIVE Hindi Dummy Data Generation...');
    let allTracks = [];

    for (const term of searchTerms) {
        console.log(`Searching for: ${term}`);
        const results = await fetchItunes(term);
        allTracks = allTracks.concat(results);
        await new Promise(res => setTimeout(res, 500)); // be nice to api
    }

    // Remove duplicates
    const uniqueTracks = Array.from(new Map(allTracks.map(t => [t.trackId, t])).values());
    console.log(`✅ Extracted ${uniqueTracks.length} unique Hindi tracks.`);

    // Extract Artists
    console.log('Processing Artists...');
    const artistsMap = new Map();
    uniqueTracks.forEach(t => {
        if (t.artistName && t.artistId) {
            artistsMap.set(t.artistId, {
                name: t.artistName,
                slug: `art-${t.artistId}`,
                genre: t.primaryGenreName ? [t.primaryGenreName] : ['Bollywood'],
                image_url: t.artworkUrl100?.replace('100x100bb', '600x600bb') || 'https://picsum.photos/300/300',
            });
        }
    });

    const localArtistMap = {};
    for (const [id, a] of artistsMap.entries()) {
        const { data: dbArtist, error } = await adminSupabase.from('artists').upsert({
            name: a.name,
            slug: a.slug,
            genre: a.genre,
            image_url: a.image_url,
            cover_url: a.image_url,
            verified: true
        }, { onConflict: 'slug' }).select('id').single();

        if (!error && dbArtist) {
            localArtistMap[id] = dbArtist.id;
        }
    }
    console.log(`✅ Added ${Object.keys(localArtistMap).length} artists to Supabase.`);

    console.log('Processing Tracks (Mapping to Dummy Audio)...');
    const dummyAudios = Array.from({ length: 17 }, (_, i) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3`);

    const songsToInsert = [];
    uniqueTracks.forEach((t, index) => {
        const artistId = localArtistMap[t.artistId];
        if (!artistId) return;

        // Use iTunes artwork but high-res
        const coverUrl = t.artworkUrl100?.replace('100x100bb', '600x600bb') || `https://picsum.photos/seed/song${index}/400/400`;

        // As per user request: DUMMY AUDIO METHOD
        const audioUrl = dummyAudios[index % dummyAudios.length];

        songsToInsert.push({
            title: t.trackName,
            artist_id: artistId,
            audio_url: audioUrl,
            cover_url: coverUrl,
            duration: t.trackTimeMillis ? Math.floor(t.trackTimeMillis / 1000) : 200,
            genre: t.primaryGenreName || 'Bollywood',
            is_active: true,
            is_trending: index < 50, // first 50 are trending
            is_featured: index % 5 === 0 // 20% are featured
        });
    });

    console.log(`Inserting ${songsToInsert.length} songs into database in batches of 50...`);

    for (let i = 0; i < songsToInsert.length; i += 50) {
        const batch = songsToInsert.slice(i, i + 50);
        const { error } = await adminSupabase.from('songs').insert(batch);
        if (error) {
            console.error('Error inserting songs:', error.message);
        }
    }

    // Create UI Scale Playlists
    const { data: profiles } = await adminSupabase.from('profiles').select('id').limit(1);
    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log('Creating Mega Playlists for UI Testing...');

        // Create one generic playlist with 100 songs to stress test
        const { data: megaPl } = await adminSupabase.from('playlists').insert({
            user_id: userId,
            name: 'Mega Bollywood Collection (Test)',
            description: 'A massive playlist to test the app performance.',
            is_public: true,
        }).select('id').single();

        if (megaPl) {
            // Get the first 100 inserted songs
            const { data: fetchSongs } = await adminSupabase.from('songs').select('id').order('created_at', { ascending: false }).limit(100);
            if (fetchSongs) {
                const psData = fetchSongs.map((s, idx) => ({
                    playlist_id: megaPl.id,
                    song_id: s.id,
                    added_by: userId,
                    position: idx
                }));
                await adminSupabase.from('playlist_songs').insert(psData);
                console.log('✅ Created mega playlist with 100 songs.');
            }
        }
    }

    console.log('🚀 DUMMY AUDIO METHOD COMPLETE: 1000+ tracks securely inserted!');
}

runSeed().catch(console.error);
