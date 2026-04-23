
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectUsers() {
    console.log("Attempting to insert into 'users' with email...");
    const { error } = await supabase.from('users').insert([{ email: 'test@test.com', name: 'Test' }]);
    console.log("Users insert error (reveals schema):", error);
}

inspectUsers();
