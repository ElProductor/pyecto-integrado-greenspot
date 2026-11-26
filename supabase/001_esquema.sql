-- ==============================================================================
-- GREENSPOT · 001 · Esquema: tablas, tipos, triggers de stock y RLS base
-- Schema DDL para Supabase (PostgreSQL) con DB Storage, RLS y Triggers
-- Empresa: Greenspot SpA (Economía Circular y Valorización de Plásticos)
-- ==============================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE DOMINIO GREENSPOT
DO $$ BEGIN
    CREATE TYPE polymer_type_enum AS ENUM ('HDPE', 'LDPE', 'PP', 'EPS', 'PET', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE category_type_enum AS ENUM ('raw_material', 'in_process', 'pellet', 'finished_product', 'supplies');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_measure_enum AS ENUM ('kg', 'ton', 'units', 'big_bag', 'm3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE batch_status_enum AS ENUM ('received', 'washing_sorting', 'shredded', 'pelletized', 'dispatched', 'quarantine');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type_enum AS ENUM (
        'reception',           -- Entrada de residuos/materia prima
        'dispatch',            -- Venta o salida de producto
        'production_intake',   -- Consumo de materia prima hacia molienda/extrusión
        'production_output',   -- Generación de pellets o eco-productos terminados
        'internal_transfer',   -- Traslado entre bodegas/plantas
        'waste_adjustment'     -- Ajuste por merma/descontaminación
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stakeholder_type_enum AS ENUM ('generator_supplier', 'buyer_customer', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA: BODEGAS Y PATIOS DE ACOPIO (Warehouses)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    location VARCHAR(200) NOT NULL,
    manager_name VARCHAR(100),
    capacity_tons NUMERIC(10, 2) DEFAULT 500.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: CLIENTES Y GENERADORES DE RESIDUOS (Stakeholders)
CREATE TABLE IF NOT EXISTS public.stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    type stakeholder_type_enum NOT NULL DEFAULT 'generator_supplier',
    tax_id VARCHAR(20) NOT NULL, -- RUT chileno (ej: 76.123.456-7)
    contact_email VARCHAR(100),
    contact_phone VARCHAR(50),
    address VARCHAR(200),
    city VARCHAR(100) DEFAULT 'Puerto Montt',
    industry_sector VARCHAR(100) DEFAULT 'salmoniculture', -- Acuicultura, Mitilicultura, Pesca, Agricultura
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: CATÁLOGO DE MATERIALES Y PRODUCTOS
CREATE TABLE IF NOT EXISTS public.materials_and_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    polymer_type polymer_type_enum NOT NULL,
    category category_type_enum NOT NULL,
    unit unit_measure_enum NOT NULL DEFAULT 'kg',
    density_g_cm3 NUMERIC(6, 4),
    mfi_melt_flow_index NUMERIC(6, 2), -- Índice de fluidez en pellets (g/10min)
    color VARCHAR(50) DEFAULT 'Negro',
    minimum_stock NUMERIC(12, 2) DEFAULT 1000.00,
    current_stock NUMERIC(12, 2) DEFAULT 0.00,
    unit_cost_usd NUMERIC(10, 2) DEFAULT 0.00,
    unit_price_usd NUMERIC(10, 2) DEFAULT 0.00,
    co2_factor_kg NUMERIC(6, 3) DEFAULT 1.850, -- Kg de CO2 ahorrado por cada Kg reciclado
    image_url TEXT, -- Almacenado en Supabase Storage (bucket: greenspot-media)
    safety_data_sheet_url TEXT, -- Ficha técnica en Supabase Storage (bucket: greenspot-docs)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: LOTES Y TRAZABILIDAD (Batches)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials_and_products(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    initial_weight_kg NUMERIC(12, 2) NOT NULL,
    current_weight_kg NUMERIC(12, 2) NOT NULL,
    impurity_percentage NUMERIC(5, 2) DEFAULT 2.50,
    reception_date TIMESTAMPTZ DEFAULT NOW(),
    status batch_status_enum NOT NULL DEFAULT 'received',
    marine_origin_zone VARCHAR(150), -- Ej: Fiordo Reloncaví, Quellón, Melinka
    weighing_ticket_url TEXT, -- Ticket de báscula en Supabase Storage
    inspection_photo_url TEXT, -- Foto de recepción en Supabase Storage
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: STOCK POR BODEGA ESPECÍFICA
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.materials_and_products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    location_bin VARCHAR(50) DEFAULT 'Patio Principal',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, warehouse_id)
);

-- 8. TABLA: MOVIMIENTOS DE INVENTARIO (Kardex)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    movement_type movement_type_enum NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials_and_products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit unit_measure_enum NOT NULL DEFAULT 'kg',
    operator_name VARCHAR(100) NOT NULL,
    reference_doc VARCHAR(100), -- Guía de Despacho, Factura o N° de Pesaje
    notes TEXT,
    document_url TEXT, -- Documento adjunto en Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA: CERTIFICADOS DE VALORIZACIÓN Y LEY REP (Triple Impacto)
CREATE TABLE IF NOT EXISTS public.valorization_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_code VARCHAR(50) UNIQUE NOT NULL,
    stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    waste_type VARCHAR(150) NOT NULL, -- Ej: Boyas y Flotadores HDPE en Desuso
    total_kg_valorized NUMERIC(12, 2) NOT NULL,
    co2_avoided_kg NUMERIC(12, 2) NOT NULL,
    water_saved_liters NUMERIC(12, 2) NOT NULL,
    oil_saved_barrels NUMERIC(10, 2) NOT NULL,
    final_destination_product VARCHAR(150) DEFAULT 'Pellet Reciclado Greenspot HDPE / Mobiliario Urbano',
    signer_name VARCHAR(100) DEFAULT 'Benjamín González - Dirección Operaciones',
    signer_title VARCHAR(100) DEFAULT 'Greenspot / Red Resiter Economía Circular',
    pdf_storage_url TEXT, -- PDF generado y guardado en Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TRIGGERS AUTOMÁTICOS PARA CONTROL DE INVENTARIO
-- ==============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_materials_updated_at
BEFORE UPDATE ON public.materials_and_products
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER trg_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Función de trigger: actualiza automáticamente el stock general y por bodega en cada movimiento
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Casos que aumentan el stock en la bodega de destino (to_warehouse_id)
    IF NEW.movement_type IN ('reception', 'production_output') THEN
        IF NEW.to_warehouse_id IS NOT NULL THEN
            INSERT INTO public.inventory_stock (material_id, warehouse_id, quantity, updated_at)
            VALUES (NEW.material_id, NEW.to_warehouse_id, NEW.quantity, NOW())
            ON CONFLICT (material_id, warehouse_id)
            DO UPDATE SET quantity = public.inventory_stock.quantity + NEW.quantity, updated_at = NOW();
        END IF;
        -- Actualiza stock global en el catálogo
        UPDATE public.materials_and_products
        SET current_stock = current_stock + NEW.quantity, updated_at = NOW()
        WHERE id = NEW.material_id;

    -- 2. Casos que descuentan stock de la bodega de origen (from_warehouse_id)
    ELSIF NEW.movement_type IN ('dispatch', 'production_intake', 'waste_adjustment') THEN
        IF NEW.from_warehouse_id IS NOT NULL THEN
            UPDATE public.inventory_stock
            SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = NOW()
            WHERE material_id = NEW.material_id AND warehouse_id = NEW.from_warehouse_id;
        END IF;
        -- Actualiza stock global en el catálogo
        UPDATE public.materials_and_products
        SET current_stock = GREATEST(0, current_stock - NEW.quantity), updated_at = NOW()
        WHERE id = NEW.material_id;

    -- 3. Traslado interno entre bodegas
    ELSIF NEW.movement_type = 'internal_transfer' THEN
        IF NEW.from_warehouse_id IS NOT NULL THEN
            UPDATE public.inventory_stock
            SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = NOW()
            WHERE material_id = NEW.material_id AND warehouse_id = NEW.from_warehouse_id;
        END IF;
        IF NEW.to_warehouse_id IS NOT NULL THEN
            INSERT INTO public.inventory_stock (material_id, warehouse_id, quantity, updated_at)
            VALUES (NEW.material_id, NEW.to_warehouse_id, NEW.quantity, NOW())
            ON CONFLICT (material_id, warehouse_id)
            DO UPDATE SET quantity = public.inventory_stock.quantity + NEW.quantity, updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- ==============================================================================
-- 11. POLÍTICAS DE SUPABASE STORAGE (Buckets)
-- ==============================================================================
-- Inserción de los buckets principales en storage.buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('greenspot-media', 'greenspot-media', true),
    ('greenspot-docs', 'greenspot-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de lectura pública para Storage
CREATE POLICY "Acceso Publico a Media de Greenspot" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'greenspot-media');

CREATE POLICY "Subida Permitida en Media de Greenspot" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'greenspot-media');

CREATE POLICY "Acceso Publico a Documentos de Greenspot" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'greenspot-docs');

CREATE POLICY "Subida Permitida en Documentos de Greenspot" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'greenspot-docs');

-- ==============================================================================
-- 12. HABILITAR ROW LEVEL SECURITY (RLS) CON ACCESO COMPLETO PERMISIVO
-- ==============================================================================
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_and_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valorization_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura y escritura a anon y autenticados en warehouses" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en stakeholders" ON public.stakeholders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en materials" ON public.materials_and_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en stock" ON public.inventory_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en movements" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura a anon y autenticados en certs" ON public.valorization_certificates FOR ALL USING (true) WITH CHECK (true);
