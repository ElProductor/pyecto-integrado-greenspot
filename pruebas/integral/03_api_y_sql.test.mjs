import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadTs, REPO } from './helper.mjs';

const apiBase = loadTs('src/datos/api.ts');

function scanSrc(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) scanSrc(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

test.describe('api.ts — traducción de errores, ErrorApp y reintento seguro', () => {
  test('073 enEspanol traduce errores de red y JWT expirado', () => {
    assert.match(apiBase.enEspanol({ message: 'Failed to fetch' }), /Sin conexión/);
    assert.match(apiBase.enEspanol({ message: 'TypeError: Load failed' }), /Sin conexión/);
    assert.match(apiBase.enEspanol({ message: 'JWT expired' }), /sesión venció/);
  });

  test('074 enEspanol traduce códigos SQL PostgreSQL y stock insuficiente', () => {
    assert.match(apiBase.enEspanol({ message: 'row-level security', code: '42501' }), /No tienes permiso/);
    assert.match(apiBase.enEspanol({ message: 'duplicate key', code: '23505' }), /número ya existe/);
    assert.match(apiBase.enEspanol({ message: 'fk violation', code: '23503' }), /Falta un dato relacionado/);
    assert.match(apiBase.enEspanol({ message: 'check', code: '23514' }), /Un dato no es válido/);
    assert.match(apiBase.enEspanol({ message: 'not null', code: '23502' }), /Un dato no es válido/);
    assert.match(apiBase.enEspanol({ message: 'invalid input', code: '22P02' }), /Un dato no es válido/);
    assert.match(apiBase.enEspanol({ message: 'Stock insuficiente en bodega' }), /No hay stock suficiente/);
  });

  test('075 enEspanol conserva mensajes P0001 o con tildes y oculta errores técnicos en inglés', () => {
    assert.equal(apiBase.enEspanol({ message: 'Solo admin puede', code: 'P0001' }), 'Solo admin puede');
    assert.equal(apiBase.enEspanol({ message: 'El lote ya tiene certificado emitido' }), 'No se pudo completar la operación. Inténtalo de nuevo o avisa a administración.');
    assert.equal(apiBase.enEspanol({ message: 'El lote no está despachado' }), 'El lote no está despachado');
    assert.match(apiBase.enEspanol({ message: 'Unexpected JSON token at position 0' }), /No se pudo completar la operación/);
  });

  test('076 yaGuardado detecta ErrorApp 23505 solo cuando coincide el campo', () => {
    const err = new apiBase.ErrorApp({ message: 'duplicate key value violates unique constraint "batches_batch_number_key"', code: '23505' });
    assert.equal(apiBase.yaGuardado(err, 'batch_number'), true);
    assert.equal(apiBase.yaGuardado(err, 'movement_number'), false);
    assert.equal(apiBase.yaGuardado(new Error('23505 batch_number'), 'batch_number'), false);
  });

  test('077 getSupabase devuelve null si faltan credenciales Vite', () => {
    const supaVacio = loadTs('src/datos/supabase.ts', { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' });
    assert.equal(supaVacio.getSupabase(), null);
  });
});

test.describe('api.ts — integración HTTP contra cliente @supabase/supabase-js real', async () => {
  let srv, port, handler, api;

  test.before(async () => {
    srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', d => { body += d; });
      req.on('end', () => handler(req, res, body ? JSON.parse(body) : null));
    });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    port = srv.address().port;
    api = loadTs('src/datos/api.ts', { VITE_SUPABASE_URL: `http://127.0.0.1:${port}`, VITE_SUPABASE_ANON_KEY: 'key-test' }).apiService;
  });

  test.after(async () => {
    await new Promise(r => srv.close(r));
  });

  test('078 paginación por tramos (TRAMO=1000) concatena 1.250 filas en dos peticiones', async () => {
    const offsets = [];
    handler = (req, res) => {
      const u = new URL(req.url, 'http://localhost');
      const off = Number(u.searchParams.get('offset') || 0);
      offsets.push(`${off}:${u.searchParams.get('limit')}`);
      res.setHeader('content-type', 'application/json');
      if (off === 0) {
        res.end(JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: `mv-${i}` }))));
      } else {
        res.end(JSON.stringify(Array.from({ length: 250 }, (_, i) => ({ id: `mv-${1000 + i}` }))));
      }
    };
    const filas = await api.getMovements();
    assert.equal(filas.length, 1250);
    assert.deepEqual(offsets, ['0:1000', '1000:1000']);
  });

  test('079 createMaterial con stock inicial 0 inserta solo el material sin movimientos', async () => {
    const ops = [];
    handler = (req, res, body) => {
      ops.push({ method: req.method, url: req.url, body });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'm-new', ...body }));
    };
    await api.createMaterial({
      code: 'MAT-0', name: 'Cero', description: '', polymer_type: 'PP', category: 'raw_material',
      unit: 'kg', color: '', minimum_stock: 0, current_stock: 0, unit_cost_usd: 0, unit_price_usd: 0, co2_factor_kg: 1.75, is_active: true,
    }, 'Admin');
    assert.equal(ops.length, 1);
    assert.equal(ops[0].body.current_stock, 0);
  });

  test('080 createMaterial con stock inicial > 0 inserta en 0 y registra count_adjustment_in en su bodega', async () => {
    const ops = [];
    handler = (req, res, body) => {
      ops.push({ method: req.method, url: req.url, body });
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/warehouses')) return res.end(JSON.stringify([{ id: 'w1', code: 'BOD-PM-ACOPIO' }, { id: 'w2', code: 'BOD-PM-PLANTA' }]));
      res.end(JSON.stringify({ id: 'm-con-stk', ...body }));
    };
    await api.createMaterial({
      code: 'MAT-500', name: 'Con Stock', description: '', polymer_type: 'HDPE', category: 'raw_material',
      unit: 'kg', color: '', minimum_stock: 0, current_stock: 500, unit_cost_usd: 0, unit_price_usd: 0, co2_factor_kg: 1.85, is_active: true,
    }, 'Admin');
    assert.equal(ops[0].body.current_stock, 0);
    assert.ok(ops[1].url.includes('/warehouses'));
    assert.equal(ops[2].body.movement_type, 'count_adjustment_in');
    assert.equal(ops[2].body.quantity, 500);
    assert.equal(ops[2].body.to_warehouse_id, 'w1');
  });

  test('081 updateMaterial nunca envía current_stock aunque venga en el objeto', async () => {
    let sent;
    handler = (req, res, body) => {
      sent = body;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'm1', ...body }));
    };
    await api.updateMaterial('m1', { minimum_stock: 100, current_stock: 999999 });
    assert.equal('current_stock' in sent, false);
    assert.equal(sent.minimum_stock, 100);
  });

  test('082 adjustStock sin diferencia (delta === 0) no ejecuta peticiones', async () => {
    let llamadas = 0;
    handler = (_req, res) => { llamadas++; res.end('[]'); };
    await api.adjustStock({ id: 'm1', category: 'raw_material', unit: 'kg', current_stock: 200 }, 200, 'Admin');
    assert.equal(llamadas, 0);
  });

  test('083 adjustStock negativo rechaza descuento si ninguna bodega alcanza a cubrir la baja', async () => {
    handler = (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify([{ warehouse_id: 'w1', quantity: 50 }]));
    };
    await assert.rejects(
      () => api.adjustStock({ id: 'm1', category: 'raw_material', unit: 'kg', current_stock: 150 }, 50, 'Admin'),
      /supera lo que hay en una sola bodega/
    );
  });

  test('084 createBatch ante 23505 por reintento del mismo usuario/peso reutiliza el lote sin duplicar', async () => {
    const postBatches = [], postMovs = [];
    handler = (req, res, body) => {
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/batches') && req.method === 'POST') {
        postBatches.push(body);
        res.statusCode = 409;
        return res.end(JSON.stringify({ code: '23505', message: 'duplicate key batch_number' }));
      }
      if (req.url.includes('/batches') && req.method === 'GET') {
        return res.end(JSON.stringify({ id: 'l-existente', batch_number: 'LOTE-2026-0900', created_by: 'u-1', supplier_id: 'e1', initial_weight_kg: 2500, material_id: 'm1', warehouse_id: 'w1' }));
      }
      if (req.url.includes('/inventory_movements') && req.method === 'GET') {
        return res.end(JSON.stringify([{ id: 'mv-existe' }]));
      }
      if (req.url.includes('/inventory_movements') && req.method === 'POST') {
        postMovs.push(body);
        return res.end(JSON.stringify(body));
      }
      res.end('[]');
    };
    const b = await api.createBatch({ batch_number: 'LOTE-2026-0900', supplier_id: 'e1', initial_weight_kg: 2500 }, 'Op', 'u-1');
    assert.equal(b.id, 'l-existente');
    assert.equal(postBatches.length, 1);
    assert.equal(postMovs.length, 0);
  });

  test('085 createBatch ante 23505 de otro camión incrementa el correlativo automáticamente', async () => {
    const intentos = [];
    handler = (req, res, body) => {
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/batches') && req.method === 'POST') {
        intentos.push(body.batch_number);
        if (intentos.length === 1) {
          res.statusCode = 409;
          return res.end(JSON.stringify({ code: '23505', message: 'duplicate key batch_number' }));
        }
        return res.end(JSON.stringify({ id: 'l-901', ...body }));
      }
      if (req.url.includes('/batches') && req.method === 'GET') {
        return res.end(JSON.stringify({ id: 'otro', created_by: 'otro-usuario', supplier_id: 'e2', initial_weight_kg: 3000 }));
      }
      if (req.url.includes('/inventory_movements') && req.method === 'GET') return res.end('[]');
      if (req.url.includes('/inventory_movements') && req.method === 'POST') return res.end(JSON.stringify({ id: 'mv-901', ...body }));
      res.end('[]');
    };
    const b = await api.createBatch({ batch_number: 'LOTE-2026-0900', supplier_id: 'e1', material_id: 'm1', warehouse_id: 'w1', initial_weight_kg: 2500 }, 'Op', 'u-1');
    assert.deepEqual(intentos, ['LOTE-2026-0900', 'LOTE-2026-0901']);
    assert.equal(b.id, 'l-901');
  });

  test('086 getStakeholders consulta el RPC /rest/v1/rpc/empresas', async () => {
    let urlVisto = '';
    handler = (req, res) => {
      urlVisto = req.url;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify([{ id: 'e1', name: 'AquaChile S.A.' }]));
    };
    const emps = await api.getStakeholders();
    assert.match(urlVisto, /\/rest\/v1\/rpc\/empresas/);
    assert.equal(emps[0].name, 'AquaChile S.A.');
  });

  test('087 recordMovements envía arreglo completo para inserción atómica', async () => {
    let payload;
    handler = (_req, res, body) => {
      payload = body;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    };
    const out = await api.recordMovements([{ movement_number: 'PRC-1' }, { movement_number: 'PRD-1' }]);
    assert.equal(Array.isArray(payload), true);
    assert.equal(out.length, 2);
  });

  test('088 error HTTP 403 RLS de PostgREST lanza ErrorApp traducido al español', async () => {
    handler = (_req, res) => {
      res.statusCode = 403;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ code: '42501', message: 'new row violates row-level security policy' }));
    };
    await assert.rejects(() => api.updateProfile('u1', { role: 'admin' }), /No tienes permiso para hacer esto/);
  });
});

