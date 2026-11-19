// Geolocalización: posición real o falsa (debug), seguimiento, sugerencia por cercanía y barrios pisados.
import { $, dist, fmtDist, toast, esc, css, stampDate } from './util.js';
import { S, PLACES, DISTRICTS, lvl, bKey, save } from './state.js';
import { t } from './i18n.js';
import { map, showMeOnMap, centerOffset, flashBarrio, drawRadar, drawPins, RADAR_M } from './map.js';
import { pad } from './sheet.js';
import { notify } from './notify.js';
import { setTab } from './pages.js';
import { barrioAt } from './geo.js';
import { render, openPlace, openDistrict, commit } from './views.js';
import { wikiSummary } from './wiki.js';
import { track } from './analytics.js';

// Radio para validar por GPS (m). Parques y estadios son grandes: margen mayor. Se suma la precisión (máx. 50 m).
// El área (sin la precisión) se dibuja en el mapa al seleccionar un lugar.
const GPS_RADIUS = 150, GPS_RADIUS_BIG = 350, BIG_TYPES = ['Parque', 'Estadio'];
export const radiusFor = (p, acc) => (BIG_TYPES.includes(p.type) ? GPS_RADIUS_BIG : GPS_RADIUS) + Math.min(acc || 0, 50);

// ---------- Modo debug: GPS falso (?debug=1 o pulsación larga en el botón de ubicación) ----------
function setDebug(on) {
  S.debug = on;
  try { localStorage.setItem('mp.debug', on ? '1' : '0'); } catch {}
  $('#debug').hidden = !on;
  if (on) { stopWatch(); toast(t('debug.on')); if (S.fakePos) onPosition({ coords: S.fakePos, acc: 5 }); setPlacing(!S.fakePos); }
  else { setPlacing(false); toast(t('debug.off')); maybeWatch(); }
}
export function setPlacing(on) {
  S.placing = on;
  $('#debug').classList.toggle('placing', on);
  $('#app').classList.toggle('placing', on);
  $('#debug-move').textContent = on ? t('debug.cancel') : t('debug.move');
  $('#debug-pos').textContent = on ? t('debug.tap') : S.fakePos ? `${S.fakePos[0].toFixed(4)}, ${S.fakePos[1].toFixed(4)}` : t('debug.nopos');
}
export function setFake(c) {
  S.fakePos = c;
  try { localStorage.setItem('mp.fake', JSON.stringify(c)); } catch {}
  setPlacing(false);
  toast(t('debug.set'));
  onPosition({ coords: c, acc: 5 });
  if (S.view.type !== 'home') render({ keepScroll: true });
}
export const getPos = () => new Promise((res, rej) => {
  if (S.debug) return S.fakePos ? res({ coords: S.fakePos, acc: 5 }) : rej(new Error(t('debug.need')));
  if (!navigator.geolocation) return rej(new Error(t('gps.na')));
  navigator.geolocation.getCurrentPosition(
    (p) => res({ coords: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }),
    rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
});

// ---------- Seguimiento continuo ----------
let watchId = null, follow = false, flyingUntil = 0;
export function onPosition(pos) {
  const first = !S.myPos;
  S.myPos = pos;
  if (first && S.view.type !== 'place' && DISTRICTS.length) setTimeout(() => render({ keepScroll: true }), 0);
  showMeOnMap(pos);
  if (follow) {
    // Durante el acercamiento inicial no se recentra: un easeTo cortaría el flyTo y el mapa se quedaría alejado
    if (Date.now() > flyingUntil) map.easeTo({ center: [pos.coords[1], pos.coords[0]], offset: centerOffset(), duration: 600 });
    drawRadar(); drawPins();
  }
  checkBarrio(pos);
  checkNearby(pos);
}
function startWatch() {
  if (watchId != null || S.debug || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    (p) => onPosition({ coords: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }),
    () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
}
function stopWatch() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
function maybeWatch() {   // si el permiso ya está concedido, seguimos la posición sin preguntar
  navigator.permissions?.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') startWatch(); }).catch(() => {});
}
export function setFollow(on) {
  const was = follow;
  follow = on; $('#locate').classList.toggle('active', on);
  if (was !== on && map) { drawRadar(); drawPins(); }   // radar de 500 m y lugares cercanos, solo con el botón activo
}
export const isFollow = () => follow;

// ---------- Barrios: pisar un barrio con el GPS lo sella (oro) automáticamente ----------
function checkBarrio(pos) {
  if ((pos.acc || 0) > 150) return;
  const b = barrioAt(pos.coords);
  if (!b || lvl(bKey(b)) === 2) return;
  const now = Date.now(), prev = S.visits[bKey(b)];
  S.visits[bKey(b)] = { lvl: 2, t: prev?.t || now, gpsAt: now };
  track('barrio_discovered', { barrio: b.id, district: b.district?.id, method: 'gps' });
  flashBarrio(b);
  notify({ icon: 'barrio', kicker: t('barrio.kicker'), title: b.name, text: b.district?.name || '', gold: true,
    onTap: () => { track('barrio_notif_tapped', { barrio: b.id }); setTab('map'); if (b.district) openDistrict(b.district.id, { via: 'notif' }); } });
  commit();
}

// ---------- Sugerencia automática al estar cerca ----------
const dismissed = new Set();
let suggested = null, lastShown = null;
export function checkNearby(pos = S.myPos) {
  let best = null;
  if (pos) for (const p of PLACES) {
    if (lvl(p.id) === 2 || dismissed.has(p.id)) continue;
    const d = dist(pos.coords, p.coords);
    if (d <= radiusFor(p, pos.acc) && (!best || d < best.d)) best = { p, d };
  }
  const el = $('#suggest');
  suggested = best?.p || null;
  if (!suggested) { el.classList.remove('show'); return; }
  if (lastShown !== suggested.id) { lastShown = suggested.id; track('suggestion_shown', { place: suggested.id, distance: Math.round(best.d) }); }
  $('#suggest-name').textContent = suggested.name;
  $('#suggest-sub').textContent = `${lvl(suggested.id) === 1 ? t('sg.marked') + ' · ' : ''}${t('sg.at', { d: fmtDist(best.d) })}`;
  el.classList.add('show');
}

// ---------- Sello de confirmación GPS (momento firma de la app) ----------
export function gpsStamp(place) {
  const gold = css('--gold'), d = new Date();
  // Pegatina dorada (mismo estilo que los sellos de Logros): borde blanco, sombra sólida, texto en arco y fecha en chapita
  const ico = MP_ICON('pin').replace('class="ico"', 'width="56" height="56" x="92" y="70" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"');
  const svg = `<svg viewBox="0 0 240 240" class="gps-svg" aria-hidden="true">
    <circle cx="127" cy="128" r="106" fill="rgba(140,29,38,.22)"/>
    <circle cx="120" cy="120" r="104" fill="${gold}" stroke="#fff" stroke-width="10"/>
    <circle cx="120" cy="120" r="76" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="3 6"/>
    <path id="gps-arc" d="M120 120 m-88 0 a88 88 0 1 1 176 0 a88 88 0 1 1 -176 0" fill="none"/>
    <text class="gps-arc"><textPath href="#gps-arc">${esc(t('stamp.gps'))}</textPath></text>
    ${ico}<rect x="58" y="140" width="124" height="28" rx="14" fill="#fff"/>
    <text x="120" y="160" text-anchor="middle" class="gps-date" fill="${gold}">${stampDate(d)}</text></svg>`;
  const el = document.createElement('div');
  el.className = 'gps-stamp';
  el.innerHTML = `${svg}<p>${esc(place.name)}</p>`;
  el.style.setProperty('--rot', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
  $('#app').appendChild(el);
  navigator.vibrate?.([12, 40, 24]);
  el.addEventListener('animationend', (e) => { if (e.animationName === 'stamp-out') el.remove(); });
  setTimeout(() => el.remove(), 2600);   // por si no hay animaciones (movimiento reducido)
}

export function confirmGps(id, pos, via) {
  S.visits[id] = { ...(S.visits[id] || { t: Date.now() }), lvl: 2, gpsAt: Date.now(), gps: pos.coords };
  track('gps_confirmed', { place: id, via, accuracy: Math.round(pos.acc || 0), debug: S.debug });
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

export function initGps() {
  let pressT, longPressed = false;
  const loc = $('#locate');
  loc.addEventListener('pointerdown', () => { longPressed = false; pressT = setTimeout(() => { longPressed = true; setDebug(!S.debug); }, 700); });
  ['pointerup', 'pointerleave'].forEach((ev) => loc.addEventListener(ev, () => clearTimeout(pressT)));
  loc.onclick = async () => {
    if (longPressed) return;
    if (follow) return setFollow(false);
    try {
      const p = await getPos();
      onPosition(p); startWatch(); setFollow(!S.debug);
      track('location_requested', { accuracy: Math.round(p.acc || 0) });
      // Encuadre: que quepa el radar entero (500 m alrededor) en la zona visible del mapa
      const [lat, lng] = p.coords, dLat = RADAR_M / 111320, dLng = dLat / Math.cos((lat * Math.PI) / 180), P = pad();
      const cam = map.cameraForBounds([[lng - dLng, lat - dLat], [lng + dLng, lat + dLat]],
        { padding: { top: P.top + 12, bottom: P.bottom + 12, left: P.left + 12, right: P.right + 12 } });
      flyingUntil = Date.now() + 900;
      map.flyTo({ center: [lng, lat], zoom: cam?.zoom ?? 14.5, offset: centerOffset(), duration: 800 });
    } catch (e) { track('gps_error', { code: e?.code ?? null, where: 'locate' }); toast(t('gps.fail'), true); }
  };
  $('#debug-off').onclick = () => setDebug(false);
  $('#debug-move').onclick = () => setPlacing(!S.placing);
  $('#debug-validate').onclick = () => validateAll();
  $('#debug-reset').onclick = () => { S.visits = {}; S.badges = {}; save(); render(); toast(t('debug.reset')); };

  $('#suggest-ok').onclick = () => {
    if (!suggested || !S.myPos) return;
    confirmGps(suggested.id, S.myPos, 'suggestion');
    gpsStamp(suggested);
    commit();
    checkNearby();
  };
  $('#suggest-no').onclick = () => { if (suggested) { dismissed.add(suggested.id); track('suggestion_dismissed', { place: suggested.id }); } checkNearby(); };
  $('#suggest-open').onclick = () => suggested && openPlace(suggested.id, 'suggestion');

  $('#debug').hidden = !S.debug;
  if (S.debug) setPlacing(!S.fakePos); else maybeWatch();
}
// Tras cargar el mapa: si hay GPS falso, colocarse
export function afterMap() { if (S.debug && S.fakePos) onPosition({ coords: S.fakePos, acc: 5 }); }
