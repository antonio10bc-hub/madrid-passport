"""Iteraciones: pasaporte casi cuadrado con (A) doble tic rojo + dorado, (B) silueta de Madrid. Salida: iteraciones.html"""
import os
HERE = os.path.dirname(__file__)
D = open(os.path.join(HERE, 'madrid-outline.txt')).read()
RED, RED2, RED3, GOLD, GOLD2, INK, CREAM = '#D6202C', '#B3141F', '#8E0F18', '#C9A227', '#E6C65C', '#111114', '#FBF6EC'
FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif"
MASK = 'M229 0H795C921 0 1024 103 1024 229V795C1024 921 921 1024 795 1024H229C103 1024 0 921 0 795V229C0 103 103 0 229 0Z'

def bg(c1, c2=None):
    c2 = c2 or c1
    return f'<defs><linearGradient id="bgX" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bgX)"/>'

def passport(cover, spine, x=232, y=212, w=560, h=600, shadow=True, foil=None, tilt=0):
    """Libreta casi cuadrada: tapa + lomo + (opcional) marco de oro."""
    s = f'<g transform="rotate({tilt} 512 512)">'
    if shadow: s += f'<rect x="{x + 10}" y="{y + 22}" width="{w}" height="{h}" rx="56" fill="#000" opacity=".22"/>'
    s += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="56" fill="{cover}"/>'
    s += f'<path d="M{x + 56} {y} H{x + 92} V{y + h} H{x + 56} A56 56 0 0 1 {x} {y + h - 56} V{y + 56} A56 56 0 0 1 {x + 56} {y}Z" fill="{spine}"/>'
    if foil: s += f'<rect x="{x + 124}" y="{y + 36}" width="{w - 160}" height="{h - 72}" rx="26" fill="none" stroke="{foil}" stroke-width="10" opacity=".9"/>'
    return s, '</g>', (x + 92 + (w - 92) / 2, y + h / 2)   # centro útil (sin lomo)

def checks(cx, cy, size=1.0, c1=RED, c2=GOLD, sw=74):
    k = size
    cx -= 21 * k                       # centra el par (el conjunto es asimétrico)
    a = f'M{cx - 190 * k} {cy + 6 * k} l{96 * k} {96 * k} {176 * k} {-190 * k}'
    b = f'M{cx - 40 * k} {cy + 6 * k} l{96 * k} {96 * k} {176 * k} {-190 * k}'
    return (f'<path d="{a}" fill="none" stroke="{c1}" stroke-width="{sw * k}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{b}" fill="none" stroke="{c2}" stroke-width="{sw * k}" stroke-linecap="round" stroke-linejoin="round"/>')

def silhouette(cx, cy, scale, fill, stroke=None):
    # contorno normalizado 0-100 → centrado en (cx, cy)
    return f'<g transform="translate({cx - 50 * scale} {cy - 50 * scale}) scale({scale})"><path d="{D}" fill="{fill}" stroke="{stroke or fill}" stroke-width="{2.4 if stroke else 1.4}" stroke-linejoin="round"/></g>'

A, B = [], []
# ---------- A · doble tic rojo + dorado ----------
o, c, (cx, cy) = passport('#FFFFFF', '#EDE6DA')
A.append(('A1', 'Fondo rojo, pasaporte blanco', bg(RED, RED2) + o + checks(cx, cy - 10, .9) + c))
o, c, (cx, cy) = passport(CREAM, '#E9DCC4', foil=GOLD)
A.append(('A2', 'Crema con marco de oro', bg(RED, RED2) + o + checks(cx, cy - 6, .74) + c))
o, c, (cx, cy) = passport('#1B1B22', '#0B0B0F', foil=GOLD)
A.append(('A3', 'Fondo rojo, tapa negra con oro', bg(RED, RED2) + o + checks(cx, cy - 6, .74, RED, GOLD2) + c))
o, c, (cx, cy) = passport('#FFFFFF', '#F1E4E5', tilt=-6)
A.append(('A4', 'Fondo crema, pasaporte inclinado', bg(CREAM, '#F1E7D6') + o + checks(cx, cy - 10, .9) + c))
o, c, (cx, cy) = passport(RED, RED3, foil=GOLD)
A.append(('A5', 'Tapa roja, tics blanco + oro', bg('#FFFFFF', '#F2F2F5') + o + checks(cx, cy - 6, .74, '#FFFFFF', GOLD2) + c))

