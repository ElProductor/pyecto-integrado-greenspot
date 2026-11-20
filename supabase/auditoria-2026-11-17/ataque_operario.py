#!/usr/bin/env python3
"""Batería de ataque de operario contra la réplica local de Greenspot (001–004).
Cada prueba: BEGIN; rol; usuario; SQL; ROLLBACK. Nada persiste salvo el SETUP."""
import subprocess, sys, re
S = sys.argv[1]
ADM, OP1, OP2, INA = ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
                      'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001')
M = "(SELECT material_id FROM inventory_stock ORDER BY quantity DESC LIMIT 1)"
W = "(SELECT warehouse_id FROM inventory_stock ORDER BY quantity DESC LIMIT 1)"
M2 = f"(SELECT id FROM materials_and_products WHERE id <> {M} LIMIT 1)"
SUP = "(SELECT id FROM stakeholders LIMIT 1)"

def psql(sql):
    r = subprocess.run(['psql', '-h', S, '-p', '54329', '-U', 'postgres', '-d', 'gs', '-qtAX', '-v', 'ON_ERROR_STOP=1'],
                       input=sql, capture_output=True, text=True)
    err = re.sub(r'^psql:<stdin>:\d+: ', '', r.stderr.strip().splitlines()[0]) if r.returncode else ''
    return r.returncode == 0, r.stdout.strip(), err

def como(uid, role='authenticated'):
    sub = f"SELECT set_config('request.jwt.claim.sub','{uid}',true);" if uid else ''
    return f"SET LOCAL ROLE {role}; {sub}"

def mov(num, tipo, cant, extra=''):
    return (f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,quantity,operator_name{',' if extra else ''}"
            f"{extra.split('|')[0] if extra else ''}) VALUES ('{num}','{tipo}',{M},{cant},'x'{',' if extra else ''}"
            f"{extra.split('|')[1] if extra else ''})")

# Estado previo persistente (como postgres = panel de Supabase): movimientos de op2 hoy y de op1 ayer.
SETUP = f"""
INSERT INTO inventory_movements(movement_number,movement_type,material_id,to_warehouse_id,quantity,operator_name,created_by,created_at)
VALUES ('SET-OP2-HOY','count_adjustment_in',{M},{W},10,'Operario Dos','{OP2}',now()),
       ('SET-OP1-AYER','count_adjustment_in',{M},{W},10,'Operario Uno','{OP1}',now()-interval '1 day'),
       ('SET-OP1-HOY','count_adjustment_in',{M},{W},10,'Operario Uno','{OP1}',now());
INSERT INTO storage.buckets(id,name,public) VALUES ('greenspot-docs','greenspot-docs',false),('greenspot-media','greenspot-media',false) ON CONFLICT DO NOTHING;
INSERT INTO storage.objects(bucket_id,name,owner) VALUES ('greenspot-docs','certificados/CERT-ADMIN.pdf','{ADM}');
"""

