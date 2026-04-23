
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function trial() {
    console.log("Trial: Inserting into 'trips' with user_email...");
    const { error } = await supabase.from('trips').insert([{ title: 'Trial Trip', user_email: 'test@example.com' }]);
    console.log("Error:", error?.message);

    console.log("Trial: Inserting into 'trips' with user_id... (dummy uuid)");
    const { error: e2 } = await supabase.from('trips').insert([{ title: 'Trial Trip', user_id: '00000000-0000-0000-0000-000000000000' }]);
    console.log("Error with dummy uuid:", e2?.message);
}

trial();
