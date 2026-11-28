# Greenspot · Inventario y trazabilidad

Aplicación web para la planta de **Greenspot SpA** , que recicla y valoriza plásticos de la acuicultura del sur de Chile: boyas y tuberías de HDPE, cajas de EPS, cabos y redes de PP.

Registra lo que entra en camión, sigue cada lote por sus etapas de proceso (patio, lavado, molienda, pellet y despacho), controla el stock por bodega y emite los certificados de valorización para la **Ley REP (N° 20.920)**.

Está hecha con React, TypeScript y Vite. Los datos viven en Supabase (PostgreSQL). Los permisos y el stock se resuelven en la base: el navegador no guarda datos.

---

## Qué hace

| Pantalla | Para qué sirve | Quién la ve |
|---|---|---|
| Inicio | Cifras de la planta, avisos (stock bajo el mínimo, lotes sin certificado) y lotes en proceso | Todos (el operario ve solo los lotes en proceso) |
| Lotes | Registrar camiones, avanzar etapas, rótulo de identificación | Todos |
| Materiales | Stock por bodega y conteos físicos | Todos (crear materiales: administración) |
| Movimientos | Kardex con entradas, salidas, traslados, producción, correcciones y anulaciones | Todos |
| Empresas | Generadoras de residuo y clientes, con los kilos de cada una | Administración |
| Certificados | Emisión y PDF de valorización | Administración |
| Reportes | Inventario, movimientos, lotes y certificados en Excel | Administración |
| Configuración | Usuarios, roles y desactivar cuentas | Administración |

**Errores de registro.** Nada se borra: en la base, los movimientos solo se pueden agregar. Para un error se registra un asiento de contrapartida, como en un ERP:

- **Corregir:** ajusta la cantidad.
- **Anular:** deshace el registro completo.

Ambos piden un motivo. El operario solo puede ajustar sus propios registros del mismo día; lo demás se lo pide a administración. Un lote que ya tiene certificado no se puede tocar.

**Cuentas.** Cada persona entra con su correo y contraseña. En un equipo compartido se cierra sesión al terminar; el navegador no guarda sesiones de otras cuentas.

---

## Estructura

```
greenspot/
├── src/
│   ├── main.tsx              Arranque de React
│   ├── App.tsx               Armazón: cabecera, menú lateral, panel y diálogos
│   ├── estilo.css            Todos los estilos
│   ├── pantallas/            Una pantalla por archivo (Inicio, Lotes, Materiales, …, Ingreso)
│   ├── componentes/
│   │   ├── Comunes.tsx       Piezas reutilizables: título, pestañas, etapa, tabla de lotes
│   │   ├── Paneles.tsx       Panel lateral de detalle y diálogo de anular/corregir
│   │   ├── Flujos.tsx        Asistentes paso a paso: camión, salida, traslado, conteo, certificado
│   │   ├── Formularios.tsx   Nueva empresa y nuevo material
│   ├── logica/
│   │   ├── contexto.ts       Estado compartido de la app (datos cargados, panel, diálogo)
│   │   ├── formato.ts        Números, kilos, fechas y RUT
│   │   ├── reglas.ts         Reglas del negocio: etapas, stock, anular/corregir, topes
│   │   ├── certificadoPdf.ts PDF del certificado
│   │   └── excel.ts          Lectura y exportación Excel (`read-excel-file` / `write-excel-file`)
│   └── datos/
│       ├── supabase.ts       Conexión
│       ├── api.ts            Todas las lecturas y escrituras a la base
│       ├── sesion.tsx        Inicio de sesión y roles
│       └── tipos.ts          Tipos de las tablas
├── supabase/                 Scripts de la base, en el orden en que se aplican
│   ├── 001_esquema.sql
│   ├── 002_datos_ejemplo.sql
│   ├── 003_usuarios_y_permisos.sql
│   ├── 004_reglas_en_la_base.sql   Reglas de lotes, movimientos y certificados en la base
│   ├── auditoria-2026-11-17/005_propuesta_cierre_operario.sql  Controles de operario, capacidad y certificados
│   ├── 007_indices.sql             Índices para las consultas frecuentes
│   ├── 008_contactos_solo_admin.sql Contactos de empresas solo para administración
│   ├── 009_quitar_qr.sql           Quita el campo QR y valida certificate_code
│   └── 010_ajustes_auditoria.sql   LCI nullable, anulación de certificados, merma de lote y lock de capacidad
├── pruebas/
│   ├── recorrido.cjs / ajustes.cjs Pruebas E2E sin escritura (`npm run pruebas`)
│   ├── evidencias/                 Registros brutos de pruebas, auditoría npm, concurrencia y carga 10k
│   └── integral/                   Batería integral de 126 pruebas (`npm run pruebas:integral`)
└── .env.example              Plantilla de configuración
```

