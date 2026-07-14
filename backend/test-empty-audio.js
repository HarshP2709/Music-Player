import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

async function main() {
    const { data, error } = await adminSupabase
        .from('songs')
        .select('id, title, audio_url')
        .is('audio_url', null);

    if (error) console.error(error);
    else console.log(`Found ${data.length} songs with missing audio_url.`);
    if (data && data.length > 0) {
        console.log(data);
    }
}
main();
