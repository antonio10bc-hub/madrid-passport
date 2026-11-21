// Vistas del panel (Madrid, distrito, ficha), navegación y checks.
import { $, esc, dist, fmtDist, walkMin, fmtDate, fmtTime, toast, ICON_CHECK, ICON_GPS, ICON_X } from './util.js';
import { S, PLACES, BYID, CHILDREN, DISTRICTS, districtOf, barrioOf, lvl, blvl, bKey, progress, bprogress, currentDistrict, save, setV, delV, inList, listPlaces } from './state.js';
import { t, typeName, typePlural, lang } from './i18n.js';
import { body, sheet, setSheet, pad } from './sheet.js';
import { map, ready, fit, fitCity, centerOffset, paintDistricts, drawPins, passStatus } from './map.js';
import { getPos, onPosition, radiusFor, gpsStamp, confirmGps, checkNearby } from './gps.js';
import { enrich } from './wiki.js';
import { loadMetro, nearestMetro, lineBadge } from './metro.js';
import { renderPage, setTab, checkBadges, levelState } from './pages.js';
import { track, setPerson } from './analytics.js';
import { notify } from './notify.js';
import { loadStats, statsFor, isGem, rankFor, sendReport, reportLimitReached } from './community.js';

const TI = (ty) => MP_ICON(ty);
const TYPE_COUNT = PLACES.reduce((m, p) => ((m[p.type] = (m[p.type] || 0) + 1), m), {});
export const TYPES = Object.keys(TYPE_COUNT).sort((a, b) => TYPE_COUNT[b] - TYPE_COUNT[a]);
let LABEL_ORDER = null;
const labelOrder = () => (DISTRICTS.length ? (LABEL_ORDER ||= [...DISTRICTS].sort((x, y) => y.places.length - x.places.length)) : []);   // no cachear antes de cargar los distritos

function renderRing() {
  const pr = progress(PLACES);
  const pct = pr.done ? Math.max(1, Math.round((pr.done / pr.total) * 100)) : 0;   // con una visita ya se ve avance
  $('#ring-fg').style.strokeDashoffset = 100 - pct;
  $('#ring-txt').textContent = pct + '%';
}

// Filtros: primero las listas del usuario (favoritos, quiero ir), luego los tipos
const LISTS = [['__fav', 'f', 'heart'], ['__want', 'w', 'bookmark']];
const listChips = () => LISTS.map(([key, k, ico]) => `<button class="chip list ${S.typeFilter === key ? 'on' : ''}" data-t="${key}">${MP_ICON(ico, 'ico ico-s')}${t('list.' + k)} <b>${listPlaces(k).length}</b></button>`).join('');
const matchFilter = (p) => !S.typeFilter || (S.typeFilter === '__fav' ? inList('f', p.id) : S.typeFilter === '__want' ? inList('w', p.id) : p.type === S.typeFilter);
// Resultados de la portada (búsqueda + filtro): lista del panel y pines del mapa
export function homeResults() {
  const q = S.query.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return PLACES.filter((p) => matchFilter(p) && (!q || p._search.includes(q)));
}
const typeChips = () => `<div class="chips" id="type-chips">${listChips()}${TYPES.map((ty) => `<button class="chip ${S.typeFilter === ty ? 'on' : ''}" data-t="${esc(ty)}">${MP_ICON(ty, 'ico ico-s')}${esc(typePlural(ty))}</button>`).join('')}</div>`;

const marks = (p) => (inList('f', p.id) ? MP_ICON('heart', 'ico mk fav') : '') + (inList('w', p.id) ? MP_ICON('bookmark', 'ico mk want') : '');
export function placeItem(p, extra = '') {
  const l = lvl(p.id), d = districtOf[p.id];
  const dd = S.myPos ? ` · ${fmtDist(dist(S.myPos.coords, p.coords))}` : '';
  return `<button class="pitem" data-place="${p.id}">
    <span class="pthumb t-${l}">${l === 1 ? ICON_CHECK : l === 2 ? ICON_GPS : TI(p.type)}</span>
    <span class="p-info"><strong>${esc(p.name)}${marks(p)}</strong><small>${esc(typeName(p.type))} · ${esc(d?.name || '')}${dd}${extra}</small></span>
    <span class="chev"></span></button>`;
}
export const bindPlaceItems = (root) => root.querySelectorAll('[data-place]').forEach((el) => (el.onclick = () => { const via = el.dataset.via || (S.tab === 'map' ? 'list' : S.tab); setTab('map'); openPlace(el.dataset.place, via); }));

