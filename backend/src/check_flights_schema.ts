
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking user_flights structure...");
    const { error } = await supabase.from('user_flights').insert([{ flight_number: 'TEST' }]);
    console.log("Error reveals columns:", error);
}

check();
