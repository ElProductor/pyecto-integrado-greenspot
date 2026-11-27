import React, { useState } from 'react';
import { apiService, yaGuardado } from '../datos/api';
import type { Stakeholder, MaterialProduct, Batch, InventoryMovement } from '../datos/tipos';
import { generateCertificatePdf } from '../logica/certificadoPdf';
import { PanelSel, useApp } from '../logica/contexto';
import { num, cant, fecha } from '../logica/formato';
import { ETAPAS, NOMBRE_ETAPA, loteAnulado, siguiente, certDe, textoAvanzar, nombreBod, bodegas, stockEn, esGeneradora, claseMov, NOMBRE_MOV, TOPE_CAMION, MOTIVOS, ajusteDe, ajustesDe, anulado, vigente, contra, bloqueoAjuste, recepcionDe, kilosEntregados } from '../logica/reglas';
import { avanzar } from './Comunes';

const Marco: React.FC<{ sub: string; tit: string; pie?: React.ReactNode; children: React.ReactNode }> = ({ sub, tit, pie, children }) => {
  const { setPanel } = useApp();
  return <>
    <div className="pc"><div><small>{sub}</small><h3>{tit}</h3></div><button className="cerrar" aria-label="Cerrar" onClick={() => setPanel(null)}>×</button></div>
    <div className="pb">{children}</div>
    {pie && <div className="pp">{pie}</div>}
  </>;
};

function imprimirRotulo(l: Batch) {
  const v = window.open('', '_blank', 'width=420,height=320');
  if (!v) return;
  v.document.write(`<title>Rótulo ${l.batch_number}</title><body style="font-family:sans-serif;padding:20px">
    <b style="font-size:20px">${l.batch_number}</b><div>${l.material?.name || ''}</div>
    <div>${num(l.current_weight_kg)} kg · ${l.supplier?.name || ''}</div><script>onload=()=>{print();close()}<\/script>`);
  v.document.close();
}

const PanelLote: React.FC<{ l: Batch }> = ({ l }) => {
  const c = useApp(), s = siguiente(l), i = ETAPAS.indexOf(l.status), cert = certDe(c.D, l);
  return <Marco sub="Lote" tit={l.batch_number} pie={<>
    <button className="btn" onClick={() => imprimirRotulo(l)}>Imprimir rótulo</button>
    {s && <button className="btn pri" onClick={() => avanzar(c, l)}>{textoAvanzar(s)}</button>}
  </>}>
    {loteAnulado(l) && <div className="resultado mal" style={{ marginBottom: 16 }}><span>{l.notes}</span></div>}
    <h4>Datos</h4>
    <dl className="datos">
      <dt>Material</dt><dd>{l.material?.name}</dd>
      <dt>Empresa</dt><dd>{l.supplier?.name || '—'}</dd>
      <dt>Kilos al ingreso</dt><dd className="tn">{num(l.initial_weight_kg)} kg</dd>
      <dt>Kilos actuales</dt><dd className="tn">{num(l.current_weight_kg)} kg</dd>
      {l.marine_origin_zone && <><dt>Origen</dt><dd>{l.marine_origin_zone}</dd></>}
      {l.notes && !loteAnulado(l) && <><dt>Notas</dt><dd>{l.notes}</dd></>}
      {cert && <><dt>Certificado</dt><dd>{cert.certificate_code}</dd></>}
    </dl>
    <h4>Recorrido</h4>
    <div className="recorrido">{ETAPAS.map((e, k) => (
      <div key={e} className={k > i ? 'pend' : ''}><span>{NOMBRE_ETAPA[e]}</span><span>{k === 0 ? fecha(l.reception_date) : k === i ? fecha(l.updated_at) : k < i ? 'Hecho' : 'Pendiente'}</span></div>
    ))}</div>
    <h4>Rótulo</h4>
    <div className="rotulo"><div><b>{l.batch_number}</b><span>{l.material?.name}</span><span>{num(l.current_weight_kg)} kg · {NOMBRE_ETAPA[l.status]}</span></div></div>
    <BotonesAjuste m={recepcionDe(c.D, l)} que="lote" />
  </Marco>;
};

