import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Ctx, useApp } from '../logica/contexto';
import { NOMBRE_ETAPA, certDe, nombreBod, bodegas, stockEn, claseMov, NOMBRE_MOV, signoMov, anulado, vigente, ajusteDe, loteAnulado, mismoSentido, ClaseMov } from '../logica/reglas';
import { num, toneladas } from '../logica/formato';
import { Titulo, Pestanas } from '../componentes/Comunes';
import { NOMBRE_CAT, NOMBRE_TIPO_EMP, leerPlanilla, guardarCarga, Carga } from '../logica/planilla';

type D = Ctx['D'];

/* ---------- períodos: hoy, semana (desde el lunes), este mes o un mes cerrado («AAAA-MM») ---------- */
export type Periodo = 'dia' | 'semana' | 'mes' | `${number}-${number}`;
const esMes = (p: Periodo) => /^\d{4}-\d{2}$/.test(p);
const nombrePeriodo = (p: Periodo) => esMes(p) ? new Date(p + '-01T12:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  : ({ dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes' } as Record<string, string>)[p];
/** [desde, hasta): el fin es el inicio del día siguiente o del mes siguiente. */
export function rangoDe(p: Periodo, ahora = new Date()): [Date, Date] {
  if (esMes(p)) { const [a, m] = p.split('-').map(Number); return [new Date(a, m - 1, 1), new Date(a, m, 1)]; }
  const d = new Date(ahora); d.setHours(0, 0, 0, 0);
  if (p === 'semana') d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  if (p === 'mes') d.setDate(1);
  const fin = new Date(ahora); fin.setHours(24, 0, 0, 0);
  return [d, fin];
}
const mesesCerrados = (ahora = new Date()) => Array.from({ length: 12 }, (_, i) => new Date(ahora.getFullYear(), ahora.getMonth() - 1 - i, 1).toLocaleDateString('sv-SE').slice(0, 7) as Periodo);
// Las fechas sin hora («2026-11-10») se leen en hora local; si no, en Chile caen el día anterior.
const enPeriodo = (iso: string | undefined, [ini, fin]: [Date, Date]) => { if (!iso) return false; const d = new Date(iso.length === 10 ? iso + 'T00:00' : iso); return d >= ini && d < fin; };

export function resumen(D: D, r: [Date, Date]) {
  const mov = D.mov.filter(m => enPeriodo(m.created_at, r));
  const lotes = D.lotes.filter(l => enPeriodo(l.reception_date, r));
  const cert = D.cert.filter(c => enPeriodo(c.issue_date, r));
  // Cada asiento cuenta en la fecha en que se hizo: una anulación o corrección posterior cae en su propio
  // período (restando o sumando a la clase del original) y no reescribe un mes ya cerrado.
  const porNum = new Map(D.mov.map(m => [m.movement_number, m]));
  const asientos = mov.filter(m => m.unit === 'kg').flatMap(m => {
    const a = ajusteDe(m); if (!a) return [{ o: m, kg: Number(m.quantity), lote: 1 }];
    const o = porNum.get(a.num); if (!o) return [];
    return [{ o, kg: (mismoSentido(m, o) ? 1 : -1) * Number(m.quantity), lote: a.tipo === 'Anula' ? -1 : 0 }];
  });
  const de = (mat?: string) => asientos.filter(x => !mat || x.o.material_id === mat);
  const kg = (c: ClaseMov, mat?: string) => de(mat).filter(x => claseMov(x.o) === c).reduce((a, x) => a + x.kg, 0);
  const nLotes = (mat?: string) => de(mat).filter(x => x.o.movement_type === 'reception' && x.o.batch_id).reduce((a, x) => a + x.lote, 0);
  const porMaterial = D.mat.map(m => ({
    Material: m.name,
    'Recibido (kg)': kg('entra', m.id),
    'Despachado (kg)': kg('sale', m.id),
    Lotes: nLotes(m.id),
  })).filter(r => r['Recibido (kg)'] || r['Despachado (kg)'] || r.Lotes);
  return {
    mov, lotes, cert, porMaterial,
    recibido: kg('entra'), despachado: kg('sale'), nLotes: nLotes(),
    certKg: cert.reduce((a, c) => a + Number(c.total_kg_valorized), 0),
  };
}

