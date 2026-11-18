// Onboarding (primera vez): 5 pantallas (la última: marcar sitios donde ya has estado → primera recompensa en segundos) con swipe (scroll-snap nativo) o «Continuar», puntitos de progreso y,
// al final, permiso de ubicación. Se puede volver a ver desde el Diario.
import { $, esc } from './util.js';
import { S, PLACES, BYID, DISTRICTS, lvl } from './state.js';
import { commit } from './views.js';
import { PTS } from './level.js';
import { t } from './i18n.js';
import { polys } from './util.js';
import { getPos, onPosition } from './gps.js';
import { track } from './analytics.js';

const KEY = 'mp.onboarded';
export const onboarded = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };

// Silueta de Madrid por distritos con tonos de «mapa de calor» (paso 1). Cada distrito entra con un pequeño retraso.
function mapSVG() {
  let b = [180, 90, -180, -90];
  DISTRICTS.forEach((d) => { b = [Math.min(b[0], d.bbox[0]), Math.min(b[1], d.bbox[1]), Math.max(b[2], d.bbox[2]), Math.max(b[3], d.bbox[3])]; });
  const k = Math.cos((40.42 * Math.PI) / 180), W = 300, s = W / ((b[2] - b[0]) * k), H = (b[3] - b[1]) * s;
  const tones = [0.14, 0.24, 0.38, 0.56, 0.78];
  // orden de aparición: del centro hacia fuera
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const order = [...DISTRICTS].map((d, i) => ({ d, i, r: Math.hypot(d.label[0] - cx, d.label[1] - cy) })).sort((x, y) => x.r - y.r);
  const paths = order.map(({ d, i }, n) => {
    const dd = polys(d.feature.geometry).map((p) => 'M' + p[0].filter((_, j) => j % 3 === 0).map(([x, y]) => `${((x - b[0]) * k * s).toFixed(1)},${((b[3] - y) * s).toFixed(1)}`).join('L') + 'Z').join('');
    return `<path d="${dd}" style="--n:${n}" fill="var(--red)" fill-opacity="${tones[(i * 7) % 5]}" stroke="var(--bg)" stroke-width="1.5"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="ob-map" aria-hidden="true">${paths}</svg>`;
}
// Pin rojo con ✓ (paso 2): cae con rebote y el check se dibuja
// La caída anima el <svg> entero (capa propia en la GPU, sin tirones durante el deslizamiento); la sombra va aparte
const PIN = `<div class="ob-pinwrap"><svg viewBox="0 0 120 12" class="ob-shadow" aria-hidden="true"><ellipse cx="60" cy="6" rx="22" ry="5" fill="#000" fill-opacity=".12"/></svg>
  <svg viewBox="0 0 120 136" class="ob-pin ob-drop" aria-hidden="true"><path d="M60 132s-46-40-46-76a46 46 0 0192 0c0 36-46 76-46 76z" fill="var(--red)"/>
  <path class="ob-draw" pathLength="1" d="M39 57l14 14 28-29" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
// GPS (paso 3): tu punto azul entra en el área, el pin dorado salta y se dibuja el doble check
const GPS = `<svg viewBox="0 0 260 230" class="ob-gps" aria-hidden="true">
  <circle cx="130" cy="122" r="92" fill="var(--gold)" fill-opacity=".1"/>
  <circle class="ob-ring" cx="130" cy="122" r="92" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="7 7"/>
  <circle class="ob-pulse" cx="130" cy="122" r="92" fill="none" stroke="var(--gold)" stroke-width="2"/>
  <g class="ob-me"><circle cx="0" cy="0" r="22" fill="#2F7BF6" fill-opacity=".18"/><circle cx="0" cy="0" r="11" fill="#2F7BF6" stroke="#fff" stroke-width="4"/></g>
  <g class="ob-gold"><g transform="translate(93 40) scale(.62)"><path d="M60 132s-46-40-46-76a46 46 0 0192 0c0 36-46 76-46 76z" fill="var(--gold)"/>
    <path class="ob-draw d1" pathLength="1" d="M31 60l12 12 22-24" fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="ob-draw d2" pathLength="1" d="M55 68l4 4 30-32" fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/></g></g></svg>`;
// Sello (paso 4): golpe de sello + nivel que sube
const STAMP = `<div class="ob-stampwrap"><svg viewBox="0 0 160 160" class="ob-stamp" aria-hidden="true"><g transform="rotate(-10 80 80)" fill="none" stroke="var(--red)">
  <circle cx="80" cy="80" r="66" stroke-width="5"/><circle cx="80" cy="80" r="50" stroke-width="2"/>
  <path id="ob-arc" d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" stroke="none"/>
  <text font-size="11" font-weight="800" letter-spacing="3" fill="var(--red)" stroke="none"><textPath href="#ob-arc">MADRID PASSPORT · MADRID PASSPORT ·</textPath></text>
  <path d="M58 92V72l-2-12 9 6h30l9-6-2 12v20z M70 76h.1M90 76h.1M74 86h12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>
  <div class="ob-level"><span>8</span><div><small>${t('level')} 8</small><b>${t('lvl.gato')}</b></div><i><em></em></i></div></div>`;

// Paso 5: imprescindibles para marcar de un toque los que ya conoces (se guardan al cerrar)
const ICONIC = ['puerta-sol', 'plaza-mayor', 'parque-retiro', 'palacio-real', 'gran-via', 'prado', 'debod', 'cibeles', 'bernabeu'];
const quick = () => `<div class="ob-quick" id="ob-quick">${ICONIC.filter((id) => BYID[id]).map((id) => `<button class="ob-q" data-q="${id}" aria-pressed="false">${MP_ICON(BYID[id].type, 'ico')}<span>${esc(BYID[id].name)}</span></button>`).join('')}</div>
  <div class="ob-qn" id="ob-qn" aria-live="polite">&nbsp;</div>`;

// Promesa que se cumple al cerrar la intro (main.js espera a ella para crear el mapa: si no, su carga da tirones en las animaciones)
let closed = null;
export function showOnboarding(source = 'first') {
  if ($('#onboard')) return closed;
  let done;
  closed = new Promise((r) => (done = r));
  const steps = [['ob.1', mapSVG()], ['ob.2', PIN], ['ob.3', GPS], ['ob.4', STAMP], ['ob.5', quick()]];
  const el = document.createElement('div');
  el.id = 'onboard'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('ob.aria'));
  el.innerHTML = `<button class="ob-skip" id="ob-skip">${t('ob.skip')}</button>
    <div class="ob-track" id="ob-track">${steps.map(([k, ill], i) => `<section class="ob-slide" aria-label="${i + 1} / ${steps.length}">
      <div class="ob-ill"><span class="ob-blob"></span>${ill}</div><h1>${esc(t(k + '.t'))}</h1><p>${esc(t(k + '.d', { n: Math.floor(PLACES.length / 50) * 50 }))}</p></section>`).join('')}</div>
    <div class="ob-foot"><div class="ob-dots" id="ob-dots">${steps.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      <button class="ob-btn" id="ob-next">${t('ob.next')}</button><button class="ob-later" id="ob-later">&nbsp;</button>
      <a class="ob-privacy" href="privacy.html">${t('privacy')}</a></div>`;
  $('#app').appendChild(el);
  const track_ = $('#ob-track'), dots = [...el.querySelectorAll('#ob-dots i')], next = $('#ob-next'), later = $('#ob-later'), skip = $('#ob-skip');
  let idx = 0;
  const N = steps.length, last = () => idx === N - 1;
  const slides = [...el.querySelectorAll('.ob-slide')];
  const paint = () => {
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    slides.forEach((sl, i) => sl.classList.toggle('on', i === idx));   // relanza la animación de su ilustración
    next.textContent = last() ? t('ob.start') : t('ob.next');
    later.innerHTML = last() ? esc(t('ob.later')) : '&nbsp;';
    later.disabled = !last();
    skip.style.visibility = last() ? 'hidden' : '';
  };
  track_.addEventListener('scroll', () => {
    const i = Math.round(track_.scrollLeft / track_.clientWidth);
    if (i !== idx) { idx = i; paint(); track('onboarding_step', { step: idx + 1 }); }
  }, { passive: true });
  const go = (i) => track_.scrollTo({ left: i * track_.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const picked = new Set();
  el.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.q, on = !picked.has(id);
    on ? picked.add(id) : picked.delete(id);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    $('#ob-qn').textContent = picked.size ? t('ob.5.n', { n: picked.size, pts: picked.size * PTS.visit }) : '\u00a0';
  }));
  const close = (action) => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    const ids = [...picked].filter((id) => !lvl(id));
    if (ids.length) {
      const now = Date.now();
      ids.forEach((id) => (S.visits[id] = { lvl: 1, t: now }));
      track('onboarding_quickmark', { n: ids.length, places: ids.join(','), action });
      setTimeout(commit, 350);                                  // logros y nivel con su aviso, tras cerrar
    }
    track('onboarding_done', { action, step: idx + 1, source });
    el.classList.add('out');
    setTimeout(() => { el.remove(); done(); }, 300);
  };
  next.onclick = async () => {
    if (!last()) return go(idx + 1);
    close('start');
    try { onPosition(await getPos()); } catch {}               // pide el permiso de ubicación
  };
  later.onclick = () => last() && close('later');
  skip.onclick = () => close('skip');
  paint();
  track('onboarding_shown', { source });
  return closed;
}

// Primera vez: solo si nunca se ha visto y no hay progreso (usuarios que ya usaban la app no lo ven)
export function maybeOnboarding() {
  if (onboarded() || S.debug || PLACES.some((p) => lvl(p.id) > 0)) return Promise.resolve();   // solo cuentan lugares (no barrios pisados al arrancar)
  return showOnboarding('first');
}
