// Onboarding (primera vez): 4 pantallas con swipe (scroll-snap nativo) o «Continuar», puntitos de progreso y,
// al final, permiso de ubicación. Se puede volver a ver desde el Diario.
import { $, esc } from './util.js';
import { S, DISTRICTS, lvl } from './state.js';
import { t } from './i18n.js';
import { polys } from './util.js';
import { getPos, onPosition } from './gps.js';
import { track } from './analytics.js';

const KEY = 'mp.onboarded';
export const onboarded = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };

// Silueta de Madrid por distritos con tonos de «mapa de calor» (ilustración del paso 1)
function mapSVG() {
  let b = [180, 90, -180, -90];
  DISTRICTS.forEach((d) => { b = [Math.min(b[0], d.bbox[0]), Math.min(b[1], d.bbox[1]), Math.max(b[2], d.bbox[2]), Math.max(b[3], d.bbox[3])]; });
  const k = Math.cos((40.42 * Math.PI) / 180), W = 300, s = W / ((b[2] - b[0]) * k), H = (b[3] - b[1]) * s;
  const tones = [0.12, 0.2, 0.35, 0.55, 0.75];
  const paths = DISTRICTS.map((d, i) => {
    const dd = polys(d.feature.geometry).map((p) => 'M' + p[0].filter((_, j) => j % 3 === 0).map(([x, y]) => `${((x - b[0]) * k * s).toFixed(1)},${((b[3] - y) * s).toFixed(1)}`).join('L') + 'Z').join('');
    return `<path d="${dd}" fill="var(--red)" fill-opacity="${tones[(i * 7) % 5]}" stroke="var(--bg)" stroke-width="1.5"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="ob-map" aria-hidden="true">${paths}</svg>`;
}
const PIN = '<svg viewBox="0 0 120 140" class="ob-pin" aria-hidden="true"><path d="M60 132s-46-40-46-76a46 46 0 0192 0c0 36-46 76-46 76z" fill="var(--red)"/><path d="M40 56l14 14 26-28" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GPS = `<svg viewBox="0 0 260 220" class="ob-gps" aria-hidden="true"><circle cx="130" cy="120" r="90" fill="var(--gold)" fill-opacity=".12" stroke="var(--gold)" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="168" cy="160" r="24" fill="#2F7BF6" fill-opacity=".18"/><circle cx="168" cy="160" r="12" fill="#2F7BF6" stroke="#fff" stroke-width="4"/>
  <g transform="translate(92 28) scale(.62)"><path d="M60 132s-46-40-46-76a46 46 0 0192 0c0 36-46 76-46 76z" fill="var(--gold)"/>
  <path d="M30 58l12 12 10-12M48 70l32-34" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const STAMP = `<svg viewBox="0 0 160 160" class="ob-stamp" aria-hidden="true"><g transform="rotate(-10 80 80)" fill="none" stroke="var(--red)">
  <circle cx="80" cy="80" r="66" stroke-width="5"/><circle cx="80" cy="80" r="50" stroke-width="2"/>
  <path id="ob-arc" d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" stroke="none"/>
  <text font-size="11" font-weight="800" letter-spacing="3" fill="var(--red)" stroke="none"><textPath href="#ob-arc">MADRID PASSPORT · MADRID PASSPORT ·</textPath></text>
  <path d="M58 92V72l-2-12 9 6h30l9-6-2 12v20z M70 76h.1M90 76h.1M74 86h12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

export function showOnboarding(source = 'first') {
  if ($('#onboard')) return;
  const steps = [['ob.1', mapSVG()], ['ob.2', PIN], ['ob.3', GPS], ['ob.4', STAMP]];
  const el = document.createElement('div');
  el.id = 'onboard'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('ob.aria'));
  el.innerHTML = `<button class="ob-skip" id="ob-skip">${t('ob.skip')}</button>
    <div class="ob-track" id="ob-track">${steps.map(([k, ill], i) => `<section class="ob-slide" aria-label="${i + 1} / ${steps.length}">
      <div class="ob-ill">${ill}</div><h1>${esc(t(k + '.t'))}</h1><p>${esc(t(k + '.d'))}</p></section>`).join('')}</div>
    <div class="ob-foot"><div class="ob-dots" id="ob-dots">${steps.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      <button class="ob-btn" id="ob-next">${t('ob.next')}</button><button class="ob-later" id="ob-later">&nbsp;</button></div>`;
  $('#app').appendChild(el);
  const track_ = $('#ob-track'), dots = [...el.querySelectorAll('#ob-dots i')], next = $('#ob-next'), later = $('#ob-later'), skip = $('#ob-skip');
  let idx = 0;
  const N = steps.length, last = () => idx === N - 1;
  const paint = () => {
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
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
  const close = (action) => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    track('onboarding_done', { action, step: idx + 1, source });
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
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
}

// Primera vez: solo si nunca se ha visto y no hay progreso (usuarios que ya usaban la app no lo ven)
export function maybeOnboarding() {
  if (onboarded() || S.debug || Object.keys(S.visits).some((k) => lvl(k) > 0)) return;
  showOnboarding('first');
}
