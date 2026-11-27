import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, crearDatosBase } from './helper.mjs';

const fmt = loadTs('src/logica/formato.ts');
const reg = loadTs('src/logica/reglas.ts');

test.describe('formato.ts — números, unidades, fechas y RUT', () => {
  test('001 num formatea miles en es-CL', () => {
    assert.equal(fmt.num(1500), '1.500');
  });
  test('002 num limita a 2 decimales y redondea', () => {
    assert.equal(fmt.num(1250.567), '1.250,57');
  });
  test('003 num devuelve 0 para NaN, null o undefined', () => {
    assert.equal(fmt.num(NaN), '0');
    assert.equal(fmt.num(undefined), '0');
  });
  test('004 uni traduce units a u y big_bag a maxisacos', () => {
    assert.equal(fmt.uni('units'), 'u');
    assert.equal(fmt.uni('big_bag'), 'maxisacos');
    assert.equal(fmt.uni('kg'), 'kg');
    assert.equal(fmt.uni('ton'), 'ton');
  });
  test('005 cant combina cantidad y unidad abreviada', () => {
    assert.equal(fmt.cant(140, 'units'), '140 u');
    assert.equal(fmt.cant(1500.5), '1.500,5 kg');
  });
  test('006 toneladas convierte kg a t con 1 decimal', () => {
    assert.equal(fmt.toneladas(233400), '233,4');
    assert.equal(fmt.toneladas(841000), '841');
  });
  test('007 fecha retorna guión largo si falta fecha', () => {
    assert.equal(fmt.fecha(undefined), '—');
    assert.equal(fmt.fecha(''), '—');
  });
  test('008 fecha muestra "Hoy" para marca temporal actual', () => {
    const out = fmt.fecha(new Date().toISOString());
    assert.match(out, /^Hoy \d{2}:\d{2}/);
  });
  test('009 fecha muestra "Ayer" para marca temporal de ayer', () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    assert.match(fmt.fecha(d.toISOString()), /^Ayer \d{2}:\d{2}/);
  });
  test('010 fecha muestra día/mes sin año si es del año actual', () => {
    const hoy = new Date();
    const otroDia = new Date(hoy.getFullYear(), hoy.getMonth() === 0 ? 5 : 0, 15, 10, 30);
    const out = fmt.fecha(otroDia.toISOString());
    const esperadoDiaMes = otroDia.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    assert.ok(!out.startsWith('Hoy') && !out.startsWith('Ayer'));
    assert.ok(out.startsWith(esperadoDiaMes + ' '), out);
  });
  test('011 fecha incluye año de 2 dígitos si es de otro año', () => {
    const out = fmt.fecha('2023-06-15T14:20:00Z');
    assert.match(out, /23 /);
  });
  test('012 RUT_OK acepta formatos chilenos válidos con/sin puntos y K', () => {
    for (const r of ['76.123.456-7', '96852140-5', '7.123.456-k', '76.980.120-K']) {
      assert.equal(fmt.RUT_OK.test(r), true, r);
    }
  });
  test('013 RUT_OK rechaza formatos inválidos', () => {
    for (const r of ['', '123', '76.123.456', '76123456-A', '123456789-0', '76.12.456-7']) {
      assert.equal(fmt.RUT_OK.test(r), false, r);
    }
  });
});

