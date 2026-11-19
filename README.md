# Madrid Passport

Guía-mapa de Madrid por sus 21 distritos, mobile-first (390×844, iPhone 14). Web: https://www.madridpassport.com (también https://madrid-passport.vercel.app)

## Funciones
- Mapa de distritos (límites oficiales) → tap abre el distrito con sus lugares; tap de nuevo lo cierra.
- Ficha de lugar: foto, descripción (Wikipedia), acceso, sellos con fecha y botón «Cómo llegar».
- Conexiones: lugares dentro de otro (Retiro → Palacio de Cristal, Plaza Mayor → Casa de la Panadería, AZCA → torres…): «Está en» y «Aquí dentro» con progreso.
- Ficha: compartir el lugar (enlace a su página), valoración personal tras visitarlo (1-3 estrellas, se sincroniza)
  y «Reportar un error» (ubicación, foto, información, cerrado…; tabla `reports` de Supabase).
- Comunidad (datos agregados y anónimos de Supabase, solo cifras de 3 o más viajeros): «Sellado por N viajeros · M le dan ★★★»,
  tu puesto al sellarlo y «Joyas ocultas» (encantan y casi nadie va) en la ficha y en la portada.
- Cerca de ti (portada): tarjetas con foto de los pendientes a menos de 10 min a pie (o los 3 más cercanos).
- Enlaces directos: `/?p=<lugar>` abre la ficha y `/?d=<distrito>` el distrito (los usan las páginas SEO).
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
- Onboarding de 5 pasos; el último marca de un toque imprescindibles ya visitados (primera recompensa en segundos).
- Español / inglés (automático por el idioma del móvil; selector en Diario). Descripciones en inglés desde la Wikipedia en inglés.
- Compartir imagen (historia 9:16): todo Madrid, o el distrito abierto si lo hay, con el nivel del usuario.
- Modo oscuro automático. PWA instalable con uso sin conexión (mapa y fotos ya vistos quedan en caché).

## Código
Lo propio de la ciudad está en `js/city.js` (nombre, web, mapa, archivos de datos, lugares icónicos y textos locales como los niveles)
y `tools/city.json` (para los scripts); el resto del código es genérico. Otra ciudad = esos dos archivos + sus datos
(`tools/places.tsv`, `data/*.geojson`, `data/metro.json`).
Sin build: `index.html` carga scripts clásicos (`js/data.js`, `config.js`, `auth.js`, `icons.js`, `badges.js`, `share.js`)
y la app como módulos ES nativos en `js/app/`:
`main.js` (arranque) · `state.js` (estado y progreso) · `geo.js` (distritos/barrios) · `map.js` (MapLibre, mapa de calor, pines) ·
`sheet.js` (panel y gestos) · `views.js` (Madrid/distrito/ficha, checks) · `pages.js` (Diario/Logros) · `gps.js` (ubicación,
sugerencias, barrios por GPS, debug) · `level.js` (puntos y niveles) · `i18n.js` (textos ES/EN) · `wiki.js` · `sync.js` (Supabase) ·
`analytics.js` (PostHog) · `consent.js` (banner de consentimiento con Maya) · `maya.js` (mascota) · `community.js` (estadísticas de comunidad y avisos de error). Al añadir un módulo, añadirlo también a `SHELL` en `sw.js`.

## Analítica (PostHog, UE + Vercel Web Analytics)
Vercel Web Analytics (`/_vercel/insights/script.js`, cargado desde `analytics.js`) da el panel sencillo de visitantes diarios; se activa en Vercel → proyecto → Analytics.
`madrid-passport.vercel.app` redirige a `https://www.madridpassport.com` (`vercel.json`).

`js/app/analytics.js` envía eventos a PostHog a través del proxy `/ingest` (`vercel.json`), solo si el usuario acepta el banner de Maya (`consent.js`, `localStorage['mp.consent']`; también en Ajustes). Antes de decidir, los eventos esperan en memoria y se envían al aceptar. Desactivada en localhost, en tests
y con `?notrack` (o `localStorage['mp.noTrack']='1'`). Sin emails ni nombres: al iniciar sesión solo se usa el id de Supabase.
Esquema de eventos v2 (`event_schema=2`). El proyecto de PostHog se comparte con otras apps: filtrar siempre por `app=madrid-passport`.
- **Superpropiedades** (en todos los eventos): `app`, `city`, `app_version`, `event_schema`, `lang`, `standalone`, `dark`, `catalog_size`,
  `logged_in` y el progreso del usuario en ese momento (`u_places_visited`, `u_places_gps`, `u_barrios`, `u_districts_done`, `u_points`, `u_level`).
- **Propiedades normalizadas** (`track()` las renombra y completa): `place_id` (+ `place_type`, `place_name`, `district_id`, `barrio_id` automáticos),
  `district_id`, `barrio_id`, `badge_id`, `from_place_id`/`to_place_id`.