let searchT;
function homeListHTML() {
  const searching = S.query.trim() || S.typeFilter;
  if (searching) {
    const q = S.query.trim();
    const res = homeResults();
    if (q) { clearTimeout(searchT); searchT = setTimeout(() => track('search_performed', { q_len: q.length, results: res.length, type: S.typeFilter }), 1500); }
    return `<div class="sec-sub">${t(res.length === 1 ? 'results_1' : 'results_n', { n: res.length })}</div>
      ${res.map((p) => placeItem(p)).join('') || `<div class="empty-state">${t(S.typeFilter?.startsWith('__') && !q ? 'list.empty' : 'noresults')}</div>`}`;
  }
  const pr = progress(PLACES);
  return nearbyHTML() + gemsHTML() + `<div class="sec-title"><h2>${t('districts')}</h2><span>${t('places_of', { done: pr.done, total: pr.total })}</span></div>` + labelOrder().map((d) => {
    const p = progress(d.places);
    return `<button class="row ${p.total && p.done === p.total ? 'done' : ''}" data-id="${d.id}">
      <div class="badge">${d.ini}</div>
      <div class="r-info"><strong>${esc(d.name)}</strong><small>${t('n_places', { n: p.total })}${p.gps ? ` · ${p.gps} GPS` : ''} · ${t('n_barrios', { n: d.barrios.length })}</small>
        <div class="bar"><i style="width:${(p.done / p.total) * 100}%"></i></div></div>
      <span class="r-count">${p.done}/${p.total}</span><span class="chev"></span>
    </button>`;
  }).join('');
}
// Pendientes a menos de 10 min a pie de tu posición (o los 2 más cercanos si no hay ninguno tan cerca)
const NEAR_MIN = 10;
function nearbyHTML() {
  if (!S.myPos) return `<button class="near-cta" id="near-locate">${MP_ICON('pin', 'ico')}<span>${t('near.cta')}</span></button>`;
  const all = PLACES.filter((p) => lvl(p.id) === 0).map((p) => ({ p, d: dist(S.myPos.coords, p.coords) })).sort((a, b) => a.d - b.d);
  let list = all.filter((x) => walkMin(x.d) <= NEAR_MIN).slice(0, 6), title = t('near.title', { n: NEAR_MIN });
  if (!list.length) { list = all.slice(0, 3); title = t('near.closest'); }
  if (!list.length) return '';
  // Tarjetas con foto en carrusel horizontal: lo primero que se ve al abrir la app con ubicación
  return `<section class="near"><div class="b-head"><h3 class="zone">${MP_ICON('pin', 'ico ico-s')}${title}</h3></div>
    <div class="near-cards">${list.map(({ p, d }) => `<button class="ncard" data-place="${p.id}" data-via="near">
      <span class="ncard-img">${p.img ? `<img src="${esc(p.img.replace('/960px-', '/330px-'))}" alt="" loading="lazy" decoding="async" data-fb="rm">` : ''}${TI(p.type)}</span>
      <span class="ncard-txt"><b>${esc(p.name)}</b><small>${t('min_walk', { n: walkMin(d) })} · ${esc(typeName(p.type))}</small></span></button>`).join('')}</div></section>`;
}
// Joyas ocultas: lugares que encantan a quien los visita pero que casi nadie ha sellado (pendientes para ti)
function gemsHTML() {
  loadStats(() => { if (S.view.type === 'home' && !S.query.trim() && !S.typeFilter) render({ keepScroll: true }); });
  const gems = PLACES.filter((p) => !lvl(p.id) && isGem(p.id)).slice(0, 5);
  if (!gems.length) return '';
  return `<section class="near gems"><div class="b-head"><h3 class="zone">${MP_ICON('star', 'ico ico-s')}${t('comm.gems')}</h3></div>
    ${gems.map((p) => placeItem(p).replace('data-place=', 'data-via="gem" data-place=')).join('')}</section>`;
}
function bindHomeList() {
  $('#near-locate')?.addEventListener('click', async (e) => {
    e.currentTarget.classList.add('loading');
    try { const pos = await getPos(); onPosition(pos); track('nearby_location_requested'); render({ keepScroll: true }); }
    catch { toast(t('gps.fail'), true); e.currentTarget?.classList.remove('loading'); }
  });
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
    if (S.typeFilter) track('filter_applied', { filter_kind: 'type', filter_value: S.typeFilter });
    // Igual que al venir desde Logros: panel plegado (peek) para ver el mapa filtrado y el chip centrado en su fila
    if (S.typeFilter) setSheet('peek');
    render();
    const row = $('#type-chips'), chip = row?.querySelector('.chip.on');
    if (chip) { const c = chip.getBoundingClientRect(), r = row.getBoundingClientRect(); row.scrollTo({ left: row.scrollLeft + c.left + c.width / 2 - (r.left + r.width / 2), behavior: 'smooth' }); }
    // Favoritos / quiero ir: encuadrar los lugares de la lista; tipos: Madrid entera
    const res = S.typeFilter?.startsWith('__') ? homeResults() : [];
    if (res.length) requestAnimationFrame(() => fit(res.reduce((b, p) => [Math.min(b[0], p.coords[1]), Math.min(b[1], p.coords[0]), Math.max(b[2], p.coords[1]), Math.max(b[3], p.coords[0])], [180, 90, -180, -90]),
      { padding: ((P, AIR = 48) => ({ top: P.top + AIR, bottom: P.bottom + AIR, left: P.left + AIR, right: P.right + AIR }))(pad('peek')), maxZoom: 15, duration: 700 }));   // aire extra, como al abrir un grupo
    else if (S.typeFilter) requestAnimationFrame(() => fitCity(true));
  }));
  bindHomeList();
}

