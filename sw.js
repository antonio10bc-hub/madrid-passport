// Service worker: app instalable y uso sin conexión.
// - App (HTML/CSS/JS/datos): red primero, caché como respaldo → las actualizaciones llegan al momento.
// - Mapa (tiles OpenFreeMap) e imágenes (Wikimedia): caché primero y se refresca en segundo plano.
const VERSION = 'mp-v16';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/config.js', 'js/auth.js', 'vendor/supabase/supabase.js', 'js/data.js', 'js/icons.js', 'js/badges.js', 'js/share.js',
  ...['main', 'util', 'i18n', 'state', 'geo', 'sheet', 'map', 'gps', 'wiki', 'views', 'pages', 'level', 'sync', 'analytics'].map((m) => `js/app/${m}.js`),
  'data/distritos.geojson', 'data/barrios.geojson',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
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
async function networkFirst(req) {
  const c = await caches.open(`${VERSION}-shell`);
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
  catch { return (await c.match(req, { ignoreSearch: true })) || (await c.match('index.html')); }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'tiles.openfreemap.org') return e.respondWith(staleWhileRevalidate(req, `${VERSION}-tiles`));
  if (/(^|\.)wikimedia\.org$/.test(url.hostname)) return e.respondWith(staleWhileRevalidate(req, `${VERSION}-img`));
  if (url.hostname.endsWith('.supabase.co')) return;              // API/auth: siempre red
  if (url.pathname.startsWith('/ingest')) return;                 // analítica (proxy PostHog): sin caché
  if (url.origin === location.origin) return e.respondWith(networkFirst(req));
});
