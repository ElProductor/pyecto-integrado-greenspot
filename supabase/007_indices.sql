-- ==============================================================================
-- GREENSPOT · 007 · Índices de rendimiento
-- Se aplica después de 004 (APLICADO en Supabase el 20-nov-2026). Se puede correr de nuevo sin daño.
-- PostgreSQL indexa solo las claves primarias y los UNIQUE; las claves foráneas no.
-- Estos índices cubren los filtros y uniones que usa la aplicación (kardex, lotes, certificados).
-- No cambia tablas, columnas ni datos.
-- ==============================================================================

-- Kardex: se consulta por material, lote y bodega, y se ordena por fecha.
CREATE INDEX IF NOT EXISTS idx_mov_material_fecha ON public.inventory_movements (material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_lote          ON public.inventory_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_mov_desde         ON public.inventory_movements (from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_mov_hacia         ON public.inventory_movements (to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_mov_fecha         ON public.inventory_movements (created_at DESC);

-- Lotes: por material, proveedor, bodega y fecha de recepción.
CREATE INDEX IF NOT EXISTS idx_lote_material ON public.batches (material_id);
CREATE INDEX IF NOT EXISTS idx_lote_proveedor ON public.batches (supplier_id);
CREATE INDEX IF NOT EXISTS idx_lote_bodega   ON public.batches (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_lote_fecha    ON public.batches (reception_date DESC);

-- Stock: (material_id, warehouse_id) ya es UNIQUE; falta la búsqueda por bodega sola.
CREATE INDEX IF NOT EXISTS idx_stock_bodega ON public.inventory_stock (warehouse_id);

-- Certificados: por empresa (batch_id ya tiene índice único en 004).
CREATE INDEX IF NOT EXISTS idx_cert_empresa ON public.valorization_certificates (stakeholder_id);
