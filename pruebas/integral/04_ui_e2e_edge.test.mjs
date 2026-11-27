import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildBrowserBundle, crearDatosBase, makeWorkDir } from './helper.mjs';

const EDGE_EXE = [
  process.env.CHROMIUM,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean).find(p => fs.existsSync(p));

if (!EDGE_EXE) throw new Error('No se encontró navegador Chromium/Edge para pruebas E2E (define CHROMIUM)');

function jwtFor(u) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;
}

function startAppAndMockServer() {
  let state = crearDatosBase();
  // Hacer que Nave Extrusión supere el 90% en Inicio para probar también esa alerta visualmente.
  state.stock.find(s => s.material_id === 'm3' && s.warehouse_id === 'w2').quantity = 370000;
  state.mat.find(m => m.id === 'm3').current_stock = 370000;

  let seq = 900;
  let forceNextWriteError = null;
  const authUsers = {
    'admin@greenspot.cl': { id: 'u-adm', email: 'admin@greenspot.cl', pass: 'Admin123!', role: 'admin' },
    'operario@greenspot.cl': { id: 'u-op', email: 'operario@greenspot.cl', pass: 'Oper123!', role: 'operator' },
    'inactivo@greenspot.cl': { id: 'u-off', email: 'inactivo@greenspot.cl', pass: 'Off123!', role: 'operator' },
  };
  state.usuarios.push({ id: 'u-off', full_name: 'Cuenta Desactivada', email: 'inactivo@greenspot.cl', role: 'operator', is_active: false, last_seen_at: null });
  const capturedWrites = [];

  const recalcMaterialStock = (matId) => {
    const m = state.mat.find(x => x.id === matId);
    if (m) m.current_stock = state.stock.filter(s => s.material_id === matId).reduce((a, s) => a + Number(s.quantity), 0);
  };

  const applyMovToStock = (mv) => {
    if (['dispatch', 'production_intake', 'waste_adjustment', 'internal_transfer'].includes(mv.movement_type) && mv.from_warehouse_id) {
      const row = state.stock.find(s => s.material_id === mv.material_id && s.warehouse_id === mv.from_warehouse_id);
      if (!row || Number(row.quantity) < Number(mv.quantity)) return 'Stock insuficiente en bodega';
      row.quantity = Number(row.quantity) - Number(mv.quantity);
    }
    if (['reception', 'production_output', 'internal_transfer', 'count_adjustment_in'].includes(mv.movement_type) && mv.to_warehouse_id) {
      let row = state.stock.find(s => s.material_id === mv.material_id && s.warehouse_id === mv.to_warehouse_id);
      if (!row) { row = { material_id: mv.material_id, warehouse_id: mv.to_warehouse_id, quantity: 0 }; state.stock.push(row); }
      row.quantity = Number(row.quantity) + Number(mv.quantity);
    }
    recalcMaterialStock(mv.material_id);

    const an = /^Anula (\S+)$/.exec(mv.reference_doc || '');
    if (an) {
      const orig = state.mov.find(x => x.movement_number === an[1]);
      if (orig?.movement_type === 'reception' && orig.batch_id) {
        const b = state.lotes.find(l => l.id === orig.batch_id);
        if (b) { b.current_weight_kg = 0; b.notes = `[ANULADO] ${mv.notes || ''}`; }
      }
    }
    const co = /^Corrige (\S+)$/.exec(mv.reference_doc || '');
    if (co) {
      const orig = state.mov.find(x => x.movement_number === co[1]);
      if (orig?.movement_type === 'reception' && orig.batch_id) {
        const b = state.lotes.find(l => l.id === orig.batch_id);
        if (b) {
          const same = (mv.from_warehouse_id || null) === (orig.from_warehouse_id || null) && (mv.to_warehouse_id || null) === (orig.to_warehouse_id || null);
          const dif = same ? Number(mv.quantity) : -Number(mv.quantity);
          b.initial_weight_kg = Number(b.initial_weight_kg) + dif;
          b.current_weight_kg = Math.max(0, Number(b.current_weight_kg) + dif);
        }
      }
    }
    return null;
  };

  let staticDir = '';
  const server = http.createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

    const u = new URL(req.url, 'http://127.0.0.1');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const body = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : null;

      // Archivos estáticos SPA
      if (!u.pathname.startsWith('/auth/') && !u.pathname.startsWith('/rest/')) {
        let p = u.pathname === '/' ? '/index.html' : u.pathname;
        const fp = path.join(staticDir, p.replace(/^\//, ''));
        if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
        const ext = path.extname(fp);
        res.setHeader('content-type', ext === '.js' ? 'application/javascript; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
        return res.end(fs.readFileSync(fp));
      }

      res.setHeader('content-type', 'application/json; charset=utf-8');
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      let caller = authUsers['admin@greenspot.cl'];
      if (token.includes('.')) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
          caller = Object.values(authUsers).find(x => x.id === payload.sub) || caller;
        } catch { /* fallback */ }
      }
      const callerPerfil = state.usuarios.find(x => x.id === caller.id);
      const isSingle = (req.headers.accept || '').includes('vnd.pgrst.object+json');
      const sendData = (rows) => {
        if (isSingle) {
          const one = Array.isArray(rows) ? rows[0] : rows;
          if (!one) { res.statusCode = 406; return res.end(JSON.stringify({ code: 'PGRST116', message: 'not found' })); }
          return res.end(JSON.stringify(one));
        }
        res.end(JSON.stringify(Array.isArray(rows) ? rows : [rows]));
      };

      // Auth
      if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
        const usr = authUsers[(body?.email || '').toLowerCase()];
        if (!usr || usr.pass !== body?.password) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' }));
        }
        const tok = jwtFor(usr);
        return res.end(JSON.stringify({
          access_token: tok, token_type: 'bearer', expires_in: 3600, refresh_token: 'rt-' + usr.id,
          user: { id: usr.id, email: usr.email, aud: 'authenticated', role: 'authenticated' },
        }));
      }
      if (u.pathname === '/auth/v1/user') return res.end(JSON.stringify({ id: caller.id, email: caller.email, aud: 'authenticated' }));
      if (u.pathname === '/auth/v1/logout') { res.statusCode = 204; return res.end(); }

      // Errores inyectados en escrituras
      if (req.method !== 'GET' && forceNextWriteError) {
        const err = forceNextWriteError; forceNextWriteError = null;
        res.statusCode = err.status || 403;
        return res.end(JSON.stringify({ code: err.code || '42501', message: err.message || 'row-level security' }));
      }

      const tbl = u.pathname.replace('/rest/v1/', '');
      const eq = k => { const v = u.searchParams.get(k); return v?.startsWith('eq.') ? v.slice(3) : null; };

      if (tbl === 'rpc/empresas' && (req.method === 'GET' || req.method === 'POST')) {
        const isAdm = callerPerfil?.role === 'admin';
        return sendData(state.emp.map(e => isAdm ? e : { ...e, contact_email: '', contact_phone: '', address: '' }));
      }

      if (req.method === 'GET') {
        if (tbl === 'profiles') {
          let r = state.usuarios;
          if (eq('id')) r = r.filter(x => x.id === eq('id'));
          return sendData(r);
        }
        if (tbl === 'warehouses') return sendData(state.bod);
        if (tbl === 'materials_and_products') return sendData(state.mat);
        if (tbl === 'inventory_stock') {
          let r = state.stock;
          if (eq('material_id')) r = r.filter(x => x.material_id === eq('material_id'));
          return sendData(r);
        }
        if (tbl === 'batches') {
          let r = state.lotes.map(l => ({
            ...l,
            material: state.mat.find(m => m.id === l.material_id),
            supplier: state.emp.find(e => e.id === l.supplier_id),
            warehouse: state.bod.find(w => w.id === l.warehouse_id),
          }));
          if (eq('batch_number')) r = r.filter(x => x.batch_number === eq('batch_number'));
          return sendData(r);
        }
        if (tbl === 'inventory_movements') {
          let r = state.mov.map(m => ({
            ...m,
            material: state.mat.find(x => x.id === m.material_id),
            batch: m.batch_id ? state.lotes.find(x => x.id === m.batch_id) : null,
            from_warehouse: m.from_warehouse_id ? state.bod.find(x => x.id === m.from_warehouse_id) : null,
            to_warehouse: m.to_warehouse_id ? state.bod.find(x => x.id === m.to_warehouse_id) : null,
          }));
          if (eq('batch_id')) r = r.filter(x => x.batch_id === eq('batch_id'));
          if (eq('movement_type')) r = r.filter(x => x.movement_type === eq('movement_type'));
          return sendData(r);
        }
        if (tbl === 'valorization_certificates') {
          if (callerPerfil?.role !== 'admin') return sendData([]);
          return sendData(state.cert.map(c => ({
            ...c,
            stakeholder: state.emp.find(e => e.id === c.stakeholder_id),
            batch: c.batch_id ? state.lotes.find(l => l.id === c.batch_id) : null,
          })));
        }
        return sendData([]);
      }

      capturedWrites.push({ method: req.method, tbl, body, caller: caller.id });

      if (tbl === 'batches' && req.method === 'POST') {
        const nb = { id: 'l-' + (++seq), created_by: caller.id, ...body };
        state.lotes.unshift(nb);
        return sendData(nb);
      }
      if (tbl === 'batches' && req.method === 'PATCH') {
        const id = eq('id'), b = state.lotes.find(x => x.id === id);
        if (b) Object.assign(b, body);
        return sendData(b || {});
      }
      if (tbl === 'inventory_movements' && req.method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        const inserted = [];
        for (const it of items) {
          const mv = { id: 'mv-' + (++seq), created_by: caller.id, operator_name: callerPerfil?.full_name || 'User', ...it };
          const err = applyMovToStock(mv);
          if (err) { res.statusCode = 400; return res.end(JSON.stringify({ code: 'P0001', message: err })); }
          state.mov.unshift(mv);
          inserted.push(mv);
        }
        return sendData(Array.isArray(body) ? inserted : inserted[0]);
      }
      if (tbl === 'stakeholders' && req.method === 'POST') {
        const ne = { id: 'e-' + (++seq), ...body };
        state.emp.push(ne);
        return sendData(ne);
      }
      if (tbl === 'stakeholders' && req.method === 'PATCH') {
        const e = state.emp.find(x => x.id === eq('id'));
        if (e) Object.assign(e, body);
        return sendData(e || {});
      }
      if (tbl === 'materials_and_products' && req.method === 'POST') {
        const nm = { id: 'm-' + (++seq), ...body, current_stock: 0 };
        state.mat.push(nm);
        return sendData(nm);
      }
      if (tbl === 'materials_and_products' && req.method === 'PATCH') {
        const m = state.mat.find(x => x.id === eq('id'));
        if (m) Object.assign(m, body);
        return sendData(m || {});
      }
      if (tbl === 'valorization_certificates' && req.method === 'POST') {
        if (callerPerfil?.role !== 'admin') {
          res.statusCode = 403;
          return res.end(JSON.stringify({ code: '42501', message: 'row-level security' }));
        }
        const nc = { id: 'c-' + (++seq), ...body };
        state.cert.unshift(nc);
        return sendData(nc);
      }
      if (tbl === 'profiles' && req.method === 'PATCH') {
        const usr = state.usuarios.find(x => x.id === eq('id'));
        if (usr) Object.assign(usr, body);
        return sendData(usr || {});
      }
      sendData([]);
    });
  });

  return {
    server,
    setStaticDir: d => { staticDir = d; },
    setForceNextWriteError: e => { forceNextWriteError = e; },
    getState: () => state,
    getWrites: () => capturedWrites,
  };
}

