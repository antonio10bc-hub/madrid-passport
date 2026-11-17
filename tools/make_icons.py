"""Genera los iconos de la app (diseño B: pin rojo con doble tic blanco + dorado sobre crema).
Uso: python3 tools/make_icons.py && node tools/render_icons.js"""
PIN = 'M492 898L273 653A320 320 0 1 1 751 653L532 898Q512 920 492 898Z'
S, X, Y, OFF = 1.45, 322, 468, 92  # escala, origen y separación de los tics
tick = lambda x, c: f'<path d="M{x:.0f} {Y}l{60*S:.0f} {60*S:.0f} {110*S:.0f}-{120*S:.0f}" stroke="{c}"/>'
art = ('<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6202C"/><stop offset="1" stop-color="#B3141F"/></linearGradient></defs>'
       f'<rect width="1024" height="1024" fill="#FBF8F3"/><path d="{PIN}" fill="url(#bg)"/>'
       f'<g fill="none" stroke-width="72" stroke-linecap="round" stroke-linejoin="round">{tick(X, "#fff")}{tick(X + OFF*S, "#F2D27A")}</g>')
head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
open('icons/icon-full.svg', 'w').write(f'{head}{art}</svg>')
open('icons/icon.svg', 'w').write(f'{head}<defs><clipPath id="m"><rect width="1024" height="1024" rx="229"/></clipPath></defs><g clip-path="url(#m)">{art}</g></svg>')
print('svg ok')
