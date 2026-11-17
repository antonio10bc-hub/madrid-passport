# Madrid Passport

Guía-mapa de Madrid por sus 21 distritos, mobile-first (390×844, iPhone 14). Demo: https://madrid-passport.vercel.app

- Vista inicial: Madrid dividido en sus 21 distritos (polígonos oficiales). Tap → zoom al distrito y sus puntos de interés.
- Doble check por lugar: ✓ "he estado" y ✓✓ verificación GPS (radio 150 m + precisión, máx. 100 m).
- Mapa: MapLibre GL + OpenFreeMap (estilo Positron), gratis y sin API key.
- Progreso en `localStorage`.
- Debug GPS falso: abrir con `?debug=1` o mantener pulsado el botón de ubicación. «Mover» → el siguiente tap en el mapa fija la posición falsa; después la app funciona con normalidad usando esa posición.
- Sheet inferior: arrastrar o tocar el asa para minimizar/expandir (min · peek · half · full).

Estructura: `index.html`, `css/styles.css`, `js/data.js` (lugares; el distrito se asigna por posición), `js/app.js`, `data/distritos.geojson` y `data/barrios.geojson` (límites, fuente: Ayto. Madrid vía click_that_hood), `vendor/maplibre`, `mockups/`.

Local: `python3 -m http.server` (o cualquier servidor estático). El GPS requiere HTTPS salvo en localhost.
