import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from './services/api';
import type { Batch } from './types';
import {
  useApp, Ctx, Titulo, Pestanas, Etapa, num, cant, toneladas, fecha, siguiente, textoAvanzar, enProceso, sinCert, NOMBRE_ETAPA,
  bodegas, nombreBod, stockEn, bajoMinimo, kgEnPlanta, esGeneradora, esCliente, claseMov, NOMBRE_MOV, signoMov, detalleMov, ClaseMov, certDe, loteAnulado, anulado, vigente
} from './ui';

/** Avanza un lote una etapa. shortcut: solo cambia la etapa; el paso a pellet no descuenta materia prima (falta definir rendimiento con el grupo). */
export async function avanzar(c: Ctx, l: Batch) {
  const s = siguiente(l); if (!s) return;
  try { await apiService.updateBatchStatus(l.id, s); await c.recargar(); c.aviso(`${l.batch_number} ${s === 'dispatched' ? 'despachado' : 'pasó a ' + NOMBRE_ETAPA[s]}`); }
  catch (e) { c.aviso('No se pudo avanzar: ' + (e as Error).message); }
}

const BotonAvanzar: React.FC<{ l: Batch }> = ({ l }) => {
  const c = useApp(), s = siguiente(l);
  return s ? <button className="btn chico" onClick={e => { e.stopPropagation(); avanzar(c, l); }}>{textoAvanzar(s)}</button> : null;
};

const TablaLotes: React.FC<{ lista: Batch[]; completa?: boolean }> = ({ lista, completa }) => {
  const { setPanel } = useApp();
  return (
    <table><thead><tr><th>Lote</th><th>Material</th><th className="opc">Empresa</th><th>Etapa</th><th className="der">Kilos</th>{completa && <th className="opc">Ingreso</th>}<th className="acc" /></tr></thead>
      <tbody>{lista.length ? lista.map(l => (
        <tr key={l.id} className="clic" onClick={() => setPanel({ t: 'lote', id: l.id })}>
          <td className="sec">{l.batch_number}</td><td>{l.material?.name}</td><td className="opc">{l.supplier?.name || '—'}</td><td><Etapa l={l} /></td>
          <td className="der tn">{num(l.current_weight_kg)}</td>{completa && <td className="opc sec">{fecha(l.reception_date)}</td>}
          <td className="der acc"><BotonAvanzar l={l} /></td>
        </tr>)) : <tr className="vacio"><td colSpan={7}>No hay lotes.</td></tr>}</tbody></table>
  );
};

export const Inicio: React.FC = () => {
  const { D, esAdmin, setDlg, ir } = useApp();
  const proc = D.lotes.filter(enProceso);
  if (!esAdmin) return <><Titulo t="Lotes en proceso"><button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'camion' })}>Registrar camión</button></Titulo><TablaLotes lista={proc} /></>;
  const bajos = D.mat.filter(bajoMinimo), sc = sinCert(D);
  const certKg = D.cert.reduce((a, x) => a + Number(x.total_kg_valorized), 0);
  return <>
    <Titulo t="Inicio" />
    <div className="cifras">
      <div><small>Stock en planta</small><b className="tn">{toneladas(kgEnPlanta(D))}</b><span>t</span></div>
      <div><small>Lotes en proceso</small><b>{proc.length}</b></div>
      <div><small>Kilos certificados</small><b className="tn">{toneladas(certKg)}</b><span>t</span></div>
      <div><small>Certificados emitidos</small><b>{D.cert.length}</b></div>
    </div>
    {(bajos.length > 0 || sc.length > 0) && <><h2>Requiere atención</h2><div className="atencion">
      {bajos.map(m => <div key={m.id}><i className="punto" /><span>Stock bajo el mínimo: {m.name} ({cant(m.current_stock, m.unit)} de {num(m.minimum_stock)})</span><button className="btn chico" onClick={() => ir('mat')}>Ver</button></div>)}
      {sc.length > 0 && <div><i className="punto rojo" /><span>{sc.length} {sc.length === 1 ? 'lote despachado' : 'lotes despachados'} sin certificado</span><button className="btn chico" onClick={() => setDlg({ t: 'flujo', f: 'cert' })}>Emitir</button></div>}
    </div></>}
    <h2>Lotes en proceso</h2><TablaLotes lista={proc} />
  </>;
};