# (id, regla, quién, sql, qué debería pasar: 'bloquea' | 'permite' | 'ver')
T = [
 ('A01', 'Anónimo lee movimientos', None, "SELECT count(*) FROM inventory_movements", 'ver'),
 ('A02', 'Anónimo inserta movimiento', None, mov('X', 'count_adjustment_in', 5, f'to_warehouse_id|{W}'), 'bloquea'),
 ('A03', 'Inactivo lee empresas', INA, "SELECT count(*) FROM stakeholders", 'ver'),
 ('A04', 'Inactivo inserta movimiento', INA, mov('X', 'count_adjustment_in', 5, f'to_warehouse_id|{W}'), 'bloquea'),
 ('A05', 'Cuenta recién registrada (signup) NO debe ver datos', 'NUEVO', "DO $x$ BEGIN IF (SELECT count(*) FROM stakeholders) + (SELECT count(*) FROM inventory_movements) > 0 THEN RAISE EXCEPTION 've % empresas con RUT y % movimientos', (SELECT count(*) FROM stakeholders), (SELECT count(*) FROM inventory_movements); END IF; END $x$", 'permite'),
 ('B01', 'Sobrante de conteo de 9.000.000.000 kg', OP1, mov('X', 'count_adjustment_in', 9000000000, f'to_warehouse_id|{W}') + f"; SELECT 'stock ahora '||current_stock FROM materials_and_products WHERE id={M}", 'bloquea'),
 ('B02', 'Producción sin consumo: crea 900.000 kg de la nada', OP1, mov('X', 'production_output', 900000, f'to_warehouse_id|{W}'), 'bloquea'),
 ('B03', 'Producción incoherente: consume 1 kg y produce 40.000 kg', OP1,
  mov('X1', 'production_intake', 1, f'from_warehouse_id|{W}') + ';' + mov('X2', 'production_output', 40000, f'to_warehouse_id|{W}'), 'bloquea'),
 ('B04', 'Merma sin nota ni aprobación: vacía la bodega completa', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name) SELECT 'X','waste_adjustment',material_id,warehouse_id,quantity,'x' FROM inventory_stock WHERE material_id={M} AND warehouse_id={W}; SELECT 'quedan '||quantity FROM inventory_stock WHERE material_id={M} AND warehouse_id={W}", 'bloquea'),
 ('B05', 'Salida mayor al stock', OP1, mov('X', 'dispatch', 999999999, f'from_warehouse_id|{W}'), 'bloquea'),
 ('B06', 'Entrada de 60.000 kg sin lote', OP1, mov('X', 'reception', 60000, f'to_warehouse_id|{W}'), 'bloquea'),
 ('B07', 'Lote de 60.000 kg (camión)', OP1, f"INSERT INTO batches(batch_number,material_id,initial_weight_kg,current_weight_kg) VALUES ('X',{M},60000,60000)", 'bloquea'),
 ('B08', 'Despacho de 1 kg usando un lote de otro material', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,batch_id,from_warehouse_id,quantity,operator_name) VALUES ('X','dispatch',{M},(SELECT id FROM batches WHERE material_id<>{M} LIMIT 1),{W},1,'x')", 'bloquea'),
 ('B09', 'Movimiento en toneladas sumado como kg', OP1, mov('X', 'count_adjustment_in', 5, f"to_warehouse_id,unit|{W},'ton'") + f"; SELECT 'sumó '||(SELECT quantity FROM inventory_movements WHERE movement_number='X')||' a un stock en kg'", 'bloquea'),
 ('B10', 'Bodega sobre su capacidad (90 %/100 %)', OP1,
  mov('X', 'count_adjustment_in', 5000000, f'to_warehouse_id|{W}') + f"; SELECT 'bodega con '||(SELECT sum(quantity)/1000 FROM inventory_stock WHERE warehouse_id={W})||' t de '||capacity_tons||' t' FROM warehouses WHERE id={W}", 'bloquea'),
 ('C01', 'Lote con fecha de recepción 2020, 0 % impureza y estado despachado', OP1,
  f"INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg,reception_date,impurity_percentage,status) VALUES ('X',{M},{SUP},100,100,'2020-01-01',0,'dispatched'); SELECT 'fecha '||reception_date::date||', impureza '||impurity_percentage||', estado '||status FROM batches WHERE batch_number='X'", 'ver'),
 ('C02', 'Lote fantasma (sin entrada de stock) llega a despachado y se certifica', OP1,
  f"INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg) VALUES ('FANT',{M},{SUP},50000,50000);"
  " UPDATE batches SET status='washing_sorting' WHERE batch_number='FANT'; UPDATE batches SET status='shredded' WHERE batch_number='FANT';"
  " UPDATE batches SET status='pelletized' WHERE batch_number='FANT'; UPDATE batches SET status='dispatched' WHERE batch_number='FANT';"
  f" SELECT set_config('request.jwt.claim.sub','{ADM}',true);"
  f" INSERT INTO valorization_certificates(certificate_code,stakeholder_id,batch_id,waste_type,total_kg_valorized,co2_avoided_kg,water_saved_liters,oil_saved_barrels,signer_name,qr_verification_code) SELECT 'CF',supplier_id,id,'Boyas',50000,1,0,0,'Firmante','q' FROM batches WHERE batch_number='FANT';"
  " SELECT 'certificado por '||total_kg_valorized||' kg; entradas del lote: '||(SELECT count(*) FROM inventory_movements m JOIN batches b ON b.id=m.batch_id WHERE b.batch_number='FANT') FROM valorization_certificates WHERE certificate_code='CF'", 'bloquea'),
 ('C03', 'Lote atribuido a cualquier empresa generadora', OP1, f"INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg) VALUES ('X',{M},(SELECT id FROM stakeholders ORDER BY name DESC LIMIT 1),100,100)", 'ver'),
 ('C04', 'Cambiar peso de un lote por PATCH', OP1, f"UPDATE batches SET initial_weight_kg=1 WHERE id=(SELECT id FROM batches LIMIT 1)", 'bloquea'),
 ('C05', 'Saltar etapas del lote', OP1, "UPDATE batches SET status='dispatched' WHERE status='received' AND notes NOT LIKE '[ANULADO]%'", 'bloquea'),
 ('C06', 'Marcar un lote como [ANULADO] sin contrapartida', OP1, "UPDATE batches SET notes='[ANULADO] x' WHERE id=(SELECT id FROM batches LIMIT 1)", 'bloquea'),
 ('C07', 'Borrar lotes', OP1, "WITH d AS (DELETE FROM batches RETURNING 1) SELECT count(*)||' borrados' FROM d", 'ver'),
 ('D01', 'Operario emite certificado', OP1, f"INSERT INTO valorization_certificates(certificate_code,stakeholder_id,waste_type,total_kg_valorized,co2_avoided_kg,water_saved_liters,oil_saved_barrels,signer_name,qr_verification_code) VALUES ('X',{SUP},'x',1,1,0,0,'f','q')", 'bloquea'),
 ('D02', 'Operario lee certificados', OP1, "SELECT count(*) FROM valorization_certificates", 'ver'),
 ('D03', 'Segundo certificado del mismo lote (admin)', ADM,
  "UPDATE batches SET status='dispatched' WHERE id=(SELECT batch_id FROM valorization_certificates LIMIT 1);"
  " INSERT INTO valorization_certificates(certificate_code,stakeholder_id,batch_id,waste_type,total_kg_valorized,co2_avoided_kg,water_saved_liters,oil_saved_barrels,signer_name,qr_verification_code) SELECT 'X2',stakeholder_id,batch_id,'x',1,1,0,0,'f','q' FROM valorization_certificates LIMIT 1", 'bloquea'),
 ('D04', 'Certificado con tipo de residuo, destino y QR vacíos (admin)', ADM,
  f"UPDATE batches SET status='dispatched' WHERE batch_number='LOTE-2026-0825';"
  f" INSERT INTO valorization_certificates(certificate_code,stakeholder_id,batch_id,waste_type,total_kg_valorized,co2_avoided_kg,water_saved_liters,oil_saved_barrels,signer_name,qr_verification_code,final_destination_product) SELECT 'X3',supplier_id,id,'',1,0,0,0,'f','',NULL FROM batches WHERE batch_number='LOTE-2026-0825'", 'bloquea'),
 ('E01', 'Anular sin devolver la cantidad (contrapartida falsa)', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','waste_adjustment',{M},{W},1,'x','Anula SET-OP1-HOY','m')", 'bloquea'),
 ('E02', 'Anular un registro de otro operario', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','waste_adjustment',{M},{W},10,'x','Anula SET-OP2-HOY','m')", 'bloquea'),
 ('E03', 'Anular un registro propio de ayer', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','waste_adjustment',{M},{W},10,'x','Anula SET-OP1-AYER','m')", 'bloquea'),
 ('E04', 'Anular dos veces', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','waste_adjustment',{M},{W},10,'x','Anula SET-OP1-HOY','m'),('Y','waste_adjustment',{M},{W},10,'x','Anula SET-OP1-HOY','m')", 'bloquea'),
 ('E05', 'Corregir sumando sin tope (+5.000.000 kg a un registro propio)', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,to_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','count_adjustment_in',{M},{W},5000000,'x','Corrige SET-OP1-HOY','m')", 'bloquea'),
 ('E06', 'Editar la cantidad de un movimiento', OP1, "WITH u AS (UPDATE inventory_movements SET quantity=1 RETURNING 1) SELECT count(*)||' editados' FROM u", 'ver'),
 ('E07', 'Borrar movimientos (historial)', OP1, "WITH d AS (DELETE FROM inventory_movements RETURNING 1) SELECT count(*)||' borrados' FROM d", 'ver'),
 ('E08', 'Ajuste con fecha y autor falsos', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,to_warehouse_id,quantity,operator_name,created_at,created_by) VALUES ('X','count_adjustment_in',{M},{W},1,'Admin','2020-01-01','{ADM}'); SELECT operator_name||' · '||created_at::date||' · '||(created_by='{OP1}') FROM inventory_movements WHERE movement_number='X'", 'ver'),
 ('F01', 'Escribir stock directo', OP1, f"WITH u AS (UPDATE inventory_stock SET quantity=0 RETURNING 1) SELECT count(*)||' editados' FROM u", 'ver'),
 ('F02', 'Insertar stock directo', OP1, f"INSERT INTO inventory_stock(material_id,warehouse_id,quantity) VALUES ({M2},{W},999)", 'bloquea'),
 ('F03', 'Editar stock del catálogo / costos', OP1, "WITH u AS (UPDATE materials_and_products SET current_stock=0, unit_cost_usd=0 RETURNING 1) SELECT count(*)||' editados' FROM u", 'ver'),
 ('F04', 'Crear empresa', OP1, "INSERT INTO stakeholders(name,tax_id) VALUES ('x','1-9')", 'bloquea'),
 ('G01', 'Subirse a administrador', OP1, f"UPDATE profiles SET role='admin' WHERE id='{OP1}'", 'bloquea'),
 ('G02', 'Ponerse el nombre de otra persona y firmar movimientos con él', OP1,
  f"UPDATE profiles SET full_name='Admin' WHERE id='{OP1}'; " + mov('X', 'count_adjustment_in', 1, f'to_warehouse_id|{W}') + "; SELECT 'operator_name = '||operator_name FROM inventory_movements WHERE movement_number='X'", 'bloquea'),
 ('G03', 'Ver perfiles ajenos', OP1, "SELECT count(*) FROM profiles", 'ver'),
 ('G04', 'Leer pin_hash', OP1, "SELECT pin_hash FROM profiles", 'bloquea'),
 ('G05', 'Desactivar a otro operario', OP1, f"WITH u AS (UPDATE profiles SET is_active=false WHERE id='{OP2}' RETURNING 1) SELECT count(*)||' editados' FROM u", 'ver'),
 ('H01', 'Storage: leer archivos de administración', OP1, "SELECT count(*)||' visibles: '||string_agg(name,',') FROM storage.objects", 'ver'),
 ('H02', 'Storage: subir un PDF con nombre de certificado', OP1, "INSERT INTO storage.objects(bucket_id,name) VALUES ('greenspot-docs','certificados/CERT-FALSO.pdf')", 'bloquea'),
 ('H03', 'Storage: sobrescribir o borrar archivo ajeno', OP1, "WITH d AS (DELETE FROM storage.objects RETURNING 1) SELECT count(*)||' borrados' FROM d", 'ver'),
 # Flujos legítimos: deben seguir funcionando después de la corrección
 ('L01', 'Operario registra camión: lote + entrada', OP1,
  f"INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg) VALUES ('L1',{M},{SUP},12000,12000);"
  f" INSERT INTO inventory_movements(movement_number,movement_type,material_id,batch_id,to_warehouse_id,quantity,operator_name,reference_doc) SELECT 'L1M','reception',{M},id,{W},12000,'x','Lote L1' FROM batches WHERE batch_number='L1'", 'permite'),
 ('L02', 'Operario registra producción coherente (consume 1.000, obtiene 900, merma en notas)', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,to_warehouse_id,quantity,operator_name,notes) VALUES ('PRC-1','production_intake',{M},{W},NULL,1000,'x','Merma 100 kg'),('PRD-1','production_output',{M2},NULL,{W},900,'x','Merma 100 kg')", 'permite'),
 ('L03', 'Operario anula su registro de hoy', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name,reference_doc,notes) VALUES ('X','waste_adjustment',{M},{W},10,'x','Anula SET-OP1-HOY','me equivoqué')", 'permite'),
 ('L04', 'Operario despacha 100 kg con stock', OP1, mov('X', 'dispatch', 100, f'from_warehouse_id|{W}'), 'permite'),
 ('L05', 'Operario traslada 100 kg entre bodegas', OP1,
  f"INSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,to_warehouse_id,quantity,operator_name) VALUES ('X','internal_transfer',{M},{W},(SELECT id FROM warehouses WHERE id<>{W} LIMIT 1),100,'x')", 'permite'),
 ('L06', 'Operario avanza la etapa de un lote', OP1, "UPDATE batches SET status='washing_sorting' WHERE batch_number='LOTE-2026-0825'", 'permite'),
 ('L07', 'Admin corrige conteo (sobrante 50 kg)', ADM, mov('X', 'count_adjustment_in', 50, f'to_warehouse_id|{W}'), 'permite'),
 ('L08', 'Admin certifica un lote con entrada real', ADM,
  f"INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg) VALUES ('L8',{M},{SUP},1000,1000);"
  f" INSERT INTO inventory_movements(movement_number,movement_type,material_id,batch_id,to_warehouse_id,quantity,operator_name) SELECT 'L8M','reception',{M},id,{W},1000,'x' FROM batches WHERE batch_number='L8';"
  " UPDATE batches SET status='dispatched' WHERE batch_number='L8';"
  " INSERT INTO valorization_certificates(certificate_code,stakeholder_id,batch_id,waste_type,total_kg_valorized,co2_avoided_kg,water_saved_liters,oil_saved_barrels,signer_name,qr_verification_code,final_destination_product) SELECT 'C8',supplier_id,id,'Boyas HDPE',1000,1850,0,0,'Firmante','GREENSPOT-C8','Pellet' FROM batches WHERE batch_number='L8'", 'permite'),
 ('L09', 'Operario sube foto a media', OP1, "INSERT INTO storage.objects(bucket_id,name) VALUES ('greenspot-media','tickets/foto.jpg')", 'permite'),
]

ok, _, e = psql(SETUP)
if not ok: sys.exit('SETUP: ' + e)
for tid, regla, quien, sql, debe in T:
    if quien == 'NUEVO':  # simula lo que hace el signup público: crea auth.users → trigger crea perfil
        pre = "INSERT INTO auth.users(id,email) VALUES ('dddddddd-0000-0000-0000-000000000009','extrano@gmail.com');" + como('dddddddd-0000-0000-0000-000000000009')
    else:
        pre = como(quien, 'anon' if quien is None else 'authenticated')
    ok, out, err = psql(f"BEGIN; {pre} {sql}; ROLLBACK;")
    res = ('PASA' if ok else 'BLOQUEADO')
    detalle = (out.splitlines()[-1] if out else '') if ok else err
    falla = (debe == 'bloquea' and ok) or (debe == 'permite' and not ok)
    print(f"{'❌' if falla else '  '} {tid} {res:9} {regla} → {detalle[:150]}")
