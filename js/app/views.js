// Vistas del panel (Madrid, distrito, ficha), navegación y checks.
import { $, esc, dist, fmtDist, fmtDate, fmtTime, toast, ICON_CHECK, ICON_GPS, ICON_X } from './util.js';
import { S, PLACES, BYID, DISTRICTS, districtOf, barrioOf, lvl, blvl, bKey, progress, bprogress, currentDistrict, save } from './state.js';
import { t, typeName, typePlural, lang } from './i18n.js';
import { body, sheet, setSheet, pad } from './sheet.js';
import { map, ready, fit, fitCity, centerOffset, paintDistricts, drawPins, passStatus } from './map.js';
import { getPos, onPosition, radiusFor, gpsStamp, confirmGps, checkNearby } from './gps.js';
import { enrich } from './wiki.js';
import { renderPage, setTab, checkBadges, levelState } from './pages.js';
import { track, setPerson } from './analytics.js';

const TI = (ty) => MP_ICON(ty);
const TYPE_COUNT = PLACES.reduce((m, p) => ((m[p.type] = (m[p.type] || 0) + 1), m), {});
export const TYPES = Object.keys(TYPE_COUNT).sort((a, b) => TYPE_COUNT[b] - TYPE_COUNT[a]);
let LABEL_ORDER = null;
const labelOrder = () => (LABEL_ORDER ||= [...DISTRICTS].sort((x, y) => y.places.length - x.places.length));

function renderRing() {
  const pr = progress(PLACES);
  const pct = pr.done ? Math.max(1, Math.round((pr.done / pr.total) * 100)) : 0;   // con una visita ya se ve avance
  $('#ring-fg').style.strokeDashoffset = 100 - pct;
  $('#ring-txt').textContent = pct + '%';
}

const typeChips = () => `<div class="chips" id="type-chips">${TYPES.map((ty) => `<button class="chip ${S.typeFilter === ty ? 'on' : ''}" data-t="${esc(ty)}">${MP_ICON(ty, 'ico ico-s')}${esc(typePlural(ty))}</button>`).join('')}</div>`;

export function placeItem(p, extra = '') {
  const l = lvl(p.id), d = districtOf[p.id];
  const dd = S.myPos ? ` · ${fmtDist(dist(S.myPos.coords, p.coords))}` : '';
  return `<button class="pitem" data-place="${p.id}">
    <span class="pthumb t-${l}">${l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : TI(p.type)}</span>
    <span class="p-info"><strong>${esc(p.name)}</strong><small>${esc(typeName(p.type))} · ${esc(d?.name || '')}${dd}${extra}</small></span>
    <span class="chev"></span></button>`;
}
export const bindPlaceItems = (root) => root.querySelectorAll('[data-place]').forEach((el) => (el.onclick = () => { const via = S.tab === 'map' ? 'list' : S.tab; setTab('map'); openPlace(el.dataset.place, via); }));

let searchT;
function homeListHTML() {
  const searching = S.query.trim() || S.typeFilter;
  if (searching) {
    const q = S.query.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const res = PLACES.filter((p) => (!S.typeFilter || p.type === S.typeFilter) && (!q || p._search.includes(q)));
    if (q) { clearTimeout(searchT); searchT = setTimeout(() => track('search', { q_len: q.length, results: res.length, type: S.typeFilter }), 1500); }
    return `<div class="sec-sub">${t(res.length === 1 ? 'results_1' : 'results_n', { n: res.length })}</div>
      ${res.map((p) => placeItem(p)).join('') || `<div class="empty-state">${t('noresults')}</div>`}`;
  }
  const pr = progress(PLACES);
  return `<div class="sec-title"><h2>${t('districts')}</h2><span>${t('places_of', { done: pr.done, total: pr.total })}</span></div>` + labelOrder().map((d) => {
    const p = progress(d.places);
    return `<button class="row ${p.total && p.done === p.total ? 'done' : ''}" data-id="${d.id}">
      <div class="badge">${d.ini}</div>
      <div class="r-info"><strong>${esc(d.name)}</strong><small>${t('n_places', { n: p.total })}${p.gps ? ` · ${p.gps} GPS` : ''} · ${t('n_barrios', { n: d.barrios.length })}</small>
        <div class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></div></div>
      <span class="r-count">${p.done}/${p.total}</span><span class="chev"></span>
    </button>`;
  }).join('');
}
function bindHomeList() {
  body.querySelectorAll('.row').forEach((el) => (el.onclick = () => openDistrict(el.dataset.id, { via: 'list' })));
  bindPlaceItems(body);
}
function renderHome() {
  $('#title').textContent = t('title.home');
  const searching = S.query.trim() || S.typeFilter;
  body.innerHTML = `
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="${esc(t('search.ph'))}" value="${esc(S.query)}" autocomplete="off">
      ${searching ? `<button id="q-clear" aria-label="${esc(t('search.clear'))}">${ICON_X}</button>` : ''}</div>
    ${typeChips()}
    <div id="home-list">${homeListHTML()}</div>`;
  const q = $('#q');
  let qT;
  q.oninput = () => {
    clearTimeout(qT);
    qT = setTimeout(() => {
      const was = !!(S.query.trim() || S.typeFilter);
      S.query = q.value;
      const now = !!(S.query.trim() || S.typeFilter);
      if (was !== now) { const pos = q.selectionStart; render({ keepScroll: true }); const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos); return; }
      $('#home-list').innerHTML = homeListHTML(); bindHomeList();
    }, 120);
  };
  q.onfocus = () => { if (sheet.dataset.state !== 'full') setSheet('full'); };
  $('#q-clear')?.addEventListener('click', () => { S.query = ''; S.typeFilter = null; render(); });
  body.querySelectorAll('[data-t]').forEach((el) => (el.onclick = () => {
    S.typeFilter = S.typeFilter === el.dataset.t ? null : el.dataset.t;
    if (S.typeFilter) track('type_filter', { type: S.typeFilter });
    render();
  }));
  bindHomeList();
}

