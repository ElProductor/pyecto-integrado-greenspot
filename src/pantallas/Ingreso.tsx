import React, { useState } from 'react';
import { getSupabase } from '../datos/supabase';

export const Ingreso: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setEnviando(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setEnviando(false);
    if (error) setError(error.message.includes('Invalid login') ? 'Correo o contraseña incorrectos.' : error.message);
  };

  return (
    <div className="ingreso on fijo">
      <form onSubmit={entrar}>
        <div className="marca"><i>G</i>Greenspot</div>
        <h3>Ingresar</h3>
        <p>Usa tu cuenta de la planta.</p>
        <div className="campo"><label htmlFor="correo">Correo</label>
          <input id="correo" type="email" autoComplete="username" placeholder="nombre@greenspot.cl" required autoFocus value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className={'campo' + (error ? ' mal' : '')}><label htmlFor="clave">Contraseña</label>
          <input id="clave" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          <div className="ayuda">{error}</div></div>
        <button className="btn pri" type="submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="nota">¿No tienes cuenta? Pídela a la administración de la planta. En un equipo compartido, cierra sesión al terminar.</p>
      </form>
    </div>
  );
};
