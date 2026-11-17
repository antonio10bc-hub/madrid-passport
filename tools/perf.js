// Auditoría de rendimiento: CPU ×4 más lenta (móvil medio) y cronometra el arranque y acciones de la UI.
// Uso: servir la carpeta en :8765 (python3 -m http.server 8765) y `node tools/perf.js`
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'], geolocation: { latitude: 40.4153, longitude: -3.7074 }, permissions: ['geolocation'] });
  await ctx.route(/wikipedia|wikimedia|posthog|supabase/, (r) => r.abort());
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    localStorage.setItem('mp.onboarded', '1');
    const now = Date.now(), v = {};
    ['prado', 'cristal', 'puerta-sol', 'plaza-mayor', 'debod', 'bernabeu', 'matadero', 'san-miguel', 'botin', 'lhardy'].forEach((id, i) => (v[id] = { lvl: (i % 2) + 1, t: now - i * 864e5, gpsAt: i % 2 ? now - i * 864e5 : undefined }));
    localStorage.setItem('mp.visits.v1', JSON.stringify(v));
    window.__long = 0; window.__longN = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__long += e.duration; window.__longN++; })).observe({ type: 'longtask', buffered: true });
  });
  const t0 = Date.now();
  await p.goto('http://localhost:8765/');
  await p.waitForSelector('.row'); const tRows = Date.now() - t0;
  await p.waitForFunction(() => window.__mpMap?.loaded()); const tMap = Date.now() - t0;
  await p.waitForTimeout(1500);
  const boot = await p.evaluate(() => ({ long: Math.round(window.__long), n: window.__longN, dom: document.getElementsByTagName('*').length }));
  console.log(`Arranque: lista ${tRows} ms · mapa ${tMap} ms · bloqueo ${boot.long} ms en ${boot.n} tareas · ${boot.dom} nodos DOM`);
  const act = async (label, fn) => {
    await p.evaluate(() => { window.__long = 0; });
    const a = await p.evaluate(() => performance.now());
    await fn();
    const f = await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now())))));
    await p.waitForTimeout(1200);
    const lt = await p.evaluate(() => window.__long);
    console.log(`${label.padEnd(34)} hasta frame: ${String(Math.round(f - a)).padStart(4)} ms · bloqueo: ${String(Math.round(lt)).padStart(4)} ms`);
  };
  const tap = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  await act('Abrir distrito (Centro)', () => tap('.row[data-id="centro"]'));
  await act('Marcar visitado', () => tap('#pl-teatro-real .chk[data-a="1"]'));
  await act('Ordenar por cercanía', () => tap('[data-sort="near"]'));
  await act('Abrir ficha', () => tap('#pl-plaza-mayor'));
  await act('Favorito', () => tap('.lst[data-l="f"]'));
  await act('Siguiente pendiente', () => tap('.next-row'));
  await act('Volver al distrito', () => tap('#back'));
  await act('Alejar mapa (agrupar pines)', () => p.evaluate(() => window.__mpMap.zoomTo(12, { duration: 0 })));
  await act('Volver a Madrid', () => tap('#back'));
  await act('Filtro Museos', () => tap('.chip[data-t="Museo"]'));
  await act('Quitar filtro', () => tap('.chip[data-t="Museo"]'));
  await act('Pestaña Logros', () => tap('[data-tab="badges"]'));
  await act('Pestaña Diario', () => tap('[data-tab="diary"]'));
  await act('Pestaña Mapa', () => tap('[data-tab="map"]'));
  await act('Mover mapa (pan)', () => p.evaluate(() => window.__mpMap.panBy([120, 80], { duration: 0 })));
  await act('Buscar «plaza»', async () => { await p.fill('#q', 'plaza'); await p.waitForTimeout(200); });
  const mem = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
  console.log(`Memoria JS: ${mem} MB · nodos DOM: ${await p.evaluate(() => document.getElementsByTagName('*').length)}`);
  await b.close();
})();
