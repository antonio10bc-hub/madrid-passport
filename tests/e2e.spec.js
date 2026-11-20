// Flujos clave de Madrid Passport. Sin red externa: el mapa usa el estilo de respaldo y Wikipedia no responde.
const { test, expect } = require('@playwright/test');

const SOL = { latitude: 40.41694, longitude: -3.70361 };          // Puerta del Sol
test.beforeEach(async ({ context, page }) => {
  await context.route(/openfreemap|wikipedia|wikimedia|supabase|posthog/, (r) => r.abort());
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(SOL);
  // Sin onboarding salvo en su propio test (?ob=1)
  await context.addInitScript(() => { if (location.search.includes('ob=1')) { if (!sessionStorage.getItem('ob')) { sessionStorage.setItem('ob', '1'); localStorage.removeItem('mp.onboarded'); } } else localStorage.setItem('mp.onboarded', '1'); });
  await page.goto('./');
  await expect(page.locator('.row')).toHaveCount(21);
});

const openCentro = async (page) => {
  await page.locator('.row[data-id="centro"]').click();
  await expect(page.locator('#title')).toHaveText('Centro');
};
const markVisited = (page, id) => page.locator(`#pl-${id} .chk[data-a="1"]`).click();

test('onboarding: 5 pasos con continuar, puntitos, marcar imprescindibles y fin con ubicación; no vuelve a salir', async ({ page }) => {
  await page.goto('./?ob=1');
  const ob = page.locator('#onboard');
  await expect(ob).toBeVisible();
  await expect(ob.locator('.ob-dots i.on')).toHaveCount(1);
  for (let i = 0; i < 4; i++) { await page.locator('#ob-next').click(); await page.waitForTimeout(500); }
  await expect(page.locator('#ob-dots i').nth(4)).toHaveClass(/on/);
  await expect(ob).toContainText('consigue el doble check dorado');
  await expect(ob).toContainText('¿Ya has estado?');
  await expect(page.locator('#ob-next')).toHaveText('Activar ubicación y empezar');
  await ob.locator('[data-q="plaza-mayor"]').click();
  await ob.locator('[data-q="parque-retiro"]').click();
  await expect(page.locator('#ob-qn')).toHaveText('2 marcados · +20 pts');
  await page.locator('#ob-next').click();
  await expect(ob).toHaveCount(0);
  await expect(page.locator('.notif')).toContainText('Primer sello');
  const v = await page.evaluate(() => JSON.parse(localStorage.getItem('mp.visits.v1')));
  expect(v['plaza-mayor'].lvl).toBe(1);
  expect(v['parque-retiro'].lvl).toBe(1);
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.locator('#onboard')).toHaveCount(0);
});

test('onboarding: saltar y volver a verlo desde el Diario', async ({ page }) => {
  await page.goto('./?ob=1');
  await page.locator('#ob-skip').click();
  await expect(page.locator('#onboard')).toHaveCount(0);
  await page.locator('[data-tab="diary"]').click();
  await page.locator('#settings-btn').click();
  await page.locator('#ob-again').click();
  await expect(page.locator('#onboard')).toBeVisible();
});

test('portada: 21 distritos, progreso a 0 y leyenda del mapa de calor', async ({ page }) => {
  await expect(page.locator('#title')).toHaveText('Explora Madrid');
  await expect(page.locator('#ring-txt')).toHaveText('0%');
  await expect(page.locator('#heat-legend')).toBeVisible();
  await expect(page.locator('.d-label')).toHaveCount(21);
});

test('marcar un lugar como visitado suma progreso y se guarda al recargar', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await expect(page.locator('#toast')).toContainText('Marcado como visitado');
  await expect(page.locator('#pl-plaza-mayor .chk[data-a="1"]')).toHaveClass(/on/);
  await expect(page.locator('#ring-txt')).not.toHaveText('0%');
  await page.reload();
  await expect(page.locator('.row[data-id="centro"] .r-count')).toHaveText(/^1\//);
  // mapa de calor: la etiqueta del distrito muestra su %
  await expect(page.locator('.d-label', { hasText: 'Centro' }).locator('em')).toHaveText(/\d+%/);
});

test('quitar el check deja el lugar como pendiente', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await markVisited(page, 'plaza-mayor');
  await expect(page.locator('#pl-plaza-mayor .chk[data-a="1"]')).not.toHaveClass(/on/);
  await expect(page.locator('#ring-txt')).toHaveText('0%');
});