/** Sección «¿Hay un error?» con Corregir / Anular, o el motivo por el que no se puede. */
const BotonesAjuste: React.FC<{ m?: InventoryMovement; que: 'lote' | 'movimiento' }> = ({ m, que: q0 }) => {
  let que = q0;
  const c = useApp();
  if (!m || ajusteDe(m) || anulado(c.D, m)) return null;
  const no = bloqueoAjuste(c.D, m, c.esAdmin, c.uid);
  if (m.movement_type === 'reception' && m.batch_id) que = 'lote';
  return <>
    <h4>¿Hay un error?</h4>
    {no ? <p className="nota">{no}</p> : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="btn" onClick={() => c.setDlg({ t: 'ajuste', id: m.id, modo: 'corregir' })}>{que === 'lote' ? 'Corregir peso' : 'Corregir cantidad'}</button>
      <button className="btn" style={{ color: 'var(--rojo)' }} onClick={() => c.setDlg({ t: 'ajuste', id: m.id, modo: 'anular' })}>Anular {que}</button>
    </div>}
  </>;
};

const PanelMov: React.FC<{ m: InventoryMovement }> = ({ m }) => {
  const c = useApp(), { D } = c, aj = ajustesDe(D, m), an = anulado(D, m), v = vigente(D, m), ori = ajusteDe(m);
  const orig = ori && D.mov.find(x => x.movement_number === ori.num);
  return <Marco sub={`${NOMBRE_MOV[claseMov(m)]} · ${m.movement_number}`} tit={m.material?.name || 'Movimiento'}>
    {an && <div className="resultado mal" style={{ marginBottom: 16 }}><span>Anulado. El stock ya se devolvió a como estaba.</span></div>}
    <h4>Datos</h4>
    <dl className="datos">
      <dt>Cantidad</dt><dd className="tn">{an ? <s>{cant(m.quantity, m.unit)}</s> : cant(v, m.unit)}{!an && v !== Number(m.quantity) && <span className="sec"> (se registró {cant(m.quantity, m.unit)})</span>}</dd>
      {m.from_warehouse && <><dt>Desde</dt><dd>{nombreBod(m.from_warehouse)}</dd></>}
      {m.to_warehouse && <><dt>Hacia</dt><dd>{nombreBod(m.to_warehouse)}</dd></>}
      {m.reference_doc && <><dt>Referencia</dt><dd>{m.reference_doc}</dd></>}
      {m.notes && <><dt>{ori ? 'Motivo' : 'Notas'}</dt><dd>{m.notes}</dd></>}
      <dt>Registró</dt><dd>{m.operator_name} · {fecha(m.created_at)}</dd>
    </dl>
    {(orig || m.batch_id) && <div className="acciones" style={{ marginTop: 16 }}>
      {orig && <button className="btn chico" onClick={() => c.setPanel({ t: 'mov', id: orig.id })}>Ver registro original</button>}
      {m.batch_id && <button className="btn chico" onClick={() => c.setPanel({ t: 'lote', id: m.batch_id! })}>Ver lote</button>}
    </div>}
    {aj.length > 0 && <><h4>Historial</h4><div className="recorrido">{aj.map(x => (
      <div key={x.id} className="clic" style={{ display: 'block', cursor: 'pointer' }} onClick={() => c.setPanel({ t: 'mov', id: x.id })}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{ajusteDe(x)!.tipo === 'Anula' ? 'Anulado' : 'Corregido'} por {x.operator_name}</span><span>{fecha(x.created_at)}</span></div>
        {x.notes && <div className="sec" style={{ fontSize: 13 }}>{x.notes}</div>}
      </div>))}</div></>}
    <BotonesAjuste m={m} que="movimiento" />
  </Marco>;
};

