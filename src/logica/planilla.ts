import * as XLSX from 'xlsx';
import { apiService } from '../datos/api';
import type { MaterialProduct, Stakeholder, Batch, CategoryType, PolymerType, StakeholderType } from '../datos/tipos';
import type { Datos } from './contexto';
import { bodegas, TOPE_CAMION } from './reglas';
import { RUT_OK } from './formato';

/* ---------- carga desde Excel: solo altas nuevas ----------
   Se sube la misma planilla que se descarga. Las filas que ya existen se ignoran (no se modifica ni borra nada);
   el stock nunca se carga desde Excel: solo cambia con movimientos del kardex. */

export const NOMBRE_CAT: Record<CategoryType, string> = { raw_material: 'Materia prima', in_process: 'En proceso', pellet: 'Pellet', finished_product: 'Producto terminado', supplies: 'Insumos' };
export const NOMBRE_TIPO_EMP: Record<StakeholderType, string> = { generator_supplier: 'Generadora', buyer_customer: 'Cliente', both: 'Ambas' };
const POLIMEROS: PolymerType[] = ['HDPE', 'LDPE', 'PP', 'EPS', 'PET', 'OTHER'];

type Fila = Record<string, unknown>;
const txt = (v: unknown) => (v == null ? '' : String(v)).trim();
const clave = (v: unknown) => txt(v).toLowerCase();
const rutLimpio = (v: unknown) => txt(v).replace(/\./g, '').toUpperCase();
const buscar = <T extends string>(mapa: Record<T, string>, v: unknown) => (Object.keys(mapa) as T[]).find(k => clave(mapa[k]) === clave(v) || k === txt(v));

export type NuevoMaterial = Omit<MaterialProduct, 'id' | 'created_at' | 'updated_at'>;
export type NuevaEmpresa = Omit<Stakeholder, 'id' | 'created_at'>;
export interface NuevoLote { material: string; empresa: string; kilos: number; fecha: string; origen: string; notas: string }
export interface Carga { materiales: NuevoMaterial[]; empresas: NuevaEmpresa[]; lotes: NuevoLote[]; ignoradas: number; errores: string[] }

// Fecha de la columna «Ingreso»: celda de fecha de Excel o texto dd-mm-aaaa; vacía = ahora.
function leerFecha(v: unknown): string | null {
  if (v instanceof Date) return isNaN(+v) ? null : v.toISOString();
  const t = txt(v); if (!t) return new Date().toISOString();
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], 12);
  return d.getDate() === +m[1] && d <= new Date() ? d.toISOString() : null;
}