test('confirmar por GPS cerca del lugar: sello dorado y barrio pisado', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'puerta-sol');
  await page.locator('#pl-puerta-sol .chk[data-a="2"]').click();
  await expect(page.locator('.gps-stamp')).toBeVisible();
  await expect(page.locator('#pl-puerta-sol .chk[data-a="2"]')).toHaveClass(/on/);
  await expect(page.locator('.pin.v2[data-id="puerta-sol"]')).toHaveCount(1);
  await page.locator('[data-tab="diary"]').click();
  await expect(page.locator('#page-body')).toContainText('Puerta del Sol');
  await expect(page.locator('#page-body .pitem.static')).toContainText('Sol');      // barrio sellado por GPS
  await expect(page.locator('.pass-k .gold b')).toHaveText('2');                     // lugar + barrio con GPS
  await expect(page.locator('.cal-days button.sel.gp')).toHaveCount(1);              // hoy marcado en el calendario, con GPS
  await page.locator('.cal-days button.sel').click();                                 // volver a tocarlo lo deselecciona
  await expect(page.locator('.cal-list')).toHaveCount(0);
  await expect(page.locator('.cal-none')).toBeVisible();
});

test('al abrir un lugar se dibuja su área de GPS en el mapa', async ({ page }) => {
  await openCentro(page);
  await page.locator('#pl-plaza-mayor').click();
  await expect.poll(() => page.evaluate(async () => (await import('/js/app/map.js')).gpsAreaId())).toBe('plaza-mayor');
  await page.locator('#back').click();
  await expect.poll(() => page.evaluate(async () => (await import('/js/app/map.js')).gpsAreaId())).toBe('');
});

test('GPS lejos del lugar: avisa y no confirma', async ({ page, context }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await context.setGeolocation({ latitude: 40.48, longitude: -3.60 });
  await page.locator('#pl-plaza-mayor .chk[data-a="2"]').click();
  await expect(page.locator('#toast')).toContainText('acércate');
  await expect(page.locator('#pl-plaza-mayor .chk[data-a="2"]')).not.toHaveClass(/on/);
});

test('barrios del distrito: marcar uno a mano', async ({ page }) => {
  await openCentro(page);
  const n0 = +(await page.locator('#barrios-n').textContent()).split('/')[0];   // Sol puede estar ya sellado por el GPS de prueba
  const first = page.locator('.bchip.l0').first();
  await first.click();
  await expect(page.locator('.bchip.l1')).toHaveCount(1);
  await expect(page.locator('#barrios-n')).toHaveText(new RegExp(`^${n0 + 1}/`));
  await page.locator('.bchip.l1').click();                    // marcado a mano: se puede quitar
  await expect(page.locator('.bchip.l1')).toHaveCount(0);
});

test('logros: nivel arriba, puntos y progreso por tipo', async ({ page }) => {
  await page.locator('[data-tab="badges"]').click();
  const card = page.locator('#lvl-card');
  await expect(card).toContainText('Turista');
  await expect(card.locator('.lvl-pts')).toContainText(/^(0|5) /);                     // 5 si el GPS de prueba ya selló el barrio Sol
  await page.locator('[data-tab="map"]').click();
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');           // 10 (visita) + 5 (barrio) + 20 (logro «Primer sello»)
  await page.locator('[data-tab="badges"]').click();
  // 10 (visita) + 20 (logro «Primer sello») + 5 por cada barrio sellado (el de Plaza Mayor y, si el GPS ya lo pisó, Sol)
  await expect(card.locator('.lvl-pts')).toContainText(/^(35|40)/);
  await expect(page.locator('.tp-row[data-type="Plaza"] .tp-n')).toHaveText(/^1\//);
  await expect(page.locator('.pp.on')).toHaveCount(1);
  // tocar un tipo lleva al mapa filtrado
  await page.locator('.tp-row[data-type="Museo"]').click();
  await expect(page.locator('#page')).toBeHidden();
  await expect(page.locator('.chip.on[data-t="Museo"]')).toBeVisible();
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');
  // el chip elegido queda centrado en su fila
  const off = await page.locator('#type-chips').evaluate((row) => { const c = row.querySelector('.chip.on').getBoundingClientRect(), r = row.getBoundingClientRect(); return Math.abs((c.left + c.width / 2) - (r.left + r.width / 2)); });
  expect(off).toBeLessThan(4);
});

test('logros: los tres más difíciles van al final, los de GPS en dorado', async ({ page }) => {
  await page.locator('[data-tab="badges"]').click();
  const names = await page.locator('.pp strong').allTextContents();
  expect(names.slice(-3)).toEqual(['Gato de pura cepa', 'Huella dorada', 'Leyenda de Madrid']);
});

test('logro desbloqueado: aviso desde arriba que lleva a Logros', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  const n = page.locator('.notif.in');
  await expect(n).toContainText('Logro desbloqueado');
  await expect(n).toContainText('Primer sello');
  await n.click();
  await expect(page.locator('#page-title')).toHaveText('Logros');
  await expect(page.locator('.notif')).toHaveCount(0, { timeout: 2000 });
});

test('subir de nivel', async ({ page }) => {
  await openCentro(page);
  for (const id of ['plaza-mayor', 'san-miguel', 'puerta-sol']) await markVisited(page, id);
  await expect(page.locator('.notif').first()).toBeVisible();                 // aviso desde arriba
  await page.locator('[data-tab="badges"]').click();
  await expect(page.locator('#lvl-card')).toContainText('Forastero');
});

