-- ==============================================================================
-- GREENSPOT · 010 · Ajustes de trazabilidad, certificación, capacidad y ambiente
-- Se aplica DESPUÉS de 009_quitar_qr.sql. Es idempotente y reversible por migración hacia adelante.
--   1. Permite NULL en water_saved_liters y oil_saved_barrels (no estimados != 0).
--   2. Agrega estado y anulación controlada de certificados (status, anular_certificado()).
--   3. Descuenta merma del lote cuando producción vincula batch_id (aplicar_merma_lote).
--   4. Exige en check_certificate() que total_kg_valorized <= lote.current_weight_kg.
--   5. Serializa concurrencia por bodega en check_capacidad_bodega() con FOR UPDATE.
-- ==============================================================================

-- 1. Indicadores ambientales no estimados: permitir NULL en vez de 0
ALTER TABLE public.valorization_certificates
    ALTER COLUMN water_saved_liters DROP NOT NULL,
    ALTER COLUMN oil_saved_barrels DROP NOT NULL;

-- 2. Estado vigente/anulado y procedimiento controlado de anulación de certificados
ALTER TABLE public.valorization_certificates
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'vigente',
    ADD COLUMN IF NOT EXISTS annulled_reason TEXT,
    ADD COLUMN IF NOT EXISTS annulled_at TIMESTAMPTZ;

DO $$ BEGIN
    ALTER TABLE public.valorization_certificates
        ADD CONSTRAINT valorization_certificates_status_check CHECK (status IN ('vigente', 'anulado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS public.certificates_un_lote;
CREATE UNIQUE INDEX certificates_un_lote ON public.valorization_certificates (batch_id) WHERE status = 'vigente';

CREATE OR REPLACE FUNCTION public.anular_certificado(p_cert_id UUID, p_motivo TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo administración puede anular certificados';
    END IF;
    IF COALESCE(btrim(p_motivo), '') = '' THEN
        RAISE EXCEPTION 'Falta el motivo de anulación del certificado';
    END IF;
    UPDATE public.valorization_certificates
       SET status = 'anulado',
           annulled_reason = btrim(p_motivo),
           annulled_at = NOW()
     WHERE id = p_cert_id AND status = 'vigente';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El certificado no existe o ya está anulado';
    END IF;
END $$;

REVOKE ALL ON FUNCTION public.anular_certificado(UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.anular_certificado(UUID, TEXT) TO authenticated;

-- 3. Descuento automático de merma al lote cuando producción referencia batch_id
CREATE OR REPLACE FUNCTION public.aplicar_merma_lote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE consumo NUMERIC;
BEGIN
    IF auth.uid() IS NULL
       OR NEW.movement_type <> 'production_output'
       OR NEW.batch_id IS NULL
       OR COALESCE(NEW.reference_doc, '') ~ '^(Anula|Corrige) ' THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(quantity), 0)
      INTO consumo
      FROM public.inventory_movements
     WHERE xmin = pg_current_xact_id()::xid
       AND movement_type = 'production_intake'
       AND batch_id = NEW.batch_id
       AND COALESCE(reference_doc, '') !~ '^(Anula|Corrige) ';

    IF consumo > NEW.quantity THEN
        UPDATE public.batches
           SET current_weight_kg = GREATEST(0, current_weight_kg - (consumo - NEW.quantity))
         WHERE id = NEW.batch_id;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_z_merma_lote ON public.inventory_movements;
CREATE TRIGGER trg_z_merma_lote AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.aplicar_merma_lote();

-- 4. Validar certificados contra peso vigente (post-merma y post-corrección) y considerar solo vigentes en check_movement
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
    IF NEW.stakeholder_id IS DISTINCT FROM lote.supplier_id THEN
        RAISE EXCEPTION 'La empresa no es la que entregó el lote %', lote.batch_number;
    END IF;
    IF NEW.total_kg_valorized <= 0 OR NEW.total_kg_valorized > lote.current_weight_kg OR NEW.total_kg_valorized > lote.initial_weight_kg THEN
        RAISE EXCEPTION 'Los kilos valorizados no pueden superar los % kg vigentes del lote', LEAST(lote.current_weight_kg, lote.initial_weight_kg);
    END IF;
    IF COALESCE(btrim(NEW.signer_name), '') = '' THEN RAISE EXCEPTION 'Falta el firmante'; END IF;
    NEW.issue_date := (NOW() AT TIME ZONE 'America/Santiago')::date;
    NEW.created_by := auth.uid();
    NEW.created_at := NOW();
    NEW.status := 'vigente';
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.check_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r RECORD; orig public.inventory_movements; lote public.batches;
    vig NUMERIC; dif NUMERIC; mismo BOOLEAN;
    es_admin BOOLEAN := public.is_admin();
BEGIN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    NEW.created_at := NOW();
    NEW.created_by := auth.uid();
    SELECT full_name INTO NEW.operator_name FROM public.profiles WHERE id = auth.uid();

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

    SELECT m[1] AS tipo, m[2] AS num INTO r FROM regexp_match(COALESCE(NEW.reference_doc, ''), '^(Anula|Corrige) (\S+)$') m;
    IF r.tipo IS NULL THEN
        IF NEW.reference_doc ~ '^(Anula|Corrige) ' THEN RAISE EXCEPTION 'Referencia de ajuste mal escrita'; END IF;
        RETURN NEW;
    END IF;

    IF COALESCE(btrim(NEW.notes), '') = '' THEN RAISE EXCEPTION 'Falta el motivo'; END IF;
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
    IF orig.batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.valorization_certificates WHERE batch_id = orig.batch_id AND status = 'vigente') THEN
        RAISE EXCEPTION 'El lote ya tiene certificado emitido; no se puede cambiar.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE reference_doc = 'Anula ' || r.num) THEN
        RAISE EXCEPTION 'Este registro ya está anulado.';
    END IF;

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

-- 5. Bloqueo pesimista sobre warehouses para serializar capacidad bajo concurrencia multi-material
CREATE OR REPLACE FUNCTION public.check_capacidad_bodega()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC; cap NUMERIC; nombre TEXT;
BEGIN
    IF auth.uid() IS NULL OR NEW.to_warehouse_id IS NULL THEN RETURN NULL; END IF;
    PERFORM 1 FROM public.warehouses WHERE id = NEW.to_warehouse_id FOR UPDATE;
    SELECT capacity_tons * 1000, name INTO cap, nombre FROM public.warehouses WHERE id = NEW.to_warehouse_id;
    SELECT SUM(quantity) INTO total FROM public.inventory_stock WHERE warehouse_id = NEW.to_warehouse_id;
    IF cap IS NOT NULL AND total > cap THEN
        RAISE EXCEPTION 'La bodega % quedaría con % kg y su capacidad es % kg', nombre, total, cap;
    END IF;
    RETURN NULL;
END $$;
