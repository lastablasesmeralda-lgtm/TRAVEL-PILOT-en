
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking user_trips...");
    const { data, error } = await supabase.from('user_trips').select('*').limit(1);
    if (error) {
        console.error("Error checking user_trips:", error.message);
    } else {
        console.log("user_trips exists. Sample data:", data);
    }

    console.log("Checking user_flights...");
    const { data: data3, error: error3 } = await supabase.from('user_flights').select('*').limit(1);
    if (error3) {
        console.error("Error checking user_flights:", error3.message);
    } else {
        console.log("user_flights exists. Sample data:", data3);
    }

    console.log("Checking user_push_tokens...");
    const { data: data4, error: error4 } = await supabase.from('user_push_tokens').select('*').limit(1);
    if (error4) {
        console.error("Error checking user_push_tokens:", error4.message);
    } else {
        console.log("user_push_tokens exists. Sample data:", data4);
    }

    console.log("Checking agent_logs...");
    const { data: data5, error: error5 } = await supabase.from('agent_logs').select('*').limit(1);
    if (error5) {
        console.error("Error checking agent_logs:", error5.message);
    } else {
        console.log("agent_logs exists. Sample data:", data5);
    }
}

check();
