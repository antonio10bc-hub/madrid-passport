// Comunidad (Supabase, datos anónimos y agregados): cuántos viajeros han sellado cada lugar, a cuántos les encantó,
// en qué puesto lo sellaste tú, joyas ocultas y avisos de error. Funciones SQL en supabase/schema.sql.
// Si Supabase no está configurado o las funciones aún no existen, todo se oculta sin errores.
const cfg = () => window.MP_CONFIG || {};
const MIN_N = 3;                                       // por privacidad, no se muestran cifras de menos de 3 viajeros
const TTL = 6 * 3600e3, KEY = 'mp.stats.v1';
let stats = null, loading = null;
const rpc = async (fn, body = {}) => {
  const c = cfg();
  if (!c.supabaseUrl) throw new Error('sin supabase');
  const r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(fn + ' ' + r.status);
  return r.json();
};

// { placeId: [viajeros que lo han sellado, a cuántos les encantó] }; se pide como mucho cada 6 h
export function loadStats(onReady) {
  if (stats) return Promise.resolve(stats);
  try { const c = JSON.parse(localStorage.getItem(KEY)); if (c && Date.now() - c.at < TTL) return Promise.resolve((stats = c.d)); } catch {}
  return (loading ||= rpc('place_stats').then((d) => {
    stats = d || {};
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), d: stats })); } catch {}
    onReady?.();
    return stats;
  }).catch(() => (stats = {})));
}
export const statsFor = (id) => {
  const [n = 0, love = 0] = stats?.[id] || [];
  return n >= MIN_N ? { n, love } : null;
};
// Joya oculta: gusta mucho (≥ 50 % «me encantó») y la ha sellado poca gente (menos de la mitad de la mediana)
let medianN = null;
export function isGem(id) {
  const s = statsFor(id);
  if (!s || s.love / s.n < 0.5) return false;
  if (medianN == null) {
    const ns = Object.values(stats || {}).map(([n]) => n).filter((n) => n >= MIN_N).sort((a, b) => a - b);
    medianN = ns.length ? ns[Math.floor(ns.length / 2)] : 0;
  }
  return s.n <= Math.max(MIN_N, medianN / 2);
}

// Puesto en el que sellaste un lugar (1 = el primero de todos los viajeros con cuenta)
const ranks = {};
export function rankFor(id, ts, onReady) {
  const k = id + '|' + ts;
  if (k in ranks) return ranks[k];
  ranks[k] = null;
  rpc('place_rank', { pid: id, ts }).then((r) => { ranks[k] = +r || null; onReady?.(); }).catch(() => {});
  return null;
}

// Aviso de error en un lugar: tabla «reports» (solo inserción; nadie puede leerla desde la app).
// Máximo 5 al día: lo impone Supabase por IP (trigger en schema.sql) y aquí se cuenta también para avisar antes de escribir.
const REP_KEY = 'mp.reports', REP_MAX = 5, DAY = 864e5;
const recentReports = () => { try { return (JSON.parse(localStorage.getItem(REP_KEY)) || []).filter((ts) => Date.now() - ts < DAY); } catch { return []; } };
export const reportLimitReached = () => recentReports().length >= REP_MAX;
// true = enviado · 'limit' = límite diario alcanzado · false = error
export async function sendReport(place, reason, note, lang) {
  const c = cfg();
  if (!c.supabaseUrl) return false;
  const r = await fetch(`${c.supabaseUrl}/rest/v1/reports`, { method: 'POST',
    headers: { apikey: c.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ place, reason, note: note || null, lang }) });
  if (r.ok) { try { localStorage.setItem(REP_KEY, JSON.stringify([...recentReports(), Date.now()])); } catch {} return true; }
  if ((await r.text().catch(() => '')).includes('too_many_reports')) return 'limit';
  return false;
}
