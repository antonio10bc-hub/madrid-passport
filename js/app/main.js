// Arranque de Madrid Passport (módulos ES nativos, sin build).
import { $, esc, toast } from './util.js';
import { S, PLACES, DISTRICTS, BARRIOS, lvl, blvl, currentDistrict } from './state.js';
import { t, lang, applyStatic } from './i18n.js';
import { loadGeo } from './geo.js';
import { initSheet } from './sheet.js';
import { map, initMap } from './map.js';
import { initGps, afterMap } from './gps.js';
import { render, initLevel } from './views.js';
import { initPages, unlockedNow } from './pages.js';
import { initSync } from './sync.js';
import { initAnalytics, track, setPerson } from './analytics.js';

// ---------- Compartir ----------
function initShare() {
  $('#share').onclick = (e) => {
    e.stopPropagation();
    const open = document.querySelector('.share-menu');
    if (open) return open.remove();
    const d = currentDistrict();
    // Icono = rectángulo con la proporción real del formato
    const FMT = { post: [t('share.post'), '4:5', 12, 15], story: [t('share.story'), '9:16', 9, 16] };
    const fmtIco = (f) => { const [, , w, h] = FMT[f]; return `<svg class="fmt" viewBox="0 0 20 20"><rect x="${(20 - w) / 2}" y="${(20 - h) / 2}" width="${w}" height="${h}" rx="2"/></svg>`; };
    const opt = (scope, f) => `<button data-s="${scope}" data-f="${f}">${fmtIco(f)}<span>${FMT[f][0]} <em>${FMT[f][1]}</em></span></button>`;
    const group = (scope, label) => `<p>${esc(label)}</p>${opt(scope, 'post')}${opt(scope, 'story')}`;
    const m = document.createElement('div');
    m.className = 'share-menu';
    m.innerHTML = (d ? group('district', d.name) : '') + group('city', t('share.city'));
    $('#app').appendChild(m);
    track('share_opened', { district: d?.id || null });
    m.querySelectorAll('button').forEach((b) => (b.onclick = async () => {
      m.remove();
      $('#share').classList.add('loading');
      const scope = b.dataset.s, format = b.dataset.f;
      try {
        const L = Object.fromEntries(['title', 'visited', 'gps', 'pending', 'districts', 'barrios'].map((k) => [k, t('share.' + k)]));
        const r = await MPShare.share({ districts: DISTRICTS, places: PLACES, barrios: BARRIOS, lvl, blvl, district: scope === 'district' ? d : null, format, L });
        track('share_done', { scope, format, result: r, district: scope === 'district' ? d.id : null });
        if (r === 'downloaded') toast(t('share.dl'));
      } catch (err) { console.error(err); track('share_error', { scope, format }); toast(t('share.fail'), true); }
      $('#share').classList.remove('loading');
    }));
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
    await loadGeo();
    if (!Object.keys(S.badges).length) S.badges = unlockedNow(true);
    initLevel();
    render();
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
