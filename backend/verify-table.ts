
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
    console.log('--- Verificando Tabla user_flights ---');
    try {
        const { data, error } = await supabase
            .from('user_flights')
            .select('*')
            .limit(1);

        if (error) {
            if (error.code === '42P01') {
                console.error('❌ ERROR: La tabla "user_flights" NO existe.');
            } else {
                console.error('❌ ERROR al consultar la tabla:', error.message);
            }
            return;
        }

        console.log('✅ LA TABLA EXISTE Y ES ACCESIBLE.');
        console.log('Contenido (limit 1):', data);
    } catch (err: any) {
        console.error('❌ Error fatal:', err.message);
    }
}

verifyTable();
