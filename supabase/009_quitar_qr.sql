-- GREENSPOT · 009 · Se quita el código QR de los certificados (decisión del grupo).
-- Se puede correr de nuevo sin daño. Borra la columna y su contenido, y actualiza
-- check_certificate_datos() si 005_propuesta_cierre_operario.sql ya fue aplicado.
ALTER TABLE public.valorization_certificates DROP COLUMN IF EXISTS qr_verification_code;

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
    IF COALESCE(btrim(NEW.certificate_code), '') = '' THEN RAISE EXCEPTION 'Falta el código del certificado'; END IF;
    RETURN NEW;
END $$;
