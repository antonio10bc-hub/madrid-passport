"""Genera los iconos de la app (May en rojo: May con borde blanco de pegatina sobre rojo Madrid).
Uso: python3 tools/make_icons.py && node tools/render_icons.js"""
import math
RING = ''.join(f'<circle cx="{50+37*math.cos(i*2*math.pi/26):.1f}" cy="{57+37*math.sin(i*2*math.pi/26):.1f}" r="5"/>' for i in range(26))
DOTS = ''.join(f'<circle cx="{x}" cy="{y}" r="2.2"/>' for x, y in [(30,32),(44,26),(58,27),(71,34),(22,48),(80,50),(20,66),(81,67),(28,82),(42,88),(58,88),(72,82)])
MAY = ('<path d="M50 22q1-7 4-11" fill="none" stroke="#141414" stroke-width="3.2" stroke-linecap="round"/>'
       '<path d="M53 13c5-8 14-11 23-9-4 8-13 11-23 9z" fill="#3E8E5A"/><path d="M51 13c-5-7-13-9-21-6 4 7 13 9 21 6z" fill="#2F7A4A"/>'
       f'<g fill="#F0502F">{RING}<circle cx="50" cy="57" r="37"/></g><g fill="#C9361E">{DOTS}</g>'
       '<g stroke="#141414" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M27 41l-3-6M34 38l-1-7M41 39l2-6M59 39l-2-6M66 38l1-7M73 41l3-6"/></g>'
       '<circle cx="37" cy="55" r="12" fill="#fff" stroke="#141414" stroke-width="3"/><circle cx="63" cy="55" r="12" fill="#fff" stroke="#141414" stroke-width="3"/>'
       '<circle cx="40" cy="57" r="6.5" fill="#141414"/><circle cx="60" cy="57" r="6.5" fill="#141414"/><circle cx="42" cy="54.5" r="2.1" fill="#fff"/><circle cx="62" cy="54.5" r="2.1" fill="#fff"/>'
       '<path d="M43 74q7 6 14 0" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/>')
# Silueta de May (granitos, cuerpo, hojas y rabito) para el borde blanco de pegatina y la sombra sólida granate
SIL = (f'{RING}<circle cx="50" cy="57" r="37"/><path d="M53 13c5-8 14-11 23-9-4 8-13 11-23 9zM51 13c-5-7-13-9-21-6 4 7 13 9 21 6z"/>'
       '<path d="M50 22q1-7 4-11" fill="none" stroke-width="3.2"/>')
def art(w):  # w: tamaño de May en el lienzo de 1024
    x, y = (1024 - w) / 2, (1024 - w) / 2 - w * 0.01
    sil = lambda c, sw: f'<g fill="{c}" stroke="{c}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round">{SIL}</g>'
    return (f'<rect width="1024" height="1024" fill="#D6202C"/><g transform="rotate(-6 512 512)">'
            f'<svg x="{x+w*.024:.0f}" y="{y+w*.029:.0f}" width="{w}" height="{w}" viewBox="0 0 100 100">{sil("#8C1D26", 6)}</svg>'
            f'<svg x="{x:.0f}" y="{y:.0f}" width="{w}" height="{w}" viewBox="0 0 100 100">{sil("#fff", 6)}{MAY}</svg></g>')
head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
open('icons/icon-full.svg', 'w').write(f'{head}{art(600)}</svg>')  # maskable: May dentro de la zona segura
open('icons/icon.svg', 'w').write(f'{head}<defs><clipPath id="m"><rect width="1024" height="1024" rx="229"/></clipPath></defs><g clip-path="url(#m)">{art(760)}</g></svg>')
print('svg ok')
