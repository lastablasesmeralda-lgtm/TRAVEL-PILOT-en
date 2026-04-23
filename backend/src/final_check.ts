
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTable() {
    console.log("Checking if user_trips or similar exists...");
    const { data, error } = await supabase.from('trips').select('*').limit(1);
    console.log("trips table check:", { data, error });

    // Check user_flights also
    const { data: df, error: ef } = await supabase.from('user_flights').select('*').limit(1);
    console.log("user_flights table check:", { df, ef });
}

findTable();
