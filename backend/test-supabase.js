import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    console.log('Testing Supabase Client...');
    console.log('URL:', process.env.SUPABASE_URL);

    // Try to sign up a dummy user
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    try {
        const res = await client.auth.signUp({
            email,
            password,
        });
        console.log('SignUp Result:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('SignUp Error:', err);
    }

    // Try to sign in with incorrect details to see the response
    try {
        const res = await client.auth.signInWithPassword({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
        });
        console.log('SignIn Result:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('SignIn Error:', err);
    }
}

run();
