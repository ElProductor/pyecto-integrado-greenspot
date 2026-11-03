# Greenspot - Sistema de Gestión de Inventario, Trazabilidad & Ley REP

Plataforma integral de gestión de inventario, economía circular y trazabilidad para **Greenspot SpA** (empresa chilena líder en la valorización y reciclaje de plásticos industriales y pasivos acuícolas de la Patagonia, asociada a la red Resiter).

Desarrollada con **React + TypeScript + Tailwind CSS** y backend en la nube con **Supabase (PostgreSQL, Triggers de Stock y DB Storage)**.

---

## 🌊 Contexto y Operaciones de Greenspot

Greenspot recupera y transforma residuos plásticos complejos generados principalmente en el sur de Chile (acuicultura, salmonicultura, mitilicultura y pesca):
- **Polímeros Gestionados**:
  - **HDPE** (Polietileno de Alta Densidad): Boyas y flotadores marinos de centros de cultivo, tuberías y pasillos flotantes de 400mm.
  - **EPS** (Poliestireno Expandido / Plumavit): Cajas térmicas de cosecha de salmón (densificado en planta Dalcahue).
  - **PP** (Polipropileno): Cabos de fondeo, redes y maxisacos de transporte de insumos.
  - **LDPE / PET / Otros**: Descontaminación y valorización.
- **Transformación**:
  - Recepción con báscula y evaluación de incrustaciones marinas.
  - Molienda y lavado a escamas (*flakes*).
  - Extrusión y peletizado de alta pureza (filtrado a malla 80).
  - Fabricación de eco-productos (composteras 120L, ecomadera para postes de viñas, mobiliario urbano).
  - Emisión de Certificados Oficiales de Disposición Final y Ley REP (Ley N° 20.920).

---

## 🚀 Características Principales

1. **Dashboard de Triple Impacto & Métricas**:
   - Total de toneladas de plástico valorizadas.
   - Huella de carbono evitada ($t\text{ CO}_2\text{eq}$ ahorrado).
   - Ahorro de agua ($m^3$) y barriles de petróleo fósil no consumidos.
   - Distribución de stock por tipo de polímero (HDPE, EPS, PP).
   - Alertas inmediatas de stock bajo el mínimo crítico.
   - Flujo visual de la cadena circular Greenspot.

2. **Catálogo & Gestión de Inventario**:
   - Vista en Tarjetas con fotos o Tabla detallada.
   - Parámetros técnicos: Tipo de polímero, categoría (Materia Prima, En Proceso, Pellets, Eco-Productos), densidad, MFI (Índice de fluidez), color, factor de CO2, costos y precios en USD.
   - Barra de nivel de stock con alerta visual (Verde / Amarillo Crítico).
   - Subida de fotografías de materiales directamente a **Supabase Storage** (`greenspot-media`).

3. **Lotes & Trazabilidad de Origen Marino (Batches)**:
   - Identificación de origen acuícola (ej: *Centro Fiordo Comau, Archipiélago de Chiloé*).
   - Generador asociado (AquaChile, Cermaq, Salmones Camanchaca, etc.).
   - Registro de peso en báscula, porcentaje de merma/impurezas y avance de etapas (*Recepcionado -> Lavado -> Molido -> Peletizado -> Despachado*).
   - **Generador de Etiquetas QR** por lote para imprimir y rotular maxisacos o tolvas.
   - Subida de boletas de pesaje a **Supabase Storage** (`greenspot-docs`).

4. **Kardex de Movimientos de Inventario**:
   - Entradas de residuos, consumo en planta (molienda/extrusión), salidas de pellet, traslados entre bodegas y ajustes de merma.
   - **Cálculo automático de existencias**: cada movimiento actualiza el stock general y por bodega en tiempo real.
   - Exportación de Kardex histórico a archivo **CSV**.

5. **Bodegas & Patios de Acopio**:
   - Planta Puerto Montt (Patio Acopio Trapén, Nave Extrusión, Bodega de Silos de Pellets).
   - Planta Dalcahue (Centro de Acopio y Termocompactación de Plumavit en Chiloé).
   - Control de capacidad máxima en toneladas y porcentaje de ocupación.

6. **Empresas Asociadas (Generadores & Clientes)**:
   - Registro con RUT chileno, rubro industrial, ciudad y datos de contacto.
   - Distinción entre Generadores Ley REP y Compradores de Pellets/Eco-productos.

