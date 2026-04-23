
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripInsert() {
    console.log("Testing insert into 'trips'...");
    // Intentar insertar un viaje sin user_id
    const { error } = await supabase.from('trips').insert([{}]);
    console.log("Trips empty insert error:", error?.message);
}

testTripInsert();
