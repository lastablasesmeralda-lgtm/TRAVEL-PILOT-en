
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fuzz() {
    const list = ['user_trips', 'user_trip', 'users_trips', 'users_trip', 'my_trips', 'trips_user'];
    for (const t of list) {
        const { error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`❌ ${t}: ${error.code} - ${error.message}`);
        } else {
            console.log(`✅ ${t}: FOUND!`);
        }
    }
}

fuzz();
