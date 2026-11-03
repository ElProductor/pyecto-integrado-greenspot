import { 
  Warehouse, 
  Stakeholder, 
  MaterialProduct, 
  Batch, 
  InventoryMovement, 
  ValorizationCertificate 
} from '../types';

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    code: 'BOD-PM-ACOPIO',
    name: 'Planta Puerto Montt - Patio Acopio y Segregación',
    location: 'Ruta 5 Sur Km 1025, Sector Trapén, Puerto Montt',
    manager_name: 'Rodrigo Cárdenas',
    capacity_tons: 800.0,
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    code: 'BOD-PM-PLANTA',
    name: 'Planta Puerto Montt - Nave Extrusión y Peletizado',
    location: 'Ruta 5 Sur Km 1025, Nave Central, Puerto Montt',
    manager_name: 'Marcela Almonacid',
    capacity_tons: 400.0,
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    code: 'BOD-PM-PELLET',
    name: 'Planta Puerto Montt - Bodega y Silos Producto Terminado',
    location: 'Ruta 5 Sur Km 1025, Galpón Silos B, Puerto Montt',
    manager_name: 'Cristian Vidal',
    capacity_tons: 650.0,
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    code: 'BOD-DAL-CHILOE',
    name: 'Planta Dalcahue - Centro Acopio y Densificado Chiloé',
    location: 'Camino a Tenaún Km 4, Dalcahue, Isla de Chiloé',
    manager_name: 'Jorge Bahamonde',
    capacity_tons: 300.0,
    is_active: true
  }
];

export const INITIAL_STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'AquaChile S.A.',
    type: 'generator_supplier',
    tax_id: '96.852.140-5',
    contact_email: 'sustentabilidad@aquachile.com',
    contact_phone: '+56 65 243 0000',
    address: 'Cardonal S/N',
    city: 'Puerto Montt',
    industry_sector: 'Acuicultura (Salmonicultura)',
    notes: 'Generador principal de boyas HDPE y tuberías en centros de cultivo X y XI región.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Cermaq Chile',
    type: 'generator_supplier',
    tax_id: '77.240.190-8',
    contact_email: 'medioambiente@cermaq.com',
    contact_phone: '+56 65 256 3100',
    address: 'Chinquihue Km 12',
    city: 'Puerto Montt',
    industry_sector: 'Acuicultura (Salmonicultura)',
    notes: 'Entregas regulares de cajas térmicas de EPS (plumavit) de cosecha y flotadores en desuso.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Salmones Camanchaca',
    type: 'generator_supplier',
    tax_id: '76.104.580-2',
    contact_email: 'economia.circular@camanchaca.cl',
    contact_phone: '+56 65 238 4000',
    address: 'Ruta 226 Km 8',
    city: 'Puerto Montt',
    industry_sector: 'Acuicultura (Salmonicultura)',
    notes: 'Retiro de pasillos flotantes y tuberías HDPE de alimentación de centros marinos.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    name: 'Ecomaderas del Sur SpA',
    type: 'buyer_customer',
    tax_id: '76.980.120-K',
    contact_email: 'compras@ecomaderas.cl',
    contact_phone: '+56 9 8412 9901',
    address: 'Parque Industrial Los Mañíos',
    city: 'Osorno',
    industry_sector: 'Manufactura y Construcción Sustentable',
    notes: 'Comprador habitual de Pellet HDPE negro para perfiles plásticos y postes de viñedos.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    name: 'I. Municipalidad de Puerto Montt',
    type: 'buyer_customer',
    tax_id: '69.190.400-3',
    contact_email: 'dimao@puertomontt.cl',
    contact_phone: '+56 65 226 1600',
    address: 'San Felipe 80',
    city: 'Puerto Montt',
    industry_sector: 'Sector Público y Municipalidades',
    notes: 'Adquisición de composteras domiciliarias Greenspot 120L y basureros comunitarios.'
  }
];

