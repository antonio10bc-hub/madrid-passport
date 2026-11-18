// Mapa (MapLibre + OpenFreeMap): capas de distritos (mapa de calor) y barrios, etiquetas, pines y encuadre.
import { $, esc, css, isDark, ll, ICON_CHECK, ICON_GPS } from './util.js';
import { S, DISTRICTS, BYID, districtOf, lvl, blvl, progress, currentDistrict } from './state.js';
import { distGeo, barGeo } from './geo.js';
import { pad, sheet, setSheet } from './sheet.js';
import { openDistrict, openPlace, goHome, homeResults } from './views.js';
import { setFake, setFollow, radiusFor } from './gps.js';
import { track } from './analytics.js';

const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
export let map = null, ready = false;   // ready: estilo cargado y capas añadidas
let LABEL_ORDER = [];
const FALLBACK_STYLE = () => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': css('--map-bg') } }] });
async function loadStyle() {
  try {
    const r = await fetch(STYLE[isDark() ? 'dark' : 'light']);
    if (r.ok) {
      const st = await r.json();
      // Quita la etiqueta «Madrid» del mapa base: se solapaba con las de los distritos (Centro)
      st.layers.forEach((l) => {
        // Mismo estilo de texto en claro y oscuro (el tema oscuro pone todo en mayúsculas)
        if (l.layout?.['text-transform']) delete l.layout['text-transform'];
        if (l['source-layer'] === 'place' && l.type === 'symbol') l.filter = ['all', l.filter ?? true, ['!=', ['get', 'name'], 'Madrid']];
      });
      // Capas que no aportan nada aquí (aeropuertos, nombres de ríos pequeños): menos trabajo de dibujo y de etiquetas
      st.layers = st.layers.filter((l) => !['aeroway', 'aerodrome_label'].includes(l['source-layer']) && !(l['source-layer'] === 'waterway' && l.type === 'symbol'));
      return st;
    }
  } catch {}
  return FALLBACK_STYLE();
}

// Mapa de calor: el % visitado de cada distrito decide su tono (escala continua del fondo al rojo Madrid)
export const HEAT = [0, 0.25, 0.5, 0.75, 1];
function addLayers() {
  const RED = css('--red'), GOLD = css('--gold'), BG = css('--bg');
  map.addSource('distritos', { type: 'geojson', data: distGeo });
  map.addSource('barrios', { type: 'geojson', data: barGeo });
  map.addLayer({ id: 'd-fill', type: 'fill', source: 'distritos', paint: {
    'fill-color': RED,
    'fill-opacity': ['case',
      ['boolean', ['feature-state', 'dim'], false], 0,
      ['boolean', ['feature-state', 'sel'], false], 0.03,
      ['interpolate', ['linear'], ['coalesce', ['feature-state', 'p'], 0], 0, 0.05, 0.001, 0.14, 1, 0.62]],
  }});
  map.addLayer({ id: 'd-mask', type: 'fill', source: 'distritos', paint: {
    'fill-color': BG, 'fill-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.65, 0],
  }});
  // Barrios pisados (solo en el distrito abierto): rojo = visitado, dorado = GPS
  map.addLayer({ id: 'b-fill', type: 'fill', source: 'barrios', layout: { visibility: 'none' }, paint: {
    'fill-color': ['match', ['coalesce', ['feature-state', 'l'], 0], 2, GOLD, RED],
    'fill-opacity': ['match', ['coalesce', ['feature-state', 'l'], 0], 0, 0, 0.13],
  }});
  map.addLayer({ id: 'b-line', type: 'line', source: 'barrios', layout: { visibility: 'none' }, paint: {
    'line-color': RED, 'line-opacity': 0.35, 'line-width': 0.8, 'line-dasharray': [2, 2],
  }});
  map.addLayer({ id: 'd-line', type: 'line', source: 'distritos', paint: {
    'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], RED, css('--map-line')],
    'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.5, 1.2],
  }});
  // Área en la que se puede confirmar por GPS el lugar seleccionado
  map.addSource('b-flash', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'b-flash-fill', type: 'fill', source: 'b-flash', paint: { 'fill-color': GOLD, 'fill-opacity': 0 } });
  map.addLayer({ id: 'b-flash-line', type: 'line', source: 'b-flash', paint: { 'line-color': GOLD, 'line-width': 3, 'line-opacity': 0 } });
  map.addSource('gps-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'gps-fill', type: 'fill', source: 'gps-area', paint: { 'fill-color': GOLD, 'fill-opacity': 0.1 } });
  map.addLayer({ id: 'gps-line', type: 'line', source: 'gps-area', paint: { 'line-color': GOLD, 'line-opacity': 0.7, 'line-width': 1.5, 'line-dasharray': [2, 2] } });
  lastArea = null;
}