test('panel plegado: el buscador no puede recibir el foco', async ({ page }) => {
  await page.locator('#handle').click();                 // peek → plegado
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'min');
  await expect(page.locator('#sheet-body')).toHaveJSProperty('inert', true);
  await page.locator('#q').focus().catch(() => {});
  expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('q');
  await page.locator('#handle').click();                 // y se puede volver a abrir
  await expect(page.locator('#sheet-body')).toHaveJSProperty('inert', false);
});

test('tocar el asa (táctil) pliega y despliega sin abrir el teclado', async ({ page }) => {
  const tapHandle = async () => { const b = await page.locator('#handle').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  await page.waitForTimeout(600);                         // fin de la animación inicial del panel
  await tapHandle();
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'min');
  await page.waitForTimeout(500);
  await tapHandle();
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.activeElement?.id || '')).not.toBe('q');
});

test('favoritos y «quiero ir»: desde la ficha, filtros primeros y pines en el mapa', async ({ page }) => {
  const chips = page.locator('#type-chips .chip');
  await expect(chips.nth(0)).toHaveAttribute('data-t', '__fav');
  await expect(chips.nth(1)).toHaveAttribute('data-t', '__want');
  await openCentro(page);
  await page.locator('#pl-plaza-mayor').click();
  await page.locator('.lst[data-l="f"]').click();
  await expect(page.locator('.lst[data-l="f"]')).toHaveClass(/on/);
  await page.locator('#back').click();
  await page.locator('#pl-san-miguel').click();
  await page.locator('.lst[data-l="w"]').click();
  await page.locator('[data-tab="map"]').click();          // portada
  await page.locator('.chip[data-t="__fav"]').click();
  await expect(page.locator('.pitem')).toHaveCount(1);
  await expect(page.locator('.pitem')).toContainText('Plaza Mayor');
  await expect(page.locator('.pin[data-id="plaza-mayor"]')).toHaveCount(1);   // pin en el mapa
  await page.locator('.chip[data-t="__want"]').click();
  await expect(page.locator('.pitem')).toContainText('San Miguel');
  await page.reload();                                     // se guarda
  await expect(page.locator('.chip[data-t="__fav"] b')).toHaveText('1');
});

test('ficha: la foto no se recrea al pulsar favorito o el check', async ({ page }) => {
  await openCentro(page);
  await page.locator('#pl-plaza-mayor').click();
  await page.evaluate(() => (document.querySelector('.hero').dataset.mark = '1'));
  await page.locator('.lst[data-l="f"]').click();
  await page.locator('.pd-head .chk[data-a="1"]').click();
  await expect(page.locator('.hero')).toHaveAttribute('data-mark', '1');
});

test('ficha: metro más cercano con sus líneas y un solo «Cómo llegar»', async ({ page }) => {
  await openCentro(page);
  await page.locator('#pl-puerta-sol').click();
  await expect(page.locator('.info-row.metro')).toContainText('Sol');
  await expect(page.locator('.info-row.metro .mline')).toHaveCount(3);          // L1, L2, L3
  await expect(page.locator('.cta')).toHaveCount(1);
  await expect(page.locator('.cta[data-nav="walking"]')).toHaveAttribute('href', /travelmode=walking/);
});

test('portada: lugares pendientes cerca de ti', async ({ page }) => {
  await expect(page.locator('.near .ncard').first()).toBeVisible();          // geolocalización en Sol
  await expect(page.locator('.near .ncard').first()).toContainText('min a pie');
  await expect(page.locator('.near .ncard')).toHaveCount(6);
});

test('distrito: ordenar por cercanía y pendientes primero', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'puerta-sol');
  await page.locator('[data-sort="near"]').click();
  await expect(page.locator('.place').first()).toHaveAttribute('id', 'pl-puerta-sol');   // estás en Sol
  await page.locator('[data-sort="todo"]').click();
  await expect(page.locator('.place').first()).not.toHaveAttribute('id', 'pl-puerta-sol');  // visitado: al final
  await expect(page.locator('.zone')).toHaveCount(1);                       // sin cabeceras de zona (solo «Barrios»)
});

test('tocar un pin en el distrito abre directamente su ficha', async ({ page }) => {
  await openCentro(page);
  await page.evaluate(() => window.__mpMap.jumpTo({ zoom: 17, center: [-3.70738, 40.41546] }));   // Plaza Mayor, sin agrupar
  await page.locator('.pin[data-id="plaza-mayor"]').click();
  await expect(page.locator('.pd-head h2')).toHaveText('Plaza Mayor');
});

test('pin: un toque que se sale un poco del círculo (zona de toque ampliada) abre el lugar, no el distrito', async ({ page }) => {
  await openCentro(page);
  await page.evaluate(() => window.__mpMap.jumpTo({ zoom: 17, center: [-3.70738, 40.41475] }));   // pin en la mitad de arriba, sin el panel encima
  const b = await page.locator('.pin[data-id="plaza-mayor"]').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y - 7);                       // 7 px por encima del borde visible
  await expect(page.locator('.pd-head h2')).toHaveText('Plaza Mayor');
});

