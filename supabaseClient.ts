import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza estas variables con las de tu proyecto de Supabase cuando lo registres.
const SUPABASE_URL = 'https://bmhrkootluunvoscnwdu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KFGJJOZU4m44eX8v0dFaUw_oNMAB5UV';

// Inicializamos el cliente. Cuando pongas tus claves, esto funcionará automáticamente.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