function checks(p) {
  const l = lvl(p.id);
  return `<div class="checks">
    <button class="chk ${l >= 1 ? 'on' : ''}" data-a="1" data-id="${p.id}" aria-label="${esc(t('chk.been'))}">${ICON_CHECK}</button>
    <button class="chk gps ${l === 2 ? 'on' : ''}" data-a="2" data-id="${p.id}" ${l === 0 ? 'disabled' : ''} aria-label="${esc(t('chk.gps'))}">${ICON_GPS}</button>
  </div>`;
}
const bindChecks = () => body.querySelectorAll('.chk').forEach((el) => (el.onclick = (e) => { e.stopPropagation(); onCheck(el); }));

// Barrios del distrito: siempre visibles como fichas. Pendiente (borde), visitado (rojo), GPS (dorado).
function barriosHTML(d) {
  const bp = bprogress(d.barrios);
  const chips = d.barrios.map((b) => {
    const l = blvl(b);
    return `<button class="bchip l${l}" data-b="${b.id}" aria-pressed="${l > 0}">${l === 2 ? ICON_GPS : l === 1 ? ICON_CHECK : ''}<span>${esc(b.name)}</span></button>`;
  }).join('');
  return `<section class="barrios"><div class="b-head"><h3 class="zone">${t('barrios')}</h3><span id="barrios-n">${bp.done}/${bp.total}${bp.gps ? ` · ${bp.gps} GPS` : ''}</span></div>
    <div class="b-grid">${chips}</div><p class="hint">${t('barrio.hint')}</p></section>`;
}