test('ficha: siguiente pendiente cerca', async ({ page }) => {
  await openCentro(page);
  await page.locator('#pl-plaza-mayor').click();
  const next = page.locator('.next-row');
  await expect(next).toBeVisible();
  const id = await next.getAttribute('data-next');
  await next.click();
  await expect(page.locator('.hero')).toHaveAttribute('data-for', id);
});

test('logros: comparativa con otros usuarios', async ({ page }) => {
  await page.route(/rpc\/visited_percentile/, (r) => r.fulfill({ json: { users: 10, below: 8 } }));
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await page.locator('[data-tab="badges"]').click();
  await expect(page.locator('.lvl-rank')).toContainText('80');
});

test('inicio de sesión: si el botón de Google no carga, sale el botón clásico', async ({ page, context }) => {
  await context.route(/accounts\.google\.com/, (r) => r.abort());
  await page.locator('[data-tab="diary"]').click();
  await expect(page.locator('#login')).toBeVisible();
  await expect(page.locator('#login')).toContainText('Google');
});

test('deshacer: marcar y desmarcar desde el aviso', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await page.locator('#toast button').click();
  await expect(page.locator('#pl-plaza-mayor .chk[data-a="1"]')).not.toHaveClass(/on/);
  await expect(page.locator('#ring-txt')).toHaveText('0%');
  await markVisited(page, 'plaza-mayor');
  await page.waitForTimeout(300);
  await markVisited(page, 'plaza-mayor');                  // desmarcar…
  await page.locator('#toast button').click();             // …y deshacer
  await expect(page.locator('#pl-plaza-mayor .chk[data-a="1"]')).toHaveClass(/on/);
});

test('pines agrupados: al alejar se juntan y al tocar el grupo se acerca', async ({ page }) => {
  await openCentro(page);
  await page.evaluate(() => window.__mpMap.jumpTo({ zoom: 12.5 }));
  await expect(page.locator('.cluster').first()).toBeVisible();
  const z0 = await page.evaluate(() => window.__mpMap.getZoom());
  await page.evaluate(() => { window.__minZ = 99; window.__mpMap.on('zoom', () => (window.__minZ = Math.min(window.__minZ, window.__mpMap.getZoom()))); });
  await page.locator('.cluster').first().click();
  await expect.poll(() => page.evaluate(() => window.__mpMap.getZoom())).toBeGreaterThan(z0);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__minZ)).toBeGreaterThanOrEqual(z0 - 0.01);   // sin alejarse antes de acercar
});

test('al pulsar un filtro: la fila no vuelve al principio, centra el chip y pliega el panel', async ({ page }) => {
  await page.waitForTimeout(1500);                          // que termine de arrancar (mapa y primera posición)
  const row = page.locator('#type-chips');
  await row.evaluate((el) => (el.scrollLeft = 300));
  await page.waitForTimeout(100);
  const x = await row.evaluate((el) => el.scrollLeft);
  expect(x).toBeGreaterThan(0);
  await row.evaluate((el) => el.querySelectorAll('.chip')[5].click());   // clic sin que el test desplace la fila
  await expect.poll(() => row.evaluate((el) => { const c = el.querySelector('.chip.on').getBoundingClientRect(), r = el.getBoundingClientRect(); return Math.abs((c.left + c.width / 2) - (r.left + r.width / 2)); })).toBeLessThan(4);
  expect(await row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');
});

test('buscador y filtro por tipo', async ({ page }) => {
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');
  await page.locator('.chip[data-t="Museo"]').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');   // panel plegado: se ve el mapa filtrado
  await expect(page.locator('.sec-sub')).toContainText('resultados');
  await expect(page.locator('.pitem').first()).toContainText(/Museo/);
  await page.locator('#q-clear').click();
  await page.locator('#q').fill('prado');
  await expect(page.locator('.pitem[data-place="prado"]')).toBeVisible();
});

test('idioma: cambiar a inglés y que se recuerde', async ({ page }) => {
  await page.locator('[data-tab="diary"]').click();
  await page.locator('#settings-btn').click();
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator('.tabbar')).toContainText('Diary');
  await expect(page.locator('.tabbar')).toContainText('Badges');
  await page.reload();
  await expect(page.locator('#title')).toHaveText('Explore Madrid');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('compartir: en Madrid directo en historia; con distrito, elegir distrito o Madrid', async ({ page }) => {
  // Sin hoja de compartir nativa en el navegador de pruebas: se descarga la imagen
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  let dl = page.waitForEvent('download');
  await page.locator('#share').click();                           // sin distrito: sin menú
  expect((await dl).suggestedFilename()).toBe('madrid-passport-madrid-story.png');
  await openCentro(page);
  await page.locator('#share').click();
  await expect(page.locator('.share-menu button')).toHaveCount(2);
  dl = page.waitForEvent('download');
  await page.locator('.share-menu button[data-s="district"]').click();
  expect((await dl).suggestedFilename()).toBe('madrid-passport-centro-story.png');
});

test('niveles: cálculo de puntos (módulo level.js)', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const { points, levelOf } = await import('/js/app/level.js');
    const places = [{ id: 'a' }, { id: 'b' }], L = { a: 2, b: 1 };
    const p = points({ places, districts: [{ places }], barrios: [{}], lvl: (id) => L[id] || 0, blvl: () => 2, badges: { x: 1 } });
    return { total: p.total, lv: levelOf(p.total).cur.id, top: levelOf(99999).next };
  });
  expect(r).toEqual({ total: 10 * 2 + 15 + 5 + 50 + 20, lv: 'forastero', top: null });
});

