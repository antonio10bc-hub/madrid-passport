// Imagen para compartir enlaces (Open Graph / X, 1200×630): mapa de distritos «de calor», May y el nombre de la app.
// Uso (desde la raíz): node tools/render_og.js → icons/og.png
const { chromium } = require('playwright');
const fs = require('fs');
const city = JSON.parse(fs.readFileSync('tools/city.json', 'utf8'));
const geo = JSON.parse(fs.readFileSync('data/distritos.geojson', 'utf8'));
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
let b = [180, 90, -180, -90];
geo.features.forEach((f) => polys(f.geometry).forEach((p) => p[0].forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })));
const k = Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180), H = 540, s = H / (b[3] - b[1]), W = (b[2] - b[0]) * k * s;
const tones = [0.14, 0.24, 0.38, 0.56, 0.78];
const paths = geo.features.map((f, i) => `<path d="${polys(f.geometry).map((p) => 'M' + p[0].map(([x, y]) => `${((x - b[0]) * k * s).toFixed(1)},${((b[3] - y) * s).toFixed(1)}`).join('L') + 'Z').join('')}" fill="#D6202C" fill-opacity="${tones[(i * 7) % 5]}" stroke="#FFF5EC" stroke-width="2"/>`).join('');
const may = fs.readFileSync('icons/icon.svg', 'utf8').replace('width="1024" height="1024"', 'width="132" height="132"');
const font = (f) => `url(data:font/woff2;base64,${fs.readFileSync('fonts/' + f).toString('base64')})`;
const n = (fs.readFileSync('tools/places.tsv', 'utf8').trim().split('\n').length - 1);
const html = `<html><head><style>
@font-face{font-family:F;src:${font('fredoka.woff2')}}@font-face{font-family:D;src:${font('dm-sans.woff2')}}
body{margin:0;width:1200px;height:630px;background:#FFF5EC;font-family:D;color:#111114;overflow:hidden;position:relative}
.map{position:absolute;right:40px;top:45px}.t{position:absolute;left:72px;top:84px;width:560px}
h1{font-family:F;font-weight:600;font-size:76px;line-height:1;margin:34px 0 18px;color:#D6202C}
p{font-size:30px;line-height:1.3;margin:0;color:#3a3236}.k{margin-top:30px;font-size:24px;font-weight:700;color:#D6202C;letter-spacing:.5px}
</style></head><body><svg class="map" width="${W.toFixed(0)}" height="${H}" viewBox="0 0 ${W.toFixed(0)} ${H}">${paths}</svg>
<div class="t">${may}<h1>${city.app}</h1><p>Marca los lugares que visitas, confírmalos con GPS y pinta tu mapa de ${city.name}.</p>
<div class="k">${Math.floor(n / 50) * 50}+ LUGARES · ${geo.features.length} DISTRITOS · GRATIS</div></div></body></html>`;
(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1200, height: 630 } });
  await pg.setContent(html);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: 'icons/og.png' });
  await br.close();
  console.log('icons/og.png ok');
})();
