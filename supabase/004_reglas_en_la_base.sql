-- ==============================================================================
-- GREENSPOT · 004 · Las reglas viven en la base, no solo en la pantalla
-- Se aplica DESPUÉS de 003_usuarios_y_permisos.sql. Se puede correr de nuevo sin daño.
-- Cierra los hallazgos de la auditoría QA del 10-nov:
--   C3  Lotes: el navegador solo puede avanzar la etapa; pesos y notas los cambia la base.
--   C4  Movimientos: fecha, autor y nombre los pone el servidor; tope por camión; motivo obligatorio;
--       reglas de anular/corregir (solo lo propio del día para el operario, sin doble anulación).
--   A2  Doble anulación al mismo tiempo: el original se bloquea mientras se ajusta.
--   A3  Anular/corregir un lote ya no son dos llamadas: el ajuste del lote ocurre en la misma operación.
--   C6  Un certificado por lote, solo para lotes despachados y no anulados; sin firmante inventado.
--   C9  Nadie borra lotes, empresas, bodegas ni certificados desde la app (el historial no se pierde).
--   M6  El stock del catálogo solo lo mueve el kardex, ni siquiera el administrador.
--   M7  Archivos: máximo 10 MB, solo imágenes y PDF.
-- Desde el SQL Editor de Supabase (sin usuario) estas reglas no aplican: sirve para corregir a mano.
-- ==============================================================================

-- Tope de un camión en la romana (igual que TOPE_CAMION en src/logica/reglas.ts)
CREATE OR REPLACE FUNCTION public.tope_camion() RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT 50000::NUMERIC $$;

