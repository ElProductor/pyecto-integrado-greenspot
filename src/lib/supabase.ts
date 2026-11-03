import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Claves de almacenamiento para configuración en vivo desde la UI
const STORAGE_KEY_URL = 'greenspot_supabase_url';
const STORAGE_KEY_KEY = 'greenspot_supabase_key';

export function getStoredSupabaseConfig() {
  const customUrl = localStorage.getItem(STORAGE_KEY_URL);
  const customKey = localStorage.getItem(STORAGE_KEY_KEY);

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const url = customUrl || envUrl;
  const key = customKey || envKey;

  const isConfigured = Boolean(url && key && url.includes('supabase.co') && !url.includes('tu-proyecto'));

  return { url, key, isConfigured };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);

  // Reiniciar cliente
  supabaseClientInstance = null;
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, key, isConfigured } = getStoredSupabaseConfig();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (err) {
      console.warn('Error inicializando cliente de Supabase:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

export async function testSupabaseConnection(urlToTest?: string, keyToTest?: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = urlToTest || getStoredSupabaseConfig().url;
    const key = keyToTest || getStoredSupabaseConfig().key;

    if (!url || !key) {
      return { success: false, message: 'URL o Anon Key no proporcionados.' };
    }

    const testClient = createClient(url, key);
    // Intenta una consulta simple
    const { error } = await testClient.from('warehouses').select('count', { count: 'exact', head: true });
    
    if (error) {
      // Si la tabla no existe aún, pero la autenticación fue aceptada
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conexión a Supabase exitosa, pero las tablas aún no están creadas. Ejecuta el script schema.sql en el SQL Editor.' 
        };
      }
      return { success: false, message: `Error Supabase: ${error.message} (Código: ${error.code})` };
    }

    return { success: true, message: '¡Conexión a Supabase establecida correctamente!' };
  } catch (err: any) {
    return { success: false, message: `Error de red o configuración: ${err.message || 'Desconocido'}` };
  }
}
