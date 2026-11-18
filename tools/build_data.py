"""Genera js/data.js a partir de tools/places.tsv + coordenadas (data.js previo / tools/coords.json / tools/wiki.json).
Uso: python3 tools/build_data.py"""
import csv, json, os, re
rows = list(csv.DictReader(open('tools/places.tsv'), delimiter='\t'))
old = {}
for line in open('js/data.js'):                                     # formato actual: un objeto JSON por línea
    line = line.strip().rstrip(',')
    if line.startswith('{'):
        o = json.loads(line); old[o['id']] = {'zone': o.get('zone', ''), 'name': o['name'], 'type': o['type'], 'coords': o['coords']}
for m in re.finditer(r"\{ id: '([^']+)'(?:, zone: '([^']*)')?, name: '((?:[^'\\]|\\.)*)', type: '([^']+)', coords: \[([\d.]+), (-[\d.]+)\]", open('js/data.js').read()):
    old[m[1]] = {'zone': m[2] or '', 'name': m[3].replace("\\'", "'"), 'type': m[4], 'coords': [float(m[5]), float(m[6])]}
coords = json.load(open('tools/coords.json'))                       # coordenadas manuales (prioridad sobre data.js)
override = json.load(open('tools/district_override.json'))  # lugares en el límite entre distritos
wiki = json.load(open('tools/wiki.json')) if os.path.exists('tools/wiki.json') else {}
# Informe generado en la app (modo debug → Validar): manda sobre wiki.json
if os.path.exists('tools/validacion-lugares.json'):
    for v in json.load(open('tools/validacion-lugares.json')):
        if v.get('kind') == 'standard':
            e = wiki.setdefault(v['id'], {})
            if v.get('wiki'): e['lat'], e['lng'] = v['wiki']
            e['img'] = v.get('img') or e.get('img'); e['desc'] = v.get('desc') or e.get('desc'); e['url'] = v.get('url') or e.get('url')
out, seen = [], set()
for r in rows:
    w = wiki.get(r['id'], {})
    c = (w.get('lat') and [round(w['lat'], 5), round(w['lng'], 5)]) if os.path.exists('tools/validacion-lugares.json') else None
    c = c or coords.get(r['id']) or (w.get('lat') and [round(w['lat'], 5), round(w['lng'], 5)]) or old.get(r['id'], {}).get('coords')
    if not c: print('SIN COORDS:', r['id']); continue
    out.append({'id': r['id'], 'zone': r['zone'], 'name': r['name'], 'type': r['type'], 'coords': c, 'wiki': r['wiki'], 'district': override.get(r['id']),
                'img': w.get('img'), 'desc': w.get('desc'), 'url': w.get('url'), 'wiki_en': w.get('title_en'), 'parent': r.get('parent') or None})
    seen.add(r['id'])
for k, v in old.items():                                             # lugares antiguos sin entrada en el TSV
    if k not in seen: out.append({'id': k, **v, 'wiki': None})
# Distrito y barrio de cada lugar (la app ya no lo calcula al arrancar)
def _polys(g): return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
def _in_ring(x, y, r):
    ins, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i]; xj, yj = r[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: ins = not ins
        j = i
    return ins
def _in_geom(x, y, g): return any(_in_ring(x, y, p[0]) and not any(_in_ring(x, y, h) for h in p[1:]) for p in _polys(g))
import unicodedata
def _slug(s): return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()).strip('-')
dist_f = json.load(open('data/distritos.geojson'))['features']
bar_f = json.load(open('data/barrios.geojson'))['features']
for p in out:
    y, x = p['coords']
    if not p.get('district'):
        d = next((f for f in dist_f if _in_geom(x, y, f['geometry'])), None)
        if d: p['district'] = d['properties']['id']
    b = next((f for f in bar_f if f['properties']['district'] == p.get('district') and _in_geom(x, y, f['geometry'])), None)
    if b: p['barrio'] = _slug(f"{b['properties']['district']}-{b['properties']['name']}")
js = ["// Generado por tools/build_data.py — editar tools/places.tsv / tools/coords.json y regenerar.",
      "// wiki = título de Wikipedia (es) para foto y descripción; wiki_en = título en inglés (descripción en inglés, se pide en el navegador). coords = [lat, lng].",
      "window.PLACES = ["]
for p in out:
    js.append('  ' + json.dumps({k: v for k, v in p.items() if v not in ('', None)}, ensure_ascii=False) + ',')
js.append('];')
open('js/data.js', 'w').write('\n'.join(js) + '\n')
print(len(out), 'lugares')
