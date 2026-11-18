"""Páginas estáticas indexables (SEO) a partir de js/data.js: una por lugar, una por distrito, índice y sitemap.
Salida: lugar/<id>/index.html, distrito/<id>/index.html, lugares/index.html, sitemap.xml, robots.txt.
Uso: python3 tools/build_seo.py (después de tools/build_data.py). Cada página enlaza a la app con ?p=<id> / ?d=<id>."""
import html, json, math, os, re, shutil, unicodedata
from datetime import date

SITE = 'https://www.madridpassport.com'
RED = '#D6202C'
TYPES = {'Plaza': 'Plaza', 'Calle': 'Calle', 'Barrio': 'Barrio', 'Parque': 'Parque', 'Gastronomía': 'Gastronomía', 'Mercado': 'Mercado',
         'Museo': 'Museo', 'Monumento': 'Monumento', 'Iglesia': 'Iglesia', 'Cultura': 'Cultura', 'Estadio': 'Estadio', 'Mirador': 'Mirador', 'Teatro': 'Teatro'}
PLURAL = {'Plaza': 'Plazas', 'Calle': 'Calles', 'Barrio': 'Barrios', 'Parque': 'Parques', 'Gastronomía': 'Gastronomía', 'Mercado': 'Mercados',
          'Museo': 'Museos', 'Monumento': 'Monumentos', 'Iglesia': 'Iglesias', 'Cultura': 'Cultura', 'Estadio': 'Estadios', 'Mirador': 'Miradores', 'Teatro': 'Teatros'}

places = [json.loads(l.strip().rstrip(',')) for l in open('js/data.js') if l.strip().startswith('{')]
BYID = {p['id']: p for p in places}
dists = {f['properties']['id']: f['properties']['name'] for f in json.load(open('data/distritos.geojson'))['features']}
def slug(s): return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()).strip('-')
barrios = {slug(f"{f['properties']['district']}-{f['properties']['name']}"): f['properties']['name'] for f in json.load(open('data/barrios.geojson'))['features']}
metro = json.load(open('data/metro.json'))
children = {}
for p in places:
    if p.get('parent') in BYID: children.setdefault(p['parent'], []).append(p)

e = lambda s: html.escape(str(s or ''), quote=True)
def dist(a, b):
    k = math.cos(math.radians(a[0]))
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * k)
def walk(m): return max(1, round(m * 1.3 / 80))
def fmt(m): return f'{round(m / 10) * 10} m' if m < 1000 else f'{m / 1000:.1f} km'.replace('.', ',')
def short(t, n=155):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0].rstrip(',;:') + '…'
def thumb(u, w):
    return u.replace('/960px-', f'/{w}px-') if u and '/960px-' in u else u

CSS = f"""*{{box-sizing:border-box}}:root{{--red:{RED};--ink:#141416;--muted:#6B6B75;--line:#EDEDF0;--bg:#fff;--bg2:#F6F6F8;color-scheme:light dark}}
@media (prefers-color-scheme:dark){{:root{{--ink:#F2F2F5;--muted:#8E8E98;--line:#26262D;--bg:#0F0F12;--bg2:#1B1B21}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}}
a{{color:inherit}}main{{max-width:680px;margin:0 auto;padding:0 16px 48px}}
header{{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:680px;margin:0 auto;padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--line)}}
.brand{{display:flex;align-items:center;gap:8px;font-weight:800;text-decoration:none;letter-spacing:-.01em}}.brand img{{width:28px;height:28px;border-radius:8px}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;background:var(--red);color:#fff;font-weight:700;text-decoration:none;font-size:15px}}
header .btn{{min-height:36px;padding:6px 14px;font-size:14px}}
.crumbs{{margin:16px 0 6px;font-size:13px;color:var(--muted)}}.crumbs a{{text-decoration:none}}.crumbs a:hover{{text-decoration:underline}}
h1{{font-size:30px;line-height:1.15;letter-spacing:-.02em;margin:4px 0 6px}}h2{{font-size:19px;margin:30px 0 8px}}
.sub{{margin:0 0 16px;color:var(--muted);font-size:15px}}.sub b{{color:var(--red);font-weight:700}}
figure{{margin:0 -16px 6px}}figure img{{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;background:var(--bg2)}}figcaption{{padding:4px 16px;font-size:11px;color:var(--muted)}}
.desc{{font-size:16.5px}}.src{{font-size:12px;color:var(--muted)}}
.facts{{display:grid;gap:8px;margin:16px 0;padding:14px;border-radius:16px;background:var(--bg2);font-size:15px}}.facts div{{display:flex;gap:8px}}.facts span{{color:var(--muted);min-width:96px}}
.cta{{margin:22px 0;padding:18px;border-radius:18px;background:rgba(214,32,44,.07);text-align:center}}.cta p{{margin:0 0 12px;font-weight:600}}
ul.list{{list-style:none;margin:0;padding:0}}ul.list li{{border-bottom:1px solid var(--line)}}ul.list a{{display:flex;justify-content:space-between;gap:12px;padding:11px 0;text-decoration:none}}
ul.list small{{color:var(--muted);white-space:nowrap}}.cols{{columns:2;column-gap:24px}}.cols li{{break-inside:avoid}}
.mp-user .cta,.mp-user header .btn{{display:none}}
footer{{max-width:680px;margin:0 auto;padding:24px 16px 40px;font-size:13px;color:var(--muted);border-top:1px solid var(--line)}}footer a{{margin-right:14px}}"""

