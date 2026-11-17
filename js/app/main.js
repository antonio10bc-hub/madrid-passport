// Arranque de Madrid Passport (módulos ES nativos, sin build).
import { $, esc, toast } from './util.js';
import { S, PLACES, DISTRICTS, BARRIOS, lvl, blvl, currentDistrict } from './state.js';
import { t, lang, applyStatic } from './i18n.js';
import { loadGeo } from './geo.js';
import { initSheet } from './sheet.js';
import { map, initMap, prefetchStyle } from './map.js';
import { initGps, afterMap } from './gps.js';
import { render, initLevel } from './views.js';
import { initPages, unlockedNow, levelState } from './pages.js';
import { initSync } from './sync.js';
import { initAnalytics, track, setPerson } from './analytics.js';
import { maybeOnboarding } from './onboarding.js';

// ---------- Compartir ----------
// Compartir: siempre en formato historia (9:16). Con un distrito abierto se elige distrito o todo Madrid; si no, directo.
async function doShare(district) {
  const scope = district ? 'district' : 'city';
  $('#share').classList.add('loading');
  try {
    const L = Object.fromEntries(['title', 'visited', 'gps', 'pending', 'districts', 'barrios'].map((k) => [k, t('share.' + k)]));
    L.level = t('level'); L.pts = t('pts');
    const { pts, lv } = levelState();
    const r = await MPShare.share({ districts: DISTRICTS, places: PLACES, barrios: BARRIOS, lvl, blvl, district, format: 'story', L, level: { n: lv.i + 1, name: t('lvl.' + lv.cur.id), pts: pts.total } });
    track('share_done', { scope, format: 'story', result: r, district: district?.id || null });
    if (r === 'downloaded') toast(t('share.dl'));
  } catch (err) { console.error(err); track('share_error', { scope }); toast(t('share.fail'), true); }
  $('#share').classList.remove('loading');
}
function initShare() {
  $('#share').onclick = (e) => {
    e.stopPropagation();
    const open = document.querySelector('.share-menu');
    if (open) return open.remove();
    const d = currentDistrict();
    track('share_opened', { district: d?.id || null });
    if (!d) return doShare(null);
    const m = document.createElement('div');
    m.className = 'share-menu';
    m.innerHTML = `<button data-s="district">${MP_ICON('flag', 'ico')}<span>${esc(d.name)}</span></button><button data-s="city">${MP_ICON('map', 'ico')}<span>${esc(t('share.city'))}</span></button>`;
    $('#app').appendChild(m);
    m.querySelectorAll('button').forEach((b) => (b.onclick = () => { m.remove(); doShare(b.dataset.s === 'district' ? d : null); }));
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.share-menu')) document.querySelector('.share-menu')?.remove(); });
}

async function boot() {
  applyStatic();
  initAnalytics({ lang });
  initSheet(() => map?.resize());
  initGps();
  initPages();
  initShare();
  initSync();
  try {
    prefetchStyle();
    await loadGeo();
    if (!Object.keys(S.badges).length) S.badges = unlockedNow(true);
    initLevel();
    render();
    maybeOnboarding();
    const p = PLACES.filter((x) => lvl(x.id) > 0);
    track('app_opened', { visited: p.length, gps: p.filter((x) => lvl(x.id) === 2).length, barrios: BARRIOS.filter((b) => blvl(b) > 0).length, badges: Object.keys(S.badges).length });
    setPerson({ places_visited: p.length, lang });
    await initMap();
    render();
    afterMap();
  } catch (e) { console.error(e); toast(t('map.error'), true); }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