test('sin errores de JavaScript al navegar', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCentro(page);
  await page.locator('#pl-plaza-mayor').click();
  await expect(page.locator('.pd-head h2')).toHaveText('Plaza Mayor');
  await page.locator('#back').click();
  for (const tab of ['diary', 'badges', 'map']) await page.locator(`[data-tab="${tab}"]`).click();
  expect(errors).toEqual([]);
});

test('tocar la pestaña activa (Logros) vuelve arriba con scroll', async ({ page }) => {
  await page.locator('.tabbar [data-tab="badges"]').click();
  const body = page.locator('#page-body');
  await body.evaluate((el) => (el.scrollTop = 600));
  expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.locator('.tabbar [data-tab="badges"]').click();
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(0);
});

test('enlace directo ?p= abre la ficha; conexiones «Está en» y «Aquí dentro»', async ({ page }) => {
  await page.goto('./?p=cristal');
  await expect(page.locator('.pd-head h2')).toHaveText('Palacio de Cristal');
  await expect(page).toHaveURL(/\/$/);                       // limpia el parámetro
  await page.locator('.in-parent').click();
  await expect(page.locator('.pd-head h2')).toHaveText('Parque del Retiro');
  const inside = page.locator('.inside');
  await expect(inside).toContainText('Aquí dentro');
  await expect(inside).toContainText('Palacio de Cristal');
  await inside.locator('[data-in="estanque"]').click();
  await expect(page.locator('.pd-head h2')).toHaveText('Estanque Grande del Retiro');
});

test('enlace directo ?d= abre el distrito', async ({ page }) => {
  await page.goto('./?d=retiro');
  await expect(page.locator('#title')).toHaveText('Retiro');
});

test('cerca de ti: tarjetas con los pendientes más cercanos y abren la ficha', async ({ page }) => {
  const cards = page.locator('.near .ncard');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(2);
  const name = await cards.first().locator('b').textContent();
  await cards.first().click();
  await expect(page.locator('.pd-head h2')).toHaveText(name);
});

test('SEO: páginas estáticas de lugar, distrito, índice y sitemap', async ({ request }) => {
  const r = await request.get('lugar/puerta-sol/');
  expect(r.ok()).toBeTruthy();
  const h = await r.text();
  expect(h).toContain('<h1>Puerta del Sol</h1>');
  expect(h).toContain('"@type": "TouristAttraction"');
  expect(h).toContain('href="/?p=puerta-sol"');
  expect(h).toContain('href="/lugar/km-cero/"');              // Aquí dentro
  const d = await (await request.get('distrito/centro/')).text();
  expect(d).toContain('Qué ver en Centro');
  const i = await (await request.get('lugares/')).text();
  expect(i).toContain('href="/distrito/barajas/"');
  const sm = await (await request.get('sitemap.xml')).text();
  expect(sm).toContain('https://www.madridpassport.com/lugar/plaza-mayor/');
});

test('SEO: quien ya usa la app no ve los botones de abrir/empezar/sellar', async ({ page }) => {
  await page.goto('lugar/puerta-sol/');                       // beforeEach ya dejó mp.onboarded en este origen
  await expect(page.locator('h1')).toHaveText('Puerta del Sol');
  await expect(page.locator('.cta')).toBeHidden();
  await expect(page.locator('header .btn')).toBeHidden();
  await expect(page.locator('.cta')).toHaveCount(1);         // sigue en la página para visitantes nuevos
});

test('ficha: valoración personal tras visitar (se guarda como r:<id>)', async ({ page }) => {
  await page.goto('./?p=plaza-mayor');
  await expect(page.locator('.rate')).toHaveCount(0);          // sin visitar no se valora
  await page.locator('.pd-head .chk[data-a="1"]').click();
  await page.locator('.rate [data-rate="2"]').click();
  await expect(page.locator('.rate button.on')).toHaveCount(2);           // 2 estrellas encendidas
  await page.locator('.rate [data-rate="3"]').click();
  await expect(page.locator('.rate button.on')).toHaveCount(3);
  const v = await page.evaluate(() => JSON.parse(localStorage.getItem('mp.visits.v1'))['r:plaza-mayor']);
  expect(v.v).toBe(3);
});

