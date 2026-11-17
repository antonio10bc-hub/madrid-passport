"""Genera mockups/iconos/index.html con 10 propuestas de icono (SVG 1024×1024, rejilla iOS)."""
import os
D = open(os.path.join(os.path.dirname(__file__), 'madrid-outline.txt')).read()
RED, RED2, GOLD, INK, CREAM = '#D6202C', '#B3141F', '#C9A227', '#111114', '#FBF6EC'
FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif"

def bg(c=RED, grad=True):
    g = f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c}"/><stop offset="1" stop-color="{RED2 if c == RED else c}"/></linearGradient></defs>' if grad else ''
    return g + f'<rect width="1024" height="1024" fill="{"url(#bg)" if grad else c}"/>'

PIN = 'M512 812 C512 812 316 620 316 452 a196 196 0 0 1 392 0 C708 620 512 812 512 812Z'
icons = []

# 1 · Pin con tic (evolución del actual)
icons.append(('Pin con tic', 'Evolución del actual: más grande y limpio.', f'''{bg()}
<path d="{PIN}" fill="#fff"/><path d="M432 452 l56 56 104 -112" fill="none" stroke="{RED}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>'''))

# 2 · Sello de pasaporte
icons.append(('Sello', 'Sello circular de tinta: el pasaporte de Madrid.', f'''{bg(CREAM, False)}
<g transform="rotate(-10 512 512)" fill="none" stroke="{RED}"><circle cx="512" cy="512" r="330" stroke-width="34"/><circle cx="512" cy="512" r="236" stroke-width="14"/></g>
<defs><path id="arc" d="M512 512 m-283 0 a283 283 0 1 1 566 0 a283 283 0 1 1 -566 0"/></defs>
<g transform="rotate(-10 512 512)"><text font-family="{FONT}" font-size="66" font-weight="800" letter-spacing="14" fill="{RED}"><textPath href="#arc">MADRID · PASSPORT · MADRID · PASSPORT ·</textPath></text>
<path d="M418 512 l66 66 124 -134" fill="none" stroke="{RED}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/></g>'''))

# 3 · Pasaporte
icons.append(('Pasaporte', 'Libreta de pasaporte con el emblema del pin.', f'''{bg()}
<rect x="282" y="196" width="460" height="632" rx="44" fill="#fff"/><rect x="282" y="196" width="46" height="632" rx="20" fill="#F1D9DA"/>
<path d="M536 600 C536 600 440 506 440 424 a96 96 0 0 1 192 0 C632 506 536 600 536 600Z" fill="{RED}"/><circle cx="536" cy="424" r="34" fill="#fff"/>
<rect x="420" y="660" width="232" height="22" rx="11" fill="{RED}" opacity=".35"/><rect x="458" y="704" width="156" height="22" rx="11" fill="{RED}" opacity=".2"/>'''))

# 4 · Doble check
icons.append(('Doble check', 'Las dos marcas de la app: visitado (blanco) y GPS (oro).', f'''{bg()}
<path d="M210 520 l130 130 250 -270" fill="none" stroke="#fff" stroke-width="72" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M430 520 l130 130 250 -270" fill="none" stroke="{GOLD}" stroke-width="72" stroke-linecap="round" stroke-linejoin="round"/>'''))

# 5 · Silueta de Madrid (contorno real del municipio)
icons.append(('Silueta de Madrid', 'El contorno real del municipio con un pin.', f'''{bg()}
<g transform="translate(142 142) scale(7.4)"><path d="{D}" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></g>
<path transform="translate(492 600) scale(.36) translate(-512 -812)" d="{PIN}" fill="{RED}"/><circle cx="492" cy="438" r="24" fill="#fff"/>'''))

# 6 · Kilómetro cero
icons.append(('Km 0', 'La placa del kilómetro cero: todo empieza aquí.', f'''{bg(INK, False)}
<path d="M172 680 a340 340 0 0 1 680 0 Z" fill="none" stroke="#fff" stroke-width="26"/>
<path d="M232 680 a280 280 0 0 1 560 0" fill="none" stroke="{RED}" stroke-width="16"/>
<text x="512" y="640" text-anchor="middle" font-family="{FONT}" font-size="168" font-weight="800" fill="#fff" letter-spacing="-4">KM 0</text>
<rect x="172" y="700" width="680" height="26" rx="13" fill="#fff"/>'''))

