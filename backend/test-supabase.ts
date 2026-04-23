import { supabase } from './src/supabase';
import dotenv from 'dotenv';
dotenv.config();

console.log('Using Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

async function testSupabase() {
    // @ts-ignore
    console.log('Testing Supabase connection with URL:', supabase.supabaseUrl);
    console.log('Testing Supabase connection and insertion...');
    try {
        const { data: insertResponse, error: insertError } = await supabase.from('agent_logs').insert([{
            event_type: 'test_connection_v2',
            status: 'pending'
        }]).select();

        if (insertError) {
            console.error('Insert Error Details:', insertError);
        } else {
            console.log('✅ Insertion successful! Inserted data:', insertResponse);
        }

        const { data, error } = await supabase.from('agent_logs').select('*');
        if (error) {
            console.error('Select Error:', error.message);
        } else {
            console.log('✅ Selection successful! Total rows:', data?.length);
            console.log('Last rows:', data?.slice(-3));
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

testSupabase().then(() => console.log('Test finished.'));
