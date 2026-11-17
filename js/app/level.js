// Puntos y niveles del viajero. Funciones puras (se prueban en tests/e2e).
export const PTS = { visit: 10, gps: 15, barrio: 5, district: 50, badge: 20 };
export const LEVELS = [
  { id: 'turista', min: 0 }, { id: 'forastero', min: 60 }, { id: 'visitante', min: 200 }, { id: 'vecino', min: 500 },
  { id: 'madrileno', min: 1000 }, { id: 'castizo', min: 1800 }, { id: 'chulapo', min: 3000 }, { id: 'gato', min: 4500 },
];

// s: { places, districts, barrios, lvl(id), blvl(b), badges }
export function points(s) {
  const visit = s.places.filter((p) => s.lvl(p.id) > 0).length, gps = s.places.filter((p) => s.lvl(p.id) === 2).length;
  const barrio = s.barrios.filter((b) => s.blvl(b) > 0).length;
  const district = s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length;
  const badge = Object.keys(s.badges || {}).length;
  const parts = { visit, gps, barrio, district, badge };
  const total = Object.entries(parts).reduce((a, [k, n]) => a + n * PTS[k], 0);
  return { total, parts };
}

export function levelOf(total) {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1] || null;
  const pct = next ? (total - cur.min) / (next.min - cur.min) : 1;
  return { i, cur, next, pct, toNext: next ? next.min - total : 0 };
}
