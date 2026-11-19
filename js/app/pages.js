// Páginas del menú inferior: Diario y Logros (nivel, progreso por tipo, barrios y sellos).
import { $, esc, css, isDark, dayLabel, fmtTime, toast, stampDate } from './util.js';
import { S, PLACES, BYID, DISTRICTS, BARRIOS, lvl, blvl, progress, bprogress, districtDone } from './state.js';
import { t, typePlural, lang, setLang, LANGS, locale } from './i18n.js';
import { points, levelOf, LEVELS } from './level.js';
import { placeItem, bindPlaceItems, render, goHome, TYPES } from './views.js';
import { renderAccount } from './sync.js';
import { track, consent, consentNeeded, setConsent, resetUser } from './analytics.js';
import { notify } from './notify.js';
import { showOnboarding } from './onboarding.js';
import { maya } from './maya.js';

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

// ---------- Diario: tarjeta pasaporte (cuenta + cifras) y calendario de visitas ----------
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const BARRIO_BY_KEY = () => Object.fromEntries(BARRIOS.map((b) => ['b:' + b.id, b]));
const cal = { y: null, m: null, sel: null };          // mes visible y día elegido (sesión)
function diaryItems() {
  const bb = BARRIO_BY_KEY();
  return Object.entries(S.visits).filter(([id]) => BYID[id] || bb[id])
    .map(([id, v]) => ({ p: BYID[id], b: bb[id], v, t: v.gpsAt || v.t || 0 })).sort((a, b) => b.t - a.t);
}
const bRow = (b, v, ts) => `<div class="pitem static"><span class="pthumb t-${v.lvl}">${MP_ICON('barrio')}</span>
  <span class="p-info"><strong>${esc(b.name)}</strong><small>${t('barrio')} · ${esc(b.district?.name || '')}${ts ? ' · ' + fmtTime(ts) : ''}${v.lvl === 2 ? ' · GPS' : ''}</small></span></div>`;
