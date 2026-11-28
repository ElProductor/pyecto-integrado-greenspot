# Pruebas

El 20 de noviembre de 2026 estuvimos probando la rama `test/pruebas-jorge` (commit `c71f423`). Acá dejo constancia de qué corrimos, qué queríamos comprobar y qué salió al final. Hubo dos partes: la suite automática de siempre, que no escribe en la base, y los seis casos EV3, donde sí dejamos datos de prueba con autorización.

## La suite automática

`npm run pruebas` levanta cuatro pasadas con Puppeteer contra `http://localhost:5173/`, con `npm run dev` ya abierto. Corre `recorrido.cjs` como administración, el mismo con el argumento `op`, y después `ajustes.cjs` y su versión `op`. En total son 95 comprobaciones.

La idea era recorrer la app como administración y como operario sin modificar los datos reales. Para eso los scripts cortan cualquier `POST`, `PATCH` o `DELETE` que vaya a Supabase antes de cargar la página. El rol de administración se simula solo en ese navegador, cambiando el perfil que devuelve Supabase; por eso la cuenta de `.env.local` tiene que ser de operario.

Probamos el ingreso con clave mala y con la correcta, y que en cada pasada apareciera el rol esperado. Después pasamos por Lotes, Materiales y Movimientos con ambos roles, y por Empresas, Certificados, Reportes y Configuración solo con administración. En todas miramos que no aparecieran `undefined` ni `NaN`.

En Lotes abrimos un lote para ver el recorrido y el rótulo, y confirmamos que el buscador filtrara. En Materiales revisamos la ficha técnica, el filtro de stock bajo el mínimo y el formulario nuevo con los campos vacíos. También abrimos una empresa y vimos que un RUT mal escrito se rechazaba.

Los flujos de registro también quedaron cubiertos: la tara mayor al bruto bloquea, el neto se calcula bien y el botón de guardar se habilita cuando corresponde; en `ajustes.cjs` queda probado el tope de 50.000 kg. En movimientos probamos una salida mayor al stock, un traslado a la misma bodega, el cierre del diálogo al clicar fuera y las pestañas de entradas, salidas, traslados, correcciones, producción y anulaciones.

La parte más larga fue la de correcciones y anulaciones. Ahí revisamos el conteo, la corrección de peso, el motivo obligatorio, el detalle cuando se elige «Otro» y el resumen antes de guardar. Al intentar guardar, la prueba corta la escritura y comprueba que la app muestre el error sin cerrar el diálogo.

También miramos los permisos. Administración ve «Corregir peso» y «Anular lote»; el operario ve el ajuste o la razón por la que no puede hacerlo. El modo «Ver como operario» muestra la franja, saca el menú de administración y vuelve al Inicio. En el menú de usuario no aparecen el cambio rápido ni el PIN, y `localStorage` no guarda cuentas de otras personas. Por último abrimos la app en tamaño de celular: el menú lateral abre y no hay scroll horizontal.

Al final las cuatro pasadas salieron sin `FALLA`. En la anulación como administración se intentó un `POST` a `/rest/v1/inventory_movements`, pero quedó bloqueado, así que la base siguió igual. Los `400` de la consola son de la clave incorrecta que probamos a propósito y el `net::ERR_FAILED` es la escritura cortada a mano; ambos son esperables.

Al primer intento los scripts ni arrancaban: decían que faltaban `GREENSPOT_CORREO` y `GREENSPOT_CLAVE`, aunque estaban en `.env.local`. Era el salto de línea de Windows: con CRLF quedaba un `\r` al final de cada línea y la expresión regular no encontraba las variables. Cambiamos `split('\n')` por `split(/\r?\n/)` en `pruebas/recorrido.cjs:6` y `pruebas/ajustes.cjs:6`. Lo demás quedó igual: se sigue recortando con `.trim()` y las variables del entorno siguen teniendo prioridad.

`npm run build` también pasó. Solo salió el aviso de siempre por el tamaño del bundle.

Si la quieres repetir, instala dependencias con `npm install`, deja `npm run dev` abierto y pon una cuenta de operario en `GREENSPOT_CORREO` y `GREENSPOT_CLAVE`, ya sea en `.env.local` o como variables del proceso. `.env.local` no se sube al repositorio.

En Windows hay que decirle dónde está Edge, porque por defecto el script busca `/usr/bin/chromium`:

```powershell
$env:CHROMIUM = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run pruebas
```

En Linux, si Chromium está en otra ruta, se define `CHROMIUM` con esa ruta. También se puede cambiar la dirección de la app con `GREENSPOT_URL`.

## Los seis casos EV3

