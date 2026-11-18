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

test('onboarding: 4 pasos con continuar, puntitos y fin con ubicación; no vuelve a salir', async ({ page }) => {
  await page.goto('./?ob=1');
  const ob = page.locator('#onboard');
  await expect(ob).toBeVisible();
  await expect(ob.locator('.ob-dots i.on')).toHaveCount(1);
  for (let i = 0; i < 3; i++) { await page.locator('#ob-next').click(); await page.waitForTimeout(500); }
  await expect(page.locator('#ob-dots i').nth(3)).toHaveClass(/on/);
  await expect(ob).toContainText('consigue el doble check dorado');
  await expect(page.locator('#ob-next')).toHaveText('Activar ubicación y empezar');
  await page.locator('#ob-next').click();
  await expect(ob).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.locator('#onboard')).toHaveCount(0);
});

test('onboarding: saltar y volver a verlo desde el Diario', async ({ page }) => {
  await page.goto('./?ob=1');
  await page.locator('#ob-skip').click();
  await expect(page.locator('#onboard')).toHaveCount(0);
  await page.locator('[data-tab="diary"]').click();
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
  await expect(page.locator('.near .pitem').first()).toBeVisible();          // geolocalización en Sol
  await expect(page.locator('.near .pitem').first()).toContainText('min a pie');
  await expect(page.locator('.near .pitem')).toHaveCount(5);
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

test('al pulsar un filtro, la fila de filtros no vuelve al principio', async ({ page }) => {
  await page.waitForTimeout(1500);                          // que termine de arrancar (mapa y primera posición)
  const row = page.locator('#type-chips');
  await row.evaluate((el) => (el.scrollLeft = 300));
  await page.waitForTimeout(100);
  const x = await row.evaluate((el) => el.scrollLeft);
  expect(x).toBeGreaterThan(0);
  await row.evaluate((el) => el.querySelectorAll('.chip')[5].click());   // clic sin que el test desplace la fila
  await expect.poll(() => page.locator('#type-chips').evaluate((el) => el.scrollLeft)).toBe(x);
});

test('buscador y filtro por tipo', async ({ page }) => {
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'peek');
  await page.locator('.chip[data-t="Museo"]').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-state', 'half');   // con el panel bajo, se abre a la mitad
  await expect(page.locator('.sec-sub')).toContainText('resultados');
  await expect(page.locator('.pitem').first()).toContainText(/Museo/);
  await page.locator('#q-clear').click();
  await page.locator('#q').fill('prado');
  await expect(page.locator('.pitem[data-place="prado"]')).toBeVisible();
});

test('idioma: cambiar a inglés y que se recuerde', async ({ page }) => {
  await page.locator('[data-tab="diary"]').click();
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
