import { getSupabase } from './supabase';
import type { Warehouse, Stakeholder, MaterialProduct, Batch, InventoryMovement, ValorizationCertificate, StockRow, Perfil } from './tipos';

// Todo pasa por Supabase: sin conexión no hay datos (nada se guarda en el navegador).
function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sin conexión a la base de datos. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

type ErrorBase = { message: string; code?: string };
/** Mensaje para el operario; el texto técnico queda en `detalle` (y en la consola). Los RAISE de la base ya vienen en español. */
export function enEspanol(e: ErrorBase): string {
  const t = e.message || '';
  if (/failed to fetch|networkerror|load failed/i.test(t)) return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
  if (/jwt expired|invalid jwt|refresh token/i.test(t)) return 'Tu sesión venció. Vuelve a entrar.';
  if (e.code === '42501' || /row-level security|permission denied/i.test(t)) return 'No tienes permiso para hacer esto.';
  if (e.code === '23505') return 'Ese número ya existe: otro registro lo tomó. Inténtalo de nuevo.';
  if (e.code === '23503') return 'Falta un dato relacionado (material, bodega o empresa ya no existe).';
  if (e.code === '23514' || e.code === '23502' || e.code === '22P02') return 'Un dato no es válido. Revisa los campos.';
  if (/stock insuficiente/i.test(t)) return 'No hay stock suficiente en esa bodega.';
  if (e.code === 'P0001') return t;
  return /^[\x00-\x7F]*$/.test(t) && t ? 'No se pudo completar la operación. Inténtalo de nuevo o avisa a administración.' : t;
}
export class ErrorApp extends Error { constructor(public e: ErrorBase) { super(enEspanol(e)); console.error(e); } }

async function q<T>(req: PromiseLike<{ data: T | null; error: ErrorBase | null }>): Promise<T> {
  let r: { data: T | null; error: ErrorBase | null };
  try { r = await req; } catch (e) { throw new ErrorApp({ message: String(e) }); }
  if (r.error) throw new ErrorApp(r.error);
  return r.data as T;
}
/** El intento anterior ya quedó guardado (se cortó la red antes de la respuesta): el número propio choca consigo mismo. */
export const yaGuardado = (e: unknown, campo: string) => e instanceof ErrorApp && e.e.code === '23505' && (e.e.message || '').includes(campo);

// PostgREST entrega máximo 1.000 filas por consulta: se piden por tramos hasta traer todo (antes se cortaba sin avisar).
// shortcut: se trae todo en cada recarga; con decenas de miles de movimientos, filtrar por fecha en la consulta.
const TRAMO = 1000;
async function todo<T>(consulta: () => { range: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }): Promise<T[]> {
  const filas: T[] = [];
  for (let i = 0; ; i += TRAMO) {
    const parte = await q(consulta().range(i, i + TRAMO - 1));
    filas.push(...parte);
    if (parte.length < TRAMO) return filas;
  }
}

// Bodega donde nace el stock de cada categoría (igual que en supabase/002_datos_ejemplo.sql)
const BODEGA_POR_CATEGORIA: Record<string, string> = { raw_material: 'BOD-PM-ACOPIO', in_process: 'BOD-PM-PLANTA' };
const bodegaDe = (whs: Warehouse[], category: string) =>
  whs.find(w => w.code === (BODEGA_POR_CATEGORIA[category] || 'BOD-DAL-DESPACHO')) || whs[0];

