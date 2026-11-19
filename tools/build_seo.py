"""Páginas estáticas indexables (SEO) en español e inglés a partir de js/data.js (+ tools/wiki.json para el inglés).
Salida ES: lugar/<id>/, distrito/<id>/, lugares/ · EN: en/place/<id>/, en/district/<id>/, en/places/ · sitemap.xml y robots.txt.
Cada página enlaza su versión en el otro idioma (hreflang) y a la app con ?p=<id> / ?d=<id> (&lang=en).
Uso: python3 tools/build_seo.py (después de tools/build_data.py). Datos de la ciudad en tools/city.json."""
import html, json, math, os, re, shutil, unicodedata
from datetime import date

CITY = json.load(open('tools/city.json'))
SITE, APP, CNAME = CITY['site'], CITY['app'], CITY['name']
RED = '#D6202C'
TYPES = {'Plaza': ('Plaza', 'Plazas', 'Square', 'Squares'), 'Calle': ('Calle', 'Calles', 'Street', 'Streets'), 'Barrio': ('Zona', 'Zonas', 'Area', 'Areas'),
         'Parque': ('Parque', 'Parques', 'Park', 'Parks'), 'Gastronomía': ('Gastronomía', 'Gastronomía', 'Food & drink', 'Food & drink'), 'Mercado': ('Mercado', 'Mercados', 'Market', 'Markets'),
         'Museo': ('Museo', 'Museos', 'Museum', 'Museums'), 'Monumento': ('Monumento', 'Monumentos', 'Monument', 'Monuments'), 'Iglesia': ('Iglesia', 'Iglesias', 'Church', 'Churches'),
         'Cultura': ('Cultura', 'Cultura', 'Culture', 'Culture'), 'Estadio': ('Estadio', 'Estadios', 'Stadium', 'Stadiums'), 'Mirador': ('Mirador', 'Miradores', 'Viewpoint', 'Viewpoints'),
         'Teatro': ('Teatro', 'Teatros', 'Theatre', 'Theatres')}

# Textos por idioma. Rutas: lugar/distrito/índice.
L = {
    'es': dict(lang='es', locale='es_ES', place='lugar', district='distrito', index='lugares', app_q='', open='Abrir la app', all='Todos los lugares', privacy='Privacidad',
               credits='Textos y fotos: Wikipedia y Wikimedia Commons (CC BY-SA).', crumbs='Migas', photo='Foto: Wikimedia Commons', text='Texto', other='English',
               k_district='Distrito', k_barrio='Barrio', k_in='Está en', k_metro='Metro', k_dir='Cómo llegar', walk='{n} min a pie', inside='Aquí dentro', near='Cerca de {name}',
               p_title='{name} · {type} en {district}, {city} | {app}', p_desc='{name}: {type} en {where} ({city}). Descúbrelo y séllalo en tu pasaporte de {city}.',
               p_cta='¿Has estado en {name}? Séllalo en tu pasaporte y confírmalo con GPS.', p_btn='Sellar en {app}',
               d_title='Qué ver en {district} ({city}): {n} lugares | {app}', d_desc='Guía de {district}, distrito de {city}: {n} lugares para visitar como {top}. Márcalos en tu pasaporte.',
               d_h1='Qué ver en {district}', d_sub='Distrito de {city}', d_n='{n} lugares', d_cta='Explora {district} en el mapa y sella cada lugar que visites.', d_btn='Abrir {district} en el mapa',
               i_title='Qué ver en {city}: {n} lugares por distritos | {app}', i_desc='Guía de {city} por sus {d} distritos: {n} lugares para visitar (plazas, museos, parques, miradores y más). Márcalos en tu pasaporte.',
               i_h1='Qué ver en {city}: {n} lugares en {d} distritos', i_sub='Plazas, museos, parques, miradores, mercados y tabernas de toda la ciudad, del centro a los barrios.',
               i_cta='Convierte tu paseo en un pasaporte: marca cada lugar, confírmalo con GPS y sube de nivel.', i_btn='Empezar mi pasaporte', i_districts='Distritos'),
    'en': dict(lang='en', locale='en_GB', place='en/place', district='en/district', index='en/places', app_q='&lang=en', open='Open the app', all='All places', privacy='Privacy',
               credits='Text and photos: Wikipedia and Wikimedia Commons (CC BY-SA).', crumbs='Breadcrumbs', photo='Photo: Wikimedia Commons', text='Text', other='Español',
               k_district='District', k_barrio='Neighbourhood', k_in='Inside', k_metro='Metro', k_dir='Directions', walk='{n} min walk', inside='Inside here', near='Near {name}',
               p_title='{name} · {type} in {district}, {city} | {app}', p_desc='{name}: {type} in {where} ({city}). Discover it and stamp it in your {city} passport.',
               p_cta='Been to {name}? Stamp it in your passport and confirm it with GPS.', p_btn='Stamp it on {app}',
               d_title='Things to do in {district} ({city}): {n} places | {app}', d_desc='Guide to {district}, a district of {city}: {n} places to visit such as {top}. Tick them off in your passport.',
               d_h1='Things to do in {district}', d_sub='{city} district', d_n='{n} places', d_cta='Explore {district} on the map and stamp every place you visit.', d_btn='Open {district} on the map',
               i_title='Things to do in {city}: {n} places by district | {app}', i_desc='{city} guide across its {d} districts: {n} places to visit (squares, museums, parks, viewpoints and more). Tick them off in your passport.',
               i_h1='Things to do in {city}: {n} places in {d} districts', i_sub='Squares, museums, parks, viewpoints, markets and old taverns all over the city, from the centre to the neighbourhoods.',
               i_cta='Turn your walks into a passport: stamp each place, confirm it with GPS and level up.', i_btn='Start my passport', i_districts='Districts'),
}