/* ---------- hojas de Excel ---------- */
type Reporte = 'Inventario' | 'Movimientos' | 'Lotes' | 'Certificados';
function filas(r: Reporte, D: D, mov = D.mov, lotes = D.lotes, cert = D.cert): Record<string, unknown>[] {
  const B = bodegas(D);
  return r === 'Inventario' ? D.mat.map(m => ({ Código: m.code, Material: m.name, Tipo: m.polymer_type === 'OTHER' ? 'Otro' : m.polymer_type, Categoría: NOMBRE_CAT[m.category], ...Object.fromEntries(B.map(b => [nombreBod(b), stockEn(D, m.id, b.id)])), Total: Number(m.current_stock), Unidad: m.unit, Mínimo: Number(m.minimum_stock) }))
    : r === 'Movimientos' ? mov.map(m => ({ Fecha: new Date(m.created_at).toLocaleString('es-CL'), Tipo: NOMBRE_MOV[claseMov(m)], Material: m.material?.name, Cantidad: signoMov(m) * Number(m.quantity) || Number(m.quantity), Unidad: m.unit, Desde: m.from_warehouse ? nombreBod(m.from_warehouse) : '', Hacia: m.to_warehouse ? nombreBod(m.to_warehouse) : '', Referencia: m.reference_doc || '', Usuario: m.operator_name, Estado: anulado(D, m) ? 'Anulado' : vigente(D, m) !== Number(m.quantity) ? 'Corregido' : '' }))
      : r === 'Lotes' ? lotes.map(l => ({ Lote: l.batch_number, Material: l.material?.name, Empresa: l.supplier?.name || '', Origen: l.marine_origin_zone || '', Etapa: loteAnulado(l) ? 'Anulado' : NOMBRE_ETAPA[l.status], 'Kilos ingreso': Number(l.initial_weight_kg), 'Kilos actuales': Number(l.current_weight_kg), Ingreso: new Date(l.reception_date).toLocaleDateString('es-CL'), Certificado: certDe(D, l)?.certificate_code || '' }))
        : cert.map(x => ({ 'N°': x.certificate_code, Empresa: x.stakeholder?.name, RUT: x.stakeholder?.tax_id, Lote: x.batch?.batch_number || '', Residuo: x.waste_type, Kilos: Number(x.total_kg_valorized), 'CO2eq evitado (kg)': Number(x.co2_avoided_kg), Fecha: x.issue_date }));
}
const hoyISO = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
const hoja = (libro: XLSX.WorkBook, nombre: string, f: Record<string, unknown>[]) =>
  XLSX.utils.book_append_sheet(libro, f.length ? XLSX.utils.json_to_sheet(f) : XLSX.utils.aoa_to_sheet([['Sin registros en el período']]), nombre);

export function descargar(r: Reporte, D: D) {
  const libro = XLSX.utils.book_new();
  hoja(libro, r, filas(r, D));
  XLSX.writeFile(libro, `Greenspot-${r}-${hoyISO()}.xlsx`);
}

/** Un solo libro con el resumen del período y el detalle en pestañas, para usarlo como planilla. */
export function descargarPlanilla(p: Periodo, D: D) {
  const r = rangoDe(p), R = resumen(D, r), libro = XLSX.utils.book_new(), hasta = new Date(r[1].getTime() - 1);
  hoja(libro, 'Resumen', [
    { Dato: 'Período', Valor: `${nombrePeriodo(p)} (del ${r[0].toLocaleDateString('es-CL')} al ${hasta.toLocaleDateString('es-CL')})` },
    { Dato: 'Nota', Valor: 'Anulaciones y correcciones cuentan en la fecha en que se hicieron; un mes cerrado no cambia después.' },
    { Dato: 'Kilos recibidos', Valor: R.recibido },
    { Dato: 'Kilos despachados', Valor: R.despachado },
    { Dato: 'Lotes ingresados', Valor: R.nLotes },
    { Dato: 'Certificados emitidos', Valor: R.cert.length },
    { Dato: 'Kilos certificados', Valor: R.certKg },
  ]);
  hoja(libro, 'Por material', R.porMaterial);
  hoja(libro, 'Movimientos', filas('Movimientos', D, R.mov));
  hoja(libro, 'Lotes', filas('Lotes', D, D.mov, R.lotes));
  hoja(libro, 'Certificados', filas('Certificados', D, D.mov, D.lotes, R.cert));
  if (!esMes(p)) hoja(libro, 'Inventario', filas('Inventario', D)); // el inventario es el de hoy: no va en un mes cerrado
  hoja(libro, 'Empresas', D.emp.map(e => ({ Nombre: e.name, RUT: e.tax_id, Tipo: NOMBRE_TIPO_EMP[e.type], Ciudad: e.city || '', Correo: e.contact_email || '', Teléfono: e.contact_phone || '' })));
  XLSX.writeFile(libro, `Greenspot-Planilla-${esMes(p) ? p : nombrePeriodo(p).replace(' ', '-') + '-' + hoyISO()}.xlsx`);
}

