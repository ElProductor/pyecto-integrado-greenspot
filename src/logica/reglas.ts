import type { BatchStatus, Warehouse, Stakeholder, MaterialProduct, Batch, InventoryMovement } from '../datos/tipos';
import { Datos, Ctx } from './contexto';

/* ---------- lotes ---------- */
export const ETAPAS: BatchStatus[] = ['received', 'washing_sorting', 'shredded', 'pelletized', 'dispatched'];
export const NOMBRE_ETAPA: Record<BatchStatus, string> = { received: 'Patio', washing_sorting: 'Lavado', shredded: 'Molienda', pelletized: 'Pellet', dispatched: 'Despachado', quarantine: 'Cuarentena' };
// Un lote anulado se marca en sus notas (la base no tiene estado «anulado»).
export const loteAnulado = (l: Batch) => (l.notes || '').startsWith('[ANULADO]');
export const siguiente = (l: Batch): BatchStatus | null => { if (loteAnulado(l)) return null; const i = ETAPAS.indexOf(l.status); return i >= 0 && i < 4 ? ETAPAS[i + 1] : null; };
export const enProceso = (l: Batch) => l.status !== 'dispatched' && !loteAnulado(l);
export const certDe = (D: Datos, l: Batch) => D.cert.find(c => c.batch_id === l.id);
export const sinCert = (D: Datos) => D.lotes.filter(l => l.status === 'dispatched' && !loteAnulado(l) && l.supplier_id && !certDe(D, l));
export const textoAvanzar = (s: BatchStatus) => 'Pasar a ' + (s === 'dispatched' ? 'Despacho' : NOMBRE_ETAPA[s]);

/* ---------- bodegas y stock ---------- */
const CORTO: Record<string, string> = { 'BOD-PM-ACOPIO': 'Patio', 'BOD-PM-PLANTA': 'Nave de proceso', 'BOD-PM-PELLET': 'Silos', 'BOD-DAL-CHILOE': 'Dalcahue' };
export const nombreBod = (w?: Warehouse | null) => (w ? CORTO[w.code] || w.name : '—');
const orden = (w: Warehouse) => { const i = Object.keys(CORTO).indexOf(w.code); return i < 0 ? 99 : i; };
export const bodegas = (D: Datos) => D.bod.filter(w => w.is_active !== false).sort((a, b) => orden(a) - orden(b));
export const stockEn = (D: Datos, mat: string, bod: string) => Number(D.stock.find(s => s.material_id === mat && s.warehouse_id === bod)?.quantity || 0);
export const bajoMinimo = (m: MaterialProduct) => Number(m.current_stock) < Number(m.minimum_stock);
/** Bodegas con stock en kg sobre el 90 % de su capacidad (capacity_tons). */
export const bodegasLlenas = (D: Datos) => bodegas(D).filter(b => Number(b.capacity_tons) > 0).map(b => ({ b,
  kg: D.stock.filter(s => s.warehouse_id === b.id && D.mat.find(m => m.id === s.material_id)?.unit === 'kg').reduce((a, s) => a + Number(s.quantity), 0) }))
  .filter(x => x.kg >= 0.9 * Number(x.b.capacity_tons) * 1000);
export const kgEnPlanta = (D: Datos) => D.mat.filter(m => m.unit === 'kg').reduce((a, m) => a + Number(m.current_stock), 0);

/* ---------- empresas ---------- */
export const esGeneradora = (e: Stakeholder) => e.type !== 'buyer_customer';
export const esCliente = (e: Stakeholder) => e.type !== 'generator_supplier';

/* ---------- movimientos ---------- */
export type ClaseMov = 'entra' | 'sale' | 'mover' | 'contar' | 'prod' | 'anula';
export const claseMov = (m: InventoryMovement): ClaseMov =>
  ajusteDe(m)?.tipo === 'Anula' ? 'anula' : ajusteDe(m) ? 'contar' : m.movement_type === 'reception' ? 'entra' : m.movement_type === 'dispatch' ? 'sale' : m.movement_type === 'internal_transfer' ? 'mover'
    : m.movement_type === 'waste_adjustment' || m.movement_type === 'count_adjustment_in' ? 'contar' : 'prod';
export const NOMBRE_MOV: Record<ClaseMov, string> = { entra: 'Entrada', sale: 'Salida', mover: 'Traslado', contar: 'Corrección', prod: 'Producción', anula: 'Anulación' };
export const signoMov = (m: InventoryMovement) =>
  ['reception', 'count_adjustment_in', 'production_output'].includes(m.movement_type) ? 1 : m.movement_type === 'internal_transfer' ? 0 : -1;