// Ficha: «He estado» y GPS grandes y centrados, lo más importante del lugar
function bigChecks(p) {
  const l = lvl(p.id);
  return `<div class="pd-checks">
    <div class="pd-chk"><button class="chk ${l >= 1 ? 'on' : ''}" data-a="1" data-id="${p.id}" aria-label="${esc(t('chk.been'))}">${ICON_CHECK}</button><span aria-hidden="true">${esc(t('chk.been'))}</span></div>
    <div class="pd-chk"><button class="chk gps ${l === 2 ? 'on' : ''}" data-a="2" data-id="${p.id}" ${l === 0 ? 'disabled' : ''} aria-label="${esc(t('chk.gps'))}">${ICON_GPS}</button><span aria-hidden="true">${esc(t('chk.gps'))}</span></div>
  </div>`;
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
  const shown = d.places.filter(passStatus);
  const dOf = (p) => (S.myPos ? dist(S.myPos.coords, p.coords) : 0);
  if (S.sort === 'zone' || (S.sort === 'near' && !S.myPos)) shown.forEach((p) => (zones[p.zone || ''] ||= []).push(p));
  else zones[''] = [...shown].sort((a, b) => (S.sort === 'todo' ? (lvl(a.id) > 0) - (lvl(b.id) > 0) : 0) || dOf(a) - dOf(b) || a.name.localeCompare(b.name, 'es'));
  const row = (p) => {
    const l = lvl(p.id), v = S.visits[p.id];
    const dd = S.myPos ? ` · ${fmtDist(dist(S.myPos.coords, p.coords))}` : '';
    const sub = l === 2 ? `<small class="gps-ok">✓✓ GPS · ${fmtDate(v.gpsAt || v.t)}</small>`
      : l === 1 ? `<small>${t('visited')} ${v.t ? fmtDate(v.t) : ''}${dd}</small>` : `<small>${esc(typeName(p.type))}${dd}</small>`;
    return `<div class="place${S.selId === p.id ? ' sel' : ''}" id="pl-${p.id}" data-open="${p.id}">
      <div class="p-info"><strong>${esc(p.name)}${marks(p)}</strong>${sub}</div>${checks(p)}</div>`;
  };
  const F = [['all', t('f.all'), pr.total], ['todo', t('f.todo'), pr.total - pr.done], ['done', t('f.done'), pr.done], ['gps', 'GPS', pr.gps]];
  const list = Object.entries(zones).map(([z, ps]) => `${z ? `<h3 class="zone">${esc(z)}</h3>` : ''}${ps.map(row).join('')}`).join('');
  body.innerHTML = `
    <button class="back" id="back">${t('districts')}</button>
    <div class="d-head"><h2>${esc(d.name)}</h2><p>${t('d.sub', { done: pr.done, total: pr.total, gps: pr.gps })}</p></div>
    <div class="opt-row" role="group" aria-label="${esc(t('filter'))}"><span class="opt-ico" title="${esc(t('filter'))}">${MP_ICON('filter', 'ico')}</span>${F.map(([k, tx, n]) => `<button class="${S.statusFilter === k ? 'on' : ''}" data-f="${k}" aria-pressed="${S.statusFilter === k}">${tx} <b>${n}</b></button>`).join('')}</div>
    <div class="opt-row" role="group" aria-label="${esc(t('sort'))}"><span class="opt-ico" title="${esc(t('sort'))}">${MP_ICON('sort', 'ico')}</span>${['zone', 'near', 'todo'].map((k) => `<button class="${S.sort === k ? 'on' : ''}" data-sort="${k}" aria-pressed="${S.sort === k}">${t('sort.' + k)}</button>`).join('')}</div>
    ${list || `<div class="empty-state">${t('empty.filter')}</div>`}
    ${d.barrios.length ? barriosHTML(d) : ''}`;
  $('#back').onclick = goHome;
  body.querySelectorAll('[data-f]').forEach((el) => (el.onclick = () => { S.statusFilter = el.dataset.f; track('filter_applied', { filter_kind: 'status', filter_value: S.statusFilter }); render({ keepScroll: true }); }));
  body.querySelectorAll('[data-sort]').forEach((el) => (el.onclick = async () => {
    S.sort = el.dataset.sort;
    try { localStorage.setItem('mp.sort', S.sort); } catch {}
    track('district_sorted', { sort: S.sort });
    if (S.sort !== 'zone' && !S.myPos) { try { onPosition(await getPos()); } catch { if (S.sort === 'near') toast(t('gps.fail'), true); } }
    render({ keepScroll: true });
  }));
  bindChecks();
  body.querySelectorAll('[data-open]').forEach((el) => (el.onclick = () => openPlace(el.dataset.open, 'list')));
  body.querySelectorAll('[data-b]').forEach((el) => (el.onclick = (e) => {
    e.stopPropagation();
    const b = d.barrios.find((x) => x.id === el.dataset.b), k = 'b:' + b.id, l = blvl(b), stored = lvl(k);
    if (l === 2) return toast(t('barrio.lock.gps'));
    if (l > stored) return toast(t('barrio.lock.place'));
    const undo = snapshot(k);
    if (stored === 1) { delV(k); track('barrio_unmarked', { barrio: b.id, district: d.id }); toast(t('barrio.unmarked.toast', { name: b.name }), false, undo); }
    else { setV(k, { lvl: 1, t: Date.now() }); toast(t('barrio.marked.toast', { name: b.name }), false, undo); track('barrio_discovered', { barrio: b.id, district: d.id, method: 'manual' }); }
    commit();
  }));
}