Estos corrieron después. Primero revisamos lo que no escribe: bloqueamos `POST`, `PATCH` y `DELETE`, simulamos stock alto y descargamos archivos sin tocar los datos. Después, con autorización, guardamos datos de prueba: los lotes `LOTE-2026-0860`, `LOTE-2026-0861` y `LOTE-2026-0863`, una producción de 100 → 92 kg, una anulación y el certificado `CERT-REP-2026-0099`. No tocamos `supabase/` ni ejecutamos migraciones. Las credenciales fueron por variables de entorno y no quedaron en el repositorio.

En resumen: C1 quedó con una falla (corregida y aprobada después, ver abajo), C2, C3, C5 y C6 pasaron, y C4 pasó con una observación.

### C1 · Registrar camión

Probamos el tope, la coma decimal y el asistente en una pantalla de 390×844. Queríamos ver que 50.001 kg se rechazara, que `1,5` quedara en `1` tanto pegado como escrito, y que el flujo se pudiera terminar en el celular.

El tope funcionó: apareció «Revisa el peso: un camión no supera los 50.000 kg netos» y el botón quedó deshabilitado. `1,5` pegado también se cortó a `1`. En el celular emulado se vio el diálogo, el botón de guardar habilitado y no hubo scroll horizontal; el guardado terminó en `LOTE-2026-0863` con 1.500 kg.

La falla apareció al escribir `1,5` tecla a tecla: el campo terminó en `15`. Está en `src/componentes/Flujos.tsx:88`: la coma se saca del valor controlado y después el `5` se pega al `1`. Por eso C1 queda como **FAIL**. La prueba en un celular físico la dejamos para revisión manual.

**Corrección posterior (20-nov):** el campo ahora acepta la coma decimal (hasta 2 decimales) y el punto de miles; `1,5` escrito tecla a tecla queda en 1,5 kg. C1 se repitió en pantalla el mismo día: una entrada de 1.250,5 kg se guardó exacta, y «1500,5» con tara «1,5» da un neto de 1.499 kg. C1 queda como **PASS**.

### C2 · Producción

Entramos por «Registrar movimiento › Producción», elegimos un material con stock y pusimos 100 kg de entrada con 92 kg de salida. Esperábamos una merma de 8 kg / 8 %, que el stock se moviera en los dos materiales y que una salida mayor a la entrada quedara bloqueada.

La pantalla mostró «Merma | 8 kg · 8 %». Al probar 200 kg de salida apareció «No puede salir más de lo que entró (100 kg)» y no dejó guardar. Con el caso válido, el stock bajó 100 kg en el material de entrada y subió 92 kg en el producto; en Movimientos quedaron los registros de producción. **PASS.**

### C3 · Anulación y permisos

Anulamos el `LOTE-2026-0860` desde el panel de Entradas con motivo «Error de digitación». Buscábamos que el stock volviera a como estaba, que el registro quedara marcado como anulado, que no se pudiera anular dos veces y que el operario no tocara registros ajenos o anteriores.

El stock bajó 1.500 kg respecto del momento de la anulación, que es justo lo que había subido al recibir el camión. Al volver a abrir el registro ya no aparecían «Corregir peso» ni «Anular lote». Con la cuenta de operario no aparece Configuración y, en un registro ajeno o anterior, se muestra «Solo puedes corregir tus propios registros del día. Pídeselo a administración.». La doble anulación además está cubierta por la regla de Supabase con `FOR UPDATE` y el mensaje «Este registro ya está anulado.». **PASS.**

### C4 · Reportes

Elegimos octubre de 2026, descargamos `Greenspot-Planilla-2026-10.xlsx` y leímos la hoja «Resumen». Esperábamos el período correcto y cifras que correspondieran a los movimientos reales, no un todo en 0 sin explicación.

La planilla trajo «del 01-10-2026 al 31-10-2026». Las cuatro cifras salieron en 0. Antes de darlo por falla miramos la base: octubre no tiene movimientos, así que los ceros son los datos reales. Queda como **PASS con observación**; la apertura visual en Excel la dejamos para revisión manual.

### C5 · Inicio · bodega llena

Simulamos una bodega por sobre el 90 % de su capacidad y abrimos el Inicio. Queríamos un aviso con nombre y porcentaje, no solo el aviso de stock mínimo.

Apareció «Patio al 105 % de su capacidad (841 de 800 t)». Trae bodega y porcentaje. **PASS.**

### C6 · Certificados

Despachamos el `LOTE-2026-0861`, emitimos `CERT-REP-2026-0099` y descargamos `CERT-REP-2026-0099_Greenspot_Certificado.pdf`. Esperábamos que el PDF saliera desde un lote real, con código, lote, kilos, empresa y firma, sin datos inventados.

