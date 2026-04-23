
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrips() {
    console.log("Inserting a test trip into 'trips' to see what happens...");
    // We will try a blind insert and see error message for column info
    const { error } = await supabase.from('trips').insert([{ title: 'Test' }]);
    console.log("Insert error (reveals schema):", error);
}

checkTrips();