def page(path, title, desc, body, ld, img=None):
    url = f'{SITE}/{path}'
    og_img = img or f'{SITE}/icons/icon-512.png'
    lds = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    out = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Madrid Passport">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{e(og_img)}"><meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0F0F12" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<script>try{{if(localStorage.getItem('mp.onboarded')||localStorage.getItem('mp.visits.v1'))document.documentElement.classList.add('mp-user')}}catch(e){{}}</script>
<style>{CSS}</style>
{lds}
</head>
<body>
<header><a class="brand" href="/"><img src="/icons/icon-192.png" alt="" width="28" height="28">Madrid Passport</a><a class="btn" href="/">Abrir la app</a></header>
<main>
{body}
</main>
<footer><a href="/lugares/">Todos los lugares</a><a href="/">App</a><a href="/privacy.html">Privacidad</a><br>Textos y fotos: Wikipedia y Wikimedia Commons (CC BY-SA).</footer>
</body>
</html>
"""
    os.makedirs(path, exist_ok=True)
    open(os.path.join(path, 'index.html'), 'w').write(out)

def crumbs(*items):
    li = ' › '.join(f'<a href="{u}">{e(n)}</a>' if u else e(n) for n, u in items)
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, **({'item': SITE + u} if u else {})} for i, (n, u) in enumerate(items)]}
    return f'<nav class="crumbs" aria-label="Migas">{li}</nav>', ld

def link_list(ps, origin=None, cls='list'):
    def row(p):
        extra = f'{walk(dist(origin, p["coords"]))} min a pie' if origin else TYPES.get(p['type'], p['type'])
        return f'<li><a href="/lugar/{p["id"]}/"><span>{e(p["name"])}</span><small>{e(extra)}</small></a></li>'
    return f'<ul class="{cls}">' + ''.join(row(p) for p in ps) + '</ul>'

for d in ('lugar', 'distrito', 'lugares'):
    shutil.rmtree(d, ignore_errors=True)

# ---- Lugares ----
for p in places:
    d_id, b_id = p.get('district'), p.get('barrio')
    dname, bname, tname = dists.get(d_id, 'Madrid'), barrios.get(b_id), TYPES.get(p['type'], p['type'])
    where = ', '.join(x for x in (bname, dname) if x)
    title = f"{p['name']} · {tname} en {dname}, Madrid | Madrid Passport"
    desc = short(p.get('desc')) or f"{p['name']}: {tname.lower()} en {where} (Madrid). Descúbrelo y séllalo en tu pasaporte de Madrid."
    nav, ld_crumbs = crumbs(('Madrid', '/lugares/'), (dname, f'/distrito/{d_id}/' if d_id else None), (p['name'], None))
    near = sorted((x for x in places if x['id'] != p['id']), key=lambda x: dist(p['coords'], x['coords']))[:6]
    st = min(metro, key=lambda s: dist(p['coords'], (s[1], s[2])))
    std = dist(p['coords'], (st[1], st[2]))
    par, kids = BYID.get(p.get('parent')), children.get(p['id'], [])
    img = p.get('img')
    body = f"""{nav}
