
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findColumns() {
    console.log("Checking properties of first user in 'users'...");
    const { data, error } = await supabase.from('users').select('*').limit(1);
    console.log("Users data/error:", { data, error });
}

findColumns();
