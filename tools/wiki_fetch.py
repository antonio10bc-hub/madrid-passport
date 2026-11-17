"""Enriquecer tools/places.tsv con Wikipedia (es) + Wikidata: coordenadas, foto, extracto y URL.
Salida: tools/wiki.json. Uso: python3 tools/wiki_fetch.py
Si un título no existe se busca el mejor resultado en Wikipedia (revisar 'title' en la salida)."""
import csv, json, time, urllib.error, urllib.parse, urllib.request

UA = 'madrid-passport-dev/0.1 (open-source app prototype)'
rows = list(csv.DictReader(open('tools/places.tsv'), delimiter='\t'))


def get(base, params):
    url = base + '?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    for wait in (0, 30, 60, 120, 240, 300, 300):
        time.sleep(wait)
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            print('429, reintento…')
    raise SystemExit('API sigue limitando (429)')


WP, WD = 'https://es.wikipedia.org/w/api.php', 'https://www.wikidata.org/w/api.php'

# 1) Resolver títulos inexistentes con la búsqueda
for r in rows:
    r['title'] = r['wiki']
titles = [r['wiki'] for r in rows]
exists = {}
for i in range(0, len(titles), 50):
    d = get(WP, {'action': 'query', 'titles': '|'.join(titles[i:i+50]), 'redirects': 1})
    m = {}
    for k in ('normalized', 'redirects'):
        for n in d['query'].get(k, []): m[n['from']] = n['to']
    for p in d['query']['pages']: exists[p['title']] = not p.get('missing')
    for t in titles[i:i+50]:
        tt = m.get(m.get(t, t), m.get(t, t))
        for r in rows:
            if r['wiki'] == t: r['title'] = tt
    time.sleep(3)
for r in rows:
    if not exists.get(r['title']):
        s = get(WP, {'action': 'query', 'list': 'search', 'srsearch': r['name'] + ' Madrid', 'srlimit': 1})['query']['search']
        r['title'] = s[0]['title'] if s else None
        print(f"buscado {r['id']}: {r['wiki']!r} -> {r['title']!r}")
        time.sleep(3)

# 2) Extracto, foto e id de Wikidata
info = {}
ts = sorted({r['title'] for r in rows if r['title']})
for i in range(0, len(ts), 20):
    d = get(WP, {'action': 'query', 'titles': '|'.join(ts[i:i+20]), 'redirects': 1,
                 'prop': 'pageprops|pageimages|extracts|info|coordinates', 'ppprop': 'wikibase_item',
                 'pithumbsize': 800, 'exintro': 1, 'explaintext': 1, 'exsentences': 3, 'exlimit': 20, 'inprop': 'url'})
    for p in d['query']['pages']:
        c = (p.get('coordinates') or [{}])[0]
        info[p['title']] = {'qid': p.get('pageprops', {}).get('wikibase_item'), 'img': p.get('thumbnail', {}).get('source'),
                            'desc': p.get('extract'), 'url': p.get('fullurl'), 'lat': c.get('lat'), 'lng': c.get('lon')}
    time.sleep(4)

# 3) Coordenadas (P625) y foto (P18) de Wikidata
qids = sorted({v['qid'] for v in info.values() if v['qid']})
wd = {}
for i in range(0, len(qids), 50):
    d = get(WD, {'action': 'wbgetentities', 'ids': '|'.join(qids[i:i+50]), 'props': 'claims'})
    for q, e in d['entities'].items():
        cl = e.get('claims', {})
        coord = cl.get('P625', [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value')
        img = cl.get('P18', [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value')
        wd[q] = {'lat': coord and coord['latitude'], 'lng': coord and coord['longitude'], 'p18': img}
    time.sleep(4)

out = {}
for r in rows:
    v = info.get(r['title'], {})
    w = wd.get(v.get('qid'), {})
    img = v.get('img') or (w.get('p18') and 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(w['p18'].replace(' ', '_')) + '?width=800')
    out[r['id']] = {'title': r['title'], 'qid': v.get('qid'), 'lat': w.get('lat') or v.get('lat'), 'lng': w.get('lng') or v.get('lng'),
                    'img': img, 'desc': v.get('desc'), 'url': v.get('url')}
json.dump(out, open('tools/wiki.json', 'w'), ensure_ascii=False, indent=1)
print('total', len(out), '| sin coords:', [k for k, v in out.items() if v['lat'] is None],
      '| sin foto:', [k for k, v in out.items() if not v['img']], '| sin desc:', [k for k, v in out.items() if not v['desc']])
