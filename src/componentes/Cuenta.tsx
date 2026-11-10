import React, { useState } from 'react';
import { apiService } from '../datos/api';
import { Cuenta, useIAM } from '../datos/sesion';
import { PinCambio } from '../pantallas/Ingreso';

export const CambioDlg: React.FC<{ cerrar: () => void }> = ({ cerrar }) => {
  const { cuentas, cambiarA, setOtraCuenta } = useIAM();
  const [elegida, setElegida] = useState<Cuenta | null>(null);
  if (elegida) return <div className="dlg"><PinCambio cuenta={elegida} cambiarA={cambiarA} onAtras={() => setElegida(null)} onListo={cerrar} /></div>;
  return <div className="dlg">
    <div className="dc"><small>Tu cuenta</small><h3>Cambiar de usuario</h3></div>
    <div className="db">
      {cuentas.length ? <div className="opciones">{cuentas.map(c => (
        <button key={c.id} className="opcion" onClick={() => setElegida(c)}><span>{c.nombre}<span className="desc">{c.rol === 'admin' ? 'Administración' : 'Operario'}</span></span><small>PIN</small></button>
      ))}</div> : <p className="sec">Todavía no hay otras cuentas en este equipo. Entra una vez con la contraseña de la otra persona; desde ahí se cambia con su PIN.</p>}
    </div>
    <div className="dp"><button className="btn" onClick={cerrar}>Cancelar</button><button className="btn" onClick={() => { cerrar(); setOtraCuenta(true); }}>Entrar con otra cuenta</button></div>
  </div>;
};

export const MiPinDlg: React.FC<{ cerrar: () => void; aviso: (t: string) => void }> = ({ cerrar, aviso }) => {
  const [a, setA] = useState(''), [b, setB] = useState(''), [error, setError] = useState(''), [enviando, setEnviando] = useState(false);
  const solo = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => f(e.target.value.replace(/\D/g, '').slice(0, 4));
  const ok = a.length === 4 && a === b;
  const guardar = async () => {
    if (!ok || enviando) return;
    setEnviando(true);
    try { await apiService.setMyPin(a); cerrar(); aviso('PIN guardado. Ya puedes volver a esta cuenta con él.'); }
    catch (e) { setError((e as Error).message); setEnviando(false); }
  };
  return <div className="dlg" onKeyDown={e => e.key === 'Enter' && guardar()}>
    <div className="dc"><small>Tu cuenta</small><h3>Crear o cambiar PIN</h3></div>
    <div className="db">
      <div className="fila2">
        <div className="campo"><label htmlFor="p1">PIN nuevo</label><input id="p1" className="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus value={a} onChange={solo(setA)} /></div>
        <div className={'campo' + (b.length === 4 && a !== b ? ' mal' : '')}><label htmlFor="p2">Repítelo</label><input id="p2" className="pin" type="password" inputMode="numeric" autoComplete="off" value={b} onChange={solo(setB)} />
          <div className="ayuda">{b.length === 4 && a !== b ? 'No coinciden.' : ''}</div></div>
      </div>
      <p className="nota">4 números. Sirve para volver a esta cuenta desde «Cambiar de usuario» sin escribir la contraseña.</p>
      {error && <div className="resultado mal"><span>{error}</span></div>}
    </div>
    <div className="dp"><button className="btn" onClick={cerrar}>Cancelar</button><button className="btn pri" disabled={!ok || enviando} onClick={guardar}>Guardar PIN</button></div>
  </div>;
};
