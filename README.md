# Madrid Passport

Guía-mapa de Madrid por barrios, mobile-first (diseñada a 390×844, iPhone 14).

- Mapa (Leaflet + CARTO Positron) con zonas por barrio.
- Lista de barrios con progreso → detalle con lugares clave.
- Doble check por lugar: ✓ "he estado" y ✓✓ verificación GPS (radio 150 m + precisión del GPS, máx. 100 m).
- Progreso guardado en `localStorage`.

Ejecutar: servir la carpeta por HTTPS (el GPS lo exige), p. ej. `npx serve .`. En escritorio se ve dentro de un marco de iPhone.

Estructura: `index.html`, `css/styles.css`, `js/data.js` (barrios y lugares), `js/app.js`, `vendor/leaflet`, `mockups/`.
