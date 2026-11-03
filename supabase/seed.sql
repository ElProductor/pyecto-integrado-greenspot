-- ==============================================================================
-- GREENSPOT - DATOS SEMILLA (SEED DATA)
-- Operaciones en Los Lagos / Patagonia (Acuicultura & Economía Circular)
-- ==============================================================================

-- 1. BODEGAS
INSERT INTO public.warehouses (id, code, name, location, manager_name, capacity_tons, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'BOD-PM-ACOPIO', 'Planta Puerto Montt - Patio Acopio y Segregación', 'Ruta 5 Sur Km 1025, Sector Trapén, Puerto Montt', 'Rodrigo Cárdenas', 800.00, true),
    ('a0000000-0000-0000-0000-000000000002', 'BOD-PM-PLANTA', 'Planta Puerto Montt - Nave Extrusión y Peletizado', 'Ruta 5 Sur Km 1025, Nave Central, Puerto Montt', 'Marcela Almonacid', 400.00, true),
    ('a0000000-0000-0000-0000-000000000003', 'BOD-PM-PELLET', 'Planta Puerto Montt - Bodega y Silos Producto Terminado', 'Ruta 5 Sur Km 1025, Galpón Silos B, Puerto Montt', 'Cristian Vidal', 650.00, true),
    ('a0000000-0000-0000-0000-000000000004', 'BOD-DAL-CHILOE', 'Planta Dalcahue - Centro Acopio y Densificado Chiloé', 'Camino a Tenaún Km 4, Dalcahue, Isla de Chiloé', 'Jorge Bahamonde', 300.00, true)
ON CONFLICT (code) DO NOTHING;

-- 2. GENERADORES Y CLIENTES (STAKEHOLDERS)
INSERT INTO public.stakeholders (id, name, type, tax_id, contact_email, contact_phone, address, city, industry_sector, notes)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'AquaChile S.A.', 'generator_supplier', '96.852.140-5', 'sustentabilidad@aquachile.com', '+56 65 243 0000', 'Cardonal S/N', 'Puerto Montt', 'salmoniculture', 'Generador principal de boyas HDPE y tuberías en centros de cultivo X y XI región.'),
    ('b0000000-0000-0000-0000-000000000002', 'Cermaq Chile', 'generator_supplier', '77.240.190-8', 'medioambiente@cermaq.com', '+56 65 256 3100', 'Chinquihue Km 12', 'Puerto Montt', 'salmoniculture', 'Entregas regulares de cajas de EPS (plumavit) de cosecha y flotadores en desuso.'),
    ('b0000000-0000-0000-0000-000000000003', 'Salmones Camanchaca', 'generator_supplier', '76.104.580-2', 'economia.circular@camanchaca.cl', '+56 65 238 4000', 'Ruta 226 Km 8', 'Puerto Montt', 'salmoniculture', 'Retiro de pasillos flotantes y tuberías HDPE de alimentación.'),
    ('b0000000-0000-0000-0000-000000000004', 'Ecomaderas del Sur SpA', 'buyer_customer', '76.980.120-K', 'compras@ecomaderas.cl', '+56 9 8412 9901', 'Parque Industrial Los Mañíos', 'Osorno', 'manufacturing', 'Comprador de Pellet HDPE negro para perfiles plásticos y postes de viñas.'),
    ('b0000000-0000-0000-0000-000000000005', 'I. Municipalidad de Puerto Montt', 'buyer_customer', '69.190.400-3', 'dimao@puertomontt.cl', '+56 65 226 1600', 'San Felipe 80', 'Puerto Montt', 'municipality', 'Adquisición de composteras domiciliarias Greenspot 120L y basureros comunitarios.')
ON CONFLICT (id) DO NOTHING;