// ---------- Comunidad, valoración, compartir y avisos de error ----------
const SHARE_ICO = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>';
const rerenderIf = (id) => () => { if (S.view.type === 'place' && S.view.id === id) render({ keepScroll: true }); };
// Valoración personal (solo si lo has visitado): se guarda como 'r:<id>' junto a las visitas y se sincroniza
function rateHTML(p) {
  if (!lvl(p.id)) return '';
  const cur = S.visits['r:' + p.id]?.v || 0;
  // 1-3 estrellas: tocar la n.ª marca n; tocar la valoración actual la quita
  return `<div class="rate"><span>${t('rate.q')}</span><div class="stars" role="group" aria-label="${esc(t('rate.q'))}">${[1, 2, 3].map((v) =>
    `<button class="${v <= cur ? 'on' : ''}" data-rate="${v}" aria-pressed="${cur === v}" aria-label="${esc(t(v === 1 ? 'rate.star1' : 'rate.starN', { n: v }))}">${MP_ICON('star', 'ico')}</button>`).join('')}</div></div>`;
}
// «Sellado por N viajeros · a M les encantó», joya oculta y tu puesto (datos agregados de Supabase)
function commHTML(p) {
  loadStats(rerenderIf(p.id));
  const st = statsFor(p.id), v = S.visits[p.id];
  const rank = v?.t ? rankFor(p.id, v.t, rerenderIf(p.id)) : null;
  const bits = [st && t('comm.n', { n: st.n }), st?.love && t('comm.love', { n: st.love }), rank && rank <= 100 && t('comm.rank', { n: rank })].filter(Boolean);
  if (!bits.length && !isGem(p.id)) return '';
  return `<p class="comm">${isGem(p.id) ? `<span class="gem">${MP_ICON('star', 'ico ico-s')}${t('comm.gem')}</span>` : ''}${bits.map(esc).join(' · ')}</p>`;
}
async function sharePlace(p) {
  const url = `${MP_CITY.site}/${lang === 'en' ? 'en/place' : 'lugar'}/${p.id}/`;
  const text = t(lvl(p.id) ? 'pl.share.done' : 'pl.share.todo', { name: p.name, app: MP_CITY.app });
  try {
    if (navigator.share) { await navigator.share({ text, url }); track('place_shared', { place: p.id, method: 'native', visited: lvl(p.id) > 0 }); return; }
    await navigator.clipboard.writeText(`${text} ${url}`); toast(t('pl.copied'));
    track('place_shared', { place: p.id, method: 'copy', visited: lvl(p.id) > 0 });
  } catch (e) { if (e?.name !== 'AbortError') toast(t('pl.copied.fail'), true); }
}
const REASONS = ['coords', 'photo', 'info', 'closed', 'other'];
function openReport(p) {
  document.querySelector('.rep-ov')?.remove();
  if (reportLimitReached()) { track('report_limited', { place: p.id, where: 'app' }); return toast(t('rep.limit'), true); }
  const ov = document.createElement('div');
  ov.className = 'rep-ov';
  ov.innerHTML = `<form class="rep-card" role="dialog" aria-modal="true" aria-label="${esc(t('rep.title'))}">
    <strong>${t('rep.title')}</strong><small>${esc(p.name)}</small>
    <div class="rep-opts">${REASONS.map((r, i) => `<label><input type="radio" name="r" value="${r}" ${i ? '' : 'checked'}><span>${t('rep.' + r)}</span></label>`).join('')}</div>
    <textarea name="note" maxlength="1000" rows="3" placeholder="${esc(t('rep.ph'))}"></textarea>
    <div class="rep-btns"><button type="button" class="rep-cancel">${t('rep.cancel')}</button><button type="submit" class="rep-send">${t('rep.send')}</button></div></form>`;
  $('#app').appendChild(ov);
  const f = ov.querySelector('form'), close = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector('.rep-cancel').onclick = close;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const reason = f.r.value, note = f.note.value.trim().slice(0, 1000);
    f.querySelector('.rep-send').disabled = true;
    track('place_reported', { place: p.id, type: p.type, reason, has_note: !!note });   // el texto libre no va a la analítica (puede llevar datos personales)
    let ok = false;
    try { ok = await sendReport(p.id, reason, note, lang); } catch {}
    close();
    if (ok === 'limit') { track('report_limited', { place: p.id, where: 'server' }); return toast(t('rep.limit'), true); }
    toast(t('rep.thanks'));
    if (!ok) console.warn('aviso solo en analítica');
  };
}

