
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
    const list = ['users', 'trips', 'user_trips', 'user_trip', 'user_flights', 'user_push_tokens'];
    for (const t of list) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`--- ${t}: ERROR ${error.code} ---`);
        } else {
            console.log(`--- ${t}: FOUND! ---`);
            const { error: e2 } = await supabase.from(t).insert([{ any_col: 1 }]);
            process.stdout.write(`  Details: ${e2?.message || 'None'}\n`);
        }
    }
}

scan();
