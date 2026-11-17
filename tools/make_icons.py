"""Genera los iconos de la PWA (pin rojo con tic blanco). Uso: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw
RED = (214, 32, 44)
def icon(size, maskable=False, path=None):
    S = size * 4                                   # supersampling para bordes suaves
    im = Image.new('RGBA', (S, S), RED if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not maskable: d.rounded_rectangle([0, 0, S, S], radius=S * 0.22, fill=RED)
    k = 0.78 if maskable else 1.0                  # zona segura en maskable
    cx, cy, r = S / 2, S * (0.5 - 0.06 * k), S * 0.2 * k
    # Pin: círculo + punta
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white')
    d.polygon([(cx - r * 0.78, cy + r * 0.62), (cx + r * 0.78, cy + r * 0.62), (cx, cy + r * 1.75)], fill='white')
    # Tic rojo dentro
    w = int(S * 0.034 * k)
    d.line([(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.38), (cx + r * 0.5, cy - r * 0.32)], fill=RED, width=w, joint='curve')
    im.resize((size, size), Image.LANCZOS).save(path)
icon(192, path='icons/icon-192.png'); icon(512, path='icons/icon-512.png')
icon(512, maskable=True, path='icons/icon-maskable-512.png')
# Apple: sin transparencia (iOS pone fondo negro), cuadrado completo
icon(180, maskable=True, path='icons/apple-touch-icon.png')
