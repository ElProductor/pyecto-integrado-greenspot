import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadTs, crearDatosBase, makeWorkDir, XLSX } from './helper.mjs';

const pdfMod = loadTs('src/logica/certificadoPdf.ts');
const repMod = loadTs('src/pantallas/Reportes.tsx');
const planillaSoloLectura = loadTs('src/logica/planilla.ts');

function libroDesdeHojas(hojas) {
  const wb = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), nombre);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return XLSX.read(buf, { cellDates: true });
}

test.describe('planilla.ts — validación e importación Excel (leerPlanilla)', () => {
  test('041 leerPlanilla acepta libro vacío sin errores ni altas', () => {
    const wb = XLSX.utils.book_new();
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.deepEqual(c, { materiales: [], empresas: [], lotes: [], ignoradas: 0, errores: [] });
  });

  test('042 Inventario: ignora materiales cuyo código ya existe sin importar mayúsculas', () => {
    const D = crearDatosBase();
    const wb = libroDesdeHojas({ Inventario: [{ 'Código': 'raw-hdpe-boy', Material: 'Duplicado', Tipo: 'HDPE' }] });
    const c = planillaSoloLectura.leerPlanilla(wb, D);
    assert.equal(c.ignoradas, 1);
    assert.equal(c.materiales.length, 0);
    assert.equal(c.errores.length, 0);
  });

  test('043 Inventario: ignora filas duplicadas dentro del mismo archivo', () => {
    const wb = libroDesdeHojas({
      Inventario: [
        { 'Código': 'NEW-01', Material: 'Mat 1', Tipo: 'PET' },
        { 'Código': 'new-01', Material: 'Mat 1 copia', Tipo: 'PET' },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.materiales.length, 1);
    assert.equal(c.ignoradas, 1);
  });

  test('044 Inventario: mapea Tipo "Otro" a OTHER y asigna stock 0 por defecto', () => {
    const wb = libroDesdeHojas({ Inventario: [{ 'Código': 'NEW-OTR', Material: 'Mixto', Tipo: 'Otro' }] });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 0);
    assert.equal(c.materiales[0].polymer_type, 'OTHER');
    assert.equal(c.materiales[0].current_stock, 0);
    assert.equal(c.materiales[0].minimum_stock, 0);
    assert.equal(c.materiales[0].category, 'raw_material');
  });

  test('045 Inventario: traduce unidades u/unidades -> units y kilos -> kg', () => {
    const wb = libroDesdeHojas({
      Inventario: [
        { 'Código': 'U1', Material: 'Basurero', Tipo: 'PP', 'Categoría': 'Producto terminado', Unidad: 'u', 'Mínimo': 5 },
        { 'Código': 'K1', Material: 'Cable', Tipo: 'LDPE', Unidad: 'kilos' },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 0);
    assert.equal(c.materiales[0].unit, 'units');
    assert.equal(c.materiales[0].category, 'finished_product');
    assert.equal(c.materiales[1].unit, 'kg');
  });

  test('046 Inventario: reporta errores con número de fila (+2) ante datos inválidos', () => {
    const wb = libroDesdeHojas({
      Inventario: [
        { 'Código': 'SIN-NOM', Material: '', Tipo: 'HDPE' },
        { 'Código': '', Material: 'Sin cod', Tipo: 'HDPE' },
        { 'Código': 'MAL-POL', Material: 'M1', Tipo: 'PVC' },
        { 'Código': 'MAL-CAT', Material: 'M2', Tipo: 'HDPE', 'Categoría': 'Inventada' },
        { 'Código': 'MAL-UNI', Material: 'M3', Tipo: 'HDPE', Unidad: 'litros' },
        { 'Código': 'MAL-MIN', Material: 'M4', Tipo: 'HDPE', 'Mínimo': -3 },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.materiales.length, 0);
    assert.equal(c.errores.length, 6);
    assert.match(c.errores[0], /^Inventario, fila 2:/);
    assert.match(c.errores[5], /^Inventario, fila 7:/);
  });

  test('047 Empresas: ignora empresa existente normalizando puntos y mayúsculas del RUT', () => {
    const D = crearDatosBase();
    const wb = libroDesdeHojas({
      Empresas: [
        { Nombre: 'Ecomaderas Repetida', RUT: '76980120-k', Tipo: 'Cliente' },
        { Nombre: 'Aqua Repetida', RUT: '96.852.140-5' },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, D);
    assert.equal(c.ignoradas, 2);
    assert.equal(c.empresas.length, 0);
  });

  test('048 Empresas: crea nueva empresa válida y asigna tipo generator_supplier por defecto', () => {
    const wb = libroDesdeHojas({
      Empresas: [{ Nombre: 'Pesquera Sur', RUT: '76.111.222-3', Ciudad: 'Calbuco', Correo: 'hola@pesquera.cl', 'Teléfono': '+5691234' }],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 0);
    assert.equal(c.empresas.length, 1);
    assert.equal(c.empresas[0].type, 'generator_supplier');
    assert.equal(c.empresas[0].city, 'Calbuco');
  });

  test('049 Empresas: rechaza falta de nombre, RUT inválido, tipo inválido y correo inválido', () => {
    const wb = libroDesdeHojas({
      Empresas: [
        { Nombre: '', RUT: '76.111.222-3' },
        { Nombre: 'Mala RUT', RUT: '1234' },
        { Nombre: 'Mal Tipo', RUT: '76.222.333-4', Tipo: 'ProveedorX' },
        { Nombre: 'Mal Mail', RUT: '76.333.444-5', Correo: 'no-es-correo' },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.empresas.length, 0);
    assert.equal(c.errores.length, 4);
  });

  test('050 Lotes: ignora número de lote existente y rechaza número inexistente', () => {
    const D = crearDatosBase();
    const wb = libroDesdeHojas({
      Lotes: [
        { Lote: 'lote-2026-0812', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 1000 },
        { Lote: 'LOTE-NO-EXISTE', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 1000 },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, D);
    assert.equal(c.ignoradas, 1);
    assert.equal(c.errores.length, 1);
    assert.match(c.errores[0], /no existe/);
  });

  test('051 Lotes: permite recepción nueva vinculada a material y empresa creados en el mismo Excel', () => {
    const wb = libroDesdeHojas({
      Inventario: [{ 'Código': 'RAW-NEW-PP', Material: 'Cabos PP Nuevos', Tipo: 'PP' }],
      Empresas: [{ Nombre: 'Cultivos Marinos SA', RUT: '76.444.555-6', Tipo: 'Ambas' }],
      Lotes: [{ Lote: '', Material: 'Cabos PP Nuevos', Empresa: 'Cultivos Marinos SA', 'Kilos ingreso': 12500, Ingreso: '15-10-2026', Origen: 'Reloncaví' }],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 0);
    assert.equal(c.lotes.length, 1);
    assert.equal(c.lotes[0].material, 'RAW-NEW-PP');
    assert.equal(c.lotes[0].empresa, '76444555-6');
    assert.equal(c.lotes[0].kilos, 12500);
  });

  test('052 Lotes: rechaza material no materia-prima o en unidades y empresa solo cliente', () => {
    const wb = libroDesdeHojas({
      Lotes: [
        { Lote: '', Material: 'No Existe', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 100 },
        { Lote: '', Material: 'Pellet HDPE Negro', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 100 },
        { Lote: '', Material: 'Compostera 120L', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 10 },
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'Ecomaderas del Sur SpA', 'Kilos ingreso': 100 },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.lotes.length, 0);
    assert.equal(c.errores.length, 4);
  });

  test('053 Lotes: rechaza kilos <= 0 o > 50.000 kg', () => {
    const wb = libroDesdeHojas({
      Lotes: [
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 0 },
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 50001 },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 2);
  });

  test('054 Lotes: rechaza fechas futuras, texto inválido y fechas de calendario inexistentes (31-02)', () => {
    const manana = new Date(Date.now() + 3 * 86400000);
    const strFuturo = `${String(manana.getDate()).padStart(2, '0')}-${String(manana.getMonth() + 1).padStart(2, '0')}-${manana.getFullYear()}`;
    const wb = libroDesdeHojas({
      Lotes: [
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 500, Ingreso: '31-02-2026' },
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 500, Ingreso: strFuturo },
        { Lote: '', Material: 'Boyas HDPE', Empresa: 'AquaChile S.A.', 'Kilos ingreso': 500, Ingreso: 'ayer' },
      ],
    });
    const c = planillaSoloLectura.leerPlanilla(wb, crearDatosBase());
    assert.equal(c.errores.length, 3);
  });

  test('055 guardarCarga ejecuta altas en orden empresas -> materiales -> lotes asignando BOD-PM-ACOPIO', async () => {
    const llamadas = [];
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', d => { body += d; });
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : null;
        llamadas.push({ method: req.method, url: req.url, body: parsed });
        res.setHeader('content-type', 'application/json');
        if (req.url.includes('/rest/v1/stakeholders') && req.method === 'POST') {
          return res.end(JSON.stringify({ id: 'e-new', ...parsed }));
        }
        if (req.url.includes('/rest/v1/materials_and_products') && req.method === 'POST') {
          return res.end(JSON.stringify({ id: 'm-new', ...parsed }));
        }
        if (req.url.includes('/rest/v1/batches') && req.method === 'POST') {
          return res.end(JSON.stringify({ id: 'l-new', created_by: 'u-adm', ...parsed }));
        }
        if (req.url.includes('/rest/v1/inventory_movements') && req.method === 'GET') {
          return res.end(JSON.stringify([]));
        }
        if (req.url.includes('/rest/v1/inventory_movements') && req.method === 'POST') {
          return res.end(JSON.stringify({ id: 'mv-new', ...parsed }));
        }
        res.end('[]');
      });
    });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const port = srv.address().port;
    try {
      const planillaLive = loadTs('src/logica/planilla.ts', { VITE_SUPABASE_URL: `http://127.0.0.1:${port}` });
      const D = crearDatosBase();
      const anio = new Date().getFullYear();
      const wb = libroDesdeHojas({
        Empresas: [{ Nombre: 'Nueva Gen SA', RUT: '76.777.888-9', Tipo: 'Generadora' }],
        Inventario: [{ 'Código': 'RAW-NEW-X', Material: 'Cabos X', Tipo: 'PP' }],
        Lotes: [{ Lote: '', Material: 'Cabos X', Empresa: 'Nueva Gen SA', 'Kilos ingreso': 3500 }],
      });
      const c = planillaLive.leerPlanilla(wb, D);
      const count = await planillaLive.guardarCarga(c, D, 'Admin Uno', 'u-adm');
      assert.equal(count, 3);
      const posts = llamadas.filter(x => x.method === 'POST');
      assert.ok(posts[0].url.includes('/stakeholders'));
      assert.ok(posts[1].url.includes('/materials_and_products'));
      assert.ok(posts[2].url.includes('/batches'));
      assert.equal(posts[2].body.warehouse_id, 'w1');
      assert.match(posts[2].body.batch_number, new RegExp(`^LOTE-${anio}-0841$`));
      assert.ok(posts[3].url.includes('/inventory_movements'));
    } finally {
      await new Promise(r => srv.close(r));
    }
  });
});

test.describe('certificadoPdf.ts — validaciones y generación real de PDF', () => {
  test('056 faltantesCertificado retorna lista vacía cuando los 6 datos obligatorios existen', () => {
    const D = crearDatosBase();
    assert.deepEqual(pdfMod.faltantesCertificado(D.cert[0]), []);
  });

  test('057 faltantesCertificado detecta individualmente empresa, RUT, lote, residuo, kilos<=0 y firmante', () => {
    const base = crearDatosBase().cert[0];
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, stakeholder: undefined }), ['empresa generadora', 'RUT de la empresa']);
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, stakeholder: { ...base.stakeholder, tax_id: '' } }), ['RUT de la empresa']);
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, batch: undefined }), ['lote']);
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, waste_type: '' }), ['tipo de residuo']);
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, total_kg_valorized: 0 }), ['kilos valorizados']);
    assert.deepEqual(pdfMod.faltantesCertificado({ ...base, signer_name: '   ' }), ['firmante']);
  });

  test('058 generateCertificatePdf rechaza emitir sin guardar si faltan datos obligatorios', async () => {
    const base = crearDatosBase().cert[0];
    await assert.rejects(() => pdfMod.generateCertificatePdf({ ...base, signer_name: '' }), /faltan datos obligatorios: firmante/);
  });

  test('059 generateCertificatePdf produce PDF real con código, empresa, lote, CO2 y sin QR', async () => {
    const dir = makeWorkDir('pdf-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const D = crearDatosBase();
      await pdfMod.generateCertificatePdf(D.cert[0]);
      const files = fs.readdirSync(dir);
      assert.deepEqual(files, ['CERT-REP-2026-0094_Greenspot_Certificado.pdf']);
      const txt = fs.readFileSync(path.join(dir, files[0]), 'latin1');
      assert.ok(txt.startsWith('%PDF-1.'));
      assert.ok(txt.includes('Greenspot SpA'));
      assert.ok(txt.includes('CERT-REP-2026-0094'));
      assert.ok(txt.includes('Cermaq Chile'));
      assert.ok(txt.includes('LOTE-2026-0840'));
      assert.ok(txt.includes('CO2eq evitado'));
      assert.ok(!txt.includes('qr_verification_code'));
    } finally {
      process.chdir(prev);
    }
  });

  test('060 generateCertificatePdf omite CO2eq evitado cuando es 0 y campos opcionales vacíos', async () => {
    const dir = makeWorkDir('pdf-zero-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const cert = {
        ...crearDatosBase().cert[0],
        certificate_code: 'CERT-REP-2026-0100',
        co2_avoided_kg: 0,
        signer_title: '',
        stakeholder: { id: 'e1', name: 'AquaChile S.A.', type: 'generator_supplier', tax_id: '96.852.140-5', address: '', city: '', contact_email: '', contact_phone: '', industry_sector: '' },
        batch: { id: 'l2', batch_number: 'LOTE-2026-0820', material_id: 'm1', initial_weight_kg: 1000, current_weight_kg: 1000, impurity_percentage: 0, reception_date: '', status: 'dispatched', marine_origin_zone: '' },
      };
      await pdfMod.generateCertificatePdf(cert);
      const txt = fs.readFileSync(path.join(dir, 'CERT-REP-2026-0100_Greenspot_Certificado.pdf'), 'latin1');
      assert.ok(txt.includes('CERT-REP-2026-0100'));
      assert.ok(!txt.includes('CO2eq evitado'));
    } finally {
      process.chdir(prev);
    }
  });
});

