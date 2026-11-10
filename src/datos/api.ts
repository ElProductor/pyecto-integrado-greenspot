import { getSupabase } from './supabase';
import type { Warehouse, Stakeholder, MaterialProduct, Batch, InventoryMovement, ValorizationCertificate, StockRow, Perfil } from './tipos';

// Todo pasa por Supabase: sin conexión no hay datos (nada se guarda en el navegador).
function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sin conexión a la base de datos. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

async function q<T>(req: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data as T;
}

// Bodega donde nace el stock de cada categoría (igual que en supabase/002_datos_ejemplo.sql)
const BODEGA_POR_CATEGORIA: Record<string, string> = { raw_material: 'BOD-PM-ACOPIO', in_process: 'BOD-PM-PLANTA' };
const bodegaDe = (whs: Warehouse[], category: string) =>
  whs.find(w => w.code === (BODEGA_POR_CATEGORIA[category] || 'BOD-DAL-DESPACHO')) || whs[0];

export const apiService = {
  getWarehouses: (): Promise<Warehouse[]> => q(db().from('warehouses').select('*').order('name')),

  getStakeholders: (): Promise<Stakeholder[]> => q(db().from('stakeholders').select('*').order('name')),
  createStakeholder: (item: Omit<Stakeholder, 'id' | 'created_at'>): Promise<Stakeholder> =>
    q(db().from('stakeholders').insert(item).select().single()),
  updateStakeholder: (id: string, updates: Partial<Stakeholder>): Promise<Stakeholder> =>
    q(db().from('stakeholders').update(updates).eq('id', id).select().single()),

  getMaterials: (): Promise<MaterialProduct[]> => q(db().from('materials_and_products').select('*').order('name')),

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
  async deleteMaterial(id: string) { await q(db().from('materials_and_products').delete().eq('id', id)); return true; },

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

  getBatches: (): Promise<Batch[]> => q(db().from('batches')
    .select('*, material:materials_and_products(*), supplier:stakeholders(*), warehouse:warehouses(*)')
    .order('reception_date', { ascending: false })),

  async createBatch(item: Partial<Batch>, operatorName: string): Promise<Batch> {
    const batch = await q<Batch>(db().from('batches').insert(item).select().single());
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
  updateBatch: (id: string, updates: Partial<Batch>): Promise<Batch> =>
    q(db().from('batches').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()),
  async deleteBatch(id: string) { await q(db().from('batches').delete().eq('id', id)); return true; },

  getStock: (): Promise<StockRow[]> => q(db().from('inventory_stock').select('material_id, warehouse_id, quantity')),

  // Columnas explícitas: profiles tiene permisos por columna (el hash del PIN no se lee).
  getProfiles: (): Promise<Perfil[]> => q(db().from('profiles').select('id, full_name, email, role, is_active, last_seen_at').order('full_name')),
  async updateProfile(id: string, cambios: Partial<Pick<Perfil, 'full_name' | 'role' | 'is_active'>>) { await q(db().from('profiles').update(cambios).eq('id', id)); },
  async resetPin(id: string) { await q(db().rpc('reset_user_pin', { p_user: id })); },
  async setMyPin(pin: string) { await q(db().rpc('set_my_pin', { p_pin: pin })); },

  getMovements: (): Promise<InventoryMovement[]> => q(db().from('inventory_movements')
    .select('*, material:materials_and_products(*), batch:batches(*), from_warehouse:warehouses!from_warehouse_id(*), to_warehouse:warehouses!to_warehouse_id(*)')
    .order('created_at', { ascending: false })),

  // created_by lo pone la base (auth.uid()); el stock lo mueve el trigger y rechaza saldos negativos.
  recordMovement: (item: Omit<InventoryMovement, 'id'>): Promise<InventoryMovement> =>
    q(db().from('inventory_movements').insert(item).select().single()),

  // El operario no tiene permiso para leer certificados: devuelve lista vacía en vez de error.
  getCertificates: (): Promise<ValorizationCertificate[]> => q(db().from('valorization_certificates')
    .select('*, stakeholder:stakeholders(*), batch:batches(*)')
    .order('issue_date', { ascending: false })),
  createCertificate: (item: Omit<ValorizationCertificate, 'id' | 'created_at'>): Promise<ValorizationCertificate> =>
    q(db().from('valorization_certificates').insert(item).select().single()),
};
