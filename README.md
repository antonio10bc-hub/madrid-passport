# Madrid Passport

Guía-mapa de Madrid por sus 21 distritos, mobile-first (390×844, iPhone 14). Demo: https://madrid-passport.vercel.app

- Vista inicial: Madrid dividido en sus 21 distritos (polígonos oficiales). Tap → zoom al distrito y sus puntos de interés.
- Doble check por lugar: ✓ "he estado" (se puede quitar) y ✓✓ verificación GPS (definitiva). Radio: 300 m (600 m parques/estadios) + precisión del GPS (máx. 150 m).
- Compartir: genera imagen 1080×1350 con los distritos y lugares visitados/confirmados (`js/share.js`).
- Mapa: MapLibre GL + OpenFreeMap (estilo Positron), gratis y sin API key.
- Progreso en `localStorage`.
- Debug GPS falso: abrir con `?debug=1` o mantener pulsado el botón de ubicación. «Mover» → el siguiente tap en el mapa fija la posición falsa; después la app funciona con normalidad usando esa posición.
- Sheet inferior: arrastrar o tocar el asa para minimizar/expandir (min · peek · half · full).

Estructura: `index.html`, `css/styles.css`, `js/data.js` (lugares; el distrito se asigna por posición), `js/app.js`, `data/distritos.geojson` y `data/barrios.geojson` (límites, fuente: Ayto. Madrid vía click_that_hood), `vendor/maplibre`, `mockups/`.

Local: `python3 -m http.server` (o cualquier servidor estático). El GPS requiere HTTPS salvo en localhost.
