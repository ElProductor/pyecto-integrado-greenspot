import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from './datos/api';
import { IAMProvider, useIAM } from './datos/sesion';
import { Datos, Vista, PanelSel, DlgSel, Ctx, AppCtx } from './logica/contexto';
import { enProceso, sinCert } from './logica/reglas';
import { Ico } from './componentes/Comunes';
import { FlujoDlg } from './componentes/Flujos';
import { FormEmpresa, FormMaterial } from './componentes/Formularios';
import { AjusteDlg, Panel } from './componentes/Paneles';
import { Certificados } from './pantallas/Certificados';
import { Configuracion } from './pantallas/Configuracion';
import { Empresas } from './pantallas/Empresas';
import { Ingreso } from './pantallas/Ingreso';
import { Inicio } from './pantallas/Inicio';
import { Lotes } from './pantallas/Lotes';
import { Materiales } from './pantallas/Materiales';
import { Movimientos } from './pantallas/Movimientos';
import { Reportes } from './pantallas/Reportes';

const VACIO: Datos = { mat: [], lotes: [], mov: [], bod: [], emp: [], cert: [], stock: [], usuarios: [] };
const ADMIN: Vista[] = ['emp', 'cert', 'rep', 'conf'];
const VISTAS = { inicio: Inicio, lotes: Lotes, mat: Materiales, mov: Movimientos, emp: Empresas, cert: Certificados, rep: Reportes, conf: Configuracion };

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
          <div className="planta opc">Planta Puerto Montt</div>
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
          {dlg?.t === 'ajuste' && <AjusteDlg key={dlg.id + dlg.modo} id={dlg.id} modo={dlg.modo} />}
        </div>

        <div className={'menuU' + (menu ? ' on' : '')}>
          <div className="yo"><b>{user.name}</b><small>{user.email}</small></div>
          {realRole === 'admin' && <button onClick={() => { iam.setVerComoOperario(!verComoOperario); setMenu(false); }}>{verComoOperario ? 'Volver a administración' : 'Ver como operario'}</button>}
          <hr />
          <button onClick={() => { setMenu(false); iam.signOut(); }}>Cerrar sesión</button>
        </div>

        <div className={'aviso' + (avisoOn ? ' on' : '')} role="status">{avisoTxt}</div>
      </div>
    </AppCtx.Provider>
  );
};

const App: React.FC = () => (
  <IAMProvider login={<Ingreso />}>
    <Principal />
  </IAMProvider>
);

export default App;
