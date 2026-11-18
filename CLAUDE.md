# Madrid Passport

- Git: commit y push directamente a `main` por defecto (sin ramas ni PRs).
- Deploy: Vercel, conectado al repo (auto-deploy en cada push a `main`).
- App estática (HTML/CSS/JS vanilla, sin build). Mobile-first a 390×844 (iPhone 14). Estilo minimalista, highlights rojo Madrid `#D6202C`.
- Código: módulos ES nativos en `js/app/` (ver README). Textos de interfaz siempre vía `t()` de `js/app/i18n.js` (ES + EN).
- Tests: `cd tests && npm install && npm test` (Playwright). Pasarlos antes de hacer push.
- Analítica: PostHog vía `js/app/analytics.js` (`track()`); al añadir una función nueva, añade su evento.
- Ciudad: todo lo propio de Madrid va en `js/city.js` / `tools/city.json` (no escribir «Madrid» ni coordenadas en el código genérico).
- Ampliar o cambiar el catálogo de lugares: actualizar SIEMPRE todas las dependencias:
  1. `tools/places.tsv` (id, nombre, tipo existente, zona, título de Wikipedia es, `parent` si está dentro de otro lugar: Retiro, Plaza Mayor, AZCA…).
  2. `python3 tools/wiki_fetch.py` → revisar los «buscado …» (título equivocado), sin coords/foto/desc; corregir en `tools/coords.json`/`district_override.json`.
  3. `python3 tools/build_data.py` y `python3 tools/build_seo.py` (páginas `/lugar/`, `/distrito/`, `/lugares/`, `sitemap.xml`).
  4. Logros (`js/badges.js`): umbrales y logros por tipo/conexiones siguen teniendo sentido; tipos nuevos necesitan icono (`js/icons.js`), textos (`i18n.js` TYPES + `access.*`) y logro.
  5. Textos con cifras (onboarding, README), lugares icónicos del onboarding (`onboarding.js` ICONIC), versión de `sw.js`, tests.