// Círculo (polígono de 64 lados) de radio r metros alrededor de [lat, lng]
const circle = ([lat, lng], r) => {
  const dLat = r / 111320, dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * 2 * Math.PI; return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]; });
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
};
let lastArea = null;
function drawGpsArea() {
  const src = map?.getSource('gps-area');
  if (!src) return;
  const id = S.view.type === 'place' ? S.view.id : S.selId;
  const p = id && lvl(id) < 2 ? BYID[id] : null;      // ya confirmado: no hace falta
  const key = p ? p.id : '';
  if (key === lastArea) return;
  lastArea = key;
  src.setData({ type: 'FeatureCollection', features: p ? [circle(p.coords, radiusFor(p, 0))] : [] });
}

// El estilo del mapa se pide al arrancar, en paralelo con los límites de distritos y barrios
let stylePromise = null;
export const prefetchStyle = () => (stylePromise ||= loadStyle());

export async function initMap() {
  map = new maplibregl.Map({
    container: 'map', style: await prefetchStyle(), maxTileCacheZoomLevels: 3, refreshExpiredTiles: false,
    // Madrid y alrededores: no se puede ir al resto del mundo, pero en el zoom mínimo queda margen
    // para moverse en horizontal y en vertical (pantalla de móvil, más alta que ancha)
    maxBounds: [[-4.55, 39.85], [-2.85, 41.0]], minZoom: 9.3, center: [-3.70, 40.42], zoom: 10.5,
    pixelRatio: Math.min(devicePixelRatio || 1, 2), fadeDuration: 0, renderWorldCopies: false, maxPitch: 0,
    attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
  });
  window.__mpMap = map;                                 // tests e2e
  map.touchZoomRotate.disableRotation();
  // Doble toque = zoom de MapLibre pisaba el re-centrado al volver a tocar un pin o el distrito abierto.
  map.doubleClickZoom.disable();
  map.addControl(new maplibregl.AttributionControl({ compact: true,
    customAttribution: '© OpenStreetMap · OpenFreeMap · Ayto. Madrid · Wikipedia' }), 'top-left');

  await new Promise((r) => (map.loaded() ? r() : map.on('load', r)));
  addLayers();
  ready = true;
  map.on('click', (e) => {
    if (S.placing) return setFake([e.lngLat.lat, e.lngLat.lng]);
    const f = map.queryRenderedFeatures(e.point, { layers: ['d-fill'] })[0];
    if (!f) return;
    const cur = currentDistrict();
    if (cur && cur.fid === f.id) {
      // Tap en el distrito abierto: con un lugar seleccionado vuelve al distrito; si no, sale a Madrid
      if (S.view.type === 'place' || S.selId) openDistrict(cur.id, { refit: true });
      else goHome();
    } else openDistrict(f.properties.id, { via: 'map' });
  });
  map.on('mouseenter', 'd-fill', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'd-fill', () => (map.getCanvas().style.cursor = ''));
  map.on('dragstart', () => setFollow(false));

  DISTRICTS.forEach((d) => {
    const el = document.createElement('button');
    el.className = 'd-label';
    el.innerHTML = `<span>${esc(d.short)}</span>`;
    el.onclick = (e) => { e.stopPropagation(); if (!S.placing) openDistrict(d.id, { via: 'label' }); };
    d.labelMarker = new maplibregl.Marker({ element: el }).setLngLat(d.label).addTo(map);
  });
  LABEL_ORDER = [...DISTRICTS].sort((x, y) => y.places.length - x.places.length);
  map.on('moveend', fitLabels);
  map.on('zoomend', clusterPins);
  // Créditos plegados (ⓘ): MapLibre los despliega al cargar el estilo, así que se pliegan también al quedar inactivo
  const foldAttrib = () => map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  foldAttrib(); map.once('idle', foldAttrib);

  // Modo oscuro: cambia estilo del mapa y recrea capas
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    map.setStyle(await loadStyle(), { diff: false });
    map.once('style.load', () => { addLayers(); for (const k in lastPaint) delete lastPaint[k]; for (const k in lastB) delete lastB[k]; lastBLine = undefined; paintDistricts(); });
  });
  refitView();
}

