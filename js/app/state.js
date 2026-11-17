// Estado compartido de la app. Los módulos leen y escriben S.*; las colecciones se rellenan en geo.js.
export const KEY = 'mp.visits.v1', KEY_BADGES = 'mp.badges.v1';
// visits: { placeId: { lvl, t, gpsAt, gps } } y también barrios: { 'b:<barrioId>': { lvl, t, gpsAt } }
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };

export const S = {
  visits: read(KEY), badges: read(KEY_BADGES),
  view: { type: 'home' },            // home | district | place
  query: '', typeFilter: null, statusFilter: 'all', selId: null, myPos: null,
  tab: 'map', debug: false, fakePos: null, placing: false,
};
try {
  S.debug = new URLSearchParams(location.search).has('debug') || localStorage.getItem('mp.debug') === '1';
  S.fakePos = JSON.parse(localStorage.getItem('mp.fake'));
} catch {}

export const PLACES = window.PLACES;
export const BYID = Object.fromEntries(PLACES.map((p) => [p.id, p]));
export const DISTRICTS = [];         // { id, name, short, fid, feature, bbox, label, places, barrios, ini }
export const BARRIOS = [];           // { id, name, district, fid, bbox, places }
export const districtOf = {};        // placeId -> distrito
export const barrioOf = {};          // placeId -> barrio

export const lvl = (id) => S.visits[id]?.lvl || 0;
export const progress = (places) => ({ done: places.filter((p) => lvl(p.id) > 0).length, gps: places.filter((p) => lvl(p.id) === 2).length, total: places.length });
// Barrio: el nivel guardado (marcado a mano o GPS dentro del barrio) o el de sus lugares visitados
export const bKey = (b) => 'b:' + b.id;
export const blvl = (b) => Math.max(lvl(bKey(b)), ...b.places.map((p) => lvl(p.id)), 0);
export const bprogress = (barrios) => ({ done: barrios.filter((b) => blvl(b) > 0).length, gps: barrios.filter((b) => blvl(b) === 2).length, total: barrios.length });
export const districtDone = (d) => d.places.length > 0 && d.places.every((p) => lvl(p.id) > 0);

export const currentDistrict = () => (S.view.type === 'district' ? DISTRICTS.find((d) => d.id === S.view.id) : S.view.type === 'place' ? districtOf[S.view.id] : null);

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S.visits)); localStorage.setItem(KEY_BADGES, JSON.stringify(S.badges)); } catch {}
}
const listeners = [];
export const onSave = (fn) => listeners.push(fn);
export function save() { persist(); listeners.forEach((fn) => fn()); }
