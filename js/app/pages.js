// Páginas del menú inferior: Diario y Logros (nivel, progreso por tipo, barrios y sellos).
import { $, esc, css, isDark, dayLabel, fmtTime, toast, stampDate } from './util.js';
import { S, PLACES, BYID, DISTRICTS, BARRIOS, lvl, blvl, progress, bprogress, districtDone } from './state.js';
import { t, typePlural, lang, setLang, LANGS } from './i18n.js';
import { points, levelOf, LEVELS } from './level.js';
import { placeItem, bindPlaceItems, render, goHome, TYPES } from './views.js';
import { renderAccount } from './sync.js';
import { track } from './analytics.js';
import { notify } from './notify.js';
import { showOnboarding } from './onboarding.js';
import { setSheet } from './sheet.js';

const page = $('#page'), pageBody = $('#page-body');

// ---------- Logros (estado) ----------
export const badgeState = () => ({ places: PLACES, districts: DISTRICTS, barrios: BARRIOS, lvl, blvl, visits: S.visits });
export const badgeName = (b) => (lang === 'en' && b.en ? b.en[0] : b.name);
export const badgeDesc = (b) => (lang === 'en' && b.en ? b.en[1] : b.desc);
export function unlockedNow(silent) {
  const s = badgeState(), out = { ...(silent ? {} : S.badges) };
  MP_BADGES.forEach((b) => { const [n, goal] = b.test(s); if (goal > 0 && n >= goal && !out[b.id]) out[b.id] = Date.now(); });
  return out;
}
export function checkBadges() {
  const before = S.badges, after = unlockedNow(false);
  const fresh = MP_BADGES.filter((b) => after[b.id] && !before[b.id]);
  S.badges = after;
  fresh.forEach((b) => track('badge_unlocked', { badge: b.id }));
  fresh.forEach((b) => setTimeout(() => notify({
    icon: b.icon, kicker: t('badge.kicker'), title: badgeName(b), text: badgeDesc(b), gold: GOLD_BADGES.has(b.id),
    onTap: () => { track('badge_notif_tapped', { badge: b.id }); setTab('badges'); },
  }), 900));
}
export const levelState = () => {
  const pts = points({ places: PLACES, districts: DISTRICTS, barrios: BARRIOS, lvl, blvl, badges: S.badges });
  return { pts, lv: levelOf(pts.total) };
};