test.describe('reglas.ts — lotes, etapas y certificados', () => {
  test('014 ETAPAS contiene las 5 etapas secuenciales de proceso', () => {
    assert.deepEqual([...reg.ETAPAS], ['received', 'washing_sorting', 'shredded', 'pelletized', 'dispatched']);
  });
  test('015 NOMBRE_ETAPA incluye etiqueta para las 6 variantes BatchStatus', () => {
    for (const s of ['received', 'washing_sorting', 'shredded', 'pelletized', 'dispatched', 'quarantine']) {
      assert.ok(typeof reg.NOMBRE_ETAPA[s] === 'string' && reg.NOMBRE_ETAPA[s].length > 0);
    }
  });
  test('016 loteAnulado detecta prefijo exacto [ANULADO]', () => {
    assert.equal(reg.loteAnulado({ notes: '[ANULADO] motivo' }), true);
    assert.equal(reg.loteAnulado({ notes: 'Normal [ANULADO]' }), false);
    assert.equal(reg.loteAnulado({ notes: undefined }), false);
  });
  test('017 siguiente avanza paso a paso hasta dispatched', () => {
    assert.equal(reg.siguiente({ status: 'received', notes: '' }), 'washing_sorting');
    assert.equal(reg.siguiente({ status: 'washing_sorting', notes: '' }), 'shredded');
    assert.equal(reg.siguiente({ status: 'shredded', notes: '' }), 'pelletized');
    assert.equal(reg.siguiente({ status: 'pelletized', notes: '' }), 'dispatched');
  });
  test('018 siguiente devuelve null en dispatched, quarantine y lote anulado', () => {
    assert.equal(reg.siguiente({ status: 'dispatched', notes: '' }), null);
    assert.equal(reg.siguiente({ status: 'quarantine', notes: '' }), null);
    assert.equal(reg.siguiente({ status: 'received', notes: '[ANULADO] test' }), null);
  });
  test('019 enProceso excluye despachados y anulados', () => {
    const D = crearDatosBase();
    assert.equal(reg.enProceso(D.lotes[0]), true);
    assert.equal(reg.enProceso(D.lotes[1]), false); // dispatched
    assert.equal(reg.enProceso(D.lotes[2]), false); // [ANULADO]
  });
  test('020 textoAvanzar usa Despacho al final y NOMBRE_ETAPA en intermedias', () => {
    assert.equal(reg.textoAvanzar('washing_sorting'), 'Pasar a Lavado');
    assert.equal(reg.textoAvanzar('dispatched'), 'Pasar a Despacho');
  });
  test('021 certDe encuentra el certificado asociado a un lote', () => {
    const D = crearDatosBase();
    assert.equal(reg.certDe(D, D.lotes[3])?.certificate_code, 'CERT-REP-2026-0094');
    assert.equal(reg.certDe(D, D.lotes[1]), undefined);
  });
  test('022 sinCert retorna solo despachados, no anulados, con proveedor y sin cert', () => {
    const D = crearDatosBase();
    D.lotes.push(
      { ...D.lotes[1], id: 'l-an', status: 'dispatched', notes: '[ANULADO] x' },
      { ...D.lotes[1], id: 'l-sin-sup', status: 'dispatched', supplier_id: undefined, notes: '' },
    );
    const sc = reg.sinCert(D);
    assert.deepEqual(sc.map(l => l.id), ['l2']);
  });
});

