
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCols() {
    console.log("Searching columns for 'users'...");
    const { error: err1 } = await supabase.from('users').insert([{ auth_user_id: 'dummy' }]);
    console.log("Users insert error:", err1?.message);

    console.log("Searching columns for 'trips'...");
    const { error: err2 } = await supabase.from('trips').insert([{ user_id: '00000000-0000-0000-0000-000000000000' }]);
    console.log("Trips insert error:", err2?.message);

    console.log("Searching columns for 'user_flights'...");
    const { error: err3 } = await supabase.from('user_flights').insert([{ flight_number: 'TP404' }]);
    console.log("User_flights insert error:", err3?.message);
}

findCols();