# ---------- B · silueta de Madrid ----------
o, c, (cx, cy) = passport('#FFFFFF', '#EDE6DA')
B.append(('B1', 'Fondo rojo, silueta roja', bg(RED, RED2) + o + silhouette(cx, cy, 3.6, RED) + c))
o, c, (cx, cy) = passport(RED3, '#5E0A10', foil=GOLD)
B.append(('B2', 'Tapa granate, silueta oro', bg(RED, RED2) + o + silhouette(cx, cy, 3.3, GOLD2) + c))
o, c, (cx, cy) = passport(RED, RED3)
B.append(('B3', 'Fondo blanco, tapa roja', bg('#FFFFFF', '#F2F2F5') + o + silhouette(cx, cy, 3.6, '#FFFFFF') + c))
o, c, (cx, cy) = passport('#1B1B22', '#0B0B0F', foil=GOLD)
B.append(('B4', 'Fondo rojo, tapa negra, silueta roja + pin oro', bg(RED, RED2) + o + silhouette(cx, cy, 3.3, RED)
          + f'<circle cx="{cx - 6}" cy="{cy - 4}" r="30" fill="{GOLD2}" stroke="#1B1B22" stroke-width="10"/>' + c))
o, c, (cx, cy) = passport(CREAM, '#E9DCC4', foil=RED)
B.append(('B5', 'Crema, silueta en línea roja', bg(RED, RED2) + o
          + f'<g transform="translate({cx - 50 * 3.3} {cy - 50 * 3.3}) scale(3.3)"><path d="{D}" fill="none" stroke="{RED}" stroke-width="4.5" stroke-linejoin="round"/></g>'
          + f'<circle cx="{cx - 6}" cy="{cy - 4}" r="26" fill="{RED}"/>' + c))

def tile(svg, size, uid):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 1024 1024"><defs><clipPath id="m{uid}"><path d="{MASK}"/></clipPath></defs>'
            f'<g clip-path="url(#m{uid})">{svg.replace("bgX", "bg" + uid)}</g></svg>')

def row(title, items):
    cards = ''.join(f'''<div class="card"><div class="big">{tile(svg, 200, f"{k}b")}</div>
      <div class="home"><div>{tile(svg, 60, f"{k}s")}<span>Madrid Passport</span></div><div class="dark">{tile(svg, 60, f"{k}d")}<span>Madrid Passport</span></div></div>
      <b>{k}</b><p>{desc}</p></div>''' for k, desc, svg in items)
    return f'<h2>{title}</h2><div class="grid">{cards}</div>'

html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Iconos · iteraciones pasaporte</title><style>
body{{margin:0;padding:40px;background:#ECECF0;font-family:{FONT};-webkit-font-smoothing:antialiased;color:#111114}}
h1{{margin:0 0 4px;font-size:28px}} h2{{font-size:19px;margin:28px 0 12px}} .sub{{color:#666;margin:0}}
.grid{{display:grid;grid-template-columns:repeat(5,250px);gap:22px}}
.card{{background:#fff;border-radius:22px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,.06)}}
.big svg{{display:block;margin:0 auto;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18))}}
.home{{display:flex;gap:8px;margin:16px 0 10px}} .home>div{{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0;border-radius:16px;background:linear-gradient(160deg,#2C3E64,#7A5C8E)}}
.home>div.dark{{background:#000}} .home span{{font-size:9.5px;color:#fff}}
b{{display:block;font-size:15px}} p{{margin:4px 0 0;font-size:12.5px;color:#666;line-height:1.35}}
</style></head><body><h1>Pasaporte · iteraciones</h1><p class="sub">Libreta casi cuadrada. Grande y a tamaño real sobre fondo de pantalla claro y negro.</p>
{row('A · Doble tic (rojo + dorado)', A)}{row('B · Silueta de Madrid', B)}</body></html>'''
open(os.path.join(HERE, 'iteraciones.html'), 'w').write(html)
print('ok')
