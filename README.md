# Madrid Passport

Guía-mapa de Madrid por sus 21 distritos, mobile-first (390×844, iPhone 14). Demo: https://madrid-passport.vercel.app

## Funciones
- Mapa de distritos (límites oficiales) → tap abre el distrito con sus lugares; tap de nuevo lo cierra.
- Ficha de lugar: foto, descripción (Wikipedia), acceso, sellos con fecha y botón «Cómo llegar».
- Doble check: ✓ «he estado» (se puede quitar) y ✓✓ GPS (definitivo). Radio 300 m (600 m parques/estadios) + precisión (máx. 150 m).
- Sugerencia automática al estar cerca de un lugar sin confirmar.
- Seguimiento de posición (botón ubicación: centra y sigue; arrastrar el mapa lo desactiva).
- Buscador y filtros por tipo; filtro por estado en el distrito (todos, pendientes, visitados, GPS).
- Diario de visitas y logros.
- Compartir imagen: todo Madrid o el distrito, formato post (4:5) o historia (9:16).
- Modo oscuro automático. PWA instalable con uso sin conexión (mapa y fotos ya vistos quedan en caché).

## Debug
`?debug=1` o pulsación larga en el botón de ubicación → GPS falso («Mover» y tocar el mapa), «Validar» descarga un informe
comparando coordenadas con Wikipedia, «↺» borra el progreso.

## Datos
- `tools/places.tsv`: lista de lugares (id, nombre, tipo, zona, título de Wikipedia).
- `tools/coords.json`: coordenadas manuales; `tools/district_override.json`: lugares en el límite entre distritos.
- `tools/wiki.json` / `tools/validacion-lugares.json` (informe de «Validar»): coordenadas, fotos y descripciones de Wikipedia.
- `python3 tools/build_data.py` genera `js/data.js`. Iconos: `python3 tools/make_icons.py`.
- Límites: `data/distritos.geojson`, `data/barrios.geojson` (Ayto. Madrid vía click_that_hood).

## Ejecutar
Servidor estático (`python3 -m http.server`). El GPS y el service worker requieren HTTPS salvo en localhost.