# 7 · Puerta de Alcalá
icons.append(('Puerta', 'Arco monumental minimalista (inspirado en la Puerta de Alcalá).', f'''{bg()}
<g fill="#fff"><rect x="196" y="340" width="632" height="54" rx="10"/><path d="M226 340 L512 230 L798 340Z"/>
<rect x="196" y="410" width="632" height="356" rx="6"/><rect x="176" y="766" width="672" height="46" rx="10"/></g>
<g fill="{RED}"><path d="M440 766 V560 a72 72 0 0 1 144 0 V766Z"/><path d="M262 766 V610 a44 44 0 0 1 88 0 V766Z"/><path d="M674 766 V610 a44 44 0 0 1 88 0 V766Z"/></g>'''))

# 8 · Monograma MP
icons.append(('Monograma', 'Iniciales MP geométricas; la P es un pin.', f'''{bg(INK, False)}
<path d="M200 760 V300 L360 520 L520 300 V760" fill="none" stroke="#fff" stroke-width="74" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M630 760 V300 h86 a124 124 0 0 1 0 248 h-86" fill="none" stroke="{RED}" stroke-width="74" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="716" cy="424" r="30" fill="{RED}"/>'''))

# 9 · Gato (madrileño)
icons.append(('Gato', '“Gato” = madrileño de toda la vida. Cercano y con personalidad.', f'''{bg()}
<path d="M276 330 L330 196 L436 300 Q512 284 588 300 L694 196 L748 330 Q790 420 760 540 Q712 760 512 812 Q312 760 264 540 Q234 420 276 330Z" fill="#fff"/>
<path d="M432 470 l0 0" stroke="{INK}" stroke-width="48" stroke-linecap="round"/><path d="M592 470 l0 0" stroke="{INK}" stroke-width="48" stroke-linecap="round"/>
<path d="M512 572 l-26 -26 h52Z" fill="{RED}"/><path d="M512 572 q-30 52 -76 40 M512 572 q30 52 76 40" fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>'''))

# 10 · Brújula-rosa
icons.append(('Brújula', 'Rosa de los vientos con la aguja norte en rojo Madrid.', f'''{bg('#fff', False)}
<circle cx="512" cy="512" r="330" fill="none" stroke="{INK}" stroke-width="22"/>
<g fill="{INK}"><path d="M512 236 L554 512 L512 788 L470 512Z" opacity=".12"/><path d="M236 512 L512 470 L788 512 L512 554Z" opacity=".12"/></g>
<path d="M512 210 L572 512 L452 512Z" fill="{RED}"/><path d="M512 814 L572 512 L452 512Z" fill="{INK}"/>
<circle cx="512" cy="512" r="38" fill="#fff" stroke="{INK}" stroke-width="16"/>'''))

MASK = 'M229 0H795C921 0 1024 103 1024 229V795C1024 921 921 1024 795 1024H229C103 1024 0 921 0 795V229C0 103 103 0 229 0Z'   # esquinas iOS (~22,4 %)
def tile(svg, size):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 1024 1024"><defs><clipPath id="sq{size}{hash(svg)%10**6}"><path d="{MASK}"/></clipPath></defs><g clip-path="url(#sq{size}{hash(svg)%10**6})">{svg}</g></svg>'

cards = ''.join(f'''<div class="card"><div class="big">{tile(svg, 200)}</div>
  <div class="small">{tile(svg, 60)}<span>Madrid Passport</span></div>
  <b>{i + 1} · {name}</b><p>{desc}</p></div>''' for i, (name, desc, svg) in enumerate(icons))
html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Iconos · 10 propuestas</title><style>
body{{margin:0;padding:40px;background:#ECECF0;font-family:{FONT};-webkit-font-smoothing:antialiased;color:#111114}}
h1{{margin:0 0 6px;font-size:28px}} .sub{{color:#666;margin:0 0 26px}}
.grid{{display:grid;grid-template-columns:repeat(5,250px);gap:22px}}
.card{{background:#fff;border-radius:22px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,.06)}}
.big svg{{display:block;margin:0 auto;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18))}}
.small{{display:flex;flex-direction:column;align-items:center;gap:6px;margin:16px auto 10px;width:90px;padding:12px 0;border-radius:16px;
  background:linear-gradient(160deg,#2C3E64,#7A5C8E)}} .small span{{font-size:10px;color:#fff}}
b{{display:block;font-size:15px}} p{{margin:4px 0 0;font-size:12.5px;color:#666;line-height:1.35}}
</style></head><body><h1>Icono de la app · 10 propuestas</h1><p class="sub">Grande y a tamaño real sobre fondo de pantalla de inicio.</p>
<div class="grid">{cards}</div></body></html>'''
open(os.path.join(os.path.dirname(__file__), 'index.html'), 'w').write(html)
print('ok')