export const apiService = {
  getWarehouses: (): Promise<Warehouse[]> => todo(() => db().from('warehouses').select('*').order('name').order('id')),

  getStakeholders: (): Promise<Stakeholder[]> => todo(() => db().from('stakeholders').select('*').order('name').order('id')),
  createStakeholder: (item: Omit<Stakeholder, 'id' | 'created_at'>): Promise<Stakeholder> =>
    q(db().from('stakeholders').insert(item).select().single()),
  updateStakeholder: (id: string, updates: Partial<Stakeholder>): Promise<Stakeholder> =>
    q(db().from('stakeholders').update(updates).eq('id', id).select().single()),

  getMaterials: (): Promise<MaterialProduct[]> => todo(() => db().from('materials_and_products').select('*').order('name').order('id')),

  // El stock solo cambia con movimientos del kardex; un material nuevo con stock inicial lo registra como conteo.
  async createMaterial(item: Omit<MaterialProduct, 'id' | 'created_at' | 'updated_at'>, operatorName: string): Promise<MaterialProduct> {
    const { current_stock, ...rest } = item;
    const mat = await q<MaterialProduct>(db().from('materials_and_products').insert({ ...rest, current_stock: 0 }).select().single());
    if (Number(current_stock) > 0) await this.adjustStock(mat, Number(current_stock), operatorName);
    return mat;
  },

  async updateMaterial(id: string, updates: Partial<MaterialProduct>): Promise<MaterialProduct> {
    const { current_stock: _ignorado, ...rest } = updates;
    return q(db().from('materials_and_products').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single());
  },

  // Ajuste por conteo físico: deja en el kardex la diferencia contra el total contado.
  async adjustStock(mat: MaterialProduct, newTotal: number, operatorName: string) {
    const delta = newTotal - Number(mat.current_stock);
    if (delta === 0) return;
    let warehouseId: string;
    if (delta > 0) {
      warehouseId = bodegaDe(await this.getWarehouses(), mat.category).id;
    } else {
      // Se descuenta de la bodega que más tiene de ese material
      const filas = await q<{ warehouse_id: string; quantity: number }[]>(
        db().from('inventory_stock').select('warehouse_id, quantity').eq('material_id', mat.id).order('quantity', { ascending: false }).limit(1));
      if (!filas.length || filas[0].quantity < -delta) throw new Error('El ajuste supera lo que hay en una sola bodega; regístralo por bodega desde Movimientos.');
      warehouseId = filas[0].warehouse_id;
    }
    await this.recordMovement({
      movement_number: `AJU-${Date.now()}`,
      movement_type: delta > 0 ? 'count_adjustment_in' : 'waste_adjustment',
      material_id: mat.id,
      batch_id: null,
      from_warehouse_id: delta < 0 ? warehouseId : null,
      to_warehouse_id: delta > 0 ? warehouseId : null,
      quantity: Math.abs(delta),
      unit: mat.unit,
      operator_name: operatorName,
      reference_doc: 'Ajuste por conteo físico',
      created_at: new Date().toISOString()
    });
  },

  getBatches: (): Promise<Batch[]> => todo(() => db().from('batches')
    .select('*, material:materials_and_products(*), supplier:stakeholders(*), warehouse:warehouses(*)')
    .order('reception_date', { ascending: false }).order('id')),

  /** Crea el lote y su entrada. Si el número ya existe y es este mismo lote (reintento tras un corte), lo reusa;
   *  si es de otro camión registrado a la vez, toma el número siguiente. */
  async createBatch(item: Partial<Batch>, operatorName: string, uid: string): Promise<Batch> {
    let batch: Batch | null = null;
    for (let i = 0; !batch; i++) {
      try { batch = await q<Batch>(db().from('batches').insert(item).select().single()); }
      catch (e) {
        if (!yaGuardado(e, 'batch_number') || i >= 5) throw e;
        const otro = await q<Batch>(db().from('batches').select('*').eq('batch_number', item.batch_number!).single());
        if (otro.created_by === uid && otro.supplier_id === item.supplier_id && Number(otro.initial_weight_kg) === Number(item.initial_weight_kg)) batch = otro;
        else item = { ...item, batch_number: item.batch_number!.replace(/\d+$/, d => String(+d + 1).padStart(d.length, '0')) };
      }
    }
    const tiene = await q<{ id: string }[]>(db().from('inventory_movements').select('id').eq('batch_id', batch.id).eq('movement_type', 'reception').limit(1));
    if (tiene.length) return batch;
    await this.recordMovement({
      movement_number: `MOV-${Date.now()}`,
      movement_type: 'reception',
      material_id: batch.material_id,
      batch_id: batch.id,
      from_warehouse_id: null,
      to_warehouse_id: batch.warehouse_id || null,
      quantity: batch.initial_weight_kg,
      unit: 'kg',
      operator_name: operatorName,
      reference_doc: `Lote ${batch.batch_number}`,
      notes: `Ingreso automático por lote ${batch.batch_number}`,
      document_url: batch.weighing_ticket_url,
      created_at: new Date().toISOString()
    });
    return batch;
  },

  async updateBatchStatus(id: string, status: Batch['status']) {
    await q(db().from('batches').update({ status, updated_at: new Date().toISOString() }).eq('id', id));
  },

  getStock: (): Promise<StockRow[]> => todo(() => db().from('inventory_stock').select('material_id, warehouse_id, quantity').order('id')),

  // Columnas explícitas: profiles tiene permisos por columna (el hash del PIN no se lee).
  getProfiles: (): Promise<Perfil[]> => todo(() => db().from('profiles').select('id, full_name, email, role, is_active, last_seen_at').order('full_name').order('id')),
  async updateProfile(id: string, cambios: Partial<Pick<Perfil, 'full_name' | 'role' | 'is_active'>>) { await q(db().from('profiles').update(cambios).eq('id', id)); },

  getMovements: (): Promise<InventoryMovement[]> => todo(() => db().from('inventory_movements')
    .select('*, material:materials_and_products(*), batch:batches(*), from_warehouse:warehouses!from_warehouse_id(*), to_warehouse:warehouses!to_warehouse_id(*)')
    .order('created_at', { ascending: false }).order('id')),

  // created_by lo pone la base (auth.uid()); el stock lo mueve el trigger y rechaza saldos negativos.
  recordMovement: (item: Omit<InventoryMovement, 'id'>): Promise<InventoryMovement> =>
    q(db().from('inventory_movements').insert(item).select().single()),
  // Varios en una sola llamada = una sola transacción: si uno falla, no se guarda ninguno.
  recordMovements: (items: Omit<InventoryMovement, 'id'>[]): Promise<InventoryMovement[]> =>
    q(db().from('inventory_movements').insert(items).select()),

  // El operario no tiene permiso para leer certificados: devuelve lista vacía en vez de error.
  getCertificates: (): Promise<ValorizationCertificate[]> => todo(() => db().from('valorization_certificates')
    .select('*, stakeholder:stakeholders(*), batch:batches(*)')
    .order('issue_date', { ascending: false }).order('id')),
  createCertificate: (item: Omit<ValorizationCertificate, 'id' | 'created_at'>): Promise<ValorizationCertificate> =>
    q(db().from('valorization_certificates').insert(item).select().single()),
};
