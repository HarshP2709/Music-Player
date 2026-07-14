import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

async function seed() {
    console.log('Fetching artists...');
    const { data: artists, error: artErr } = await adminSupabase.from('artists').select('id, name');

    if (artErr) {
        console.error('Error fetching artists', artErr);
        return;
    }

    if (!artists || artists.length === 0) {
        console.error('No artists found! Please ensure your database is seeded with artists first.');
        return;
    }

    const songsToInsert = [
        {
            title: 'Blinding Lights (Demo Cover)',
            artist_id: artists[0].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            cover_url: 'https://picsum.photos/seed/song1/300/300',
            duration: 372,
            is_featured: true,
            is_trending: true,
            genre: 'Pop'
        },
        {
            title: 'Levitating (Demo Remix)',
            artist_id: artists[1 % artists.length].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            cover_url: 'https://picsum.photos/seed/song2/300/300',
            duration: 425,
            is_featured: true,
            is_trending: true,
            genre: 'Dance'
        },
        {
            title: 'Gods Plan (Instrumental)',
            artist_id: artists[2 % artists.length].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            cover_url: 'https://picsum.photos/seed/song3/300/300',
            duration: 344,
            is_featured: false,
            is_trending: true,
            genre: 'Hip-Hop'
        },
        {
            title: 'Cruel Summer (Acoustic)',
            artist_id: artists[3 % artists.length].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
            cover_url: 'https://picsum.photos/seed/song4/300/300',
            duration: 302,
            is_featured: true,
            is_trending: false,
            genre: 'Pop'
        },
        {
            title: 'Bad Guy (Lo-fi)',
            artist_id: artists[4 % artists.length].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
            cover_url: 'https://picsum.photos/seed/song5/300/300',
            duration: 353,
            is_featured: true,
            is_trending: true,
            genre: 'Electropop'
        },
        {
            title: 'Starboy (Synthwave)',
            artist_id: artists[0].id,
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
            cover_url: 'https://picsum.photos/seed/song6/300/300',
            duration: 255,
            is_featured: false,
            is_trending: true,
            genre: 'R&B'
        }
    ];

    console.log('Inserting demo songs...');
    const { data, error } = await adminSupabase.from('songs').insert(songsToInsert).select();

    if (error) {
        console.error('Failed to insert songs:', error);
    } else {
        console.log(`Successfully inserted ${data.length} songs! Check the dashboard.`);
    }
}

seed();
