import { supabase } from './src/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function minInsert() {
    console.log('Attempting minimal insert (only event_type)...');
    const { data, error } = await supabase.from('agent_logs').insert([{
        event_type: 'min_test'
    }]).select();

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}

minInsert();
