
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserInsert() {
    console.log("Testing insert into 'users'...");
    const { error } = await supabase.from('users').insert([{}]);
    console.log("Users empty insert error:", error?.message);
}

testUserInsert();
