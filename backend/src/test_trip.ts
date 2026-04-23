
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripCreation() {
    const userEmail = "test@example.com";
    const title = "Viaje de Prueba";

    console.log(`Test: Creating trip for ${userEmail}`);

    try {
        // 1. Asegurar que el usuario existe
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', userEmail.toLowerCase())
            .single();

        if (userError || !userData) {
            console.log("User not found, creating user...");
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ email: userEmail.toLowerCase(), name: userEmail.split('@')[0] }])
                .select();

            if (createError) throw createError;
            userData = newUser?.[0];
            console.log("User created:", userData?.id);
        }

        if (!userData) throw new Error("No user data");

        // 2. Insertar trip
        const { data, error } = await supabase
            .from('trips')
            .insert([{
                user_id: userData.id,
                title: title,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'planned'
            }])
            .select();

        if (error) throw error;
        console.log("✅ Success! Trip created:", data[0].id);
    } catch (err: any) {
        console.error("❌ ERROR:", err.message);
    }
}

testTripCreation();
