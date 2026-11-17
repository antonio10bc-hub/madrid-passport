"""Genera los iconos de la app (diseño A1: pasaporte blanco con doble tic rojo + dorado sobre rojo).
Uso: python3 tools/make_icons.py && node tools/render_icons.js"""
import importlib.util, os
spec = importlib.util.spec_from_file_location('b2', 'mockups/iconos/build2.py'); b2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b2)
art = dict((k, svg) for k, _, svg in b2.A)['A1']
head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
# Cuadrado completo (iOS/Android aplican su propia máscara; sin transparencia)
open('icons/icon-full.svg', 'w').write(f'{head}{art}</svg>')
# Con esquinas redondeadas (favicon y uso "any")
open('icons/icon.svg', 'w').write(f'{head}<defs><clipPath id="m"><path d="{b2.MASK}"/></clipPath></defs><g clip-path="url(#m)">{art}</g></svg>')
print('svg ok')