/* ---------- anular / corregir (diálogo) ---------- */
export const AjusteDlg: React.FC<{ id: string; modo: 'anular' | 'corregir' }> = ({ id, modo }) => {
  const c = useApp(), { D } = c, m = D.mov.find(x => x.id === id);
  const [motivo, setMotivo] = useState(modo === 'corregir' ? MOTIVOS[0] : ''), [detalle, setDetalle] = useState(''), [nueva, setNueva] = useState('');
  const [error, setError] = useState(''), [enviando, setEnviando] = useState(false), [clave] = useState(() => Date.now());
  if (!m) return null;
  const u = m.unit, actual = vigente(D, m), lote = m.movement_type === 'reception' && m.batch_id ? D.lotes.find(l => l.id === m.batch_id) : undefined;
  const n = modo === 'anular' ? 0 : +nueva, dif = n - actual;
  const malN = modo === 'corregir' && nueva !== '' && (n <= 0 || n === actual || (!!lote && n > TOPE_CAMION));
  const listo = !!motivo && (motivo !== 'Otro' || !!detalle.trim()) && (modo === 'anular' || (nueva !== '' && !malN));
  const ct = contra(m, dif > 0), q = Math.abs(dif), bod = (id: string | null) => nombreBod(D.bod.find(b => b.id === id));
  const efecto = !q ? '' : ct.from_warehouse_id && ct.to_warehouse_id ? `Pasan ${cant(q, u)} de ${bod(ct.from_warehouse_id)} a ${bod(ct.to_warehouse_id)}`
    : ct.to_warehouse_id ? `${bod(ct.to_warehouse_id)} sube ${cant(q, u)}` : `${bod(ct.from_warehouse_id)} baja ${cant(q, u)}`;
  const guardar = async () => {
    if (!listo || enviando) return;
    setEnviando(true); setError('');
    const texto = motivo + (detalle.trim() ? ': ' + detalle.trim() : '');
    try {
      await apiService.recordMovement({
        movement_number: `${modo === 'anular' ? 'ANU' : 'COR'}-${clave}`, material_id: m.material_id, batch_id: m.batch_id || null, ...ct,
        quantity: q, unit: u, operator_name: c.usuario, reference_doc: `${modo === 'anular' ? 'Anula' : 'Corrige'} ${m.movement_number}`,
        notes: modo === 'corregir' ? `${cant(actual, u)} → ${cant(n, u)} · ${texto}` : texto, created_at: new Date().toISOString()
      });
      // El lote (peso o marca [ANULADO]) lo ajusta la base en la misma operación: supabase/004_reglas_en_la_base.sql
      await c.recargar(); c.setDlg(null);
      c.aviso(modo === 'anular' ? `${lote ? lote.batch_number : 'Registro'} anulado. El stock volvió a como estaba.` : `Corregido: ${cant(actual, u)} → ${cant(n, u)}`);
    } catch (e) {
      if (yaGuardado(e, 'movement_number')) { await c.recargar(); c.setDlg(null); c.aviso('Ya estaba guardado: el intento anterior alcanzó a llegar.'); return; }
      const t = (e as Error).message;
      setError(/stock suficiente/i.test(t) ? 'No alcanza el stock para deshacerlo: parte de ese material ya salió o se trasladó.' : t);
      setEnviando(false);
    }
  };
  return <div className="dlg">
    <div className="dc"><small>{lote ? lote.batch_number : `${NOMBRE_MOV[claseMov(m)]} · ${m.material?.name || ''}`}</small><h3>{modo === 'anular' ? (lote ? 'Anular lote' : 'Anular movimiento') : (lote ? 'Corregir peso' : 'Corregir cantidad')}</h3></div>
    <div className="db">
      {modo === 'corregir' && <div className="fila2">
        <div className="campo"><label>Registrado</label><input value={cant(actual, u)} disabled /></div>
        <div className={'campo' + (malN ? ' mal' : '')}><label htmlFor="nueva">Cantidad correcta ({u === 'units' ? 'unidades' : u})</label>
          <input id="nueva" inputMode="numeric" autoFocus value={nueva} onChange={e => setNueva(e.target.value.split(',')[0].replace(/\D/g, '').slice(0, 7))} />
          <div className="ayuda">{malN ? (n === actual ? 'Es la misma cantidad.' : n <= 0 ? 'Para dejarlo en cero, usa Anular.' : `Revisa el peso: un camión no supera los ${num(TOPE_CAMION)} kg.`) : ''}</div></div>
      </div>}
      <div className="campo"><label>Motivo</label><div className="opciones">{MOTIVOS.map(x => (
        <button key={x} type="button" className={'opcion' + (motivo === x ? ' on' : '')} onClick={() => setMotivo(x)}><span>{x}</span></button>))}</div></div>
      <div className="campo"><label htmlFor="det">Detalle{motivo === 'Otro' ? '' : ' (opcional)'}</label><input id="det" value={detalle} maxLength={120} placeholder="Ej.: lo pidió el jefe de planta, guía equivocada" onChange={e => setDetalle(e.target.value)} /></div>
      {efecto && listo && <div className="resultado"><span>{efecto}</span></div>}
      <p className="nota">El registro original no se borra: queda {modo === 'anular' ? 'tachado' : 'con el cambio anotado'}, con tu nombre, la fecha y el motivo.</p>
      {error && <div className="resultado mal"><span>{error}</span></div>}
    </div>
    <div className="dp"><button className="btn" onClick={() => c.setDlg(null)}>Cancelar</button>
      <button className="btn pri" style={modo === 'anular' ? { background: 'var(--rojo)', borderColor: 'var(--rojo)' } : undefined} disabled={!listo || enviando} onClick={guardar}>{modo === 'anular' ? 'Anular' : 'Guardar corrección'}</button></div>
  </div>;
};

