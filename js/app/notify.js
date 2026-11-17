// Avisos tipo notificación que bajan desde arriba (logros, subidas de nivel). En cola, uno tras otro.
// Se cierran solos, al deslizar hacia arriba o al tocarlos (y entonces ejecutan onTap).
import { $, esc } from './util.js';

const queue = [];
let showing = false;

export function notify({ icon = 'crown', kicker = '', title, text = '', gold = false, onTap }) {
  queue.push({ icon, kicker, title, text, gold, onTap });
  if (!showing) next();
}

function next() {
  const n = queue.shift();
  if (!n) { showing = false; return; }
  showing = true;
  const el = document.createElement('div');
  el.className = 'notif' + (n.gold ? ' gold' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="nt-ico">${MP_ICON(n.icon, 'ico')}</span>
    <span class="nt-txt">${n.kicker ? `<small>${esc(n.kicker)}</small>` : ''}<b>${esc(n.title)}</b>${n.text ? `<span>${esc(n.text)}</span>` : ''}</span>`;
  $('#app').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  let closed = false, y0 = null;
  const close = () => {
    if (closed) return; closed = true;
    clearTimeout(timer);
    el.classList.remove('in');
    setTimeout(() => { el.remove(); next(); }, 320);
  };
  const timer = setTimeout(close, 3800);
  el.addEventListener('click', () => { n.onTap?.(); close(); });
  el.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 < -12) close(); }, { passive: true });
  navigator.vibrate?.(15);
}
