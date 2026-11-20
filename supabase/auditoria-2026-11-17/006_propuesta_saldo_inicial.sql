-- ==============================================================================
-- GREENSPOT · 006 (PROPUESTA, NO APLICADA) · GS-SEC-005: el stock debe salir del kardex
-- Los datos de ejemplo (002) cargaron inventory_stock directo, sin movimientos: hoy la mayor parte
-- del stock no tiene respaldo en el kardex. Esto registra la diferencia como «Saldo inicial»,
-- sin cambiar ninguna cantidad: el stock queda igual y ahora cada kilo tiene su asiento.
-- Correr UNA vez desde el SQL Editor (sin usuario, por eso las reglas de 004/005 no aplican).
-- Alternativa: si los datos de ejemplo no son reales, borrarlos antes de llevarlo a la empresa.
-- ==============================================================================
BEGIN;
CREATE TEMP TABLE descuadre ON COMMIT DROP AS
SELECT s.material_id, s.warehouse_id, m.unit,
       s.quantity - COALESCE((
         SELECT SUM(CASE WHEN k.movement_type IN ('reception','production_output','count_adjustment_in','internal_transfer')
                              AND k.to_warehouse_id = s.warehouse_id THEN k.quantity ELSE 0 END)
              - SUM(CASE WHEN k.movement_type IN ('dispatch','production_intake','waste_adjustment','internal_transfer')
                              AND k.from_warehouse_id = s.warehouse_id THEN k.quantity ELSE 0 END)
           FROM public.inventory_movements k
          WHERE k.material_id = s.material_id), 0) AS dif
  FROM public.inventory_stock s JOIN public.materials_and_products m ON m.id = s.material_id;
DELETE FROM descuadre WHERE dif = 0;

-- Se resta la diferencia primero; el trigger del kardex la devuelve al registrar el asiento (sirve para + y para −).
UPDATE public.inventory_stock s SET quantity = s.quantity - d.dif
  FROM descuadre d WHERE s.material_id = d.material_id AND s.warehouse_id = d.warehouse_id;

INSERT INTO public.inventory_movements (movement_number, movement_type, material_id, to_warehouse_id, from_warehouse_id,
                                        quantity, unit, operator_name, reference_doc, notes)
SELECT 'SALDO-INI-' || row_number() OVER (ORDER BY d.material_id, d.warehouse_id),
       CASE WHEN d.dif > 0 THEN 'count_adjustment_in' ELSE 'waste_adjustment' END::movement_type_enum,
       d.material_id,
       CASE WHEN d.dif > 0 THEN d.warehouse_id END,
       CASE WHEN d.dif < 0 THEN d.warehouse_id END,
       abs(d.dif), d.unit, 'Sistema', 'Saldo inicial', 'Stock cargado sin movimiento (datos de ejemplo, auditoría 17-nov-2026)'
  FROM descuadre d;
COMMIT;