-- 1. MOVIMIENTOS: validar y completar antes de guardar ---------------------------------
CREATE OR REPLACE FUNCTION public.check_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r RECORD; orig public.inventory_movements; lote public.batches;
    vig NUMERIC; dif NUMERIC; mismo BOOLEAN;
    es_admin BOOLEAN := public.is_admin();
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    -- El servidor decide quién y cuándo (antes el navegador podía mandar cualquier fecha o nombre).
    NEW.created_at := NOW();
    NEW.created_by := auth.uid();
    SELECT full_name INTO NEW.operator_name FROM public.profiles WHERE id = auth.uid();

    -- Recepción: solo como parte de un lote nuevo, una por lote y con el mismo peso.
    IF NEW.movement_type = 'reception' THEN
        SELECT * INTO lote FROM public.batches WHERE id = NEW.batch_id;
        IF lote.id IS NULL THEN RAISE EXCEPTION 'Una entrada se registra creando el lote'; END IF;
        IF NEW.quantity > public.tope_camion() THEN
            RAISE EXCEPTION 'Revisa el peso: un camión no supera % kg', public.tope_camion();
        END IF;
        IF NEW.quantity <> lote.initial_weight_kg THEN RAISE EXCEPTION 'Los kilos no calzan con el lote %', lote.batch_number; END IF;
        IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE batch_id = lote.id AND movement_type = 'reception'
                   AND COALESCE(reference_doc, '') !~ '^(Anula|Corrige) ') THEN
            RAISE EXCEPTION 'El lote % ya tiene su entrada', lote.batch_number;
        END IF;
    END IF;

    -- Anular / Corregir (asiento de contrapartida con reference_doc «Anula MOV-…» o «Corrige MOV-…»)
    SELECT m[1] AS tipo, m[2] AS num INTO r FROM regexp_match(COALESCE(NEW.reference_doc, ''), '^(Anula|Corrige) (\S+)$') m;
    IF r.tipo IS NULL THEN
        IF NEW.reference_doc ~ '^(Anula|Corrige) ' THEN RAISE EXCEPTION 'Referencia de ajuste mal escrita'; END IF;
        RETURN NEW;
    END IF;

    IF COALESCE(btrim(NEW.notes), '') = '' THEN RAISE EXCEPTION 'Falta el motivo'; END IF;
    -- FOR UPDATE: dos anulaciones del mismo registro al mismo tiempo quedan en fila; la segunda ve la primera.
    SELECT * INTO orig FROM public.inventory_movements WHERE movement_number = r.num FOR UPDATE;
    IF orig.id IS NULL THEN RAISE EXCEPTION 'No existe el registro %', r.num; END IF;
    IF orig.reference_doc ~ '^(Anula|Corrige) ' THEN RAISE EXCEPTION 'Es un ajuste: se corrige desde el registro original'; END IF;
    IF NEW.material_id <> orig.material_id OR NEW.batch_id IS DISTINCT FROM orig.batch_id THEN
        RAISE EXCEPTION 'El ajuste no corresponde al registro %', r.num;
    END IF;
    IF NOT es_admin AND (orig.created_by IS DISTINCT FROM auth.uid()
        OR (orig.created_at AT TIME ZONE 'America/Santiago')::date <> (NOW() AT TIME ZONE 'America/Santiago')::date) THEN
        RAISE EXCEPTION 'Solo puedes corregir tus propios registros del día. Pídeselo a administración.';
    END IF;
    IF orig.batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.valorization_certificates WHERE batch_id = orig.batch_id) THEN
        RAISE EXCEPTION 'El lote ya tiene certificado emitido; no se puede cambiar.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE reference_doc = 'Anula ' || r.num) THEN
        RAISE EXCEPTION 'Este registro ya está anulado.';
    END IF;

    -- Mismo sentido que el original = suma; sentido contrario = resta. Otro sentido no vale.
    mismo := NEW.from_warehouse_id IS NOT DISTINCT FROM orig.from_warehouse_id AND NEW.to_warehouse_id IS NOT DISTINCT FROM orig.to_warehouse_id;
    IF NOT mismo AND NOT (NEW.from_warehouse_id IS NOT DISTINCT FROM orig.to_warehouse_id AND NEW.to_warehouse_id IS NOT DISTINCT FROM orig.from_warehouse_id) THEN
        RAISE EXCEPTION 'El ajuste debe mover el stock entre las mismas bodegas del registro %', r.num;
    END IF;
    SELECT orig.quantity + COALESCE(SUM(CASE WHEN from_warehouse_id IS NOT DISTINCT FROM orig.from_warehouse_id
                                              AND to_warehouse_id IS NOT DISTINCT FROM orig.to_warehouse_id THEN quantity ELSE -quantity END), 0)
      INTO vig FROM public.inventory_movements WHERE reference_doc = 'Corrige ' || r.num;
    dif := CASE WHEN mismo THEN NEW.quantity ELSE -NEW.quantity END;

    IF r.tipo = 'Anula' AND (mismo OR NEW.quantity <> vig) THEN
        RAISE EXCEPTION 'Para anular hay que devolver los % registrados', vig;
    END IF;
    IF r.tipo = 'Corrige' AND vig + dif <= 0 THEN RAISE EXCEPTION 'Para dejarlo en cero, usa Anular.'; END IF;

    -- Lote de una recepción: se ajusta aquí mismo (si algo falla, no queda nada a medias).
    IF orig.movement_type = 'reception' AND orig.batch_id IS NOT NULL THEN
        IF r.tipo = 'Anula' THEN
            UPDATE public.batches SET current_weight_kg = 0,
                   notes = '[ANULADO] ' || NEW.notes || ' · ' || NEW.operator_name || ', ' || to_char(NOW() AT TIME ZONE 'America/Santiago', 'DD-MM-YYYY')
                           || COALESCE(' · ' || notes, '')
             WHERE id = orig.batch_id;
        ELSE
            IF vig + dif > public.tope_camion() THEN RAISE EXCEPTION 'Revisa el peso: un camión no supera % kg', public.tope_camion(); END IF;
            UPDATE public.batches SET initial_weight_kg = initial_weight_kg + dif, current_weight_kg = GREATEST(0, current_weight_kg + dif)
             WHERE id = orig.batch_id;
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_movement ON public.inventory_movements;
CREATE TRIGGER trg_check_movement BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.check_movement();

-- 2. LOTES: desde el navegador solo se avanza la etapa ------------------------------------
CREATE OR REPLACE FUNCTION public.check_batch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE etapas batch_status_enum[] := ARRAY['received','washing_sorting','shredded','pelletized','dispatched']::batch_status_enum[];
        resto public.batches;
BEGIN
    -- Sin usuario (SQL Editor) o llamado desde otro trigger (anular/corregir): pasa.
    IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.initial_weight_kg <= 0 OR NEW.initial_weight_kg > public.tope_camion() THEN
            RAISE EXCEPTION 'Revisa el peso: entre 1 y % kg', public.tope_camion();
        END IF;
        NEW.current_weight_kg := NEW.initial_weight_kg;
        NEW.status := 'received';
        NEW.created_by := auth.uid();
        NEW.created_at := NOW();
        IF NEW.notes LIKE '[ANULADO]%' THEN RAISE EXCEPTION 'Un lote nuevo no puede venir anulado'; END IF;
        RETURN NEW;
    END IF;

    resto := NEW; resto.status := OLD.status; resto.updated_at := OLD.updated_at;
    IF resto IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Del lote solo se cambia la etapa. Pesos y anulaciones van por Anular o Corregir.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.notes LIKE '[ANULADO]%' THEN RAISE EXCEPTION 'El lote % está anulado', OLD.batch_number; END IF;
        IF NOT public.is_admin() AND array_position(etapas, NEW.status) IS DISTINCT FROM array_position(etapas, OLD.status) + 1 THEN
            RAISE EXCEPTION 'El lote % solo puede pasar a la etapa siguiente', OLD.batch_number;
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_batch ON public.batches;
CREATE TRIGGER trg_check_batch BEFORE INSERT OR UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.check_batch();