test('ficha: comunidad (viajeros, me encantó, puesto y joya oculta) desde Supabase', async ({ page }) => {
  await page.route(/rpc\/place_stats/, (r) => r.fulfill({ json: { 'puerta-sol': [12, 7], 'plaza-mayor': [40, 5], 'debod': [3, 3], 'gran-via': [30, 4] } }));
  await page.route(/rpc\/place_rank/, (r) => r.fulfill({ json: 4 }));
  await page.evaluate(() => localStorage.setItem('mp.visits.v1', JSON.stringify({ 'puerta-sol': { lvl: 1, t: 1700000000000 } })));
  await page.goto('./?p=puerta-sol');
  await expect(page.locator('.comm')).toContainText('Sellado por 12 viajeros · 7 le dan ★★★ · fuiste el 4.º en sellarlo');
  await page.goto('./?p=debod');
  await expect(page.locator('.comm .gem')).toHaveText('Joya oculta');
  await page.goto('./');
  await expect(page.locator('.gems')).toContainText('Templo de Debod');
});

test('ficha: compartir lugar (copia el enlace sin navigator.share) y reportar un error', async ({ page, context }) => {
  await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write']);
  await page.goto('./?p=debod');
  await page.evaluate(() => { delete Navigator.prototype.share; });
  await page.locator('#pl-share').click();
  await expect(page.locator('.toast')).toContainText('Enlace copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('https://www.madridpassport.com/lugar/debod/');
  await page.locator('#pl-report').click();
  const card = page.locator('.rep-card');
  await expect(card).toContainText('Templo de Debod');
  await card.locator('text=La foto').click();
  await card.locator('textarea').fill('La foto es de otro sitio');
  await card.locator('.rep-send').click();
  await expect(page.locator('.rep-ov')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Gracias');
});

test('SEO en inglés: páginas /en/ con hreflang y enlace a la app en inglés', async ({ request }) => {
  const h = await (await request.get('en/place/palacio-real/')).text();
  expect(h).toContain('<html lang="en">');
  expect(h).toContain('<h1>Royal Palace of Madrid</h1>');
  expect(h).toContain('hreflang="es" href="https://www.madridpassport.com/lugar/palacio-real/"');
  expect(h).toContain('href="/?p=palacio-real&lang=en"');
  const es = await (await request.get('lugar/palacio-real/')).text();
  expect(es).toContain('hreflang="en" href="https://www.madridpassport.com/en/place/palacio-real/"');
  expect(await (await request.get('en/places/')).text()).toContain('Things to do in Madrid');
  expect(await (await request.get('sitemap.xml')).text()).toContain('/en/district/retiro/');
});

test('tocar Mapa estando en el mapa quita el filtro por tipo y la búsqueda', async ({ page }) => {
  await page.locator('#type-chips [data-t="Barrio"]').click();
  await expect(page.locator('.chip.on[data-t="Barrio"]')).toBeVisible();
  await page.locator('.tabbar [data-tab="map"]').click();
  await expect(page.locator('#type-chips .chip.on')).toHaveCount(0);
  await expect(page.locator('.row')).toHaveCount(21);
});

test('el gesto atrás no sale de la app: vuelve al mapa desde Diario y cierra el distrito', async ({ page }) => {
  await page.locator('.tabbar [data-tab="diary"]').click();
  await expect(page.locator('#page')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#page')).toBeHidden();
  await page.locator('.row[data-id="centro"]').click();
  await expect(page.locator('#back')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.row')).toHaveCount(21);
  expect(page.url()).toContain('localhost');
});

test('avisos de error: máximo 5 al día (en la app y respuesta de límite de Supabase)', async ({ page }) => {
  let posts = 0;
  await page.route(/rest\/v1\/reports/, (r) => { posts++; return posts <= 1 ? r.fulfill({ status: 201, body: '' })
    : r.fulfill({ status: 400, contentType: 'application/json', body: '{"code":"P0001","message":"too_many_reports"}' }); });
  await page.goto('./?p=debod');
  await page.evaluate(() => localStorage.setItem('mp.reports', JSON.stringify([Date.now() - 2 * 864e5])));   // uno viejo: no cuenta
  const send = async () => { await page.locator('#pl-report').click(); await page.locator('.rep-send').click(); await expect(page.locator('.rep-ov')).toHaveCount(0); };
  await send();
  await expect(page.locator('.toast')).toContainText('Gracias');
  await send();                                                            // Supabase dice que ya hay 5 desde esta IP
  await expect(page.locator('.toast')).toContainText('5 avisos');
  await page.evaluate(() => localStorage.setItem('mp.reports', JSON.stringify(Array(5).fill(Date.now()))));
  await page.locator('#pl-report').click();                                // con 5 en el día ni se abre el formulario
  await expect(page.locator('.rep-ov')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('5 avisos');
  expect(posts).toBe(2);
});

test.describe('instalar app en móvil', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  test('ajustes: botón de instalar con instrucciones en iOS', async ({ page }) => {
    await page.locator('[data-tab="diary"]').click();
    await page.locator('#settings-btn').click();
    await page.locator('#set-install').click();
    await expect(page.locator('#toast')).toContainText('Añadir a pantalla de inicio');
  });
});

test('ajustes: sin botón de instalar en escritorio', async ({ page }) => {
  await page.locator('[data-tab="diary"]').click();
  await page.locator('#settings-btn').click();
  await expect(page.locator('#ob-again')).toBeVisible();
  await expect(page.locator('#set-install')).toHaveCount(0);
});

test('sincronización: un borrado en otro dispositivo no resucita y lo añadido después sí vuelve', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const { mergeVisits } = await import('/js/app/sync.js');
    const A = { a: { lvl: 1, t: 1 }, 'f:a': { t: 1 }, b: { lvl: 1, t: 5 }, '~mod': { a: 1, 'f:a': 1, b: 5 } };
    const B = { b: { lvl: 2, t: 9, gpsAt: 9 }, '~mod': { a: 10, 'f:a': 10, b: 9 } };       // B quitó «a» y su favorito después
    const C = { a: { lvl: 1, t: 20 }, '~mod': { a: 20 } };                                   // C lo volvió a marcar más tarde
    const old = { x: { lvl: 1, t: 3 } };                                                     // datos sin '~mod' (versiones anteriores)
    return { ab: mergeVisits(A, B), ba: mergeVisits(B, A), bc: mergeVisits(B, C), old: mergeVisits(old, {}) };
  });
  for (const m of [r.ab, r.ba]) {
    expect(m.a).toBeUndefined();
    expect(m['f:a']).toBeUndefined();
    expect(m.b).toEqual({ lvl: 2, t: 5, gpsAt: 9 });                                       // nivel más alto, fecha más antigua
    expect(m['~mod'].a).toBe(10);
  }
  expect(r.bc.a).toEqual({ lvl: 1, t: 20 });
  expect(r.old.x).toEqual({ lvl: 1, t: 3 });
});

test('desmarcar guarda la fecha del cambio en ~mod (para sincronizar el borrado)', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await markVisited(page, 'plaza-mayor');
  const v = await page.evaluate(() => JSON.parse(localStorage.getItem('mp.visits.v1')));
  expect(v['plaza-mayor']).toBeUndefined();
  expect(v['~mod']['plaza-mayor']).toBeGreaterThan(0);
});