// Conexiones dentro de un sitio: «Está en» (lugar contenedor) y «Aquí dentro» (lugares que contiene, con progreso)
function parentHTML(p) {
  const par = BYID[p.parent];
  if (!par) return '';
  return `<button class="in-parent" data-in="${par.id}" data-rel="parent">${MP_ICON(par.type, 'ico ico-s')}<span>${t('in.parent')} <b>${esc(par.name)}</b></span><span class="chev"></span></button>`;
}
function insideHTML(p) {
  const kids = CHILDREN[p.id];
  if (!kids?.length) return '';
  const pr = progress(kids);
  return `<section class="inside"><div class="b-head"><h3 class="zone">${t('in.children')}</h3><span>${pr.done}/${pr.total}</span></div>
    ${kids.map((k) => `<button class="pitem" data-in="${k.id}" data-rel="child"><span class="pthumb t-${lvl(k.id)}">${lvl(k.id) === 1 ? ICON_CHECK : lvl(k.id) === 2 ? ICON_GPS : TI(k.type)}</span>
      <span class="p-info"><strong>${esc(k.name)}</strong><small>${esc(typeName(k.type))}</small></span><span class="chev"></span></button>`).join('')}</section>`;
}

// Siguiente lugar pendiente más cercano a este (para ir encadenando)
const nextOf = (p) => PLACES.filter((x) => x.id !== p.id && lvl(x.id) === 0).map((x) => ({ x, d: dist(p.coords, x.coords) })).sort((a, b) => a.d - b.d)[0];
function nextHTML(p) {
  const n = nextOf(p);
  if (!n || n.d > 3000) return '';
  // Separada del resto de la ficha: es otro lugar (sugerencia para seguir), no información de este
  return `<section class="next"><h3 class="next-h">${MP_ICON('route', 'ico ico-s')}${t('next.title')}</h3>
    <button class="next-row" data-next="${n.x.id}"><span class="next-ico">${MP_ICON(n.x.type, 'ico')}</span>
    <span class="next-txt"><b>${esc(n.x.name)}</b><small>${esc(typeName(n.x.type))} · ${fmtDist(n.d)} · ${t('min_walk', { n: walkMin(n.d) })}</small></span>
    <span class="next-go"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button></section>`;
}
// Miniaturas de Wikimedia: 640 px para pantallas normales y 960 px para las de alta densidad (menos datos)
const srcset = (u) => (/\/960px-/.test(u) ? ` srcset="${esc(u.replace('/960px-', '/640px-'))} 640w, ${esc(u)} 960w"` : '');
const ACCESS_KEYS = ['Plaza', 'Calle', 'Barrio', 'Parque', 'Gastronomía', 'Mercado', 'Museo', 'Monumento', 'Iglesia', 'Cultura', 'Estadio', 'Mirador', 'Teatro'];
function renderPlace() {
  const p = BYID[S.view.id], d = districtOf[p.id], l = lvl(p.id), v = S.visits[p.id], b = barrioOf[p.id];
  $('#title').textContent = d?.name || MP_CITY.name;
  const dd = S.myPos ? fmtDist(dist(S.myPos.coords, p.coords)) : null;
  const nav = (mode) => `https://www.google.com/maps/dir/?api=1&destination=${p.coords[0]},${p.coords[1]}&travelmode=${mode}`;
  const mt = nearestMetro(p);
  if (!mt) loadMetro().then(() => { if (S.view.type === 'place' && S.view.id === p.id && nearestMetro(p)) render({ keepScroll: true }); });
  const stamps = [
    v?.t && `<div class="stamp s1">${ICON_CHECK}<span><b>${t('visited')}</b>${fmtDate(v.t)} · ${fmtTime(v.t)}</span></div>`,
    v?.gpsAt && `<div class="stamp s2">${ICON_GPS}<span><b>${t('gps.confirmed')}</b>${fmtDate(v.gpsAt)} · ${fmtTime(v.gpsAt)}</span></div>`,
  ].filter(Boolean).join('');
  const en = lang === 'en' && p.desc_en, desc = en ? p.desc_en : p.desc;
  // Al volver a pintar la misma ficha se conserva la foto (si no, parpadea al recrearse el <img>)
  const oldHero = body.querySelector(`.hero[data-for="${p.id}"]`);
  body.innerHTML = `
    <button class="back" id="back">${esc(d?.name || t('back'))}</button>
    <div class="hero ${p.img ? '' : 'noimg'}" data-for="${p.id}" data-img="${esc(p.img || '')}">${p.img ? `<img src="${esc(p.img)}"${srcset(p.img)} sizes="(max-width: 520px) 92vw, 360px" alt="" decoding="async" loading="lazy" data-fb="noimg">` : ''}<span class="hero-ico">${TI(p.type)}</span></div>
    <div class="pd-head">
      <div><h2>${esc(p.name)}</h2><p>${esc(typeName(p.type))}${p.zone ? ' · ' + esc(p.zone) : b ? ' · ' + esc(b.name) : ''}${dd ? ' · ' + t('at', { d: dd }) : ''}</p></div>
    </div>
    ${bigChecks(p)}
    <div class="lists">${[['f', 'heart'], ['w', 'bookmark']].map(([k, ico]) => `<button class="lst ${k}${inList(k, p.id) ? ' on' : ''}" data-l="${k}" aria-pressed="${inList(k, p.id)}">${MP_ICON(ico, 'ico')}<span>${t('list.' + k + '1')}</span></button>`).join('')}
      <button class="lst sh" id="pl-share" aria-label="${esc(t('pl.share'))}">${SHARE_ICO}<span>${t('pl.share')}</span></button></div>
    ${rateHTML(p)}${commHTML(p)}
    ${stamps ? `<div class="stamps">${stamps}</div>` : ''}
    ${parentHTML(p)}
    <a class="cta" data-nav="walking" href="${nav('walking')}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>${t('directions')}</a>
    ${mt ? `<div class="info-row metro"><span class="m-logo">M</span><p><b>${esc(mt.name)}</b> ${mt.lines.map(lineBadge).join('')}<br><small>${t('metro.at', { d: fmtDist(mt.d), min: mt.min })}</small></p></div>` : ''}
    <div class="info-row">${MP_ICON('clock')}<p>${esc(t('access.' + (ACCESS_KEYS.includes(p.type) ? p.type : 'x')))}</p></div>
    ${desc ? `<p class="desc">${esc(desc)}</p><p class="src">${t(en || lang === 'es' ? 'src' : 'src.es')}</p>` : ''}
    <button class="rep-link" id="pl-report">${MP_ICON('flag', 'ico ico-s')}${t('rep.link')}</button>
    ${insideHTML(p)}
    ${nextHTML(p)}`;
  const newHero = body.querySelector('.hero');
  if (oldHero && oldHero.dataset.img === newHero.dataset.img) newHero.replaceWith(oldHero);
  $('#back').onclick = () => openDistrict(d.id, { refit: true });   // salir de la ficha deselecciona y re-centra el distrito
  body.querySelectorAll('[data-in]').forEach((el) => (el.onclick = () => { track('place_link_opened', { from: p.id, to: el.dataset.in, rel: el.dataset.rel }); openPlace(el.dataset.in, el.dataset.rel); }));
  body.querySelectorAll('[data-next]').forEach((el) => (el.onclick = () => { track('next_nearby_opened', { from: p.id, to: el.dataset.next }); openPlace(el.dataset.next, 'next'); }));
  body.querySelectorAll('[data-nav]').forEach((a) => (a.onclick = () => track('directions_clicked', { place: p.id, type: p.type, mode: a.dataset.nav, metro: mt?.name || null })));
  $('#pl-share').onclick = () => sharePlace(p);
  $('#pl-report').onclick = () => openReport(p);
  body.querySelectorAll('[data-rate]').forEach((el) => (el.onclick = () => {
    const k = 'r:' + p.id, v = +el.dataset.rate, off = S.visits[k]?.v === v;
    if (off) delV(k); else setV(k, { v, t: Date.now() });
    track('place_rated', { place: p.id, type: p.type, rating: off ? 0 : v });
    save(); render({ keepScroll: true });
  }));
  body.querySelectorAll('[data-l]').forEach((el) => (el.onclick = () => {
    const k = el.dataset.l, key = `${k}:${p.id}`, on = !S.visits[key];
    if (on) setV(key, { t: Date.now() }); else delV(key);
    track(on ? 'list_added' : 'list_removed', { list: k === 'f' ? 'fav' : 'want', place: p.id, type: p.type });
    toast(t(`list.${k}.${on ? 'add' : 'del'}`));
    el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
    save();
  }));
  bindChecks();
  enrich(p).then((ok) => { if (ok && S.view.type === 'place' && S.view.id === p.id) render({ keepScroll: true }); });
}