function renderDistrict() {
  const d = currentDistrict(), pr = progress(d.places);
  $('#title').textContent = d.name;
  const zones = {};
  d.places.filter(passStatus).forEach((p) => (zones[p.zone || ''] ||= []).push(p));
  const row = (p) => {
    const l = lvl(p.id), v = S.visits[p.id];
    const dd = S.myPos ? ` · ${fmtDist(dist(S.myPos.coords, p.coords))}` : '';
    const sub = l === 2 ? `<small class="gps-ok">✓✓ GPS · ${fmtDate(v.gpsAt || v.t)}</small>`
      : l === 1 ? `<small>${t('visited')} ${v.t ? fmtDate(v.t) : ''}${dd}</small>` : `<small>${esc(typeName(p.type))}${dd}</small>`;
    return `<div class="place${S.selId === p.id ? ' sel' : ''}" id="pl-${p.id}" data-open="${p.id}">
      <div class="p-info"><strong>${esc(p.name)}</strong>${sub}</div>${checks(p)}</div>`;
  };
  const F = [['all', t('f.all'), pr.total], ['todo', t('f.todo'), pr.total - pr.done], ['done', t('f.done'), pr.done], ['gps', 'GPS', pr.gps]];
  const list = Object.entries(zones).map(([z, ps]) => `${z ? `<h3 class="zone">${esc(z)}</h3>` : ''}${ps.map(row).join('')}`).join('');
  body.innerHTML = `
    <button class="back" id="back">${t('districts')}</button>
    <div class="d-head"><h2>${esc(d.name)}</h2><p>${t('d.sub', { done: pr.done, total: pr.total, gps: pr.gps })}</p></div>
    <div class="chips seg">${F.map(([k, tx, n]) => `<button class="chip ${S.statusFilter === k ? 'on' : ''}" data-f="${k}">${tx} <b>${n}</b></button>`).join('')}</div>
    ${list || `<div class="empty-state">${t('empty.filter')}</div>`}
    ${d.barrios.length ? barriosHTML(d) : ''}`;
  $('#back').onclick = goHome;
  body.querySelectorAll('[data-f]').forEach((el) => (el.onclick = () => { S.statusFilter = el.dataset.f; track('status_filter', { filter: S.statusFilter }); render({ keepScroll: true }); }));
  bindChecks();
  body.querySelectorAll('[data-open]').forEach((el) => (el.onclick = () => openPlace(el.dataset.open, 'list')));
  body.querySelectorAll('[data-b]').forEach((el) => (el.onclick = (e) => {
    e.stopPropagation();
    const b = d.barrios.find((x) => x.id === el.dataset.b), k = 'b:' + b.id, l = blvl(b), stored = lvl(k);
    if (l === 2) return toast(t('barrio.lock.gps'));
    if (l > stored) return toast(t('barrio.lock.place'));
    if (stored === 1) { delete S.visits[k]; track('barrio_unmarked', { barrio: b.id, district: d.id }); }
    else { S.visits[k] = { lvl: 1, t: Date.now() }; toast(t('barrio.marked.toast', { name: b.name })); track('barrio_discovered', { barrio: b.id, district: d.id, method: 'manual' }); }
    commit();
  }));
}

