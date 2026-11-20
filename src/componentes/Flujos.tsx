import React, { useState } from 'react';
import { apiService, yaGuardado } from '../datos/api';
import type { Batch, InventoryMovement } from '../datos/tipos';
import { Flujo, Ctx, useApp } from '../logica/contexto';
import { num, cant } from '../logica/formato';
import { sinCert, nombreBod, bodegas, stockEn, esGeneradora, esCliente, TOPE_CAMION } from '../logica/reglas';

type Op = { v: string; b: string; s?: string; d?: string; off?: boolean };
type Tipo = 'op' | 'peso' | 'kilos' | 'conteo' | 'obtenido' | 'multi';
interface Paso { t: string; tipo: Tipo; k?: keyof W; op?: (w: W) => Op[] }
interface W { f: Flujo; paso: number; mat?: string; emp?: string; cli?: string; desde?: string; hacia?: string; bod?: string; prod?: string; bruto: string; tara: string; kilos: string; obt: string; sel: Record<string, boolean> }

const NOMBRE: Record<Flujo, string> = { mov: 'Registrar movimiento', camion: 'Registrar camión', salida: 'Salida de material', mover: 'Traslado entre bodegas', contar: 'Corrección de conteo', prod: 'Registrar producción', cert: 'Emitir certificado' };
// Texto del campo («1.500,5» o «1500,5») a número: la coma es el decimal.
const kg = (s: string | undefined) => Number((s || '').replace(/\./g, '').replace(',', '.')) || 0;

function pasos(c: Ctx, f: Flujo): Paso[] {
  const { D } = c, B = bodegas(D), mat = (id?: string) => D.mat.find(m => m.id === id)!;
  const conStock = (): Op[] => D.mat.map(m => ({ v: m.id, b: m.name, s: cant(m.current_stock, m.unit), off: Number(m.current_stock) <= 0 }));
  const bods = (w: W, filtro: (id: string) => boolean = () => true): Op[] => B.map(b => ({ v: b.id, b: nombreBod(b), s: cant(stockEn(D, w.mat!, b.id), mat(w.mat).unit), off: !filtro(b.id) }));
  switch (f) {
    case 'mov': return [{ t: '¿Qué pasó?', tipo: 'op', k: 'f', op: () => [
      { v: 'camion', b: 'Entró material', d: 'Llegó un camión' }, { v: 'salida', b: 'Salió material', d: 'Despacho a un cliente' },
      { v: 'mover', b: 'Traslado', d: 'De una bodega a otra' }, { v: 'prod', b: 'Producción', d: 'Se procesó material y salió producto' }, ...(c.esAdmin ? [{ v: 'contar' as const, b: 'Corrección de conteo', d: 'Los kilos contados no coinciden' }] : [])] }]; // 005: el conteo lo corrige administración
    case 'camion': return [
      { t: 'Material', tipo: 'op', k: 'mat', op: () => D.mat.filter(m => m.category === 'raw_material' && m.unit === 'kg').map(m => ({ v: m.id, b: m.name, s: m.polymer_type })) },
      { t: 'Empresa generadora', tipo: 'op', k: 'emp', op: () => D.emp.filter(esGeneradora).map(e => ({ v: e.id, b: e.name, s: e.city })) },
      { t: 'Pesaje en romana', tipo: 'peso' }];
    case 'salida': return [
      { t: 'Material', tipo: 'op', k: 'mat', op: conStock },
      { t: 'Desde', tipo: 'op', k: 'desde', op: w => bods(w, id => stockEn(D, w.mat!, id) > 0) },
      { t: 'Cliente', tipo: 'op', k: 'cli', op: () => D.emp.filter(esCliente).map(e => ({ v: e.id, b: e.name, s: e.city })) },
      { t: 'Kilos', tipo: 'kilos' }];
    case 'mover': return [
      { t: 'Material', tipo: 'op', k: 'mat', op: conStock },
      { t: 'Desde', tipo: 'op', k: 'desde', op: w => bods(w, id => stockEn(D, w.mat!, id) > 0) },
      { t: 'Hacia', tipo: 'op', k: 'hacia', op: w => bods(w, id => id !== w.desde) },
      { t: 'Kilos', tipo: 'kilos' }];
    case 'contar': return [
      { t: 'Material', tipo: 'op', k: 'mat', op: () => D.mat.map(m => ({ v: m.id, b: m.name, s: cant(m.current_stock, m.unit) })) },
      { t: 'Bodega', tipo: 'op', k: 'bod', op: w => bods(w).map(o => ({ ...o, s: 'Registrado: ' + o.s })) },
      { t: 'Cantidad contada', tipo: 'conteo' }];
    case 'prod': return [
      { t: 'Material que entra a proceso', tipo: 'op', k: 'mat', op: () => conStock().filter(o => ['raw_material', 'in_process'].includes(mat(o.v).category) && mat(o.v).unit === 'kg') },
      { t: 'Desde', tipo: 'op', k: 'desde', op: w => bods(w, id => stockEn(D, w.mat!, id) > 0) },
      { t: 'Kilos que entran', tipo: 'kilos' },
      { t: 'Producto obtenido', tipo: 'op', k: 'prod', op: w => D.mat.filter(x => ['in_process', 'pellet', 'finished_product'].includes(x.category) && x.unit === 'kg' && x.id !== w.mat).map(x => ({ v: x.id, b: x.name, s: cant(x.current_stock, x.unit) })) },
      { t: 'Bodega del producto', tipo: 'op', k: 'hacia', op: w => B.map(b => ({ v: b.id, b: nombreBod(b), s: cant(stockEn(D, w.prod!, b.id), 'kg') })) },
      { t: 'Kilos obtenidos', tipo: 'obtenido' }];
    case 'cert': return [
      { t: 'Empresa', tipo: 'op', k: 'emp', op: () => {
        const n: Record<string, number> = {}; sinCert(D).forEach(l => { n[l.supplier_id!] = (n[l.supplier_id!] || 0) + 1; });
        return Object.keys(n).map(id => ({ v: id, b: D.emp.find(e => e.id === id)?.name || '—', s: n[id] + (n[id] === 1 ? ' lote pendiente' : ' lotes pendientes') }));
      } },
      { t: 'Lotes a incluir', tipo: 'multi' }];
  }
}

