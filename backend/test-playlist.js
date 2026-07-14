import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

async function main() {
    const { data, error } = await adminSupabase
        .from('playlists')
        .select(`
      *,
      playlist_songs (
        id,
        songs ( id, title, duration, audio_url, artists ( name ) )
      )
    `)
        .limit(1);

    if (error) console.error(error);
    else console.dir(data[0].playlist_songs[0].songs, { depth: null });
}
main();
