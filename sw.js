// Service worker: app instalable y uso sin conexión.
// - App (HTML/CSS/JS/datos): red primero, caché como respaldo → las actualizaciones llegan al momento.
// - Mapa (tiles OpenFreeMap) e imágenes (Wikimedia): caché primero y se refresca en segundo plano.
const VERSION = 'mp-v107';
const SHELL = [
  './', 'index.html', 'privacy.html', 'manifest.webmanifest', 'css/styles.css',
  'js/city.js', 'js/config.js', 'js/auth.js', 'vendor/supabase/supabase.js', 'js/data.js', 'js/icons.js', 'js/badges.js', 'js/share.js',
  ...['main', 'util', 'i18n', 'state', 'geo', 'sheet', 'map', 'gps', 'wiki', 'views', 'pages', 'level', 'sync', 'analytics', 'notify', 'metro', 'onboarding', 'community', 'maya', 'consent'].map((m) => `js/app/${m}.js`),
  'data/distritos.geojson', 'data/barrios.geojson', 'data/metro.json',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css',
  'fonts/fredoka.woff2', 'fonts/dm-sans.woff2', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const LIMITS = { [`${VERSION}-tiles`]: 3000, [`${VERSION}-img`]: 300 };

self.addEventListener('install', (e) => { e.waitUntil(caches.open(`${VERSION}-shell`).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name) {
  const c = await caches.open(name), keys = await c.keys(), max = LIMITS[name];
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => c.delete(k)));
}
async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') { c.put(req, r.clone()); trim(name); } return r; }).catch(() => hit);
  return hit || net;
}
// Red primero, pero con mala cobertura (metro) no se espera más de 3 s si hay copia en caché; la red sigue y actualiza la caché
async function networkFirst(req) {
  const c = await caches.open(`${VERSION}-shell`);
  const cached = () => c.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? c.match('index.html') : undefined));
  const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; });
  const slow = new Promise((res) => setTimeout(res, 3000)).then(cached);
  try {
    const r = await Promise.race([net, slow.then((r) => r || net)]);
    return r || (await net);
  } catch { return (await cached()) || Response.error(); }
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'tiles.openfreemap.org') return e.respondWith(staleWhileRevalidate(req, `${VERSION}-tiles`));
  if (/(^|\.)wikimedia\.org$/.test(url.hostname)) return e.respondWith(staleWhileRevalidate(req, `${VERSION}-img`));
  if (url.hostname.endsWith('.supabase.co')) return;              // API/auth: siempre red
  if (url.pathname.startsWith('/ingest') || url.pathname.startsWith('/_vercel')) return;   // analítica (proxy PostHog, Vercel): sin caché
  if (/^\/(lugar|distrito|lugares|en)\//.test(url.pathname) || /^\/(sitemap\.xml|robots\.txt)$/.test(url.pathname)) return;   // páginas SEO: sin caché de la app
  if (url.origin === location.origin) return e.respondWith(networkFirst(req));
});
