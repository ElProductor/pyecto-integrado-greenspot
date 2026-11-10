import { getSupabase } from '../lib/supabase';
import { 
  Warehouse, 
  Stakeholder, 
  MaterialProduct, 
  Batch, 
  InventoryMovement, 
  ValorizationCertificate,
  QualityControlTest,
  ProductionOrder,
  RepTargetCompliance,
  KpiMetrics 
} from '../types';
import { 
  INITIAL_WAREHOUSES, 
  INITIAL_STAKEHOLDERS, 
  INITIAL_MATERIALS, 
  INITIAL_BATCHES, 
  INITIAL_MOVEMENTS, 
  INITIAL_CERTIFICATES,
  INITIAL_QC_TESTS,
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_REP_TARGETS
} from '../data/mockData';

// Claves de persistencia para modo local
const KEY_WAREHOUSES = 'greenspot_warehouses';
const KEY_STAKEHOLDERS = 'greenspot_stakeholders';
const KEY_MATERIALS = 'greenspot_materials';
const KEY_BATCHES = 'greenspot_batches';
const KEY_MOVEMENTS = 'greenspot_movements';
const KEY_CERTS = 'greenspot_certificates';
const KEY_QC = 'greenspot_qc_tests';
const KEY_PRODUCTION = 'greenspot_production_orders';
const KEY_REP = 'greenspot_rep_targets';

function getLocal<T>(key: string, initial: T): T {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(item);
  } catch {
    return initial;
  }
}

function setLocal<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Con Supabase configurado los errores se lanzan para que la UI los muestre;
// antes se escondían y el dato quedaba solo en el navegador.
async function q<T>(req: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data as T;
}