<h1>{e(p['name'])}</h1>
<p class="sub"><b>{e(tname)}</b> · {e(where)}</p>
{f'<figure><img src="{e(img)}" alt="{e(p["name"])}" width="960" height="600"><figcaption>Foto: Wikimedia Commons</figcaption></figure>' if img else ''}
{f'<p class="desc">{e(p["desc"])}</p><p class="src">Texto: <a href="{e(p.get("url") or "")}" rel="nofollow noopener">Wikipedia</a></p>' if p.get('desc') else ''}
<div class="facts">
<div><span>Distrito</span><a href="/distrito/{d_id}/">{e(dname)}</a></div>
{f'<div><span>Barrio</span>{e(bname)}</div>' if bname else ''}
{f'<div><span>Está en</span><a href="/lugar/{par["id"]}/">{e(par["name"])}</a></div>' if par else ''}
{f'<div><span>Metro</span>{e(st[0])} ({e(st[3])}) · {fmt(std)}, {walk(std)} min a pie</div>' if std < 1500 else ''}
<div><span>Cómo llegar</span><a href="https://www.google.com/maps/dir/?api=1&amp;destination={p['coords'][0]},{p['coords'][1]}" rel="nofollow noopener">Google Maps</a></div>
</div>
<div class="cta"><p>¿Has estado en {e(p['name'])}? Séllalo en tu pasaporte y confírmalo con GPS.</p><a class="btn" href="/?p={p['id']}">Sellar en Madrid Passport</a></div>
{f'<h2>Aquí dentro</h2>{link_list(kids)}' if kids else ''}
<h2>Cerca de {e(p['name'])}</h2>
{link_list(near, p['coords'])}"""
    ld = {'@context': 'https://schema.org', '@type': 'TouristAttraction', 'name': p['name'], 'url': f"{SITE}/lugar/{p['id']}/",
          'geo': {'@type': 'GeoCoordinates', 'latitude': p['coords'][0], 'longitude': p['coords'][1]},
          'address': {'@type': 'PostalAddress', 'addressLocality': 'Madrid', 'addressRegion': dname, 'addressCountry': 'ES'},
          'touristType': tname}
    if p.get('desc'): ld['description'] = short(p['desc'], 300)
    if img: ld['image'] = img
    if par: ld['containedInPlace'] = {'@type': 'TouristAttraction', 'name': par['name'], 'url': f"{SITE}/lugar/{par['id']}/"}
    page(f"lugar/{p['id']}", title, desc, body, [ld, ld_crumbs], thumb(img, 960))

# ---- Distritos ----
by_d = {}
for p in places: by_d.setdefault(p.get('district'), []).append(p)
for d_id, dname in dists.items():
    ps = sorted(by_d.get(d_id, []), key=lambda p: p['name'])
    groups = {}
    for p in ps: groups.setdefault(p['type'], []).append(p)
    top = ', '.join(p['name'] for p in ps[:4])
    title = f"Qué ver en {dname} (Madrid): {len(ps)} lugares | Madrid Passport"
    desc = f"Guía de {dname}, distrito de Madrid: {len(ps)} lugares para visitar como {top}. Márcalos en tu pasaporte."
    nav, ld_crumbs = crumbs(('Madrid', '/lugares/'), (dname, None))
    secs = ''.join(f'<h2>{e(PLURAL.get(ty, ty))}</h2>{link_list(sorted(g, key=lambda p: p["name"]))}' for ty, g in sorted(groups.items(), key=lambda kv: -len(kv[1])))
    imgp = next((p for p in ps if p.get('img')), None)
    body = f"""{nav}
<h1>Qué ver en {e(dname)}</h1>
<p class="sub"><b>Distrito de Madrid</b> · {len(ps)} lugares</p>
<div class="cta"><p>Explora {e(dname)} en el mapa y sella cada lugar que visites.</p><a class="btn" href="/?d={d_id}">Abrir {e(dname)} en el mapa</a></div>
{secs}"""
    ld = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': f'Qué ver en {dname}', 'numberOfItems': len(ps),
          'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f"{SITE}/lugar/{p['id']}/", 'name': p['name']} for i, p in enumerate(ps)]}
    page(f'distrito/{d_id}', title, desc, body, [ld, ld_crumbs], thumb(imgp and imgp['img'], 960))

# ---- Índice ----
rows = ''.join(f'<li><a href="/distrito/{d}/"><span>{e(n)}</span><small>{len(by_d.get(d, []))} lugares</small></a></li>' for d, n in sorted(dists.items(), key=lambda kv: kv[1]))
types = {}
for p in places: types.setdefault(p['type'], []).append(p)
tsecs = ''.join(f'<h2>{e(PLURAL.get(ty, ty))} <small style="color:var(--muted);font-weight:600">{len(g)}</small></h2>{link_list(sorted(g, key=lambda p: p["name"]), cls="list cols")}'
                for ty, g in sorted(types.items(), key=lambda kv: -len(kv[1])))
nav, ld_crumbs = crumbs(('Madrid', None))
body = f"""{nav}
<h1>Qué ver en Madrid: {len(places)} lugares en 21 distritos</h1>
<p class="sub">Plazas, museos, parques, miradores, mercados y tabernas de toda la ciudad, del centro a los barrios.</p>
<div class="cta"><p>Convierte tu paseo en un pasaporte: marca cada lugar, confírmalo con GPS y sube de nivel.</p><a class="btn" href="/">Empezar mi pasaporte</a></div>
<h2>Distritos</h2><ul class="list">{rows}</ul>
{tsecs}"""
page('lugares', f'Qué ver en Madrid: {len(places)} lugares por distritos | Madrid Passport',
     f'Guía de Madrid por sus 21 distritos: {len(places)} lugares para visitar (plazas, museos, parques, miradores y más). Márcalos en tu pasaporte.',
     body, [ld_crumbs])

# ---- Sitemap y robots ----
today = date.today().isoformat()
urls = ['/', '/lugares/'] + [f'/distrito/{d}/' for d in dists] + [f"/lugar/{p['id']}/" for p in places]
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                               + ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\nDisallow: /ingest/\nDisallow: /mockups/\nDisallow: /tests/\nDisallow: /tools/\n\nSitemap: {SITE}/sitemap.xml\n')
print(len(urls), 'URLs en sitemap.xml')