// Encuadre de la vista actual (al terminar de cargar el mapa: el usuario puede haber abierto ya un distrito o lugar)
export function refitView() {
  const cur = currentDistrict();
  if (S.view.type === 'place') { const p = BYID[S.view.id]; map.jumpTo({ center: [p.coords[1], p.coords[0]], zoom: 15.5, offset: centerOffset() }); }
  else if (cur) fit(cur.bbox, { padding: pad('half'), maxZoom: 16, animate: false });
  else fitCity(false);
}

// OJO: `padding` en flyTo/easeTo queda guardado en el mapa y se suma a los fitBounds siguientes
// (si no cabe, MapLibre no mueve la cámara). Para centrar un punto usamos `offset`, que no persiste.
export const centerOffset = (state) => { const p = pad(state); return [(p.left - p.right) / 2, (p.top - p.bottom) / 2]; };
export const fit = (bounds, opts) => {
  if (!ready) return;                         // aún cargando: initMap encuadra la vista al terminar
  map.resize();                                       // el lienzo puede tener un tamaño viejo (iOS)
  const cur = map.getPadding();
  if (cur.top || cur.bottom || cur.left || cur.right) map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  map.fitBounds(bounds, { linear: true, ...opts });   // linear: sin el «alejar y acercar» de flyTo
};
export const fitCity = (animate = true) => {
  const b = DISTRICTS.reduce((a, d) => [Math.min(a[0], d.bbox[0]), Math.min(a[1], d.bbox[1]), Math.max(a[2], d.bbox[2]), Math.max(a[3], d.bbox[3])], [180, 90, -180, -90]);
  fit(b, { padding: pad('peek'), animate, duration: 700 });
};

// Etiquetas sin solapes: prioridad a los distritos con más lugares. En Madrid muestran el % (mapa de calor).
function fitLabels() {
  const placed = [], hide = S.view.type !== 'home';
  LABEL_ORDER.forEach((d) => {
    const el = d.labelMarker.getElement();
    const disp = hide ? 'none' : '';
    if (el.style.display !== disp) el.style.display = disp;
    if (hide) return;
    const pr = progress(d.places), pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
    const html = `<span>${esc(d.short)}</span>${pct ? `<em>${pct}%</em>` : ''}`;
    if (d.lhtml !== html) { el.innerHTML = html; d.lhtml = html; d.lw = d.lh = 0; }
    d.lw ||= el.offsetWidth / 2 + 3; d.lh ||= el.offsetHeight / 2 + 2;   // medidas cacheadas hasta que cambie el texto
    const c = map.project(d.label);
    const r = [c.x - d.lw, c.y - d.lh, c.x + d.lw, c.y + d.lh];
    const ok = !placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    const vis = ok ? 'visible' : 'hidden';
    if (el.style.visibility !== vis) el.style.visibility = vis;
    if (ok) placed.push(r);
  });
}