places = [json.loads(l.strip().rstrip(',')) for l in open('js/data.js') if l.strip().startswith('{')]
wiki = json.load(open('tools/wiki.json')) if os.path.exists('tools/wiki.json') else {}
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
def fmt(m, lg): return f'{round(m / 10) * 10} m' if m < 1000 else (f'{m / 1000:.1f} km'.replace('.', ',') if lg == 'es' else f'{m / 1000:.1f} km')
def short(t, n=155):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0].rstrip(',;:') + '…'
def thumb(u, w): return u.replace('/960px-', f'/{w}px-') if u and '/960px-' in u else u
def tname(ty, lg, plural=False): t = TYPES.get(ty, (ty,) * 4); return t[(2 if lg == 'en' else 0) + plural]
# Nombre en inglés: el título de la Wikipedia inglesa sin «(Madrid)»; si no hay, el nombre original
def name(p, lg):
    if lg == 'en':
        t = wiki.get(p['id'], {}).get('title_en')
        if t: return re.sub(r'\s*\((Madrid|Spain)\)$', '', t)
    return p['name']
def desc_of(p, lg):
    if lg == 'en':
        w = wiki.get(p['id'], {})
        return p.get('desc_en') or w.get('desc_en'), w.get('url_en')
    return p.get('desc'), p.get('url')

