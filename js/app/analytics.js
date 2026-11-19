// Analítica de uso con PostHog (UE), solo con consentimiento. Proxy propio /ingest (vercel.json) para que no lo bloqueen los adblockers.
// No se envían emails ni nombres: solo el id anónimo de Supabase al iniciar sesión. Desactivado en localhost y en tests.
import { BYID, districtOf, barrioOf } from './state.js';

const TOKEN = 'phc_xnbbVrZbqhjzk6GfeLxopJHkhtxFFXAxM96symjc2snN';
const VERSION = '2026.11.2';
const SCHEMA = 2;                 // versión del esquema de eventos (para filtrar en PostHog si vuelve a cambiar)
let on = false;

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Consentimiento (banner de Maya, consent.js): PostHog solo arranca si el usuario acepta. Mientras no decide, los eventos
// esperan en memoria (nada se guarda en el móvil ni se envía) y se mandan al aceptar; si rechaza, se descartan.
// Vercel Web Analytics no usa cookies ni identificadores: funciona siempre.
const CONSENT = 'mp.consent';
let pending = false, queue = [], startLang = 'es';
export const consent = () => { try { return localStorage.getItem(CONSENT); } catch { return null; } };   // '1' | '0' | null
export const consentNeeded = () => pending;

export function initAnalytics({ lang }) {
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
  let optOut = false;
  try { optOut = localStorage.getItem('mp.noTrack') === '1' || new URLSearchParams(location.search).has('notrack'); } catch {}
  if (local || navigator.webdriver || optOut) return;
  startLang = lang;
  // Vercel Web Analytics (visitas y usuarios diarios en el panel de Vercel; sin cookies). Se activa en Vercel → Analytics.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const va = document.createElement('script'); va.defer = true; va.src = '/_vercel/insights/script.js';
  document.head.appendChild(va);
  addEventListener('appinstalled', () => track('app_installed'));
  addEventListener('error', (e) => track('js_error', { message: String(e.message).slice(0, 200), source: (e.filename || '').split('/').pop(), line: e.lineno }));
  const c = consent();
  if (c === '1') startPosthog();
  else if (c !== '0') pending = true;
}

// yes = true: arranca PostHog y envía lo que esperaba; false: no se usa PostHog en este dispositivo
export function setConsent(yes) {
  try { localStorage.setItem(CONSENT, yes ? '1' : '0'); } catch {}
  const q = queue; queue = []; pending = false;
  if (!yes) { if (on) { window.posthog.opt_out_capturing(); on = false; } return; }
  if (!on) startPosthog();
  window.posthog.opt_in_capturing?.();
  for (const [fn, a, b] of q) {
    if (fn === 'capture') window.posthog.capture(a, b.props, { timestamp: new Date(b.ts) });
    else window.posthog[fn](a);
  }
  track('consent_accepted');
}

function startPosthog() {
  const lang = startLang;
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister identify setPersonProperties reset get_distinct_id alias set_config startSessionRecording stopSessionRecording captureException opt_in_capturing opt_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */
  posthog.init(TOKEN, {
    api_host: '/ingest', ui_host: 'https://eu.posthog.com',
    person_profiles: 'always', capture_pageview: true, capture_pageleave: true,
    autocapture: false,             // solo eventos propios: taxonomía limpia y menos cuota
    capture_performance: true, enable_heatmaps: true,
    session_recording: { maskAllInputs: true },
  });
  // Superpropiedades: van en todos los eventos.
  posthog.register({ app: MP_CITY.id + '-passport', city: MP_CITY.id, app_version: VERSION, event_schema: SCHEMA, lang,
    standalone: standalone(), dark: matchMedia('(prefers-color-scheme: dark)').matches, catalog_size: Object.keys(BYID).length });
  posthog.setPersonProperties({ lang }, { first_seen_at: new Date().toISOString(), first_version: VERSION, first_lang: lang, first_standalone: standalone() });
  on = true;
}

// Nombres de propiedades homogéneos en todos los eventos (place → place_id…) y contexto del lugar añadido solo.
const ALIAS = { place: 'place_id', district: 'district_id', barrio: 'barrio_id', type: 'place_type', badge: 'badge_id', from: 'from_place_id', to: 'to_place_id' };
function norm(props = {}) {
  const o = {};
  for (const [k, v] of Object.entries(props)) o[ALIAS[k] || k] = v;
  const p = BYID[o.place_id];
  if (p) {
    o.place_type ??= p.type;
    o.district_id ??= districtOf[p.id]?.id || null;
    o.barrio_id ??= barrioOf[p.id]?.id || null;
    o.place_name = p.name;
  }
  return o;
}
// Sin decidir aún: a la cola en memoria (como mucho 300 eventos)
const later = (fn, a, b) => { if (pending && queue.length < 300) queue.push([fn, a, b]); };
export const track = (event, props) => {
  if (on) window.posthog.capture(event, norm(props));
  else later('capture', event, { props: norm(props), ts: Date.now() });
};
export const register = (props) => { if (on) window.posthog.register(props); else later('register', props); };
// Progreso del usuario: propiedad de persona y también superpropiedad (cada evento lleva el estado en que ocurrió).
export const setPerson = (props) => {
  const sup = Object.fromEntries(Object.entries(props).map(([k, v]) => ['u_' + k, v]));
  if (on) { window.posthog.setPersonProperties(props); window.posthog.register(sup); }
  else { later('setPersonProperties', props); later('register', sup); }
};
export const identify = (id) => { if (on) window.posthog.identify(id); else later('identify', id); };
export const resetUser = () => { if (on) window.posthog.reset(); };
