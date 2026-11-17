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
                'img': w.get('img'), 'desc': w.get('desc'), 'url': w.get('url'), 'wiki_en': w.get('title_en')})
    seen.add(r['id'])
for k, v in old.items():                                             # lugares antiguos sin entrada en el TSV
    if k not in seen: out.append({'id': k, **v, 'wiki': None})
js = ["// Generado por tools/build_data.py — editar tools/places.tsv / tools/coords.json y regenerar.",
      "// wiki = título de Wikipedia (es) para foto y descripción; wiki_en = título en inglés (descripción en inglés, se pide en el navegador). coords = [lat, lng].",
      "window.PLACES = ["]
for p in out:
    js.append('  ' + json.dumps({k: v for k, v in p.items() if v not in ('', None)}, ensure_ascii=False) + ',')
js.append('];')
open('js/data.js', 'w').write('\n'.join(js) + '\n')
print(len(out), 'lugares')