export const INITIAL_MATERIALS: MaterialProduct[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'RAW-HDPE-BOY',
    name: 'Boyas y Flotadores Marinos HDPE en Desuso',
    description: 'Boyas de fondeo y boyas perimetrales recuperadas de centros de cultivo acuícola en la Patagonia.',
    polymer_type: 'HDPE',
    category: 'raw_material',
    unit: 'kg',
    density_g_cm3: 0.95,
    mfi_melt_flow_index: null,
    color: 'Azul / Amarillo',
    minimum_stock: 5000.0,
    current_stock: 34500.0,
    unit_cost_usd: 0.15,
    unit_price_usd: 0.0,
    co2_factor_kg: 1.85,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    code: 'RAW-HDPE-TUB',
    name: 'Tuberías y Pasillos HDPE Acuícolas 400mm',
    description: 'Tubos y ductos de alimentación marina de peces de alta resistencia a radiación UV y salinidad.',
    polymer_type: 'HDPE',
    category: 'raw_material',
    unit: 'kg',
    density_g_cm3: 0.955,
    mfi_melt_flow_index: null,
    color: 'Negro',
    minimum_stock: 4000.0,
    current_stock: 22100.0,
    unit_cost_usd: 0.18,
    unit_price_usd: 0.0,
    co2_factor_kg: 1.9,
    image_url: 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    code: 'RAW-EPS-BOX',
    name: 'Plumavit EPS (Cajas Térmicas de Cosecha)',
    description: 'Poliestireno expandido recolectado de plantas de procesamiento y faenas mitilicultoras.',
    polymer_type: 'EPS',
    category: 'raw_material',
    unit: 'kg',
    density_g_cm3: 0.025,
    mfi_melt_flow_index: null,
    color: 'Blanco',
    minimum_stock: 1500.0,
    current_stock: 8900.0,
    unit_cost_usd: 0.2,
    unit_price_usd: 0.0,
    co2_factor_kg: 2.1,
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    code: 'RAW-PP-SACO',
    name: 'Maxisacos y Cabos PP Limpios',
    description: 'Cabos marinos de fondeo y maxisacos de transporte de insumos libres de contaminantes orgánicos.',
    polymer_type: 'PP',
    category: 'raw_material',
    unit: 'kg',
    density_g_cm3: 0.905,
    mfi_melt_flow_index: null,
    color: 'Blanco / Azul',
    minimum_stock: 2000.0,
    current_stock: 14200.0,
    unit_cost_usd: 0.12,
    unit_price_usd: 0.0,
    co2_factor_kg: 1.75,
    image_url: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    code: 'PRC-HDPE-FLK',
    name: 'Escama / Flake Lavado HDPE Azul',
    description: 'Plástico triturado a 8-12mm, descontaminado por centrifugado y secado en nave de molienda.',
    polymer_type: 'HDPE',
    category: 'in_process',
    unit: 'kg',
    density_g_cm3: 0.952,
    mfi_melt_flow_index: null,
    color: 'Azul Marino',
    minimum_stock: 3000.0,
    current_stock: 18600.0,
    unit_cost_usd: 0.45,
    unit_price_usd: 0.7,
    co2_factor_kg: 1.85,
    image_url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    code: 'PRC-EPS-BLQ',
    name: 'Bloque EPS Densificado / Compactado',
    description: 'Poliestireno termocompactado en lingotes de 350 kg/m3 para extrusión y fabricación de molduras.',
    polymer_type: 'EPS',
    category: 'in_process',
    unit: 'kg',
    density_g_cm3: 0.35,
    mfi_melt_flow_index: null,
    color: 'Gris Claro',
    minimum_stock: 2000.0,
    current_stock: 11400.0,
    unit_cost_usd: 0.5,
    unit_price_usd: 0.85,
    co2_factor_kg: 2.1,
    image_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000007',
    code: 'PEL-HDPE-INJ',
    name: 'Pellet Reciclado Greenspot HDPE Inyección Negro',
    description: 'Pellet 100% circular filtrado a malla 80. Apto para inyección de cajones, bandejas y piezas industriales.',
    polymer_type: 'HDPE',
    category: 'pellet',
    unit: 'kg',
    density_g_cm3: 0.954,
    mfi_melt_flow_index: 0.85,
    color: 'Negro Brillante',
    minimum_stock: 5000.0,
    current_stock: 48200.0,
    unit_cost_usd: 0.75,
    unit_price_usd: 1.35,
    co2_factor_kg: 1.85,
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000008',
    code: 'PEL-HDPE-EXT',
    name: 'Pellet Reciclado Greenspot HDPE Extrusión Tubos',
    description: 'Pellet de alto peso molecular con aditivo anti-UV para fabricación de tuberías agrícolas y ductos.',
    polymer_type: 'HDPE',
    category: 'pellet',
    unit: 'kg',
    density_g_cm3: 0.958,
    mfi_melt_flow_index: 0.3,
    color: 'Negro Carbón',
    minimum_stock: 5000.0,
    current_stock: 31500.0,
    unit_cost_usd: 0.8,
    unit_price_usd: 1.45,
    co2_factor_kg: 1.9,
    image_url: 'https://images.unsplash.com/photo-1590402494587-44b71d7772f6?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000009',
    code: 'PEL-PS-CRY',
    name: 'Pellet Reciclado Greenspot PS Poliestireno',
    description: 'Pellet obtenido de densificación y extrusión de plumavit acuícola EPS para aislación y marcos.',
    polymer_type: 'EPS',
    category: 'pellet',
    unit: 'kg',
    density_g_cm3: 1.04,
    mfi_melt_flow_index: 3.2,
    color: 'Ámbar Translúcido',
    minimum_stock: 2000.0,
    current_stock: 15800.0,
    unit_cost_usd: 0.82,
    unit_price_usd: 1.5,
    co2_factor_kg: 2.1,
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000010',
    code: 'ECO-COMP-120',
    name: 'Compostera Domiciliaria Greenspot 120L',
    description: 'Fabricada con ~18 kg de boyas y plumavit reciclado. Triple impacto con sistema de aireación integrado.',
    polymer_type: 'HDPE',
    category: 'finished_product',
    unit: 'units',
    density_g_cm3: null,
    mfi_melt_flow_index: null,
    color: 'Verde Bosque / Negro',
    minimum_stock: 50.0,
    current_stock: 142.0,
    unit_cost_usd: 22.0,
    unit_price_usd: 48.0,
    co2_factor_kg: 33.3,
    image_url: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=600&auto=format&fit=crop',
    is_active: true
  },
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    code: 'ECO-BENCH-URB',
    name: 'Banca de Plaza Ecomadera Greenspot 1.8m',
    description: 'Estructura robusta 100% plástico reciclado post-acuícola, resistente al agua de mar y salitre.',
    polymer_type: 'HDPE',
    category: 'finished_product',
    unit: 'units',
    density_g_cm3: null,
    mfi_melt_flow_index: null,
    color: 'Café Roble',
    minimum_stock: 20.0,
    current_stock: 45.0,
    unit_cost_usd: 65.0,
    unit_price_usd: 140.0,
    co2_factor_kg: 83.25,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&auto=format&fit=crop',
    is_active: true
  }
];

