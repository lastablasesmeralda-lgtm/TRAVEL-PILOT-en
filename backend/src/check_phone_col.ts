
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Specify path to .env file in the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
    console.log("Adding 'phone_number' column to 'users' table...");
    
    // Using rpc or direct SQL is not always available via the client without specific functions
    // But we can try to use the 'query' or similar if it's a custom function, 
    // or just try an insert to see if it allows it (which it won't if the column doesn't exist).
    
    // Since I cannot run raw SQL directly through the standard client without an RPC, 
    // I will check if there's an RPC I can use or if I can just rely on the fact that 
    // the user might have to add it manually if it fails. 
    // HOWEVER, I can try to use a "hacker" way if there's a postgres function available.
    
    // If I don't have SQL access, I'll at least verify the current state clearly.
    const { error } = await supabase.from('users').select('phone_number').limit(1);
    
    if (error && error.message.includes('column "phone_number" does not exist')) {
        console.log("Column 'phone_number' is missing. Please add it via Supabase SQL Editor:");
        console.log("ALTER TABLE users ADD COLUMN phone_number TEXT;");
    } else if (error) {
        console.error("Error checking column:", error.message);
    } else {
        console.log("Column 'phone_number' already exists.");
    }
}

updateSchema();