CSS = f"""*{{box-sizing:border-box}}:root{{--red:{RED};--ink:#141416;--muted:#6B6B75;--line:#EDEDF0;--bg:#fff;--bg2:#F6F6F8;color-scheme:light dark}}
@media (prefers-color-scheme:dark){{:root{{--ink:#F2F2F5;--muted:#8E8E98;--line:#26262D;--bg:#0F0F12;--bg2:#1B1B21}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}}
a{{color:inherit}}main{{max-width:680px;margin:0 auto;padding:0 16px 48px}}
header{{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:680px;margin:0 auto;padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--line)}}
.brand{{display:flex;align-items:center;gap:8px;font-weight:800;text-decoration:none;letter-spacing:-.01em}}.brand img{{width:28px;height:28px;border-radius:8px}}
.hr{{display:flex;align-items:center;gap:12px}}.lang{{font-size:13px;font-weight:600;color:var(--muted);text-decoration:none}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;background:var(--red);color:#fff;font-weight:700;text-decoration:none;font-size:15px}}
header .btn{{min-height:36px;padding:6px 14px;font-size:14px}}
.crumbs{{margin:16px 0 6px;font-size:13px;color:var(--muted)}}.crumbs a{{text-decoration:none}}.crumbs a:hover{{text-decoration:underline}}
h1{{font-size:30px;line-height:1.15;letter-spacing:-.02em;margin:4px 0 6px}}h2{{font-size:19px;margin:30px 0 8px}}
.sub{{margin:0 0 16px;color:var(--muted);font-size:15px}}.sub b{{color:var(--red);font-weight:700}}
figure{{margin:0 -16px 6px}}figure img{{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;background:var(--bg2)}}figcaption{{padding:4px 16px;font-size:11px;color:var(--muted)}}
.desc{{font-size:16.5px}}.src{{font-size:12px;color:var(--muted)}}
.facts{{display:grid;gap:8px;margin:16px 0;padding:14px;border-radius:16px;background:var(--bg2);font-size:15px}}.facts div{{display:flex;gap:8px}}.facts span{{color:var(--muted);min-width:110px}}
.cta{{margin:22px 0;padding:18px;border-radius:18px;background:rgba(214,32,44,.07);text-align:center}}.cta p{{margin:0 0 12px;font-weight:600}}
ul.list{{list-style:none;margin:0;padding:0}}ul.list li{{border-bottom:1px solid var(--line)}}ul.list a{{display:flex;justify-content:space-between;gap:12px;padding:11px 0;text-decoration:none}}
ul.list small{{color:var(--muted);white-space:nowrap}}.cols{{columns:2;column-gap:24px}}.cols li{{break-inside:avoid}}
.mp-user .cta,.mp-user header .btn{{display:none}}
footer{{max-width:680px;margin:0 auto;padding:24px 16px 40px;font-size:13px;color:var(--muted);border-top:1px solid var(--line)}}footer a{{margin-right:14px}}"""

def page(lg, path, alt, title, desc, body, ld, img=None):
    T = L[lg]
    url, alt_url = f'{SITE}/{path}/', f'{SITE}/{alt}/'
    es_url, en_url = (url, alt_url) if lg == 'es' else (alt_url, url)
    lds = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    out = f"""<!doctype html>
<html lang="{lg}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="es" href="{es_url}"><link rel="alternate" hreflang="en" href="{en_url}"><link rel="alternate" hreflang="x-default" href="{es_url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{e(APP)}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{e(img or SITE + '/icons/og.png')}"><meta property="og:locale" content="{T['locale']}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0F0F12" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<script>try{{if(localStorage.getItem('mp.onboarded')||localStorage.getItem('mp.visits.v1'))document.documentElement.classList.add('mp-user')}}catch(e){{}}</script>
<style>{CSS}</style>
{lds}
</head>
<body>
<header><a class="brand" href="/{'?lang=en' if lg == 'en' else ''}"><img src="/icons/icon-192.png" alt="" width="28" height="28">{e(APP)}</a><span class="hr"><a class="lang" href="/{alt}/" hreflang="{'es' if lg == 'en' else 'en'}">{T['other']}</a><a class="btn" href="/{'?lang=en' if lg == 'en' else ''}">{T['open']}</a></span></header>
<main>
{body}
</main>
<footer><a href="/{T['index']}/">{T['all']}</a><a href="/{'?lang=en' if lg == 'en' else ''}">App</a><a href="/privacy.html">{T['privacy']}</a><br>{T['credits']}</footer>
</body>
</html>
"""
    os.makedirs(path, exist_ok=True)
    open(os.path.join(path, 'index.html'), 'w').write(out)

def crumbs(lg, *items):
    li = ' › '.join(f'<a href="{u}">{e(n)}</a>' if u else e(n) for n, u in items)
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, **({'item': SITE + u} if u else {})} for i, (n, u) in enumerate(items)]}
    return f'<nav class="crumbs" aria-label="{L[lg]["crumbs"]}">{li}</nav>', ld

def link_list(lg, ps, origin=None, cls='list'):
    T = L[lg]
    def row(p):
        extra = T['walk'].format(n=walk(dist(origin, p['coords']))) if origin else tname(p['type'], lg)
        return f'<li><a href="/{T["place"]}/{p["id"]}/"><span>{e(name(p, lg))}</span><small>{e(extra)}</small></a></li>'
    return f'<ul class="{cls}">' + ''.join(row(p) for p in ps) + '</ul>'

for d in ('lugar', 'distrito', 'lugares', 'en'):
    shutil.rmtree(d, ignore_errors=True)