const ACCESS_KEYS = ['Plaza', 'Calle', 'Barrio', 'Parque', 'Gastronomía', 'Mercado', 'Museo', 'Monumento', 'Iglesia', 'Cultura', 'Estadio', 'Mirador', 'Teatro'];
function renderPlace() {
  const p = BYID[S.view.id], d = districtOf[p.id], l = lvl(p.id), v = S.visits[p.id], b = barrioOf[p.id];
  $('#title').textContent = d?.name || 'Madrid';
  const dd = S.myPos ? fmtDist(dist(S.myPos.coords, p.coords)) : null;
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${p.coords[0]},${p.coords[1]}&travelmode=walking`;
  const stamps = [
    v?.t && `<div class="stamp s1">${ICON_CHECK}<span><b>${t('visited')}</b>${fmtDate(v.t)} · ${fmtTime(v.t)}</span></div>`,
    v?.gpsAt && `<div class="stamp s2">${ICON_GPS}<span><b>${t('gps.confirmed')}</b>${fmtDate(v.gpsAt)} · ${fmtTime(v.gpsAt)}</span></div>`,
  ].filter(Boolean).join('');
  const en = lang === 'en' && p.desc_en, desc = en ? p.desc_en : p.desc;
  body.innerHTML = `
    <button class="back" id="back">${esc(d?.name || t('back'))}</button>
    <div class="hero ${p.img ? '' : 'noimg'}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}<span class="hero-ico">${TI(p.type)}</span></div>
    <div class="pd-head">
      <div><h2>${esc(p.name)}</h2><p>${esc(typeName(p.type))}${p.zone ? ' · ' + esc(p.zone) : b ? ' · ' + esc(b.name) : ''}${dd ? ' · ' + t('at', { d: dd }) : ''}</p></div>
      ${checks(p)}
    </div>
    ${stamps ? `<div class="stamps">${stamps}</div>` : ''}
    <a class="cta" id="nav" href="${nav}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>${t('directions')}</a>
    <div class="info-row">${MP_ICON('clock')}<p>${esc(t('access.' + (ACCESS_KEYS.includes(p.type) ? p.type : 'x')))}</p></div>
    ${desc ? `<p class="desc">${esc(desc)}</p><p class="src">${t(en || lang === 'es' ? 'src' : 'src.es')}</p>` : ''}`;
  $('#back').onclick = () => openDistrict(d.id, { refit: true });   // salir de la ficha deselecciona y re-centra el distrito
  $('#nav').onclick = () => track('directions_clicked', { place: p.id, type: p.type });
  bindChecks();
  enrich(p).then((ok) => { if (ok && S.view.type === 'place' && S.view.id === p.id) render({ keepScroll: true }); });
}

export function render({ keepScroll = false } = {}) {
  const st = body.scrollTop;
  renderRing();
  ({ home: renderHome, district: renderDistrict, place: renderPlace })[S.view.type]();
  if (keepScroll) body.scrollTop = st;
  if (map && DISTRICTS.length) { paintDistricts(); drawPins(); }
  document.querySelector('.share-menu')?.remove();
  renderPage();
}

// ---------- Navegación ----------
export function openDistrict(id, { keepMap = false, refit = false, via } = {}) {
  const changed = currentDistrict()?.id !== id;
  S.view = { type: 'district', id };
  if (changed || refit) S.selId = null;
  if (changed) { S.statusFilter = 'all'; track('district_opened', { district: id, via: via || 'other' }); }
  setSheet('half');
  render();
  body.scrollTop = 0;
  const d = DISTRICTS.find((x) => x.id === id);
  if (!keepMap) requestAnimationFrame(() => fit(d.bbox, { padding: pad('half'), maxZoom: 16, duration: 800 }));
  if (S.selId) { const r = document.getElementById('pl-' + S.selId); if (r) body.scrollTop = r.offsetTop - body.clientHeight / 3; }
}
export function openPlace(id, via = 'other') {
  S.view = { type: 'place', id }; S.selId = id;
  const p = BYID[id];
  track('place_opened', { place: id, type: p.type, district: districtOf[id]?.id, via, level: lvl(id) });
  if (sheet.dataset.state === 'min' || sheet.dataset.state === 'peek') setSheet('half');
  render(); body.scrollTop = 0;
  if (ready) requestAnimationFrame(() => map.flyTo({ center: [p.coords[1], p.coords[0]], zoom: Math.max(map.getZoom(), 15.5), offset: centerOffset(), duration: 700 }));
}
export function goHome() {
  S.view = { type: 'home' }; S.selId = null; setSheet('peek'); render(); body.scrollTop = 0;
  requestAnimationFrame(() => fitCity(true));
}
export function deselect(d) {
  S.selId = null;
  document.querySelectorAll('.pin.sel, .place.sel').forEach((x) => x.classList.remove('sel', 'flash'));
  fit(d.bbox, { padding: pad(), maxZoom: 16, duration: 700 });
}
export function selectFromMap(id) {
  S.selId = id;
  document.querySelectorAll('.pin.sel, .place.sel').forEach((x) => x.classList.remove('sel', 'flash'));
  document.querySelector(`.pin[data-id="${id}"]`)?.classList.add('sel');
  const row = document.getElementById('pl-' + id);
  if (!row) return;
  void row.offsetWidth;
  row.classList.add('sel', 'flash');
  body.scrollTo({ top: row.offsetTop - body.clientHeight / 3, behavior: 'smooth' });
}

// ---------- Checks ----------
let lastLevel = null;
export function commit() {
  checkBadges();
  const ls = levelState();
  if (lastLevel != null && ls.lv.i > lastLevel) {
    setTimeout(() => toast(t('level.up', { name: t('lvl.' + ls.lv.cur.id) })), 1800);
    track('level_up', { level: ls.lv.cur.id, index: ls.lv.i, points: ls.pts.total });
  }
  lastLevel = ls.lv.i;
  setPerson({ places_visited: ls.pts.parts.visit, places_gps: ls.pts.parts.gps, barrios: ls.pts.parts.barrio, districts_done: ls.pts.parts.district, points: ls.pts.total, level: ls.lv.cur.id });
  save(); render({ keepScroll: true });
}
export const initLevel = () => { lastLevel = levelState().lv.i; };

async function onCheck(el) {
  const id = el.dataset.id, a = +el.dataset.a, l = lvl(id), place = BYID[id];
  const props = { place: id, type: place.type, district: districtOf[id]?.id };
  if (a === 1) {
    if (l === 2) return toast(t('chk.locked'));
    if (l === 1) { delete S.visits[id]; track('place_unchecked', props); }
    else { S.visits[id] = { lvl: 1, t: Date.now() }; toast(t('chk.marked')); track('place_checked', props); }
  } else {
    if (l === 2) return toast(t('chk.already'));
    el.classList.add('loading');
    track('gps_check_attempt', props);
    try {
      const pos = await getPos(); onPosition(pos);
      const d = dist(pos.coords, place.coords);
      if (d <= radiusFor(place, pos.acc)) { confirmGps(id, pos, 'button'); gpsStamp(place); }
      else { toast(t('gps.far', { d: fmtDist(d) }), true); track('gps_too_far', { ...props, distance: Math.round(d), accuracy: Math.round(pos.acc || 0) }); }
    } catch (e) { track('gps_error', { code: e?.code ?? null, where: 'check' }); toast(S.debug ? e.message : t('gps.fail'), true); }
    el.classList.remove('loading');
  }
  commit();
  checkNearby();
}
