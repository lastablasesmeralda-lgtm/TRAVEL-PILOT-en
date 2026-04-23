
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    console.log("Trying to create user_trips table via RPC...");
    // This is a long shot, but sometimes projects have an 'exec_sql' or similar RPC
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS user_trips (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_email VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                destination VARCHAR(255),
                start_date VARCHAR(50),
                end_date VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `
    });

    if (error) {
        console.error("RPC failed (as expected):", error.message);
        console.log("Plan B: Using 'trips' table from schema.sql if possible.");
    } else {
        console.log("✅ Success! Table created.");
    }
}

createTable();
