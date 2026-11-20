-- ==============================================================================
-- GREENSPOT · 005 · Cierre de la auditoría de operario del 17-nov-2026 (APLICADO en Supabase el 20-nov-2026)
-- Se aplica DESPUÉS de 004. Se puede correr de nuevo sin daño.
--   GS-SEC-002  Ajustes de conteo/merma sueltos: solo administración.
--   GS-SEC-003  Producción: el producto exige su consumo en la misma operación y no puede superarlo.
--   GS-SEC-004  Tope por movimiento (y por corrección) para el operario, no solo en la recepción.
--   GS-SEC-006  Lote fantasma: certificado solo si el lote tiene entrada vigente en el kardex.
--   GS-SEC-007  Certificado sin tipo de residuo, destino o QR.
--   GS-SEC-008  Fecha de recepción del lote la pone el servidor (salvo admin: importación de planilla).
--   GS-SEC-009  Movimiento con lote de otro material o lote anulado.
--   GS-SEC-010  Unidad del movimiento = unidad del material.
--   GS-SEC-011  Bodega no puede pasar su capacidad.
--   GS-SEC-012  El operario no cambia su nombre (queda grabado en el kardex).
--   GS-SEC-013  Cuentas nuevas quedan inactivas hasta que un admin las active.
--   GS-SEC-014  Carpeta de documentos (certificados): solo administración.
-- ==============================================================================

-- 1. MOVIMIENTOS: reglas extra para quien no es administrador --------------------------------
CREATE OR REPLACE FUNCTION public.check_movement_operario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE es_ajuste BOOLEAN := COALESCE(NEW.reference_doc, '') ~ '^(Anula|Corrige) ';
        lote public.batches; consumo NUMERIC; producto NUMERIC;
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    -- GS-SEC-010: la unidad la decide el material, no el navegador.
    SELECT unit INTO NEW.unit FROM public.materials_and_products WHERE id = NEW.material_id;

    -- GS-SEC-009: el lote debe ser del mismo material (salvo el producto de producción) y no estar anulado.
    IF NEW.batch_id IS NOT NULL AND NOT es_ajuste THEN
        SELECT * INTO lote FROM public.batches WHERE id = NEW.batch_id;
        IF lote.notes LIKE '[ANULADO]%' THEN RAISE EXCEPTION 'El lote % está anulado', lote.batch_number; END IF;
        IF NEW.movement_type <> 'production_output' AND NEW.material_id <> lote.material_id THEN
            RAISE EXCEPTION 'El lote % es de otro material', lote.batch_number;
        END IF;
    END IF;

    IF public.is_admin() THEN RETURN NEW; END IF;

    -- GS-SEC-004: ningún movimiento del operario supera un camión.
    IF NEW.quantity > public.tope_camion() THEN
        RAISE EXCEPTION 'Revisa la cantidad: un movimiento no supera % kg', public.tope_camion();
    END IF;

    -- GS-SEC-002: sobrantes y mermas sueltos (no anulaciones/correcciones) los registra administración.
    IF NOT es_ajuste AND NEW.movement_type IN ('count_adjustment_in', 'waste_adjustment') THEN
        RAISE EXCEPTION 'Las correcciones de conteo las registra administración.';
    END IF;

    -- GS-SEC-003: producción = consumo y producto en la misma operación; el producto no supera el consumo.
    IF NOT es_ajuste AND NEW.movement_type IN ('production_intake', 'production_output') THEN
        IF COALESCE(btrim(NEW.notes), '') = '' THEN RAISE EXCEPTION 'Falta la merma en las notas'; END IF;
        IF NEW.movement_type = 'production_output' THEN
            SELECT COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'production_intake'), 0),
                   COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'production_output'), 0)
              INTO consumo, producto
              FROM public.inventory_movements
             WHERE xmin = pg_current_xact_id()::xid AND created_by = auth.uid()
               AND COALESCE(reference_doc, '') !~ '^(Anula|Corrige) ';
            IF consumo = 0 THEN RAISE EXCEPTION 'El producto se registra junto con el material consumido'; END IF;
            IF producto + NEW.quantity > consumo THEN
                RAISE EXCEPTION 'Se obtienen % kg de % kg consumidos: el producto no puede superar el consumo', producto + NEW.quantity, consumo;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- Corre después de check_movement (orden alfabético de triggers: trg_check_movement < trg_check_movement_operario).
DROP TRIGGER IF EXISTS trg_check_movement_operario ON public.inventory_movements;
CREATE TRIGGER trg_check_movement_operario BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.check_movement_operario();

