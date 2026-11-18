// Metro más cercano a un lugar (data/metro.json, generado con tools/metro_fetch.py: [nombre, lat, lng, "1 2 R"]).
import { dist } from './util.js';

let stations = null, loading = null;
export const loadMetro = () => (loading ||= fetch(MP_CITY.files.metro).then((r) => r.json()).then((d) => (stations = d)).catch(() => (stations = [])));

// Colores oficiales de las líneas
const COLORS = { 1: '#38A3DC', 2: '#E0292F', 3: '#FFD000', 4: '#B65518', 5: '#8FD400', 6: '#98989B', 7: '#EE7518', 8: '#EC82B1',
  9: '#A60084', 10: '#005AA9', 11: '#009B3A', 12: '#A49800', R: '#FFFFFF' };
const DARK_TEXT = new Set(['3', '5', '6', '8', '12', 'R']);
export const lineBadge = (l) => `<i class="mline${l === 'R' ? ' r' : ''}" style="background:${COLORS[l] || '#999'};color:${DARK_TEXT.has(l) ? '#111' : '#fff'}">${l}</i>`;

// { name, lines: ['1','2'], d (m), min (a pie) } o null si aún no hay datos o queda a más de 1,5 km
export function nearestMetro(p) {
  if (!stations?.length) return null;
  let best = null;
  for (const [name, lat, lng, ls] of stations) {
    const d = dist(p.coords, [lat, lng]);
    if (!best || d < best.d) best = { name, lines: ls ? ls.split(' ') : [], d };
  }
  if (!best || best.d > 1500) return null;
  best.min = Math.max(1, Math.round((best.d * 1.3) / 80));          // 80 m/min y algo de rodeo por las calles
  return best;
}
