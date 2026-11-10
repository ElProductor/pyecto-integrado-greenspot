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
  water_saved_liters: number;
  oil_saved_barrels: number;
  final_destination_product: string;
  signer_name: string;
  signer_title?: string;
  pdf_storage_url?: string;
  qr_verification_code: string;
  created_at?: string;
  // Joins
  stakeholder?: Stakeholder;
  batch?: Batch;
}

// -------------------------------------------------------------
// CONTROL DE CALIDAD DE LABORATORIO (QC)
// -------------------------------------------------------------
export interface QualityControlTest {
  id: string;
  test_number: string;
  batch_id: string;
  tester_name: string;
  test_date: string;
  mfi_measured: number;
  density_measured: number;
  moisture_percentage: number;
  ash_content_percentage: number;
  tensile_strength_mpa: number;
  status: 'approved' | 'rejected' | 'conditional';
  notes?: string;
  created_at?: string;
  batch?: Batch;
}

// -------------------------------------------------------------
// ÓRDENES DE PRODUCCIÓN & BALANCE DE MASA
// -------------------------------------------------------------
export interface ProductionOrder {
  id: string;
  order_number: string;
  line_name: string;
  input_material_id: string;
  output_material_id: string;
  input_weight_kg: number;
  output_weight_kg: number;
  scrap_weight_kg: number;
  yield_percentage: number;
  status: 'in_progress' | 'completed' | 'paused';
  start_date: string;
  completion_date?: string;
  supervisor_name: string;
  input_material?: MaterialProduct;
  output_material?: MaterialProduct;
}

// -------------------------------------------------------------
// METAS LEY REP
// -------------------------------------------------------------
export interface RepTargetCompliance {
  id: string;
  stakeholder_id: string;
  year: number;
  annual_target_kg: number;
  current_valorized_kg: number;
  compliance_percentage: number;
  status: 'on_track' | 'at_risk' | 'achieved';
  stakeholder?: Stakeholder;
}

export interface KpiMetrics {
  totalRecycledKg: number;
  totalCo2AvoidedKg: number;
  totalWaterSavedLiters: number;
  totalOilSavedBarrels: number;
  activeBatchesCount: number;
  criticalStockAlertsCount: number;
  totalStockKg: number;
  totalFinishedProductsUnits: number;
  averageYieldPercentage: number;
  qualityApprovalRate: number;
}

// -------------------------------------------------------------
// CONTROL DE ACCESO Y ROLES (IAM)
// -------------------------------------------------------------
export type UserRole = 'admin' | 'operator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  plantLocation: string;
  avatarInitials: string;
}

export interface IAMPermissions {
  canViewAllTabs: boolean;
  canViewClients: boolean;
  canManageClients: boolean;
  canDeleteRecords: boolean;
  canViewFinancials: boolean;
  canEditTechnicalSpecs: boolean;
  canIssueCertificates: boolean;
  canAccessDatabaseSettings: boolean;
  canExportDatabase: boolean;
  canRecordMovements: boolean;
  canWeighTrucks: boolean;
  canAdvanceBatches: boolean;
  canAdjustPhysicalStock: boolean;
}

export interface StockRow { material_id: string; warehouse_id: string; quantity: number }

export interface Perfil { id: string; full_name: string; email: string; role: UserRole; is_active: boolean; last_seen_at?: string | null }