export const INITIAL_BATCHES: Batch[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    batch_number: 'LOTE-2026-0812',
    material_id: 'c0000000-0000-0000-0000-000000000001',
    supplier_id: 'b0000000-0000-0000-0000-000000000001',
    warehouse_id: 'a0000000-0000-0000-0000-000000000001',
    initial_weight_kg: 14500.0,
    current_weight_kg: 14500.0,
    impurity_percentage: 2.1,
    reception_date: '2026-10-21T09:30:00Z',
    status: 'washing_sorting',
    marine_origin_zone: 'Centro Isla Llancahué, Fiordo Comau',
    notes: 'Boyas HDPE de fondeo sin incrustaciones mayores. Excelente pureza y consistencia.'
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    batch_number: 'LOTE-2026-0825',
    material_id: 'c0000000-0000-0000-0000-000000000003',
    supplier_id: 'b0000000-0000-0000-0000-000000000002',
    warehouse_id: 'a0000000-0000-0000-0000-000000000004',
    initial_weight_kg: 5200.0,
    current_weight_kg: 5200.0,
    impurity_percentage: 1.2,
    reception_date: '2026-10-24T11:15:00Z',
    status: 'received',
    marine_origin_zone: 'Planta Proceso Quellón, Chiloé Sur',
    notes: 'Cajas de cosecha de EPS limpias, listas para alimentar la densificadora en Dalcahue.'
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    batch_number: 'LOTE-2026-0830',
    material_id: 'c0000000-0000-0000-0000-000000000002',
    supplier_id: 'b0000000-0000-0000-0000-000000000003',
    warehouse_id: 'a0000000-0000-0000-0000-000000000001',
    initial_weight_kg: 18200.0,
    current_weight_kg: 12000.0,
    impurity_percentage: 3.4,
    reception_date: '2026-10-17T14:40:00Z',
    status: 'shredded',
    marine_origin_zone: 'Centro Caleta Puelche, Seno Reloncaví',
    notes: 'Tuberías HDPE cortadas a 1.5m, en proceso de molienda continua a flake negro.'
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    batch_number: 'LOTE-2026-0845',
    material_id: 'c0000000-0000-0000-0000-000000000007',
    supplier_id: 'b0000000-0000-0000-0000-000000000001',
    warehouse_id: 'a0000000-0000-0000-0000-000000000003',
    initial_weight_kg: 25000.0,
    current_weight_kg: 24500.0,
    impurity_percentage: 0.0,
    reception_date: '2026-10-25T16:00:00Z',
    status: 'pelletized',
    marine_origin_zone: 'Línea de Extrusión 2, Planta Puerto Montt',
    notes: 'Producción de pellet inyección negro en big bags de 1.000 kg listo para despacho.'
  }
];

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    movement_number: 'MOV-2026-0091',
    movement_type: 'reception',
    material_id: 'c0000000-0000-0000-0000-000000000001',
    batch_id: 'd0000000-0000-0000-0000-000000000001',
    from_warehouse_id: null,
    to_warehouse_id: 'a0000000-0000-0000-0000-000000000001',
    quantity: 14500.0,
    unit: 'kg',
    operator_name: 'Matías Oyarzún',
    reference_doc: 'Guía Despacho N° 78192 - AquaChile',
    notes: 'Pesaje oficial en báscula de camión con tolva.',
    created_at: '2026-10-21T09:45:00Z'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    movement_number: 'MOV-2026-0092',
    movement_type: 'production_intake',
    material_id: 'c0000000-0000-0000-0000-000000000002',
    batch_id: 'd0000000-0000-0000-0000-000000000003',
    from_warehouse_id: 'a0000000-0000-0000-0000-000000000001',
    to_warehouse_id: 'a0000000-0000-0000-0000-000000000002',
    quantity: 6200.0,
    unit: 'kg',
    operator_name: 'Hugo Mansilla',
    reference_doc: 'Orden Trabajo OT-412',
    notes: 'Paso de tuberías de patio a triturador primario.',
    created_at: '2026-10-22T11:20:00Z'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    movement_number: 'MOV-2026-0093',
    movement_type: 'production_output',
    material_id: 'c0000000-0000-0000-0000-000000000007',
    batch_id: 'd0000000-0000-0000-0000-000000000004',
    from_warehouse_id: null,
    to_warehouse_id: 'a0000000-0000-0000-0000-000000000003',
    quantity: 25000.0,
    unit: 'kg',
    operator_name: 'Álvaro Barrientos',
    reference_doc: 'Lote Producción PEL-0845',
    notes: 'Salida de peletizadora doble husillo hacia big bags certificados.',
    created_at: '2026-10-25T17:00:00Z'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    movement_number: 'MOV-2026-0094',
    movement_type: 'dispatch',
    material_id: 'c0000000-0000-0000-0000-000000000007',
    batch_id: 'd0000000-0000-0000-0000-000000000004',
    from_warehouse_id: 'a0000000-0000-0000-0000-000000000003',
    to_warehouse_id: null,
    quantity: 12000.0,
    unit: 'kg',
    operator_name: 'Rodrigo Cárdenas',
    reference_doc: 'Guía Despacho N° 10842 - Ecomaderas',
    notes: 'Despacho a cliente Ecomaderas del Sur para postes plásticos.',
    created_at: '2026-10-26T14:30:00Z'
  }
];

