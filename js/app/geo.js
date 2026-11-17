// Carga los límites (distritos y barrios) y asigna cada lugar a su distrito y barrio.
import { PLACES, DISTRICTS, BARRIOS, districtOf, barrioOf } from './state.js';
import { bboxOf, labelPoint, inGeom, inBbox, ll, norm, slug } from './util.js';

export let distGeo = null, barGeo = null;

export async function loadGeo() {
  [distGeo, barGeo] = await Promise.all(['data/distritos.geojson', 'data/barrios.geojson'].map((u) => fetch(u).then((r) => r.json())));
  distGeo.features.forEach((f) => {
    const placesIn = PLACES.filter((p) => (p.district ? p.district === f.properties.id : inGeom(ll(p), f.geometry)));
    DISTRICTS.push({
      id: f.properties.id, name: f.properties.name, short: f.properties.name.split('-')[0], fid: f.id, feature: f,
      bbox: bboxOf(f.geometry), label: labelPoint(f.geometry), places: placesIn, barrios: [],
      ini: f.properties.name.replace(/-.*/, '').split(' ').filter((w) => w.length > 2).map((w) => w[0]).join('').slice(0, 2),
    });
  });
  DISTRICTS.forEach((d) => d.places.forEach((p) => (districtOf[p.id] = d)));
  barGeo.features.forEach((f, i) => {
    const id = slug(`${f.properties.district}-${f.properties.name}`);
    f.id = i; f.properties.id = id;
    const d = DISTRICTS.find((x) => x.id === f.properties.district);
    const b = { id, name: f.properties.name, district: d, fid: i, feature: f, bbox: bboxOf(f.geometry), places: [] };
    BARRIOS.push(b); d?.barrios.push(b);
  });
  PLACES.forEach((p) => {
    const d = districtOf[p.id];
    if (!d) return console.warn('Sin distrito:', p.id);
    const pt = ll(p);
    const b = d.barrios.find((x) => inBbox(pt, x.bbox) && inGeom(pt, x.feature.geometry));
    if (b) { barrioOf[p.id] = b; b.places.push(p); }
    p._search = norm(`${p.name} ${p.zone || ''} ${p.type} ${d.name} ${b?.name || ''}`);
  });
  DISTRICTS.forEach((d) => d.barrios.sort((a, b) => a.name.localeCompare(b.name, 'es')));
}

// Barrio que contiene un punto [lat, lng]
export function barrioAt([lat, lng]) {
  const pt = [lng, lat];
  return BARRIOS.find((b) => inBbox(pt, b.bbox) && inGeom(pt, b.feature.geometry)) || null;
}
