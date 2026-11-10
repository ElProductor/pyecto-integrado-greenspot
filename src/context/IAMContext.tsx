import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import { UserRole, Perfil } from '../types';
import { getSupabase, getStoredSupabaseConfig } from '../lib/supabase';

/** Cuenta que ya entró con contraseña en este equipo: se puede volver a ella con su PIN. */
export interface Cuenta { id: string; email: string; nombre: string; rol: UserRole; rt: string }

interface Usuario { id: string; name: string; email: string; initials: string }

interface IAMContextType {
  user: Usuario;
  realRole: UserRole;
  isAdmin: boolean;          // rol con el que se ve la app (el admin puede "ver como operario")
  verComoOperario: boolean;
  setVerComoOperario: (v: boolean) => void;
  cuentas: Cuenta[];         // otras cuentas de este equipo
  cambiarA: (id: string, pin: string) => Promise<void>;
  otraCuenta: boolean;       // mostrar el ingreso con contraseña sin cerrar la sesión actual
  setOtraCuenta: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const IAMContext = createContext<IAMContextType | undefined>(undefined);
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

// shortcut: los tokens de las cuentas recordadas quedan en este navegador (como la sesión normal de Supabase);
// el PIN es un candado de uso diario, no reemplaza la contraseña. Para equipos compartidos de verdad: PIN en un servidor propio.
const CLAVE = 'greenspot_cuentas';
const leer = (): Cuenta[] => { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; } };
const escribir = (c: Cuenta[]) => { try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin almacenamiento: no hay cambio rápido */ } };
const guardarCuenta = (c: Partial<Cuenta> & { id: string }) => {
  const todas = leer(), i = todas.findIndex(x => x.id === c.id);
  if (i >= 0) todas[i] = { ...todas[i], ...c }; else if (c.email && c.rt) todas.push({ nombre: c.email, rol: 'operator', ...c } as Cuenta);
  escribir(todas);
};
const quitarCuenta = (id: string) => escribir(leer().filter(x => x.id !== id));

export const IAMProvider: React.FC<{ children: React.ReactNode; login: (cuentas: Cuenta[], cambiarA: IAMContextType['cambiarA'], cancelar?: () => void) => React.ReactNode }> = ({ children, login }) => {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState('');
  const [verComoOperario, setVerComoOperario] = useState(false);
  const [otraCuenta, setOtraCuenta] = useState(false);
  const [, refrescar] = useState(0);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      // Cada token nuevo se guarda: así la cuenta sigue disponible para el cambio rápido.
      if (s) guardarCuenta({ id: s.user.id, email: s.user.email || '', rt: s.refresh_token });
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const uid = session?.user.id;
  useEffect(() => {
    setError(''); setVerComoOperario(false); setOtraCuenta(false);
    if (!supabase || !uid) { setPerfil(null); return; }
    // El perfil anterior se mantiene en pantalla hasta que llega el nuevo: la vista abierta no se pierde.
    supabase.from('profiles').select('id, full_name, email, role, is_active').eq('id', uid).single()
      .then(({ data, error }) => {
        if (error || !data) setError(error?.message || 'No se encontró tu perfil.');
        else if (!data.is_active) setError('Tu cuenta está desactivada. Habla con la administración.');
        else { setPerfil(data as Perfil); guardarCuenta({ id: data.id, nombre: data.full_name, rol: data.role }); }
      });
  }, [supabase, uid]);

  const signOut = useCallback(async () => {
    if (uid) quitarCuenta(uid);
    await supabase?.auth.signOut({ scope: 'local' });
    setPerfil(null);
  }, [supabase, uid]);

  // El PIN se comprueba en la base con la sesión de la otra cuenta, en un cliente aparte:
  // si falla, la sesión actual ni se entera.
  const cambiarA = useCallback(async (id: string, pin: string) => {
    const c = leer().find(x => x.id === id);
    if (!supabase || !c) throw new Error('Esa cuenta ya no está en este equipo.');
    const { url, key } = getStoredSupabaseConfig();
    const aparte = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'greenspot-cambio' } });
    const { data, error } = await aparte.auth.refreshSession({ refresh_token: c.rt });
    if (error || !data.session) { quitarCuenta(id); refrescar(n => n + 1); throw new Error('La sesión de esa cuenta venció. Entra con su contraseña.'); }
    guardarCuenta({ id, rt: data.session.refresh_token });
    const { data: ok, error: e2 } = await aparte.rpc('verify_my_pin', { p_pin: pin });
    if (e2) throw new Error(e2.message);
    if (!ok) throw new Error('PIN incorrecto. Si la cuenta aún no tiene PIN, entra con su contraseña y créalo desde su nombre › «Crear o cambiar PIN». Tras 5 intentos fallidos se bloquea.');
    await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  }, [supabase]);

  if (!supabase) return <Centro>Falta configurar la conexión a la base de datos (archivo .env.local).</Centro>;
  if (session === undefined) return <Centro>Cargando…</Centro>;
  if (!session) return <>{login(leer(), cambiarA)}</>;
  if (error) return <Centro>{error}<button className="btn" onClick={signOut}>Salir</button></Centro>;
  if (!perfil) return <Centro>Cargando…</Centro>;

  const otras = leer().filter(x => x.id !== perfil.id);
  return (
    <IAMContext.Provider value={{
      user: { id: perfil.id, name: perfil.full_name, email: perfil.email, initials: iniciales(perfil.full_name) },
      realRole: perfil.role,
      isAdmin: perfil.role === 'admin' && !verComoOperario,
      verComoOperario,
      // Solo un admin puede bajar a la vista de operario; nunca al revés.
      setVerComoOperario: v => setVerComoOperario(perfil.role === 'admin' && v),
      cuentas: otras,
      cambiarA,
      otraCuenta,
      setOtraCuenta,
      signOut
    }}>
      {children}
      {otraCuenta && login(otras, cambiarA, () => setOtraCuenta(false))}
    </IAMContext.Provider>
  );
};

const Centro: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="centro">{children}</div>;

export const useIAM = (): IAMContextType => {
  const context = useContext(IAMContext);
  if (!context) throw new Error('useIAM debe ser usado dentro de un IAMProvider');
  return context;
};
