import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type { UserRole, Perfil } from './tipos';

interface Usuario { id: string; name: string; email: string; initials: string }

interface IAMContextType {
  user: Usuario;
  realRole: UserRole;
  isAdmin: boolean;          // rol con el que se ve la app (el admin puede "ver como operario")
  verComoOperario: boolean;
  setVerComoOperario: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const IAMContext = createContext<IAMContextType | undefined>(undefined);
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

// El cambio rápido con PIN guardaba aquí las sesiones de todas las cuentas: cualquiera con F12 podía tomarlas.
// Se borra lo que haya quedado en equipos que usaron la versión anterior.
try { localStorage.removeItem('greenspot_cuentas'); } catch { /* sin almacenamiento */ }

export const IAMProvider: React.FC<{ children: React.ReactNode; login: React.ReactNode }> = ({ children, login }) => {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState('');
  const [verComoOperario, setVerComoOperario] = useState(false);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const uid = session?.user.id;
  useEffect(() => {
    setError(''); setVerComoOperario(false);
    if (!supabase || !uid) { setPerfil(null); return; }
    // El perfil anterior se mantiene en pantalla hasta que llega el nuevo: la vista abierta no se pierde.
    supabase.from('profiles').select('id, full_name, email, role, is_active').eq('id', uid).single()
      .then(({ data, error }) => {
        if (error || !data) setError(error?.message || 'No se encontró tu perfil.');
        else if (!data.is_active) setError('Tu cuenta está desactivada. Habla con la administración.');
        else setPerfil(data as Perfil);
      });
  }, [supabase, uid]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut({ scope: 'local' });
    setPerfil(null);
  }, [supabase]);

  if (!supabase) return <Centro>Falta configurar la conexión a la base de datos (archivo .env.local).</Centro>;
  if (session === undefined) return <Centro>Cargando…</Centro>;
  if (!session) return <>{login}</>;
  if (error) return <Centro>{error}<button className="btn" onClick={signOut}>Salir</button></Centro>;
  if (!perfil) return <Centro>Cargando…</Centro>;

  return (
    <IAMContext.Provider value={{
      user: { id: perfil.id, name: perfil.full_name, email: perfil.email, initials: iniciales(perfil.full_name) },
      realRole: perfil.role,
      isAdmin: perfil.role === 'admin' && !verComoOperario,
      verComoOperario,
      // Solo un admin puede bajar a la vista de operario; nunca al revés.
      setVerComoOperario: v => setVerComoOperario(perfil.role === 'admin' && v),
      signOut
    }}>
      {children}
    </IAMContext.Provider>
  );
};

const Centro: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="centro">{children}</div>;

export const useIAM = (): IAMContextType => {
  const context = useContext(IAMContext);
  if (!context) throw new Error('useIAM debe ser usado dentro de un IAMProvider');
  return context;
};
