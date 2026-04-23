
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCols() {
    console.log("Searching columns for 'users'...");
    const { error: err1 } = await supabase.from('users').insert([{ auth_user_id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' }]);
    console.log("Users insert error (UUID):", err1?.message);

    console.log("Searching columns for 'trips'...");
    const { error: err2 } = await supabase.from('trips').insert([{ user_id: '00000000-0000-0000-0000-000000000000', title: 'Test', start_date: '2025-01-01' }]);
    console.log("Trips insert error (DATE):", err2?.message);
}

findCols();
