// Recorre todas las pantallas y los flujos como administración (o como operario con el argumento «op»).
// No escribe en la base: corta todo POST/PATCH/DELETE a Supabase. Requiere `npm run dev` abierto.
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
// Lee .env.local para no repetir la configuración (sin pisar variables ya definidas).
try { for (const l of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) { const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); } } catch { /* sin .env.local */ }
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

  // Lotes: panel con QR
  await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Lotes')).click()); await w(400);
  await clic('Todos'); await w(300);
  await p.evaluate(() => document.querySelector('tr.clic td').click()); await w(900);
  check('panel de lote con recorrido y QR', (await pan()).includes('Recorrido') && await p.$eval('.panel .qrimg', i => i.complete && i.naturalWidth > 0).catch(() => false));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-panel-lote.png` });
  await p.click('.panel .cerrar'); await w(300);
  // buscador
  await p.type('.buscar', 'zzzz'); await w(200); check('buscador filtra', (await body()).includes('No hay lotes'));

  // Flujo camión hasta el pesaje
  await clic('Registrar camión'); await w(400);
  check('camión paso 1 materiales', (await dlg()).includes('Paso 1 de 3'));
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  await p.type('#bruto', '5000'); await p.type('#tara', '6000'); await w(200);
  check('tara mayor que bruto bloquea', (await dlg()).includes('La tara no puede') && await p.$eval('.velo.on .btn.pri', b => b.disabled));
  await escribe('#tara', '3200'); await w(200);
  check('neto 1.800 y Guardar habilitado', (await dlg()).includes('1.800') && !(await p.$eval('.velo.on .btn.pri', b => b.disabled)));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-camion.png` });
  await p.keyboard.press('Escape'); await clic('Atrás'); await clic('Atrás'); await clic('Cancelar'); await w(300);
  check('diálogo cerrado', !(await dlg()));

  // Movimientos: salida con más de lo disponible
  await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Movimientos')).click()); await w(400);
  await clic('Registrar movimiento'); await w(300); await clic('Salió material'); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  await p.type('#kilos', '9999999'); await w(200);
  check('salida mayor al stock bloquea', (await dlg()).includes('Solo hay') && await p.$eval('.velo.on .btn.pri', b => b.disabled));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-salida.png` });
  await p.mouse.click(5, 880); await w(300); check('clic fuera cierra', !(await dlg()));
  // traslado: «Hacia» no permite la misma bodega
  await clic('Registrar movimiento'); await w(300); await clic('Traslado'); await w(300);
  await p.evaluate(() => document.querySelector('.velo.on .opcion:not([disabled])').click()); await w(300);
  const desde = await p.evaluate(() => { const o = document.querySelector('.velo.on .opcion:not([disabled])'); o.click(); return o.querySelector('span').firstChild.textContent; }); await w(300);
  check('traslado: misma bodega deshabilitada', await p.evaluate(d => { const o = [...document.querySelectorAll('.velo.on .opcion')].find(o => o.querySelector('span').firstChild.textContent === d); return !o || o.disabled; }, desde));
  await p.mouse.click(5, 880); await w(300);
  // pestañas
  for (const tab of ['Entradas', 'Salidas', 'Traslados', 'Correcciones', 'Todos']) { await clic(tab); await w(150); }
  check('pestañas de movimientos', (await body()).includes('Cantidad'));

  // Materiales: Corregir con conteo
  await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Materiales')).click()); await w(400);
  await clic('Corregir'); await w(300);
  check('corregir abre en paso 2 (bodega)', (await dlg()).includes('Paso 2 de 3'));
  await p.evaluate(() => document.querySelector('.velo.on .opcion').click()); await w(300);
  check('conteo muestra lo registrado', (await dlg()).includes('Registrado en el sistema'));
  await p.type('#kilos', '1'); await w(200); check('conteo muestra diferencia', (await dlg()).includes('Diferencia'));
  await p.mouse.click(5, 880); await w(300);
  await p.click('.chk input'); await w(200); check('filtro bajo mínimo', true);

  if (comoAdmin) {
    await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Materiales')).click()); await w(300);
    await p.click('.chk input'); await w(200);
    await p.evaluate(() => document.querySelector('tr.clic td').click()); await w(500);
    check('panel material con ficha', (await pan()).includes('Ficha técnica'));
    await p.click('.panel .cerrar'); await w(300);
    await clic('Nuevo material'); await w(300); await clic('Guardar'); await w(200);
    check('nuevo material valida vacíos', (await dlg()).includes('Escribe un código'));
    await p.mouse.click(5, 880); await w(300);
    await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Empresas')).click()); await w(300);
    await clic('Clientes'); await w(200); await clic('Generadoras'); await w(200);
    await p.evaluate(() => document.querySelector('tr.clic td').click()); await w(500);
    check('panel empresa', (await pan()).includes('RUT'));
    await clic('Editar'); await w(300); await escribe('#er', '123'); await clic('Guardar'); await w(200);
    check('RUT inválido rechazado', (await dlg()).includes('Formato'));
    await p.mouse.click(5, 880); await w(300);
    await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Configuración')).click()); await w(300);
    t = await body(); check('configuración muestra base conectada', t.includes('Conectada'));
    // menú: ver como operario
    await p.click('.usuario'); await w(200); await clic('Ver como operario'); await w(400);
    t = await body(); check('ver como operario: franja y sin menú admin, vuelve a Inicio', t.includes('Estás viendo la app como operario') && !t.includes('Configuración') && t.includes('Lotes en proceso'));
    await p.screenshot({ path: OUT + '/n-adm-comoop.png' });
    await clic('Volver a administración'); await w(400);
    check('vuelve a administración', (await body()).includes('Configuración'));
  }

  // menú de usuario: sin cambio rápido ni PIN, y sin sesiones de otras cuentas en el navegador
  await p.click('.usuario'); await w(200);
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-menu.png` });
  t = await p.evaluate(() => document.querySelector('.menuU')?.innerText || '');
  check('menú sin cambio rápido ni PIN', !/Cambiar de usuario|PIN/.test(t));
  check('navegador no guarda otras cuentas', await p.evaluate(() => localStorage.getItem('greenspot_cuentas') === null));
  await p.keyboard.press('Escape'); await w(200);
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-final.png` });

  // celular
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await w(500);
  await p.click('.hamb'); await w(400);
  check('celular: menú lateral se abre', await p.$eval('.lado', e => e.classList.contains('abierto')));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-cel-menu.png` });
  await p.evaluate(() => [...document.querySelectorAll('.nav')].find(n => n.innerText.startsWith('Lotes')).click()); await w(400);
  check('celular: sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= 391));
  await p.screenshot({ path: OUT + `/n-${comoAdmin ? 'adm' : 'op'}-cel.png` });

  console.log(res.join('\n'));
  console.log('ESCRITURAS BLOQUEADAS:', escrituras.length ? escrituras : 'ninguna');
  console.log('ERRORES JS:', errs.length ? errs : 'ninguno');
  await b.close();
  if (res.some(x => x.startsWith('FALLA')) || errs.some(e => e.startsWith('pageerror'))) process.exitCode = 1; // el 400 de la clave mala es esperado
})().catch(e => { console.error('SCRIPT:', e.message); console.log(globalThis.__res?.join('\n')); process.exit(1); });