const PanelMaterial: React.FC<{ m: MaterialProduct }> = ({ m }) => {
  const c = useApp(), B = bodegas(c.D);
  const [mfi, setMfi] = useState(String(m.mfi_melt_flow_index ?? '')), [dens, setDens] = useState(String(m.density_g_cm3 ?? '')), [min, setMin] = useState(String(m.minimum_stock));
  const decimal = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const malMin = !/^\d+$/.test(min), malNum = [mfi, dens].some(v => v.trim() !== '' && isNaN(Number(v.replace(',', '.'))));
  const guardar = async () => {
    try { await apiService.updateMaterial(m.id, { mfi_melt_flow_index: decimal(mfi), density_g_cm3: decimal(dens), minimum_stock: +min }); await c.recargar(); c.aviso('Cambios guardados'); }
    catch (e) { c.aviso('No se pudo guardar: ' + (e as Error).message); }
  };
  return <Marco sub={m.code} tit={m.name} pie={<button className="btn pri" disabled={malMin || malNum} onClick={guardar}>Guardar cambios</button>}>
    <h4>Stock por bodega</h4>
    <dl className="datos">{B.map(b => <React.Fragment key={b.id}><dt>{nombreBod(b)}</dt><dd className="tn">{cant(stockEn(c.D, m.id, b.id), m.unit)}</dd></React.Fragment>)}
      <dt>Total</dt><dd className="tn"><b style={{ fontWeight: 600 }}>{cant(m.current_stock, m.unit)}</b></dd></dl>
    <h4>Ficha técnica</h4>
    <div className="fila2">
      <div className={'campo' + (malNum ? ' mal' : '')}><label htmlFor="mfi">Índice de fluidez (MFI)</label><input id="mfi" inputMode="decimal" value={mfi} onChange={e => setMfi(e.target.value)} /></div>
      <div className={'campo' + (malNum ? ' mal' : '')}><label htmlFor="dens">Densidad (g/cm³)</label><input id="dens" inputMode="decimal" value={dens} onChange={e => setDens(e.target.value)} /></div>
    </div>
    <div className={'campo' + (malMin ? ' mal' : '')}><label htmlFor="min">Stock mínimo ({m.unit === 'units' ? 'unidades' : m.unit})</label><input id="min" inputMode="numeric" value={min} onChange={e => setMin(e.target.value)} />
      <div className="ayuda">{malMin ? 'Escribe un número entero.' : 'Bajo este número aparece el aviso en Inicio.'}</div></div>
  </Marco>;
};

const PanelEmpresa: React.FC<{ e: Stakeholder }> = ({ e }) => {
  const { D, setDlg } = useApp(), lotes = D.lotes.filter(l => l.supplier_id === e.id && !loteAnulado(l));
  return <Marco sub={esGeneradora(e) ? 'Empresa generadora' : 'Cliente'} tit={e.name} pie={<button className="btn" onClick={() => setDlg({ t: 'form', nombre: 'empresa', id: e.id })}>Editar</button>}>
    <h4>Datos</h4>
    <dl className="datos"><dt>RUT</dt><dd>{e.tax_id}</dd><dt>Ciudad</dt><dd>{e.city || '—'}</dd><dt>Correo</dt><dd>{e.contact_email || '—'}</dd><dt>Teléfono</dt><dd>{e.contact_phone || '—'}</dd></dl>
    {esGeneradora(e) && <><h4>Lotes entregados · {num(kilosEntregados(D, e.id))} kg</h4>
      {lotes.length ? <div className="recorrido">{lotes.map(l => <div key={l.id}><span>{l.batch_number} · {l.material?.name}</span><span className="tn">{num(l.initial_weight_kg)} kg</span></div>)}</div> : <p className="sec">Sin lotes todavía.</p>}</>}
  </Marco>;
};