7. **Certificados Oficiales Ley REP (Triple Impacto)**:
   - Generación de certificados de disposición final acreditados.
   - **Descarga instantánea en PDF de alta calidad** con diseño oficial Greenspot, código QR de validación criptográfica, firma autorizada y desglose de impacto ambiental.

8. **Integración con Supabase & DB Storage**:
   - Arquitectura híbrida: Conexión nativa a Supabase con fallback inteligente a datos locales para pruebas inmediatas.
   - Panel de control de Supabase integrado en la app: configuración de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, botón de prueba de conexión en vivo y explorador de Storage.
   - Scripts DDL listos en `/supabase/schema.sql` y datos iniciales en `/supabase/seed.sql`.

---

## 🛠️ Estructura del Proyecto

```text
vibrant-oppenheimer/
├── index.html                      # Punto de entrada HTML con tipografía Plus Jakarta Sans
├── package.json                    # Dependencias: React, Supabase, Tailwind, jsPDF, QRCode
├── vite.config.ts                  # Configuración de empaquetado Vite
├── tailwind.config.js              # Paleta de colores Greenspot Patagonia
├── .env.example                    # Plantilla de variables de entorno
├── supabase/
│   ├── schema.sql                  # DDL PostgreSQL: tablas, enums, triggers RLS y storage
│   └── seed.sql                    # Datos semilla operativos reales de Los Lagos
└── src/
    ├── types/index.ts              # Modelos de datos TypeScript
    ├── lib/
    │   ├── supabase.ts             # Cliente Supabase y verificador de conexión
    │   └── storage.ts              # Subida y gestión en Supabase Storage
    ├── services/
    │   └── api.ts                  # Repositorio unificado de datos (Supabase + Local Fallback)
    ├── data/
    │   └── mockData.ts             # Datos iniciales auténticos de operaciones Greenspot
    ├── utils/
    │   └── pdfGenerator.ts         # Generador de certificados PDF oficiales con QR
    ├── components/
    │   ├── Navbar.tsx              # Barra superior con estado de Supabase y alertas
    │   └── Sidebar.tsx             # Menú lateral con badges de impacto
    ├── views/
    │   ├── DashboardView.tsx       # Panel de control, KPIs de CO2 y cadena de valor
    │   ├── InventoryView.tsx       # Catálogo de materiales, polímeros y stock
    │   ├── BatchesView.tsx         # Gestión de lotes, trazabilidad marina y QR
    │   ├── MovementsView.tsx       # Kardex con exportación CSV y filtro por tipo
    │   ├── WarehousesView.tsx      # Bodegas Puerto Montt y Dalcahue
    │   ├── StakeholdersView.tsx    # Clientes salmoneros y compradores
    │   ├── CertificatesView.tsx    # Certificados Ley REP con PDF interactivo
    │   └── SupabaseSettingsView.tsx# Configuración en vivo de base de datos y Storage
    ├── App.tsx                     # Orquestador principal y modales globales
    ├── main.tsx                    # Bootstrap de React
    └── index.css                   # Estilos Tailwind y personalizaciones
```

---

## 💻 Puesta en Marcha Local

### 1. Iniciar la aplicación en modo desarrollo:

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`. 

> **Nota:** La aplicación cuenta con modo demo local preconfigurado, por lo que funcionará de inmediato con todos los datos y funciones activas sin necesidad de configurar Supabase primero.

---

## 🗄️ Conectar tu Proyecto Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve al **SQL Editor** de tu proyecto Supabase y copia el contenido del archivo [`supabase/schema.sql`](file:///c:/Users/juanp/Documents/antigravity/vibrant-oppenheimer/supabase/schema.sql), luego presiona **Run**.
3. (Opcional) Ejecuta también [`supabase/seed.sql`](file:///c:/Users/juanp/Documents/antigravity/vibrant-oppenheimer/supabase/seed.sql) para poblar con datos operativos.
4. En Supabase ve a **Project Settings -> API** y copia:
   - `Project URL`
   - `Project API keys -> anon / public`
5. Abre la aplicación, dirígete a la pestaña **Supabase DB & Storage**, ingresa tu URL y Anon Key, y haz clic en **Guardar Credenciales** o edita el archivo `.env`.
6. ¡Listo! La aplicación sincronizará automáticamente datos y almacenará fotos y tickets en Supabase Storage.
