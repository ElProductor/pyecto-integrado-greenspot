#!/usr/bin/env python3
"""Genera el informe de auditoría de operario de Greenspot (HTML para Artifact)."""
import html, sys
E = html.escape
OUT = sys.argv[1]

# (id, sev, cvss, vector, título, activo, rol, origen, pasos, sql, esperado, obtenido, impacto, arreglo, regresión)
H = [
 ('001', 'Crítica', '9.1', 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
  'Registro público abierto: cualquiera con la clave pública crea una cuenta',
  'Supabase Auth (signup) + todas las tablas con is_active_user()', 'anónimo → cuenta nueva', 'Vivo (solo lectura de configuración) + réplica',
  ['Leer la configuración pública de Auth del proyecto: disable_signup = false.',
   'Con la clave publicable (está en el bundle de la app) llamar a /auth/v1/signup con cualquier correo.',
   'Con el token obtenido, leer stakeholders e inventory_movements.'],
  "-- réplica, prueba A05 (cuenta recién creada por handle_new_user)\nSELECT count(*) FROM stakeholders;          -- 5 empresas con RUT\nSELECT count(*) FROM inventory_movements;   -- 7 movimientos",
  'Sin invitación no se puede crear cuenta; una cuenta no aprobada no ve nada.',
  'Vivo: disable_signup=false. Réplica: la cuenta nueva ve 5 empresas con RUT y 7 movimientos, y puede registrar movimientos (ver 002–004).',
  'Cualquier persona externa obtiene el rol operario: lee clientes y proveedores, y puede alterar inventario y trazabilidad.',
  'Supabase › Authentication › Sign In / Providers › desactivar «Allow new users to sign up». Cuentas nuevas solo por invitación del admin. Además, GS-SEC-013.',
  'A05: cuenta creada por signup → count(stakeholders)+count(inventory_movements) = 0. En CI: GET /auth/v1/settings → disable_signup = true.'),
 ('002', 'Crítica', '6.5', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
  'El operario crea o borra stock con ajustes de conteo y merma, sin tope ni nota',
  'inventory_movements (count_adjustment_in, waste_adjustment) → inventory_stock', 'operario', 'Réplica',
  ['Entrar como operario activo.', 'Insertar un count_adjustment_in de 9.000.000.000 kg (B01).', 'Insertar un waste_adjustment por todo el stock de una fila, sin notas (B04).'],
  "INSERT INTO inventory_movements(movement_number,movement_type,material_id,to_warehouse_id,quantity,operator_name)\nVALUES ('X','count_adjustment_in',<material>,<bodega>,9000000000,'x');\n\nINSERT INTO inventory_movements(movement_number,movement_type,material_id,from_warehouse_id,quantity,operator_name)\nSELECT 'X','waste_adjustment',material_id,warehouse_id,quantity,'x'\n  FROM inventory_stock WHERE material_id=<m> AND warehouse_id=<b>;",
  'Rechazo: los ajustes sueltos los registra administración.',
  'B01: stock ahora 9.000.061.230 kg. B04: una fila de 61.230 kg queda en 0, sin nota.',
  'Inventario y balance de masa inservibles; se pueden inflar kilos valorizados o esconder pérdidas.',
  "005 §1: en check_movement_operario, si no es admin y el tipo es count_adjustment_in o waste_adjustment sin «Anula/Corrige» → RAISE 'Las correcciones de conteo las registra administración.'",
  'B01 y B04 deben fallar como operario; L07 (admin, sobrante 50 kg) debe pasar.'),
 ('003', 'Crítica', '6.5', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
  'Producción sin consumo o con producto mayor al consumo',
  'inventory_movements (production_intake / production_output)', 'operario', 'Réplica',
  ['Insertar solo un production_output de 900.000 kg (B02).', 'Insertar un consumo de 1 kg y un producto de 40.000 kg en la misma llamada (B03).'],
  "INSERT INTO inventory_movements(...,movement_type,...,quantity) VALUES ('X','production_output',...,900000);\n-- B03: intake 1 kg + output 40.000 kg en el mismo insert",
  'El producto exige su consumo en la misma operación, no lo supera y lleva la merma en notas.',
  'B02 y B03 se guardan; el stock de pellet sube sin materia prima.',
  'Kilos de pellet «de la nada»: el certificado de valorización y el reporte Ley REP pueden respaldar material que nunca entró.',
  "005 §1: production_* exige notas; production_output exige production_intake del mismo usuario en la misma transacción (xmin = pg_current_xact_id()) y producto ≤ consumo.",
  'B02, B03 y B03c (producto en otra llamada) fallan; L02 (consume 1.000, obtiene 900) pasa.'),
 ('004', 'Alta', '6.5', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
  'El tope de un camión (50.000 kg) solo existe en la recepción; «Corrige» no tiene tope',
  'check_movement / tope_camion()', 'operario', 'Réplica',
  ['Registrar un movimiento propio de hoy.', 'Insertar un «Corrige MOV-…» de +5.000.000 kg sobre él (E05).'],
  "INSERT INTO inventory_movements(movement_number,movement_type,material_id,to_warehouse_id,quantity,operator_name,reference_doc,notes)\nVALUES ('X','count_adjustment_in',<m>,<b>,5000000,'x','Corrige SET-OP1-HOY','m');",
  'Ningún movimiento de operario supera un camión.', 'Se guarda: +5.000.000 kg.',
  'Una corrección sirve como vía para inflar stock sin pasar por el control de recepción.',
  '005 §1: si no es admin y quantity > tope_camion() → RAISE, para todo tipo de movimiento.',
  'E05 falla como operario; L01 (camión normal) pasa.'),
 ('005', 'Alta', 'N/A', 'Integridad de datos, no es un ataque',
  'El stock en vivo no sale del kardex: 205.387 kg sin movimiento que los respalde',
  'inventory_stock vs inventory_movements (datos de 002_datos_ejemplo)', 'operario (lectura)', 'Vivo (solo lectura)',
  ['Como operario, sumar inventory_stock.', 'Sumar el kardex por tipo (entradas − salidas).', 'Comparar por material y bodega.'],
  "SELECT sum(quantity) FROM inventory_stock;                 -- 226.687 kg\nSELECT sum(CASE WHEN movement_type IN ('reception','production_output','count_adjustment_in') THEN quantity\n                WHEN movement_type IN ('dispatch','production_intake','waste_adjustment') THEN -quantity END)\n  FROM inventory_movements;                                  -- 21.300 kg",
  'Regla 1: el stock es la suma del kardex.', '11 de 11 filas descuadradas; 205.387 kg sin asiento.',
  'Ningún reporte ni certificado puede justificar esos kilos ante una fiscalización.',
  '006_propuesta_saldo_inicial.sql: registra cada diferencia como asiento «Saldo inicial» sin cambiar el stock (probado en réplica: stock = kardex = catálogo = 224.717 kg). O bien borrar los datos de ejemplo antes de llevarlo a la empresa.',
  'En CI: para cada (material, bodega), stock = suma del kardex. Debe dar 0 filas descuadradas.'),
 ('006', 'Alta', '5.7', 'AV:N/AC:L/PR:L/UI:R/S:U/C:N/I:H/A:N',
  'Lote fantasma: un lote sin entrada de stock llega a «despachado» y se certifica',
  'batches + valorization_certificates', 'operario (crea y avanza) + admin (certifica)', 'Réplica',
  ['Operario crea un lote de 50.000 kg sin movimiento de recepción.', 'Lo avanza por las 4 etapas hasta dispatched.', 'El admin emite el certificado de ese lote.'],
  "INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg) VALUES ('FANT',<m>,<sup>,50000,50000);\nUPDATE batches SET status='washing_sorting' … 'shredded' … 'pelletized' … 'dispatched' WHERE batch_number='FANT';\n-- admin\nINSERT INTO valorization_certificates(...,batch_id,total_kg_valorized,...) SELECT ...,id,50000,... FROM batches WHERE batch_number='FANT';",
  'Sin entrada vigente en el kardex no hay certificado.', 'Certificado por 50.000 kg; entradas del lote: 0.',
  'Certificado de valorización sin material real detrás: es el documento que el generador presenta para la Ley REP.',
  '005 §3: check_certificate_datos exige un movimiento reception del lote que no sea «Anula/Corrige» y no esté anulado.',
  'C02 falla; L08 (lote con entrada real) pasa.'),
 ('013', 'Alta', '9.1 con 001', 'Mismo vector que 001',
  'Toda cuenta nueva queda como operario ACTIVO',
  'handle_new_user()', 'anónimo → cuenta nueva', 'Réplica (código de 003)',
  ['Crear un usuario en auth.users.', 'Revisar su fila en profiles.'],
  "SELECT role, is_active FROM profiles WHERE id = <nuevo>;   -- operator, true",
  'Cuenta nueva inactiva hasta que un admin la active.', 'operator, activo.',
  'Si el registro se abre por error, o alguien obtiene una invitación, entra con acceso completo de operario.',
  '005 §4: handle_new_user deja is_active = false salvo la primera cuenta del sistema.',
  'A05 con 005: la cuenta nueva ve 0 empresas y 0 movimientos.'),
 ('007', 'Media', '2.7', 'AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:L/A:N',
  'Certificado con tipo de residuo, destino y QR vacíos',
  'valorization_certificates', 'admin', 'Réplica',
  ['Como admin, emitir certificado de un lote despachado con waste_type = \'\', qr = \'\' y destino NULL (D04).'],
  "INSERT INTO valorization_certificates(...,waste_type,...,qr_verification_code,final_destination_product)\nSELECT ...,'',...,'',NULL FROM batches WHERE batch_number='LOTE-2026-0825';",
  'Rechazo por datos faltantes.', 'Se emite.',
  'Certificado sin datos verificables; la app ya rechaza el PDF, pero la fila queda en la base.',
  '005 §3: RAISE si waste_type, final_destination_product o qr_verification_code vienen vacíos.',
  'D04 falla; L08 pasa.'),
 ('008', 'Media', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N',
  'Fecha de recepción del lote la elige el cliente',
  'batches.reception_date → Reportes.tsx:31', 'operario', 'Réplica',
  ['Crear un lote con reception_date = 2020-01-01 (C01).'],
  "INSERT INTO batches(batch_number,material_id,supplier_id,initial_weight_kg,current_weight_kg,reception_date)\nVALUES ('X',<m>,<sup>,100,100,'2020-01-01');",
  'La fecha la pone el servidor.', 'Se guarda con fecha 2020.',
  'Los reportes filtran lotes por esa fecha: se puede meter un lote en un mes ya cerrado.',
  '005 §2: trigger que fuerza reception_date = now() si no es admin (el admin la conserva para importar planillas).',
  'C01 con 005: fecha = hoy.'),
 ('009', 'Media', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N',
  'Movimiento con lote de otro material (o anulado)',
  'inventory_movements.batch_id', 'operario', 'Réplica',
  ['Despachar 1 kg del material A indicando un lote del material B (B08).'],
  "INSERT INTO inventory_movements(...,material_id,batch_id,...) VALUES ('X','dispatch',<A>,(SELECT id FROM batches WHERE material_id<><A> LIMIT 1),<b>,1,'x');",
  'Rechazo.', 'Se guarda.', 'Rompe la trazabilidad lote → material → certificado.',
  '005 §1: el lote debe ser del mismo material (salvo production_output) y no estar [ANULADO].',
  'B08 falla.'),
 ('010', 'Media', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N',
  'Movimiento en «ton» se suma como kg',
  'inventory_movements.unit', 'operario', 'Réplica',
  ['Insertar 5 con unit = \'ton\' para un material en kg (B09).'],
  "INSERT INTO inventory_movements(...,to_warehouse_id,unit) VALUES (...,5,'x',<b>,'ton');",
  'La unidad la impone el material.', 'Suma 5 a un stock en kg (debería ser 5.000 o rechazo).',
  'Error ×1000 posible en cualquier cifra.', '005 §1: NEW.unit := unidad del material.',
  'B09 con 005: la fila queda en kg.'),
 ('011', 'Media', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N',
  'Bodega sin límite de capacidad', 'warehouses.capacity_tons', 'operario', 'Réplica',
  ['Sumar 5.000.000 kg a una bodega de 650 t (B10).'], "-- ver B10 en ataque_operario.py",
  'Rechazo sobre la capacidad.', 'Bodega con 5.108 t de 650 t.',
  'Cifras físicamente imposibles en el inventario.',
  '005 §1: trigger AFTER trg_z_capacidad_bodega. Ocupación real hoy: 11 %, 8 %, 17 % y 0 %; no afecta la operación.',
  'B10 y B10b fallan.'),
 ('012', 'Media', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N',
  'El operario se cambia el nombre y firma movimientos como otra persona',
  'profiles.full_name → inventory_movements.operator_name', 'operario', 'Réplica',
  ['UPDATE de su propio full_name a «Admin» (G02).', 'Registrar un movimiento.'],
  "UPDATE profiles SET full_name='Admin' WHERE id=auth.uid();\n-- el movimiento queda con operator_name = 'Admin'",
  'Solo admin cambia nombres.', 'operator_name = Admin.',
  'El kardex muestra un responsable falso (created_by sigue siendo el real).',
  '005 §4: protect_profile_fields protege también full_name.', 'G02 falla.'),
 ('014', 'Media', '5.4', 'AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N',
  'El operario lee y sube archivos en la carpeta de documentos (certificados)',
  'storage.objects, bucket greenspot-docs', 'operario', 'Réplica (políticas de 003)',
  ['Listar storage.objects (H01).', 'Subir certificados/CERT-FALSO.pdf (H02).'],
  "SELECT name FROM storage.objects;   -- ve certificados/CERT-ADMIN.pdf\nINSERT INTO storage.objects(bucket_id,name) VALUES ('greenspot-docs','certificados/CERT-FALSO.pdf');",
  'greenspot-docs solo admin.', 'Lee y sube.',
  'Un PDF falso con nombre de certificado puede circular como oficial.',
  '005 §5: greenspot-docs solo is_admin(); greenspot-media para usuarios activos.',
  'H01 y H02 fallan como operario; L09 (foto en media) pasa.'),
 ('015', 'Baja', '4.3', 'AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
  'El operario ve RUT, correos y teléfonos de las empresas, y unit_cost_usd',
  'stakeholders, materials_and_products', 'operario', 'Réplica',
  ['SELECT * FROM stakeholders; SELECT unit_cost_usd FROM materials_and_products;'], "SELECT * FROM stakeholders;",
  'El operario ve solo lo que necesita (nombre).', 'Ve todo.',
  'Datos personales y comerciales expuestos a más personas de lo necesario.',
  'Propuesta, no incluida en 005: vista stakeholders_operario con id y nombre; columnas sensibles solo admin.',
  'Operario: SELECT rut FROM stakeholders → permiso denegado.'),
 ('017', 'Baja', '—', '—',
  'Funciones de PIN sin uso siguen en la base', 'set_my_pin, verify_my_pin, reset_user_pin', 'operario', 'Esquema',
  ['La app ya no usa PIN (eliminado el 10-nov).'], "-- \\df public.*pin*",
  'Sin superficie sin uso.', 'Las 3 funciones existen y son ejecutables por authenticated.',
  'Superficie de ataque sin beneficio.', 'DROP FUNCTION de las tres (pendiente de aprobación; no está en 005).',
  'Llamarlas devuelve «function does not exist».'),
 ('018', 'Baja', '—', '—',
  'El número de movimiento lo elige el cliente', 'inventory_movements.movement_number', 'operario', 'Esquema (observado, no explotado)',
  ['Insertar un movimiento con movement_number arbitrario.'], "INSERT INTO inventory_movements(movement_number,…) VALUES ('MOV-LO-QUE-SEA',…);",
  'Numeración correlativa del servidor.', 'Acepta cualquier texto único.',
  'Saltos y números engañosos en el kardex (no duplica: hay UNIQUE).', 'Secuencia en un DEFAULT del servidor.',
  'Insertar sin movement_number → recibe MOV-AAAA-NNNNN.'),
 ('016', 'Info', '0.0', '—',
  'anon puede ejecutar is_admin(), is_active_user() y tope_camion()', 'funciones auxiliares', 'anónimo', 'Esquema',
  ['rpc/is_admin sin sesión.'], "SELECT is_admin();  -- false",
  '—', 'Devuelven false / 50000.', 'Sin impacto: no filtran datos.', 'Opcional: REVOKE EXECUTE … FROM anon.', '—'),
]
SEVC = {'Crítica': 'crit', 'Alta': 'alta', 'Media': 'media', 'Baja': 'baja', 'Info': 'info'}
conteo = {s: sum(1 for h in H if h[1] == s) for s in SEVC}

