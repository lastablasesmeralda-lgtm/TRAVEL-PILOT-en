
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
    console.log("🛡️ Intentando expandir el Escudo Legal (añadiendo columnas de Hotel y Vuelo)...");
    
    const sql = `
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS hotel_name VARCHAR(255);
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS hotel_phone VARCHAR(50);
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("❌ Fallo crítico al actualizar esquema:", error.message);
        console.log("\n⚠️ ACCIÓN REQUERIDA: Entra en Supabase -> SQL Editor y pega este código:");
        console.log(sql);
    } else {
        console.log("✅ ÉXITO: La base de datos ya está preparada para el Modo Élite.");
    }
}

addColumns();
