# Madrid Passport

Guía-mapa de Madrid por sus 21 distritos, mobile-first (390×844, iPhone 14). Demo: https://madrid-passport.vercel.app

## Funciones
- Mapa de distritos (límites oficiales) → tap abre el distrito con sus lugares; tap de nuevo lo cierra.
- Ficha de lugar: foto, descripción (Wikipedia), acceso, sellos con fecha y botón «Cómo llegar».
- Doble check: ✓ «he estado» (se puede quitar) y ✓✓ GPS (definitivo). Radio 150 m (350 m parques/estadios) + precisión (máx. 50 m); el área se dibuja en el mapa al seleccionar un lugar.
- Sugerencia automática al estar cerca de un lugar sin confirmar.
- Seguimiento de posición (botón ubicación: centra y sigue; arrastrar el mapa lo desactiva).
- Buscador y filtros por tipo; filtro por estado en el distrito (todos, pendientes, visitados, GPS).
- Mapa de calor: cada distrito se tiñe según el % visitado (leyenda y % en las etiquetas); también en la imagen para compartir.
- Barrios (segundo nivel, 128): se sellan solos al pasar por ellos con el GPS (dorado), al visitar uno de sus lugares o a mano
  desde la lista «Barrios» del distrito. En el distrito abierto se pintan los barrios pisados.
- Diario de visitas (lugares y barrios) y Logros: nivel del viajero arriba (Turista → … → Gato, por puntos), progreso por tipo
  (toca un tipo para verlo en el mapa) y sellos.
- Puntos: visita 10 · GPS +15 · barrio 5 · distrito completo 50 · logro 20 (`js/app/level.js`).
- Español / inglés (automático por el idioma del móvil; selector en Diario). Descripciones en inglés desde la Wikipedia en inglés.
- Compartir imagen (historia 9:16): todo Madrid, o el distrito abierto si lo hay, con el nivel del usuario.
- Modo oscuro automático. PWA instalable con uso sin conexión (mapa y fotos ya vistos quedan en caché).

## Código
Sin build: `index.html` carga scripts clásicos (`js/data.js`, `config.js`, `auth.js`, `icons.js`, `badges.js`, `share.js`)
y la app como módulos ES nativos en `js/app/`:
`main.js` (arranque) · `state.js` (estado y progreso) · `geo.js` (distritos/barrios) · `map.js` (MapLibre, mapa de calor, pines) ·
`sheet.js` (panel y gestos) · `views.js` (Madrid/distrito/ficha, checks) · `pages.js` (Diario/Logros) · `gps.js` (ubicación,
sugerencias, barrios por GPS, debug) · `level.js` (puntos y niveles) · `i18n.js` (textos ES/EN) · `wiki.js` · `sync.js` (Supabase) ·
`analytics.js` (PostHog). Al añadir un módulo, añadirlo también a `SHELL` en `sw.js`.

## Analítica (PostHog, UE)
`js/app/analytics.js` envía eventos a PostHog a través del proxy `/ingest` (`vercel.json`). Desactivada en localhost, en tests
y con `?notrack` (o `localStorage['mp.noTrack']='1'`). Sin emails ni nombres: al iniciar sesión solo se usa el id de Supabase.
Todos los eventos llevan `app=madrid-passport` (el proyecto de PostHog se comparte con otra app). Eventos propios:
`app_opened`, `district_opened`, `place_opened`, `pin_tapped`, `place_checked`, `place_unchecked`, `gps_check_attempt`,
`gps_confirmed`, `gps_too_far`, `gps_error`, `suggestion_shown`, `suggestion_dismissed`, `barrio_discovered`,
`badge_unlocked`, `badge_notif_tapped`, `level_up`, `search`, `type_filter`, `status_filter`, `tab_viewed`, `type_progress_tapped`, `barrio_unmarked`,
`share_opened`, `share_done`, `share_error`, `nearby_located`, `district_sort`, `next_nearby_opened`, `list_added`, `list_removed`, `undo`, `cluster_tapped`, `barrio_notif_tapped`, `directions_clicked`, `locate`, `language_changed`, `login_clicked`, `logout`,
`sync_error`, `app_installed`, `js_error`; además páginas vistas, autocaptura de clics, web vitals y grabación de sesiones
(si está activada en el proyecto). Dashboard: «Madrid Passport · Uso».

## Tests
Playwright (e2e, 390×844, sin red externa):
```
cd tests && npm install && npm test
```

## Cuentas (Google) y sincronización — Supabase
1. Crear proyecto en supabase.com. En **SQL Editor** ejecutar `supabase/schema.sql` (tabla `progress` con RLS).
2. Google Cloud Console → APIs y servicios → Credenciales → **ID de cliente OAuth** (Aplicación web).
   URI de redirección autorizado: `https://<proyecto>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → **Google**: activar y pegar Client ID y Client Secret.
4. Supabase → Authentication → URL Configuration: Site URL `https://madrid-passport.vercel.app`;
   Redirect URLs: `https://madrid-passport.vercel.app/**` y `http://localhost:8765/**`.
5. Rellenar `js/config.js` con la URL del proyecto y la *anon public key* (Project Settings → API).

Al iniciar sesión se fusiona el progreso local con el de la nube (nivel más alto y fechas más antiguas por lugar;
unión de logros) y después cada cambio se sube automáticamente. Sin configurar, la app funciona igual solo en local.

## Debug
`?debug=1` o pulsación larga en el botón de ubicación → GPS falso («Mover» y tocar el mapa), «Validar» descarga un informe
comparando coordenadas con Wikipedia, «↺» borra el progreso.

## Datos
- `python3 tools/metro_fetch.py`: estaciones de Metro con sus líneas (Wikipedia) → `data/metro.json` (metro más cercano en la ficha).
- `tools/places.tsv`: lista de lugares (id, nombre, tipo, zona, título de Wikipedia). Tipos: Plaza, Calle, Barrio, Parque,
  Gastronomía, Mercado, Museo, Monumento, Iglesia, Cultura, Estadio, Mirador, Teatro.
- `python3 tools/wiki_fetch.py` (incremental; `--all` para todo): coordenadas, foto, extracto y título en inglés → `tools/wiki.json`.
- `tools/coords.json`: coordenadas manuales; `tools/district_override.json`: lugares en el límite entre distritos.
- `tools/wiki.json` / `tools/validacion-lugares.json` (informe de «Validar»): coordenadas, fotos y descripciones de Wikipedia.
- `python3 tools/build_data.py` genera `js/data.js`. Iconos: `python3 tools/make_icons.py`.
- Límites: `data/distritos.geojson`, `data/barrios.geojson` (Ayto. Madrid vía click_that_hood).

## Ejecutar
Servidor estático (`python3 -m http.server`). El GPS y el service worker requieren HTTPS salvo en localhost.
