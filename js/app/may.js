// May: mascota de la app (fruto del madroño). SVG plano con ojos saltones; estados: happy | wow | party | sleep.
const RING = Array.from({ length: 26 }, (_, i) => { const a = (i * 2 * Math.PI) / 26;
  return `<circle cx="${(50 + 37 * Math.cos(a)).toFixed(1)}" cy="${(57 + 37 * Math.sin(a)).toFixed(1)}" r="5"/>`; }).join('');
const DOTS = [[30, 32], [44, 26], [58, 27], [71, 34], [22, 48], [80, 50], [20, 66], [81, 67], [28, 82], [42, 88], [58, 88], [72, 82]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('');
const LASH = '<g stroke="#141414" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M27 41l-3-6M34 38l-1-7M41 39l2-6M59 39l-2-6M66 38l1-7M73 41l3-6"/></g>';
const EYES = '<circle cx="37" cy="55" r="12" fill="#fff" stroke="#141414" stroke-width="3"/><circle cx="63" cy="55" r="12" fill="#fff" stroke="#141414" stroke-width="3"/>';
const FACE = {
  happy: LASH + EYES + '<circle cx="40" cy="57" r="6.5" fill="#141414"/><circle cx="60" cy="57" r="6.5" fill="#141414"/><circle cx="42" cy="54.5" r="2.1" fill="#fff"/><circle cx="62" cy="54.5" r="2.1" fill="#fff"/><path d="M43 74q7 6 14 0" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/>',
  wow: LASH + EYES + '<circle cx="37" cy="54" r="4.2" fill="#141414"/><circle cx="63" cy="54" r="4.2" fill="#141414"/><ellipse cx="50" cy="76" rx="4" ry="5" fill="#141414"/>',
  party: '<g stroke="#141414" stroke-width="2.6" stroke-linecap="round"><path d="M27 47l-4-3M33 45l-2-5M67 45l2-5M73 47l4-3"/></g><path d="M27 57q10-11 20 0M53 57q10-11 20 0" fill="none" stroke="#141414" stroke-width="3.4" stroke-linecap="round"/><path d="M40 67q10 14 20 0z" fill="#141414"/>',
  sleep: '<path d="M27 56q10 8 20 0M53 56q10 8 20 0" fill="none" stroke="#141414" stroke-width="3.4" stroke-linecap="round"/><g stroke="#141414" stroke-width="2.4" stroke-linecap="round"><path d="M30 61l-2 4M37 63v4M44 61l2 4M56 61l-2 4M63 63v4M70 61l2 4"/></g><path d="M46 75q4 3 8 0" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/>',
};
export const may = (mood = 'happy', cls = 'may') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">
<path d="M50 22q1-7 4-11" fill="none" stroke="#141414" stroke-width="3.2" stroke-linecap="round"/>
<path d="M53 13c5-8 14-11 23-9-4 8-13 11-23 9z" fill="#3E8E5A"/><path d="M51 13c-5-7-13-9-21-6 4 7 13 9 21 6z" fill="#2F7A4A"/>
<g fill="#F0502F">${RING}<circle cx="50" cy="57" r="37"/></g><g fill="#C9361E">${DOTS}</g>${FACE[mood] || FACE.happy}</svg>`;
window.MPMay = may;   // para share.js (script clásico)