const lastPaint = {}, lastB = {};
let lastBLine;
export function paintDistricts() {
  if (!map?.getSource('distritos')) return;
  const cur = currentDistrict();
  DISTRICTS.forEach((d) => {
    const pr = progress(d.places);
    const st = { sel: cur?.id === d.id, dim: !!cur && cur.id !== d.id, p: pr.total ? pr.done / pr.total : 0 };
    const k = `${st.sel}|${st.dim}|${st.p}`;
    if (lastPaint[d.fid] !== k) { lastPaint[d.fid] = k; map.setFeatureState({ source: 'distritos', id: d.fid }, st); }
  });
  if (cur) cur.barrios.forEach((b) => {
    const l = blvl(b);
    if (lastB[b.fid] !== l) { lastB[b.fid] = l; map.setFeatureState({ source: 'barrios', id: b.fid }, { l }); }
  });
  const bl = cur?.id || '';
  if (bl !== lastBLine) {
    lastBLine = bl;
    for (const id of ['b-line', 'b-fill']) {
      map.setLayoutProperty(id, 'visibility', cur ? 'visible' : 'none');
      if (cur) map.setFilter(id, ['==', ['get', 'district'], cur.id]);
    }
  }
  $('#heat-legend')?.toggleAttribute('hidden', !!cur || S.tab !== 'map');
  $('#app').classList.toggle('no-legend', !!cur);   // sin leyenda, la ⓘ sube a su sitio
  fitLabels();
}

export const passStatus = (p) => S.statusFilter === 'all' || (S.statusFilter === 'todo' && lvl(p.id) === 0) ||
  (S.statusFilter === 'done' && lvl(p.id) > 0) || (S.statusFilter === 'gps' && lvl(p.id) === 2);