export const Reportes: React.FC = () => {
  const { D, aviso, usuario, uid, recargar } = useApp();
  const [p, setP] = useState<Periodo>('dia');
  const [carga, setCarga] = useState<Carga | null>(null), [guardando, setGuardando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  async function subir(f?: File) {
    if (!f) return;
    try { setCarga(leerPlanilla(XLSX.read(await f.arrayBuffer(), { cellDates: true }), D)); }
    catch { aviso('No se pudo leer el archivo. Sube un Excel (.xlsx) descargado desde aquí.'); }
    if (archivo.current) archivo.current.value = '';
  }
  async function guardar() {
    if (!carga) return;
    setGuardando(true);
    const total = carga.materiales.length + carga.empresas.length + carga.lotes.length;
    try { await guardarCarga(carga, D, usuario, uid); aviso(`Cargados ${total} registros desde Excel`); setCarga(null); }
    catch (e) { aviso(`Se detuvo la carga: ${(e as Error).message}. Revisa qué alcanzó a entrar antes de subirla de nuevo.`); setCarga(null); }
    finally { await recargar(); setGuardando(false); }
  }
  const nuevos = carga ? carga.materiales.length + carga.empresas.length + carga.lotes.length : 0;
  const R = resumen(D, rangoDe(p));
  const rep: [Reporte, string][] = [['Inventario', 'Kilos por material y bodega'], ['Movimientos', 'Entradas, salidas, traslados y correcciones'], ['Lotes', 'Recorrido y kilos de cada lote'], ['Certificados', 'Para declarar en la Ley REP']];
  return <>
    <Titulo t="Reportes">
      <input ref={archivo} type="file" accept=".xlsx,.xls" hidden onChange={e => subir(e.target.files?.[0])} />
      <button className="btn" onClick={() => archivo.current?.click()}>Subir planilla</button>
      <button className="btn pri" onClick={() => { descargarPlanilla(p, D); aviso(`Descargada la planilla de «${nombrePeriodo(p)}» en Excel`); }}>Descargar planilla</button>
    </Titulo>
    {carga && <>
      <h2>Carga desde Excel</h2>
      <table><thead><tr><th>Se agregarán</th><th className="der">Filas</th></tr></thead>
        <tbody>
          <tr><td>Empresas nuevas</td><td className="der">{carga.empresas.length}</td></tr>
          <tr><td>Materiales nuevos <span className="sec">(sin stock: entra con movimientos)</span></td><td className="der">{carga.materiales.length}</td></tr>
          <tr><td>Recepciones de camión <span className="sec">(lote nuevo en Patio)</span></td><td className="der">{carga.lotes.length}</td></tr>
          <tr><td className="sec">Filas que ya existen: no se modifican</td><td className="der sec">{carga.ignoradas}</td></tr>
        </tbody></table>
      {carga.errores.length > 0 && <p className="nota">No se cargan estas filas ({carga.errores.length}):<br />{carga.errores.slice(0, 15).map(t => <React.Fragment key={t}>· {t}<br /></React.Fragment>)}{carga.errores.length > 15 && `… y ${carga.errores.length - 15} más`}</p>}
      <p style={{ display: 'flex', gap: 8, margin: '12px 0 24px' }}>
        <button className="btn pri" disabled={!nuevos || guardando} onClick={guardar}>{guardando ? 'Guardando…' : `Guardar ${nuevos} registros`}</button>
        <button className="btn" disabled={guardando} onClick={() => setCarga(null)}>Cancelar</button>
      </p>
    </>}
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Pestanas valor={p} set={setP} ops={[['dia', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes']]} />
      <select aria-label="Mes cerrado" value={esMes(p) ? p : ''} onChange={e => e.target.value && setP(e.target.value as Periodo)}>
        <option value="">Mes cerrado…</option>
        {mesesCerrados().map(m => <option key={m} value={m}>{nombrePeriodo(m)}</option>)}
      </select>
    </div>
    <div className="cifras">
      <div><small>Recibido</small><b className="tn">{toneladas(R.recibido)}</b><span>t</span></div>
      <div><small>Despachado</small><b className="tn">{toneladas(R.despachado)}</b><span>t</span></div>
      <div><small>Lotes ingresados</small><b>{R.nLotes}</b></div>
      <div><small>Kilos certificados</small><b className="tn">{toneladas(R.certKg)}</b><span>t</span></div>
    </div>
    <h2>Por material</h2>
    {R.porMaterial.length === 0 ? <p className="nota">Sin movimientos en el período.</p>
      : <table><thead><tr><th>Material</th><th className="der">Recibido (kg)</th><th className="der">Despachado (kg)</th><th className="der">Lotes</th></tr></thead>
        <tbody>{R.porMaterial.map(r => <tr key={r.Material}><td>{r.Material}</td><td className="der tn">{num(r['Recibido (kg)'])}</td><td className="der tn">{num(r['Despachado (kg)'])}</td><td className="der">{r.Lotes}</td></tr>)}</tbody></table>}
    <h2>Reportes sueltos</h2>
    <table><thead><tr><th>Reporte</th><th className="opc">Contenido</th><th /></tr></thead>
      <tbody>{rep.map(([r, d]) => <tr key={r}><td>{r}</td><td className="opc sec">{d}</td><td className="der"><button className="btn chico" onClick={() => { descargar(r, D); aviso(`Descargado «${r}» en Excel`); }}>Descargar Excel</button></td></tr>)}</tbody></table>
  </>;
};
