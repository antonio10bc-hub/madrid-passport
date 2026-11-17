// Panel inferior: estados min / peek / half / full y gestos de arrastre.
import { $ } from './util.js';
import { S } from './state.js';

export const sheet = $('#sheet'), body = $('#sheet-body');
// Medidas cacheadas (leer offsetHeight en cada navegación forzaba recalcular el diseño).
// En iOS (sobre todo la app instalada) el alto real puede llegar tarde: no se cachea a ciegas.
export const dims = {};
export const measure = () => { dims.app = $('#app').offsetHeight; dims.sheet = sheet.offsetHeight; dims.top = $('.topbar').offsetHeight; dims.tab = $('.tabbar').offsetHeight; return dims; };
const MIN_VIS = 28;                                   // plegado: solo se ve el asa gris
export const sheetVisible = (state = sheet.dataset.state) => ({ min: MIN_VIS, peek: 150, half: dims.sheet * 0.58, full: dims.sheet }[state]);
export const setSheet = (state) => {
  sheet.dataset.state = state;
  // Plegado: el contenido queda oculto tras el menú; que no reciba toques ni foco (en iOS abría el teclado del buscador)
  body.inert = state === 'min';
  if (state !== 'full' && body.contains(document.activeElement)) document.activeElement.blur();
  measure();
  $('#app').style.setProperty('--sheet-vis', (state === 'full' ? 0 : Math.min(sheetVisible(state), dims.app * 0.6)) + 'px');
};
// Márgenes para encuadrar el mapa según el panel
export const pad = (state) => {
  const { app: h, top, tab: tb } = measure();
  let pt = top + 16, pb = sheetVisible(state) + tb + 20;
  const room = h - 120;                               // deja siempre ≥120 px de mapa para encajar
  if (pt + pb > room) pb = Math.max(0, room - pt);
  return { top: pt, bottom: pb, left: 28, right: 28 };
};

const ORDER = ['min', 'peek', 'half', 'full'];
const yOf = (st) => dims.sheet - sheetVisible(st);           // translateY de cada estado (px)
let g = null;                                                // gesto en curso
const curY = () => new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
function gStart(y, x, fromHandle) {
  measure();
  g = { y0: y, x0: x, base: curY(), dragging: false, fromHandle, last: [[performance.now(), y]] };
}
function gMove(y, x, e) {
  if (!g) return;
  const dy = y - g.y0, dx = x - g.x0;
  if (!g.dragging) {
    if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
    if (!g.fromHandle) {
      if (Math.abs(dx) > Math.abs(dy)) { g = null; return; }          // gesto horizontal (chips): no es nuestro
      if (sheet.dataset.state === 'full' && (body.scrollTop > 0 || dy < 0)) { g = null; return; }  // con el panel abierto, se hace scroll
    }
    g.dragging = true;
    sheet.classList.add('dragging');
  }
  e?.preventDefault();
  let ny = g.base + dy;
  const lo = 0, hi = yOf('min');
  if (ny < lo) ny = lo - Math.sqrt(lo - ny) * 2;              // resistencia en los extremos
  if (ny > hi) ny = hi + Math.sqrt(ny - hi) * 2;
  sheet.style.transform = `translateY(${ny}px)`;
  g.last.push([performance.now(), y]); if (g.last.length > 5) g.last.shift();
}
function gEnd(e) {
  if (!g) return;
  // Tras un arrastre o un toque en el asa, iOS genera el clic donde estaba el dedo cuando el panel ya se ha movido
  // (p. ej. sobre el buscador → teclado). Se anula: sin ratón/clic sintético y con un breve bloqueo.
  if (g.dragging || g.fromHandle) {
    if (e?.cancelable) e.preventDefault();
    sheet.dataset.justDragged = '1'; clearTimeout(gEnd.t); gEnd.t = setTimeout(() => delete sheet.dataset.justDragged, 450);
  }
  if (g.dragging) {
    const [t1, y1] = g.last[0], [t2, y2] = g.last[g.last.length - 1];
    const v = (y2 - y1) / Math.max(16, t2 - t1);              // px/ms (+ = hacia abajo)
    const y = curY() + v * 180;                                // proyección con la inercia
    let best = ORDER[0];
    for (const st of ORDER) if (Math.abs(yOf(st) - y) < Math.abs(yOf(best) - y)) best = st;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    setSheet(best);
  } else if (g.fromHandle) {
    setSheet(sheet.dataset.state === 'min' ? (S.view.type === 'home' ? 'peek' : 'half') : 'min');
  }
  g = null;
}

export function initSheet(onResize) {
  ['resize', 'orientationchange', 'pageshow'].forEach((ev) => addEventListener(ev, () => { measure(); setSheet(sheet.dataset.state); onResize(); }));
  visualViewport?.addEventListener('resize', () => { measure(); onResize(); });
  // Táctil: en todo el panel (passive:false para poder bloquear el scroll mientras se arrastra)
  sheet.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || e.target.closest('input')) return;
    const tt = e.touches[0];
    gStart(tt.clientY, tt.clientX, !!e.target.closest('#handle'));
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => { const tt = e.touches[0]; gMove(tt.clientY, tt.clientX, e); }, { passive: false });
  sheet.addEventListener('touchend', gEnd);
  sheet.addEventListener('touchcancel', gEnd);
  // Ratón: solo desde el asa
  $('#handle').addEventListener('mousedown', (e) => {
    gStart(e.clientY, e.clientX, true);
    const mm = (ev) => gMove(ev.clientY, ev.clientX, ev), mu = () => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); gEnd(); };
    addEventListener('mousemove', mm); addEventListener('mouseup', mu);
  });
  // Un arrastre no debe acabar en "click" sobre una fila
  sheet.addEventListener('click', (e) => { if (sheet.dataset.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  sheet.addEventListener('focusin', (e) => { if (sheet.dataset.justDragged) e.target.blur(); });
  // iOS desplaza la página al abrir el teclado y a veces no la devuelve: al quitar el foco, volver arriba
  document.addEventListener('focusout', () => setTimeout(() => { if (scrollY || document.scrollingElement?.scrollTop) scrollTo(0, 0); }, 60));
  setSheet('peek');
}
