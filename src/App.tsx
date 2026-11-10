import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IAMProvider, useIAM, Cuenta } from './context/IAMContext';
import { LoginView, PinCambio } from './views/LoginView';
import { apiService } from './services/api';
import { AppCtx, Ctx, Datos, DlgSel, Ico, PanelSel, Vista, enProceso, sinCert } from './ui';
import { Inicio, Lotes, Materiales, Movimientos, Empresas, Certificados, Reportes, Configuracion } from './vistas';
import { Panel, FormEmpresa, FormMaterial, AjusteDlg } from './paneles';
import { FlujoDlg } from './flujos';

const VACIO: Datos = { mat: [], lotes: [], mov: [], bod: [], emp: [], cert: [], stock: [], usuarios: [] };
const ADMIN: Vista[] = ['emp', 'cert', 'rep', 'conf'];
const VISTAS = { inicio: Inicio, lotes: Lotes, mat: Materiales, mov: Movimientos, emp: Empresas, cert: Certificados, rep: Reportes, conf: Configuracion };

const CambioDlg: React.FC<{ cerrar: () => void }> = ({ cerrar }) => {
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

const MiPinDlg: React.FC<{ cerrar: () => void; aviso: (t: string) => void }> = ({ cerrar, aviso }) => {
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

const Principal: React.FC = () => {
  const iam = useIAM(), { user, isAdmin, realRole, verComoOperario } = iam;
  const [D, setD] = useState<Datos>(VACIO), [cargado, setCargado] = useState(false), [errorCarga, setErrorCarga] = useState('');
  const [vista, setVista] = useState<Vista>('inicio'), [panel, setPanel] = useState<PanelSel>(null), [dlg, setDlg] = useState<DlgSel>(null);
  const [menu, setMenu] = useState(false), [lado, setLado] = useState(false), [avisoTxt, setAvisoTxt] = useState(''), [avisoOn, setAvisoOn] = useState(false);
  const temp = useRef<number>();

  const aviso = useCallback((t: string) => {
    setAvisoTxt(t); setAvisoOn(true); clearTimeout(temp.current);
    temp.current = window.setTimeout(() => setAvisoOn(false), 3200);
  }, []);

  const recargar = useCallback(async () => {
    try {
      const [mat, lotes, mov, bod, emp, cert, stock, usuarios] = await Promise.all([
        apiService.getMaterials(), apiService.getBatches(), apiService.getMovements(), apiService.getWarehouses(), apiService.getStakeholders(),
        apiService.getCertificates(), apiService.getStock(), realRole === 'admin' ? apiService.getProfiles() : Promise.resolve([])
      ]);
      setD({ mat, lotes, mov, bod, emp, cert, stock, usuarios }); setErrorCarga('');
    } catch (e) { setErrorCarga((e as Error).message); }
    finally { setCargado(true); }
  }, [realRole]);

  // Al cambiar de cuenta se recarga en silencio: la pantalla abierta se mantiene.
  useEffect(() => { recargar(); }, [user.id, recargar]);
  useEffect(() => { setPanel(null); setDlg(null); setMenu(false); }, [user.id]);
  useEffect(() => { if (!isAdmin && ADMIN.includes(vista)) setVista('inicio'); }, [isAdmin, vista]);

  const ir = (v: Vista) => { setVista(v); setPanel(null); setLado(false); };
  const ctx: Ctx = { D, esAdmin: isAdmin, usuario: user.name, uid: user.id, recargar, aviso, setPanel, setDlg, ir };
  const nav = (v: Vista, t: string, cnt?: number) => (
    <button key={v} className={'nav' + (vista === v ? ' on' : '')} onClick={() => ir(v)}><Ico n={v} />{t}{!!cnt && <span className="cnt">{cnt}</span>}</button>
  );
  const V = VISTAS[vista], cerrarDlg = () => setDlg(null);

  return (
    <AppCtx.Provider value={ctx}>
      <div className="raiz" onMouseDown={e => { if (menu && !(e.target as HTMLElement).closest('.menuU, .usuario')) setMenu(false); }}>
        <header className="cab">
          <button className="hamb" aria-label="Menú" onClick={() => setLado(!lado)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="marca"><i>G</i>Greenspot</div>
          <div className="planta opc">Planta Dalcahue</div>
          <span className="sp" />
          <button className="usuario" title="Tu cuenta" onClick={() => setMenu(!menu)}>
            <span className="opc"><b>{user.name}</b> · {isAdmin ? 'Administración' : 'Operario'}</span><div className="inic">{user.initials}</div>
          </button>
        </header>
        <div className={'franja' + (verComoOperario ? ' on' : '')}>Estás viendo la app como operario.<button onClick={() => iam.setVerComoOperario(false)}>Volver a administración</button></div>
        <div className="app">
          <nav className={'lado' + (lado ? ' abierto' : '')}>
            <div className="grupo">Planta</div>
            {nav('inicio', 'Inicio')}{nav('lotes', 'Lotes', D.lotes.filter(enProceso).length)}{nav('mat', 'Materiales')}{nav('mov', 'Movimientos')}
            {isAdmin && <><div className="grupo">Administración</div>{nav('emp', 'Empresas')}{nav('cert', 'Certificados', sinCert(D).length)}{nav('rep', 'Reportes')}{nav('conf', 'Configuración')}</>}
          </nav>
          <main className="cuerpo">
            {errorCarga ? <div className="resultado mal"><span>No se pudieron cargar los datos: {errorCarga}</span><button className="btn chico" onClick={recargar}>Reintentar</button></div>
              : !cargado ? <div className="cargando">Cargando…</div> : <V />}
          </main>
        </div>

        <aside className={'panel' + (panel ? ' on' : '')}><Panel sel={panel} /></aside>

        <div className={'velo' + (dlg ? ' on' : '')} onMouseDown={e => { if (e.target === e.currentTarget) cerrarDlg(); }}>
          {dlg?.t === 'flujo' && <FlujoDlg key={dlg.f + (dlg.pre || '')} f={dlg.f} pre={dlg.pre} />}
          {dlg?.t === 'form' && (dlg.nombre === 'empresa' ? <FormEmpresa key={dlg.id || 'nueva'} id={dlg.id} /> : <FormMaterial />)}
          {dlg?.t === 'cambio' && <CambioDlg cerrar={cerrarDlg} />}
          {dlg?.t === 'ajuste' && <AjusteDlg key={dlg.id + dlg.modo} id={dlg.id} modo={dlg.modo} />}
          {dlg?.t === 'mipin' && <MiPinDlg cerrar={cerrarDlg} aviso={aviso} />}
        </div>

        <div className={'menuU' + (menu ? ' on' : '')}>
          <div className="yo"><b>{user.name}</b><small>{user.email}</small></div>
          {realRole === 'admin' && <button onClick={() => { iam.setVerComoOperario(!verComoOperario); setMenu(false); }}>{verComoOperario ? 'Volver a administración' : 'Ver como operario'}</button>}
          <button onClick={() => { setDlg({ t: 'cambio' }); setMenu(false); }}>Cambiar de usuario</button>
          <button onClick={() => { setDlg({ t: 'mipin' }); setMenu(false); }}>Crear o cambiar PIN</button>
          <hr />
          <button onClick={() => { setMenu(false); iam.signOut(); }}>Cerrar sesión</button>
        </div>

        <div className={'aviso' + (avisoOn ? ' on' : '')} role="status">{avisoTxt}</div>
      </div>
    </AppCtx.Provider>
  );
};

const App: React.FC = () => (
  <IAMProvider login={(cuentas, cambiarA, cancelar) => <LoginView cuentas={cuentas} cambiarA={cambiarA} cancelar={cancelar} />}>
    <Principal />
  </IAMProvider>
);

export default App;