// ---------- Comparativa anónima con el resto de usuarios (función visited_percentile en Supabase) ----------
let pctCache = null, pctLoading = false;
async function loadPercentile(n) {
  const cfg = window.MP_CONFIG || {};
  if (!cfg.supabaseUrl || pctLoading || (pctCache && pctCache.n === n)) return;
  pctLoading = true;
  try {
    const r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/visited_percentile`, {
      method: 'POST', headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ n }) });
    if (r.ok) {
      const { users, below } = await r.json();
      pctCache = { n, users, pct: users ? Math.round((below / users) * 100) : 0 };
      if (S.tab === 'badges') renderPage();
    }
  } catch {}
  pctLoading = false;
}
const percentileHTML = (n) => {
  if (!n) return '';
  if (!pctCache || pctCache.n !== n) { loadPercentile(n); return ''; }
  if (pctCache.users < 5 || pctCache.pct < 1) return '';
  return `<p class="lvl-rank">${MP_ICON('route', 'ico')}<span>${t('rank', { pct: pctCache.pct })}</span></p>`;
};

// ---------- Diario ----------
const dayOpen = {};                                   // estado de plegado por día (sesión)
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const BARRIO_BY_KEY = () => Object.fromEntries(BARRIOS.map((b) => ['b:' + b.id, b]));
function renderDiary() {
  const pr = progress(PLACES), bp = bprogress(BARRIOS), bb = BARRIO_BY_KEY();
  const items = Object.entries(S.visits).filter(([id]) => BYID[id] || bb[id])
    .map(([id, v]) => ({ p: BYID[id], b: bb[id], v, t: v.gpsAt || v.t || 0 })).sort((a, b) => b.t - a.t);
  const dComplete = DISTRICTS.filter(districtDone).length;
  const days = [];
  items.forEach((it) => { const k = it.t ? dayKey(it.t) : 'x'; let d = days[days.length - 1]; if (!d || d.k !== k) days.push((d = { k, label: it.t ? dayLabel(it.t) : t('nodate'), items: [] })); d.items.push(it); });
  const bRow = (b, v, ts) => `<div class="pitem static"><span class="pthumb t-${v.lvl}">${MP_ICON('barrio')}</span>
    <span class="p-info"><strong>${esc(b.name)}</strong><small>${t('barrio')} · ${esc(b.district?.name || '')}${ts ? ' · ' + fmtTime(ts) : ''}${v.lvl === 2 ? ' · GPS' : ''}</small></span></div>`;
  const list = days.map((d, i) => {
    const open = dayOpen[d.k] ?? i < 2;
    const np = d.items.filter((x) => x.p).length, nb = d.items.length - np;
    const gps = d.items.filter((x) => x.v.lvl === 2).length;   // lugares y barrios en dorado
    return `<section class="day ${open ? 'open' : ''}" data-day="${d.k}">
      <button class="day-h" aria-expanded="${open}"><span>${esc(d.label)}</span>
        <small>${np ? t(np === 1 ? 'place_1' : 'place_n', { n: np }) : ''}${np && nb ? ' · ' : ''}${nb ? t(nb === 1 ? 'barrio_1' : 'barrio_n', { n: nb }) : ''}${gps ? ` · ${gps} GPS` : ''}</small><span class="chev"></span></button>
      <div class="day-b">${open ? d.items.map(({ p, b, v, t: ts }) => (p ? placeItem(p, ts ? ` · ${fmtTime(ts)}${v.lvl === 2 ? ' · GPS' : ''}` : '') : bRow(b, v, ts))).join('') : ''}</div></section>`;
  }).join('');
  return `<div id="acct-slot"></div><div class="kpis">
      <div class="stat"><b>${pr.done}</b><small>${t('k.visited')}</small></div>
      <div class="stat gold"><b>${pr.gps + bp.gps}</b><small>GPS</small></div>
      <div class="stat"><b>${bp.done}<span>/${bp.total}</span></b><small>${t('k.barrios')}</small></div>
      <div class="stat"><b>${dComplete}<span>/${DISTRICTS.length}</span></b><small>${t('districts')}</small></div></div>
    ${list || `<div class="empty-state">${t('diary.empty')}</div>`}
    <button class="ob-again" id="ob-again">${MP_ICON('compass', 'ico')}<span>${t('ob.again')}</span></button>
    <div class="lang-row">${MP_ICON('globe')}<span>${t('language')}</span><div class="lang-seg">${LANGS.map(([k, n]) => `<button class="chip ${lang === k ? 'on' : ''}" data-lang="${k}">${n}</button>`).join('')}</div></div>`;
}

// ---------- Logros: nivel + progreso por tipo + sellos ----------
function levelHTML() {
  const { pts, lv } = levelState();
  return `<section class="lvl-card" id="lvl-card">
    <div class="lvl-top"><span class="lvl-n">${lv.i + 1}</span><div><small>${t('level')} ${lv.i + 1}/${LEVELS.length}</small><h2>${t('lvl.' + lv.cur.id)}</h2></div>
      <b class="lvl-pts">${pts.total}<span> ${t('pts')}</span></b></div>
    <div class="bar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>
    <p class="lvl-next">${lv.next ? t('level.next', { n: lv.toNext, name: t('lvl.' + lv.next.id) }) : t('level.max')}</p>
    ${percentileHTML(pts.parts.visit)}
  </section>`;
}
function typesHTML() {
  const rows = TYPES.map((ty) => ({ ty, ...progress(PLACES.filter((p) => p.type === ty)) }));
  const bp = bprogress(BARRIOS);
  const row = (ico, label, pr, attr) => `<button class="tp-row ${pr.done === pr.total ? 'done' : ''}" ${attr}>${MP_ICON(ico, 'ico')}<span class="tp-name">${esc(label)}</span>
    <span class="bar"><i style="width:${pr.total ? (pr.done / pr.total) * 100 : 0}%"></i></span><span class="tp-n">${pr.done}/${pr.total}</span></button>`;
  return `<div class="pp-head"><span>${t('bytype')}</span><span>${progress(PLACES).done} / ${PLACES.length}</span></div>
    <div class="tp-list">${rows.map((r) => row(r.ty, typePlural(r.ty), r, `data-type="${esc(r.ty)}"`)).join('')}${row('barrio', t('barrios'), bp, 'data-barrios')}</div>`;
}

// Logros como sellos de pasaporte (tinta con textura). Formas y giro fijos por logro.
// Siempre al final, en este orden: «Gato de pura cepa», «Huella dorada» y «Leyenda de Madrid»
const LAST = { 'madrid-entero': 1, 'barrios-gps-all': 2, 'todo-gps': 3 };
const GOLD_BADGES = new Set(['gps-1', 'gps-10', 'barrios-gps-all', 'todo-gps']);   // el dorado significa siempre «verificado por GPS»
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
  return `<svg viewBox="0 0 140 140" class="pp-svg"><defs><filter id="ink-${b.id}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${i + 2}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.3" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>
    <g transform="rotate(${rot} 70 70)" filter="url(#ink-${b.id})" opacity=".92">
      <g fill="none" stroke="${col}"><g stroke-width="3.5">${OUT}</g><g stroke-width="1.5">${IN}</g></g>${top}
      <g transform="translate(55 ${shape === 'circle' ? 46 : 54})">${inkIcon(b.icon, col, 30, 2.2)}</g>
      <text x="70" y="${shape === 'circle' ? 92 : 98}" text-anchor="middle" font-size="${shape === 'circle' ? 8.5 : 10}" font-weight="800" letter-spacing="${shape === 'circle' ? 1 : 1.5}" fill="${col}">${stampDate(date)}</text></g></svg>`;
}
// Cada sello se convierte en <img> (data URI) y se cachea por estado + tema + idioma
const stampCache = new Map();
function stampImg(b, i, n, goal, date) {
  const k = `${b.id}|${date ? date : n + '/' + goal}|${isDark()}|${lang}`;
  let html = stampCache.get(k);
  if (!html) {
    const svg = stampSVG(b, i, n, goal, date).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="560" height="560" ')
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
  const got = MP_BADGES.filter((b) => S.badges[b.id]).length;
  // Conseguidos primero (por fecha), luego pendientes por % de avance; «Gato de pura cepa» siempre el último
  const items = MP_BADGES.map((b, i) => { const [n, goal] = b.test(s); return { b, i, n, goal, date: S.badges[b.id] }; })
    .sort((x, y) => (x.date && y.date ? x.date - y.date : x.date ? -1 : y.date ? 1 : y.n / y.goal - x.n / x.goal))
    .sort((x, y) => (LAST[x.b.id] || 0) - (LAST[y.b.id] || 0));
  return `${levelHTML()}${typesHTML()}
    <div class="pp-head"><span>${t('stamps')}</span><span>${got} / ${MP_BADGES.length}</span></div>
    <div class="pp-grid">${items.map(({ b, i, n, goal, date }) => `<div class="pp ${date ? 'on' : ''}" title="${esc(badgeDesc(b))}">
      ${stampImg(b, i, n, goal, date)}<strong>${esc(badgeName(b))}</strong><small>${esc(badgeDesc(b))}</small></div>`).join('')}</div>`;
}

export function renderPage() {
  if (S.tab === 'map') return;
  $('#page-title').textContent = t(S.tab === 'diary' ? 'tab.diary' : 'tab.badges');
  const st = pageBody.scrollTop;
  pageBody.innerHTML = S.tab === 'diary' ? renderDiary() : renderBadges();
  pageBody.scrollTop = st;
  pageBody.querySelectorAll('.day-h').forEach((h) => (h.onclick = () => {
    const sec = h.parentElement, k = sec.dataset.day;
    dayOpen[k] = !sec.classList.contains('open');
    renderPage();
  }));
  $('#ob-again')?.addEventListener('click', () => showOnboarding('diary'));
  pageBody.querySelectorAll('[data-lang]').forEach((el) => (el.onclick = () => {
    if (el.dataset.lang === lang) return;
    setLang(el.dataset.lang); track('language_changed', { lang });
    render({ keepScroll: true });
  }));
  pageBody.querySelectorAll('[data-type]').forEach((el) => (el.onclick = () => {
    track('type_progress_tapped', { type: el.dataset.type });
    S.typeFilter = el.dataset.type; S.query = ''; setTab('map'); goHome(); setSheet('half');
  }));
  pageBody.querySelector('[data-barrios]')?.addEventListener('click', () => toast(t('barrio.hint')));
  bindPlaceItems(pageBody);
  renderAccount();
}
export function setTab(tb) {
  if (S.tab !== tb) track('tab_viewed', { tab: tb });
  S.tab = tb;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tb));
  page.hidden = tb === 'map';
  $('#app').classList.toggle('on-page', tb !== 'map');   // el aviso de cercanía solo en el mapa
  $('#heat-legend')?.toggleAttribute('hidden', tb !== 'map' || S.view.type !== 'home');
  if (tb !== 'map') { pageBody.scrollTop = 0; renderPage(); }
}
export function initPages() {
  document.querySelectorAll('.tabbar button').forEach((b) => (b.onclick = () => {
    if (b.dataset.tab === 'map' && S.tab === 'map') return goHome();   // tocar Mapa estando en el mapa: vista de Madrid
    setTab(b.dataset.tab);
  }));
}
