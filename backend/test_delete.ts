
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend dir
dotenv.config({ path: 'c:/Users/HP/.gemini/antigravity/playground/golden-pulsar/travel-pilot/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log('--- Testing Agent Logs Deletion ---');
    
    // 1. Count logs
    const { count: beforeCount } = await supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true });
    
    console.log(`Current logs count: ${beforeCount}`);

    // 2. Try delete all
    console.log('Attempting to delete all logs...');
    const { error } = await supabase
        .from('agent_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Standard UUID null

    if (error) {
        console.error('Delete error:', error);
        
        console.log('Trying alternative delete (by date)...');
        const { error: error2 } = await supabase
            .from('agent_logs')
            .delete()
            .gt('created_at', '2000-01-01');
            
        if (error2) console.error('Fallied again:', error2);
        else console.log('Delete by date success!');
    } else {
        console.log('Delete success!');
    }

    // 3. Count again
    const { count: afterCount } = await supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true });
    
    console.log(`Logs count after: ${afterCount}`);
}

testDelete();
