// Rasteriza icons/*.svg a los PNG que usa la PWA.
const { chromium } = require('playwright');
const fs = require('fs');
const out = [['icon.svg', 'icon-192.png', 192], ['icon.svg', 'icon-512.png', 512], ['icon-full.svg', 'icon-maskable-512.png', 512], ['icon-full.svg', 'apple-touch-icon.png', 180], ['icon.svg', 'favicon-32.png', 32]];
(async () => {
  const b = await chromium.launch();
  for (const [src, dst, size] of out) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    const svg = fs.readFileSync('icons/' + src, 'utf8').replace('width="1024" height="1024"', `width="${size}" height="${size}"`);
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: 'icons/' + dst, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await p.close();
  }
  await b.close();
  console.log('png ok');
})();