- **Persona**: progreso actual (mismos campos sin `u_`) y, una sola vez, `first_seen_at`, `first_version`, `first_lang`, `first_standalone`.
- **Eventos**: `app_opened`, `district_opened`, `place_opened`, `pin_tapped`, `place_checked`/`place_unchecked` (`method`), `gps_check_attempt`,
  `gps_confirmed`, `gps_too_far`, `gps_error`, `suggestion_shown`, `suggestion_dismissed`, `barrio_discovered`, `barrio_unmarked`,
  `badge_unlocked`, `badge_notif_tapped`, `level_up`, `search_performed`, `filter_applied` (`filter_kind`, `filter_value`), `tab_viewed`, `type_progress_tapped`,
  `share_opened`, `share_done`, `share_error`, `nearby_location_requested`, `district_sorted`, `next_nearby_opened`, `list_added`, `list_removed`,
  `action_undone`, `cluster_tapped`, `place_link_opened`, `deeplink_opened`, `place_rated`, `place_shared`, `place_reported`, `onboarding_quickmark`,
  `barrio_notif_tapped`, `directions_clicked`, `location_requested`, `language_changed`, `login_clicked`, `logout`, `sync_error`, `app_installed`,
  `onboarding_shown`, `onboarding_step`, `onboarding_done`, `diary_*`, `maya_tapped`, `consent_accepted`, `settings_opened`, `tab_scroll_top`, `js_error`;
  además `$pageview`/`$pageleave` y web vitals (sin autocaptura de clics). Dashboard: «Madrid Passport · Uso» (PostHog, filtrado por `app`).

## SEO
`python3 tools/build_seo.py` (tras `build_data.py`) genera páginas estáticas indexables en español y en inglés
(`/en/place/<id>/`, `/en/district/<id>/`, `/en/places/`, con `hreflang` entre ambas y nombre/descripción de la Wikipedia inglesa): `/lugar/<id>/` (título, descripción,
foto, JSON-LD `TouristAttraction`, metro, «Aquí dentro», cercanos), `/distrito/<id>/` (`ItemList`), `/lugares/` (índice),
`sitemap.xml` y `robots.txt`. Cada página enlaza a la app con `?p=` / `?d=`. El service worker no las cachea.

## Rendimiento
`node tools/perf.js` (con la app servida en :8765): arranque y acciones con la CPU ×4 más lenta (móvil medio).

## Tests
Playwright (e2e, 390×844, sin red externa):
```
cd tests && npm install && npm test
```

## Cuentas (Google) y sincronización — Supabase
1. Crear proyecto en supabase.com. En **SQL Editor** ejecutar `supabase/schema.sql` (tabla `progress` con RLS, funciones de
   comunidad `visited_percentile`, `place_stats`, `place_rank` y tabla `reports`). Se puede volver a ejecutar entero tras cambios.
2. Google Cloud Console → APIs y servicios → Credenciales → **ID de cliente OAuth** (Aplicación web).
   URI de redirección autorizado: `https://<proyecto>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → **Google**: activar y pegar Client ID y Client Secret.
4. Supabase → Authentication → URL Configuration: Site URL `https://www.madridpassport.com`;
   Redirect URLs: `https://www.madridpassport.com/**`, `https://madrid-passport.vercel.app/**` y `http://localhost:8765/**`.
5. Rellenar `js/config.js` con la URL del proyecto y la *anon public key* (Project Settings → API).

Al iniciar sesión se fusiona el progreso local con el de la nube (nivel más alto y fechas más antiguas por lugar;
unión de logros) y después cada cambio se sube automáticamente. Sin configurar, la app funciona igual solo en local.

## Debug
`?debug=1` o pulsación larga en el botón de ubicación → GPS falso («Mover» y tocar el mapa), «Validar» descarga un informe
comparando coordenadas con Wikipedia, «↺» borra el progreso.

## Datos
- `python3 tools/metro_fetch.py`: estaciones de Metro con sus líneas (Wikipedia) → `data/metro.json` (metro más cercano en la ficha).
- `tools/places.tsv`: lista de lugares (id, nombre, tipo, zona, título de Wikipedia, `parent` = id del lugar que lo contiene). Tipos: Plaza, Calle, Barrio, Parque,
  Gastronomía, Mercado, Museo, Monumento, Iglesia, Cultura, Estadio, Mirador, Teatro.
- `python3 tools/wiki_fetch.py` (incremental; `--all` para todo): coordenadas, foto, extracto y título en inglés → `tools/wiki.json`.
- `tools/coords.json`: coordenadas manuales; `tools/district_override.json`: lugares en el límite entre distritos.
- `tools/wiki.json` / `tools/validacion-lugares.json` (informe de «Validar»): coordenadas, fotos y descripciones de Wikipedia.
- `python3 tools/build_data.py` genera `js/data.js`; después `python3 tools/build_seo.py`. Al ampliar el catálogo, ver la lista de dependencias en `CLAUDE.md`. Iconos: `python3 tools/make_icons.py`.
- Límites: `data/distritos.geojson`, `data/barrios.geojson` (Ayto. Madrid vía click_that_hood).

## Ejecutar
Servidor estático (`python3 -m http.server`). El GPS y el service worker requieren HTTPS salvo en localhost.