export const INITIAL_CERTIFICATES: ValorizationCertificate[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    certificate_code: 'CERT-REP-2026-0089',
    stakeholder_id: 'b0000000-0000-0000-0000-000000000001',
    batch_id: 'd0000000-0000-0000-0000-000000000001',
    issue_date: '2026-10-23',
    waste_type: 'Boyas y Flotadores Marinos HDPE en Desuso',
    total_kg_valorized: 14500.0,
    co2_avoided_kg: 26825.0,
    water_saved_liters: 72500.0,
    oil_saved_barrels: 29.0,
    final_destination_product: 'Pellet Reciclado Greenspot HDPE Inyección Negro',
    signer_name: 'Benjamín González - Dirección General Greenspot',
    signer_title: 'Greenspot / Red Resiter Economía Circular',
    qr_verification_code: 'GREENSPOT-VERIFY-REP-0089-2026',
    created_at: '2026-10-23T15:00:00Z'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    certificate_code: 'CERT-REP-2026-0094',
    stakeholder_id: 'b0000000-0000-0000-0000-000000000002',
    batch_id: 'd0000000-0000-0000-0000-000000000002',
    issue_date: '2026-10-26',
    waste_type: 'Cajas Térmicas Plumavit EPS Cosecha de Salmón',
    total_kg_valorized: 5200.0,
    co2_avoided_kg: 10920.0,
    water_saved_liters: 31200.0,
    oil_saved_barrels: 15.6,
    final_destination_product: 'Pellet Reciclado Greenspot PS Poliestireno / Molduras',
    signer_name: 'Benjamín González - Dirección General Greenspot',
    signer_title: 'Greenspot / Red Resiter Economía Circular',
    qr_verification_code: 'GREENSPOT-VERIFY-REP-0094-2026',
    created_at: '2026-10-26T18:20:00Z'
  }
];