// El wrapper del Marker lo posiciona MapLibre con transform: sin transiciones. Escala/fade en el .pin interior.
let pinsKey = null;
const pinMarkers = new Map();               // placeId -> { marker, el }
function makePin(p) {
  const wrap = document.createElement('div'), el = document.createElement('div');
  el.dataset.id = p.id; wrap.appendChild(el);
  // Que los toques en el pin no lleguen a los gestos del mapa (arrastre/doble toque)
  ['mousedown', 'touchstart', 'pointerdown', 'dblclick'].forEach((ev) => wrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
  wrap.onclick = (e) => {
    if (S.placing) return;
    e.stopPropagation();
    const d = districtOf[p.id];
    // Tocar un pin abre su ficha; tocar el pin del lugar abierto vuelve al distrito
    if (S.view.type === 'place' && S.view.id === p.id) return openDistrict(d.id, { refit: true });
    track('pin_tapped', { place: p.id, type: p.type, district: d?.id, view: S.view.type });
    openPlace(p.id, 'pin');
  };
  return { marker: new maplibregl.Marker({ element: wrap }).setLngLat(ll(p)).addTo(map), el, lvl: -1 };
}
export function drawPins() {
  if (!map) return;
  drawGpsArea();
  const cur = currentDistrict();
  const homeList = !cur && S.view.type === 'home' && S.typeFilter;           // portada con filtro: pines de los resultados
  const key = cur ? cur.id + S.statusFilter : homeList ? 'home' + S.typeFilter : null;
  const enter = key && pinsKey !== key;
  pinsKey = key;
  const want = new Set((cur ? cur.places.filter((p) => passStatus(p) || S.view.id === p.id) : homeList ? homeResults() : []).map((p) => p.id));
  for (const [id, m] of pinMarkers) if (!want.has(id)) { m.marker.remove(); pinMarkers.delete(id); }
  for (const id of want) {
    let m = pinMarkers.get(id);
    const fresh = !m;
    if (fresh) { m = makePin(BYID[id]); pinMarkers.set(id, m); }
    const l = lvl(id);
    const cls = `pin v${l}${S.selId === id ? ' sel' : ''}${fresh && enter ? ' enter' : ''}`;
    if (m.el.className !== cls && !(m.el.classList.contains('flash') && cls === m.el.className.replace(' flash', ''))) m.el.className = cls;
    if (m.lvl !== l) { m.lvl = l; m.el.innerHTML = l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : ''; }
  }
  clusterPins();
}

// ---------- Agrupación de pines: los que se tocan en pantalla se juntan en un círculo con el número ----------
const CLUSTER_PX = 30, FAN_ZOOM = 16;
const clusterMarkers = [];
export function clusterPins() {
  if (!map) return;
  clusterMarkers.splice(0).forEach((m) => m.remove());
  const items = [...pinMarkers].map(([id, m]) => ({ id, m, p: BYID[id], pt: map.project(ll(BYID[id])) }));
  const keep = (it) => it.id === S.selId || it.id === S.view.id;            // el seleccionado nunca se agrupa
  const used = new Set();
  for (const it of items) {
    if (used.has(it.id)) continue;
    used.add(it.id);
    const g = [it];
    if (!keep(it)) for (const o of items) {
      if (!used.has(o.id) && !keep(o) && Math.hypot(o.pt.x - it.pt.x, o.pt.y - it.pt.y) < CLUSTER_PX) { g.push(o); used.add(o.id); }
    }
    // Muy cerca (zoom ≥ 16): no se agrupan; los que siguen solapados se abren en abanico alrededor de su punto
    const fan = g.length > 1 && map.getZoom() >= FAN_ZOOM;
    g.forEach((x, i) => {
      const disp = g.length > 1 && !fan ? 'none' : ''; const w = x.m.marker.getElement();
      if (w.style.display !== disp) w.style.display = disp;
      const a = (i / g.length) * 2 * Math.PI - Math.PI / 2, r = 15 + g.length * 2;
      x.m.marker.setOffset(fan ? [Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)] : [0, 0]);
    });
    if (g.length < 2 || fan) continue;
    const ps = g.map((x) => x.p), done = ps.filter((x) => lvl(x.id) > 0).length, gps = ps.filter((x) => lvl(x.id) === 2).length;
    const el = document.createElement('button');
    el.className = 'cluster' + (gps === ps.length ? ' all-gps' : done === ps.length ? ' all' : done ? ' some' : '');
    el.style.setProperty('--p', `${(done / ps.length) * 360}deg`);
    el.innerHTML = `<span>${ps.length}</span>`;
    el.setAttribute('aria-label', `${ps.length}`);
    ['mousedown', 'touchstart', 'pointerdown', 'dblclick'].forEach((ev) => el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    el.onclick = (e) => {
      e.stopPropagation();
      const b = ps.reduce((a, x) => [Math.min(a[0], x.coords[1]), Math.min(a[1], x.coords[0]), Math.max(a[2], x.coords[1]), Math.max(a[3], x.coords[0])], [180, 90, -180, -90]);
      track('cluster_tapped', { count: ps.length });
      // Acercar en línea recta (easeTo) hasta que el grupo quepa; nunca alejar, y como mínimo hasta el zoom del abanico
      const z0 = map.getZoom(), cur = map.getPadding();
      if (cur.top || cur.bottom || cur.left || cur.right) map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      const P = pad(sheet.dataset.state), AIR = 48;   // aire extra: los pines no quedan pegados a los bordes visibles
      const cam = map.cameraForBounds(b, { padding: { top: P.top + AIR, bottom: P.bottom + AIR, left: P.left + AIR, right: P.right + AIR } });
      const zoom = Math.max(Math.min(cam?.zoom ?? z0 + 2, FAN_ZOOM + 1), z0 + 1);
      map.easeTo({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom, offset: centerOffset(sheet.dataset.state), duration: 600 });
    };
    const c = ps.reduce((a, x) => [a[0] + x.coords[1] / ps.length, a[1] + x.coords[0] / ps.length], [0, 0]);
    clusterMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(c).addTo(map));
  }
}

// ---------- Barrio nuevo pisado con GPS: destello dorado sobre el mapa ----------
export function flashBarrio(b) {
  const src = map?.getSource('b-flash');
  if (!src) return;
  src.setData(b.feature);
  const t0 = performance.now(), D = 2600;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / D);
    const o = 0.42 * Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k * 0.6);
    map.setPaintProperty('b-flash-fill', 'fill-opacity', k < 1 ? o : 0);
    map.setPaintProperty('b-flash-line', 'line-opacity', k < 1 ? 0.9 * (1 - k) : 0);
    if (k < 1) requestAnimationFrame(step); else src.setData({ type: 'FeatureCollection', features: [] });
  };
  requestAnimationFrame(step);
}

// Posición propia
let meMarker = null;
export function showMeOnMap(pos) {
  if (!map) return;
  const c = [pos.coords[1], pos.coords[0]];
  if (meMarker) meMarker.setLngLat(c);
  else { const el = document.createElement('div'); el.className = 'me'; meMarker = new maplibregl.Marker({ element: el }).setLngLat(c).addTo(map); }
}
export const gpsAreaId = () => lastArea;   // tests e2e