---

## Puesta en marcha

1. Instala Node 20 o más nuevo y luego las dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Supabase › Project Settings › API).
3. Levanta la app en `http://localhost:5173`:
   ```bash
   npm run dev
   ```
4. Para la versión de producción, que queda en `dist/`:
   ```bash
   npm run build
   ```

### Base de datos (proyecto en Supabase)

Instancia activa desplegada y verificada: proyecto **greenspot** (`zhztdovskiwagarqbdzs`, región `us-east-2`, PostgreSQL 17), con claves configuradas localmente en `.env.local` (fuera de Git).

En Supabase › SQL Editor, ejecuta los scripts de `supabase/` en este orden estricto:
1. `001_esquema.sql` y `002_datos_ejemplo.sql`
2. `003_usuarios_y_permisos.sql` *(ejecutar por separado antes de `004`/`005` para confirmar el valor `'count_adjustment_in'` del enum `movement_type_enum`)*
3. `004_reglas_en_la_base.sql`
4. `auditoria-2026-11-17/005_propuesta_cierre_operario.sql`
5. `007_indices.sql`
6. `008_contactos_solo_admin.sql`
7. `009_quitar_qr.sql` *(en una base que ya tenía `001`–`008`, basta ejecutar `009_quitar_qr.sql` para eliminar `qr_verification_code` y actualizar `check_certificate_datos()`)*
8. `010_ajustes_auditoria.sql` *(permite `NULL` en agua/petróleo no estimados, agrega `status` y `anular_certificado()`, descuenta merma del lote y agrega bloqueo pesimista por bodega)*
9. `auditoria-2026-11-17/006_propuesta_saldo_inicial.sql` *(regulariza en el kardex mediante `SALDO-INI-*` los saldos iniciales cargados por `002`)*

El `002` carga 4 bodegas, 5 empresas, 11 materiales, 4 lotes, 4 movimientos y 2 certificados de ejemplo. Los códigos de bodega (`BOD-PM-ACOPIO`, `BOD-PM-PLANTA`, `BOD-PM-PELLET`, `BOD-DAL-CHILOE`) los usa la app, así que si no cargas el `002`, crea bodegas con esos mismos códigos.

### Usuarios

- La **primera** cuenta que se crea entra automáticamente como **administración** activa.
- Toda cuenta posterior creada en Supabase › Authentication › Add user entra como **operario inactivo** (`is_active = false`, control `GS-SEC-013` del script `005`) hasta que administración la active y ajuste su rol desde *Configuración* en la app.
- Desactiva el registro público en Supabase › Authentication › Sign In / Providers › «Allow new users to sign up».

---

## Pruebas

- **Batería integral sin credenciales externas (`126` pruebas):**
  ```bash
  npm run pruebas:integral
  ```
  Ejecuta las 4 suites de `pruebas/integral/` (`node --test` + `esbuild` + Edge/Chromium CDP sobre servidor local simulado) cubriendo lógica de negocio, planillas Excel, certificados PDF sin QR, API `@supabase/supabase-js`, validación SQL estática (`001`–`010`) y 25 flujos E2E en navegador real (`126/126` aprobadas).
- **Recorridos sin escritura contra `npm run dev` (`95` checks):**
  1. Agrega una cuenta de operario de prueba en `.env.local` (`GREENSPOT_CORREO` y `GREENSPOT_CLAVE`).
  2. Con `npm run dev` abierto, ejecuta:
     ```bash
     npm run pruebas
     ```
     *(En Windows define `$env:CHROMIUM = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'`).*
- **Validación en vivo contra Supabase (`11/11` aprobadas):** sobre `zhztdovskiwagarqbdzs` y `npm run dev` se validaron registro cerrado, RLS/CLS (`pin_hash` y `empresas()`), emisión real de certificado sin QR (`CERT-REP-2026-0095`), anulación atómica y exclusión de `[ANULADO]` en *Empresas*, dejando luego la base limpia en su estado inicial (ver `pruebas/README.md`).

Las capturas automáticas quedan en `pruebas/capturas/`, las de EV3 en `pruebas/capturas-pantalla/` y los registros brutos de auditoría/pruebas en `pruebas/evidencias/`.
