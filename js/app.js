(() => {
  const GPS_RADIUS = 150;                 // metros para validar visita
  const KEY = 'mp.visits.v1';
  const RED = '#D6202C';
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';   // gratis, sin API key
  const $ = (s) => document.querySelector(s);

  // ---------- Estado ----------
  let visits = {};
  try { visits = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(visits)); } catch {} };
  const lvl = (id) => visits[id]?.lvl || 0;
  const progress = (places) => ({
    done: places.filter((p) => lvl(p.id) > 0).length,
    gps: places.filter((p) => lvl(p.id) === 2).length,
    total: places.length,
  });
  const PLACES = window.PLACES;
  let DISTRICTS = [];                     // {id, name, feature, bbox, center, places[]}
  let current = null;                     // distrito abierto
  let myPos = null;

  // ---------- Geo utils ----------
  const dist = ([a, b], [c, d]) => {
    const R = 6371e3, r = Math.PI / 180;
    const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
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
  // Punto para la etiqueta: centro de la bbox del polígono mayor, ajustado a dentro si cae fuera
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

  // ---------- UI utils ----------
  let toastT;
  const toast = (msg, err) => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 2400);
  };
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_GPS = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><path d="M9.5 10l2 2 3.5-3.5"/></svg>';
  const sheet = $('#sheet'), body = $('#sheet-body');
  const setSheet = (state) => { sheet.dataset.state = state; };
  // Alto visible del sheet por estado (debe cuadrar con css/styles.css)
  const sheetVisible = (state = sheet.dataset.state) => {
    const h = sheet.offsetHeight;
    return { min: 64, peek: 150, half: h * 0.58, full: h }[state];
  };
  const pad = (state) => {
    const h = $('#app').offsetHeight, top = $('.topbar').offsetHeight;
    return { top: top + 16, bottom: Math.min(sheetVisible(state) + 20, h - top - 140), left: 28, right: 28 };
  };

  // ---------- Mapa ----------
  const FALLBACK_STYLE = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F3F2EF' } }] };
  let map;
  const markers = { labels: [], pins: [], me: null };

  async function initMap() {
    let style = FALLBACK_STYLE;
    try { const r = await fetch(STYLE_URL); if (r.ok) style = await r.json(); } catch {}
    map = new maplibregl.Map({
      container: 'map', style, center: [-3.70, 40.42], zoom: 10.5,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true,
      customAttribution: '© OpenStreetMap · OpenFreeMap · Ayto. Madrid' }), 'top-left');

    const geo = await (await fetch('data/distritos.geojson')).json();
    DISTRICTS = geo.features.map((f) => ({
      id: f.properties.id, name: f.properties.name, short: f.properties.name.split('-')[0], fid: f.id, feature: f,
      bbox: bboxOf(f.geometry), label: labelPoint(f.geometry),
      places: PLACES.filter((p) => inGeom([p.coords[1], p.coords[0]], f.geometry)),
    }));
    PLACES.forEach((p) => { if (!DISTRICTS.some((d) => d.places.includes(p))) console.warn('Sin distrito:', p.id); });

    await new Promise((r) => (map.loaded() ? r() : map.on('load', r)));
    map.addSource('distritos', { type: 'geojson', data: geo });
    map.addSource('barrios', { type: 'geojson', data: 'data/barrios.geojson' });
    // Velo para atenuar fuera del distrito seleccionado
    map.addLayer({ id: 'd-fill', type: 'fill', source: 'distritos', paint: {
      'fill-color': RED,
      'fill-opacity': ['case',
        ['boolean', ['feature-state', 'dim'], false], 0,
        ['boolean', ['feature-state', 'sel'], false], 0.04,
        ['boolean', ['feature-state', 'has'], false], ['+', 0.07, ['*', 0.33, ['coalesce', ['feature-state', 'p'], 0]]],
        0],
    }});
    map.addLayer({ id: 'd-mask', type: 'fill', source: 'distritos', paint: {
      'fill-color': '#ffffff', 'fill-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.65, 0],
    }});
    map.addLayer({ id: 'b-line', type: 'line', source: 'barrios', layout: { visibility: 'none' }, paint: {
      'line-color': RED, 'line-opacity': 0.35, 'line-width': 0.8, 'line-dasharray': [2, 2],
    }});
    map.addLayer({ id: 'd-line', type: 'line', source: 'distritos', paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], RED, '#B8B8C0'],
      'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.5, 1.2],
    }});
    map.on('click', (e) => {
      if (placing) return setFake([e.lngLat.lat, e.lngLat.lng]);
      const f = map.queryRenderedFeatures(e.point, { layers: ['d-fill'] })[0];
      if (f && (!current || current.fid !== f.id)) openDistrict(f.properties.id);
    });
    map.on('mouseenter', 'd-fill', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'd-fill', () => (map.getCanvas().style.cursor = ''));

    DISTRICTS.forEach((d) => {
      const el = document.createElement('button');
      el.className = 'd-label' + (d.places.length ? '' : ' empty');
      el.innerHTML = `<span>${d.short}</span>`;
      el.onclick = (e) => { e.stopPropagation(); if (!placing) openDistrict(d.id); };
      d.labelMarker = new maplibregl.Marker({ element: el }).setLngLat(d.label).addTo(map);
    });
    map.on('moveend', fitLabels);
    // Atribución plegada (botón ⓘ)
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    fitCity(false);
    refresh();
    if (debug && fakePos) showMe({ coords: fakePos, acc: 5 });
  }

  // Encuadre de toda la ciudad (21 distritos), centrado en el hueco visible entre cabecera y sheet
  const fitCity = (animate = true) => {
    const b = DISTRICTS.reduce((a, d) => [Math.min(a[0], d.bbox[0]), Math.min(a[1], d.bbox[1]), Math.max(a[2], d.bbox[2]), Math.max(a[3], d.bbox[3])], [180, 90, -180, -90]);
    map.fitBounds(b, { padding: pad('peek'), animate, duration: 700 });
  };

  // Oculta etiquetas que no caben en su distrito al zoom actual
  // Etiquetas sin solapes: prioridad a los distritos con más lugares (Centro primero)
  function fitLabels() {
    const placed = [];
    [...DISTRICTS].sort((x, y) => y.places.length - x.places.length).forEach((d) => {
      const el = d.labelMarker.getElement();
      if (current) { el.style.display = 'none'; return; }
      el.style.display = '';
      const c = map.project(d.label), w = el.offsetWidth / 2 + 3, h = el.offsetHeight / 2 + 2;
      const r = [c.x - w, c.y - h, c.x + w, c.y + h];
      const ok = !placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) placed.push(r);
    });
  }

  function paintDistricts() {
    DISTRICTS.forEach((d) => {
      const pr = progress(d.places);
      map.setFeatureState({ source: 'distritos', id: d.fid }, {
        sel: current?.id === d.id, dim: !!current && current.id !== d.id, has: pr.total > 0,
        p: pr.total ? pr.done / pr.total : 0,
      });
    });
    map.setLayoutProperty('b-line', 'visibility', current ? 'visible' : 'none');
    if (current) map.setFilter('b-line', ['==', ['get', 'district'], current.id]);
    fitLabels();
  }

  // El elemento del Marker (wrapper) lo posiciona MapLibre con transform: no debe llevar transiciones.
  // Escala/fade van en el .pin interior. Fade solo al cambiar de distrito, no al marcar checks.
  let pinsFor = null;
  function drawPins() {
    markers.pins.forEach((m) => m.remove()); markers.pins = [];
    const enter = current && pinsFor !== current.id;
    pinsFor = current?.id || null;
    if (!current) return;
    current.places.forEach((p) => {
      const wrap = document.createElement('div');
      const el = document.createElement('div');
      const l = lvl(p.id);
      el.className = `pin v${l}${selId === p.id ? ' sel' : ''}${enter ? ' enter' : ''}`;
      el.dataset.id = p.id;
      el.innerHTML = l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : '';
      wrap.appendChild(el);
      wrap.onclick = (e) => {
        if (placing) return;                    // colocando GPS falso: el tap va al mapa
        e.stopPropagation();
        if (sheet.dataset.state === 'min') setSheet('half');
        selectPlace(p.id);
      };
      markers.pins.push(new maplibregl.Marker({ element: wrap }).setLngLat([p.coords[1], p.coords[0]]).addTo(map));
    });
  }

  // ---------- Geolocalización ----------
  // Modo debug: GPS falso. Se activa con ?debug=1 o manteniendo pulsado el botón de ubicación.
  let debug = false, fakePos = null, placing = false;   // placing: el próximo tap en el mapa fija la posición
  try { debug = new URLSearchParams(location.search).has('debug') || localStorage.getItem('mp.debug') === '1'; fakePos = JSON.parse(localStorage.getItem('mp.fake')); } catch {}
  function setDebug(on) {
    debug = on;
    try { localStorage.setItem('mp.debug', on ? '1' : '0'); } catch {}
    $('#debug').hidden = !on;
    if (on) { toast('GPS falso activado'); if (fakePos) showMe({ coords: fakePos, acc: 5 }); setPlacing(!fakePos); }
    else { setPlacing(false); toast('GPS falso desactivado'); }
  }
  function setPlacing(on) {
    placing = on;
    $('#debug').classList.toggle('placing', on);
    $('#app').classList.toggle('placing', on);   // etiquetas y pines no capturan el tap
    $('#debug-move').textContent = on ? 'Cancelar' : 'Mover';
    $('#debug-pos').textContent = on ? 'toca el mapa para colocarte' : fakePos ? `${fakePos[0].toFixed(4)}, ${fakePos[1].toFixed(4)}` : 'sin posición';
  }
  function setFake(c) {
    fakePos = c;
    try { localStorage.setItem('mp.fake', JSON.stringify(c)); } catch {}
    showMe({ coords: c, acc: 5 });
    setPlacing(false);
    toast('Posición falsa fijada');
    if (current) renderDistrict();
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
    const ll = [pos.coords[1], pos.coords[0]];
    if (markers.me) markers.me.setLngLat(ll);
    else { const el = document.createElement('div'); el.className = 'me'; markers.me = new maplibregl.Marker({ element: el }).setLngLat(ll).addTo(map); }
  }
  let pressT, longPressed = false;
  $('#locate').addEventListener('pointerdown', () => { longPressed = false; pressT = setTimeout(() => { longPressed = true; setDebug(!debug); }, 700); });
  ['pointerup', 'pointerleave'].forEach((ev) => $('#locate').addEventListener(ev, () => clearTimeout(pressT)));
  $('#debug-off').onclick = () => setDebug(false);
  $('#debug-move').onclick = () => setPlacing(!placing);
  $('#debug-reset').onclick = () => { visits = {}; save(); refresh(); toast('Progreso borrado'); };
  $('#locate').onclick = async () => {
    if (longPressed) return;
    try { const p = await getPos(); showMe(p); map.flyTo({ center: [p.coords[1], p.coords[0]], zoom: 15.5, duration: 800 }); }
    catch { toast('No se pudo obtener tu ubicación', true); }
  };

  // ---------- Vistas ----------
  function renderRing() {
    const pr = progress(PLACES);
    const pct = Math.round((pr.done / pr.total) * 100);
    $('#ring-fg').style.strokeDashoffset = 100 - pct;
    $('#ring-txt').textContent = pct + '%';
  }

  function renderHome() {
    $('#title').textContent = 'Explora Madrid';
    const pr = progress(PLACES);
    const list = [...DISTRICTS].sort((a, b) => b.places.length - a.places.length);
    body.innerHTML = `
      <div class="sec-title"><h2>Distritos</h2><span>${pr.done}/${pr.total} lugares</span></div>
      <p class="hint">Toca un distrito en el mapa o elige uno de la lista</p>
      ${list.map((d) => {
        const p = progress(d.places);
        const ini = d.name.replace(/-.*/, '').split(' ').filter((w) => w.length > 2).map((w) => w[0]).join('').slice(0, 2);
        const sub = p.total ? `${p.total} lugares` : 'Próximamente';
        return `<button class="row ${p.total && p.done === p.total ? 'done' : ''} ${p.total ? '' : 'empty'}" data-id="${d.id}">
          <div class="badge">${ini}</div>
          <div class="r-info"><strong>${d.name}</strong><small>${sub}</small>
            ${p.total ? `<div class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></div>` : ''}</div>
          ${p.total ? `<span class="r-count">${p.done}/${p.total}</span>` : ''}<span class="chev"></span>
        </button>`;
      }).join('')}`;
    body.querySelectorAll('.row').forEach((el) => (el.onclick = () => openDistrict(el.dataset.id)));
  }

  function openDistrict(id) {
    current = DISTRICTS.find((d) => d.id === id); selId = null;
    setSheet('half');
    body.scrollTop = 0;
    refresh();
    requestAnimationFrame(() => map.fitBounds(current.bbox, { padding: pad('half'), maxZoom: 16, duration: 800 }));
  }

  // Selección desde el mapa: resalta pin y fila (destello + estado sutil persistente)
  let selId = null;
  function selectPlace(id) {
    selId = id;
    document.querySelectorAll('.pin.sel, .place.sel').forEach((x) => x.classList.remove('sel', 'flash'));
    document.querySelector(`.pin[data-id="${id}"]`)?.classList.add('sel');
    const row = document.getElementById('pl-' + id);
    if (!row) return;
    void row.offsetWidth;                    // reinicia la animación si se repite el tap
    row.classList.add('sel', 'flash');
    body.scrollTo({ top: row.offsetTop - body.clientHeight / 3, behavior: 'smooth' });
  }

  function goHome() {
    current = null; setSheet('peek'); body.scrollTop = 0; refresh();
    requestAnimationFrame(() => fitCity(true));
  }

  function renderDistrict() {
    const d = current, pr = progress(d.places);
    $('#title').textContent = d.name;
    const zones = {};
    d.places.forEach((p) => (zones[p.zone || ''] ||= []).push(p));
    const placeRow = (p) => {
      const l = lvl(p.id);
      const dd = myPos ? ` · ${fmtDist(dist(myPos.coords, p.coords))}` : '';
      const sub = l === 2 ? '<small class="gps-ok">✓✓ Verificado por GPS</small>' : `<small>${p.type}${dd}</small>`;
      return `<div class="place${selId === p.id ? ' sel' : ''}" id="pl-${p.id}">
        <div class="p-info"><strong>${p.name}</strong>${sub}</div>
        <div class="checks">
          <button class="chk ${l >= 1 ? 'on' : ''}" data-a="1" data-id="${p.id}" aria-label="He estado">${ICON_CHECK}</button>
          <button class="chk gps ${l === 2 ? 'on' : ''}" data-a="2" data-id="${p.id}" ${l === 0 ? 'disabled' : ''} aria-label="Verificar con GPS">${ICON_GPS}</button>
        </div></div>`;
    };
    body.innerHTML = `
      <button class="back" id="back">Distritos</button>
      <div class="d-head"><h2>${d.name}</h2><p>Distrito de Madrid</p></div>
      ${pr.total ? `
      <div class="d-stats">
        <div class="stat"><b>${pr.done}/${pr.total}</b><small>Visitados</small></div>
        <div class="stat"><b>${pr.gps}</b><small>Verificados GPS</small></div>
      </div>
      <div class="legend"><span><i style="background:var(--red)"></i>He estado</span><span><i style="background:var(--gold)"></i>Verificado GPS</span></div>
      ${Object.entries(zones).map(([z, ps]) => `${z ? `<h3 class="zone">${z}</h3>` : ''}${ps.map(placeRow).join('')}`).join('')}`
      : '<div class="empty-state">Aún no hay lugares en este distrito.<br>Próximamente.</div>'}`;
    $('#back').onclick = goHome;
    body.querySelectorAll('.chk').forEach((el) => (el.onclick = () => onCheck(el)));
  }

  async function onCheck(el) {
    const id = el.dataset.id, a = +el.dataset.a, l = lvl(id);
    const place = PLACES.find((p) => p.id === id);
    if (a === 1) {
      if (l >= 1) delete visits[id];
      else { visits[id] = { lvl: 1, t: Date.now() }; toast('Marcado como visitado'); }
    } else {
      if (l === 2) return toast('Ya verificado por GPS');
      el.classList.add('loading');
      try {
        const pos = await getPos(); showMe(pos);
        const d = dist(pos.coords, place.coords);
        if (d <= GPS_RADIUS + Math.min(pos.acc || 0, 100)) {
          visits[id] = { ...visits[id], lvl: 2, gpsAt: Date.now(), gps: pos.coords };
          toast('✓✓ Ubicación confirmada');
        } else toast(`Estás a ${fmtDist(d)} · acércate más`, true);
      } catch (e) { toast(debug ? e.message : 'No se pudo obtener tu ubicación', true); }
      el.classList.remove('loading');
    }
    const st = body.scrollTop; save(); refresh(); body.scrollTop = st;
  }

  function refresh() {
    renderRing();
    current ? renderDistrict() : renderHome();
    if (map && DISTRICTS.length) { paintDistricts(); drawPins(); }
  }

  // Sheet: min (casi oculto) / peek / half / full. Arrastre con dedo o ratón; tap en el asa pliega/despliega.
  const ORDER = ['min', 'peek', 'half', 'full'];
  let drag = null;
  sheet.addEventListener('pointerdown', (e) => {
    const onHandle = e.target.closest('#handle');
    if (onHandle || (e.pointerType === 'touch' && body.scrollTop <= 0)) drag = { y: e.clientY, onHandle };
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y, i = ORDER.indexOf(sheet.dataset.state), wasHandle = drag.onHandle; drag = null;
    if (dy > 50) setSheet(ORDER[Math.max(0, i - (dy > 220 ? 2 : 1))]);
    else if (dy < -50) setSheet(ORDER[Math.min(3, i + (dy < -220 ? 2 : 1))]);
    else if (wasHandle) setSheet(sheet.dataset.state === 'min' ? (current ? 'half' : 'peek') : 'min');
  });

  setSheet('peek');
  $('#debug').hidden = !debug;
  if (debug) setPlacing(!fakePos);
  renderRing();
  initMap().catch((e) => { console.error(e); toast('Error cargando el mapa', true); });
})();