# Matriz: (recurso, operación, anon, operario, admin, esperado, riesgo)
OK, NO, MAL = 'ok', 'no', 'mal'
MZ = [
 ('Auth · signup', 'crear cuenta', ('Permite', MAL), ('—', OK), ('—', OK), 'Solo por invitación', 'Crítico (001)'),
 ('profiles', 'leer', ('No', OK), ('Solo la propia', OK), ('Todas', OK), 'Igual', '—'),
 ('profiles', 'cambiar rol / estado', ('No', OK), ('Bloqueado', OK), ('Permite', OK), 'Igual', '—'),
 ('profiles', 'cambiar nombre', ('No', OK), ('Permite', MAL), ('Permite', OK), 'Solo admin', 'Medio (012)'),
 ('profiles', 'leer pin_hash', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Igual', '—'),
 ('stakeholders', 'leer', ('No', OK), ('Todo, con RUT', MAL), ('Todo', OK), 'Operario: solo nombre', 'Bajo (015)'),
 ('stakeholders', 'crear / editar', ('No', OK), ('Bloqueado', OK), ('Permite', OK), 'Igual', '—'),
 ('materials / warehouses', 'crear / editar', ('No', OK), ('Bloqueado', OK), ('Permite', OK), 'Igual', '—'),
 ('inventory_stock', 'editar / borrar directo', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Solo por kardex', '—'),
 ('inventory_movements', 'recepción ≤ 50 t con lote', ('No', OK), ('Permite', OK), ('Permite', OK), 'Igual', '—'),
 ('inventory_movements', 'despacho > stock', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Igual', '—'),
 ('inventory_movements', 'ajuste conteo / merma', ('No', OK), ('Permite sin tope', MAL), ('Permite', OK), 'Solo admin', 'Crítico (002)'),
 ('inventory_movements', 'producción', ('No', OK), ('Sin consumo ni límite', MAL), ('Permite', OK), 'Consumo ≥ producto, mismo acto', 'Crítico (003)'),
 ('inventory_movements', 'Corrige', ('No', OK), ('Sin tope', MAL), ('Permite', OK), 'Operario ≤ 50 t', 'Alto (004)'),
 ('inventory_movements', 'Anula ajeno / de ayer / doble', ('No', OK), ('Bloqueado', OK), ('Permite (ajeno)', OK), 'Igual', '—'),
 ('inventory_movements', 'editar / borrar', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Igual', '—'),
 ('batches', 'crear', ('No', OK), ('Fecha libre', MAL), ('Permite', OK), 'Fecha del servidor', 'Medio (008)'),
 ('batches', 'cambiar peso / saltar etapa / [ANULADO]', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Igual', '—'),
 ('batches', 'borrar', ('No', OK), ('Bloqueado', OK), ('Permite', OK), 'Igual', '—'),
 ('valorization_certificates', 'leer / emitir', ('No', OK), ('Bloqueado', OK), ('Permite', OK), 'Igual', '—'),
 ('valorization_certificates', 'emitir de lote fantasma / sin datos', ('No', OK), ('Bloqueado', OK), ('Permite', MAL), 'Rechazo', 'Alto (006) / Medio (007)'),
 ('valorization_certificates', 'segundo certificado del lote', ('No', OK), ('Bloqueado', OK), ('Bloqueado', OK), 'Igual', '—'),
 ('storage · greenspot-docs', 'leer / subir', ('No', OK), ('Permite', MAL), ('Permite', OK), 'Solo admin', 'Medio (014)'),
 ('storage · greenspot-docs', 'borrar / sobrescribir', ('No', OK), ('Bloqueado', OK), ('No probado', NO), 'Igual', '—'),
 ('storage · greenspot-media', 'leer / subir', ('No', OK), ('Permite', OK), ('Permite', OK), 'Igual', '—'),
 ('fn set_my_pin / verify / reset', 'ejecutar', ('No', OK), ('Permite (sin uso)', MAL), ('Permite', MAL), 'No existir', 'Bajo (017)'),
 ('fn is_admin / is_active_user / tope', 'ejecutar', ('Permite', NO), ('Permite', OK), ('Permite', OK), 'Indiferente', 'Info (016)'),
]

def chip(t): return f'<span class="sev {SEVC[t]}">{t}</span>'
def celda(c): return f'<td class="m {c[1]}">{E(c[0])}</td>'

hall = []
for h in H:
    (i, sev, cv, vec, tit, act, rol, ori, pasos, sql, esp, obt, imp, fix, reg) = h
    hall.append(f'''<article class="hal" id="gs-sec-{i}">
<header><span class="cod">GS-SEC-{i}</span>{chip(sev)}<h3>{E(tit)}</h3></header>
<dl class="meta"><div><dt>CVSS 3.1</dt><dd><b>{E(cv)}</b> <code>{E(vec)}</code></dd></div>
<div><dt>Activo</dt><dd>{E(act)}</dd></div><div><dt>Rol</dt><dd>{E(rol)}</dd></div><div><dt>Evidencia</dt><dd>{E(ori)}</dd></div></dl>
<div class="cuerpo"><div><h4>Reproducción</h4><ol>{''.join(f'<li>{E(p)}</li>' for p in pasos)}</ol>
<pre><code>{E(sql)}</code></pre></div>
<div class="lado"><h4>Esperado</h4><p>{E(esp)}</p><h4>Obtenido</h4><p class="obt">{E(obt)}</p>
<h4>Impacto</h4><p>{E(imp)}</p><h4>Corrección</h4><p>{E(fix)}</p><h4>Prueba de regresión</h4><p>{E(reg)}</p></div></div></article>''')

top = [h for h in H if h[0] in ('001', '002', '003', '005', '006')]
filas = ''.join(f'<tr><th scope="row">{E(r)}</th><td>{E(o)}</td>{celda(a)}{celda(op)}{celda(ad)}<td>{E(e)}</td><td>{E(rg)}</td></tr>' for r, o, a, op, ad, e, rg in MZ)

doc = f'''<title>Auditoría Greenspot · operario</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Informe técnico sobrio: una columna de lectura, tablas anchas con scroll propio, severidad como franja de color. */
:root {{
  --bg:#f6f7f5; --sup:#ffffff; --fg:#1d2420; --sec:#5b6660; --linea:#d9ddd8; --acento:#2f6b4f;
  --crit:#b3261e; --alta:#c25a12; --media:#a07a00; --baja:#3d6a8a; --info:#6b7570;
  --ok-bg:#e6f1ea; --ok-fg:#225b3d; --mal-bg:#fbe7e4; --mal-fg:#8f1d16; --no-bg:#eef0ee; --no-fg:#5b6660;
  --sans:"IBM Plex Sans",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg:#141917; --sup:#1b211e; --fg:#e3e8e4; --sec:#9aa59f; --linea:#2d3531; --acento:#7cc3a0;
  --crit:#f2867e; --alta:#f0a066; --media:#e0c25a; --baja:#8fbbdb; --info:#a3ada8;
  --ok-bg:#1d3327; --ok-fg:#9fd8b8; --mal-bg:#3a1e1b; --mal-fg:#f5aaa3; --no-bg:#232a26; --no-fg:#9aa59f; color-scheme:dark }} }}
:root[data-theme="dark"] {{
  --bg:#141917; --sup:#1b211e; --fg:#e3e8e4; --sec:#9aa59f; --linea:#2d3531; --acento:#7cc3a0;
  --crit:#f2867e; --alta:#f0a066; --media:#e0c25a; --baja:#8fbbdb; --info:#a3ada8;
  --ok-bg:#1d3327; --ok-fg:#9fd8b8; --mal-bg:#3a1e1b; --mal-fg:#f5aaa3; --no-bg:#232a26; --no-fg:#9aa59f; color-scheme:dark }}
body {{ background:var(--bg); color:var(--fg); font:15px/1.6 var(--sans); }}
.pag {{ max-width:1080px; margin:0 auto; padding-block:40px 80px; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); display:grid; gap:48px; }}
h1,h2,h3 {{ text-wrap:balance; line-height:1.25; margin:0; }}
h1 {{ font-size:1.9rem; font-weight:600; }} h2 {{ font-size:1.3rem; font-weight:600; padding-bottom:8px; border-bottom:1px solid var(--linea); }}
h3 {{ font-size:1.05rem; font-weight:600; }} h4 {{ font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--sec); margin:14px 0 2px; font-weight:600; }}
p {{ margin:0; }} code,pre {{ font-family:var(--mono); font-size:.82rem; }}
.eti {{ font-size:.75rem; text-transform:uppercase; letter-spacing:.1em; color:var(--acento); font-weight:600; }}
.cab {{ display:grid; gap:10px; }} .cab p {{ color:var(--sec); max-width:70ch; }}
section {{ display:grid; gap:18px; min-width:0; }}
.conteo {{ display:flex; flex-wrap:wrap; gap:0; border:1px solid var(--linea); background:var(--sup); }}
.conteo div {{ flex:1 1 110px; padding:14px 16px; border-right:1px solid var(--linea); display:grid; gap:2px; }}
.conteo div:last-child {{ border-right:0; }} .conteo b {{ font-size:1.7rem; font-variant-numeric:tabular-nums; font-weight:600; }}
.conteo span {{ font-size:.78rem; color:var(--sec); }}
.conteo .crit b {{ color:var(--crit); }} .conteo .alta b {{ color:var(--alta); }} .conteo .media b {{ color:var(--media); }} .conteo .baja b {{ color:var(--baja); }}
.sev {{ display:inline-block; font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; padding:2px 8px; border:1px solid currentColor; }}
.sev.crit {{ color:var(--crit); }} .sev.alta {{ color:var(--alta); }} .sev.media {{ color:var(--media); }} .sev.baja {{ color:var(--baja); }} .sev.info {{ color:var(--info); }}
.top {{ list-style:none; padding:0; margin:0; display:grid; gap:0; }}
.top li {{ display:grid; grid-template-columns:auto 1fr; gap:4px 14px; padding:12px 0; border-bottom:1px solid var(--linea); }}
.top a {{ color:var(--fg); font-weight:500; }} .top small {{ grid-column:2; color:var(--sec); }}
.impacto {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; }}
.impacto div {{ display:grid; gap:4px; align-content:start; }} .impacto h3 {{ font-size:.95rem; color:var(--acento); }}
.nota {{ border-left:3px solid var(--acento); padding:10px 14px; background:var(--sup); color:var(--sec); font-size:.9rem; }}
.hal {{ background:var(--sup); border:1px solid var(--linea); display:grid; min-width:0; }}
.hal header {{ display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid var(--linea); }}
.hal header h3 {{ flex:1 1 300px; }} .cod {{ font-family:var(--mono); font-size:.8rem; color:var(--sec); }}
.meta {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin:0; padding:10px 18px; gap:8px 20px; border-bottom:1px solid var(--linea); }}
.meta dt {{ font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--sec); }} .meta dd {{ margin:0; font-size:.88rem; overflow-wrap:anywhere; }}
.cuerpo {{ display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); gap:0 28px; padding:4px 18px 18px; }}
.cuerpo ol {{ margin:0; padding-left:20px; }} .obt {{ color:var(--crit); }}
pre {{ background:var(--bg); border:1px solid var(--linea); padding:10px 12px; overflow-x:auto; margin:12px 0 0; white-space:pre; }}
.tabla {{ overflow-x:auto; border:1px solid var(--linea); background:var(--sup); }}
table {{ border-collapse:collapse; width:100%; font-size:.84rem; min-width:860px; }}
th,td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--linea); vertical-align:top; }}
thead th {{ font-size:.7rem; text-transform:uppercase; letter-spacing:.07em; color:var(--sec); background:var(--bg); }}
tbody th {{ font-family:var(--mono); font-weight:500; font-size:.8rem; }}
td.m.ok {{ background:var(--ok-bg); color:var(--ok-fg); }} td.m.mal {{ background:var(--mal-bg); color:var(--mal-fg); font-weight:600; }} td.m.no {{ background:var(--no-bg); color:var(--no-fg); }}
.plan {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:24px; }}
.plan div {{ display:grid; gap:6px; align-content:start; }} .plan ol,.plan ul {{ margin:0; padding-left:20px; display:grid; gap:6px; }}
.pie {{ color:var(--sec); font-size:.85rem; display:grid; gap:6px; }}
a {{ color:var(--acento); }} a:focus-visible {{ outline:2px solid var(--acento); outline-offset:2px; }}
@media (max-width:720px) {{ .cuerpo {{ grid-template-columns:minmax(0,1fr); }} h1 {{ font-size:1.5rem; }} }}
</style>
<main class="pag">
<div class="cab"><span class="eti">Greenspot · Auditoría de seguridad · 17-nov-2026</span>
<h1>Qué puede hacer un operario autenticado llamando directo a Supabase</h1>
<p>Pruebas con la sesión de un operario, sin service_role ni clave secreta. En vivo solo se hizo lectura. Toda escritura se reprodujo en una réplica local de Postgres armada con los mismos SQL del repositorio (001–004), dentro de transacciones que se revierten.</p></div>

<section><h2>1. Resumen ejecutivo</h2>
<div class="conteo">{''.join(f'<div class="{SEVC[s]}"><b>{conteo[s]}</b><span>{s}</span></div>' for s in SEVC)}<div><b>{len(H)}</b><span>Total</span></div></div>
<p>La base ya bloquea bien lo grueso: anónimos e inactivos no escriben, el stock no se edita directo, el historial no se borra, el operario no emite certificados ni se sube a admin. Lo que falla es que <b>las reglas de inventario solo existen en la recepción</b>. Ajustes, producción y correcciones no tienen tope ni coherencia. A eso se suma el registro público abierto, que convierte a cualquier persona en operario.</p>
<h3>Los 5 riesgos principales</h3>
<ol class="top">{''.join(f'<li>{chip(h[1])}<a href="#gs-sec-{h[0]}">GS-SEC-{h[0]} · {E(h[4])}</a><small>{E(h[12])}</small></li>' for h in top)}</ol>
<h3>Impacto por área</h3>
<div class="impacto">
<div><h3>Inventario</h3><p>Un operario puede subir el stock a 9.000 millones de kg, vaciar una bodega, producir sin consumir o pasar la capacidad física. Además, 205.387 kg del stock vivo no tienen movimiento que los respalde.</p></div>
<div><h3>Trazabilidad</h3><p>Movimientos con lote de otro material, lotes con fecha retroactiva y nombres de responsable falsos en el kardex.</p></div>
<div><h3>Certificados</h3><p>Se puede certificar un lote que nunca tuvo entrada de material, y emitir certificados sin tipo de residuo, destino ni QR. Un operario puede subir un PDF a la carpeta de certificados.</p></div>
<div><h3>Ley REP</h3><p>Los kilos valorizados que respalda cada certificado pueden no corresponder a material real. Ante una fiscalización, el sistema no puede demostrar el origen de esos kilos.</p></div>
</div>
<p class="nota">Con la propuesta <b>005_propuesta_cierre_operario.sql</b> aplicada en la réplica, los 12 ataques que hoy pasan quedan bloqueados y los 9 flujos legítimos (camión, producción coherente, anulación, despacho, traslado, avance de etapa, ajuste de admin, certificado real, foto) siguen funcionando. <b>Nada se ha aplicado en Supabase.</b></p>
</section>

<section><h2>2. Hallazgos detallados</h2>
<p class="nota">El CVSS es una estimación de la base técnica. La severidad final pondera el impacto en certificados y cumplimiento, por eso 002 y 003 son críticas aunque su CVSS sea 6.5. Las pruebas citadas (A05, B01…) están en <code>ataque_operario.py</code>.</p>
{''.join(hall)}
</section>

<section><h2>3. Matriz de autorización</h2>
<p>Estado actual de la base en vivo según los SQL 001–004 (verificado en réplica; en vivo las lecturas coinciden). Rojo = permitido y no debería. Verde = correcto.</p>
<div class="tabla"><table><thead><tr><th>Recurso</th><th>Operación</th><th>anon</th><th>operario</th><th>admin</th><th>Esperado</th><th>Riesgo</th></tr></thead><tbody>{filas}</tbody></table></div>
</section>

<section><h2>4. Plan de remediación</h2>
<div class="plan">
<div><h3>Inmediato (hoy)</h3><ol>
<li>Desactivar el registro público en el panel de Supabase (001).</li>
<li>Revisar en Authentication › Users que no existan cuentas desconocidas.</li>
<li>Aplicar 005 con aprobación (002–004, 006–014).</li>
<li>Ocultar al operario el flujo «Corrección de conteo» y <code>api.adjustStock</code>. La regla 002 los rechaza; si el operario debe declarar mermas, decidir otra vía: solicitud que aprueba el admin.</li></ol></div>
<div><h3>Antes de producción</h3><ol>
<li>Cuadrar el stock con 006 (saldo inicial) o partir con la base vacía (005 · GS-SEC-005).</li>
<li>Limitar las columnas de empresas que ve el operario (015).</li>
<li>Borrar las funciones de PIN (017).</li>
<li>Numeración de movimientos en el servidor (018).</li></ol></div>
<div><h3>Mejoras</h3><ul>
<li>Bitácora de auditoría (quién, qué, cuándo) para lotes y certificados.</li>
<li>Alerta al admin cuando un movimiento supere un umbral.</li>
<li>Revisión periódica de usuarios activos.</li></ul></div>
<div><h3>Pruebas para CI</h3><ul>
<li><code>supabase/auditoria-2026-11-17/correr.sh con005</code>: debe terminar con 0 fallas.</li>
<li>Cuadre stock = kardex: 0 filas descuadradas.</li>
<li><code>GET /auth/v1/settings</code> → <code>disable_signup: true</code>.</li>
<li>Cada regla con su caso positivo (L01–L09) y negativo (A–H) por rol: anon, operario, otro operario, admin.</li></ul></div>
</div></section>

<footer class="pie"><p><b>Archivos</b> (en el repo, sin commit): <code>supabase/auditoria-2026-11-17/</code> — 005_propuesta_cierre_operario.sql, 006_propuesta_saldo_inicial.sql, ataque_operario.py, stub_supabase.sql, correr.sh.</p>
<p><b>Límites:</b> en vivo no se hicieron escrituras (regla de producción). La paridad de políticas en vivo se asume desde los SQL del repo; las lecturas en vivo coinciden. No se probó Storage como anónimo ni las Edge Functions (no hay).</p></footer>
</main>'''
open(OUT, 'w').write(doc)
print('ok', conteo, len(H))
