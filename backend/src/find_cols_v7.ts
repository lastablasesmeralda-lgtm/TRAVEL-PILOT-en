
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCols() {
    console.log("Searching columns for 'users'...");
    const { error: err1 } = await supabase.from('users').insert([{ auth_user_id: '00000000-0000-0000-0000-000000000000', full_name: 'Test' }]);
    console.log("Users insert error (full_name):", err1?.message);
    const { error: err2 } = await supabase.from('users').insert([{ auth_user_id: '00000000-0000-0000-0000-000000000000', display_name: 'Test' }]);
    console.log("Users insert error (display_name):", err2?.message);
    const { error: err3 } = await supabase.from('users').insert([{ auth_user_id: '00000000-0000-0000-0000-000000000000', username: 'Test' }]);
    console.log("Users insert error (username):", err3?.message);
}

findCols();