-- GS-SEC-011: ninguna bodega pasa su capacidad (se revisa después de mover el stock).
CREATE OR REPLACE FUNCTION public.check_capacidad_bodega()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC; cap NUMERIC; nombre TEXT;
BEGIN
    IF auth.uid() IS NULL OR NEW.to_warehouse_id IS NULL THEN RETURN NULL; END IF;
    SELECT capacity_tons * 1000, name INTO cap, nombre FROM public.warehouses WHERE id = NEW.to_warehouse_id;
    SELECT SUM(quantity) INTO total FROM public.inventory_stock WHERE warehouse_id = NEW.to_warehouse_id;
    IF cap IS NOT NULL AND total > cap THEN
        RAISE EXCEPTION 'La bodega % quedaría con % kg y su capacidad es % kg', nombre, total, cap;
    END IF;
    RETURN NULL;
END $$;
-- «trg_z…» para correr después de trg_apply_inventory_movement.
DROP TRIGGER IF EXISTS trg_z_capacidad_bodega ON public.inventory_movements;
CREATE TRIGGER trg_z_capacidad_bodega AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.check_capacidad_bodega();

-- 2. LOTES: la fecha de recepción la pone el servidor (GS-SEC-008) ---------------------------------
CREATE OR REPLACE FUNCTION public.check_batch_fecha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN NEW.reception_date := NOW(); END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_check_batch_fecha ON public.batches;
CREATE TRIGGER trg_check_batch_fecha BEFORE INSERT ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.check_batch_fecha();

-- 3. CERTIFICADOS: lote con entrada real y datos completos (GS-SEC-006, GS-SEC-007) -----------------
CREATE OR REPLACE FUNCTION public.check_certificate_datos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.inventory_movements m
                    WHERE m.batch_id = NEW.batch_id AND m.movement_type = 'reception'
                      AND COALESCE(m.reference_doc, '') !~ '^(Anula|Corrige) '
                      AND NOT EXISTS (SELECT 1 FROM public.inventory_movements a WHERE a.reference_doc = 'Anula ' || m.movement_number)) THEN
        RAISE EXCEPTION 'El lote no tiene una entrada vigente en el kardex: no se puede certificar';
    END IF;
    IF COALESCE(btrim(NEW.waste_type), '') = '' THEN RAISE EXCEPTION 'Falta el tipo de residuo'; END IF;
    IF COALESCE(btrim(NEW.final_destination_product), '') = '' THEN RAISE EXCEPTION 'Falta el destino final'; END IF;
    IF COALESCE(btrim(NEW.qr_verification_code), '') = '' THEN RAISE EXCEPTION 'Falta el código de verificación'; END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_check_certificate_datos ON public.valorization_certificates;
CREATE TRIGGER trg_check_certificate_datos BEFORE INSERT ON public.valorization_certificates
FOR EACH ROW EXECUTE FUNCTION public.check_certificate_datos();

-- 4. PERFILES: el nombre lo cambia administración (GS-SEC-012); cuentas nuevas inactivas (GS-SEC-013) ---
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF NOT public.is_admin() AND (NEW.role <> OLD.role OR NEW.is_active <> OLD.is_active OR NEW.email <> OLD.email
                                  OR NEW.full_name <> OLD.full_name) THEN
        RAISE EXCEPTION 'Solo un administrador puede cambiar nombre, rol, estado o correo';
    END IF;
    IF public.is_admin() AND NEW.id = auth.uid() AND (NEW.role <> 'admin' OR NOT NEW.is_active) THEN
        RAISE EXCEPTION 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo';
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE primero BOOLEAN := NOT EXISTS (SELECT 1 FROM public.profiles);
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, is_active)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email,
            CASE WHEN primero THEN 'admin'::user_role_enum ELSE 'operator'::user_role_enum END,
            primero);  -- toda cuenta que no sea la primera espera a que un admin la active
    RETURN NEW;
END $$;

-- 5. ARCHIVOS: documentos (certificados, planillas) solo administración (GS-SEC-014) -------------------
DROP POLICY IF EXISTS greenspot_files_select ON storage.objects;
DROP POLICY IF EXISTS greenspot_files_insert ON storage.objects;
CREATE POLICY greenspot_files_select ON storage.objects FOR SELECT TO authenticated
    USING ((bucket_id = 'greenspot-media' AND public.is_active_user()) OR (bucket_id = 'greenspot-docs' AND public.is_admin()));
CREATE POLICY greenspot_files_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK ((bucket_id = 'greenspot-media' AND public.is_active_user()) OR (bucket_id = 'greenspot-docs' AND public.is_admin()));
