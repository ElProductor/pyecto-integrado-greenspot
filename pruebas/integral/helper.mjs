import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(__dirname, '..', '..');

const CANDIDATES = [
  path.join(REPO, 'node_modules'),
  process.env.GREENSPOT_NODE_MODULES,
].filter(Boolean);
export const NM = CANDIDATES.find(d => fs.existsSync(path.join(d, 'esbuild')));
if (!NM) throw new Error('No se encontró node_modules con esbuild; ejecuta `npm install` o define GREENSPOT_NODE_MODULES.');

const requireHere = createRequire(import.meta.url);
export const esbuild = requireHere(path.join(NM, 'esbuild', 'lib', 'main.js'));
export const XLSX = requireHere(path.join(NM, 'xlsx'));

const TMP_ROOT = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP_ROOT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(TMP_ROOT, 'run-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

export function makeWorkDir(prefix = 'work-') {
  return fs.mkdtempSync(path.join(TMP, prefix));
}

const cache = new Map();
export function loadTs(relPath, extraDefine = {}) {
  const key = relPath + '|' + JSON.stringify(extraDefine);
  if (cache.has(key)) return cache.get(key);
  const outFile = path.join(TMP, relPath.replace(/[\\/]/g, '_') + '_' + cache.size + '.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(REPO, relPath)],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    nodePaths: [NM],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(extraDefine.VITE_SUPABASE_URL ?? 'https://test.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(extraDefine.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key'),
      'import.meta.env': JSON.stringify({
        VITE_SUPABASE_URL: extraDefine.VITE_SUPABASE_URL ?? 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: extraDefine.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key',
      }),
    },
    logLevel: 'silent',
  });
  const mod = requireHere(outFile);
  cache.set(key, mod);
  return mod;
}

export function buildBrowserBundle(mockBaseUrl) {
  const outDir = path.join(TMP, 'web_' + Date.now());
  fs.mkdirSync(outDir, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(REPO, 'src', 'main.tsx')],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    nodePaths: [NM],
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(mockBaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiJ9.mock'),
      'import.meta.env': JSON.stringify({
        VITE_SUPABASE_URL: mockBaseUrl,
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.mock',
      }),
    },
    loader: { '.css': 'css' },
    logLevel: 'silent',
  });
  fs.writeFileSync(
    path.join(outDir, 'index.html'),
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greenspot</title><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>',
    'utf8'
  );
  return outDir;
}