El PDF trae el código, el lote, los 1.000 kg y la empresa del registro. La generación usa los datos guardados del certificado; la revisión visual de la firma queda pendiente. **PASS.**

Las capturas automáticas están en `pruebas/capturas/`. Las de EV3 están en `pruebas/capturas-pantalla/ev3-*.png`, separadas de las de `npm run pruebas`. Ambas carpetas se suben al repositorio como evidencia. Los scripts temporales quedaron fuera del repositorio, en `C:\Users\jorge\AppData\Local\Temp\opencode\ev3-read.cjs` y `ev3-write.cjs`.

## Pendiente

- La rama ya está subida; falta el PR si se quiere abrir y estas notas todavía no están commiteadas.
- Actualizar `.env.local` con la cuenta de operario para que `npm run pruebas` funcione sin pasar variables a mano.
- Hacer que en Windows detecte Edge solo, para no definir `CHROMIUM` a mano.
- Corregir la coma decimal en `src/componentes/Flujos.tsx:88`.
- Revisar en Excel y en un celular físico los puntos que quedaron manuales.

## Actualización posterior (27 de noviembre de 2026) · `pruebas/integral/` y Supabase definitiva

- **Batería integral automatizada (`npm run pruebas:integral`):** incorporada en `pruebas/integral/` con `125/125` pruebas aprobadas (`01_formato_y_reglas.test.mjs`, `02_planilla_pdf_reportes.test.mjs`, `03_api_y_sql.test.mjs` y `04_ui_e2e_edge.test.mjs`), incluyendo regresión `!loteAnulado(l)` en `Empresas` y validación de `check_certificate_datos()` sin campo QR en `supabase/009_quitar_qr.sql`.
- **Despliegue y verificación en vivo en nueva base Supabase (`greenspot` / `zhztdovskiwagarqbdzs`):** aplicados los scripts `001`–`005` y `007`–`009` completos, cerrado el registro público en Auth y validados `11/11` flujos en vivo (`PL-01` a `PL-11`) conectando `npm run dev` a `zhztdovskiwagarqbdzs` en Microsoft Edge headless (incluyendo RLS/CLS de ambos roles `admin`/`operator`, `empresas()`, emisión real de certificado sin QR, anulación atómica y exclusión de `[ANULADO]` en *Empresas*, producción `100 → 92 kg`, descarga Excel y bloqueo de cuenta desactivada), restaurando luego la base limpia en `002_datos_ejemplo.sql`.

## Actualización posterior (27–28 de noviembre de 2026) · Cierre `010`, `006`, dependencias, carga `10.000` y control `#conf-cert-peso`

- **27-nov-2026 (noche, `-03:00`):** Aplicados `supabase/010_ajustes_auditoria.sql` y `006_propuesta_saldo_inicial.sql` sobre `zhztdovskiwagarqbdzs` (`15` movimientos, `11` `SALDO-INI-*`, `0.00 kg` descuadre); remediado `npm audit` de `12 → 0` vulnerabilidades (`read-excel-file@^9.3.20`, `write-excel-file@^4.1.1`, `jspdf@^4.2.1`, `puppeteer-core@^25.19.0`); verificados `SEC-JWT-01` (bloqueo inmediato de acceso por RLS tras desactivar cuenta con JWT activo) y `CONC-06`..`CONC-10` (capacidad multi-material, merma en lote `100 → 92 kg`, traslados opuestos `2/2`, `anular_certificado()` y rechazo `23505`); y ejecutada prueba de carga aislada en `yeqinvkstzzugijgeurv` (`10.015` movs, `1.504` lotes, `302` certs; `EXPLAIN ANALYZE` `0.146–1.325 ms`, `todo()` `5.774 ms` en `11` págs —desviación `+44,3 %` respecto a meta `4,00 s`—, `.xlsx` `851 ms` y ráfaga `20/20` en `811 ms` con `0` descuadres).
- **28-nov-2026 (`13:20–13:51 -03:00`):** Incorporado aviso sin lote vinculado y casilla obligatoria `#conf-cert-peso` en `Flujos.tsx` cuando un lote a certificar no registra `production_output` vinculado; revalidados `npm run build`, **`126/126`** pruebas integrales (`9746.45 ms`), `npm audit` (`found 0 vulnerabilities`) y recorrido E2E crítico en vivo sobre `dist/` + Edge headless + `zhztdovskiwagarqbdzs` (`14.241 ms`, `0` errores, recepción `1.250,5 kg`, merma vinculada `1.242,5 kg`, `anular_certificado()` + reemisión y bloqueo `#conf-cert-peso` en lote no vinculado). Los registros brutos completos se archivan en `pruebas/evidencias/`.