test('enlace directo sin haber visto la intro: abre la ficha sin onboarding y da una pista', async ({ page }) => {
  await page.goto('./?ob=1&p=plaza-mayor');
  await expect(page.locator('.pd-head h2')).toHaveText('Plaza Mayor');
  await expect(page.locator('#onboard')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('confírmalo con GPS');
  await page.goto('./?ob=1');                                                                // la siguiente visita normal sí la muestra
  await expect(page.locator('#onboard')).toBeVisible();
});

test('«Quiero ir» cerca: aviso al pasar a menos de 5 min', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('mp.visits.v1', JSON.stringify({ 'w:plaza-mayor': { t: 1 } })));
  await page.reload();
  await expect(page.locator('.notif')).toContainText('Plaza Mayor');
  await page.locator('.notif').click();
  await expect(page.locator('.pd-head h2')).toHaveText('Plaza Mayor');
});

test('tipo «Zona» con su logro', async ({ page }) => {
  await page.locator('[data-tab="badges"]').click();
  await expect(page.locator('#page-body')).toContainText('Zonas');
  expect(await page.evaluate(() => MP_BADGES.some((b) => b.id === 'zonas'))).toBe(true);
});

test('ajustes: descargar mis datos y borrarlos de este dispositivo', async ({ page }) => {
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');
  await page.locator('[data-tab="diary"]').click();
  await page.locator('#settings-btn').click();
  await expect(page.locator('#set-export')).toHaveCount(0);                                 // en «Ajustes avanzados»
  await page.locator('#set-adv').click();
  await expect(page.locator('.settings-card')).toContainText('Política de privacidad');
  await page.locator('#set-back').click();
  await expect(page.locator('#ob-again')).toBeVisible();
  await page.locator('#set-adv').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#set-export').click()]);
  const data = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  expect(data.visits['plaza-mayor'].lvl).toBe(1);
  page.once('dialog', (d) => d.accept());
  await page.locator('#set-delete').click();
  await expect(page.locator('.row')).toHaveCount(21);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mp.visits.v1') || '{}')['plaza-mayor'])).toBeUndefined();   // (el barrio de Sol se vuelve a pisar por GPS)
});

test('sin modo debug: no hay panel de GPS falso', async ({ page }) => {
  await page.goto('./?debug=1');
  await expect(page.locator('#debug')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('mp.debug'))).toBeNull();
});