export const Lotes: React.FC = () => {
  const { D, setDlg } = useApp();
  const [f, setF] = useState<'proceso' | 'desp' | 'todos'>('proceso'), [q, setQ] = useState('');
  const np = D.lotes.filter(enProceso).length, t = q.toLowerCase();
  const desp = (l: Batch) => l.status === 'dispatched' && !loteAnulado(l);
  const lista = D.lotes.filter(l => (f === 'todos' || (f === 'proceso' ? enProceso(l) : desp(l))) &&
    (!t || `${l.batch_number} ${l.supplier?.name} ${l.material?.name}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Lotes"><button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'camion' })}>Registrar camión</button></Titulo>
    <Pestanas valor={f} set={setF} ops={[['proceso', 'En proceso', np], ['desp', 'Despachados', D.lotes.filter(desp).length], ['todos', 'Todos']]} />
    <div className="barraTabla"><input className="buscar" placeholder="Buscar lote, empresa o material" value={q} onChange={e => setQ(e.target.value)} /></div>
    <TablaLotes lista={lista} completa />
  </>;
};

export const Materiales: React.FC = () => {
  const { D, esAdmin, setDlg, setPanel } = useApp();
  const [q, setQ] = useState(''), [bajo, setBajo] = useState(false), t = q.toLowerCase(), B = bodegas(D);
  const lista = D.mat.filter(m => (!bajo || bajoMinimo(m)) && (!t || `${m.name} ${m.code} ${m.polymer_type}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Materiales">{esAdmin && <button className="btn" onClick={() => setDlg({ t: 'form', nombre: 'material' })}>Nuevo material</button>}</Titulo>
    <div className="barraTabla"><input className="buscar" placeholder="Buscar material" value={q} onChange={e => setQ(e.target.value)} />
      <label className="chk"><input type="checkbox" checked={bajo} onChange={e => setBajo(e.target.checked)} />Solo bajo el mínimo</label></div>
    <table><thead><tr><th>Material</th>{esAdmin && <th className="opc">Código</th>}<th className="opc">Tipo</th>{B.map(b => <th key={b.id} className="der opc">{nombreBod(b)}</th>)}<th className="der">Total</th><th /></tr></thead>
      <tbody>{lista.length ? lista.map(m => (
        <tr key={m.id} className={esAdmin ? 'clic' : ''} onClick={() => esAdmin && setPanel({ t: 'mat', id: m.id })}>
          <td>{m.name}{bajoMinimo(m) && <div className="estado rojo" style={{ fontSize: 12 }}>Bajo el mínimo</div>}</td>
          {esAdmin && <td className="opc sec">{m.code}</td>}<td className="opc">{m.polymer_type}</td>
          {B.map(b => { const x = stockEn(D, m.id, b.id); return <td key={b.id} className="der tn opc">{x ? num(x) : <span className="sec">—</span>}</td>; })}
          <td className="der tn"><b style={{ fontWeight: 600 }}>{cant(m.current_stock, m.unit)}</b></td>
          <td className="der"><button className="btn chico" onClick={e => { e.stopPropagation(); setDlg({ t: 'flujo', f: 'contar', pre: m.id }); }}>Corregir</button></td>
        </tr>)) : <tr className="vacio"><td colSpan={9}>Ningún material coincide.</td></tr>}</tbody></table>
  </>;
};

export const Movimientos: React.FC = () => {
  const { D, esAdmin, setDlg, setPanel } = useApp();
  const [f, setF] = useState<'todo' | ClaseMov>('todo');
  const lista = D.mov.filter(m => f === 'todo' || claseMov(m) === f);
  return <>
    <Titulo t="Movimientos">
      {esAdmin && <button className="btn" onClick={() => descargar('Movimientos', D)}>Exportar</button>}
      <button className="btn pri" onClick={() => setDlg({ t: 'flujo', f: 'mov' })}>Registrar movimiento</button>
    </Titulo>
    <Pestanas valor={f} set={setF} ops={[['todo', 'Todos'], ['entra', 'Entradas'], ['sale', 'Salidas'], ['mover', 'Traslados'], ['prod', 'Producción'], ['contar', 'Correcciones'], ['anula', 'Anulaciones']]} />
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="der">Cantidad</th><th className="opc">Usuario</th></tr></thead>
      <tbody>{lista.length ? lista.map(m => {
        const s = signoMov(m), an = anulado(D, m), v = vigente(D, m);
        return <tr key={m.id} className={'clic' + (an ? ' anulada' : '')} onClick={() => setPanel({ t: 'mov', id: m.id })}><td className="sec">{fecha(m.created_at)}</td>
          <td>{NOMBRE_MOV[claseMov(m)]}{an ? <div className="estado rojo" style={{ fontSize: 12 }}>Anulado</div> : v !== Number(m.quantity) && <div className="estado ambar" style={{ fontSize: 12 }}>Corregido</div>}</td><td className="det">{detalleMov(m)}</td>
          <td className="der tn" style={s < 0 && !an ? { color: 'var(--rojo)' } : undefined}>{s > 0 ? '+' : s < 0 ? '−' : ''}{cant(an ? m.quantity : v, m.unit)}</td>
          <td className="opc sec">{m.operator_name}</td></tr>;
      }) : <tr className="vacio"><td colSpan={5}>Sin movimientos de este tipo.</td></tr>}</tbody></table>
  </>;
};

export const Empresas: React.FC = () => {
  const { D, setDlg, setPanel } = useApp();
  const [f, setF] = useState<'gen' | 'cli'>('gen'), [q, setQ] = useState(''), t = q.toLowerCase(), gen = f === 'gen';
  const lista = D.emp.filter(e => (gen ? esGeneradora(e) : esCliente(e)) && (!t || `${e.name} ${e.tax_id} ${e.city}`.toLowerCase().includes(t)));
  return <>
    <Titulo t="Empresas"><button className="btn pri" onClick={() => setDlg({ t: 'form', nombre: 'empresa' })}>Nueva empresa</button></Titulo>
    <Pestanas valor={f} set={setF} ops={[['gen', 'Generadoras', D.emp.filter(esGeneradora).length], ['cli', 'Clientes', D.emp.filter(esCliente).length]]} />
    <div className="barraTabla"><input className="buscar" placeholder="Buscar por nombre, RUT o ciudad" value={q} onChange={e => setQ(e.target.value)} /></div>
    <table><thead><tr><th>Nombre</th><th className="opc">RUT</th><th className="opc">Ciudad</th><th className="opc">Correo</th><th className="der">{gen ? 'Kilos entregados' : 'Kilos comprados'}</th></tr></thead>
      <tbody>{lista.length ? lista.map(e => (
        <tr key={e.id} className="clic" onClick={() => setPanel({ t: 'emp', id: e.id })}>
          <td>{e.name}</td><td className="opc tn">{e.tax_id}</td><td className="opc">{e.city}</td><td className="opc sec">{e.contact_email || '—'}</td>
          <td className="der tn">{num(gen ? kilosEntregados(D, e.id) : kilosComprados(D, e.name))}</td>
        </tr>)) : <tr className="vacio"><td colSpan={5}>Ninguna empresa coincide.</td></tr>}</tbody></table>
  </>;
};
export const kilosEntregados = (D: Ctx['D'], id: string) => D.lotes.filter(l => l.supplier_id === id).reduce((a, l) => a + Number(l.initial_weight_kg), 0);
// Las salidas guardan el cliente en la referencia («Despacho a …»).
export const kilosComprados = (D: Ctx['D'], nombre: string) => D.mov.filter(m => m.movement_type === 'dispatch' && m.unit === 'kg' && !anulado(D, m) && (m.reference_doc || '').includes(nombre)).reduce((a, m) => a + vigente(D, m), 0);

export const Certificados: React.FC = () => {
  const { D, setDlg, setPanel } = useApp();
  const sc = sinCert(D);
  return <>
    <Titulo t="Certificados"><button className="btn pri" disabled={!sc.length} onClick={() => setDlg({ t: 'flujo', f: 'cert' })}>Emitir certificado</button></Titulo>
    {sc.length > 0 && <div className="atencion" style={{ marginBottom: 18 }}><div><i className="punto rojo" /><span>{sc.length === 1 ? '1 lote despachado espera' : `${sc.length} lotes despachados esperan`} certificado: {sc.map(l => l.batch_number).join(', ')}</span></div></div>}
    <table><thead><tr><th>N°</th><th>Empresa</th><th className="opc">Lote</th><th className="der">Kilos</th><th className="opc">Fecha</th><th /></tr></thead>
      <tbody>{D.cert.length ? D.cert.map(x => (
        <tr key={x.id} className="clic" onClick={() => setPanel({ t: 'cert', id: x.id })}>
          <td>{x.certificate_code}</td><td>{x.stakeholder?.name}</td><td className="opc sec">{x.batch?.batch_number || '—'}</td>
          <td className="der tn">{num(x.total_kg_valorized)}</td><td className="opc sec">{new Date(x.issue_date + 'T12:00').toLocaleDateString('es-CL')}</td>
          <td className="der"><button className="btn chico">Ver</button></td>
        </tr>)) : <tr className="vacio"><td colSpan={6}>Aún no hay certificados.</td></tr>}</tbody></table>
  </>;
};

/* ---------- reportes en Excel ---------- */
type Reporte = 'Inventario' | 'Movimientos' | 'Lotes' | 'Certificados';
export function descargar(r: Reporte, D: Ctx['D']) {
  const B = bodegas(D);
  const filas: Record<string, unknown>[] =
    r === 'Inventario' ? D.mat.map(m => ({ Código: m.code, Material: m.name, Tipo: m.polymer_type, ...Object.fromEntries(B.map(b => [nombreBod(b), stockEn(D, m.id, b.id)])), Total: Number(m.current_stock), Unidad: m.unit, Mínimo: Number(m.minimum_stock) }))
      : r === 'Movimientos' ? D.mov.map(m => ({ Fecha: new Date(m.created_at).toLocaleString('es-CL'), Tipo: NOMBRE_MOV[claseMov(m)], Material: m.material?.name, Cantidad: signoMov(m) * Number(m.quantity) || Number(m.quantity), Unidad: m.unit, Desde: m.from_warehouse ? nombreBod(m.from_warehouse) : '', Hacia: m.to_warehouse ? nombreBod(m.to_warehouse) : '', Referencia: m.reference_doc || '', Usuario: m.operator_name, Estado: anulado(D, m) ? 'Anulado' : vigente(D, m) !== Number(m.quantity) ? 'Corregido' : '' }))
        : r === 'Lotes' ? D.lotes.map(l => ({ Lote: l.batch_number, Material: l.material?.name, Empresa: l.supplier?.name || '', Origen: l.marine_origin_zone || '', Etapa: NOMBRE_ETAPA[l.status], 'Kilos ingreso': Number(l.initial_weight_kg), 'Kilos actuales': Number(l.current_weight_kg), Ingreso: new Date(l.reception_date).toLocaleDateString('es-CL'), Certificado: certDe(D, l)?.certificate_code || '' }))
          : D.cert.map(x => ({ 'N°': x.certificate_code, Empresa: x.stakeholder?.name, RUT: x.stakeholder?.tax_id, Lote: x.batch?.batch_number || '', Residuo: x.waste_type, Kilos: Number(x.total_kg_valorized), 'CO2eq evitado (kg)': Number(x.co2_avoided_kg), Fecha: x.issue_date }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), r);
  XLSX.writeFile(libro, `Greenspot-${r}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export const Reportes: React.FC = () => {
  const { D, aviso } = useApp();
  const rep: [Reporte, string][] = [['Inventario', 'Kilos por material y bodega'], ['Movimientos', 'Entradas, salidas, traslados y correcciones'], ['Lotes', 'Recorrido y kilos de cada lote'], ['Certificados', 'Para declarar en la Ley REP']];
  return <>
    <Titulo t="Reportes" />
    <table><thead><tr><th>Reporte</th><th className="opc">Contenido</th><th /></tr></thead>
      <tbody>{rep.map(([r, d]) => <tr key={r}><td>{r}</td><td className="opc sec">{d}</td><td className="der"><button className="btn chico" onClick={() => { descargar(r, D); aviso(`Descargado «${r}» en Excel`); }}>Descargar Excel</button></td></tr>)}</tbody></table>
  </>;
};

export const Configuracion: React.FC = () => {
  const { D, setPanel } = useApp();
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return <>
    <Titulo t="Configuración" />
    <h2 style={{ marginTop: 0 }}>Usuarios</h2>
    <table><thead><tr><th>Nombre</th><th>Rol</th><th className="opc">Correo</th><th className="opc">Estado</th><th /></tr></thead>
      <tbody>{D.usuarios.map(u => (
        <tr key={u.id} className="clic" onClick={() => setPanel({ t: 'usuario', id: u.id })}>
          <td>{u.full_name}</td><td>{u.role === 'admin' ? 'Administración' : 'Operario'}</td><td className="opc sec">{u.email}</td>
          <td className="opc"><span className={'estado ' + (u.is_active ? 'verde' : '')}>{u.is_active ? 'Activa' : 'Desactivada'}</span></td>
          <td className="der"><button className="btn chico">Editar</button></td>
        </tr>))}</tbody></table>
    <p className="nota">Las cuentas nuevas se crean en Supabase › Authentication › Add user. Entran como operario; aquí se les cambia el rol.</p>
    <h2>Base de datos</h2>
    <table><tbody>
      <tr><td style={{ width: 180 }} className="sec">Estado</td><td><span className="estado verde">Conectada</span></td></tr>
      <tr><td className="sec">Servidor</td><td className="tn">{url?.replace('https://', '')}</td></tr>
      <tr><td className="sec">Registros</td><td>{D.mat.length} materiales · {D.lotes.length} lotes · {D.mov.length} movimientos · {D.emp.length} empresas</td></tr>
    </tbody></table>
  </>;
};
