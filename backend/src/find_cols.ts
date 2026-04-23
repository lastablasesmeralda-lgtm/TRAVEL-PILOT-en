
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCols() {
    console.log("Searching columns for 'users'...");
    // Intentar un insert vacío para ver qué falla por NOT NULL
    const { error: err1 } = await supabase.from('users').insert([{}]);
    console.log("Users empty insert error:", err1?.message);

    console.log("Searching columns for 'trips'...");
    const { error: err2 } = await supabase.from('trips').insert([{}]);
    console.log("Trips empty insert error:", err2?.message);

    console.log("Searching columns for 'user_flights'...");
    const { error: err3 } = await supabase.from('user_flights').insert([{}]);
    console.log("User_flights empty insert error:", err3?.message);
}

findCols();