test('CSP: los scripts en línea de las páginas tienen su hash en vercel.json', async () => {
  const fs = require('fs'), crypto = require('crypto'), path = require('path');
  const root = path.join(__dirname, '..');
  const csp = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  const pages = ['index.html', 'privacy.html', 'lugares/index.html', 'lugar/plaza-mayor/index.html', 'distrito/centro/index.html', 'en/places/index.html'];
  for (const f of pages) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=|application\/ld\+json/.test(attrs)) continue;
      const h = `'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`;
      expect(csp, `${f}: falta ${h}`).toContain(h);
    }
  }
});

test.describe('sin conexión', () => {
  test.use({ serviceWorkers: 'allow' });
  test('con el service worker, la app abre sin red', async ({ page, context }) => {
    await context.unrouteAll();                                                              // con rutas interceptadas el SW no se registra
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();                                                                     // ya controlada por el SW
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.row')).toHaveCount(21);
  });
});

test('radar: con el botón de ubicación activo, círculo de 500 m y pines de los lugares cercanos; al desactivarlo desaparecen', async ({ page }) => {
  await expect(page.locator('.radar')).toHaveCount(0);
  await expect(page.locator('.pin')).toHaveCount(0);
  await page.locator('#locate').click();
  await expect(page.locator('#locate')).toHaveClass(/active/);
  await expect(page.locator('.radar')).toHaveCount(1);
  await expect(page.locator('.pin.radar-pin[data-id="puerta-sol"]')).toHaveCount(1);
  // Tras acercarse (zoom ≥ 15,5) el círculo de 500 m ocupa buena parte de la pantalla
  await expect.poll(() => page.locator('.radar').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(200);
  await page.locator('#locate').click();
  await expect(page.locator('.radar')).toHaveCount(0);
  await expect(page.locator('.pin.radar-pin')).toHaveCount(0);
});

test('ubicación: la primera vez que se pulsa (sin seguimiento previo) acerca y centra aunque llegue enseguida la posición del seguimiento', async ({ page }) => {
  // Como en iOS: permissions.query no dice «granted», así que no hay seguimiento hasta pulsar el botón
  await page.addInitScript(() => { navigator.permissions.query = () => Promise.reject(new Error('x')); });
  await page.reload();
  await expect(page.locator('.row')).toHaveCount(21);
  await page.locator('#locate').click();
  await expect.poll(() => page.evaluate(() => window.__mpMap.getZoom()), { timeout: 4000 }).toBeGreaterThan(13);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__mpMap.getZoom())).toBeGreaterThan(13);
});

test('diario: repintar la página (p. ej. al llegar la posición GPS) no recrea el hueco de la cuenta (el botón de Google no parpadea)', async ({ page }) => {
  await page.locator('[data-tab="diary"]').click();
  await expect(page.locator('#acct-slot')).toHaveCount(1);
  await page.evaluate(() => { document.getElementById('acct-slot').__keep = 1; });
  await page.evaluate(() => import('/js/app/views.js').then((m) => m.render({ keepScroll: true })));
  expect(await page.evaluate(() => document.getElementById('acct-slot').__keep)).toBe(1);
  await expect(page.locator('.pass-k')).toHaveCount(1);
});

test('.vercelignore no deja fuera ningún archivo que use la app (SHELL del service worker)', async () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const rules = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const shell = eval('[' + sw.match(/const SHELL = \[([\s\S]*?)\];/)[1] + ']').filter((f) => f !== './');
  // Regla de directorio: con «/» delante solo en la raíz; sin ella, en cualquier nivel (como .gitignore)
  const ignored = (f) => rules.some((r) => {
    const anchored = r.startsWith('/'), dir = r.endsWith('/'), name = r.replace(/^\/|\/$/g, '');
    if (name.includes('*')) return false;
    const parts = f.split('/');
    if (anchored) return dir ? parts[0] === name && parts.length > 1 : f === name;
    return dir ? parts.slice(0, -1).includes(name) : parts.includes(name);
  });
  expect(shell.filter(ignored)).toEqual([]);
});

test('ajustes: enviar comentarios (tipo y texto a la tabla reports)', async ({ page }) => {
  let body = null;
  await page.route(/rest\/v1\/reports/, (r) => { body = JSON.parse(r.request().postData()); return r.fulfill({ status: 201, body: '' }); });
  await page.locator('[data-tab="diary"]').click();
  await page.locator('#settings-btn').click();
  await page.locator('#set-fb').click();
  await page.locator('.rep-opts span', { hasText: 'Una idea' }).click();
  await page.locator('.rep-card textarea').fill('Rutas por distrito');
  await page.locator('.rep-send').click();
  await expect(page.locator('#toast')).toContainText('Gracias');
  expect(body).toMatchObject({ place: '_feedback:idea', reason: 'other', note: 'Rutas por distrito', lang: 'es' });
});
