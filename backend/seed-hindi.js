import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

const hindiArtists = [
    { name: 'Arijit Singh', slug: 'arijit-singh', genre: ['Bollywood', 'Romantic'], image: 'https://picsum.photos/seed/arijit/300/300' },
    { name: 'Shreya Ghoshal', slug: 'shreya-ghoshal', genre: ['Bollywood', 'Classical'], image: 'https://picsum.photos/seed/shreya/300/300' },
    { name: 'A.R. Rahman', slug: 'ar-rahman', genre: ['Bollywood', 'Fusion'], image: 'https://picsum.photos/seed/ar/300/300' },
    { name: 'Neha Kakkar', slug: 'neha-kakkar', genre: ['Party', 'Pop'], image: 'https://picsum.photos/seed/neha/300/300' },
    { name: 'Badshah', slug: 'badshah', genre: ['Hip-Hop', 'Party'], image: 'https://picsum.photos/seed/badshah/300/300' },
    { name: 'Jubin Nautiyal', slug: 'jubin-nautiyal', genre: ['Romantic', 'Sad'], image: 'https://picsum.photos/seed/jubin/300/300' },
    { name: 'Atif Aslam', slug: 'atif-aslam', genre: ['Romantic', 'Bollywood'], image: 'https://picsum.photos/seed/atif/300/300' },
    { name: 'Pritam', slug: 'pritam', genre: ['Bollywood'], image: 'https://picsum.photos/seed/pritam/300/300' },
];

const hindiSongs = [
    { title: 'Tum Hi Ho', artist: 'arijit-singh', genre: 'Romantic' },
    { title: 'Chaleya', artist: 'arijit-singh', genre: 'Bollywood' },
    { title: 'Kesariya', artist: 'arijit-singh', genre: 'Romantic' },
    { title: 'Jhoome Jo Pathaan', artist: 'arijit-singh', genre: 'Party' },
    { title: 'Teri Meri', artist: 'shreya-ghoshal', genre: 'Romantic' },
    { title: 'Param Sundari', artist: 'shreya-ghoshal', genre: 'Bollywood' },
    { title: 'Kun Faya Kun', artist: 'ar-rahman', genre: 'Sufi' },
    { title: 'Jai Ho', artist: 'ar-rahman', genre: 'Bollywood' },
    { title: 'Kala Chashma', artist: 'neha-kakkar', genre: 'Party' },
    { title: 'Garmi', artist: 'neha-kakkar', genre: 'Party' },
    { title: 'DJ Waley Babu', artist: 'badshah', genre: 'Party' },
    { title: 'Proper Patola', artist: 'badshah', genre: 'Hip-Hop' },
    { title: 'Raataan Lambiyan', artist: 'jubin-nautiyal', genre: 'Romantic' },
    { title: 'Lut Gaye', artist: 'jubin-nautiyal', genre: 'Sad' },
    { title: 'Jeena Jeena', artist: 'atif-aslam', genre: 'Romantic' },
    { title: 'Dil Diyan Gallan', artist: 'atif-aslam', genre: 'Romantic' },
    { title: 'Ae Dil Hai Mushkil', artist: 'pritam', genre: 'Sad' },
    { title: 'Kabira', artist: 'pritam', genre: 'Bollywood' },
    { title: 'Hawayein', artist: 'arijit-singh', genre: 'Romantic' },
    { title: 'Manwa Laage', artist: 'shreya-ghoshal', genre: 'Romantic' }
];

async function seedHindiData() {
    console.log('Inserting Artists...');

    // 1. Insert Artists
    for (const art of hindiArtists) {
        const { error } = await adminSupabase.from('artists').upsert({
            name: art.name,
            slug: art.slug,
            genre: art.genre,
            image_url: art.image,
            cover_url: art.image,
            verified: true
        }, { onConflict: 'slug' });
        if (error) console.error(`Failed to insert artist ${art.name}:`, error.message);
    }

    const { data: dbArtists } = await adminSupabase.from('artists').select('id, slug');
    const artistMap = {};
    dbArtists.forEach(a => artistMap[a.slug] = a.id);

    console.log('Inserting Songs...');

    // 2. Insert Songs (generate a larger pool by duplicating some with 'Mix' or 'Cover' for more volume)
    let allSongsToInsert = [];

    for (let i = 0; i < 5; i++) { // multiply the list 5 times to get ~100 songs
        hindiSongs.forEach((song, idx) => {
            const suffix = i === 0 ? '' : i === 1 ? ' (Remix)' : i === 2 ? ' (Acoustic)' : i === 3 ? ' (Lofi)' : ' (Live)';
            allSongsToInsert.push({
                title: song.title + suffix,
                artist_id: artistMap[song.artist],
                audio_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 16) + 1}.mp3`,
                cover_url: `https://picsum.photos/seed/hindi${i}${idx}/300/300`,
                duration: 180 + Math.floor(Math.random() * 120), // 3 to 5 mins
                genre: song.genre,
                is_featured: (Math.random() > 0.8), // 20% chance to be featured
                is_trending: (Math.random() > 0.7), // 30% chance to be trending
                is_active: true
            });
        });
    }

    // Insert in batches of 20 to avoid large payload errors
    console.log(`Prepared ${allSongsToInsert.length} songs. Inserting in batches...`);
    const insertedSongs = [];
    for (let i = 0; i < allSongsToInsert.length; i += 20) {
        const batch = allSongsToInsert.slice(i, i + 20);
        const { data: inserted, error } = await adminSupabase.from('songs').insert(batch).select('id, title');
        if (error) {
            console.error('Failed to insert batch:', error.message);
        } else if (inserted) {
            insertedSongs.push(...inserted);
        }
    }

    console.log(`Inserted ${insertedSongs.length} songs total.`);

    // 3. Create Playlists
    const { data: profiles } = await adminSupabase.from('profiles').select('id').limit(1);
    if (!profiles || profiles.length === 0) {
        console.log('No users found in database to attach playlists to. Skipping playlist creation.');
        return;
    }

    const userId = profiles[0].id;

    const playlists = [
        { name: 'Bollywood Top 50', description: 'The absolute best of Bollywood.', cover_url: 'https://picsum.photos/seed/pl1/300/300' },
        { name: 'Romantic Hindi', description: 'Love is in the air.', cover_url: 'https://picsum.photos/seed/pl2/300/300' },
        { name: 'Party Anthems', description: 'Turn up the bass!', cover_url: 'https://picsum.photos/seed/pl3/300/300' }
    ];

    for (const pl of playlists) {
        const { data: newPl, error: plErr } = await adminSupabase.from('playlists').insert({
            user_id: userId,
            name: pl.name,
            description: pl.description,
            cover_url: pl.cover_url,
            is_public: true
        }).select('id').single();

        if (plErr || !newPl) {
            console.error(`Error creating playlist ${pl.name}:`, plErr?.message);
            continue;
        }

        // Add 15 random songs to this playlist
        const shuffled = insertedSongs.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 15);

        const playlistSongs = selected.map((s, idx) => ({
            playlist_id: newPl.id,
            song_id: s.id,
            added_by: userId,
            position: idx
        }));

        const { error: psErr } = await adminSupabase.from('playlist_songs').insert(playlistSongs);
        if (psErr) {
            console.error(`Error adding songs to playlist ${pl.name}:`, psErr.message);
        } else {
            console.log(`Created playlist "${pl.name}" with 15 songs.`);
            // Update playlist stats manually since trigger might rely on user auth context, 
            // though the trigger defined in schema should handle it.
        }
    }

    console.log('🎉 Hindi Seed Data successfully uploaded!');
}

seedHindiData();