export function detalleMov(m: InventoryMovement) {
  const mat = m.material?.name || 'Material', de = nombreBod(m.from_warehouse), a = nombreBod(m.to_warehouse);
  if (ajusteDe(m)) return `${m.reference_doc} · ${mat}${m.notes ? ' · ' + m.notes : ''}`;
  switch (claseMov(m)) {
    case 'entra': return `${m.reference_doc || 'Recepción'} · ${mat} → ${a}`;
    case 'sale': return `${m.reference_doc || 'Despacho'} · ${mat} · desde ${de}`;
    case 'mover': return `${mat} · ${de} → ${a}`;
    case 'contar': return `Corrección de conteo · ${mat} · ${m.from_warehouse ? de : a}`;
    default: return `${m.reference_doc || 'Producción'} · ${mat}`;
  }
}

/* ---------- anular y corregir ----------
   La base no deja editar ni borrar movimientos: se registra un asiento de contrapartida (como en un ERP)
   y el trigger de stock lo aplica igual que cualquier movimiento. */
// shortcut: el vínculo va en reference_doc («Anula MOV-…» / «Corrige MOV-…»); si se necesita consultarlo por SQL, agregar una columna adjusts_id.
const REF = /^(Anula|Corrige) (\S+)$/;
export const TOPE_CAMION = 50000;
export const MOTIVOS = ['Error de digitación', 'Registro duplicado', 'Solicitado por jefatura', 'Otro'];
export const ajusteDe = (m: InventoryMovement) => { const r = REF.exec(m.reference_doc || ''); return r ? { tipo: r[1] as 'Anula' | 'Corrige', num: r[2] } : null; };
export const ajustesDe = (D: Datos, m: InventoryMovement) => D.mov.filter(x => ajusteDe(x)?.num === m.movement_number);
export const anulado = (D: Datos, m: InventoryMovement) => ajustesDe(D, m).some(x => ajusteDe(x)!.tipo === 'Anula');
export const mismoSentido = (a: InventoryMovement, b: InventoryMovement) =>
  (a.from_warehouse_id || null) === (b.from_warehouse_id || null) && (a.to_warehouse_id || null) === (b.to_warehouse_id || null);
/** Cantidad vigente: lo registrado más/menos las correcciones. */
export const vigente = (D: Datos, m: InventoryMovement) => ajustesDe(D, m).filter(x => ajusteDe(x)!.tipo === 'Corrige')
  .reduce((a, x) => a + (mismoSentido(x, m) ? 1 : -1) * Number(x.quantity), Number(m.quantity));
/** Asiento que mueve el stock en el mismo sentido del original (igual) o al revés (deshace). */
export function contra(m: InventoryMovement, igual: boolean) {
  const from = (igual ? m.from_warehouse_id : m.to_warehouse_id) || null, to = (igual ? m.to_warehouse_id : m.from_warehouse_id) || null;
  return { from_warehouse_id: from, to_warehouse_id: to, movement_type: (from && to ? 'internal_transfer' : to ? 'count_adjustment_in' : 'waste_adjustment') as InventoryMovement['movement_type'] };
}
const hoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
/** null si se puede anular/corregir; si no, el motivo en palabras. */
export function bloqueoAjuste(D: Datos, m: InventoryMovement, esAdmin: boolean, uid: string): string | null {
  if (ajusteDe(m)) return 'Es un ajuste: se corrige desde el registro original.';
  if (anulado(D, m)) return 'Este registro ya está anulado.';
  if (!m.from_warehouse_id && !m.to_warehouse_id) return 'Este registro no tiene bodega asociada; no se puede ajustar desde la app.';
  if (m.batch_id && D.cert.some(c => c.batch_id === m.batch_id)) return 'El lote ya tiene certificado emitido; no se puede cambiar.';
  if (!esAdmin && (m.created_by !== uid || !hoy(m.created_at))) return 'Solo puedes corregir tus propios registros del día. Pídeselo a administración.';
  return null;
}
export const recepcionDe = (D: Datos, l: Batch) => D.mov.find(x => x.batch_id === l.id && x.movement_type === 'reception' && !ajusteDe(x));

/* ---------- empresas: kilos ---------- */
export const kilosEntregados = (D: Ctx['D'], id: string) => D.lotes.filter(l => l.supplier_id === id).reduce((a, l) => a + Number(l.initial_weight_kg), 0);
// Las salidas guardan el cliente en la referencia («Despacho a …»).
export const kilosComprados = (D: Ctx['D'], nombre: string) => D.mov.filter(m => m.movement_type === 'dispatch' && m.unit === 'kg' && !anulado(D, m) && (m.reference_doc || '').includes(nombre)).reduce((a, m) => a + vigente(D, m), 0);