-- 3. CATÁLOGO DE MATERIALES Y PRODUCTOS
INSERT INTO public.materials_and_products (id, code, name, description, polymer_type, category, unit, density_g_cm3, mfi_melt_flow_index, color, minimum_stock, current_stock, unit_cost_usd, unit_price_usd, co2_factor_kg, image_url)
VALUES
    -- MATERIAS PRIMAS (RESIDUOS RECIBIDOS)
    ('c0000000-0000-0000-0000-000000000001', 'RAW-HDPE-BOY', 'Boyas y Flotadores Marinos HDPE en Desuso', 'Boyas de fondeo y boyas perimetrales recuperadas de centros de cultivo acuícola.', 'HDPE', 'raw_material', 'kg', 0.9500, NULL, 'Azul / Amarillo', 5000.00, 34500.00, 0.15, 0.00, 1.850, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000002', 'RAW-HDPE-TUB', 'Tuberías y Pasillos HDPE Acuícolas 400mm', 'Tubos corrugados y lisos de alimentación de peces de alta resistencia a la intemperie.', 'HDPE', 'raw_material', 'kg', 0.9550, NULL, 'Negro', 4000.00, 22100.00, 0.18, 0.00, 1.900, 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000003', 'RAW-EPS-BOX', 'Plumavit EPS (Cajas Térmicas de Cosecha)', 'Poliestireno expandido limpio post-cosecha de salmón y mitílidos.', 'EPS', 'raw_material', 'kg', 0.0250, NULL, 'Blanco', 1500.00, 8900.00, 0.20, 0.00, 2.100, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000004', 'RAW-PP-SACO', 'Maxisacos y Cabos PP Limpios', 'Cabos de fondeo y maxisacos de transporte de insumos libres de orgánicos.', 'PP', 'raw_material', 'kg', 0.9050, NULL, 'Blanco / Azul', 2000.00, 14200.00, 0.12, 0.00, 1.750, 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&auto=format&fit=crop'),

    -- EN PROCESO
    ('c0000000-0000-0000-0000-000000000005', 'PRC-HDPE-FLK', 'Escama / Flake Lavado HDPE Azul', 'Plástico triturado a 8-12mm, descontaminado por centrifugado y secado en planta.', 'HDPE', 'in_process', 'kg', 0.9520, NULL, 'Azul Marino', 3000.00, 18600.00, 0.45, 0.70, 1.850, 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000006', 'PRC-EPS-BLQ', 'Bloque EPS Densificado / Compactado', 'Poliestireno termocompactado en lingotes de 350 kg/m3 para fácil logística y extrusión.', 'EPS', 'in_process', 'kg', 0.3500, NULL, 'Gris Claro', 2000.00, 11400.00, 0.50, 0.85, 2.100, 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop'),

    -- PELLETS (MATERIA PRIMA VALORIZADA)
    ('c0000000-0000-0000-0000-000000000007', 'PEL-HDPE-INJ', 'Pellet Reciclado Greenspot HDPE Inyección Negro', 'Pellet 100% circular filtrado a malla 80. Apto para inyección de cajones, bandejas y piezas.', 'HDPE', 'pellet', 'kg', 0.9540, 0.85, 'Negro Brillante', 5000.00, 48200.00, 0.75, 1.35, 1.850, 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000008', 'PEL-HDPE-EXT', 'Pellet Reciclado Greenspot HDPE Extrusión Tubos', 'Pellet de alto peso molecular con aditivo anti-UV para fabricación de tuberías agrícolas y ductos.', 'HDPE', 'pellet', 'kg', 0.9580, 0.30, 'Negro Carbón', 5000.00, 31500.00, 0.80, 1.45, 1.900, 'https://images.unsplash.com/photo-1590402494587-44b71d7772f6?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000009', 'PEL-PS-CRY', 'Pellet Reciclado Greenspot PS Poliestireno', 'Pellet obtenido de densificación y extrusión de plumavit acuícola EPS para aislación y molduras.', 'EPS', 'pellet', 'kg', 1.0400, 3.20, 'Ámbar Translúcido', 2000.00, 15800.00, 0.82, 1.50, 2.100, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop'),

    -- PRODUCTOS TERMINADOS (ECO-PRODUCTOS DE TRIPLE IMPACTO)
    ('c0000000-0000-0000-0000-000000000010', 'ECO-COMP-120', 'Compostera Domiciliaria Greenspot 120L', 'Fabricada con ~18 kg de boyas y plumavit reciclado. Triple impacto con aireación regulable.', 'HDPE', 'finished_product', 'units', NULL, NULL, 'Verde Bosque / Negro', 50.00, 142.00, 22.00, 48.00, 33.300, 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=600&auto=format&fit=crop'),
    ('c0000000-0000-0000-0000-000000000011', 'ECO-BENCH-URB', 'Banca de Plaza Ecomadera Greenspot 1.8m', 'Estructura robusta 100% plástico reciclado post-acuícola, resistente al agua y salitre.', 'HDPE', 'finished_product', 'units', NULL, NULL, 'Café Roble', 20.00, 45.00, 65.00, 140.00, 83.250, 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&auto=format&fit=crop')
ON CONFLICT (code) DO NOTHING;

-- 4. LOTES ACTIVOS (TRAZABILIDAD DE ORIGEN)
INSERT INTO public.batches (id, batch_number, material_id, supplier_id, warehouse_id, initial_weight_kg, current_weight_kg, impurity_percentage, reception_date, status, marine_origin_zone, notes)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'LOTE-2026-0812', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 14500.00, 14500.00, 2.10, NOW() - INTERVAL '6 days', 'washing_sorting', 'Centro Isla Llancahué, Fiordo Comau', 'Boyas HDPE de fondeo sin incrustaciones mayores. Excelente pureza.'),
    ('d0000000-0000-0000-0000-000000000002', 'LOTE-2026-0825', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 5200.00, 5200.00, 1.20, NOW() - INTERVAL '3 days', 'received', 'Planta Proceso Quellón, Chiloé Sur', 'Cajas de cosecha de EPS limpias, acopiadas para densificadora en Dalcahue.'),
    ('d0000000-0000-0000-0000-000000000003', 'LOTE-2026-0830', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 18200.00, 12000.00, 3.40, NOW() - INTERVAL '10 days', 'shredded', 'Centro Caleta Puelche, Seno Reloncaví', 'Tuberías HDPE cortadas a 1.5m, en proceso de molienda a flake negro.'),
    ('d0000000-0000-0000-0000-000000000004', 'LOTE-2026-0845', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 25000.00, 24500.00, 0.00, NOW() - INTERVAL '2 days', 'pelletized', 'Línea de Extrusión 2, Puerto Montt', 'Producción de pellet inyección negro en big bags de 1.000 kg listo para despacho.')
ON CONFLICT (batch_number) DO NOTHING;

-- 5. MOVIMIENTOS RECIENTES
INSERT INTO public.inventory_movements (id, movement_number, movement_type, material_id, batch_id, from_warehouse_id, to_warehouse_id, quantity, unit, operator_name, reference_doc, notes)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'MOV-2026-0091', 'reception', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', NULL, 'a0000000-0000-0000-0000-000000000001', 14500.00, 'kg', 'Matías Oyarzún', 'Guía Despacho N° 78192 - AquaChile', 'Pesaje en báscula de camión con tolva.'),
    ('e0000000-0000-0000-0000-000000000002', 'MOV-2026-0092', 'production_intake', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 6200.00, 'kg', 'Hugo Mansilla', 'Orden Trabajo OT-412', 'Paso de tuberías a triturador primario.'),
    ('e0000000-0000-0000-0000-000000000003', 'MOV-2026-0093', 'production_output', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', NULL, 'a0000000-0000-0000-0000-000000000003', 25000.00, 'kg', 'Álvaro Barrientos', 'Lote Producción PEL-0845', 'Salida de peletizadora doble husillo.'),
    ('e0000000-0000-0000-0000-000000000004', 'MOV-2026-0094', 'dispatch', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', NULL, 12000.00, 'kg', 'Rodrigo Cárdenas', 'Guía Despacho N° 10842 - Ecomaderas', 'Venta a cliente Ecomaderas del Sur para postes de viñedos.')
ON CONFLICT (movement_number) DO NOTHING;

-- 6. CERTIFICADOS LEY REP EMITIDOS
INSERT INTO public.valorization_certificates (id, certificate_code, stakeholder_id, batch_id, issue_date, waste_type, total_kg_valorized, co2_avoided_kg, water_saved_liters, oil_saved_barrels, final_destination_product, signer_name, qr_verification_code)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'CERT-REP-2026-0089', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', CURRENT_DATE - 4, 'Boyas y Flotadores Marinos HDPE en Desuso', 14500.00, 26825.00, 72500.00, 29.00, 'Pellet Reciclado Greenspot HDPE Inyección Negro', 'Benjamín González - Dirección General Greenspot', 'GREENSPOT-VERIFY-REP-0089-2026'),
    ('f0000000-0000-0000-0000-000000000002', 'CERT-REP-2026-0094', 'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', CURRENT_DATE - 1, 'Cajas Térmicas Plumavit EPS Cosecha de Salmón', 5200.00, 10920.00, 31200.00, 15.60, 'Pellet Reciclado Greenspot PS Poliestireno / Molduras', 'Benjamín González - Dirección General Greenspot', 'GREENSPOT-VERIFY-REP-0094-2026')
ON CONFLICT (certificate_code) DO NOTHING;
