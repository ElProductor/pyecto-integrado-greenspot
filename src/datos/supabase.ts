import { createClient, SupabaseClient } from '@supabase/supabase-js';

// La conexión sale solo de .env.local (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
export const supabaseConfig = {
  url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
};

let cliente: SupabaseClient | null = null;

/** Cliente único de Supabase, o null si falta configurar el .env.local. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfig.url || !supabaseConfig.key) return null;
  cliente ??= createClient(supabaseConfig.url, supabaseConfig.key, { auth: { persistSession: true, autoRefreshToken: true } });
  return cliente;
}
