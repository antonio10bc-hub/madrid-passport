// Utilidades sin estado: DOM, texto, geometría y formato.
import { locale, t } from './i18n.js';

export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const isDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

// ---------- Geo ----------
export const dist = ([a, b], [c, d]) => {
  const R = 6371e3, r = Math.PI / 180;
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
export const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
export const inRing = ([x, y], ring) => {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
};
export const inGeom = (pt, g) => polys(g).some((p) => inRing(pt, p[0]) && !p.slice(1).some((h) => inRing(pt, h)));
export const inBbox = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
export const bboxOf = (g) => {
  let b = [180, 90, -180, -90];
  polys(g).forEach((p) => p[0].forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }));
  return b;
};
export const labelPoint = (g) => {
  const big = polys(g).sort((a, b) => b[0].length - a[0].length)[0];
  const [x0, y0, x1, y1] = bboxOf({ type: 'Polygon', coordinates: big });
  const c = [(x0 + x1) / 2, (y0 + y1) / 2];
  if (inRing(c, big[0])) return c;
  for (let k = 1; k < 10; k++) for (const dx of [-1, 1]) {
    const p = [c[0] + (dx * k * (x1 - x0)) / 20, c[1]];
    if (inRing(p, big[0])) return p;
  }
  return c;
};
export const ll = (p) => [p.coords[1], p.coords[0]];       // [lat, lng] → [lng, lat]

// ---------- UI ----------
let toastT;
// action = { label, fn }: botón dentro del aviso (p. ej. «Deshacer»), que dura más
export const toast = (msg, err, action) => {
  const el = $('#toast');
  el.textContent = msg; el.className = 'toast show' + (err ? ' err' : '') + (action ? ' act' : '');
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.onclick = (e) => { e.stopPropagation(); el.className = 'toast'; action.fn(); };
    el.appendChild(b);
  }
  clearTimeout(toastT); toastT = setTimeout(() => (el.className = 'toast'), action ? 4500 : 2600);
};
export const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
export const ICON_GPS = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><path d="M9.5 10l2 2 3.5-3.5"/></svg>';
export const ICON_X = '<svg class="icon-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// ---------- Fechas ----------
export const fmtDate = (ts) => new Date(ts).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: new Date(ts).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
export const stampDate = (ts) => { const d = new Date(ts); return `${d.getDate()} ${d.toLocaleDateString(locale(), { month: 'short' }).replace('.', '').toUpperCase()} ${d.getFullYear()}`; };
export const dayLabel = (ts) => {
  const d = new Date(ts), today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return diff === 0 ? t('today') : diff === 1 ? t('yesterday') : d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
};