by_d = {}
for p in places: by_d.setdefault(p.get('district'), []).append(p)
types = {}
for p in places: types.setdefault(p['type'], []).append(p)
OTHER = {'es': 'en', 'en': 'es'}

for lg, T in L.items():
    O = L[OTHER[lg]]
    # ---- Lugares ----
    for p in places:
        d_id, b_id = p.get('district'), p.get('barrio')
        dname, bname, ty = dists.get(d_id, CNAME), barrios.get(b_id), tname(p['type'], lg)
        nm = name(p, lg)
        where = ', '.join(x for x in (bname, dname) if x)
        dsc, src = desc_of(p, lg)
        title = T['p_title'].format(name=nm, type=ty, district=dname, city=CNAME, app=APP)
        meta = short(dsc) or T['p_desc'].format(name=nm, type=ty.lower(), where=where, city=CNAME)
        nav, ld_crumbs = crumbs(lg, (CNAME, f'/{T["index"]}/'), (dname, f'/{T["district"]}/{d_id}/' if d_id else None), (nm, None))
        near = sorted((x for x in places if x['id'] != p['id']), key=lambda x: dist(p['coords'], x['coords']))[:6]
        st = min(metro, key=lambda s: dist(p['coords'], (s[1], s[2])))
        std = dist(p['coords'], (st[1], st[2]))
        par, kids = BYID.get(p.get('parent')), children.get(p['id'], [])
        img = p.get('img')
        orig = f' · <i>{e(p["name"])}</i>' if nm != p['name'] else ''
        body = f"""{nav}
<h1>{e(nm)}</h1>
<p class="sub"><b>{e(ty)}</b> · {e(where)}{orig}</p>
{f'<figure><img src="{e(img)}" alt="{e(nm)}" width="960" height="600"><figcaption>{T["photo"]}</figcaption></figure>' if img else ''}
{f'<p class="desc">{e(dsc)}</p><p class="src">{T["text"]}: <a href="{e(src or "")}" rel="nofollow noopener">Wikipedia</a></p>' if dsc else ''}
<div class="facts">
<div><span>{T['k_district']}</span><a href="/{T['district']}/{d_id}/">{e(dname)}</a></div>
{f'<div><span>{T["k_barrio"]}</span>{e(bname)}</div>' if bname else ''}
{f'<div><span>{T["k_in"]}</span><a href="/{T["place"]}/{par["id"]}/">{e(name(par, lg))}</a></div>' if par else ''}
{f'<div><span>{T["k_metro"]}</span>{e(st[0])} ({e(st[3])}) · {fmt(std, lg)}, {T["walk"].format(n=walk(std))}</div>' if std < 1500 else ''}
<div><span>{T['k_dir']}</span><a href="https://www.google.com/maps/dir/?api=1&amp;destination={p['coords'][0]},{p['coords'][1]}" rel="nofollow noopener">Google Maps</a></div>
</div>
<div class="cta"><p>{e(T['p_cta'].format(name=nm))}</p><a class="btn" href="/?p={p['id']}{T['app_q']}">{e(T['p_btn'].format(app=APP))}</a></div>
{f'<h2>{T["inside"]}</h2>{link_list(lg, kids)}' if kids else ''}
<h2>{e(T['near'].format(name=nm))}</h2>
{link_list(lg, near, p['coords'])}"""
        ld = {'@context': 'https://schema.org', '@type': 'TouristAttraction', 'name': nm, 'url': f"{SITE}/{T['place']}/{p['id']}/", 'inLanguage': lg,
              'geo': {'@type': 'GeoCoordinates', 'latitude': p['coords'][0], 'longitude': p['coords'][1]},
              'address': {'@type': 'PostalAddress', 'addressLocality': CNAME, 'addressRegion': dname, 'addressCountry': 'ES'}, 'touristType': ty}
        if nm != p['name']: ld['alternateName'] = p['name']
        if dsc: ld['description'] = short(dsc, 300)
        if img: ld['image'] = img
        if par: ld['containedInPlace'] = {'@type': 'TouristAttraction', 'name': name(par, lg), 'url': f"{SITE}/{T['place']}/{par['id']}/"}
        page(lg, f"{T['place']}/{p['id']}", f"{O['place']}/{p['id']}", title, meta, body, [ld, ld_crumbs], thumb(img, 960))

    # ---- Distritos ----
    for d_id, dname in dists.items():
        ps = sorted(by_d.get(d_id, []), key=lambda p: name(p, lg))
        groups = {}
        for p in ps: groups.setdefault(p['type'], []).append(p)
        top = ', '.join(name(p, lg) for p in ps[:4])
        nav, ld_crumbs = crumbs(lg, (CNAME, f'/{T["index"]}/'), (dname, None))
        secs = ''.join(f'<h2>{e(tname(ty, lg, True))}</h2>{link_list(lg, g)}' for ty, g in sorted(groups.items(), key=lambda kv: -len(kv[1])))
        imgp = next((p for p in ps if p.get('img')), None)
        body = f"""{nav}
<h1>{e(T['d_h1'].format(district=dname))}</h1>
<p class="sub"><b>{e(T['d_sub'].format(city=CNAME))}</b> · {T['d_n'].format(n=len(ps))}</p>
<div class="cta"><p>{e(T['d_cta'].format(district=dname))}</p><a class="btn" href="/?d={d_id}{T['app_q']}">{e(T['d_btn'].format(district=dname))}</a></div>
{secs}"""
        ld = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': T['d_h1'].format(district=dname), 'numberOfItems': len(ps),
              'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f"{SITE}/{T['place']}/{p['id']}/", 'name': name(p, lg)} for i, p in enumerate(ps)]}
        page(lg, f"{T['district']}/{d_id}", f"{O['district']}/{d_id}", T['d_title'].format(district=dname, city=CNAME, n=len(ps), app=APP),
             T['d_desc'].format(district=dname, city=CNAME, n=len(ps), top=top), body, [ld, ld_crumbs], thumb(imgp and imgp['img'], 960))

    # ---- Índice ----
    rows = ''.join(f'<li><a href="/{T["district"]}/{d}/"><span>{e(n)}</span><small>{T["d_n"].format(n=len(by_d.get(d, [])))}</small></a></li>'
                   for d, n in sorted(dists.items(), key=lambda kv: kv[1]))
    tsecs = ''.join(f'<h2>{e(tname(ty, lg, True))} <small style="color:var(--muted);font-weight:600">{len(g)}</small></h2>{link_list(lg, sorted(g, key=lambda p: name(p, lg)), cls="list cols")}'
                    for ty, g in sorted(types.items(), key=lambda kv: -len(kv[1])))
    nav, ld_crumbs = crumbs(lg, (CNAME, None))
    fmtv = dict(city=CNAME, n=len(places), d=len(dists), app=APP)
    body = f"""{nav}
<h1>{e(T['i_h1'].format(**fmtv))}</h1>
<p class="sub">{e(T['i_sub'])}</p>
<div class="cta"><p>{e(T['i_cta'])}</p><a class="btn" href="/{'?lang=en' if lg == 'en' else ''}">{e(T['i_btn'])}</a></div>
<h2>{T['i_districts']}</h2><ul class="list">{rows}</ul>
{tsecs}"""
    page(lg, T['index'], O['index'], T['i_title'].format(**fmtv), T['i_desc'].format(**fmtv), body, [ld_crumbs])

# ---- Sitemap (con alternativas de idioma) y robots ----
today = date.today().isoformat()
pairs = [('lugares', 'en/places')] + [(f'distrito/{d}', f'en/district/{d}') for d in dists] + [(f"lugar/{p['id']}", f"en/place/{p['id']}") for p in places]
def entry(loc, es, en):
    return (f'  <url><loc>{SITE}/{loc}/</loc><lastmod>{today}</lastmod>'
            f'<xhtml:link rel="alternate" hreflang="es" href="{SITE}/{es}/"/><xhtml:link rel="alternate" hreflang="en" href="{SITE}/{en}/"/></url>\n')
xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
       f'  <url><loc>{SITE}/</loc><lastmod>{today}</lastmod></url>\n'
       + ''.join(entry(es, es, en) + entry(en, es, en) for es, en in pairs) + '</urlset>\n')
open('sitemap.xml', 'w').write(xml)
open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\nDisallow: /ingest/\nDisallow: /mockups/\nDisallow: /tests/\nDisallow: /tools/\n\nSitemap: {SITE}/sitemap.xml\n')
print(1 + 2 * len(pairs), 'URLs en sitemap.xml')