-- 3. CERTIFICADOS: uno por lote, solo para lo despachado ----------------------------------
-- Si esto falla, ya hay dos certificados de un mismo lote: revisarlos a mano antes de seguir.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_un_lote ON public.valorization_certificates (batch_id);

ALTER TABLE public.valorization_certificates
    ALTER COLUMN signer_name DROP DEFAULT,
    ALTER COLUMN signer_title DROP DEFAULT,
    ALTER COLUMN final_destination_product DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.check_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lote public.batches;
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO lote FROM public.batches WHERE id = NEW.batch_id;
    IF lote.id IS NULL THEN RAISE EXCEPTION 'El certificado necesita un lote'; END IF;
    IF lote.status <> 'dispatched' OR lote.notes LIKE '[ANULADO]%' THEN
        RAISE EXCEPTION 'El lote % no está despachado o fue anulado', lote.batch_number;
    END IF;
    IF NEW.stakeholder_id IS DISTINCT FROM lote.supplier_id THEN RAISE EXCEPTION 'La empresa no es la que entregó el lote %', lote.batch_number; END IF;
    IF NEW.total_kg_valorized <= 0 OR NEW.total_kg_valorized > lote.initial_weight_kg THEN
        RAISE EXCEPTION 'Los kilos valorizados no pueden superar los % kg del lote', lote.initial_weight_kg;
    END IF;
    IF COALESCE(btrim(NEW.signer_name), '') = '' THEN RAISE EXCEPTION 'Falta el firmante'; END IF;
    NEW.issue_date := (NOW() AT TIME ZONE 'America/Santiago')::date;
    NEW.created_by := auth.uid();
    NEW.created_at := NOW();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_certificate ON public.valorization_certificates;
CREATE TRIGGER trg_check_certificate BEFORE INSERT ON public.valorization_certificates
FOR EACH ROW EXECUTE FUNCTION public.check_certificate();

-- 4. STOCK DEL CATÁLOGO: solo lo mueve el kardex ----------------------------------------
CREATE OR REPLACE FUNCTION public.protect_current_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- pg_trigger_depth() > 1 = lo está actualizando apply_inventory_movement
    IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 1 THEN
        NEW.current_stock := CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE OLD.current_stock END;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_current_stock ON public.materials_and_products;
CREATE TRIGGER trg_protect_current_stock BEFORE INSERT OR UPDATE ON public.materials_and_products
FOR EACH ROW EXECUTE FUNCTION public.protect_current_stock();

-- 5. NADA SE BORRA DESDE LA APP ------------------------------------------------------------
DROP POLICY IF EXISTS batches_delete ON public.batches;

DROP POLICY IF EXISTS warehouses_admin ON public.warehouses;
DROP POLICY IF EXISTS warehouses_admin_insert ON public.warehouses;
DROP POLICY IF EXISTS warehouses_admin_update ON public.warehouses;
CREATE POLICY warehouses_admin_insert ON public.warehouses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY warehouses_admin_update ON public.warehouses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS stakeholders_admin ON public.stakeholders;
DROP POLICY IF EXISTS stakeholders_admin_insert ON public.stakeholders;
DROP POLICY IF EXISTS stakeholders_admin_update ON public.stakeholders;
CREATE POLICY stakeholders_admin_insert ON public.stakeholders FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY stakeholders_admin_update ON public.stakeholders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Materiales: el admin puede borrar uno sin movimientos (el kardex ya lo impide con ON DELETE RESTRICT).
DROP POLICY IF EXISTS batches_update ON public.batches;
CREATE POLICY batches_update ON public.batches FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

-- Certificados: se emiten y se leen; no se editan ni se borran.
DROP POLICY IF EXISTS certs_admin ON public.valorization_certificates;
DROP POLICY IF EXISTS certs_select ON public.valorization_certificates;
DROP POLICY IF EXISTS certs_insert ON public.valorization_certificates;
CREATE POLICY certs_select ON public.valorization_certificates FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY certs_insert ON public.valorization_certificates FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 6. ARCHIVOS: tamaño y tipo ----------------------------------------------------------------
UPDATE storage.buckets SET file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id IN ('greenspot-media', 'greenspot-docs');