test.describe('reglas.ts — bodegas, stock, alertas y kilos de empresas', () => {
  test('023 nombreBod usa nombres cortos conocidos y fallback para nuevas bodegas', () => {
    assert.equal(reg.nombreBod({ code: 'BOD-PM-ACOPIO', name: 'Largo' }), 'Patio');
    assert.equal(reg.nombreBod({ code: 'BOD-PM-PLANTA', name: 'Largo' }), 'Nave de proceso');
    assert.equal(reg.nombreBod({ code: 'BOD-PM-PELLET', name: 'Largo' }), 'Silos');
    assert.equal(reg.nombreBod({ code: 'BOD-DAL-CHILOE', name: 'Largo' }), 'Dalcahue');
    assert.equal(reg.nombreBod({ code: 'BOD-NUEVA', name: 'Bodega Norte' }), 'Bodega Norte');
    assert.equal(reg.nombreBod(null), '—');
  });
  test('024 bodegas filtra inactivas y respeta orden operativo', () => {
    const D = crearDatosBase();
    D.bod.reverse();
    D.bod.push({ id: 'w-in', code: 'BOD-X', name: 'Inactiva', location: '', manager_name: '', capacity_tons: 10, is_active: false });
    D.bod.push({ id: 'w-ex', code: 'BOD-Z', name: 'Extra', location: '', manager_name: '', capacity_tons: 10, is_active: true });
    assert.deepEqual(reg.bodegas(D).map(w => w.code), ['BOD-PM-ACOPIO', 'BOD-PM-PLANTA', 'BOD-PM-PELLET', 'BOD-DAL-CHILOE', 'BOD-Z']);
  });
  test('025 stockEn devuelve cantidad numérica o 0', () => {
    const D = crearDatosBase();
    assert.equal(reg.stockEn(D, 'm1', 'w1'), 55000);
    assert.equal(reg.stockEn(D, 'm1', 'w99'), 0);
  });
  test('026 bajoMinimo es estricto (< minimum_stock)', () => {
    assert.equal(reg.bajoMinimo({ current_stock: 4000, minimum_stock: 10000 }), true);
    assert.equal(reg.bajoMinimo({ current_stock: 5000, minimum_stock: 5000 }), false);
  });
  test('027 bodegasLlenas detecta >= 90% solo de materiales en kg e ignora units y capacidad 0', () => {
    const D = crearDatosBase();
    D.stock = [
      { material_id: 'm1', warehouse_id: 'w1', quantity: 720000 }, // 720t / 800t = 90% -> SI
      { material_id: 'm3', warehouse_id: 'w2', quantity: 359999 }, // 359.999t / 400t < 90% -> NO
      { material_id: 'm5', warehouse_id: 'w3', quantity: 9999999 }, // units -> NO cuenta
      { material_id: 'm4', warehouse_id: 'w3', quantity: 585000 }, // 585t / 650t = 90% -> SI
    ];
    D.bod[3].capacity_tons = 0;
    D.stock.push({ material_id: 'm1', warehouse_id: 'w4', quantity: 500000 });
    const llenas = reg.bodegasLlenas(D);
    assert.deepEqual(llenas.map(x => x.b.id), ['w1', 'w3']);
  });
  test('028 kgEnPlanta suma únicamente materiales en kg', () => {
    const D = crearDatosBase();
    assert.equal(reg.kgEnPlanta(D), 60000 + 4000 + 8000 + 25000);
  });
  test('029 esGeneradora y esCliente clasifican generator, buyer y both', () => {
    const D = crearDatosBase();
    assert.equal(reg.esGeneradora(D.emp[0]), true);
    assert.equal(reg.esCliente(D.emp[0]), false);
    assert.equal(reg.esCliente(D.emp[2]), true);
    assert.equal(reg.esGeneradora(D.emp[2]), false);
    assert.equal(reg.esGeneradora(D.emp[3]), true);
    assert.equal(reg.esCliente(D.emp[3]), true);
  });
  test('030 kilosEntregados excluye lotes [ANULADO] (regresión 1.888.888 + 69.710)', () => {
    const D = crearDatosBase();
    assert.equal(reg.kilosEntregados(D, 'e1'), 69710);
    assert.equal(reg.kilosEntregados(D, 'e3'), 0);
  });
  test('031 kilosComprados excluye anulaciones y aplica correcciones', () => {
    const D = crearDatosBase();
    const orig = D.mov.find(m => m.movement_number === 'MOV-2026-0094');
    // Corrección al alza (+500 kg en mismo sentido)
    D.mov.push({ ...orig, id: 'mv-c1', movement_number: 'COR-1', reference_doc: 'Corrige MOV-2026-0094', quantity: 500, movement_type: 'waste_adjustment' });
    assert.equal(reg.kilosComprados(D, 'Ecomaderas del Sur SpA'), 12500);
    // Corrección a la baja (-2000 kg en sentido inverso)
    D.mov.push({ ...orig, id: 'mv-c2', movement_number: 'COR-2', reference_doc: 'Corrige MOV-2026-0094', quantity: 2000, from_warehouse_id: null, to_warehouse_id: orig.from_warehouse_id, movement_type: 'count_adjustment_in' });
    assert.equal(reg.kilosComprados(D, 'Ecomaderas del Sur SpA'), 10500);
    // Anulación posterior deja en 0
    D.mov.push({ ...orig, id: 'mv-an', movement_number: 'ANU-1', reference_doc: 'Anula MOV-2026-0094', quantity: 10500, from_warehouse_id: null, to_warehouse_id: orig.from_warehouse_id, movement_type: 'count_adjustment_in' });
    assert.equal(reg.kilosComprados(D, 'Ecomaderas del Sur SpA'), 0);
  });
});