class EdgeCdp {
  constructor(ws, proc, userDataDir) {
    this.ws = ws;
    this.proc = proc;
    this.userDataDir = userDataDir;
    this.id = 0;
    this.pending = new Map();
    this.pageErrors = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params?.exceptionDetails?.text || 'exception');
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('Eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  }
  async waitFor(fnStr, ms = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await this.eval(`Boolean((${fnStr})())`)) return;
      await new Promise(r => setTimeout(r, 80));
    }
    throw new Error('Timeout esperando: ' + fnStr);
  }
  async clickText(prefix, sel = 'button') {
    const ok = await this.eval(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.offsetParent !== null && x.innerText.trim().startsWith(${JSON.stringify(prefix)}));
      if (!el || el.disabled) return false;
      el.click();
      return true;
    })()`);
    assert.equal(ok, true, `No se pudo clicar "${prefix}" (${sel})`);
  }
  async typeKeyByKey(sel, text, clearFirst = true) {
    await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      el.focus();
      ${clearFirst ? 'el.select();' : ''}
    })()`);
    if (clearFirst) {
      await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', windowsVirtualKeyCode: 8 });
      await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', windowsVirtualKeyCode: 8 });
    }
    for (const ch of text) {
      await this.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
    }
  }
  async close() {
    try { this.ws.close(); } catch { /* ignore */ }
    try { this.proc.kill(); } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 250));
    try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function launchEdge(url) {
  const userDataDir = makeWorkDir('edge-profile-');
  const proc = spawn(EDGE_EXE, [
    '--headless=new', '--no-sandbox', '--disable-extensions', '--disable-gpu',
    '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const cdpBase = await new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error('Edge timeout: ' + out)), 10000);
    proc.stderr.on('data', d => {
      out += d.toString();
      const m = /DevTools listening on (ws:\/\/127\.0\.0\.1:(\d+)\/[^\s]+)/.exec(out);
      if (m) { clearTimeout(timer); resolve(`http://127.0.0.1:${m[2]}`); }
    });
  });
  const targets = await (await fetch(`${cdpBase}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('No se encontró pestaña page en Edge');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const client = new EdgeCdp(ws, proc, userDataDir);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  try {
    await Promise.race([
      client.send('Page.navigate', { url }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout en Page.navigate (bloqueo de red/sandbox)')), 4000)),
    ]);
  } catch (err) {
    await client.close();
    throw err;
  }
  return client;
}

test.describe('E2E Navegador Real (Microsoft Edge + bundle SPA real)', async () => {
  let mock, port, edge;
  const bodyText = () => edge.eval('document.body.innerText');
  const dlgText = () => edge.eval("document.querySelector('.velo.on .dlg')?.innerText || ''");
  const panelText = () => edge.eval("document.querySelector('.panel.on')?.innerText || ''");
  const nav = async (label) => {
    await edge.clickText(label, '.nav');
    await new Promise(r => setTimeout(r, 120));
  };

  test.before(async () => {
    mock = startAppAndMockServer();
    await new Promise(r => mock.server.listen(0, '127.0.0.1', r));
    port = mock.server.address().port;
    const webDir = buildBrowserBundle(`http://127.0.0.1:${port}`);
    mock.setStaticDir(webDir);
    edge = await launchEdge(`http://127.0.0.1:${port}/`);
    await edge.waitFor("() => document.body.innerText.includes('Ingresar')");
  });

  test.after(async () => {
    if (edge) await edge.close();
    if (mock?.server) await new Promise(r => mock.server.close(r));
  });

  test('101 Login rechaza contraseña incorrecta en español', async () => {
    await edge.typeKeyByKey('#correo', 'admin@greenspot.cl', true);
    await edge.typeKeyByKey('#clave', 'malaclave', true);
    await edge.clickText('Ingresar', 'button[type=submit]');
    await edge.waitFor("() => document.body.innerText.includes('Correo o contraseña incorrectos')");
    assert.match(await bodyText(), /Correo o contraseña incorrectos/);
  });

  test('102 Login válido como Administración carga Inicio y alertas operativas', async () => {
    await edge.typeKeyByKey('#clave', 'Admin123!', true);
    await edge.clickText('Ingresar', 'button[type=submit]');
    await edge.waitFor("() => document.body.innerText.includes('Requiere atención')");
    const txt = await bodyText();
    assert.match(txt, /Admin Uno · Administración/);
    assert.match(txt, /Nave de proceso al 93 % de su capacidad/);
    assert.match(txt, /Stock bajo el mínimo: Plumavit EPS/);
    assert.match(txt, /1 lote despachado sin certificado/);
  });

  test('103 Navegación completa por las 8 vistas sin undefined ni NaN', async () => {
    for (const [menu, heading] of [
      ['Lotes', 'Lotes'], ['Materiales', 'Materiales'], ['Movimientos', 'Movimientos'],
      ['Empresas', 'Empresas'], ['Certificados', 'Certificados'], ['Reportes', 'Reportes'], ['Configuración', 'Configuración'], ['Inicio', 'Inicio'],
    ]) {
      await nav(menu);
      const t = await bodyText();
      assert.ok(t.includes(heading), menu);
      assert.equal(/\bundefined\b|\bNaN\b/.test(t), false, `Texto roto en ${menu}`);
    }
  });

  test('104 REGRESIÓN Empresas: AquaChile excluye lote [ANULADO] (muestra 69.710 kg, no 1.958.598)', async () => {
    await nav('Empresas');
    const txt = await bodyText();
    assert.ok(txt.includes('69.710'), txt);
    assert.equal(txt.includes('1.958.598'), false);
    assert.equal(txt.includes('1.888.888'), false);
  });

  test('105 REGRESIÓN PanelEmpresa: AquaChile lista solo lotes vigentes (69.710 kg)', async () => {
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('AquaChile')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on')?.innerText.includes('Lotes entregados')");
    const pt = await panelText();
    assert.match(pt, /Lotes entregados · 69\.710 kg/);
    assert.ok(pt.includes('LOTE-2026-0812') && pt.includes('LOTE-2026-0820'));
    assert.equal(pt.includes('LOTE-2026-0830'), false);
    await edge.eval("document.querySelector('.panel .cerrar').click()");
  });

  test('106 Editar empresa valida formato de RUT y creación guarda nueva empresa', async () => {
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('Cermaq')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on button')?.innerText === 'Editar' || document.querySelector('.panel.on .pp button')");
    await edge.clickText('Editar', '.panel.on button');
    await edge.typeKeyByKey('#er', '123', true);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    assert.match(await dlgText(), /Formato: 76\.123\.456-7/);
    await edge.clickText('Cancelar', '.velo.on button');
    await edge.eval("document.querySelector('.panel .cerrar').click()");

    await edge.clickText('Nueva empresa');
    await edge.typeKeyByKey('#en', 'Pesquera Austral', false);
    await edge.typeKeyByKey('#er', '76.321.654-8', false);
    await edge.typeKeyByKey('#ec', 'Calbuco', false);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('Pesquera Austral')");
  });

  test('107 Materiales valida formulario nuevo material (vacío y código duplicado) y crea material válido', async () => {
    await nav('Materiales');
    await edge.clickText('Nuevo material');
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    assert.match(await dlgText(), /Escribe un código/);
    assert.match(await dlgText(), /Escribe el nombre/);
    await edge.typeKeyByKey('#mc', 'RAW-HDPE-BOY', true);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    assert.match(await dlgText(), /Ese código ya existe/);
    await edge.typeKeyByKey('#mc', 'RAW-PP-NEW', true);
    await edge.typeKeyByKey('#mn', 'Cabo PP Nuevo', true);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('Cabo PP Nuevo')");
  });

  test('108 Materiales: filtro "Solo bajo el mínimo" y edición de ficha técnica', async () => {
    await edge.eval("document.querySelector('.chk input').click()");
    const filtrado = await bodyText();
    assert.ok(filtrado.includes('Plumavit EPS') && !filtrado.includes('Pellet HDPE Negro'));
    await edge.eval("document.querySelector('.chk input').click()");
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('Pellet HDPE Negro')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on')?.innerText.includes('Ficha técnica')");
    await edge.typeKeyByKey('#min', '6000', true);
    await edge.clickText('Guardar cambios', '.panel.on .btn.pri');
    await edge.waitFor("() => document.body.innerText.includes('Cambios guardados')");
    await edge.eval("document.querySelector('.panel .cerrar').click()");
  });

  test('109 Lotes: filtros de pestañas, buscador, panel con rótulo sin QR y avance de etapa', async () => {
    await nav('Lotes');
    await edge.clickText('Todos', '.pestanas button');
    await edge.typeKeyByKey('.buscar', 'zzzz', false);
    assert.match(await bodyText(), /No hay lotes/);
    await edge.typeKeyByKey('.buscar', '', true);
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('LOTE-2026-0812')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on')?.innerText.includes('Rótulo')");
    const pt = await panelText();
    assert.ok(pt.includes('Recorrido') && pt.includes('Rótulo'));
    assert.equal(await edge.eval("Boolean(document.querySelector('.panel .qrimg'))"), false);
    await edge.clickText('Pasar a Molienda', '.panel.on .btn.pri');
    await edge.waitFor("() => document.body.innerText.includes('LOTE-2026-0812 pasó a Molienda')");
    await edge.eval("document.querySelector('.panel .cerrar').click()");
  });

  test('110 Camión: valida tara > bruto y tope 50.000 kg; coma decimal "1250,5" tecla a tecla funciona', async () => {
    await edge.clickText('Registrar camión');
    await edge.clickText('Boyas HDPE', '.velo.on .opcion');
    await edge.clickText('AquaChile S.A.', '.velo.on .opcion');
    await edge.typeKeyByKey('#bruto', '5000', false);
    await edge.typeKeyByKey('#tara', '6000', false);
    assert.match(await dlgText(), /La tara no puede ser mayor/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);

    await edge.typeKeyByKey('#bruto', '60000', true);
    await edge.typeKeyByKey('#tara', '1000', true);
    assert.match(await dlgText(), /supera los 50\.000/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);

    // Prueba específica EV3 C1: coma decimal tecla a tecla
    await edge.typeKeyByKey('#bruto', '1250,5', true);
    await edge.typeKeyByKey('#tara', '0,5', true);
    assert.equal(await edge.eval("document.querySelector('#bruto').value"), '1250,5');
    assert.match(await dlgText(), /1\.250 kg/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), false);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('LOTE-2026-0841')");
  });

  test('111 Flujo Salida: bloquea exceso de stock y guarda despacho válido', async () => {
    await nav('Movimientos');
    await edge.clickText('Registrar movimiento');
    await edge.clickText('Salió material', '.velo.on .opcion');
    await edge.clickText('Pellet HDPE Negro', '.velo.on .opcion');
    await edge.clickText('Silos', '.velo.on .opcion');
    await edge.clickText('Ecomaderas del Sur SpA', '.velo.on .opcion');
    await edge.typeKeyByKey('#kilos', '999999', false);
    assert.match(await dlgText(), /Solo hay 25\.000 kg disponibles/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);
    await edge.typeKeyByKey('#kilos', '500', true);
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('Quedan 24.500 kg')");
  });

  test('112 Flujo Traslado: misma bodega deshabilitada en destino', async () => {
    await edge.clickText('Registrar movimiento');
    await edge.clickText('Traslado', '.velo.on .opcion');
    await edge.clickText('Boyas HDPE', '.velo.on .opcion');
    await edge.clickText('Patio', '.velo.on .opcion');
    const deshabilitada = await edge.eval("[...document.querySelectorAll('.velo.on .opcion')].find(o => o.innerText.startsWith('Patio'))?.disabled");
    assert.equal(deshabilitada, true);
    await edge.eval("document.querySelector('.velo.on').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))");
    await edge.waitFor("() => !document.querySelector('.velo.on')");
  });

  test('113 Flujo Producción: bloquea salida > entrada, muestra merma 8% y guarda movimiento doble atómico', async () => {
    await edge.clickText('Registrar movimiento');
    await edge.clickText('Producción', '.velo.on .opcion');
    await edge.clickText('Boyas HDPE', '.velo.on .opcion');
    await edge.clickText('Patio', '.velo.on .opcion');
    await edge.typeKeyByKey('#kilos', '100', false);
    await edge.clickText('Siguiente', '.velo.on .btn.pri');
    await edge.clickText('Escama HDPE', '.velo.on .opcion');
    await edge.clickText('Nave de proceso', '.velo.on .opcion');
    await edge.typeKeyByKey('#obt', '200', false);
    assert.match(await dlgText(), /No puede salir más de lo que entró/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);

    await edge.typeKeyByKey('#obt', '92', true);
    assert.match(await dlgText(), /8 kg · 8 %/);
    const antes = mock.getWrites().length;
    await edge.clickText('Guardar', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('92 kg obtenidos, merma 8 kg')");
    const lastWrite = mock.getWrites()[mock.getWrites().length - 1];
    assert.ok(mock.getWrites().length > antes && Array.isArray(lastWrite.body) && lastWrite.body.length === 2);
  });

  test('114 Corrección de conteo desde Materiales abre en Paso 2 y calcula diferencia', async () => {
    await nav('Materiales');
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('Boyas HDPE')).querySelector('button').click()");
    assert.match(await dlgText(), /Paso 2 de 3/);
    await edge.clickText('Patio', '.velo.on .opcion');
    assert.match(await dlgText(), /Registrado en el sistema/);
    await edge.typeKeyByKey('#kilos', '1', false);
    assert.match(await dlgText(), /Diferencia/);
    await edge.clickText('Atrás', '.velo.on button');
    await edge.clickText('Cancelar', '.velo.on button');
  });

  test('115 Ajuste Corregir peso: misma cantidad y >50t bloquean; fallo de BD no cierra diálogo; anulación funciona', async () => {
    await nav('Movimientos');
    await edge.clickText('Entradas', '.pestanas button');
    await edge.eval("[...document.querySelectorAll('tr.clic:not(.anulada)')].find(r => r.innerText.includes('LOTE-2026-0841')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on')?.innerText.includes('Corregir peso')");
    await edge.clickText('Corregir peso', '.panel.on button');
    await edge.typeKeyByKey('#nueva', '1250', false);
    assert.match(await dlgText(), /Es la misma cantidad/);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);
    await edge.typeKeyByKey('#nueva', '50001', true);
    assert.match(await dlgText(), /supera los 50\.000 kg/);

    await edge.typeKeyByKey('#nueva', '1000', true);
    assert.match(await dlgText(), /Patio baja 250 kg/);
    mock.setForceNextWriteError({ status: 403, code: '42501', message: 'row-level security' });
    await edge.clickText('Guardar corrección', '.velo.on .btn.pri');
    await edge.waitFor("() => document.querySelector('.velo.on .dlg')?.innerText.includes('No tienes permiso')");
    assert.match(await dlgText(), /No tienes permiso para hacer esto/);
    await edge.clickText('Cancelar', '.velo.on button');

    await edge.clickText('Anular lote', '.panel.on button');
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);
    await edge.clickText('Otro', '.velo.on .opcion');
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), true);
    await edge.typeKeyByKey('#det', 'Prueba anulación E2E', false);
    assert.equal(await edge.eval("document.querySelector('.velo.on .btn.pri').disabled"), false);
    await edge.clickText('Anular', '.velo.on .btn.pri');
    await edge.waitFor("() => !document.querySelector('.velo.on') && document.body.innerText.includes('LOTE-2026-0841 anulado')");
    await edge.eval("document.querySelector('.panel .cerrar').click()");
  });

  test('116 Emitir certificado en UI (sin qr_verification_code) y abrir vista previa PDF', async () => {
    await nav('Certificados');
    await edge.clickText('Emitir certificado');
    await edge.clickText('AquaChile S.A.', '.velo.on .opcion');
    assert.match(await dlgText(), /LOTE-2026-0820/);
    await edge.clickText('Emitir', '.velo.on .btn.pri');
    await edge.waitFor("() => document.querySelector('.panel.on')?.innerText.includes('CERT-REP-2026-0095')");
    const lastCertWrite = [...mock.getWrites()].reverse().find(w => w.tbl === 'valorization_certificates');
    assert.equal('qr_verification_code' in lastCertWrite.body, false);
    assert.equal(await edge.eval("Boolean(document.querySelector('.panel .qrimg'))"), false);
    await edge.clickText('Descargar PDF', '.panel.on .btn.pri');
    await new Promise(r => setTimeout(r, 250));
    await edge.eval("document.querySelector('.panel .cerrar').click()");
  });

  test('117 Reportes: mes cerrado vacío muestra "Sin movimientos en el período." y exporta Excel', async () => {
    await nav('Reportes');
    const optVal = await edge.eval("document.querySelector('select option:nth-child(5)').value");
    await edge.eval(`(() => { const s=document.querySelector('select'); s.value=${JSON.stringify(optVal)}; s.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await edge.waitFor("() => document.body.innerText.includes('Sin movimientos en el período')");
    await edge.clickText('Descargar planilla');
    await edge.waitFor("() => document.body.innerText.includes('en Excel')");
  });

  test('118 Configuración: muestra BD conectada y listado completo coherente de usuarios', async () => {
    await nav('Configuración');
    const txt = await bodyText();
    assert.match(txt, /Conectada/);
    assert.ok(txt.includes('Admin Uno') && txt.includes('Administración'));
    assert.ok(txt.includes('Operario Uno') && txt.includes('Operario'));
    assert.ok(txt.includes('Cuenta Desactivada') && txt.includes('Desactivada'));
  });

  test('119 Empresas Clientes: calcula kilosComprados reales tras nuevo despacho', async () => {
    await nav('Empresas');
    await edge.clickText('Clientes', '.pestanas button');
    const txt = await bodyText();
    assert.ok(txt.includes('Ecomaderas del Sur SpA'));
    assert.ok(txt.includes('12.500'), txt);
  });

  test('120 Movimientos: todas las pestañas filtran y muestran badge Anulado correctamente', async () => {
    await nav('Movimientos');
    for (const tab of ['Entradas', 'Salidas', 'Traslados', 'Producción', 'Correcciones', 'Anulaciones', 'Todos']) {
      await edge.clickText(tab, '.pestanas button');
      assert.ok((await bodyText()).includes('Cantidad'), tab);
    }
    assert.match(await bodyText(), /Anulado/);
  });

  test('121 Ver como operario oculta menú admin, muestra franja y permite volver', async () => {
    await nav('Configuración');
    await edge.eval("document.querySelector('.usuario').click()");
    await edge.clickText('Ver como operario', '.menuU button');
    await edge.waitFor("() => document.body.innerText.includes('Estás viendo la app como operario')");
    const t = await bodyText();
    assert.equal(t.includes('Configuración'), false);
    assert.match(t, /Lotes en proceso/);
    await edge.clickText('Volver a administración', '.franja button');
    await edge.waitFor("() => document.body.innerText.includes('Configuración')");
  });

  test('122 Sesión real de Operario restringe vistas admin, bloquea ajustes ajenos y no guarda cuentas en localStorage', async () => {
    await edge.eval("document.querySelector('.usuario').click()");
    await edge.clickText('Cerrar sesión', '.menuU button');
    await edge.waitFor("() => document.body.innerText.includes('Ingresar')");
    await edge.typeKeyByKey('#correo', 'operario@greenspot.cl', true);
    await edge.typeKeyByKey('#clave', 'Oper123!', true);
    await edge.clickText('Ingresar', 'button[type=submit]');
    await edge.waitFor("() => document.body.innerText.includes('Lotes en proceso')");
    const t = await bodyText();
    assert.match(t, /Operario Uno · Operario/);
    assert.equal(t.includes('Configuración'), false);
    assert.equal(t.includes('Empresas'), false);

    await nav('Materiales');
    const matTxt = await bodyText();
    assert.equal(matTxt.includes('Nuevo material'), false);
    assert.equal(matTxt.includes('Corregir'), false);

    await nav('Movimientos');
    await edge.eval("[...document.querySelectorAll('tr.clic')].find(r => r.innerText.includes('Despacho a Ecomaderas')).click()");
    await edge.waitFor("() => document.querySelector('.panel.on') !== null");
    assert.match(await panelText(), /Solo puedes corregir tus propios registros del día/);
    await edge.eval("document.querySelector('.panel .cerrar').click()");

    await edge.eval("document.querySelector('.usuario').click()");
    const menuTxt = await edge.eval("document.querySelector('.menuU')?.innerText || ''");
    assert.equal(/Cambiar de usuario|PIN/.test(menuTxt), false);
    assert.equal(await edge.eval("localStorage.getItem('greenspot_cuentas')"), null);
    await edge.eval("document.querySelector('.usuario').click()");
  });

  test('123 Responsive móvil (390x844): menú hamburguesa abre y no hay overflow horizontal', async () => {
    await edge.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await new Promise(r => setTimeout(r, 150));
    await edge.eval("document.querySelector('.hamb').click()");
    assert.equal(await edge.eval("document.querySelector('.lado').classList.contains('abierto')"), true);
    await nav('Lotes');
    const scrollW = await edge.eval('document.documentElement.scrollWidth');
    assert.ok(scrollW <= 391, `scrollWidth=${scrollW}`);
  });

  test('124 Cuenta desactivada (is_active = false) queda bloqueada al iniciar sesión', async () => {
    await edge.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await edge.eval("document.querySelector('.usuario').click()");
    await edge.clickText('Cerrar sesión', '.menuU button');
    await edge.waitFor("() => document.body.innerText.includes('Ingresar')");
    await edge.typeKeyByKey('#correo', 'inactivo@greenspot.cl', true);
    await edge.typeKeyByKey('#clave', 'Off123!', true);
    await edge.clickText('Ingresar', 'button[type=submit]');
    await edge.waitFor("() => document.body.innerText.includes('cuenta está desactivada')");
    assert.match(await bodyText(), /Tu cuenta está desactivada\. Habla con la administración/);
    await edge.clickText('Salir', 'button');
    await edge.waitFor("() => document.body.innerText.includes('Ingresar')");
  });

  test('125 Cero excepciones JS no controladas durante todo el recorrido E2E', () => {
    assert.deepEqual(edge.pageErrors, []);
  });
});
