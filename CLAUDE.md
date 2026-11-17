# Madrid Passport

- Git: commit y push directamente a `main` por defecto (sin ramas ni PRs).
- Deploy: Vercel, conectado al repo (auto-deploy en cada push a `main`).
- App estática (HTML/CSS/JS vanilla, sin build). Mobile-first a 390×844 (iPhone 14). Estilo minimalista, highlights rojo Madrid `#D6202C`.
- Código: módulos ES nativos en `js/app/` (ver README). Textos de interfaz siempre vía `t()` de `js/app/i18n.js` (ES + EN).
- Tests: `cd tests && npm install && npm test` (Playwright). Pasarlos antes de hacer push.
- Analítica: PostHog vía `js/app/analytics.js` (`track()`); al añadir una función nueva, añade su evento.
