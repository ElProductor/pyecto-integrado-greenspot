import React from 'react';
import { apiService } from '../datos/api';
import type { Batch } from '../datos/tipos';
import { Ctx, useApp } from '../logica/contexto';
import { num, fecha } from '../logica/formato';
import { ETAPAS, NOMBRE_ETAPA, loteAnulado, siguiente, textoAvanzar } from '../logica/reglas';

/* ---------- piezas visuales ---------- */
const ICON: Record<string, string> = {
  inicio: 'M3 11l9-7 9 7v9H3z', lotes: 'M3 5h18v5H3zM3 14h18v5H3z', mat: 'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7',
  mov: 'M7 4v16l-3-3M17 20V4l3 3', emp: 'M4 21V5h10v16M14 9h6v12M7 9h3M7 13h3M7 17h3',
  cert: 'M6 3h9l4 4v14H6zM9 12h6M9 16h6', rep: 'M4 20V10M10 20V4M16 20v-7M22 20H2', conf: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3'
};
export const Ico: React.FC<{ n: string }> = ({ n }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[n]} /></svg>
);
export const Titulo: React.FC<{ t: string; children?: React.ReactNode }> = ({ t, children }) => (
  <div className="titulo"><h1>{t}</h1><div className="acciones">{children}</div></div>
);
export function Pestanas<T extends string>({ valor, set, ops }: { valor: T; set: (v: T) => void; ops: [T, string, number?][] }) {
  return <div className="pestanas">{ops.map(([v, t, n]) => (
    <button key={v} className={valor === v ? 'on' : ''} onClick={() => set(v)}>{t}{n !== undefined && <small>{n}</small>}</button>
  ))}</div>;
}
export const Etapa: React.FC<{ l: Batch }> = ({ l }) => {
  const i = ETAPAS.indexOf(l.status);
  if (loteAnulado(l)) return <span className="estado rojo">Anulado</span>;
  return <div className="etapa"><span className="tr">{[0, 1, 2, 3, 4].map(k => <i key={k} className={k <= i ? 'ok' : ''} />)}</span>{NOMBRE_ETAPA[l.status]}</div>;
};

/* ---------- lotes ---------- */
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

export const TablaLotes: React.FC<{ lista: Batch[]; completa?: boolean }> = ({ lista, completa }) => {
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