// -------------------------------------------------------------
// CONTROL DE CALIDAD DE LABORATORIO (QC)
// -------------------------------------------------------------
export const INITIAL_QC_TESTS = [
  {
    id: 'qc-0000000-0001',
    test_number: 'QC-2026-0845',
    batch_id: 'd0000000-0000-0000-0000-000000000004',
    tester_name: 'Ing. Loreto Oyarzún (Jefa Calidad)',
    test_date: '2026-10-26T10:30:00Z',
    mfi_measured: 0.84,
    density_measured: 0.954,
    moisture_percentage: 0.05,
    ash_content_percentage: 0.12,
    tensile_strength_mpa: 25.8,
    status: 'approved' as const,
    notes: 'Pellet homogéneo, excelente dispersión de negro de humo, libre de contaminantes volátiles.'
  },
  {
    id: 'qc-0000000-0002',
    test_number: 'QC-2026-0830',
    batch_id: 'd0000000-0000-0000-0000-000000000003',
    tester_name: 'Téc. Carlos Mansilla',
    test_date: '2026-10-22T14:00:00Z',
    mfi_measured: 0.31,
    density_measured: 0.958,
    moisture_percentage: 0.09,
    ash_content_percentage: 0.18,
    tensile_strength_mpa: 28.2,
    status: 'approved' as const,
    notes: 'Flake molido cumple con granulometría de 10mm para alimentación continua de extrusora.'
  }
];

// -------------------------------------------------------------
// ÓRDENES DE PRODUCCIÓN & BALANCE DE MASA
// -------------------------------------------------------------
export const INITIAL_PRODUCTION_ORDERS = [
  {
    id: 'op-0000000-0001',
    order_number: 'OP-2026-104',
    line_name: 'Línea de Extrusión y Peletizado 2 (Trapén)',
    input_material_id: 'c0000000-0000-0000-0000-000000000005', // Flake HDPE Azul
    output_material_id: 'c0000000-0000-0000-0000-000000000007', // Pellet HDPE Inyección
    input_weight_kg: 26200.0,
    output_weight_kg: 25000.0,
    scrap_weight_kg: 1200.0,
    yield_percentage: 95.4,
    status: 'completed' as const,
    start_date: '2026-10-24T08:00:00Z',
    completion_date: '2026-10-25T16:00:00Z',
    supervisor_name: 'Hugo Mansilla'
  },
  {
    id: 'op-0000000-0002',
    order_number: 'OP-2026-105',
    line_name: 'Línea de Densificado y Molienda (Dalcahue)',
    input_material_id: 'c0000000-0000-0000-0000-000000000003', // Plumavit EPS
    output_material_id: 'c0000000-0000-0000-0000-000000000006', // Bloque EPS Densificado
    input_weight_kg: 8500.0,
    output_weight_kg: 8200.0,
    scrap_weight_kg: 300.0,
    yield_percentage: 96.5,
    status: 'in_progress' as const,
    start_date: '2026-10-27T08:30:00Z',
    supervisor_name: 'Jorge Bahamonde'
  }
];

// -------------------------------------------------------------
// METAS LEY REP (CHILE)
// -------------------------------------------------------------
export const INITIAL_REP_TARGETS = [
  {
    id: 'rep-0000000-0001',
    stakeholder_id: 'b0000000-0000-0000-0000-000000000001', // AquaChile
    year: 2026,
    annual_target_kg: 60000.0,
    current_valorized_kg: 48500.0,
    compliance_percentage: 80.8,
    status: 'on_track' as const
  },
  {
    id: 'rep-0000000-0002',
    stakeholder_id: 'b0000000-0000-0000-0000-000000000002', // Cermaq Chile
    year: 2026,
    annual_target_kg: 25000.0,
    current_valorized_kg: 23600.0,
    compliance_percentage: 94.4,
    status: 'achieved' as const
  },
  {
    id: 'rep-0000000-0003',
    stakeholder_id: 'b0000000-0000-0000-0000-000000000003', // Camanchaca
    year: 2026,
    annual_target_kg: 40000.0,
    current_valorized_kg: 26800.0,
    compliance_percentage: 67.0,
    status: 'on_track' as const
  }
];
