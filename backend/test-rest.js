import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const url = `${process.env.SUPABASE_URL}/rest/v1/artists?select=*`;
    console.log('Fetching', url);
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text.substring(0, 500));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

run();
