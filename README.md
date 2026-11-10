# Greenspot · Inventario y trazabilidad

Aplicación web para la planta de **Greenspot SpA** en Dalcahue, que recicla y valoriza plásticos de la acuicultura del sur de Chile: boyas y tuberías de HDPE, cajas de EPS, cabos y redes de PP.

Registra lo que entra en camión, sigue cada lote por sus etapas de proceso (patio, lavado, molienda, pellet y despacho), controla el stock por bodega y emite los certificados de valorización para la **Ley REP (N° 20.920)**.

Está hecha con React, TypeScript y Vite. Los datos viven en Supabase (PostgreSQL). Los permisos y el stock se resuelven en la base: el navegador no guarda datos.

---

## Qué hace

| Pantalla | Para qué sirve | Quién la ve |
|---|---|---|
| Inicio | Cifras de la planta, avisos (stock bajo el mínimo, lotes sin certificado) y lotes en proceso | Todos (el operario ve solo los lotes en proceso) |
| Lotes | Registrar camiones, avanzar etapas, rótulo con QR | Todos |
| Materiales | Stock por bodega y conteos físicos | Todos (crear materiales: administración) |
| Movimientos | Kardex con entradas, salidas, traslados, producción, correcciones y anulaciones | Todos |
| Empresas | Generadoras de residuo y clientes, con los kilos de cada una | Administración |
| Certificados | Emisión y PDF con QR de verificación | Administración |
| Reportes | Inventario, movimientos, lotes y certificados en Excel | Administración |
| Configuración | Usuarios, roles, desactivar cuentas y reiniciar PIN | Administración |

**Errores de registro.** Nada se borra: en la base, los movimientos solo se pueden agregar. Para un error se registra un asiento de contrapartida, como en un ERP:

- **Corregir:** ajusta la cantidad.
- **Anular:** deshace el registro completo.

Ambos piden un motivo. El operario solo puede ajustar sus propios registros del mismo día; lo demás se lo pide a administración. Un lote que ya tiene certificado no se puede tocar.

**Cuentas y PIN.** Cada persona entra la primera vez con su correo y contraseña. Después puede volver a su cuenta en el mismo equipo con un PIN de 4 números, desde «Cambiar de usuario».

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
│   │   └── Cuenta.tsx        Cambiar de usuario y crear PIN
│   ├── logica/
│   │   ├── contexto.ts       Estado compartido de la app (datos cargados, panel, diálogo)
│   │   ├── formato.ts        Números, kilos, fechas y RUT
│   │   ├── reglas.ts         Reglas del negocio: etapas, stock, anular/corregir, topes
│   │   └── certificadoPdf.ts PDF del certificado
│   └── datos/
│       ├── supabase.ts       Conexión
│       ├── api.ts            Todas las lecturas y escrituras a la base
│       ├── sesion.tsx        Inicio de sesión, roles y cambio rápido con PIN
│       └── tipos.ts          Tipos de las tablas
├── supabase/                 Scripts de la base, en el orden en que se aplican
│   ├── 001_esquema.sql
│   ├── 002_datos_ejemplo.sql
│   └── 003_usuarios_y_permisos.sql
├── pruebas/                  Pruebas de punta a punta (no escriben en la base)
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

### Base de datos (proyecto nuevo)

En Supabase › SQL Editor, ejecuta los tres scripts de `supabase/` en orden: 001, 002 y 003.

El 002 carga bodegas, materiales y empresas de ejemplo. Los códigos de bodega (`BOD-PM-ACOPIO`, `BOD-PM-PLANTA`, …) los usa la app, así que si no cargas el 002, crea bodegas con esos mismos códigos.

### Usuarios

- La primera cuenta que se crea queda como **administración**. Las siguientes entran como **operario**.
- Las cuentas se crean en Supabase › Authentication › Add user. El rol se cambia desde *Configuración* en la app.
- Desactiva el registro público en Supabase › Authentication › Sign In / Providers › «Allow new users to sign up».

---

## Pruebas

Recorren la app en un Chromium sin ventana, como administración y como operario. Bloquean cualquier escritura a la base, así que se pueden correr contra los datos reales.

1. Agrega una cuenta de operario de prueba en `.env.local` (`GREENSPOT_CORREO` y `GREENSPOT_CLAVE`).
2. Con `npm run dev` abierto, ejecuta:
   ```bash
   npm run pruebas
   ```

Las capturas quedan en `pruebas/capturas/`, que no se sube al repositorio. Si Chromium no está en `/usr/bin/chromium`, indica su ruta en la variable `CHROMIUM`.
