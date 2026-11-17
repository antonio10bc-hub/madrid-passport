(() => {
  // ---------- Config ----------
  // Radio para validar por GPS (m). Parques y estadios son grandes: margen mayor. Se suma la precisión del GPS (máx. 150 m).
  const GPS_RADIUS = 300, GPS_RADIUS_BIG = 600, BIG_TYPES = ['Parque', 'Estadio'];
  const KEY = 'mp.visits.v1', KEY_BADGES = 'mp.badges.v1';
  const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
  // Info de acceso genérica por tipo (no inventamos horarios concretos)
  const ACCESS = {
    Plaza: 'Espacio público · acceso libre 24 h', Calle: 'Espacio público · acceso libre', Barrio: 'Espacio público · acceso libre',
    Parque: 'Acceso libre · consulta horario de apertura', Gastronomía: 'Establecimiento · consulta horario',
    Mercado: 'Consulta horario de apertura', Museo: 'Consulta horario y precio en la web oficial',
    Monumento: 'Exterior libre · interior: consulta horario y precio', Iglesia: 'Consulta horario de culto y visitas',
    Cultura: 'Consulta programación, horario y precio', Estadio: 'Tour y partidos: consulta en la web oficial',
    Mirador: 'Consulta horario y precio',
  };
  const TI = (t) => MP_ICON(t);             // icono vectorial por tipo (js/icons.js)
  const TYPE_PLURAL = { Museo: 'Museos', Parque: 'Parques', Mercado: 'Mercados', Plaza: 'Plazas', Monumento: 'Monumentos', Iglesia: 'Iglesias', Mirador: 'Miradores', Cultura: 'Cultura', Estadio: 'Estadios', Barrio: 'Barrios', Calle: 'Calles', Gastronomía: 'Gastronomía' };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const isDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

  // ---------- Estado ----------
  let visits = {};
  try { visits = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  let badgesUnlocked = {};
  try { badgesUnlocked = JSON.parse(localStorage.getItem(KEY_BADGES)) || {}; } catch {}
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(visits)); localStorage.setItem(KEY_BADGES, JSON.stringify(badgesUnlocked)); } catch {}
    scheduleSync();
  };

  // ---------- Cuenta (Google vía Supabase) y sincronización ----------
  let syncState = 'idle', syncT = null, lastSync = 0;   // idle | syncing | ok | error
  function scheduleSync() {
    if (!window.MPAuth?.user) return;
    clearTimeout(syncT); syncT = setTimeout(pushNow, 1200);
  }
  async function pushNow() {
    if (!MPAuth.user) return;
    syncState = 'syncing'; renderAccount();
    try { await MPAuth.push(visits, badgesUnlocked); syncState = 'ok'; lastSync = Date.now(); }
    catch (e) { console.error(e); syncState = 'error'; }
    renderAccount();
  }
  // Fusión al iniciar sesión: por lugar, el nivel más alto y las fechas más antiguas; logros: unión
  function mergeVisits(a, b) {
    const out = { ...a };
    for (const [id, v] of Object.entries(b || {})) {
      const o = out[id];
      if (!o) { out[id] = v; continue; }
      const min = (x, y) => (x && y ? Math.min(x, y) : x || y);
      out[id] = { lvl: Math.max(o.lvl || 0, v.lvl || 0), t: min(o.t, v.t), gpsAt: min(o.gpsAt, v.gpsAt), gps: o.gps || v.gps };
      if (!out[id].gpsAt) delete out[id].gpsAt;
      if (!out[id].gps) delete out[id].gps;
    }
    return out;
  }
  async function onAuth(user) {
    if (!user) { syncState = 'idle'; renderAccount(); return; }
    syncState = 'syncing'; renderAccount();
    try {
      const remote = await MPAuth.pull();
      visits = mergeVisits(visits, remote?.visits);
      const rb = remote?.badges || {};
      for (const [k, t] of Object.entries(rb)) badgesUnlocked[k] = badgesUnlocked[k] ? Math.min(badgesUnlocked[k], t) : t;
      try { localStorage.setItem(KEY, JSON.stringify(visits)); localStorage.setItem(KEY_BADGES, JSON.stringify(badgesUnlocked)); } catch {}
      await pushNow();
      if (DISTRICTS.length) render({ keepScroll: true });
    } catch (e) { console.error(e); syncState = 'error'; renderAccount(); }
  }
  const GOOGLE_G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function accountHTML() {
    if (!window.MPAuth?.enabled) return debug ? '<div class="acct off">Inicio de sesión sin configurar (js/config.js)</div>' : '';
    const u = MPAuth.user;
    if (!u) return `<div class="acct"><div class="acct-txt"><b>Guarda tu pasaporte</b><small>Inicia sesión para no perder tu progreso y usarlo en otros dispositivos.</small></div>
      <button class="gbtn" id="login">${GOOGLE_G}<span>Entrar con Google</span></button></div>`;
    const m = u.user_metadata || {}, name = m.full_name || m.name || u.email;
    const st = { syncing: 'Sincronizando…', ok: 'Guardado en la nube', error: 'Error al sincronizar · reintentar', idle: 'Conectado' }[syncState];
    return `<div class="acct in">${m.avatar_url ? `<img class="avatar" src="${esc(m.avatar_url)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${esc((name || '?')[0].toUpperCase())}</span>`}
      <div class="acct-txt"><b>${esc(name)}</b><small class="sync ${syncState}" ${syncState === 'error' ? 'id="retry"' : ''}>${st}</small></div>
      <button class="link" id="logout">Salir</button></div>`;
  }
  function renderAccount() {
    const el = document.getElementById('acct-slot');
    if (!el) return;
    el.innerHTML = accountHTML();
    el.querySelector('#login')?.addEventListener('click', () => MPAuth.signIn().catch(() => toast('No se pudo iniciar sesión', true)));
    el.querySelector('#logout')?.addEventListener('click', async () => { await MPAuth.signOut(); toast('Sesión cerrada · tu progreso sigue en este móvil'); });
    el.querySelector('#retry')?.addEventListener('click', pushNow);
  }
  const lvl = (id) => visits[id]?.lvl || 0;
  const progress = (places) => ({ done: places.filter((p) => lvl(p.id) > 0).length, gps: places.filter((p) => lvl(p.id) === 2).length, total: places.length });

  const PLACES = window.PLACES;
  const BYID = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  let DISTRICTS = [];
  const districtOf = {};                  // placeId -> distrito
  // Vista actual: home | district | place
  let view = { type: 'home' };
  let query = '', typeFilter = null, statusFilter = 'all';
  let selId = null, myPos = null;
  const currentDistrict = () => (view.type === 'district' ? DISTRICTS.find((d) => d.id === view.id) : view.type === 'place' ? districtOf[view.id] : null);

  // ---------- Geo utils ----------
  const dist = ([a, b], [c, d]) => {
    const R = 6371e3, r = Math.PI / 180;
    const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
  const radiusFor = (p, acc) => (BIG_TYPES.includes(p.type) ? GPS_RADIUS_BIG : GPS_RADIUS) + Math.min(acc || 0, 150);
  const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
  const inRing = ([x, y], ring) => {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  const inGeom = (pt, g) => polys(g).some((p) => inRing(pt, p[0]) && !p.slice(1).some((h) => inRing(pt, h)));
  const bboxOf = (g) => {
    let b = [180, 90, -180, -90];
    polys(g).forEach((p) => p[0].forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }));
    return b;
  };
  const labelPoint = (g) => {
    const big = polys(g).sort((a, b) => b[0].length - a[0].length)[0];
    const [x0, y0, x1, y1] = bboxOf({ type: 'Polygon', coordinates: big });
    const c = [(x0 + x1) / 2, (y0 + y1) / 2];
    if (inRing(c, big[0])) return c;
    for (let k = 1; k < 10; k++) for (const dx of [-1, 1]) {
      const p = [c[0] + (dx * k * (x1 - x0)) / 20, c[1]];
      if (inRing(p, big[0])) return p;
    }
    return c;
  };
  const ll = (p) => [p.coords[1], p.coords[0]];

  // ---------- UI utils ----------
  let toastT;
  const toast = (msg, err) => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 2600);
  };
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_GPS = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><path d="M9.5 10l2 2 3.5-3.5"/></svg>';
  const fmtDate = (t) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: new Date(t).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  const fmtTime = (t) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dayLabel = (t) => {
    const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const sheet = $('#sheet'), body = $('#sheet-body');
  // Medidas cacheadas (leer offsetHeight en cada navegación forzaba recalcular el diseño)
  const dims = {};
  const measure = () => { dims.app = $('#app').offsetHeight; dims.sheet = sheet.offsetHeight; dims.top = $('.topbar').offsetHeight; dims.tab = $('.tabbar').offsetHeight; };
  addEventListener('resize', () => { measure(); setSheet(sheet.dataset.state); });
  const sheetVisible = (state = sheet.dataset.state) => ({ min: 64, peek: 150, half: dims.sheet * 0.58, full: dims.sheet }[state]);
  const setSheet = (state) => {
    sheet.dataset.state = state;
    if (!dims.app) measure();
    $('#app').style.setProperty('--sheet-vis', (state === 'full' ? 0 : Math.min(sheetVisible(state), dims.app * 0.6)) + 'px');
  };
  const pad = (state) => {
    if (!dims.app) measure();
    const h = dims.app, top = dims.top, tb = dims.tab;
    return { top: top + 16, bottom: Math.min(sheetVisible(state) + tb + 20, h - top - 140), left: 28, right: 28 };
  };

  // ---------- Mapa ----------
  let map, LABEL_ORDER = [];
  const markers = { pins: [], me: null };
  const FALLBACK_STYLE = () => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': css('--map-bg') } }] });
  async function loadStyle() {
    try { const r = await fetch(STYLE[isDark() ? 'dark' : 'light']); if (r.ok) return await r.json(); } catch {}
    return FALLBACK_STYLE();
  }
  let geo;
  function addLayers() {
    const RED = css('--red');
    map.addSource('distritos', { type: 'geojson', data: geo });
    map.addSource('barrios', { type: 'geojson', data: 'data/barrios.geojson' });
    map.addLayer({ id: 'd-fill', type: 'fill', source: 'distritos', paint: {
      'fill-color': RED,
      'fill-opacity': ['case',
        ['boolean', ['feature-state', 'dim'], false], 0,
        ['boolean', ['feature-state', 'sel'], false], 0.04,
        ['+', 0.07, ['*', 0.33, ['coalesce', ['feature-state', 'p'], 0]]]],
    }});
    map.addLayer({ id: 'd-mask', type: 'fill', source: 'distritos', paint: {
      'fill-color': css('--bg'), 'fill-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.65, 0],
    }});
    map.addLayer({ id: 'b-line', type: 'line', source: 'barrios', layout: { visibility: 'none' }, paint: {
      'line-color': RED, 'line-opacity': 0.35, 'line-width': 0.8, 'line-dasharray': [2, 2],
    }});
    map.addLayer({ id: 'd-line', type: 'line', source: 'distritos', paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], RED, css('--map-line')],
      'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.5, 1.2],
    }});
  }

  async function initMap() {
    map = new maplibregl.Map({
      container: 'map', style: await loadStyle(), center: [-3.70, 40.42], zoom: 10.5,
      pixelRatio: Math.min(devicePixelRatio || 1, 2), fadeDuration: 0, renderWorldCopies: false, maxPitch: 0,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    // Doble toque = zoom de MapLibre pisaba el re-centrado al volver a tocar un pin o el distrito abierto.
    // El zoom manual queda con pellizco / rueda.
    map.doubleClickZoom.disable();
    map.addControl(new maplibregl.AttributionControl({ compact: true,
      customAttribution: '© OpenStreetMap · OpenFreeMap · Ayto. Madrid · Wikipedia' }), 'top-left');

    geo = await (await fetch('data/distritos.geojson')).json();
    DISTRICTS = geo.features.map((f) => ({
      id: f.properties.id, name: f.properties.name, short: f.properties.name.split('-')[0], fid: f.id, feature: f,
      bbox: bboxOf(f.geometry), label: labelPoint(f.geometry),
      places: PLACES.filter((p) => (p.district ? p.district === f.properties.id : inGeom(ll(p), f.geometry))),
    }));
    DISTRICTS.forEach((d) => d.places.forEach((p) => (districtOf[p.id] = d)));
    PLACES.forEach((p) => (p._search = norm(`${p.name} ${p.zone || ''} ${p.type} ${districtOf[p.id]?.name || ''}`)));
    DISTRICTS.forEach((d) => (d.ini = d.name.replace(/-.*/, '').split(' ').filter((w) => w.length > 2).map((w) => w[0]).join('').slice(0, 2)));
    PLACES.forEach((p) => { if (!districtOf[p.id]) console.warn('Sin distrito:', p.id); });
    badgesUnlocked = Object.keys(badgesUnlocked).length ? badgesUnlocked : unlockedNow(true);

    await new Promise((r) => (map.loaded() ? r() : map.on('load', r)));
    addLayers();
    map.on('click', (e) => {
      if (placing) return setFake([e.lngLat.lat, e.lngLat.lng]);
      const f = map.queryRenderedFeatures(e.point, { layers: ['d-fill'] })[0];
      if (!f) return;
      const cur = currentDistrict();
      if (cur && cur.fid === f.id) {
        // Tap en el distrito abierto: si hay un lugar seleccionado (o su ficha abierta), primero vuelve al distrito;
        // si no, sale a la vista de Madrid
        if (view.type === 'place' || selId) openDistrict(cur.id, { refit: true });
        else goHome();
      }
      else openDistrict(f.properties.id);
    });
    map.on('mouseenter', 'd-fill', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'd-fill', () => (map.getCanvas().style.cursor = ''));
    map.on('dragstart', () => setFollow(false));

    DISTRICTS.forEach((d) => {
      const el = document.createElement('button');
      el.className = 'd-label';
      el.innerHTML = `<span>${esc(d.short)}</span>`;
      el.onclick = (e) => { e.stopPropagation(); if (!placing) openDistrict(d.id); };
      d.labelMarker = new maplibregl.Marker({ element: el }).setLngLat(d.label).addTo(map);
    });
    LABEL_ORDER = [...DISTRICTS].sort((x, y) => y.places.length - x.places.length);
    map.on('moveend', fitLabels);
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

    // Modo oscuro: cambia estilo del mapa y recrea capas
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
      map.setStyle(await loadStyle(), { diff: false });
      map.once('style.load', () => { addLayers(); for (const k in lastPaint) delete lastPaint[k]; lastBLine = undefined; paintDistricts(); });
    });

    fitCity(false);
    render();
    if (debug && fakePos) { showMe({ coords: fakePos, acc: 5 }); checkNearby(myPos); }
  }

  // OJO: `padding` en flyTo/easeTo queda guardado en el mapa y se suma a los fitBounds siguientes
  // (si no cabe, MapLibre no mueve la cámara). Para centrar un punto usamos `offset`, que no persiste.
  const centerOffset = (state) => { const p = pad(state); return [(p.left - p.right) / 2, (p.top - p.bottom) / 2]; };
  const fit = (bounds, opts) => {
    const cur = map.getPadding();
    if (cur.top || cur.bottom || cur.left || cur.right) map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    map.fitBounds(bounds, opts);
  };
  const fitCity = (animate = true) => {
    const b = DISTRICTS.reduce((a, d) => [Math.min(a[0], d.bbox[0]), Math.min(a[1], d.bbox[1]), Math.max(a[2], d.bbox[2]), Math.max(a[3], d.bbox[3])], [180, 90, -180, -90]);
    fit(b, { padding: pad('peek'), animate, duration: 700 });
  };

  // Etiquetas sin solapes: prioridad a los distritos con más lugares
  function fitLabels() {
    const placed = [], hide = view.type !== 'home';
    LABEL_ORDER.forEach((d) => {
      const el = d.labelMarker.getElement();
      const disp = hide ? 'none' : '';
      if (el.style.display !== disp) el.style.display = disp;
      if (hide) return;
      d.lw ||= el.offsetWidth / 2 + 3; d.lh ||= el.offsetHeight / 2 + 2;   // medidas cacheadas (texto fijo)
      const c = map.project(d.label);
      const r = [c.x - d.lw, c.y - d.lh, c.x + d.lw, c.y + d.lh];
      const ok = !placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      const vis = ok ? 'visible' : 'hidden';
      if (el.style.visibility !== vis) el.style.visibility = vis;
      if (ok) placed.push(r);
    });
  }


  const lastPaint = {};
  let lastBLine;
  function paintDistricts() {
    if (!map.getSource('distritos')) return;
    const cur = currentDistrict();
    DISTRICTS.forEach((d) => {
      const pr = progress(d.places);
      const st = { sel: cur?.id === d.id, dim: !!cur && cur.id !== d.id, p: pr.total ? pr.done / pr.total : 0 };
      const k = `${st.sel}|${st.dim}|${st.p}`;
      if (lastPaint[d.fid] !== k) { lastPaint[d.fid] = k; map.setFeatureState({ source: 'distritos', id: d.fid }, st); }
    });
    const bl = cur?.id || '';
    if (bl !== lastBLine) {
      lastBLine = bl;
      map.setLayoutProperty('b-line', 'visibility', cur ? 'visible' : 'none');
      if (cur) map.setFilter('b-line', ['==', ['get', 'district'], cur.id]);
    }
    fitLabels();
  }


  const passStatus = (p) => statusFilter === 'all' || (statusFilter === 'todo' && lvl(p.id) === 0) ||
    (statusFilter === 'done' && lvl(p.id) > 0) || (statusFilter === 'gps' && lvl(p.id) === 2);

  // El wrapper del Marker lo posiciona MapLibre con transform: sin transiciones. Escala/fade en el .pin interior.
  let pinsKey = null;
  const pinMarkers = new Map();               // placeId -> { marker, el }
  function makePin(p) {
    const wrap = document.createElement('div'), el = document.createElement('div');
    el.dataset.id = p.id; wrap.appendChild(el);
    // Que los toques en el pin no lleguen a los gestos del mapa (arrastre/doble toque)
    ['mousedown', 'touchstart', 'pointerdown', 'dblclick'].forEach((ev) => wrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    wrap.onclick = (e) => {
      if (placing) return;
      e.stopPropagation();
      const d = districtOf[p.id];
      if (view.type === 'place') return view.id === p.id ? openDistrict(d.id, { refit: true }) : openPlace(p.id);
      if (selId === p.id) return deselect(d);                 // 2º tap: deseleccionar y centrar distrito
      if (sheet.dataset.state === 'min') setSheet('half');
      selectFromMap(p.id);
    };
    return { marker: new maplibregl.Marker({ element: wrap }).setLngLat(ll(p)).addTo(map), el, lvl: -1 };
  }
  function drawPins() {
    const cur = currentDistrict();
    const key = cur ? cur.id + statusFilter : null;
    const enter = key && pinsKey !== key;
    pinsKey = key;
    const want = new Set(cur ? cur.places.filter((p) => passStatus(p) || view.id === p.id).map((p) => p.id) : []);
    for (const [id, m] of pinMarkers) if (!want.has(id)) { m.marker.remove(); pinMarkers.delete(id); }
    for (const id of want) {
      let m = pinMarkers.get(id);
      const fresh = !m;
      if (fresh) { m = makePin(BYID[id]); pinMarkers.set(id, m); }
      const l = lvl(id);
      const cls = `pin v${l}${selId === id ? ' sel' : ''}${fresh && enter ? ' enter' : ''}`;
      if (m.el.className !== cls && !(m.el.classList.contains('flash') && cls === m.el.className.replace(' flash', ''))) m.el.className = cls;
      if (m.lvl !== l) { m.lvl = l; m.el.innerHTML = l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : ''; }
    }
  }


  // ---------- Geolocalización ----------
  // Modo debug: GPS falso (?debug=1 o pulsación larga en el botón de ubicación)
  let debug = false, fakePos = null, placing = false;
  try { debug = new URLSearchParams(location.search).has('debug') || localStorage.getItem('mp.debug') === '1'; fakePos = JSON.parse(localStorage.getItem('mp.fake')); } catch {}
  function setDebug(on) {
    debug = on;
    try { localStorage.setItem('mp.debug', on ? '1' : '0'); } catch {}
    $('#debug').hidden = !on;
    if (on) { stopWatch(); toast('GPS falso activado'); if (fakePos) { showMe({ coords: fakePos, acc: 5 }); checkNearby(myPos); } setPlacing(!fakePos); }
    else { setPlacing(false); toast('GPS falso desactivado'); maybeWatch(); }
  }
  function setPlacing(on) {
    placing = on;
    $('#debug').classList.toggle('placing', on);
    $('#app').classList.toggle('placing', on);
    $('#debug-move').textContent = on ? 'Cancelar' : 'Mover';
    $('#debug-pos').textContent = on ? 'toca el mapa para colocarte' : fakePos ? `${fakePos[0].toFixed(4)}, ${fakePos[1].toFixed(4)}` : 'sin posición';
  }
  function setFake(c) {
    fakePos = c;
    try { localStorage.setItem('mp.fake', JSON.stringify(c)); } catch {}
    setPlacing(false);
    toast('Posición falsa fijada');
    onPosition({ coords: c, acc: 5 });
    if (view.type !== 'home') render({ keepScroll: true });
  }
  const getPos = () => new Promise((res, rej) => {
    if (debug) return fakePos ? res({ coords: fakePos, acc: 5 }) : rej(new Error('Pulsa «Mover» y toca el mapa para fijar tu posición falsa'));
    if (!navigator.geolocation) return rej(new Error('GPS no disponible'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ coords: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }),
      rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  });
  function showMe(pos) {
    myPos = pos;
    if (!map) return;
    const c = [pos.coords[1], pos.coords[0]];
    if (markers.me) markers.me.setLngLat(c);
    else { const el = document.createElement('div'); el.className = 'me'; markers.me = new maplibregl.Marker({ element: el }).setLngLat(c).addTo(map); }
  }
  // Seguimiento continuo de la posición
  let watchId = null, follow = false;
  function onPosition(pos) {
    showMe(pos);
    if (follow) map.easeTo({ center: [pos.coords[1], pos.coords[0]], duration: 600 });
    checkNearby(pos);
  }
  function startWatch() {
    if (watchId != null || debug || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      (p) => onPosition({ coords: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }),
      () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
  }
  function stopWatch() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
  function maybeWatch() {   // si el permiso ya está concedido, seguimos la posición sin preguntar
    navigator.permissions?.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') startWatch(); }).catch(() => {});
  }
  function setFollow(on) { follow = on; $('#locate').classList.toggle('active', on); }

  let pressT, longPressed = false;
  $('#locate').addEventListener('pointerdown', () => { longPressed = false; pressT = setTimeout(() => { longPressed = true; setDebug(!debug); }, 700); });
  ['pointerup', 'pointerleave'].forEach((ev) => $('#locate').addEventListener(ev, () => clearTimeout(pressT)));
  $('#locate').onclick = async () => {
    if (longPressed) return;
    if (follow) return setFollow(false);
    try {
      const p = await getPos();
      onPosition(p); startWatch(); setFollow(!debug);
      map.flyTo({ center: [p.coords[1], p.coords[0]], zoom: Math.max(map.getZoom(), 15.5), offset: centerOffset(), duration: 800 });
    } catch { toast('No se pudo obtener tu ubicación', true); }
  };
  $('#debug-off').onclick = () => setDebug(false);
  $('#debug-move').onclick = () => setPlacing(!placing);
  $('#debug-validate').onclick = () => validateAll();
  $('#debug-reset').onclick = () => { visits = {}; badgesUnlocked = {}; save(); render(); toast('Progreso borrado'); };

  // ---------- Wikipedia (desde el navegador del usuario) ----------
  const wikiSummary = async (title) => {
    const r = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (!r.ok) throw new Error('wiki ' + r.status);
    return r.json();
  };
  // Completa foto/descripción que falten en data.js; cachea en localStorage
  async function enrich(p) {
    if ((p.desc && p.img) || !p.wiki || p._tried) return false;
    p._tried = true;
    let s = null;
    try { s = JSON.parse(localStorage.getItem('mp.wiki.' + p.id)); } catch {}
    if (!s) {
      try {
        const w = await wikiSummary(p.wiki);
        if (w.type === 'disambiguation') return false;
        s = { img: w.thumbnail?.source, desc: w.extract, url: w.content_urls?.mobile?.page };
        try { localStorage.setItem('mp.wiki.' + p.id, JSON.stringify(s)); } catch {}
      } catch { return false; }
    }
    p.img ||= s.img; p.desc ||= s.desc; p.url ||= s.url;
    return true;
  }
  // Debug: compara nuestras coordenadas con Wikipedia y descarga un informe JSON
  async function validateAll() {
    const list = PLACES.filter((p) => p.wiki), out = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      $('#debug-pos').textContent = `validando ${i + 1}/${list.length}…`;
      let w = null;
      try { w = await wikiSummary(p.wiki); } catch {}
      const c = w?.coordinates;
      out.push({ id: p.id, title: w?.title || null, kind: w?.type || 'error', ours: p.coords, wiki: c ? [c.lat, c.lon] : null,
        diff: c ? Math.round(dist(p.coords, [c.lat, c.lon])) : null, img: w?.thumbnail?.source || null, desc: w?.extract || null,
        url: w?.content_urls?.mobile?.page || null });
      await new Promise((r) => setTimeout(r, 120));
    }
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'validacion-lugares.json'; a.click();
    const far = out.filter((o) => o.diff > 150).length, nok = out.filter((o) => !o.wiki).length;
    setPlacing(false);
    toast(`Informe descargado · ${far} lejos (>150 m) · ${nok} sin coords`);
  }

  // ---------- Sugerencia automática al estar cerca ----------
  const dismissed = new Set();
  let suggested = null;
  function checkNearby(pos) {
    let best = null;
    if (pos) for (const p of PLACES) {
      if (lvl(p.id) === 2 || dismissed.has(p.id)) continue;
      const d = dist(pos.coords, p.coords);
      if (d <= radiusFor(p, pos.acc) && (!best || d < best.d)) best = { p, d };
    }
    const el = $('#suggest');
    suggested = best?.p || null;
    if (!suggested) { el.classList.remove('show'); return; }
    $('#suggest-name').textContent = suggested.name;
    $('#suggest-sub').textContent = `${lvl(suggested.id) === 1 ? 'Ya lo marcaste · ' : ''}a ${fmtDist(best.d)} · ¿confirmar por GPS?`;
    el.classList.add('show');
  }
  $('#suggest-ok').onclick = () => {
    if (!suggested || !myPos) return;
    const id = suggested.id;
    visits[id] = { ...(visits[id] || { t: Date.now() }), lvl: 2, gpsAt: Date.now(), gps: myPos.coords };
    gpsStamp(suggested);
    commit();
    checkNearby(myPos);
  };
  $('#suggest-no').onclick = () => { if (suggested) dismissed.add(suggested.id); checkNearby(myPos); };
  $('#suggest-open').onclick = () => suggested && openPlace(suggested.id);

  // ---------- Logros ----------
  const badgeState = () => ({ places: PLACES, districts: DISTRICTS, lvl, visits });
  function unlockedNow(silent) {
    const s = badgeState(), out = { ...(silent ? {} : badgesUnlocked) };
    MP_BADGES.forEach((b) => { const [n, goal] = b.test(s); if (goal > 0 && n >= goal && !out[b.id]) out[b.id] = Date.now(); });
    return out;
  }
  function checkBadges() {
    const before = badgesUnlocked, after = unlockedNow(false);
    const fresh = MP_BADGES.filter((b) => after[b.id] && !before[b.id]);
    badgesUnlocked = after;
    if (fresh.length) setTimeout(() => toast(`Logro desbloqueado: ${fresh[0].name}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`), 900);
  }

  // ---------- Vistas ----------
  function renderRing() {
    const pr = progress(PLACES);
    const pct = Math.round((pr.done / pr.total) * 100);
    $('#ring-fg').style.strokeDashoffset = 100 - pct;
    $('#ring-txt').textContent = pct + '%';
  }

  const TYPE_COUNT = PLACES.reduce((m, p) => ((m[p.type] = (m[p.type] || 0) + 1), m), {});
  const TYPES = Object.keys(TYPE_COUNT).sort((a, b) => TYPE_COUNT[b] - TYPE_COUNT[a]);
  const typeChips = () => {
    const types = TYPES;
    return `<div class="chips" id="type-chips">${types.map((t) => `<button class="chip ${typeFilter === t ? 'on' : ''}" data-t="${esc(t)}">${MP_ICON(t, 'ico ico-s')}${esc(TYPE_PLURAL[t] || t)}</button>`).join('')}</div>`;
  };

  function placeItem(p, extra = '') {
    const l = lvl(p.id), d = districtOf[p.id];
    const dd = myPos ? ` · ${fmtDist(dist(myPos.coords, p.coords))}` : '';
    return `<button class="pitem" data-place="${p.id}">
      <span class="pthumb t-${l}">${l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : TI(p.type)}</span>
      <span class="p-info"><strong>${esc(p.name)}</strong><small>${esc(p.type)} · ${esc(d?.name || '')}${dd}${extra}</small></span>
      <span class="chev"></span></button>`;
  }

  function homeListHTML() {
    const searching = query.trim() || typeFilter;
    if (searching) {
      const q = norm(query.trim());
      const res = PLACES.filter((p) => (!typeFilter || p.type === typeFilter) && (!q || p._search.includes(q)));
      return `<div class="sec-sub">${res.length} resultado${res.length === 1 ? '' : 's'}</div>
        ${res.map((p) => placeItem(p)).join('') || '<div class="empty-state">Sin resultados</div>'}`;
    }
    const pr = progress(PLACES);
    return `<div class="sec-title"><h2>Distritos</h2><span>${pr.done}/${pr.total} lugares</span></div>` + LABEL_ORDER.map((d) => {
      const p = progress(d.places);
      return `<button class="row ${p.total && p.done === p.total ? 'done' : ''}" data-id="${d.id}">
        <div class="badge">${d.ini}</div>
        <div class="r-info"><strong>${esc(d.name)}</strong><small>${p.total} lugares${p.gps ? ` · ${p.gps} GPS` : ''}</small>
          <div class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></div></div>
        <span class="r-count">${p.done}/${p.total}</span><span class="chev"></span>
      </button>`;
    }).join('');
  }
  function bindHomeList() {
    body.querySelectorAll('.row').forEach((el) => (el.onclick = () => openDistrict(el.dataset.id)));
    bindPlaceItems(body);
  }
  function renderHome() {
    $('#title').textContent = 'Explora Madrid';
    const searching = query.trim() || typeFilter;
    body.innerHTML = `
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="Buscar lugares, barrios…" value="${esc(query)}" autocomplete="off">
        ${searching ? '<button id="q-clear" aria-label="Limpiar búsqueda"><svg class="icon-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : ''}</div>
      ${typeChips()}
      <div id="home-list">${homeListHTML()}</div>`;
    const q = $('#q');
    let qT;
    q.oninput = () => {
      clearTimeout(qT);
      qT = setTimeout(() => {
        const was = !!(query.trim() || typeFilter);
        query = q.value;
        const now = !!(query.trim() || typeFilter);
        if (was !== now) { const pos = q.selectionStart; render({ keepScroll: true }); const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos); return; }
        $('#home-list').innerHTML = homeListHTML(); bindHomeList();
      }, 120);
    };
    q.onfocus = () => { if (sheet.dataset.state !== 'full') setSheet('full'); };
    $('#q-clear')?.addEventListener('click', () => { query = ''; typeFilter = null; render(); });
    body.querySelectorAll('[data-t]').forEach((el) => (el.onclick = () => { typeFilter = typeFilter === el.dataset.t ? null : el.dataset.t; render(); }));
    bindHomeList();
  }


  // ---------- Páginas del menú inferior: Diario / Logros ----------
  let tab = 'map';
  const page = $('#page'), pageBody = $('#page-body');
  function renderDiary() {
    const pr = progress(PLACES);
    const items = Object.entries(visits).filter(([id]) => BYID[id]).map(([id, v]) => ({ p: BYID[id], v, t: v.gpsAt || v.t || 0 })).sort((a, b) => b.t - a.t);
    const dComplete = DISTRICTS.filter((d) => d.places.length && d.places.every((p) => lvl(p.id) > 0)).length;
    let lastDay = '';
    const list = items.map(({ p, v, t }) => {
      const day = t ? dayLabel(t) : 'Sin fecha';
      const head = day !== lastDay ? `<h3 class="zone">${esc(day)}</h3>` : '';
      lastDay = day;
      return head + placeItem(p, t ? ` · ${fmtTime(t)}${v.lvl === 2 ? ' · GPS' : ''}` : '');
    }).join('');
    return `<div id="acct-slot"></div><div class="kpis">
        <div class="stat"><b>${pr.done}</b><small>Visitados</small></div>
        <div class="stat gold"><b>${pr.gps}</b><small>GPS</small></div>
        <div class="stat"><b>${dComplete}<span>/${DISTRICTS.length}</span></b><small>Distritos</small></div></div>
      ${list || '<div class="empty-state">Tu diario está vacío.<br>Marca tu primer lugar para empezar.</div>'}`;
  }
  // Logros como sellos de pasaporte (tinta con textura). Formas y giro fijos por logro.
  const GOLD_BADGES = new Set(['gps-1', 'gps-10']);   // el dorado significa siempre «verificado por GPS»
  // Atributos explícitos: el sello se usa como <img>, donde no llega el CSS de la app
  const inkIcon = (name, col, size, sw) => MP_ICON(name).replace('class="ico"', `width="${size}" height="${size}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`);
  function stampSVG(b, i, n, goal, date) {
    const shape = ['circle', 'rect', 'oct'][i % 3];
    const rot = [-9, 6, -4, 11, -7, 3, 8, -12, 5, -3, 9, -6, 7, -10, 4, -5, 10][i % 17];
    const OUT = { circle: '<circle cx="70" cy="70" r="58"/>', rect: '<rect x="14" y="28" width="112" height="84" rx="10"/>', oct: '<polygon points="48,12 92,12 128,48 128,92 92,128 48,128 12,92 12,48"/>' }[shape];
    const IN = { circle: '<circle cx="70" cy="70" r="44"/>', rect: '<rect x="22" y="36" width="96" height="68" rx="6"/>', oct: '<polygon points="52,22 88,22 118,52 118,88 88,118 52,118 22,88 22,52"/>' }[shape];
    if (!date) {
      const mu = css('--muted');
      return `<svg viewBox="0 0 140 140" class="pp-svg"><g fill="none" stroke="${mu}" stroke-width="1.5" stroke-dasharray="4 5" opacity=".45">${OUT}</g>
        <g transform="translate(58 50)" opacity=".4">${inkIcon(b.icon, mu, 24, 1.6)}</g>
        <text x="70" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="${mu}">${Math.min(n, goal)}/${goal}</text></svg>`;
    }
    const col = GOLD_BADGES.has(b.id) ? css('--gold') : css('--red');
    const top = shape === 'circle'
      ? `<path id="arc-${b.id}" d="M 70 70 m -51 0 a 51 51 0 1 1 102 0 a 51 51 0 1 1 -102 0" fill="none"/><text font-size="9.5" font-weight="800" letter-spacing="2.6" fill="${col}"><textPath href="#arc-${b.id}">MADRID PASSPORT · MADRID PASSPORT ·</textPath></text>`
      : `<text x="70" y="${shape === 'rect' ? 50 : 40}" text-anchor="middle" font-size="9" font-weight="800" letter-spacing="2" fill="${col}">MADRID</text>`;
    const d = new Date(date), when = `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase()} ${d.getFullYear()}`;
    return `<svg viewBox="0 0 140 140" class="pp-svg"><defs><filter id="ink-${b.id}"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="${i + 2}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>
      <g transform="rotate(${rot} 70 70)" filter="url(#ink-${b.id})" opacity=".92">
        <g fill="none" stroke="${col}"><g stroke-width="3.5">${OUT}</g><g stroke-width="1.5">${IN}</g></g>${top}
        <g transform="translate(55 ${shape === 'circle' ? 46 : 54})">${inkIcon(b.icon, col, 30, 2.2)}</g>
        <text x="70" y="${shape === 'circle' ? 92 : 98}" text-anchor="middle" font-size="${shape === 'circle' ? 8.5 : 10}" font-weight="800" letter-spacing="${shape === 'circle' ? 1 : 1.5}" fill="${col}">${when}</text></g></svg>`;
  }
  // Cada sello se convierte en <img> (data URI) y se cachea por estado + tema
  const stampCache = new Map();
  function stampImg(b, i, n, goal, date) {
    const k = `${b.id}|${date ? date : n + '/' + goal}|${isDark()}`;
    let html = stampCache.get(k);
    if (!html) {
      const svg = stampSVG(b, i, n, goal, date).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="280" height="280" ')
        .replace(/var\(--[a-z-]+\)/g, (v) => css(v.slice(4, -1)))
        .replace(/<text /g, '<text font-family="-apple-system,system-ui,sans-serif" ')
        .replace(/href="#/g, 'xlink:href="#');
      html = `<img class="pp-svg" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
      stampCache.set(k, html);
    }
    return html;
  }
  function renderBadges() {
    const s = badgeState();
    const got = MP_BADGES.filter((b) => badgesUnlocked[b.id]).length;
    // Conseguidos primero (por fecha), luego pendientes por % de avance
    const items = MP_BADGES.map((b, i) => { const [n, goal] = b.test(s); return { b, i, n, goal, date: badgesUnlocked[b.id] }; })
      .sort((x, y) => (x.date && y.date ? x.date - y.date : x.date ? -1 : y.date ? 1 : y.n / y.goal - x.n / x.goal));
    return `<div class="pp-head"><span>Mis sellos</span><span>${got} / ${MP_BADGES.length}</span></div>
      <div class="pp-grid">${items.map(({ b, i, n, goal, date }) => `<div class="pp ${date ? 'on' : ''}" title="${esc(b.desc)}">
        ${stampImg(b, i, n, goal, date)}<strong>${esc(b.name)}</strong><small>${date ? esc(b.desc) : esc(b.desc)}</small></div>`).join('')}</div>`;
  }

  function renderPage() {
    if (tab === 'map') return;
    $('#page-title').textContent = tab === 'diary' ? 'Diario' : 'Logros';
    pageBody.innerHTML = tab === 'diary' ? renderDiary() : renderBadges();
    bindPlaceItems(pageBody);
    renderAccount();
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    page.hidden = t === 'map';
    $('#app').classList.toggle('on-page', t !== 'map');   // el aviso de cercanía solo en el mapa
    if (t !== 'map') { pageBody.scrollTop = 0; renderPage(); }
  }
  document.querySelectorAll('.tabbar button').forEach((b) => (b.onclick = () => {
    if (b.dataset.tab === 'map' && tab === 'map') return goHome();   // tocar Mapa estando en el mapa: vista de Madrid
    setTab(b.dataset.tab);
  }));

  const bindPlaceItems = (root) => root.querySelectorAll('[data-place]').forEach((el) => (el.onclick = () => { setTab('map'); openPlace(el.dataset.place); }));

  function checks(p) {
    const l = lvl(p.id);
    return `<div class="checks">
      <button class="chk ${l >= 1 ? 'on' : ''}" data-a="1" data-id="${p.id}" aria-label="He estado">${ICON_CHECK}</button>
      <button class="chk gps ${l === 2 ? 'on' : ''}" data-a="2" data-id="${p.id}" ${l === 0 ? 'disabled' : ''} aria-label="Verificar con GPS">${ICON_GPS}</button>
    </div>`;
  }
  const bindChecks = () => body.querySelectorAll('.chk').forEach((el) => (el.onclick = (e) => { e.stopPropagation(); onCheck(el); }));

  function renderDistrict() {
    const d = currentDistrict(), pr = progress(d.places);
    $('#title').textContent = d.name;
    const zones = {};
    d.places.filter(passStatus).forEach((p) => (zones[p.zone || ''] ||= []).push(p));
    const row = (p) => {
      const l = lvl(p.id), v = visits[p.id];
      const dd = myPos ? ` · ${fmtDist(dist(myPos.coords, p.coords))}` : '';
      const sub = l === 2 ? `<small class="gps-ok">✓✓ GPS · ${fmtDate(v.gpsAt || v.t)}</small>`
        : l === 1 ? `<small>Visitado ${v.t ? fmtDate(v.t) : ''}${dd}</small>` : `<small>${esc(p.type)}${dd}</small>`;
      return `<div class="place${selId === p.id ? ' sel' : ''}" id="pl-${p.id}" data-open="${p.id}">
        <div class="p-info"><strong>${esc(p.name)}</strong>${sub}</div>${checks(p)}</div>`;
    };
    const F = [['all', 'Todos', pr.total], ['todo', 'Pendientes', pr.total - pr.done], ['done', 'Visitados', pr.done], ['gps', 'GPS', pr.gps]];
    const list = Object.entries(zones).map(([z, ps]) => `${z ? `<h3 class="zone">${esc(z)}</h3>` : ''}${ps.map(row).join('')}`).join('');
    body.innerHTML = `
      <button class="back" id="back">Distritos</button>
      <div class="d-head"><h2>${esc(d.name)}</h2><p>Distrito de Madrid · ${pr.done}/${pr.total} visitados · ${pr.gps} GPS</p></div>
      <div class="chips seg">${F.map(([k, t, n]) => `<button class="chip ${statusFilter === k ? 'on' : ''}" data-f="${k}">${t} <b>${n}</b></button>`).join('')}</div>
      ${list || '<div class="empty-state">Nada por aquí con este filtro</div>'}`;
    $('#back').onclick = goHome;
    body.querySelectorAll('[data-f]').forEach((el) => (el.onclick = () => { statusFilter = el.dataset.f; render({ keepScroll: true }); }));
    bindChecks();
    body.querySelectorAll('[data-open]').forEach((el) => (el.onclick = () => openPlace(el.dataset.open)));
  }

  function renderPlace() {
    const p = BYID[view.id], d = districtOf[p.id], l = lvl(p.id), v = visits[p.id];
    $('#title').textContent = d?.name || 'Madrid';
    const dd = myPos ? fmtDist(dist(myPos.coords, p.coords)) : null;
    const nav = `https://www.google.com/maps/dir/?api=1&destination=${p.coords[0]},${p.coords[1]}&travelmode=walking`;
    const stamps = [
      v?.t && `<div class="stamp s1">${ICON_CHECK}<span><b>Visitado</b>${fmtDate(v.t)} · ${fmtTime(v.t)}</span></div>`,
      v?.gpsAt && `<div class="stamp s2">${ICON_GPS}<span><b>Confirmado por GPS</b>${fmtDate(v.gpsAt)} · ${fmtTime(v.gpsAt)}</span></div>`,
    ].filter(Boolean).join('');
    body.innerHTML = `
      <button class="back" id="back">${esc(d?.name || 'Volver')}</button>
      <div class="hero ${p.img ? '' : 'noimg'}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}<span class="hero-ico">${TI(p.type)}</span></div>
      <div class="pd-head">
        <div><h2>${esc(p.name)}</h2><p>${esc(p.type)}${p.zone ? ' · ' + esc(p.zone) : ''}${dd ? ' · a ' + dd : ''}</p></div>
        ${checks(p)}
      </div>
      ${stamps ? `<div class="stamps">${stamps}</div>` : ''}
      <a class="cta" href="${nav}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>Cómo llegar</a>
      <div class="info-row">${MP_ICON('clock')}<p>${esc(ACCESS[p.type] || 'Consulta horario')}</p></div>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
      ${p.url ? `<a class="src" href="${esc(p.url)}" target="_blank" rel="noopener">Más información en Wikipedia ↗</a>` : ''}`;
    $('#back').onclick = () => openDistrict(d.id, { refit: true });   // salir de la ficha deselecciona y re-centra el distrito
    bindChecks();
    enrich(p).then((ok) => { if (ok && view.type === 'place' && view.id === p.id) render({ keepScroll: true }); });
  }

  function render({ keepScroll = false } = {}) {
    const st = body.scrollTop;
    renderRing();
    ({ home: renderHome, district: renderDistrict, place: renderPlace })[view.type]();
    if (keepScroll) body.scrollTop = st;
    if (map && DISTRICTS.length) { paintDistricts(); drawPins(); }
    document.querySelector('.share-menu')?.remove();
    renderPage();
  }

  // ---------- Navegación ----------
  function openDistrict(id, { keepMap = false, refit = false } = {}) {
    const changed = currentDistrict()?.id !== id;
    view = { type: 'district', id };
    if (changed || refit) { selId = null; }
    if (changed) statusFilter = 'all';
    setSheet('half');
    render();
    body.scrollTop = 0;
    const d = DISTRICTS.find((x) => x.id === id);
    if (!keepMap) requestAnimationFrame(() => fit(d.bbox, { padding: pad('half'), maxZoom: 16, duration: 800 }));
    if (selId) { const r = document.getElementById('pl-' + selId); if (r) body.scrollTop = r.offsetTop - body.clientHeight / 3; }
  }
  function openPlace(id) {
    view = { type: 'place', id }; selId = id;
    if (sheet.dataset.state === 'min' || sheet.dataset.state === 'peek') setSheet('half');
    render(); body.scrollTop = 0;
    const p = BYID[id];
    requestAnimationFrame(() => map.flyTo({ center: ll(p), zoom: Math.max(map.getZoom(), 15.5), offset: centerOffset(), duration: 700 }));
  }
  function goHome() {
    view = { type: 'home' }; selId = null; setSheet('peek'); render(); body.scrollTop = 0;
    requestAnimationFrame(() => fitCity(true));
  }

  // Tap en pin (vista distrito): resalta fila
  function deselect(d) {
    selId = null;
    document.querySelectorAll('.pin.sel, .place.sel').forEach((x) => x.classList.remove('sel', 'flash'));
    fit(d.bbox, { padding: pad(), maxZoom: 16, duration: 700 });
  }
  function selectFromMap(id) {
    selId = id;
    document.querySelectorAll('.pin.sel, .place.sel').forEach((x) => x.classList.remove('sel', 'flash'));
    document.querySelector(`.pin[data-id="${id}"]`)?.classList.add('sel');
    const row = document.getElementById('pl-' + id);
    if (!row) return;
    void row.offsetWidth;
    row.classList.add('sel', 'flash');
    body.scrollTo({ top: row.offsetTop - body.clientHeight / 3, behavior: 'smooth' });
  }

  // ---------- Sello de confirmación GPS (momento firma de la app) ----------
  function gpsStamp(place) {
    const gold = css('--gold'), d = new Date();
    const when = `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase()} ${d.getFullYear()}`;
    const ico = MP_ICON('pin').replace('class="ico"', `width="56" height="56" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 240" width="480" height="480">
      <defs><filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${d.getSeconds()}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
        <path id="arc" d="M120 120 m-88 0 a88 88 0 1 1 176 0 a88 88 0 1 1 -176 0"/></defs>
      <g filter="url(#ink)"><circle cx="120" cy="120" r="104" fill="none" stroke="${gold}" stroke-width="7"/><circle cx="120" cy="120" r="74" fill="none" stroke="${gold}" stroke-width="2.5"/>
        <text font-family="-apple-system,system-ui,sans-serif" font-size="15" font-weight="800" letter-spacing="3.2" fill="${gold}"><textPath xlink:href="#arc">CONFIRMADO POR GPS · MADRID PASSPORT ·</textPath></text>
        <g transform="translate(92 74)">${ico}</g>
        <text x="120" y="160" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="14" font-weight="800" letter-spacing="2" fill="${gold}">${when}</text></g></svg>`;
    const el = document.createElement('div');
    el.className = 'gps-stamp';
    el.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p>${esc(place.name)}</p>`;
    el.style.setProperty('--rot', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
    $('#app').appendChild(el);
    navigator.vibrate?.([12, 40, 24]);
    el.addEventListener('animationend', (e) => { if (e.animationName === 'stamp-out') el.remove(); });
    setTimeout(() => el.remove(), 2600);   // por si no hay animaciones (movimiento reducido)
  }

  // ---------- Checks ----------
  function commit() { checkBadges(); save(); render({ keepScroll: true }); }
  async function onCheck(el) {
    const id = el.dataset.id, a = +el.dataset.a, l = lvl(id), place = BYID[id];
    if (a === 1) {
      if (l === 2) return toast('Confirmado por GPS · no se puede quitar');
      if (l === 1) delete visits[id];
      else { visits[id] = { lvl: 1, t: Date.now() }; toast('Marcado como visitado'); }
    } else {
      if (l === 2) return toast('Ya verificado por GPS');
      el.classList.add('loading');
      try {
        const pos = await getPos(); onPosition(pos);
        const d = dist(pos.coords, place.coords);
        if (d <= radiusFor(place, pos.acc)) {
          visits[id] = { ...visits[id], lvl: 2, gpsAt: Date.now(), gps: pos.coords };
          gpsStamp(place);
        } else toast(`Estás a ${fmtDist(d)} · acércate más`, true);
      } catch (e) { toast(debug ? e.message : 'No se pudo obtener tu ubicación', true); }
      el.classList.remove('loading');
    }
    commit();
    checkNearby(myPos);
  }

  // ---------- Compartir ----------
  $('#share').onclick = (e) => {
    e.stopPropagation();
    const open = document.querySelector('.share-menu');
    if (open) return open.remove();
    const d = currentDistrict();
    // Icono = rectángulo con la proporción real del formato
    const FMT = { post: ['Publicación', '4:5', 12, 15], story: ['Historia', '9:16', 9, 16] };
    const fmtIco = (f) => { const [, , w, h] = FMT[f]; return `<svg class="fmt" viewBox="0 0 20 20"><rect x="${(20 - w) / 2}" y="${(20 - h) / 2}" width="${w}" height="${h}" rx="2"/></svg>`; };
    const opt = (scope, f, label) => `<button data-s="${scope}" data-f="${f}">${fmtIco(f)}<span>${FMT[f][0]} <em>${FMT[f][1]}</em></span></button>`;
    const group = (scope, label) => `<p>${esc(label)}</p>${opt(scope, 'post')}${opt(scope, 'story')}`;
    const m = document.createElement('div');
    m.className = 'share-menu';
    m.innerHTML = (d ? group('district', d.name) : '') + group('city', 'Todo Madrid');
    $('#app').appendChild(m);
    m.querySelectorAll('button').forEach((b) => (b.onclick = async () => {
      m.remove();
      $('#share').classList.add('loading');
      try {
        const r = await MPShare.share({ districts: DISTRICTS, places: PLACES, lvl, district: b.dataset.s === 'district' ? d : null, format: b.dataset.f });
        if (r === 'downloaded') toast('Imagen descargada');
      } catch (err) { console.error(err); toast('No se pudo generar la imagen', true); }
      $('#share').classList.remove('loading');
    }));
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.share-menu')) document.querySelector('.share-menu')?.remove(); });

  // ---------- Sheet: min / peek / half / full ----------
  const ORDER = ['min', 'peek', 'half', 'full'];
  let drag = null;
  sheet.addEventListener('pointerdown', (e) => {
    const onHandle = e.target.closest('#handle');
    if (onHandle || (e.pointerType === 'touch' && body.scrollTop <= 0 && !e.target.closest('input'))) drag = { y: e.clientY, onHandle };
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y, i = ORDER.indexOf(sheet.dataset.state), wasHandle = drag.onHandle; drag = null;
    if (dy > 50) setSheet(ORDER[Math.max(0, i - (dy > 220 ? 2 : 1))]);
    else if (dy < -50) setSheet(ORDER[Math.min(3, i + (dy < -220 ? 2 : 1))]);
    else if (wasHandle) setSheet(sheet.dataset.state === 'min' ? (view.type === 'home' ? 'peek' : 'half') : 'min');
  });

  // ---------- Arranque ----------
  setSheet('peek');
  $('#debug').hidden = !debug;
  if (debug) setPlacing(!fakePos); else maybeWatch();
  window.MPAuth?.init(onAuth).catch((e) => console.error(e));
  renderRing();
  initMap().catch((e) => { console.error(e); toast('Error cargando el mapa', true); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
})();
