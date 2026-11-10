import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import type { Cuenta } from '../context/IAMContext';

const ROL = { admin: 'Administración', operator: 'Operario' };

/** Pide el PIN de otra cuenta del equipo y cambia a ella. Se usa en el ingreso y en «Cambiar de usuario». */
export const PinCambio: React.FC<{ cuenta: Cuenta; cambiarA: (id: string, pin: string) => Promise<void>; onAtras: () => void; onListo?: () => void }> = ({ cuenta, cambiarA, onAtras, onListo }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const probar = async (valor: string) => {
    if (valor.length !== 4 || enviando) return;
    setEnviando(true); setError('');
    try { await cambiarA(cuenta.id, valor); onListo?.(); }
    catch (e) { setError((e as Error).message); setPin(''); }
    finally { setEnviando(false); }
  };
  return (
    <>
      <div className="dc"><small>Cambiar de usuario</small><h3>{cuenta.nombre}</h3></div>
      <div className="db">
        <div className={'campo' + (error ? ' mal' : '')}>
          <label htmlFor="pin">PIN de 4 números</label>
          <input id="pin" className="pin" inputMode="numeric" maxLength={4} autoComplete="off" autoFocus value={pin} disabled={enviando}
            onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); if (v.length === 4) probar(v); }}
            onKeyDown={e => e.key === 'Enter' && probar(pin)} />
          <div className="ayuda">{error || (enviando ? 'Comprobando…' : ROL[cuenta.rol] + ' · ' + cuenta.email)}</div>
        </div>
      </div>
      <div className="dp"><button className="btn" type="button" onClick={onAtras}>Atrás</button><button className="btn pri" type="button" disabled={pin.length !== 4 || enviando} onClick={() => probar(pin)}>Entrar</button></div>
    </>
  );
};

export const LoginView: React.FC<{ cuentas: Cuenta[]; cambiarA: (id: string, pin: string) => Promise<void>; cancelar?: () => void }> = ({ cuentas, cambiarA, cancelar }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [elegida, setElegida] = useState<Cuenta | null>(null);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setEnviando(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setEnviando(false);
    if (error) setError(error.message.includes('Invalid login') ? 'Correo o contraseña incorrectos.' : error.message);
  };

  if (elegida) return (
    <div className="ingreso on fijo"><div className="dlg"><PinCambio cuenta={elegida} cambiarA={cambiarA} onAtras={() => setElegida(null)} /></div></div>
  );

  return (
    <div className="ingreso on fijo">
      <form onSubmit={entrar}>
        <div className="marca"><i>G</i>Greenspot</div>
        <h3>{cancelar ? 'Entrar con otra cuenta' : 'Ingresar'}</h3>
        <p>{cancelar ? 'La sesión actual queda guardada para volver con su PIN.' : 'Usa tu cuenta de la planta.'}</p>
        <div className="campo"><label htmlFor="correo">Correo</label>
          <input id="correo" type="email" autoComplete="username" placeholder="nombre@greenspot.cl" required autoFocus value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className={'campo' + (error ? ' mal' : '')}><label htmlFor="clave">Contraseña</label>
          <input id="clave" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          <div className="ayuda">{error}</div></div>
        <button className="btn pri" type="submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
        {cancelar && <button className="btn volver" type="button" onClick={cancelar}>Cancelar</button>}
        {cuentas.length > 0 && (
          <div className="cuentas"><small>Cuentas en este equipo · entra con su PIN</small>
            <div className="opciones">{cuentas.map(c => (
              <button key={c.id} type="button" className="opcion" onClick={() => setElegida(c)}>
                <span>{c.nombre}<span className="desc">{ROL[c.rol]}</span></span><small>PIN</small>
              </button>))}
            </div>
          </div>
        )}
        {!cancelar && <p className="nota">¿No tienes cuenta? Pídela a la administración de la planta.</p>}
      </form>
    </div>
  );
};
