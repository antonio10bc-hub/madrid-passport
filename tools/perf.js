// Auditoría de rendimiento: CPU ×4 más lenta (móvil medio) y cronometra acciones de la UI.
// Uso: servir la carpeta en :8765 y `node tools/perf.js`
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    const now = Date.now(), v = {};
    ['prado', 'cristal', 'puerta-sol', 'plaza-mayor', 'debod', 'retiro', 'bernabeu', 'matadero'].forEach((id, i) => (v[id] = { lvl: i % 2 + 1, t: now - i * 864e5, gpsAt: i % 2 ? now - i * 864e5 : undefined }));
    localStorage.setItem('mp.visits.v1', JSON.stringify(v));
    window.__long = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__long += e.duration))).observe({ type: 'longtask', buffered: true });
  });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Tiempo desde el tap hasta el siguiente frame pintado + tareas largas durante 1,2 s
  const act = async (label, fn) => {
    await p.evaluate(() => (window.__long = 0));
    const t0 = await p.evaluate(() => performance.now());
    await fn();
    const t1 = await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now())))));
    await p.waitForTimeout(1200);
    const lt = await p.evaluate(() => window.__long);
    console.log(`${label.padEnd(30)} hasta frame: ${String(Math.round(t1 - t0)).padStart(4)} ms · bloqueo total: ${String(Math.round(lt)).padStart(4)} ms`);
  };
  const tap = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  await act('Abrir distrito (Centro)', () => tap('.row[data-id="centro"]'));
  await act('Abrir ficha (Prado→Retiro)', () => tap('.place[data-open], .place'));
  await act('Volver a distrito', () => tap('#back'));
  await act('Volver a Madrid', () => tap('#back'));
  await act('Pestaña Diario', () => tap('.tabbar [data-tab="diary"]'));
  await act('Pestaña Logros', () => tap('.tabbar [data-tab="badges"]'));
  await act('Pestaña Mapa', () => tap('.tabbar [data-tab="map"]'));
  await act('Pestaña Logros (2ª vez)', () => tap('.tabbar [data-tab="badges"]'));
  await act('Pestaña Mapa (2ª vez)', () => tap('.tabbar [data-tab="map"]'));
  await act('Buscar "museo" (6 teclas)', async () => { await p.focus('#q'); await p.keyboard.type('museo ', { delay: 30 }); });
  await act('Marcar check', async () => { await tap('#q-clear'); await tap('.row[data-id="retiro"]'); await p.waitForTimeout(900); await tap('.chk[data-a="1"]:not(.on)'); });
  await b.close();
})();