export function crearDatosBase(ahora = new Date()) {
  const hoyISO = ahora.toISOString();
  const ayerISO = new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString();
  const fechaCorta = hoyISO.slice(0, 10);

  const bod = [
    { id: 'w1', code: 'BOD-PM-ACOPIO', name: 'Patio Acopio', location: 'Puerto Montt', manager_name: 'Rodrigo', capacity_tons: 800, is_active: true },
    { id: 'w2', code: 'BOD-PM-PLANTA', name: 'Nave Extrusión', location: 'Puerto Montt', manager_name: 'Marcela', capacity_tons: 400, is_active: true },
    { id: 'w3', code: 'BOD-PM-PELLET', name: 'Silos Terminado', location: 'Puerto Montt', manager_name: 'Cristian', capacity_tons: 650, is_active: true },
    { id: 'w4', code: 'BOD-DAL-CHILOE', name: 'Planta Dalcahue', location: 'Chiloé', manager_name: 'Jorge', capacity_tons: 300, is_active: true },
  ];

  const emp = [
    { id: 'e1', name: 'AquaChile S.A.', type: 'generator_supplier', tax_id: '96.852.140-5', city: 'Puerto Montt', contact_email: 'sust@aquachile.com', contact_phone: '+56 65 243 0000', address: 'Cardonal S/N', industry_sector: 'salmoniculture' },
    { id: 'e2', name: 'Cermaq Chile', type: 'generator_supplier', tax_id: '77.240.190-8', city: 'Puerto Montt', contact_email: 'amb@cermaq.com', contact_phone: '+56 65 256 3100', address: 'Chinquihue Km 12', industry_sector: 'salmoniculture' },
    { id: 'e3', name: 'Ecomaderas del Sur SpA', type: 'buyer_customer', tax_id: '76.980.120-K', city: 'Osorno', contact_email: 'compras@ecomaderas.cl', contact_phone: '+56 9 8412 9901', address: 'Parque Industrial', industry_sector: 'manufacturing' },
    { id: 'e4', name: 'Plásticos Austral Ltda.', type: 'both', tax_id: '76.500.300-2', city: 'Puerto Varas', contact_email: 'contacto@austral.cl', contact_phone: '+56 9 1111 2222', address: 'Ruta 5', industry_sector: 'recycling' },
  ];

  const mat = [
    { id: 'm1', code: 'RAW-HDPE-BOY', name: 'Boyas HDPE', description: '', polymer_type: 'HDPE', category: 'raw_material', unit: 'kg', color: 'Azul', minimum_stock: 5000, current_stock: 60000, unit_cost_usd: 0.15, unit_price_usd: 0, co2_factor_kg: 1.85, is_active: true, mfi_melt_flow_index: null, density_g_cm3: 0.95 },
    { id: 'm2', code: 'RAW-EPS-BOX', name: 'Plumavit EPS', description: '', polymer_type: 'EPS', category: 'raw_material', unit: 'kg', color: 'Blanco', minimum_stock: 10000, current_stock: 4000, unit_cost_usd: 0.2, unit_price_usd: 0, co2_factor_kg: 2.1, is_active: true, mfi_melt_flow_index: null, density_g_cm3: 0.025 },
    { id: 'm3', code: 'PRC-HDPE-FLK', name: 'Escama HDPE', description: '', polymer_type: 'HDPE', category: 'in_process', unit: 'kg', color: 'Azul', minimum_stock: 2000, current_stock: 8000, unit_cost_usd: 0.45, unit_price_usd: 0.7, co2_factor_kg: 1.85, is_active: true, mfi_melt_flow_index: null, density_g_cm3: 0.952 },
    { id: 'm4', code: 'PEL-HDPE-INJ', name: 'Pellet HDPE Negro', description: '', polymer_type: 'HDPE', category: 'pellet', unit: 'kg', color: 'Negro', minimum_stock: 5000, current_stock: 25000, unit_cost_usd: 0.75, unit_price_usd: 1.35, co2_factor_kg: 1.85, is_active: true, mfi_melt_flow_index: 0.85, density_g_cm3: 0.954 },
    { id: 'm5', code: 'ECO-COMP-120', name: 'Compostera 120L', description: '', polymer_type: 'HDPE', category: 'finished_product', unit: 'units', color: 'Verde', minimum_stock: 50, current_stock: 140, unit_cost_usd: 22, unit_price_usd: 48, co2_factor_kg: 33.3, is_active: true, mfi_melt_flow_index: null, density_g_cm3: null },
  ];

  const stock = [
    { material_id: 'm1', warehouse_id: 'w1', quantity: 55000 },
    { material_id: 'm1', warehouse_id: 'w4', quantity: 5000 },
    { material_id: 'm2', warehouse_id: 'w1', quantity: 4000 },
    { material_id: 'm3', warehouse_id: 'w2', quantity: 8000 },
    { material_id: 'm4', warehouse_id: 'w3', quantity: 25000 },
    { material_id: 'm5', warehouse_id: 'w3', quantity: 140 },
  ];

  const lotes = [
    { id: 'l1', created_by: 'u-op', batch_number: 'LOTE-2026-0812', material_id: 'm1', supplier_id: 'e1', warehouse_id: 'w1', initial_weight_kg: 14500, current_weight_kg: 14500, impurity_percentage: 2, reception_date: ayerISO, status: 'washing_sorting', marine_origin_zone: 'Isla Llancahué', notes: 'Ok', material: mat[0], supplier: emp[0], warehouse: bod[0] },
    { id: 'l2', created_by: 'u-adm', batch_number: 'LOTE-2026-0820', material_id: 'm1', supplier_id: 'e1', warehouse_id: 'w1', initial_weight_kg: 55210, current_weight_kg: 55210, impurity_percentage: 1, reception_date: hoyISO, status: 'dispatched', marine_origin_zone: 'Comau', notes: 'Listo', material: mat[0], supplier: emp[0], warehouse: bod[0] },
    { id: 'l3', created_by: 'u-op', batch_number: 'LOTE-2026-0830', material_id: 'm1', supplier_id: 'e1', warehouse_id: 'w1', initial_weight_kg: 1888888, current_weight_kg: 0, impurity_percentage: 0, reception_date: hoyISO, status: 'received', marine_origin_zone: 'Prueba', notes: '[ANULADO] Error de digitación · Jorge, 27-11-2026', material: mat[0], supplier: emp[0], warehouse: bod[0] },
    { id: 'l4', created_by: 'u-op', batch_number: 'LOTE-2026-0840', material_id: 'm2', supplier_id: 'e2', warehouse_id: 'w4', initial_weight_kg: 5200, current_weight_kg: 5200, impurity_percentage: 1, reception_date: hoyISO, status: 'dispatched', marine_origin_zone: 'Quellón', notes: '', material: mat[1], supplier: emp[1], warehouse: bod[3] },
  ];

  const mov = [
    { id: 'mv1', movement_number: 'MOV-2026-0091', movement_type: 'reception', material_id: 'm1', batch_id: 'l1', from_warehouse_id: null, to_warehouse_id: 'w1', quantity: 14500, unit: 'kg', operator_name: 'Operario Uno', reference_doc: 'Lote LOTE-2026-0812', notes: 'Ingreso', created_at: ayerISO, created_by: 'u-op', material: mat[0], batch: lotes[0], to_warehouse: bod[0] },
    { id: 'mv2', movement_number: 'MOV-2026-0092', movement_type: 'reception', material_id: 'm1', batch_id: 'l2', from_warehouse_id: null, to_warehouse_id: 'w1', quantity: 55210, unit: 'kg', operator_name: 'Admin Uno', reference_doc: 'Lote LOTE-2026-0820', notes: 'Ingreso', created_at: hoyISO, created_by: 'u-adm', material: mat[0], batch: lotes[1], to_warehouse: bod[0] },
    { id: 'mv3', movement_number: 'MOV-2026-0093', movement_type: 'reception', material_id: 'm1', batch_id: 'l3', from_warehouse_id: null, to_warehouse_id: 'w1', quantity: 1888888, unit: 'kg', operator_name: 'Operario Uno', reference_doc: 'Lote LOTE-2026-0830', notes: 'Error', created_at: hoyISO, created_by: 'u-op', material: mat[0], batch: lotes[2], to_warehouse: bod[0] },
    { id: 'mv4', movement_number: 'ANU-2026-0093', movement_type: 'waste_adjustment', material_id: 'm1', batch_id: 'l3', from_warehouse_id: 'w1', to_warehouse_id: null, quantity: 1888888, unit: 'kg', operator_name: 'Admin Uno', reference_doc: 'Anula MOV-2026-0093', notes: 'Error de digitación', created_at: hoyISO, created_by: 'u-adm', material: mat[0], batch: lotes[2], from_warehouse: bod[0] },
    { id: 'mv5', movement_number: 'MOV-2026-0094', movement_type: 'dispatch', material_id: 'm4', batch_id: null, from_warehouse_id: 'w3', to_warehouse_id: null, quantity: 12000, unit: 'kg', operator_name: 'Admin Uno', reference_doc: 'Despacho a Ecomaderas del Sur SpA', notes: 'Venta', created_at: hoyISO, created_by: 'u-adm', material: mat[3], from_warehouse: bod[2] },
    { id: 'mv6', movement_number: 'MOV-2026-0095', movement_type: 'internal_transfer', material_id: 'm1', batch_id: null, from_warehouse_id: 'w1', to_warehouse_id: 'w4', quantity: 2000, unit: 'kg', operator_name: 'Operario Uno', reference_doc: 'Traslado entre bodegas', notes: '', created_at: hoyISO, created_by: 'u-op', material: mat[0], from_warehouse: bod[0], to_warehouse: bod[3] },
    { id: 'mv7', movement_number: 'MOV-2026-0096', movement_type: 'production_intake', material_id: 'm1', batch_id: null, from_warehouse_id: 'w1', to_warehouse_id: null, quantity: 1000, unit: 'kg', operator_name: 'Operario Uno', reference_doc: 'Producción PRD-1', notes: 'Merma 80 kg', created_at: hoyISO, created_by: 'u-op', material: mat[0], from_warehouse: bod[0] },
    { id: 'mv8', movement_number: 'MOV-2026-0097', movement_type: 'production_output', material_id: 'm3', batch_id: null, from_warehouse_id: null, to_warehouse_id: 'w2', quantity: 920, unit: 'kg', operator_name: 'Operario Uno', reference_doc: 'Producción PRD-1', notes: 'Merma 80 kg', created_at: hoyISO, created_by: 'u-op', material: mat[2], to_warehouse: bod[1] },
  ];

  const cert = [
    { id: 'c1', certificate_code: 'CERT-REP-2026-0094', stakeholder_id: 'e2', batch_id: 'l4', issue_date: fechaCorta, waste_type: 'Plumavit EPS', total_kg_valorized: 5200, co2_avoided_kg: 10920, water_saved_liters: 0, oil_saved_barrels: 0, final_destination_product: 'Reciclaje mecánico (pellet)', signer_name: 'Admin Uno', signer_title: 'Administración Greenspot', stakeholder: emp[1], batch: lotes[3] },
  ];

  const usuarios = [
    { id: 'u-adm', full_name: 'Admin Uno', email: 'admin@greenspot.cl', role: 'admin', is_active: true, last_seen_at: hoyISO },
    { id: 'u-op', full_name: 'Operario Uno', email: 'operario@greenspot.cl', role: 'operator', is_active: true, last_seen_at: ayerISO },
  ];

  return { mat, lotes, mov, bod, emp, cert, stock, usuarios };
}