export const apiService = {
  // -------------------------------------------------------------
  // BODEGAS / ALMACENES
  // -------------------------------------------------------------
  async getWarehouses(): Promise<Warehouse[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase.from('warehouses').select('*').order('name'));
    return getLocal<Warehouse[]>(KEY_WAREHOUSES, INITIAL_WAREHOUSES);
  },

  // -------------------------------------------------------------
  // GENERADORES Y CLIENTES
  // -------------------------------------------------------------
  async getStakeholders(): Promise<Stakeholder[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase.from('stakeholders').select('*').order('name'));
    return getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
  },

  async createStakeholder(item: Omit<Stakeholder, 'id' | 'created_at'>): Promise<Stakeholder> {
    const newItem: Stakeholder = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabase();
    if (supabase) return q(supabase.from('stakeholders').insert(newItem).select().single());

    const current = getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
    const updated = [newItem, ...current];
    setLocal(KEY_STAKEHOLDERS, updated);
    return newItem;
  },

  async updateStakeholder(id: string, updates: Partial<Stakeholder>): Promise<Stakeholder | null> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('stakeholders')
          .update(updates)
          .eq('id', id)
          .select()
          .single());

    const current = getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
    const index = current.findIndex(s => s.id === id);
    if (index === -1) return null;
    current[index] = { ...current[index], ...updates };
    setLocal(KEY_STAKEHOLDERS, current);
    return current[index];
  },

  async deleteStakeholder(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) { await q(supabase.from('stakeholders').delete().eq('id', id)); return true; }

    const current = getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
    const filtered = current.filter(s => s.id !== id);
    setLocal(KEY_STAKEHOLDERS, filtered);
    return true;
  },

  // -------------------------------------------------------------
  // CATÁLOGO DE MATERIALES Y PRODUCTOS
  // -------------------------------------------------------------
  async getMaterials(): Promise<MaterialProduct[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase.from('materials_and_products').select('*').order('name'));
    return getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
  },

  async createMaterial(item: Omit<MaterialProduct, 'id' | 'created_at' | 'updated_at'>): Promise<MaterialProduct> {
    const newItem: MaterialProduct = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabase();
    if (supabase) return q(supabase.from('materials_and_products').insert(newItem).select().single());

    const current = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const updated = [newItem, ...current];
    setLocal(KEY_MATERIALS, updated);
    return newItem;
  },

  async updateMaterial(id: string, updates: Partial<MaterialProduct>): Promise<MaterialProduct | null> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('materials_and_products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single());

    const current = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const index = current.findIndex(m => m.id === id);
    if (index === -1) return null;
    current[index] = { ...current[index], ...updates, updated_at: new Date().toISOString() };
    setLocal(KEY_MATERIALS, current);
    return current[index];
  },

  async deleteMaterial(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) { await q(supabase.from('materials_and_products').delete().eq('id', id)); return true; }

    const current = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const filtered = current.filter(m => m.id !== id);
    setLocal(KEY_MATERIALS, filtered);
    return true;
  },

  // -------------------------------------------------------------
  // LOTES (BATCHES)
  // -------------------------------------------------------------
  async getBatches(): Promise<Batch[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('batches')
          .select('*, material:materials_and_products(*), supplier:stakeholders(*), warehouse:warehouses(*)')
          .order('reception_date', { ascending: false }));

    const batches = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);
    const materials = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const suppliers = getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
    const warehouses = getLocal<Warehouse[]>(KEY_WAREHOUSES, INITIAL_WAREHOUSES);

    return batches.map(b => ({
      ...b,
      material: materials.find(m => m.id === b.material_id),
      supplier: suppliers.find(s => s.id === b.supplier_id),
      warehouse: warehouses.find(w => w.id === b.warehouse_id)
    }));
  },

  async createBatch(item: Omit<Batch, 'id' | 'created_at' | 'updated_at'>): Promise<Batch> {
    const newItem: Batch = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabase();
    if (supabase) {
      await q(supabase.from('batches').insert(newItem));
    } else {
      setLocal(KEY_BATCHES, [newItem, ...getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES)]);
    }

    // Registra movimiento de recepción automática
    await this.recordMovement({
      movement_number: `MOV-${Date.now()}`,
      movement_type: 'reception',
      material_id: newItem.material_id,
      batch_id: newItem.id,
      from_warehouse_id: null,
      to_warehouse_id: newItem.warehouse_id || null,
      quantity: newItem.initial_weight_kg,
      unit: 'kg',
      operator_name: 'Recepción Planta Greenspot',
      reference_doc: `Lote ${newItem.batch_number}`,
      notes: `Ingreso automático por lote ${newItem.batch_number}`,
      document_url: newItem.weighing_ticket_url,
      created_at: new Date().toISOString()
    });

    return newItem;
  },

  async updateBatchStatus(id: string, status: Batch['status']): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      await q(supabase.from('batches').update({ status, updated_at: new Date().toISOString() }).eq('id', id));
      return;
    }

    const current = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);
    const index = current.findIndex(b => b.id === id);
    if (index !== -1) {
      current[index].status = status;
      current[index].updated_at = new Date().toISOString();
      setLocal(KEY_BATCHES, current);
    }
  },

  async updateBatch(id: string, updates: Partial<Batch>): Promise<Batch | null> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('batches')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single());

    const current = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);
    const index = current.findIndex(b => b.id === id);
    if (index === -1) return null;
    current[index] = { ...current[index], ...updates, updated_at: new Date().toISOString() };
    setLocal(KEY_BATCHES, current);
    return current[index];
  },

  async deleteBatch(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) { await q(supabase.from('batches').delete().eq('id', id)); return true; }

    const current = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);
    const filtered = current.filter(b => b.id !== id);
    setLocal(KEY_BATCHES, filtered);
    return true;
  },

  // -------------------------------------------------------------
  // MOVIMIENTOS DE INVENTARIO
  // -------------------------------------------------------------
  async getMovements(): Promise<InventoryMovement[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('inventory_movements')
          .select('*, material:materials_and_products(*), batch:batches(*), from_warehouse:warehouses!from_warehouse_id(*), to_warehouse:warehouses!to_warehouse_id(*)')
          .order('created_at', { ascending: false }));

    const movements = getLocal<InventoryMovement[]>(KEY_MOVEMENTS, INITIAL_MOVEMENTS);
    const materials = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const batches = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);
    const warehouses = getLocal<Warehouse[]>(KEY_WAREHOUSES, INITIAL_WAREHOUSES);

    return movements.map(m => ({
      ...m,
      material: materials.find(mat => mat.id === m.material_id),
      batch: batches.find(b => b.id === m.batch_id),
      from_warehouse: warehouses.find(w => w.id === m.from_warehouse_id),
      to_warehouse: warehouses.find(w => w.id === m.to_warehouse_id)
    }));
  },

  async recordMovement(item: Omit<InventoryMovement, 'id'>): Promise<InventoryMovement> {
    const newItem: InventoryMovement = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `e-${Date.now()}`
    };

    const supabase = getSupabase();
    if (supabase) return q(supabase.from('inventory_movements').insert(newItem).select().single());

    // Actualización local de Kardex y Stock
    const movements = getLocal<InventoryMovement[]>(KEY_MOVEMENTS, INITIAL_MOVEMENTS);
    setLocal(KEY_MOVEMENTS, [newItem, ...movements]);

    // Actualiza el stock del material
    const materials = getLocal<MaterialProduct[]>(KEY_MATERIALS, INITIAL_MATERIALS);
    const matIndex = materials.findIndex(m => m.id === newItem.material_id);
    if (matIndex !== -1) {
      const mat = materials[matIndex];
      let delta = 0;
      if (['reception', 'production_output'].includes(newItem.movement_type)) {
        delta = Number(newItem.quantity);
      } else if (['dispatch', 'production_intake', 'waste_adjustment'].includes(newItem.movement_type)) {
        delta = -Number(newItem.quantity);
      }
      mat.current_stock = Math.max(0, mat.current_stock + delta);
      mat.updated_at = new Date().toISOString();
      setLocal(KEY_MATERIALS, materials);
    }

    return newItem;
  },

  // -------------------------------------------------------------
  // CERTIFICADOS DE VALORIZACIÓN
  // -------------------------------------------------------------
  async getCertificates(): Promise<ValorizationCertificate[]> {
    const supabase = getSupabase();
    if (supabase) return q(supabase
          .from('valorization_certificates')
          .select('*, stakeholder:stakeholders(*), batch:batches(*)')
          .order('issue_date', { ascending: false }));

    const certs = getLocal<ValorizationCertificate[]>(KEY_CERTS, INITIAL_CERTIFICATES);
    const stakeholders = getLocal<Stakeholder[]>(KEY_STAKEHOLDERS, INITIAL_STAKEHOLDERS);
    const batches = getLocal<Batch[]>(KEY_BATCHES, INITIAL_BATCHES);

    return certs.map(c => ({
      ...c,
      stakeholder: stakeholders.find(s => s.id === c.stakeholder_id),
      batch: batches.find(b => b.id === c.batch_id)
    }));
  },

  async createCertificate(item: Omit<ValorizationCertificate, 'id' | 'created_at'>): Promise<ValorizationCertificate> {
    const newItem: ValorizationCertificate = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabase();
    if (supabase) return q(supabase.from('valorization_certificates').insert(newItem).select().single());

    const current = getLocal<ValorizationCertificate[]>(KEY_CERTS, INITIAL_CERTIFICATES);
    setLocal(KEY_CERTS, [newItem, ...current]);
    return newItem;
  },

  // -------------------------------------------------------------
  // CONTROL DE CALIDAD DE LABORATORIO (QC)
  // -------------------------------------------------------------
  async getQualityTests(): Promise<QualityControlTest[]> {
    const tests = getLocal<QualityControlTest[]>(KEY_QC, INITIAL_QC_TESTS);
    const batches = await this.getBatches();
    return tests.map(t => ({
      ...t,
      batch: batches.find(b => b.id === t.batch_id)
    }));
  },

  async createQualityTest(item: Omit<QualityControlTest, 'id' | 'created_at'>): Promise<QualityControlTest> {
    const newItem: QualityControlTest = {
      ...item,
      id: `qc-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    const current = getLocal<QualityControlTest[]>(KEY_QC, INITIAL_QC_TESTS);
    setLocal(KEY_QC, [newItem, ...current]);
    return newItem;
  },

  // -------------------------------------------------------------
  // ÓRDENES DE PRODUCCIÓN & BALANCE DE MASA
  // -------------------------------------------------------------
  async getProductionOrders(): Promise<ProductionOrder[]> {
    const orders = getLocal<ProductionOrder[]>(KEY_PRODUCTION, INITIAL_PRODUCTION_ORDERS);
    const materials = await this.getMaterials();
    return orders.map(o => ({
      ...o,
      input_material: materials.find(m => m.id === o.input_material_id),
      output_material: materials.find(m => m.id === o.output_material_id)
    }));
  },

  async createProductionOrder(item: Omit<ProductionOrder, 'id'>): Promise<ProductionOrder> {
    const newItem: ProductionOrder = {
      ...item,
      id: `op-${Date.now()}`
    };
    const current = getLocal<ProductionOrder[]>(KEY_PRODUCTION, INITIAL_PRODUCTION_ORDERS);
    setLocal(KEY_PRODUCTION, [newItem, ...current]);
    return newItem;
  },

  // -------------------------------------------------------------
  // METAS LEY REP
  // -------------------------------------------------------------
  async getRepTargets(): Promise<RepTargetCompliance[]> {
    const targets = getLocal<RepTargetCompliance[]>(KEY_REP, INITIAL_REP_TARGETS);
    const stakeholders = await this.getStakeholders();
    return targets.map(t => ({
      ...t,
      stakeholder: stakeholders.find(s => s.id === t.stakeholder_id)
    }));
  },

  // -------------------------------------------------------------
  // MÉTRICAS KPI DE IMPACTO AMBIENTAL Y OPERACIÓN
  // -------------------------------------------------------------
  async getKpiMetrics(): Promise<KpiMetrics> {
    const materials = await this.getMaterials();
    const batches = await this.getBatches();
    const certificates = await this.getCertificates();
    const qcTests = await this.getQualityTests();
    const prodOrders = await this.getProductionOrders();

    // Total reciclado histórico certificado
    const totalRecycledKg = certificates.reduce((acc, c) => acc + Number(c.total_kg_valorized || 0), 0);
    const totalCo2AvoidedKg = certificates.reduce((acc, c) => acc + Number(c.co2_avoided_kg || 0), 0);
    const totalWaterSavedLiters = certificates.reduce((acc, c) => acc + Number(c.water_saved_liters || 0), 0);
    const totalOilSavedBarrels = certificates.reduce((acc, c) => acc + Number(c.oil_saved_barrels || 0), 0);

    // Lotes activos
    const activeBatchesCount = batches.filter(b => b.status !== 'dispatched').length;

    // Alertas de stock crítico
    const criticalStockAlertsCount = materials.filter(m => m.current_stock <= m.minimum_stock).length;

    // Stock total en Kg
    const totalStockKg = materials
      .filter(m => m.unit === 'kg' || m.unit === 'ton')
      .reduce((acc, m) => acc + (m.unit === 'ton' ? m.current_stock * 1000 : m.current_stock), 0);

    // Productos terminados (unidades)
    const totalFinishedProductsUnits = materials
      .filter(m => m.category === 'finished_product' && m.unit === 'units')
      .reduce((acc, m) => acc + m.current_stock, 0);

    // Promedio de rendimiento de masa (% yield)
    const avgYield = prodOrders.length > 0 
      ? Number((prodOrders.reduce((acc, p) => acc + p.yield_percentage, 0) / prodOrders.length).toFixed(1))
      : 95.8;

    // Tasa de aprobación en control de calidad (%)
    const approvedQc = qcTests.filter(q => q.status === 'approved').length;
    const qcRate = qcTests.length > 0 
      ? Math.round((approvedQc / qcTests.length) * 100)
      : 100;

    return {
      totalRecycledKg,
      totalCo2AvoidedKg,
      totalWaterSavedLiters,
      totalOilSavedBarrels,
      activeBatchesCount,
      criticalStockAlertsCount,
      totalStockKg,
      totalFinishedProductsUnits,
      averageYieldPercentage: avgYield,
      qualityApprovalRate: qcRate
    };
  },

  // -------------------------------------------------------------
  // RESET A DATOS INICIALES (Para demostración)
  // -------------------------------------------------------------
  resetToInitialDemo(): void {
    localStorage.removeItem(KEY_WAREHOUSES);
    localStorage.removeItem(KEY_STAKEHOLDERS);
    localStorage.removeItem(KEY_MATERIALS);
    localStorage.removeItem(KEY_BATCHES);
    localStorage.removeItem(KEY_MOVEMENTS);
    localStorage.removeItem(KEY_CERTS);
    localStorage.removeItem(KEY_QC);
    localStorage.removeItem(KEY_PRODUCTION);
    localStorage.removeItem(KEY_REP);
  }
};