export function leerPlanilla(libro: XLSX.WorkBook, D: Datos): Carga {
  const c: Carga = { materiales: [], empresas: [], lotes: [], ignoradas: 0, errores: [] };
  const hoja = (n: string): Fila[] => (libro.Sheets[n] ? XLSX.utils.sheet_to_json<Fila>(libro.Sheets[n], { defval: '' }) : []);
  const err = (h: string, i: number, t: string) => c.errores.push(`${h}, fila ${i + 2}: ${t}`); // +2: encabezado y base 1

  hoja('Inventario').forEach((f, i) => {
    const cod = txt(f['Código']); if (!cod && !txt(f.Material)) return;
    if (D.mat.some(m => clave(m.code) === clave(cod)) || c.materiales.some(m => clave(m.code) === clave(cod))) { c.ignoradas++; return; }
    const tipo = txt(f.Tipo).toUpperCase() === 'OTRO' ? 'OTHER' : (txt(f.Tipo).toUpperCase() as PolymerType);
    const cat = txt(f['Categoría']) ? buscar(NOMBRE_CAT, f['Categoría']) : 'raw_material';
    const uni = ({ kg: 'kg', kilos: 'kg', units: 'units', u: 'units', unidades: 'units' } as const)[clave(f.Unidad || 'kg') as 'kg'];
    const min = txt(f['Mínimo']) === '' ? 0 : Number(f['Mínimo']);
    if (!cod || !txt(f.Material)) return err('Inventario', i, 'falta el código o el nombre del material.');
    if (!POLIMEROS.includes(tipo)) return err('Inventario', i, `tipo «${txt(f.Tipo)}» no válido (HDPE, LDPE, PP, EPS, PET u Otro).`);
    if (!cat) return err('Inventario', i, `categoría «${txt(f['Categoría'])}» no válida.`);
    if (!uni) return err('Inventario', i, 'la unidad debe ser kg o unidades.');
    if (!(min >= 0)) return err('Inventario', i, 'el mínimo debe ser un número.');
    c.materiales.push({ code: cod, name: txt(f.Material), description: '', polymer_type: tipo, category: cat, unit: uni, color: '', minimum_stock: min, current_stock: 0, unit_cost_usd: 0, unit_price_usd: 0, co2_factor_kg: 1.5, is_active: true });
  });

  hoja('Empresas').forEach((f, i) => {
    const rut = txt(f.RUT); if (!rut && !txt(f.Nombre)) return;
    if (D.emp.some(e => rutLimpio(e.tax_id) === rutLimpio(rut)) || c.empresas.some(e => rutLimpio(e.tax_id) === rutLimpio(rut))) { c.ignoradas++; return; }
    const tipo = txt(f.Tipo) ? buscar(NOMBRE_TIPO_EMP, f.Tipo) : 'generator_supplier';
    if (!txt(f.Nombre)) return err('Empresas', i, 'falta el nombre.');
    if (!RUT_OK.test(rut)) return err('Empresas', i, `RUT «${rut}» no válido (formato 76.123.456-7).`);
    if (!tipo) return err('Empresas', i, 'el tipo debe ser Generadora, Cliente o Ambas.');
    if (txt(f.Correo) && !/^\S+@\S+\.\S+$/.test(txt(f.Correo))) return err('Empresas', i, 'correo no válido.');
    c.empresas.push({ name: txt(f.Nombre), tax_id: rut, type: tipo, city: txt(f.Ciudad), contact_email: txt(f.Correo), contact_phone: txt(f['Teléfono']), address: '', industry_sector: '' });
  });

  // Recepciones: fila con «Lote» vacío = camión nuevo. Material y empresa por nombre (pueden venir en este mismo archivo).
  const mats = [...D.mat, ...c.materiales], emps = [...D.emp, ...c.empresas];
  hoja('Lotes').forEach((f, i) => {
    const lote = txt(f.Lote);
    if (lote) { if (D.lotes.some(l => clave(l.batch_number) === clave(lote))) c.ignoradas++; else err('Lotes', i, `el lote ${lote} no existe; para un ingreso nuevo deja «Lote» vacío y la app le pone número.`); return; }
    if (!txt(f.Material) && !txt(f['Kilos ingreso'])) return;
    const m = mats.find(x => clave(x.name) === clave(f.Material) || clave(x.code) === clave(f.Material));
    const e = emps.find(x => clave(x.name) === clave(f.Empresa));
    const kg = Number(f['Kilos ingreso']), fecha = leerFecha(f.Ingreso);
    if (!m) return err('Lotes', i, `material «${txt(f.Material)}» no existe.`);
    if (m.unit !== 'kg' || m.category !== 'raw_material') return err('Lotes', i, `«${m.name}» no es materia prima en kilos.`);
    if (!e) return err('Lotes', i, `empresa «${txt(f.Empresa)}» no existe.`);
    if (e.type === 'buyer_customer') return err('Lotes', i, `«${e.name}» está registrada solo como cliente.`);
    if (!(kg > 0 && kg <= TOPE_CAMION)) return err('Lotes', i, `kilos deben estar entre 1 y ${TOPE_CAMION.toLocaleString('es-CL')}.`);
    if (!fecha) return err('Lotes', i, 'fecha de ingreso no válida (dd-mm-aaaa, no futura).');
    c.lotes.push({ material: m.code, empresa: rutLimpio(e.tax_id), kilos: kg, fecha, origen: txt(f.Origen), notas: 'Cargado desde Excel' });
  });
  return c;
}

/** Guarda en orden (empresas y materiales antes que los lotes que los usan). Devuelve cuántos alcanzó a guardar. */
export async function guardarCarga(c: Carga, D: Datos, usuario: string, uid: string): Promise<number> {
  let n = 0;
  const emps = [...D.emp], mats = [...D.mat];
  for (const e of c.empresas) { emps.push(await apiService.createStakeholder(e)); n++; }
  for (const m of c.materiales) { mats.push(await apiService.createMaterial(m, usuario)); n++; }
  const anio = new Date().getFullYear(), acopio = D.bod.find(b => b.code === 'BOD-PM-ACOPIO') || bodegas(D)[0];
  let sig = Math.max(0, ...D.lotes.map(l => +(l.batch_number.match(new RegExp(`^LOTE-${anio}-(\\d+)$`))?.[1] || 0)));
  for (const l of c.lotes) {
    const m = mats.find(x => x.code === l.material)!, e = emps.find(x => rutLimpio(x.tax_id) === l.empresa)!;
    await apiService.createBatch({
      batch_number: `LOTE-${anio}-${String(++sig).padStart(4, '0')}`, material_id: m.id, supplier_id: e.id, warehouse_id: acopio.id,
      initial_weight_kg: l.kilos, current_weight_kg: l.kilos, impurity_percentage: 0, reception_date: l.fecha, status: 'received',
      marine_origin_zone: l.origen || undefined, notes: l.notas,
    } as Partial<Batch>, usuario, uid);
    n++;
  }
  return n;
}