test.describe('SQL y código fuente — integridad de esquema, seguridad y cero QR residual', () => {
  const leerSql = f => fs.readFileSync(path.join(REPO, 'supabase', f), 'utf8');
  const reg = loadTs('src/logica/reglas.ts');

  test('089 existen los 8 scripts SQL activos esperados', () => {
    for (const f of ['001_esquema.sql', '002_datos_ejemplo.sql', '003_usuarios_y_permisos.sql', '004_reglas_en_la_base.sql', '007_indices.sql', '008_contactos_solo_admin.sql', '009_quitar_qr.sql', '010_ajustes_auditoria.sql']) {
      assert.equal(fs.existsSync(path.join(REPO, 'supabase', f)), true, f);
    }
  });

  test('090 009_quitar_qr.sql elimina qr_verification_code y actualiza check_certificate_datos sin campo QR', () => {
    const sql = leerSql('009_quitar_qr.sql');
    assert.match(sql, /DROP COLUMN IF EXISTS qr_verification_code/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.check_certificate_datos\(\)/i);
    assert.match(sql, /NEW\.certificate_code/);
    const fnBody = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION'));
    assert.equal(/NEW\.qr_verification_code/.test(fnBody), false);
  });

  test('091 tope_camion() en 004_reglas_en_la_base.sql coincide exactamente con TOPE_CAMION en frontend', () => {
    const sql = leerSql('004_reglas_en_la_base.sql');
    const m = /CREATE OR REPLACE FUNCTION public\.tope_camion\(\)[\s\S]*?SELECT (\d+)::NUMERIC/i.exec(sql);
    assert.ok(m);
    assert.equal(Number(m[1]), reg.TOPE_CAMION);
  });

  test('092 marcador [ANULADO] coincide entre SQL 004 y frontend loteAnulado()', () => {
    const sql = leerSql('004_reglas_en_la_base.sql');
    assert.ok(sql.includes("notes = '[ANULADO] '"));
    assert.equal(reg.loteAnulado({ notes: '[ANULADO] test' }), true);
  });

  test('093 004_reglas_en_la_base.sql usa FOR UPDATE en ajustes para bloquear doble anulación concurrente', () => {
    const sql = leerSql('004_reglas_en_la_base.sql');
    assert.match(sql, /SELECT \* INTO orig FROM public\.inventory_movements WHERE movement_number = r\.num FOR UPDATE/i);
  });

  test('094 004_reglas_en_la_base.sql protege current_stock con pg_trigger_depth() = 1 y prohíbe DELETE en certificados/lotes', () => {
    const sql = leerSql('004_reglas_en_la_base.sql');
    assert.match(sql, /pg_trigger_depth\(\) = 1/);
    assert.match(sql, /DROP POLICY IF EXISTS batches_delete/i);
    assert.match(sql, /CREATE POLICY certs_select[\s\S]*FOR SELECT/i);
    assert.match(sql, /CREATE POLICY certs_insert[\s\S]*FOR INSERT/i);
  });

  test('095 008_contactos_solo_admin.sql oculta correo/teléfono/dirección a operario en stakeholders', () => {
    const sql = leerSql('008_contactos_solo_admin.sql');
    assert.match(sql, /REVOKE SELECT ON public\.stakeholders FROM anon, authenticated/i);
    assert.match(sql, /CASE WHEN public\.is_admin\(\) THEN contact_email END/i);
    assert.match(sql, /CASE WHEN public\.is_admin\(\) THEN contact_phone END/i);
    assert.match(sql, /CASE WHEN public\.is_admin\(\) THEN address END/i);
  });

  test('096 003_usuarios_y_permisos.sql habilita RLS en todas las tablas y oculta pin_hash', () => {
    const sql = leerSql('003_usuarios_y_permisos.sql');
    assert.match(sql, /REVOKE ALL ON public\.profiles FROM anon, authenticated/i);
    assert.equal(/GRANT SELECT\s*\([^)]*pin_hash/i.test(sql), false);
    assert.match(sql, /GRANT SELECT \(id, full_name, email, role, is_active/i);
  });

  test('097 007_indices.sql + 004_reglas_en_la_base.sql cubren los 12 índices esperados de kardex, lotes, stock y certificados', () => {
    const indices007 = leerSql('007_indices.sql').match(/CREATE INDEX IF NOT EXISTS \w+/g) || [];
    const unique004 = leerSql('004_reglas_en_la_base.sql').match(/CREATE UNIQUE INDEX IF NOT EXISTS \w+/g) || [];
    assert.equal(indices007.length, 11);
    assert.equal(unique004.length, 1);
    assert.equal(indices007.length + unique004.length, 12);
  });

  test('098 src/ no contiene referencias residuales a qr_verification_code, qrimg, qrcode ni persistencia de greenspot_cuentas', () => {
    const archivos = scanSrc(path.join(REPO, 'src'));
    for (const f of archivos) {
      const txt = fs.readFileSync(f, 'utf8');
      assert.equal(/qr_verification_code|qrimg|\bfrom 'qrcode'|require\('qrcode'\)/.test(txt), false, f);
      assert.equal(/localStorage\.setItem\(['"]greenspot_cuentas['"]/.test(txt), false, f);
    }
  });

  test('099 package.json no declara qrcode ni xlsx y usa versiones saneadas', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    assert.equal(Boolean(pkg.dependencies?.qrcode), false);
    assert.equal(Boolean(pkg.dependencies?.xlsx), false);
    assert.equal(Boolean(pkg.dependencies?.['read-excel-file']), true);
    assert.equal(Boolean(pkg.dependencies?.['write-excel-file']), true);
  });

  test('099b 010_ajustes_auditoria.sql implementa NULL ambiental, anular_certificado, merma lote y FOR UPDATE en bodega', () => {
    const sql = leerSql('010_ajustes_auditoria.sql');
    assert.match(sql, /ALTER COLUMN water_saved_liters DROP NOT NULL/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.anular_certificado/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.aplicar_merma_lote/i);
    assert.match(sql, /total_kg_valorized > lote\.current_weight_kg/i);
    assert.match(sql, /PERFORM 1 FROM public\.warehouses WHERE id = NEW\.to_warehouse_id FOR UPDATE/i);
  });

  test('100 README.md y archivos de entrada index.html / main.tsx existen', () => {
    assert.equal(fs.existsSync(path.join(REPO, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(REPO, 'src', 'main.tsx')), true);
    assert.equal(fs.existsSync(path.join(REPO, 'README.md')), true);
  });
});