const PanelCert: React.FC<{ id: string }> = ({ id }) => {
  const c = useApp(), x = c.D.cert.find(k => k.id === id);
  if (!x) return null;
  return <Marco sub="Certificado" tit={x.certificate_code} pie={<button className="btn pri" onClick={() => generateCertificatePdf({ ...x, stakeholder: c.D.emp.find(e => e.id === x.stakeholder_id) || x.stakeholder }).catch(e => c.aviso('No se pudo generar el PDF: ' + e.message))}>Descargar PDF</button>}>
    <div className="doc">
      <div className="dc"><div><h5>Certificado de valorización</h5>Ley 20.920 (REP)</div><div className="der">N° {x.certificate_code}<br />{new Date(x.issue_date + 'T12:00').toLocaleDateString('es-CL')}</div></div>
      Greenspot certifica que recibió y valorizó los siguientes residuos plásticos de <b>{x.stakeholder?.name}</b>, RUT {x.stakeholder?.tax_id}:
      <table><thead><tr><th>Lote</th><th>Residuo</th><th className="der">Kilos</th></tr></thead>
        <tbody><tr><td>{x.batch?.batch_number || '—'}</td><td>{x.waste_type}</td><td className="der tn">{num(x.total_kg_valorized)} kg</td></tr></tbody></table>
      Destino: {x.final_destination_product.toLowerCase()}. CO2eq evitado estimado: {(Number(x.co2_avoided_kg) / 1000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} t.
      <div className="firma">{x.signer_name}<br />{x.signer_title || 'Administración'}</div>
    </div>
  </Marco>;
};

const PanelUsuario: React.FC<{ id: string }> = ({ id }) => {
  const c = useApp(), u = c.D.usuarios.find(k => k.id === id);
  const [nombre, setNombre] = useState(u?.full_name || ''), [rol, setRol] = useState(u?.role || 'operator'), [activa, setActiva] = useState(!!u?.is_active);
  if (!u) return null;
  const guardar = async () => {
    try { await apiService.updateProfile(u.id, { full_name: nombre.trim(), role: rol, is_active: activa }); await c.recargar(); c.aviso('Usuario actualizado'); }
    catch (e) { c.aviso('No se pudo guardar: ' + (e as Error).message); }
  };
  return <Marco sub="Usuario" tit={u.full_name} pie={<button className="btn pri" disabled={!nombre.trim()} onClick={guardar}>Guardar cambios</button>}>
    <div className="campo"><label htmlFor="un">Nombre</label><input id="un" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
    <div className="campo"><label>Correo</label><input value={u.email} disabled /></div>
    <div className="fila2">
      <div className="campo"><label htmlFor="ur">Rol</label><select id="ur" value={rol} onChange={e => setRol(e.target.value as typeof rol)}><option value="operator">Operario</option><option value="admin">Administración</option></select></div>
      <div className="campo"><label htmlFor="ua">Estado</label><select id="ua" value={activa ? '1' : '0'} onChange={e => setActiva(e.target.value === '1')}><option value="1">Activa</option><option value="0">Desactivada</option></select></div>
    </div>
    <p className="nota">Último ingreso: {u.last_seen_at ? fecha(u.last_seen_at) : 'sin registro'}.</p>
  </Marco>;
};

export const Panel: React.FC<{ sel: PanelSel }> = ({ sel }) => {
  const { D } = useApp();
  if (!sel) return null;
  // key: al cambiar de registro el formulario arranca con sus datos, no con los del anterior.
  if (sel.t === 'lote') { const l = D.lotes.find(x => x.id === sel.id); return l ? <PanelLote key={l.id} l={l} /> : null; }
  if (sel.t === 'mat') { const m = D.mat.find(x => x.id === sel.id); return m ? <PanelMaterial key={m.id + m.updated_at} m={m} /> : null; }
  if (sel.t === 'emp') { const e = D.emp.find(x => x.id === sel.id); return e ? <PanelEmpresa key={e.id} e={e} /> : null; }
  if (sel.t === 'mov') { const m = D.mov.find(x => x.id === sel.id); return m ? <PanelMov key={m.id} m={m} /> : null; }
  if (sel.t === 'cert') return <PanelCert key={sel.id} id={sel.id} />;
  return <PanelUsuario key={sel.id} id={sel.id} />;
};