export const FlujoDlg: React.FC<{ f: Flujo; pre?: string }> = ({ f, pre }) => {
  const c = useApp(), { D } = c;
  // Un número por asistente abierto: si se reintenta tras un corte de red, la base reconoce el registro y no lo duplica.
  const [clave] = useState(() => Date.now());
  const [w, setW] = useState<W>({ f, paso: pre ? 1 : 0, mat: pre, bruto: '', tara: '', kilos: '', obt: '', sel: {} });
  const [guardando, setGuardando] = useState(false), [error, setError] = useState('');
  const P = pasos(c, w.f), p = P[w.paso], ult = w.paso === P.length - 1;
  const m = D.mat.find(x => x.id === w.mat), u = m?.unit || 'kg';
  const lotesCert = () => sinCert(D).filter(l => l.supplier_id === w.emp);
  const disponible = () => (w.desde && w.mat ? stockEn(D, w.mat, w.desde) : 0);

  // Estado del paso actual: si se puede seguir y qué mostrar abajo.
  const est = (() => {
    if (p.tipo === 'op') return { ok: !!(p.k && w[p.k]) };
    if (p.tipo === 'peso') { const n = (kg(w.bruto) || 0) - (kg(w.tara) || 0); return { ok: n > 0 && n <= TOPE_CAMION, n, mal: w.bruto && w.tara && n <= 0 ? 'La tara no puede ser mayor que el peso con carga' : n > TOPE_CAMION ? `Revisa el peso: un camión no supera los ${num(TOPE_CAMION)} kg netos` : '' }; }
    if (p.tipo === 'kilos') { const k = kg(w.kilos) || 0, mx = disponible(); return { ok: k > 0 && k <= mx, n: k, mx, mal: k > mx ? `Solo hay ${cant(mx, u)} disponibles` : '' }; }
    if (p.tipo === 'obtenido') { const k = kg(w.kilos) || 0, o = kg(w.obt) || 0; return { ok: o > 0 && o <= k, n: o, mx: k, mal: o > k ? `No puede salir más de lo que entró (${cant(k, u)})` : '' }; }
    if (p.tipo === 'conteo') { const sis = stockEn(D, w.mat!, w.bod!), n = w.kilos === '' ? null : kg(w.kilos); return { ok: n !== null && n !== sis, n, sis }; }
    const s = lotesCert().filter(l => w.sel[l.id]); return { ok: s.length > 0, lotes: s, n: s.reduce((a, l) => a + Number(l.current_weight_kg), 0) };
  })();

  const cerrar = () => c.setDlg(null);
  const elegir = (k: keyof W, v: string) => {
    if (k === 'f') { setW({ f: v as Flujo, paso: 0, bruto: '', tara: '', kilos: '', obt: '', sel: {} }); return; }
    const nw = { ...w, [k]: v, paso: w.paso + 1 };
    if (k === 'desde') delete nw.hacia;
    if (k === 'emp' && w.f === 'cert') nw.sel = Object.fromEntries(sinCert(D).filter(l => l.supplier_id === v).map(l => [l.id, true]));
    setW(nw);
  };
  const atras = () => (w.paso && !(pre && w.paso === 1) ? setW({ ...w, paso: w.paso - 1 }) : cerrar());
  const siguiente = () => { if (!est.ok || guardando) return; if (!ult) setW({ ...w, paso: w.paso + 1 }); else guardar(); };
  // Chile: la coma es decimal y el punto es de miles (se ignora). Máx. 7 enteros y 2 decimales.
  const numero = (k: 'bruto' | 'tara' | 'kilos' | 'obt') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const [ent, ...dec] = e.target.value.split(',');
    setW({ ...w, [k]: ent.replace(/\D/g, '').slice(0, 7) + (dec.length ? ',' + dec.join('').replace(/\D/g, '').slice(0, 2) : '') });
  };

  async function guardar() {
    setGuardando(true); setError('');
    const base = { movement_number: `MOV-${clave}`, material_id: w.mat!, batch_id: null, from_warehouse_id: null, to_warehouse_id: null, unit: u, operator_name: c.usuario, created_at: new Date().toISOString() };
    const mov = (x: Partial<InventoryMovement>) => apiService.recordMovement({ ...base, ...x } as Omit<InventoryMovement, 'id'>);
    try {
      let msg = '';
      if (w.f === 'camion') {
        const n = kg(w.bruto) - kg(w.tara), anio = new Date().getFullYear();
        const sig = Math.max(0, ...D.lotes.map(l => +(l.batch_number.match(new RegExp(`^LOTE-${anio}-(\\d+)$`))?.[1] || 0))) + 1;
        const acopio = D.bod.find(b => b.code === 'BOD-PM-ACOPIO') || bodegas(D)[0];
        const l = await apiService.createBatch({
          batch_number: `LOTE-${anio}-${String(sig).padStart(4, '0')}`, material_id: w.mat, supplier_id: w.emp, warehouse_id: acopio.id,
          initial_weight_kg: n, current_weight_kg: n, impurity_percentage: 0, reception_date: new Date().toISOString(), status: 'received',
          notes: `Romana: ${num(kg(w.bruto))} kg con carga, ${num(kg(w.tara))} kg tara`
        } as Partial<Batch>, c.usuario, c.uid);
        msg = `Lote ${l.batch_number} registrado: ${num(n)} kg`;
      } else if (w.f === 'salida') {
        const cli = D.emp.find(e => e.id === w.cli)!;
        await mov({ movement_type: 'dispatch', from_warehouse_id: w.desde, quantity: kg(w.kilos), reference_doc: `Despacho a ${cli.name}` });
        msg = `Salida registrada. Quedan ${cant(Number(m!.current_stock) - kg(w.kilos), u)}`;
      } else if (w.f === 'mover') {
        await mov({ movement_type: 'internal_transfer', from_warehouse_id: w.desde, to_warehouse_id: w.hacia, quantity: kg(w.kilos), reference_doc: 'Traslado entre bodegas' });
        msg = 'Traslado registrado';
      } else if (w.f === 'prod') {
        // Consumo y producto en una sola llamada: si falla uno, no se guarda ninguno. La merma es la diferencia.
        const t = clave, ref = `Producción PRD-${t}`, merma = kg(w.kilos) - kg(w.obt);
        await apiService.recordMovements([
          { ...base, movement_number: `PRC-${t}`, movement_type: 'production_intake', from_warehouse_id: w.desde!, quantity: kg(w.kilos), reference_doc: ref, notes: `Merma ${num(merma)} kg` },
          { ...base, movement_number: `PRD-${t}`, material_id: w.prod!, movement_type: 'production_output', to_warehouse_id: w.hacia!, quantity: kg(w.obt), reference_doc: ref, notes: `Merma ${num(merma)} kg` }
        ] as Omit<InventoryMovement, 'id'>[]);
        msg = `Producción registrada: ${num(kg(w.obt))} kg obtenidos, merma ${num(merma)} kg`;
      } else if (w.f === 'contar') {
        const d = kg(w.kilos) - stockEn(D, w.mat!, w.bod!);
        await mov(d > 0 ? { movement_type: 'count_adjustment_in', to_warehouse_id: w.bod, quantity: d, reference_doc: 'Corrección de conteo' }
          : { movement_type: 'waste_adjustment', from_warehouse_id: w.bod, quantity: -d, reference_doc: 'Corrección de conteo' });
        msg = `Conteo corregido (${d > 0 ? '+' : '−'}${cant(Math.abs(d), u)})`;
      } else if (w.f === 'cert') {
        const anio = new Date().getFullYear();
        let sig = Math.max(0, ...D.cert.map(x => +(x.certificate_code.match(new RegExp(`^CERT-REP-${anio}-(\\d+)$`))?.[1] || 0)));
        let ultimo = '';
        // La base guarda un certificado por lote: si se eligen varios, se emite uno por cada uno.
        for (const l of (est as { lotes: Batch[] }).lotes) {
          const kg = Number(l.current_weight_kg), mt = D.mat.find(x => x.id === l.material_id), cod = `CERT-REP-${anio}-${String(++sig).padStart(4, '0')}`;
          const nuevo = await apiService.createCertificate({
            certificate_code: cod, stakeholder_id: l.supplier_id!, batch_id: l.id, issue_date: new Date().toISOString().slice(0, 10),
            waste_type: mt?.name || 'Plástico', total_kg_valorized: kg, co2_avoided_kg: Math.round(kg * Number(mt?.co2_factor_kg || 0)),
            water_saved_liters: 0, oil_saved_barrels: 0, /* sin fuente: no se calculan */ final_destination_product: 'Reciclaje mecánico (pellet)',
            signer_name: c.usuario, signer_title: 'Administración Greenspot', qr_verification_code: `GREENSPOT-${cod}`
          });
          ultimo = nuevo.id;
        }
        await c.recargar(); cerrar(); c.ir('cert'); c.setPanel({ t: 'cert', id: ultimo }); c.aviso('Certificado emitido'); return;
      }
      await c.recargar(); cerrar(); c.aviso(msg);
    } catch (e) {
      if (yaGuardado(e, 'movement_number')) { await c.recargar(); cerrar(); c.aviso('Ya estaba guardado: el intento anterior alcanzó a llegar.'); return; }
      setError((e as Error).message);
    } finally { setGuardando(false); }
  }

  const nombre = (id?: string, lista: { id: string; name: string }[] = D.emp) => lista.find(x => x.id === id)?.name;
  const elegidos = [
    m && ['Material', m.name], w.emp && ['Empresa', nombre(w.emp)], w.cli && ['Cliente', nombre(w.cli)],
    w.desde && ['Desde', nombreBod(D.bod.find(b => b.id === w.desde))], w.hacia && ['Hacia', nombreBod(D.bod.find(b => b.id === w.hacia))],
    w.bod && ['Bodega', nombreBod(D.bod.find(b => b.id === w.bod))], w.prod && ['Producto', nombre(w.prod, D.mat)],
    p.tipo === 'obtenido' && ['Entran', cant(kg(w.kilos), u)]
  ].filter(Boolean) as [string, string][];

  const e = est as { ok: boolean; n?: number | null; mx?: number; sis?: number; mal?: string };
  return (
    <div className="dlg" onKeyDown={ev => ev.key === 'Enter' && p.tipo !== 'op' && siguiente()}>
      <div className="dc"><small>{NOMBRE[w.f]}{P.length > 1 ? ` · Paso ${w.paso + 1} de ${P.length}` : ''}</small><h3>{p.t}</h3></div>
      <div className="db">
        {p.tipo !== 'op' && elegidos.length > 0 && <div className="elegido">{elegidos.map(([a, b], i) => <div key={i}>{a}: <b>{b}</b></div>)}</div>}
        {p.tipo === 'op' && <div className="opciones">{p.op!(w).map(o => (
          <button key={o.v} className={'opcion' + (p.k && w[p.k] === o.v ? ' on' : '')} disabled={o.off} onClick={() => elegir(p.k!, o.v)}>
            <span>{o.b}{o.d && <span className="desc">{o.d}</span>}</span>{o.s && <small>{o.s}</small>}
          </button>))}
          {!p.op!(w).length && <div className="opcion" style={{ color: 'var(--texto3)' }}>No hay opciones disponibles.</div>}
        </div>}
        {p.tipo === 'peso' && <div className="fila2">
          <div className="campo"><label htmlFor="bruto">Peso con carga (kg)</label><input id="bruto" inputMode="decimal" autoFocus value={w.bruto} onChange={numero('bruto')} /></div>
          <div className="campo"><label htmlFor="tara">Camión vacío / tara (kg)</label><input id="tara" inputMode="decimal" value={w.tara} onChange={numero('tara')} /></div>
        </div>}
        {p.tipo === 'kilos' && <div className={'campo' + (e.mal ? ' mal' : '')}><label htmlFor="kilos">Cantidad ({u === 'units' ? 'unidades' : u})</label>
          <input id="kilos" inputMode="decimal" autoFocus value={w.kilos} onChange={numero('kilos')} /><div className="ayuda">Disponible: {cant(e.mx || 0, u)}</div></div>}
        {p.tipo === 'obtenido' && <div className={'campo' + (e.mal ? ' mal' : '')}><label htmlFor="obt">Kilos de producto</label><input id="obt" inputMode="decimal" autoFocus value={w.obt} onChange={numero('obt')} /></div>}
        {p.tipo === 'conteo' && <div className="campo"><label htmlFor="kilos">Cantidad contada ({u === 'units' ? 'unidades' : u})</label><input id="kilos" inputMode="decimal" autoFocus value={w.kilos} onChange={numero('kilos')} /></div>}
        {p.tipo === 'multi' && <><div className="opciones">{lotesCert().map(l => (
          <label key={l.id} className="opcion"><span><input type="checkbox" checked={!!w.sel[l.id]} onChange={ev => setW({ ...w, sel: { ...w.sel, [l.id]: ev.target.checked } })} /> {l.batch_number} · {l.material?.name}</span><small className="tn">{num(l.current_weight_kg)} kg</small></label>
        ))}</div><div style={{ height: 12 }} /></>}

        {p.tipo === 'peso' && <div className={'resultado' + (e.mal ? ' mal' : '')}><span>{e.mal || 'Neto'}</span><b className="tn">{num(Math.max(0, e.n || 0))} kg</b></div>}
        {p.tipo === 'kilos' && <div className={'resultado' + (e.mal ? ' mal' : '')}><span>{e.mal || 'Quedarán en esa bodega'}</span><b className="tn">{cant(Math.max(0, (e.mx || 0) - (e.n || 0)), u)}</b></div>}
        {p.tipo === 'conteo' && (e.n === null || e.n === undefined
          ? <div className="resultado"><span>Registrado en el sistema</span><b className="tn">{cant(e.sis || 0, u)}</b></div>
          : <div className={'resultado' + (e.n - (e.sis || 0) < 0 ? ' mal' : '')}><span>{e.n === e.sis ? 'Coincide con lo registrado' : 'Diferencia'}</span><b className="tn">{e.n - (e.sis || 0) > 0 ? '+' : ''}{cant(e.n - (e.sis || 0), u)}</b></div>)}
        {p.tipo === 'obtenido' && <div className={'resultado' + (e.mal ? ' mal' : '')}><span>{e.mal || 'Merma'}</span><b className="tn">{e.mal ? '' : `${cant(Math.max(0, (e.mx || 0) - (e.n || 0)), u)} · ${e.mx ? Math.round(100 * Math.max(0, (e.mx - (e.n || 0))) / e.mx) : 0} %`}</b></div>}
        {p.tipo === 'multi' && <div className="resultado"><span>Total a certificar</span><b className="tn">{num(e.n || 0)} kg</b></div>}
        {error && <div className="resultado mal" style={{ marginTop: 10 }}><span>{error}</span></div>}
      </div>
      <div className="dp">
        <button className="btn" onClick={atras}>{w.paso && !(pre && w.paso === 1) ? 'Atrás' : 'Cancelar'}</button>
        {p.tipo !== 'op' && <button className="btn pri" disabled={!est.ok || guardando} onClick={siguiente}>{guardando ? 'Guardando…' : ult ? (w.f === 'cert' ? 'Emitir' : 'Guardar') : 'Siguiente'}</button>}
      </div>
    </div>
  );
};
