
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTable() {
    console.log("Checking for ANY table with 'user' in the name...");
    // Intentar invocar un rpc que liste tablas si existiera, o simplemente probar nombres comunes
    const names = ['profiles', 'user_profile', 'accounts', 'user_data'];
    for (const n of names) {
        const { error } = await supabase.from(n).select('*').limit(1);
        if (error && error.code === 'PGRST205') {
            console.log(`❌ ${n} not found`);
        } else {
            console.log(`✅ ${n} found (or error different than not found)`);
        }
    }
}

findTable();
