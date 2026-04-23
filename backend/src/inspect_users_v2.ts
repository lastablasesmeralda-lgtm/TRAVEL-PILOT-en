
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting 'users' table columns...");
    // Try to get column names from information_schema
    const { data: cols, error: err } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'users');

    if (err) {
        console.log("Error querying information_schema (expected if not allowed):", err.message);
    } else {
        console.log("Columns in 'users':", cols.map(c => c.column_name));
    }

    // Try dummy insert into 'users' with nothing
    const { error: uErr } = await supabase.from('users').insert([{}]);
    console.log("Empty insert to 'users' error:", uErr?.message);
}

inspect();
