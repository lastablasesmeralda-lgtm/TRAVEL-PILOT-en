import { supabase } from './src/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function quickInsert() {
    console.log('Attempting quick insert...');
    const { data, error } = await supabase.from('agent_logs').insert([{
        event_type: 'quick_test',
        status: 'pending'
    }]).select();

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}

quickInsert();
