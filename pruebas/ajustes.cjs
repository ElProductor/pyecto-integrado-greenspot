// Prueba anular y corregir como administración (o como operario con el argumento «op»).
// No escribe en la base: corta todo POST/PATCH/DELETE a Supabase. Requiere `npm run dev` abierto.
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
// Lee .env.local para no repetir la configuración (sin pisar variables ya definidas).
try { for (const l of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); } } catch { /* sin .env.local */ }
const CORREO = process.env.GREENSPOT_CORREO, CLAVE = process.env.GREENSPOT_CLAVE;
if (!CORREO || !CLAVE) { console.error('Falta GREENSPOT_CORREO y GREENSPOT_CLAVE (cuenta de operario de prueba) en .env.local'); process.exit(1); }
const OUT = path.join(__dirname, 'capturas'), URL = process.env.GREENSPOT_URL || 'http://localhost:5173/';
fs.mkdirSync(OUT, { recursive: true });
const comoAdmin = process.argv[2] !== 'op';
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  const errs = [], escrituras = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.setRequestInterception(true);
  p.on('request', async r => {
    const u = r.url(), m = r.method();
    if (u.includes('/rest/v1/') && !['GET', 'HEAD', 'OPTIONS'].includes(m)) { escrituras.push(m + ' ' + u); return r.abort(); }
    if (comoAdmin && m === 'GET' && u.includes('/rest/v1/profiles') && u.includes('id=eq.')) {
      // Solo en este navegador: el perfil de Carlos llega como admin para dibujar las pantallas de administración.
      const res = await fetch(u, { headers: r.headers() }); const j = await res.json();
      const d = Array.isArray(j) ? j.map(x => ({ ...x, role: 'admin' })) : { ...j, role: 'admin' };
      return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) });
    }
    r.continue();
  });
  const res = globalThis.__res = [], check = (n, c) => res.push((c ? 'OK    ' : 'FALLA ') + n);
  const w = (ms = 900) => new Promise(r => setTimeout(r, ms));
  const body = () => p.evaluate(() => document.querySelector('.raiz, .ingreso, .centro')?.innerText || document.body.innerText);
  const clic = (t, sel = 'button') => p.evaluate((t, sel) => { const e = [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null && x.innerText.trim().startsWith(t)); if (e && !e.disabled) e.click(); return e ? (e.disabled ? 'off' : true) : false; }, t, sel);
  const escribe = async (sel, v) => { await p.click(sel, { clickCount: 3 }); await p.keyboard.press('Backspace'); await p.type(sel, v); };
  const dlg = () => p.evaluate(() => document.querySelector('.velo.on .dlg')?.innerText || '');
  const pan = () => p.evaluate(() => document.querySelector('.panel.on')?.innerText || '');

  await p.goto(URL, { waitUntil: 'networkidle0' }); await w();
  if ((await body()).includes('Ingresar')) {
    await p.type('#correo', CORREO); await p.type('#clave', 'malaclave');
    await p.click('button[type=submit]'); await p.waitForFunction(() => document.body.innerText.includes('incorrectos'), { timeout: 20000 }).catch(() => {});
    check('clave mala rechazada', (await body()).includes('incorrectos'));
    await escribe('#clave', CLAVE); await p.click('button[type=submit]'); await p.waitForSelector('.cuerpo h1', { timeout: 30000 }).catch(() => {}); await w(500);
  }
  let t = await body();
  check('entra y carga datos reales', t.includes('Lotes') && !t.includes('No se pudieron cargar'));
  check('rol esperado: ' + (comoAdmin ? 'admin' : 'operario'), comoAdmin ? t.includes('Administración') && t.includes('Configuración') : !t.includes('Configuración'));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-inicio.png` });

  for (const v of ['Lotes', 'Materiales', 'Movimientos', ...(comoAdmin ? ['Empresas', 'Certificados', 'Reportes', 'Configuración'] : [])]) {
    await p.evaluate(v => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith(v)).click(), v); await w(500);
    t = await body(); check('vista ' + v, t.includes(v) && !t.includes('undefined') && !t.includes('NaN'));
    await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-${v}.png` });
  }

  const ir = v => p.evaluate(v => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith(v)).click(), v);
  await ir('Movimientos'); await w(500);
  t = await body(); check('pestaña Producción existe', t.includes('Producción') && t.includes('Anulaciones'));
  await clic('Producción'); await w(300); t = await body(); check('pestaña Producción filtra', t.includes('Orden Trabajo') && !t.includes('Entrada\t'));
  // Toma la primera entrada de un lote vigente que se pueda ajustar (no depende de un lote fijo).
  await clic('Entradas'); await w(300);
  const n = await p.evaluate(() => document.querySelectorAll('tr.clic:not(.anulada)').length);
  let Q = 0, pt = '';
  for (let i = 0; i < n && !Q; i++) {
    const kg = await p.evaluate(i => { const r = document.querySelectorAll('tr.clic:not(.anulada)')[i]; if (r.innerText.includes('Corregido')) return 0; r.click(); return Number(r.cells[3].innerText.replace(/\D/g, '')); }, i);
    if (!kg) continue; await w(600); pt = await pan();
    if (comoAdmin ? pt.includes('Corregir peso') : pt.includes('Ver lote')) Q = kg;
  }
  const kgTxt = x => x.toLocaleString('es-CL') + ' kg';
  check('hay una entrada de lote vigente para probar', Q > 0);
  check('panel movimiento con datos', pt.includes(kgTxt(Q)) && pt.includes('Ver lote'));
  check(comoAdmin ? 'admin ve Corregir y Anular' : 'operario ve ajuste o el motivo', comoAdmin ? pt.includes('Corregir peso') && pt.includes('Anular lote') : pt.includes('Corregir peso') || pt.includes('administración') || pt.includes('certificado'));
  await p.screenshot({ path: OUT + `/a-${comoAdmin ? 'adm' : 'op'}-panel-mov.png` });
  if (comoAdmin && Q) {
    await clic('Corregir peso'); await w(400);
    let d = await dlg(); check('corregir abre con lo registrado', d.includes('Corregir peso') && d.includes('Motivo'));
    await p.type('#nueva', String(Q)); await w(200); d = await dlg();
    check('misma cantidad bloquea', d.includes('Es la misma cantidad') && await p.$eval('.velo.on .btn.pri', b => b.disabled));
    await escribe('#nueva', String(Q - 1)); await w(200); d = await dlg();
    check('efecto: baja 1 kg', d.includes('baja 1 kg') && !(await p.$eval('.velo.on .btn.pri', b => b.disabled)));
    await p.screenshot({ path: OUT + '/a-corregir.png' });
    await clic('Cancelar'); await w(300);
    await clic('Anular lote'); await w(400);
    d = await dlg(); check('anular sin motivo deshabilitado', await p.$eval('.velo.on .btn.pri', b => b.disabled));
    await clic('Otro', '.velo.on .opcion'); await w(200); check('Otro exige detalle', await p.$eval('.velo.on .btn.pri', b => b.disabled));
    await clic('Error de digitación', '.velo.on .opcion'); await w(200); d = await dlg();
    check('anular: baja todo lo registrado', d.includes('baja ' + kgTxt(Q)) && !(await p.$eval('.velo.on .btn.pri', b => b.disabled)));
    await p.screenshot({ path: OUT + '/a-anular.png' });
    await clic('Anular', '.velo.on .btn.pri'); await w(2500); d = await dlg();
    check('guardado bloqueado por la prueba: muestra error y no cierra', d.includes('Anular lote') && escrituras.length === 1);
    await clic('Cancelar'); await w(300);
    await clic('Ver lote'); await w(600); pt = await pan();
    check('panel lote ofrece Corregir peso / Anular lote', pt.includes('Corregir peso') && pt.includes('Anular lote'));
    await p.click('.panel .cerrar'); await w(300);
  }
  // tope del camión
  await ir('Lotes'); await w(300); await clic('Registrar camión'); await w(400);
  await p.evaluate(() => document.querySelector('.velo.on .opcion').click()); await w(300); await clic('Siguiente'); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion').click()); await w(300); await clic('Siguiente'); await w(300);
  if (await p.$('#bruto')) { await p.type('#bruto', '1900000'); await p.type('#tara', '11112'); await w(200); }
  let d = await dlg(); check('tope de 50.000 kg en camión', d.includes('no supera los 50.000') );
  await p.screenshot({ path: OUT + `/a-${comoAdmin ? 'adm' : 'op'}-tope.png` });
  console.log(res.join('\n')); console.log('ESCRITURAS INTENTADAS (bloqueadas):', escrituras); console.log('ERRORES JS:', errs);
  await b.close();
  if (res.some(x => x.startsWith('FALLA')) || errs.some(e => e.startsWith('pageerror'))) process.exitCode = 1; // el 400 de la clave mala es esperado
})();
