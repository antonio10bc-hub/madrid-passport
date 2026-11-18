"""Estaciones de Metro de Madrid (nombre, coordenadas y líneas) desde la Wikipedia en español.
Líneas: de las categorías de cada estación. Salida: data/metro.json
[[nombre, lat, lng, "1 2"], …]. Uso: python3 tools/metro_fetch.py"""
import json, re, time, urllib.error, urllib.parse, urllib.request

UA = 'MadridPassportBot/0.2 (https://www.madridpassport.com; build script de datos)'
WP = 'https://es.wikipedia.org/w/api.php'


def get(params):
    url = WP + '?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    for attempt in range(12):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            wait = max(int(e.headers.get('Retry-After') or 5), 5) * (1 + attempt // 3)
            print(f'429, reintento en {wait}s…', flush=True); time.sleep(wait)
    raise SystemExit('API sigue limitando (429)')


# 1) Categoría madre de las estaciones (el nombre exacto varía): búsqueda en el espacio de categorías
cands = [r['title'] for r in get({'action': 'query', 'list': 'search', 'srnamespace': 14, 'srsearch': 'Estaciones Metro de Madrid', 'srlimit': 20})['query']['search']]
print(cands, flush=True)
lines_cats = [c for c in cands if re.fullmatch(r'Categoría:Estaciones (de la línea \d+|del Ramal) del metro de Madrid', c, re.I)]
print(len(lines_cats), 'categorías de línea', flush=True)
# 2) Miembros con coordenadas y categorías (de ellas salen las líneas). Subcategorías por línea si las hay.
pages, todo, seen = {}, list(lines_cats), set()
while todo:
    cat = todo.pop(); seen.add(cat)
    cont = {}
    while True:
        d = get({'action': 'query', 'generator': 'categorymembers', 'gcmtitle': cat, 'gcmlimit': 50, 'gcmtype': 'page|subcat',
                 'prop': 'coordinates|categories', 'cllimit': 'max', **cont})
        for p in d.get('query', {}).get('pages', []):
            if p['ns'] == 14:
                continue
            e = pages.setdefault(p['title'], {'c': None, 'l': set()})
            if p.get('coordinates'): e['c'] = p['coordinates'][0]
            for c in p.get('categories', []):
                m = re.search(r'[Ll]ínea (\d+)', c['title'])
                if m and re.search('metro de Madrid', c['title'], re.I) and 'ligero' not in c['title']: e['l'].add(m.group(1))
                if 'Ramal' in c['title']: e['l'].add('R')
            m = re.search(r'[Ll]ínea (\d+)', cat)
            e['l'].add(m.group(1) if m else 'R')
        time.sleep(4)
        if 'continue' not in d: break
        cont = d['continue']
    print(cat, len(pages), flush=True)

out = []
for title, e in pages.items():
    if not e['c'] or not title.lower().startswith('estación'): continue
    name = re.sub(r'^Estación de(l)? ', lambda m: 'El ' if m.group(1) else '', title)
    name = re.sub(r'\s*\((Metro de Madrid|Madrid|metro)\)$', '', name)
    ls = sorted(e['l'], key=lambda x: (x == 'R', int(x) if x.isdigit() else 0))
    out.append([name, round(e['c']['lat'], 5), round(e['c']['lon'], 5), ' '.join(ls)])
json.dump(sorted(out), open('data/metro.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'estaciones', '| sin línea:', sum(1 for o in out if not o[3]))