const rowHTML = ({ p, b, v, t: ts }) => (p ? placeItem(p, ts ? ` · ${fmtTime(ts)}${v.lvl === 2 ? ' · GPS' : ''}` : '') : bRow(b, v, ts));
const countLabel = (list) => {
  const np = list.filter((x) => x.p).length, nb = list.length - np, gps = list.filter((x) => x.v.lvl === 2).length;
  return [np && t(np === 1 ? 'place_1' : 'place_n', { n: np }), nb && t(nb === 1 ? 'barrio_1' : 'barrio_n', { n: nb }), gps && `${gps} GPS`].filter(Boolean).join(' · ');
};
function calendarHTML(items) {
  const byDay = {};
  items.forEach((it) => { if (it.t) (byDay[dayKey(it.t)] ||= []).push(it); });
  const last = items.find((x) => x.t), ref = new Date(last ? last.t : Date.now());
  if (cal.y === null) { cal.y = ref.getFullYear(); cal.m = ref.getMonth(); }
  if (cal.sel === null) cal.sel = last ? dayKey(last.t) : '';
  const first = new Date(cal.y, cal.m, 1), nDays = new Date(cal.y, cal.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7, now = new Date(), todayK = dayKey(now);
  const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  const cells = Array.from({ length: lead }, () => '<span></span>');
  for (let d = 1; d <= nDays; d++) {
    const k = `${cal.y}-${cal.m}-${d}`, list = byDay[k] || [], n = list.length;
    const cls = [n ? 'v' + (n >= 4 ? 3 : n >= 2 ? 2 : 1) : '', list.some((x) => x.v.lvl === 2) ? 'gp' : '', k === cal.sel ? 'sel' : '', k === todayK ? 'today' : ''].filter(Boolean).join(' ');
    cells.push(n ? `<button class="${cls}" data-cal-day="${k}" aria-label="${esc(dayLabel(list[0].t))} · ${esc(countLabel(list))}">${d}</button>` : `<span class="${cls}">${d}</span>`);
  }
  const month = first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const isNow = cal.y === now.getFullYear() && cal.m === now.getMonth();
  const sel = byDay[cal.sel] || [];
  return `<section class="cal ${sel.length ? 'focus' : ''}">
      <div class="cal-h"><strong>${esc(month[0].toUpperCase() + month.slice(1))}</strong>
        <span><button class="cal-nav prev" data-cal-move="-1" aria-label="${t('cal.prev')}"></button><button class="cal-nav next" data-cal-move="1" aria-label="${t('cal.next')}" ${isNow ? 'disabled' : ''}></button></span></div>
      <div class="cal-wd">${wd.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
      <div class="cal-days">${cells.join('')}</div>
      <div class="cal-leg"><span class="cal-grad"><small>1</small><i></i><small>4+</small></span><span><i class="gp"></i>${t('cal.gps')}</span></div>
    </section>
    ${sel.length ? `<div class="cal-sel"><strong>${esc(dayLabel(sel[0].t))}</strong><small>${countLabel(sel)}</small></div><div class="cal-list">${sel.map(rowHTML).join('')}</div>`
      : `<p class="cal-none">${t('cal.pick')}</p>`}`;
}
// Solo se repinta el calendario (no toda la página): el scroll no se mueve al cambiar de día o de mes
function updateCal() {
  const wrap = $('#cal-wrap');
  if (!wrap) return renderPage();
  const st = pageBody.scrollTop;
  wrap.innerHTML = calendarHTML(diaryItems());
  pageBody.scrollTop = st;
  bindCal(); bindPlaceItems(wrap);
}
function bindCal() {
  pageBody.querySelectorAll('[data-cal-day]').forEach((el) => (el.onclick = () => {
    const k = el.dataset.calDay;
    cal.sel = cal.sel === k ? '' : k;                  // tocar el día ya elegido lo deselecciona
    track(cal.sel ? 'diary_day_selected' : 'diary_day_deselected'); updateCal();
    pageBody.querySelector(`[data-cal-day="${k}"]`)?.classList.add('pop');   // feedback: el día tocado «rebota»
  }));
  pageBody.querySelectorAll('[data-cal-move]').forEach((el) => (el.onclick = () => {
    const d = new Date(cal.y, cal.m + Number(el.dataset.calMove), 1);
    cal.y = d.getFullYear(); cal.m = d.getMonth(); track('diary_month_changed'); updateCal();
  }));
}
function renderDiary() {
  const pr = progress(PLACES), bp = bprogress(BARRIOS), items = diaryItems();
  const dComplete = DISTRICTS.filter(districtDone).length, undated = items.filter((x) => !x.t);
  return `<section class="pass-card"><span class="pass-kick">${esc(MP_CITY.app.toUpperCase())}</span><div id="acct-slot"></div>
      <div class="pass-k">
        <div class="pk">${MP_ICON('pin')}<b>${pr.done}</b><small>${t('pass.places')}</small></div>
        <div class="pk gold">${MP_ICON('target')}<b>${pr.gps + bp.gps}</b><small>${t('pass.gps')}</small></div>
        <div class="pk rose">${MP_ICON('barrio')}<b>${bp.done}</b><small>${t('pass.barrios')}</small></div>
        <div class="pk wine">${MP_ICON('map')}<b>${dComplete}<span>/${DISTRICTS.length}</span></b><small>${t('districts')}</small></div></div>
      <button class="maya-btn pass-maya" data-maya="diary" aria-label="Maya">${maya('happy')}</button></section>
    ${items.length ? `<div id="cal-wrap">${calendarHTML(items)}</div>` : `<div class="empty-state">${maya('sleep', 'maya empty-maya')}${t('diary.empty')}</div>`}
    ${undated.length ? `<div class="cal-sel"><strong>${t('nodate')}</strong><small>${countLabel(undated)}</small></div><div class="cal-list">${undated.map(rowHTML).join('')}</div>` : ''}`;
}

// ---------- Maya: al tocarla rebota y pone cara de sorpresa ----------
function bindMay(root) {
  root.querySelectorAll('.maya-btn').forEach((b) => (b.onclick = () => {
    track('maya_tapped', { where: b.dataset.maya });
    b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing');
    b.innerHTML = maya('wow');
    clearTimeout(b._t); b._t = setTimeout(() => { b.innerHTML = maya(b.dataset.mood || 'happy'); b.classList.remove('boing'); }, 900);
  }));
}

// ---------- Logros: nivel + progreso por tipo + sellos ----------
// Anillo SVG: fondo + arco proporcional (pct 0–1). Se usa para el nivel y para cada tipo.
const ring = (size, r, w, pct, cls) => { const c = 2 * Math.PI * r, h = size / 2;
  return `<circle class="rg-bg" cx="${h}" cy="${h}" r="${r}" stroke-width="${w}"/>${pct > 0 ? `<circle class="${cls}" cx="${h}" cy="${h}" r="${r}" stroke-width="${w}" stroke-dasharray="${(Math.min(1, pct) * c).toFixed(1)} ${c.toFixed(1)}"/>` : ''}`; };
function levelHTML() {
  const { pts, lv } = levelState(), { visit, gps } = pts.parts;
  return `<section class="lvl-card" id="lvl-card">
    <div class="lvl-ring"><svg viewBox="0 0 112 112" aria-hidden="true">${ring(112, 50, 10, lv.pct, 'rg-red')}${ring(112, 35, 8, visit ? gps / visit : 0, 'rg-gold')}</svg>
      <button class="maya-btn lvl-face" data-maya="badges" data-mood="${lv.i > 0 ? 'party' : 'happy'}" aria-label="Maya">${maya(lv.i > 0 ? 'party' : 'happy')}</button>
      <span class="lvl-n" aria-label="${t('level')} ${lv.i + 1}/${LEVELS.length}">${lv.i + 1}</span></div>
    <div class="lvl-info"><h2>${t('lvl.' + lv.cur.id)}</h2><b class="lvl-pts">${pts.total}<span> ${t('pts')}</span></b>
      <p class="lvl-next"><i class="dot red"></i>${lv.next ? t('level.next', { n: lv.toNext, name: t('lvl.' + lv.next.id) }) : t('level.max')}</p>
      <p class="lvl-next"><i class="dot gold"></i>${t('gps.n', { n: gps })}</p></div>
    ${percentileHTML(visit)}
  </section>`;
}
function typesHTML() {
  const rows = TYPES.map((ty) => ({ ty, ...progress(PLACES.filter((p) => p.type === ty)) }));
  const bp = bprogress(BARRIOS);
  const cell = (label, pr, attr, ico) => `<button class="tp-row ${pr.done === pr.total ? 'done' : ''}" ${attr}>
    <span class="tp-tile">${MP_ICON(ico)}<span class="tp-name">${esc(label)}</span><i class="tp-bar"><i style="width:${pr.total ? (pr.done / pr.total) * 100 : 0}%"></i></i></span>
    <span class="tp-n">${pr.done}/${pr.total}</span></button>`;
  return `<div class="pp-head"><span>${t('bytype')}</span><span>${progress(PLACES).done} / ${PLACES.length}</span></div>
    <div class="tp-list">${rows.map((r) => cell(typePlural(r.ty), r, `data-type="${esc(r.ty)}"`, r.ty)).join('')}${cell(t('barrios'), bp, 'data-barrios', 'barrio')}</div>`;
}

// Logros como sellos de pasaporte (tinta). Formas y giro fijos por logro.
// Siempre al final, en este orden: «Gato de pura cepa», «Huella dorada» y «Leyenda de Madrid»
const LAST = { 'madrid-entero': 1, 'barrios-gps-all': 2, 'todo-gps': 3 };
const GOLD_BADGES = new Set(['gps-1', 'gps-10', 'barrios-gps-all', 'todo-gps']);   // el dorado significa siempre «verificado por GPS»
const inkIcon = (name, col, size, sw) => MP_ICON(name).replace('class="ico"', `width="${size}" height="${size}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`);
// Sellos «pegatina»: forma plana de color con borde blanco y sombra sólida; icono blanco y fecha en una chapita.
// Dorado = verificado por GPS. Sin conseguir: contorno discontinuo con el progreso.
const STICKER_COL = ['#F25C4E', '#8C1D26', '#E8434F', '#FF8F6B'];
const stickerShape = (kind, inset = 0) => {
  const r = 58 - inset;
  if (kind === 'circle') return `<circle cx="70" cy="70" r="${r}"/>`;
  if (kind === 'rect') return `<rect x="${12 + inset}" y="${26 + inset}" width="${116 - 2 * inset}" height="${88 - 2 * inset}" rx="${18 - inset / 2}"/>`;
  const a = r / Math.cos(Math.PI / 8);
  return `<polygon stroke-linejoin="round" points="${Array.from({ length: 8 }, (_, k) => { const t = Math.PI / 8 + (k * Math.PI) / 4; return `${(70 + a * Math.cos(t)).toFixed(1)},${(70 + a * Math.sin(t)).toFixed(1)}`; }).join(' ')}"/>`;
};
function stampSVG(b, i, n, goal, date) {
  const kind = ['circle', 'rect', 'oct'][i % 3], rect = kind === 'rect';
  const rot = [-7, 5, -3, 8, -5, 4, -8, 6, -4, 7, -6, 3][i % 12];
  if (!date) {
    return `<svg viewBox="0 0 140 140" class="pp-svg" aria-hidden="true"><g fill="none" stroke="var(--handle)" stroke-width="3" stroke-dasharray="6 6">${stickerShape(kind, 4)}</g>
      <g transform="translate(55 45)" color="var(--muted)">${inkIcon(b.icon, 'currentColor', 30, 1.8)}</g>
      <text x="70" y="98" text-anchor="middle" class="pp-n">${Math.min(n, goal)}/${goal}</text></svg>`;
  }
  const col = GOLD_BADGES.has(b.id) ? '#E9A21B' : STICKER_COL[i % 4];
  return `<svg viewBox="0 0 140 140" class="pp-svg" aria-hidden="true"><g transform="rotate(${rot} 70 70)">
    <g fill="rgba(140,29,38,.22)" transform="translate(4 5)">${stickerShape(kind)}</g>
    <g fill="${col}" stroke="#fff" stroke-width="7">${stickerShape(kind, 3)}</g>
    <text x="70" y="${rect ? 46 : 40}" text-anchor="middle" class="pp-city">${esc(MP_CITY.name.toUpperCase())}</text>
    <g transform="translate(53 49)">${inkIcon(b.icon, '#fff', 34, 2.2)}</g>
    <rect x="38" y="${rect ? 84 : 86}" width="64" height="20" rx="10" fill="#fff"/>
    <text x="70" y="${rect ? 98 : 100}" text-anchor="middle" class="pp-date" fill="${col}">${esc(stampDate(date).replace(/\s*\d{4}$/, ''))}</text></g></svg>`;
}
// SVG en línea (no <img>): así los textos usan las fuentes de la app. Se cachea por estado + idioma.
const stampCache = new Map();
function stampImg(b, i, n, goal, date) {
  const k = `${b.id}|${date ? date : n + '/' + goal}|${lang}`;
  let html = stampCache.get(k);
  if (!html) { html = stampSVG(b, i, n, goal, date); stampCache.set(k, html); }
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
      ${stampImg(b, i, n, goal, date)}<strong>${esc(badgeName(b))}</strong></div>`).join('')}</div>`;
}

// ---------- Ajustes (engranaje del Diario): idioma, instalar app, introducción y privacidad ----------
const settingsEl = $('#settings'), gearBtn = $('#settings-btn');
// Interruptor de la analítica (mismo permiso que el banner de Maya); oculto si la analítica no está activa aquí (localhost, ?notrack)
const consentRow = () => (consent() == null && !consentNeeded() ? '' : `<div class="lang-row">${MP_ICON('route')}<span>${t('set.stats')}</span><div class="lang-seg">${[['1', 'set.on'], ['0', 'set.off']].map(([k, l]) => `<button class="chip ${(consent() === '1') === (k === '1') ? 'on' : ''}" data-stats="${k}">${t(l)}</button>`).join('')}</div></div>`);
// Instalar como app: solo en móvil y si no se abrió ya instalada. Android/Chrome → aviso nativo; iOS y resto → instrucciones
const UA = navigator.userAgent, IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MOBILE = IOS || /Android|Mobi/i.test(UA);
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (settingsOpen) renderSettings(); });
addEventListener('appinstalled', () => { installEvt = null; if (settingsOpen) renderSettings(); });
const installRow = () => (MOBILE && !installed() ? `<button class="ob-again" id="set-install">${MP_ICON('download', 'ico')}<span>${t('set.install')}</span></button>` : '');
async function installApp() {
  if (installEvt) {
    const e = installEvt; installEvt = null; e.prompt();
    const { outcome } = await e.userChoice.catch(() => ({ outcome: 'error' }));
    track('install_prompt', { outcome });
    if (settingsOpen) renderSettings();
    return;
  }
  track('install_help', { ios: IOS });
  toast(t(IOS ? 'set.install.ios' : 'set.install.other'), false, { label: t('consent.ok'), fn: () => {} });
}
// Mis datos (RGPD): descargar todo lo guardado y borrarlo (en este dispositivo y, con sesión, en la nube)
function exportData() {
  const local = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mp.')) local[k] = localStorage.getItem(k); } } catch {}
  const data = { app: MP_CITY.app, exported_at: new Date().toISOString(), account: window.MPAuth?.user ? { id: MPAuth.user.id, email: MPAuth.user.email } : null,
    visits: S.visits, badges: S.badges, settings: local };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  a.download = `${MP_CITY.id}-passport-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  track('data_exported');
  toast(t('set.export.done'));
}
async function deleteData() {
  const cloud = !!window.MPAuth?.user;
  if (!confirm(t(cloud ? 'set.delete.q.cloud' : 'set.delete.q'))) return;
  track('data_deleted', { cloud });
  try { if (cloud) await MPAuth.deleteAccount(); }
  catch (e) { console.error(e); return toast(t('set.delete.fail'), true); }
  resetUser();
  try { Object.keys(localStorage).filter((k) => k.startsWith('mp.')).forEach((k) => localStorage.removeItem(k)); } catch {}
  location.replace(location.pathname);
}
let settingsOpen = false;
function setSettings(open) {
  if (open && !settingsOpen) track('settings_opened');
  settingsOpen = open; renderSettings();
}
function renderSettings() {
  settingsEl.hidden = !settingsOpen;
  if (!settingsOpen) return;
  settingsEl.innerHTML = `<div class="settings-card" role="dialog" aria-modal="true" aria-label="${t('settings')}">
    <div class="settings-h"><strong>${t('settings')}</strong><button class="settings-x" id="settings-x" aria-label="${t('close')}"><svg class="icon-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="lang-row">${MP_ICON('globe')}<span>${t('language')}</span><div class="lang-seg">${LANGS.map(([k, n]) => `<button class="chip ${lang === k ? 'on' : ''}" data-lang="${k}">${n}</button>`).join('')}</div></div>
    ${consentRow()}
    ${installRow()}
    <button class="ob-again" id="ob-again">${MP_ICON('compass', 'ico')}<span>${t('ob.again')}</span></button>
    <a class="ob-again" href="/${lang === 'en' ? 'en/places' : 'lugares'}/">${MP_ICON('map', 'ico')}<span>${t('seo.all')}</span></a>
    <a class="ob-again" href="privacy.html">${MP_ICON('ticket', 'ico')}<span>${t('privacy')}</span></a>
    <button class="ob-again" id="set-export">${MP_ICON('download', 'ico')}<span>${t('set.export')}</span></button>
    <button class="ob-again danger" id="set-delete">${MP_ICON('trash', 'ico')}<span>${t('set.delete')}</span></button></div>`;
  settingsEl.querySelector('#settings-x').onclick = () => setSettings(false);
  settingsEl.querySelectorAll('[data-stats]').forEach((el) => (el.onclick = () => {
    const yes = el.dataset.stats === '1';
    if ((consent() === '1') === yes) return;
    setConsent(yes); renderSettings();
  }));
  const ins = settingsEl.querySelector('#set-install'); if (ins) ins.onclick = installApp;
  settingsEl.querySelector('#set-export').onclick = exportData;
  settingsEl.querySelector('#set-delete').onclick = deleteData;
  settingsEl.querySelector('#ob-again').onclick = () => { setSettings(false); showOnboarding('diary'); };
  settingsEl.querySelectorAll('[data-lang]').forEach((el) => (el.onclick = () => {
    if (el.dataset.lang === lang) return;
    setLang(el.dataset.lang); track('language_changed', { lang });
    render({ keepScroll: true });
  }));
}
settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) setSettings(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && settingsOpen) setSettings(false); });
gearBtn.innerHTML = MP_ICON('gear', 'ico');
gearBtn.onclick = () => setSettings(true);

// Repinta sin sacar del documento el hueco de la cuenta: el botón de Google es un iframe y recrearlo
// (cada render: posición GPS, barrio pisado, sincronización…) se ve como un parpadeo. El resto se sustituye (nodos nuevos).
function patchKeepAcct(cur, next) {
  const a = [...cur.childNodes], b = [...next.childNodes];
  const has = (n) => n.nodeType === 1 && (n.id === 'acct-slot' || n.querySelector('#acct-slot'));
  if (a.length !== b.length || !a.some(has)) return cur.replaceChildren(...b);
  b.forEach((n, i) => {
    const o = a[i];
    if (has(n) && has(o) && o.tagName === n.tagName) {
      if (o.id === 'acct-slot') return;                               // se queda tal cual (renderAccount decide si cambia)
      [...o.attributes].forEach((x) => n.hasAttribute(x.name) || o.removeAttribute(x.name));
      [...n.attributes].forEach((x) => o.getAttribute(x.name) !== x.value && o.setAttribute(x.name, x.value));
      return patchKeepAcct(o, n);
    }
    o.replaceWith(n);                                                 // nodos nuevos: los listeners se vuelven a poner abajo
  });
}
export function renderPage() {
  if (S.tab === 'map') return;
  $('#page-title').textContent = t(S.tab === 'diary' ? 'tab.diary' : 'tab.badges');
  gearBtn.hidden = S.tab !== 'diary'; gearBtn.setAttribute('aria-label', t('settings'));
  renderSettings();
  const st = pageBody.scrollTop;
  const tpl = document.createElement('template');
  tpl.innerHTML = S.tab === 'diary' ? renderDiary() : renderBadges();
  patchKeepAcct(pageBody, tpl.content);
  pageBody.scrollTop = st;
  bindCal();
  pageBody.querySelectorAll('[data-type]').forEach((el) => (el.onclick = () => {
    track('type_progress_tapped', { type: el.dataset.type });
    S.typeFilter = el.dataset.type; S.query = ''; setTab('map'); goHome();   // panel plegado (peek): se ve el mapa filtrado
    // chips: centra el del tipo elegido en su fila horizontal
    const row = $('#type-chips'), chip = row?.querySelector('.chip.on');
    if (chip) { const c = chip.getBoundingClientRect(), r = row.getBoundingClientRect(); row.scrollLeft += c.left + c.width / 2 - (r.left + r.width / 2); }
  }));
  pageBody.querySelector('[data-barrios]')?.addEventListener('click', () => toast(t('barrio.hint')));
  bindPlaceItems(pageBody); bindMay(pageBody);
  renderAccount();
}
// Vuelta al mapa: la página sale con un fundido corto antes de ocultarse
function hidePage() {
  if (page.hidden || page.classList.contains('out')) return;
  page.classList.add('out');
  let done = false;
  const end = () => { if (done) return; done = true; page.classList.remove('out'); if (S.tab === 'map') page.hidden = true; };
  const onEnd = (e) => { if (e.target === page && e.animationName === 'page-out') { page.removeEventListener('animationend', onEnd); end(); } };
  page.addEventListener('animationend', onEnd);   // ignora animaciones de los hijos que suben por burbuja
  setTimeout(end, 300);                                // por si no llega animationend
}
export function setTab(tb) {
  if (S.tab !== tb) track('tab_viewed', { tab: tb });
  // Diario ↔ Logros: la página no se oculta, así que se repite la entrada solo en su contenido (el fondo no parpadea)
  if (S.tab !== tb && S.tab !== 'map' && tb !== 'map') { page.classList.remove('swap'); void page.offsetWidth; page.classList.add('swap'); }
  if (tb === 'map') page.classList.remove('swap');   // desde el mapa anima la página entera; no duplicar
  S.tab = tb;
  if (tb !== 'diary') settingsOpen = false;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tb));
  if (tb === 'map') hidePage(); else { page.classList.remove('out'); page.hidden = false; }
  $('#app').classList.toggle('on-page', tb !== 'map');   // el aviso de cercanía solo en el mapa
  $('#heat-legend')?.toggleAttribute('hidden', tb !== 'map' || S.view.type !== 'home');
  if (tb !== 'map') { pageBody.scrollTop = 0; renderPage(); }
}
export function initPages() {
  document.querySelectorAll('.tabbar button').forEach((b) => (b.onclick = () => {
    if (b.dataset.tab === 'map' && S.tab === 'map') {   // tocar Mapa estando en el mapa: vista de Madrid sin filtros ni búsqueda
      S.typeFilter = null; S.query = ''; S.statusFilter = 'all';
      goHome();
      const chips = $('#type-chips'); if (chips) chips.scrollLeft = 0;
      return;
    }
    if (b.dataset.tab === S.tab) {                                       // tocar la pestaña activa (Diario/Logros): volver arriba
      if (pageBody.scrollTop > 0) {
        track('tab_scroll_top', { tab: S.tab });
        pageBody.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      return;
    }
    setTab(b.dataset.tab);
  }));
}
