
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const tables = ['users', 'trips', 'flights', 'agent_logs', 'user_trips', 'user_flights', 'user_push_tokens'];
    for (const t of tables) {
        process.stdout.write(`Checking ${t}... `);
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`❌ ERROR: ${error.message}`);
        } else {
            console.log(`✅ OK (Count: ${data.length})`);
        }
    }
}

check();