test.describe('reglas.ts — movimientos, kardex, contrapartidas y permisos', () => {
  test('032 claseMov distingue los 7 tipos de movimiento más Anula y Corrige', () => {
    assert.equal(reg.claseMov({ movement_type: 'reception' }), 'entra');
    assert.equal(reg.claseMov({ movement_type: 'dispatch' }), 'sale');
    assert.equal(reg.claseMov({ movement_type: 'internal_transfer' }), 'mover');
    assert.equal(reg.claseMov({ movement_type: 'waste_adjustment' }), 'contar');
    assert.equal(reg.claseMov({ movement_type: 'count_adjustment_in' }), 'contar');
    assert.equal(reg.claseMov({ movement_type: 'production_intake' }), 'prod');
    assert.equal(reg.claseMov({ movement_type: 'production_output' }), 'prod');
    assert.equal(reg.claseMov({ movement_type: 'waste_adjustment', reference_doc: 'Anula MOV-1' }), 'anula');
    assert.equal(reg.claseMov({ movement_type: 'waste_adjustment', reference_doc: 'Corrige MOV-1' }), 'contar');
  });
  test('033 signoMov asigna +1, 0 y -1 según impacto en stock', () => {
    for (const t of ['reception', 'count_adjustment_in', 'production_output']) assert.equal(reg.signoMov({ movement_type: t }), 1);
    assert.equal(reg.signoMov({ movement_type: 'internal_transfer' }), 0);
    for (const t of ['dispatch', 'production_intake', 'waste_adjustment']) assert.equal(reg.signoMov({ movement_type: t }), -1);
  });
  test('034 detalleMov genera texto legible para cada rama y ajustes', () => {
    const D = crearDatosBase();
    assert.match(reg.detalleMov(D.mov[0]), /Boyas HDPE → Patio/);
    assert.match(reg.detalleMov(D.mov[4]), /Pellet HDPE Negro · desde Silos/);
    assert.match(reg.detalleMov(D.mov[5]), /Boyas HDPE · Patio → Dalcahue/);
    assert.match(reg.detalleMov(D.mov[3]), /Anula MOV-2026-0093 · Boyas HDPE · Error de digitación/);
    const conteo = { movement_type: 'count_adjustment_in', material: D.mat[0], to_warehouse: D.bod[0] };
    assert.match(reg.detalleMov(conteo), /Corrección de conteo · Boyas HDPE · Patio/);
  });
  test('035 ajusteDe y ajustesDe vinculan contrapartidas por movement_number', () => {
    const D = crearDatosBase();
    assert.deepEqual(reg.ajusteDe(D.mov[3]), { tipo: 'Anula', num: 'MOV-2026-0093' });
    assert.equal(reg.ajusteDe({ reference_doc: 'Anula MOV 1' }), null);
    assert.equal(reg.ajustesDe(D, D.mov[2]).length, 1);
    assert.equal(reg.anulado(D, D.mov[2]), true);
    assert.equal(reg.anulado(D, D.mov[0]), false);
  });
  test('036 mismoSentido compara origen y destino normalizando undefined/null', () => {
    assert.equal(reg.mismoSentido({ from_warehouse_id: null, to_warehouse_id: 'w1' }, { from_warehouse_id: undefined, to_warehouse_id: 'w1' }), true);
    assert.equal(reg.mismoSentido({ from_warehouse_id: 'w1', to_warehouse_id: null }, { from_warehouse_id: null, to_warehouse_id: 'w1' }), false);
  });
  test('037 contra construye asiento de refuerzo o reverso para entrada, salida y traslado', () => {
    assert.deepEqual(reg.contra({ from_warehouse_id: null, to_warehouse_id: 'w1' }, false), {
      from_warehouse_id: 'w1', to_warehouse_id: null, movement_type: 'waste_adjustment',
    });
    assert.deepEqual(reg.contra({ from_warehouse_id: 'w3', to_warehouse_id: null }, false), {
      from_warehouse_id: null, to_warehouse_id: 'w3', movement_type: 'count_adjustment_in',
    });
    assert.deepEqual(reg.contra({ from_warehouse_id: 'w1', to_warehouse_id: 'w4' }, false), {
      from_warehouse_id: 'w4', to_warehouse_id: 'w1', movement_type: 'internal_transfer',
    });
    assert.deepEqual(reg.contra({ from_warehouse_id: null, to_warehouse_id: 'w1' }, true), {
      from_warehouse_id: null, to_warehouse_id: 'w1', movement_type: 'count_adjustment_in',
    });
  });
  test('038 bloqueoAjuste bloquea ajustes, anulados, sin bodega y con certificado', () => {
    const D = crearDatosBase();
    assert.match(reg.bloqueoAjuste(D, D.mov[3], true, 'u-adm'), /Es un ajuste/);
    assert.match(reg.bloqueoAjuste(D, D.mov[2], true, 'u-adm'), /ya está anulado/);
    assert.match(reg.bloqueoAjuste(D, { ...D.mov[4], from_warehouse_id: null, to_warehouse_id: null }, true, 'u-adm'), /no tiene bodega/);
    assert.match(reg.bloqueoAjuste(D, { ...D.mov[0], batch_id: 'l4' }, true, 'u-adm'), /ya tiene certificado/);
  });
  test('039 bloqueoAjuste restringe operario a registros propios de hoy y libera admin', () => {
    const D = crearDatosBase();
    // mv1 es de ayer y de u-op
    assert.match(reg.bloqueoAjuste(D, D.mov[0], false, 'u-op'), /propios registros del día/);
    assert.equal(reg.bloqueoAjuste(D, D.mov[0], true, 'u-adm'), null);
    // mv5 es de hoy y de u-adm
    assert.match(reg.bloqueoAjuste(D, D.mov[4], false, 'u-op'), /propios registros del día/);
    // mv6 es de hoy y de u-op
    assert.equal(reg.bloqueoAjuste(D, D.mov[5], false, 'u-op'), null);
  });
  test('040 recepcionDe devuelve la entrada original del lote ignorando ajustes', () => {
    const D = crearDatosBase();
    assert.equal(reg.recepcionDe(D, D.lotes[2])?.movement_number, 'MOV-2026-0093');
    assert.equal(reg.recepcionDe(D, D.lotes[3]), undefined);
  });
});
