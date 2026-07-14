import 'dotenv/config.js';
import { adminSupabase } from './src/config/supabase.js';

async function run() {
    console.log('Retrieving users from Auth...');
    try {
        const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();
        if (error) {
            console.error('Error listing users:', error);
            return;
        }
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- Email: ${u.email}, ID: ${u.id}, Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}, Created: ${u.created_at}`);
        });

        console.log('\nRetrieving profiles table...');
        const { data: profiles, error: pError } = await adminSupabase
            .from('profiles')
            .select('*');
        if (pError) {
            console.error('Error fetching profiles:', pError);
        } else {
            console.log(`Found ${profiles?.length || 0} profiles:`);
            profiles?.forEach(p => {
                console.log(`- Username: ${p.username}, Email: ${p.email}, ID: ${p.id}`);
            });
        }
    } catch (err) {
        console.error('Execution error:', err);
    }
}

run();