test.describe('Reportes.tsx — períodos, agregaciones y exportación Excel', () => {
  test('061 rangoDe("dia") cubre desde las 00:00 del día hasta las 00:00 siguiente', () => {
    const ref = new Date(2026, 10, 27, 15, 30);
    const [ini, fin] = repMod.rangoDe('dia', ref);
    assert.equal(ini.getFullYear(), 2026);
    assert.equal(ini.getMonth(), 10);
    assert.equal(ini.getDate(), 27);
    assert.equal(ini.getHours(), 0);
    assert.equal(fin.getTime() - ini.getTime(), 86400000);
  });

  test('062 rangoDe("semana") parte siempre en lunes incluso cuando "ahora" es domingo', () => {
    // 2026-11-29 es domingo -> lunes de esa semana es 2026-11-23
    const domingo = new Date(2026, 10, 29, 18, 0);
    const [ini] = repMod.rangoDe('semana', domingo);
    assert.equal(ini.getDay(), 1);
    assert.equal(ini.getDate(), 23);
  });

  test('063 rangoDe("mes") parte en el día 1 y rangoDe("2026-10") cubre octubre exacto', () => {
    const [iniM] = repMod.rangoDe('mes', new Date(2026, 10, 27, 10, 0));
    assert.equal(iniM.getDate(), 1);
    const [iniC, finC] = repMod.rangoDe('2026-10');
    assert.equal(iniC.getMonth(), 9);
    assert.equal(iniC.getDate(), 1);
    assert.equal(finC.getMonth(), 10);
    assert.equal(finC.getDate(), 1);
  });

  test('064 resumen interpreta fechas YYYY-MM-DD de certificados en hora local y calcula KPIs', () => {
    const ahora = new Date();
    const D = crearDatosBase(ahora);
    const r = repMod.rangoDe('dia', ahora);
    const R = repMod.resumen(D, r);
    // Hoy tiene mv2 (+55210), mv3 (+1888888), mv4 (Anula mv3 -> -1888888), mv5 (-12000 despacho)
    assert.equal(R.recibido, 55210);
    assert.equal(R.despachado, 12000);
    assert.equal(R.nLotes, 1); // l2 ingresado hoy menos l3 anulado hoy
    assert.equal(R.cert.length, 1);
    assert.equal(R.certKg, 5200);
  });

  test('065 resumen no reescribe un mes cerrado cuando la anulación ocurre el mes siguiente', () => {
    const D = crearDatosBase();
    const orig = {
      id: 'oct-1', movement_number: 'MOV-OCT-1', movement_type: 'reception', material_id: 'm1', batch_id: 'l-oct',
      from_warehouse_id: null, to_warehouse_id: 'w1', quantity: 10000, unit: 'kg', operator_name: 'Op',
      created_at: '2026-10-10T15:00:00Z',
    };
    const anu = {
      id: 'nov-1', movement_number: 'ANU-NOV-1', movement_type: 'waste_adjustment', material_id: 'm1', batch_id: 'l-oct',
      from_warehouse_id: 'w1', to_warehouse_id: null, quantity: 10000, unit: 'kg', operator_name: 'Adm',
      reference_doc: 'Anula MOV-OCT-1', notes: 'Anula', created_at: '2026-11-02T12:00:00Z',
    };
    D.mov = [orig, anu];
    D.lotes = [{ id: 'l-oct', reception_date: '2026-10-10T15:00:00Z', status: 'received', notes: '[ANULADO]' }];
    D.cert = [];
    const rOct = repMod.resumen(D, repMod.rangoDe('2026-10'));
    const rNov = repMod.resumen(D, repMod.rangoDe('2026-11'));
    assert.equal(rOct.recibido, 10000);
    assert.equal(rOct.nLotes, 1);
    assert.equal(rNov.recibido, -10000);
    assert.equal(rNov.nLotes, -1);
  });

  test('066 resumen filtra materiales sin movimiento y retorna porMaterial vacío en mes sin actividad', () => {
    const D = crearDatosBase();
    const R = repMod.resumen(D, repMod.rangoDe('2025-01'));
    assert.equal(R.porMaterial.length, 0);
    assert.equal(R.recibido, 0);
    assert.equal(R.despachado, 0);
    assert.equal(R.certKg, 0);
  });

  test('067 descargar genera Excel de Inventario con columnas por bodega y stock total', () => {
    const dir = makeWorkDir('xlsx-inv-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const D = crearDatosBase();
      repMod.descargar('Inventario', D);
      const files = fs.readdirSync(dir);
      assert.equal(files.length, 1);
      assert.match(files[0], /^Greenspot-Inventario-\d{4}-\d{2}-\d{2}\.xlsx$/);
      const wb = XLSX.readFile(path.join(dir, files[0]));
      const rows = XLSX.utils.sheet_to_json(wb.Sheets.Inventario);
      assert.equal(rows.length, D.mat.length);
      assert.equal(rows[0].Patio, 55000);
      assert.equal(rows[0].Dalcahue, 5000);
    } finally {
      process.chdir(prev);
    }
  });

  test('068 descargar genera Excel de Lotes marcando "Anulado" en columna Etapa', () => {
    const dir = makeWorkDir('xlsx-lotes-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      repMod.descargar('Lotes', crearDatosBase());
      const f = fs.readdirSync(dir)[0];
      const wb = XLSX.readFile(path.join(dir, f));
      const rows = XLSX.utils.sheet_to_json(wb.Sheets.Lotes);
      const anulado = rows.find(r => r.Lote === 'LOTE-2026-0830');
      assert.equal(anulado.Etapa, 'Anulado');
    } finally {
      process.chdir(prev);
    }
  });

  test('069 descargar genera Excel de Movimientos con Estado "Anulado" y signo correcto', () => {
    const dir = makeWorkDir('xlsx-mov-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      repMod.descargar('Movimientos', crearDatosBase());
      const wb = XLSX.readFile(path.join(dir, fs.readdirSync(dir)[0]));
      const rows = XLSX.utils.sheet_to_json(wb.Sheets.Movimientos);
      const rev = rows.find(r => r.Referencia === 'Lote LOTE-2026-0830');
      assert.equal(rev.Estado, 'Anulado');
      const desp = rows.find(r => String(r.Referencia).includes('Ecomaderas'));
      assert.equal(desp.Cantidad, -12000);
    } finally {
      process.chdir(prev);
    }
  });

  test('070 descargar genera hoja con mensaje "Sin registros en el período" cuando tabla está vacía', () => {
    const dir = makeWorkDir('xlsx-empty-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const D = { ...crearDatosBase(), cert: [] };
      repMod.descargar('Certificados', D);
      const wb = XLSX.readFile(path.join(dir, fs.readdirSync(dir)[0]));
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets.Certificados, { header: 1 });
      assert.deepEqual(aoa, [['Sin registros en el período']]);
    } finally {
      process.chdir(prev);
    }
  });

  test('071 descargarPlanilla en período abierto ("mes") incluye pestaña Inventario y Resumen', () => {
    const dir = makeWorkDir('xlsx-open-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      repMod.descargarPlanilla('mes', crearDatosBase());
      const wb = XLSX.readFile(path.join(dir, fs.readdirSync(dir)[0]));
      assert.deepEqual(wb.SheetNames, ['Resumen', 'Por material', 'Movimientos', 'Lotes', 'Certificados', 'Inventario', 'Empresas']);
    } finally {
      process.chdir(prev);
    }
  });

  test('072 descargarPlanilla en mes cerrado omite pestaña Inventario y nombra archivo con YYYY-MM', () => {
    const dir = makeWorkDir('xlsx-closed-');
    const prev = process.cwd();
    process.chdir(dir);
    try {
      repMod.descargarPlanilla('2025-05', crearDatosBase());
      const f = fs.readdirSync(dir)[0];
      assert.equal(f, 'Greenspot-Planilla-2025-05.xlsx');
      const wb = XLSX.readFile(path.join(dir, f));
      assert.ok(!wb.SheetNames.includes('Inventario'));
      const resumenRows = XLSX.utils.sheet_to_json(wb.Sheets.Resumen);
      assert.match(String(resumenRows[0].Valor), /del 01-05-2025 al 31-05-2025|del 1-5-2025 al 31-5-2025/);
    } finally {
      process.chdir(prev);
    }
  });
});
