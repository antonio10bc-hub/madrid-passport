// Flujos clave de Madrid Passport. Sin red externa: el mapa usa el estilo de respaldo y Wikipedia no responde.
const { test, expect } = require('@playwright/test');

const SOL = { latitude: 40.41694, longitude: -3.70361 };          // Puerta del Sol
test.beforeEach(async ({ context, page }) => {
  await context.route(/openfreemap|wikipedia|wikimedia|supabase|posthog/, (r) => r.abort());
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(SOL);
  await page.goto('./');
  await expect(page.locator('.row')).toHaveCount(21);
});

const openCentro = async (page) => {
  await page.locator('.row[data-id="centro"]').click();
  await expect(page.locator('#title')).toHaveText('Centro');
};
const markVisited = (page, id) => page.locator(`#pl-${id} .chk[data-a="1"]`).click();

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
  await page.locator('#barrios-h').click();
  const first = page.locator('.place.barrio .chk:not([disabled])').first();
  await first.click();
  await expect(page.locator('.place.barrio .chk.on').first()).toBeVisible();
  await expect(page.locator('#barrios-h small')).toHaveText(/^1\//);
});

test('logros: nivel arriba, puntos y progreso por tipo', async ({ page }) => {
  await page.locator('[data-tab="badges"]').click();
  const card = page.locator('#lvl-card');
  await expect(card).toContainText('Turista');
  await expect(card.locator('.lvl-pts')).toContainText('0');
  await page.locator('[data-tab="map"]').click();
  await openCentro(page);
  await markVisited(page, 'plaza-mayor');           // 10 (visita) + 5 (barrio) + 20 (logro «Primer sello»)
  await page.locator('[data-tab="badges"]').click();
  await expect(card.locator('.lvl-pts')).toContainText('35');
  await expect(page.locator('.tp-row[data-type="Plaza"] .tp-n')).toHaveText(/^1\//);
  await expect(page.locator('.pp.on')).toHaveCount(1);
  // tocar un tipo lleva al mapa filtrado
  await page.locator('.tp-row[data-type="Museo"]').click();
  await expect(page.locator('#page')).toBeHidden();
  await expect(page.locator('.chip.on[data-t="Museo"]')).toBeVisible();
});

test('subir de nivel', async ({ page }) => {
  await openCentro(page);
  for (const id of ['plaza-mayor', 'san-miguel', 'puerta-sol']) await markVisited(page, id);
  await expect(page.locator('#toast')).toContainText(/nivel|Logro/);
  await page.locator('[data-tab="badges"]').click();
  await expect(page.locator('#lvl-card')).toContainText('Forastero');
});

test('buscador y filtro por tipo', async ({ page }) => {
  await page.locator('#q').fill('prado');
  await expect(page.locator('.pitem[data-place="prado"]')).toBeVisible();
  await page.locator('#q-clear').click();
  await page.locator('.chip[data-t="Museo"]').click();
  await expect(page.locator('.sec-sub')).toContainText('resultados');
  await expect(page.locator('.pitem').first()).toContainText(/Museo/);
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

test('compartir: genera y descarga la imagen', async ({ page }) => {
  await page.locator('#share').click();
  const dl = page.waitForEvent('download');
  await page.locator('.share-menu button[data-s="city"][data-f="post"]').click();
  expect((await dl).suggestedFilename()).toBe('madrid-passport-madrid-post.png');
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
