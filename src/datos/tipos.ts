export type PolymerType = 'HDPE' | 'LDPE' | 'PP' | 'EPS' | 'PET' | 'OTHER';

export type CategoryType = 'raw_material' | 'in_process' | 'pellet' | 'finished_product' | 'supplies';

export type UnitMeasure = 'kg' | 'ton' | 'units' | 'big_bag' | 'm3';

export type BatchStatus = 'received' | 'washing_sorting' | 'shredded' | 'pelletized' | 'dispatched' | 'quarantine';

export type MovementType = 
  | 'reception'           // Entrada de residuos/materia prima
  | 'dispatch'            // Venta o salida de producto
  | 'production_intake'   // Consumo hacia molienda/extrusión
  | 'production_output'   // Generación de pellets o productos
  | 'internal_transfer'   // Traslado entre bodegas
  | 'waste_adjustment'    // Ajuste de merma
  | 'count_adjustment_in'; // Sobrante encontrado en conteo físico

export type StakeholderType = 'generator_supplier' | 'buyer_customer' | 'both';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  manager_name: string;
  capacity_tons: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  type: StakeholderType;
  tax_id: string; // RUT
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  industry_sector: string; // salmoniculture, mussel_farming, fisheries, etc.
  notes?: string;
  created_at?: string;
}

export interface MaterialProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  polymer_type: PolymerType;
  category: CategoryType;
  unit: UnitMeasure;
  density_g_cm3?: number | null;
  mfi_melt_flow_index?: number | null; // Melt flow index para pellets
  color: string;
  minimum_stock: number;
  current_stock: number;
  unit_cost_usd: number;
  unit_price_usd: number;
  co2_factor_kg: number; // Factor de ahorro CO2eq por kg (ej: 1.85)
  image_url?: string;
  safety_data_sheet_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Batch {
  id: string;
  created_by?: string | null;
  batch_number: string;
  material_id: string;
  supplier_id?: string;
  warehouse_id?: string;
  initial_weight_kg: number;
  current_weight_kg: number;
  impurity_percentage: number;
  reception_date: string;
  status: BatchStatus;
  marine_origin_zone?: string;
  weighing_ticket_url?: string;
  inspection_photo_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joins opcionales
  material?: MaterialProduct;
  supplier?: Stakeholder;
  warehouse?: Warehouse;
}

export interface InventoryMovement {
  id: string;
  movement_number: string;
  movement_type: MovementType;
  material_id: string;
  batch_id?: string | null;
  from_warehouse_id?: string | null;
  to_warehouse_id?: string | null;
  quantity: number;
  unit: UnitMeasure;
  operator_name: string;
  reference_doc?: string;
  notes?: string;
  document_url?: string;
  created_at: string;
  created_by?: string | null;
  // Joins opcionales
  material?: MaterialProduct;
  batch?: Batch;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}

export interface ValorizationCertificate {
  id: string;
  certificate_code: string;
  stakeholder_id: string;
  batch_id?: string | null;
  issue_date: string;
  waste_type: string;
  total_kg_valorized: number;
  co2_avoided_kg: number;
  water_saved_liters?: number | null;
  oil_saved_barrels?: number | null;
  status?: 'vigente' | 'anulado';
  annulled_reason?: string | null;
  annulled_at?: string | null;
  final_destination_product: string;
  signer_name: string;
  signer_title?: string;
  pdf_storage_url?: string;
  created_at?: string;
  // Joins
  stakeholder?: Stakeholder;
  batch?: Batch;
}
// -------------------------------------------------------------
// USUARIOS Y ROLES
// -------------------------------------------------------------
export type UserRole = 'admin' | 'operator';

export interface StockRow { material_id: string; warehouse_id: string; quantity: number }

export interface Perfil { id: string; full_name: string; email: string; role: UserRole; is_active: boolean; last_seen_at?: string | null }