// Fotos que no cargan (sin atributos onerror en línea: la CSP de vercel.json no permite JS en línea)
document.addEventListener('error', (e) => {
  const im = e.target;
  if (im.tagName !== 'IMG' || !im.dataset.fb) return;
  if (im.dataset.fb === 'noimg') im.parentNode?.classList.add('noimg');
  im.remove();
}, true);
export function render({ keepScroll = false } = {}) {
  const st = body.scrollTop;
  // Filas de filtros con scroll horizontal: conservar su posición al volver a pintar (si no, saltan al principio)
  const xs = [...body.querySelectorAll('.chips, .opt-row')].map((el) => el.scrollLeft);
  renderRing();
  ({ home: renderHome, district: renderDistrict, place: renderPlace })[S.view.type]();
  if (keepScroll) body.scrollTop = st;
  body.querySelectorAll('.chips, .opt-row').forEach((el, i) => { if (xs[i]) el.scrollLeft = xs[i]; });
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

// ---------- Checks ----------
let lastLevel = null;
export function commit() {
  checkBadges();
  const ls = levelState();
  if (lastLevel != null && ls.lv.i > lastLevel) {
    notify({ icon: 'crown', kicker: t('level.kicker', { n: ls.lv.i + 1 }), title: t('level.up', { name: t('lvl.' + ls.lv.cur.id) }), text: t('level.pts', { n: ls.pts.total }),
      onTap: () => setTab('badges') });
    track('level_up', { level: ls.lv.cur.id, index: ls.lv.i, points: ls.pts.total });
  }
  lastLevel = ls.lv.i;
  setPerson({ places_visited: ls.pts.parts.visit, places_gps: ls.pts.parts.gps, barrios: ls.pts.parts.barrio, districts_done: ls.pts.parts.district, points: ls.pts.total, level: ls.lv.cur.id });
  save(); render({ keepScroll: true });
}
export const initLevel = () => { lastLevel = levelState().lv.i; };

// Deshacer: vuelve la entrada (lugar o barrio) y los logros a como estaban antes del toque
function snapshot(key) {
  const prev = S.visits[key] ? { ...S.visits[key] } : null, badges = { ...S.badges };
  return { label: t('undo'), fn: () => {
    if (prev) setV(key, prev); else delV(key);
    S.badges = badges;
    track('action_undone', { key });
    commit();
  } };
}

async function onCheck(el) {
  const id = el.dataset.id, a = +el.dataset.a, l = lvl(id), place = BYID[id];
  const props = { place: id, type: place.type, district: districtOf[id]?.id, method: a === 1 ? 'manual' : 'gps' };
  if (a === 1) {
    if (l === 2) return toast(t('chk.locked'));
    const undo = snapshot(id);
    if (l === 1) { delV(id); track('place_unchecked', props); toast(t('chk.unmarked'), false, undo); }
    else { setV(id, { lvl: 1, t: Date.now() }); toast(t('chk.marked'), false, undo); track('place_checked', props); }
  } else {
    if (l === 2) return toast(t('chk.already'));
    el.classList.add('loading');
    track('gps_check_attempt', props);
    try {
      const pos = await getPos(); onPosition(pos);
      const d = dist(pos.coords, place.coords);
      if (d <= radiusFor(place, pos.acc)) { confirmGps(id, pos, 'button'); gpsStamp(place); }
      else { toast(t('gps.far', { d: fmtDist(d) }), true); track('gps_too_far', { ...props, distance: Math.round(d), accuracy: Math.round(pos.acc || 0) }); }
    } catch (e) { track('gps_error', { code: e?.code ?? null, where: 'check' }); toast(t('gps.fail'), true); }
    el.classList.remove('loading');
  }
  commit();
  checkNearby();
}
