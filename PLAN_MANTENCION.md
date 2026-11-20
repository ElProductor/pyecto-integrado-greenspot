# Plan de Mantención — Sistema Web Greenspot SpA

Este plan establece las actividades, responsabilidades, frecuencias y protocolos de respuesta para asegurar la continuidad operativa, integridad de datos y evolución del **Sistema web de inventario, trazabilidad de lotes y certificación Ley REP** de **Greenspot SpA** (Planta Puerto Montt, red Resiter) tras su puesta en marcha.

---

## 1. Alcance y Arquitectura Cubierta

El plan cubre todos los componentes técnicos y operativos de la plataforma:
* **Capa de presentación (Frontend):** Aplicación SPA desarrollada en TypeScript, React, HTML y CSS, compilada mediante Vite y desplegada en Cloudflare Pages.
* **Capa de datos y lógica crítica (Backend-as-a-Service):** Base de datos PostgreSQL en Supabase (tablas, *triggers* de balance de masa y políticas de seguridad por rol RLS), autenticación mediante Supabase Auth y almacenamiento privado en Supabase Storage.
* **Aseguramiento de calidad (QA):** Suite de pruebas automatizadas de extremo a extremo ejecutada con Node.js / Chromium (`npm run pruebas`).

---

## 2. Tipos de Mantención

| Tipo de Mantención | Objetivo | Aplicaciones concretas en Greenspot |
| :--- | :--- | :--- |
| **Correctiva** | Diagnosticar y resolver defectos reportados durante la operación diaria. | • Corregir un movimiento o producción que no actualice el saldo en kardex.<br>• Resolver fallas en la emisión o descarga de certificados PDF o planillas Excel.<br>• Ajustar validaciones de formularios o filtros de cierre mensual. |
| **Preventiva** | Reducir la probabilidad de fallas, pérdida de datos o degradación del servicio. | • Respaldos periódicos de la base de datos PostgreSQL y pruebas de restauración.<br>• Auditoría de vulnerabilidades (`npm audit`) y actualización controlada de dependencias.<br>• Monitoreo de cuota de almacenamiento y conexiones en Supabase y Cloudflare Pages. |
| **Adaptativa** | Adecuar el sistema ante cambios normativos, corporativos o de infraestructura externa. | • Actualizaciones en los requisitos de reporte de la **Ley N° 20.920 (Ley REP)** o formatos exigidos por **Resiter**.<br>• Cambios de versiones en APIs de Supabase, navegadores móviles o políticas de seguridad. |
| **Evolutiva** | Incorporar nuevas funcionalidades solicitadas por la administración de planta. | • Alertas visuales de ocupación de bodegas al superar el `90 %` de capacidad en **Inicio**.<br>• Nuevos reportes consolidados por empresa generadora o material.<br>• Mejoras en la gestión de cuentas y perfiles operativos desde la app. |

---

## 3. Calendario de Actividades y Responsables

| Actividad | Tipo | Frecuencia | Responsable | Herramienta / Comando |
| :--- | :--- | :--- | :--- | :--- |
| **Respaldo completo de base de datos** (esquema, triggers, RLS y registros) | Preventiva | Semanal | Equipo de desarrollo / Soporte TI | `supabase db dump` / `pg_dump` |
| **Prueba de restauración de respaldo** en entorno aislado | Preventiva | Mensual | Equipo de desarrollo | Proyecto Supabase de pruebas |
| **Ejecución de pruebas automáticas** de regresión | Preventiva / Correctiva | Antes de cada despliegue o *merge* a `main` | Equipo de desarrollo | `npm run pruebas` |
| **Revisión de uso de cuota** (base de datos, ancho de banda y Storage) | Preventiva | Mensual | Administración de planta | Panel de Supabase y Cloudflare |
| **Auditoría de cuentas y roles activos** (baja de personal desvinculado) | Preventiva / Seguridad | Mensual | Administración de planta | Pantalla *Configuración* en la app |
| **Revisión de vulnerabilidades** en paquetes y librerías | Preventiva | Mensual | Equipo de desarrollo | `npm audit` |
| **Actualización de dependencias menores** y parches de seguridad | Preventiva | Trimestral | Equipo de desarrollo | `npm update` + `npm run build` |
| **Revisión de formatos regulatorios** (Ley REP y consolidados Resiter) | Adaptativa | Semestral o ante cambio legal | Administración + Desarrollo | Certificados PDF y Reportes `.xlsx` |

---

## 4. Procedimiento ante Fallas e Incidentes

### 4.1 Flujo de atención
1. **Detección y reporte:** El usuario en planta registra una captura de pantalla del error, el código de lote o movimiento involucrado y la hora exacta del incidente.
2. **Clasificación y registro:** El responsable técnico documenta el caso en **GitHub Issues** asignando nivel de prioridad según el impacto operacional.
3. **Diferenciación de causa:**
   * *Error de digitación operacional:* Si el problema corresponde a un peso o lote mal ingresado, la administración de planta lo resuelve directamente en la aplicación mediante las funciones de **Corregir peso** o **Anular lote/movimiento**, conservando la trazabilidad en el kardex sin intervención de código.
   * *Falla de software o base de datos:* Se reproduce el fallo en entorno local y se desarrolla la solución en una rama independiente (ej. `fix/nombre-incidente`).
4. **Validación previa al despliegue:** Se ejecuta la compilación (`npm run build`) y la batería de pruebas automáticas (`npm run pruebas`) para verificar que no existan regresiones.
5. **Publicación y cierre:** Se integra el cambio mediante *Pull Request* hacia `main`, se verifica el despliegue automático en producción y se notifica al usuario que reportó el incidente.

### 4.2 Niveles de Servicio (SLA) según Prioridad

| Prioridad | Criterio de Impacto | Tiempo de Primera Respuesta | Tiempo Objetivo de Solución |
| :--- | :--- | :--- | :--- |
| **Alta (Crítica)** | Detiene la operación de planta (no permite registrar camiones, ingresar producción ni iniciar sesión). | Máximo **4 horas hábiles** | **1 día hábil** |
| **Media** | Desviación en cálculos, reportes Excel o emisión de certificados PDF, pero la planta puede seguir operando. | **1 día hábil** | **5 días hábiles** |
| **Baja** | Mejoras visuales, textos, etiquetas o ajustes menores que no afectan los datos ni el flujo diario. | **5 días hábiles** | Próxima actualización programada |

---

## 5. Plan de Continuidad Operativa y Resguardo

* **Custodia del código fuente y documentación:** El repositorio completo permanece alojado en GitHub (`ElProductor/pyecto-integrado-greenspot`) junto con su `README.md` de instalación, estructura de scripts SQL numerados (`supabase/`) y evidencias de pruebas, permitiendo que cualquier equipo técnico futuro pueda darle continuidad.
* **Gestión segura de credenciales:** Las llaves de acceso administrativo a Supabase, Cloudflare y variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) son resguardadas por la administración de Greenspot fuera del control de versiones.
* **Escalabilidad de infraestructura:** Si el volumen histórico de lotes, movimientos o documentos adjuntos supera los umbrales del plan gratuito de Supabase, se evaluará el escalamiento al plan comercial correspondiente o la migración de la instancia PostgreSQL a infraestructura dedicada manteniendo el mismo esquema SQL.
* **Contingencia ante corte de conectividad en planta:** En caso de interrupción temporal de internet en Puerto Montt, el registro en romana se respalda en planilla de contingencia horaria y se regulariza en el sistema una vez restablecida la conexión, manteniendo el orden cronológico de los lotes.
