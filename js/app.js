(() => {
  const GPS_RADIUS = 150;           // metros para validar visita
  const KEY = 'mp.visits.v1';
  const B = window.BARRIOS;
  const $ = (s) => document.querySelector(s);

  // ---------- Estado ----------
  let visits = {};
  try { visits = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(visits)); } catch {} };
  const lvl = (id) => visits[id]?.lvl || 0;
  const progress = (places) => {
    const done = places.filter((p) => lvl(p.id) > 0).length;
    const gps = places.filter((p) => lvl(p.id) === 2).length;
    return { done, gps, total: places.length };
  };
  const allPlaces = B.flatMap((b) => b.places);
  let current = null;               // barrio abierto

  // ---------- Utilidades ----------
  const dist = ([a, b], [c, d]) => {
    const R = 6371e3, r = Math.PI / 180;
    const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
  let toastT;
  const toast = (msg, err) => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 2400);
  };
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_GPS = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><path d="M9.5 10l2 2 3.5-3.5"/></svg>';

  // ---------- Mapa ----------
  const map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.25 });
  L.control.attribution({ position: 'topleft', prefix: false }).addTo(map);
  const sheetPad = () => document.getElementById('sheet').offsetHeight;
  const fitAll = (anim) => map.fitBounds(L.latLngBounds(B.map((b) => b.center)),
    { paddingTopLeft: [20, 110], paddingBottomRight: [20, sheetPad() + 10], animate: anim, maxZoom: 15 });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO',
  }).addTo(map);

  const zoneLayer = L.layerGroup().addTo(map);
  const pinLayer = L.layerGroup().addTo(map);
  let meMarker, myPos;

  function drawZones() {
    zoneLayer.clearLayers();
    B.forEach((b) => {
      const ds = b.places.map((p) => dist(b.center, p.coords));
      const r = Math.min(420, Math.max(220, ds.reduce((a, x) => a + x, 0) / ds.length + 90));
      const sel = current && current.id === b.id;
      if (current && !sel) return;                                  // en detalle solo se ve su zona
      const pr = progress(b.places);
      const c = L.circle(b.center, {
        radius: r, color: '#D6202C', weight: 1.5, opacity: 0.55,
        fillColor: '#D6202C', fillOpacity: 0.06 + 0.16 * (pr.done / pr.total),
      }).addTo(zoneLayer);
      if (!current) c.bindTooltip(b.name, { permanent: true, direction: 'center', className: 'zone-label' });
      c.on('click', () => openBarrio(b.id));
    });
  }

  function drawPins(barrio) {
    pinLayer.clearLayers();
    if (!barrio) return;
    barrio.places.forEach((p) => {
      const icon = L.divIcon({ className: '', html: `<div class="pin v${lvl(p.id)}"></div>`, iconSize: [14, 14] });
      L.marker(p.coords, { icon }).addTo(pinLayer).on('click', () => {
        document.getElementById('pl-' + p.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // ---------- Geolocalización ----------
  const getPos = () => new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('GPS no disponible'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ coords: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }),
      (e) => rej(e), { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  });
  function showMe(pos) {
    myPos = pos;
    const icon = L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] });
    if (meMarker) meMarker.setLatLng(pos.coords); else meMarker = L.marker(pos.coords, { icon, interactive: false }).addTo(map);
  }
  $('#locate').onclick = async () => {
    try { const p = await getPos(); showMe(p); map.flyTo(p.coords, 16, { duration: 0.8 }); }
    catch { toast('No se pudo obtener tu ubicación', true); }
  };

  // ---------- Vistas ----------
  const sheet = $('#sheet'), body = $('#sheet-body');

  function renderRing() {
    const pr = progress(allPlaces);
    const pct = Math.round((pr.done / pr.total) * 100);
    $('#ring-fg').style.strokeDashoffset = 100 - pct;
    $('#ring-txt').textContent = pct + '%';
  }

  function renderHome() {
    current = null;
    $('#title').textContent = 'Explora Madrid';
    const pr = progress(allPlaces);
    body.innerHTML = `
      <div class="sec-title"><h2>Barrios</h2><span>${pr.done}/${pr.total} lugares</span></div>
      ${B.map((b) => {
        const p = progress(b.places);
        const ini = b.name.split(' ').filter((w) => w.length > 2).map((w) => w[0]).join('').slice(0, 2);
        return `<button class="barrio ${p.done === p.total ? 'done' : ''}" data-id="${b.id}">
          <div class="b-badge">${ini}</div>
          <div class="b-info"><strong>${b.name}</strong><small>${b.tag}</small>
            <div class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></div></div>
          <span class="b-count">${p.done}/${p.total}</span><span class="chev"></span>
        </button>`;
      }).join('')}`;
    body.querySelectorAll('.barrio').forEach((el) => (el.onclick = () => openBarrio(el.dataset.id)));
    drawPins(null);
  }

  function openBarrio(id) {
    const b = B.find((x) => x.id === id);
    current = b;
    sheet.classList.remove('collapsed');
    drawZones();
    $('#title').textContent = b.name;
    map.flyToBounds(L.latLngBounds(b.places.map((p) => p.coords)), { paddingTopLeft: [40, 120], paddingBottomRight: [60, sheetPad() + 20], duration: 0.7, maxZoom: 17 });
    renderBarrio();
  }

  function renderBarrio() {
    const b = current, pr = progress(b.places);
    body.innerHTML = `
      <button class="back" id="back">Barrios</button>
      <div class="d-head"><h2>${b.name}</h2><p>${b.tag}</p></div>
      <div class="d-stats">
        <div class="stat"><b>${pr.done}/${pr.total}</b><small>Visitados</small></div>
        <div class="stat"><b>${pr.gps}</b><small>Verificados GPS</small></div>
      </div>
      <div class="legend"><span><i style="background:var(--red)"></i>He estado</span><span><i style="background:var(--ink)"></i>Verificado GPS</span></div>
      ${b.places.map((p) => {
        const l = lvl(p.id);
        const d = myPos ? ` · ${fmtDist(dist(myPos.coords, p.coords))}` : '';
        const sub = l === 2 ? '<small class="gps-ok">✓✓ Verificado por GPS</small>' : `<small>${p.type}${d}</small>`;
        return `<div class="place" id="pl-${p.id}">
          <div class="p-info"><strong>${p.name}</strong>${sub}</div>
          <div class="checks">
            <button class="chk ${l >= 1 ? 'on' : ''}" data-a="1" data-id="${p.id}" aria-label="He estado">${ICON_CHECK}</button>
            <button class="chk gps ${l === 2 ? 'on' : ''}" data-a="2" data-id="${p.id}" ${l === 0 ? 'disabled' : ''} aria-label="Verificar con GPS">${ICON_GPS}</button>
          </div></div>`;
      }).join('')}`;
    $('#back').onclick = () => { current = null; drawZones(); renderHome(); fitAll(true); };
    body.querySelectorAll('.chk').forEach((el) => (el.onclick = () => onCheck(el)));
    drawPins(b);
  }

  async function onCheck(el) {
    const id = el.dataset.id, a = +el.dataset.a, l = lvl(id);
    const place = allPlaces.find((p) => p.id === id);
    if (a === 1) {
      if (l >= 1) delete visits[id];                     // desmarcar
      else { visits[id] = { lvl: 1, t: Date.now() }; toast('Marcado como visitado'); }
    } else {
      if (l === 2) return toast('Ya verificado por GPS');
      el.classList.add('loading');
      try {
        const pos = await getPos(); showMe(pos);
        const d = dist(pos.coords, place.coords);
        const tol = GPS_RADIUS + Math.min(pos.acc || 0, 100);
        if (d <= tol) {
          visits[id] = { ...visits[id], lvl: 2, gpsAt: Date.now(), gps: pos.coords };
          toast('✓✓ Ubicación confirmada');
        } else toast(`Estás a ${fmtDist(d)} · acércate más`, true);
      } catch { toast('No se pudo obtener tu ubicación', true); }
      el.classList.remove('loading');
    }
    save(); refresh();
  }

  function refresh() { renderRing(); drawZones(); current ? renderBarrio() : renderHome(); }

  // Arrastrar el handle para plegar/desplegar
  let startY = null;
  $('#handle').onclick = () => sheet.classList.toggle('collapsed');
  sheet.addEventListener('touchstart', (e) => { if (body.scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY; startY = null;
    if (dy > 60) sheet.classList.add('collapsed'); else if (dy < -60) sheet.classList.remove('collapsed');
  });

  refresh();
  fitAll(false);
})();
