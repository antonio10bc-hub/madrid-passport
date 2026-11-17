// Analítica de uso con PostHog (UE). Proxy propio /ingest (vercel.json) para que no lo bloqueen los adblockers.
// No se envían emails ni nombres: solo el id anónimo de Supabase al iniciar sesión. Desactivado en localhost y en tests.
const TOKEN = 'phc_xnbbVrZbqhjzk6GfeLxopJHkhtxFFXAxM96symjc2snN';
const VERSION = '2026.11';
let on = false;

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function initAnalytics({ lang }) {
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
  let optOut = false;
  try { optOut = localStorage.getItem('mp.noTrack') === '1' || new URLSearchParams(location.search).has('notrack'); } catch {}
  if (local || navigator.webdriver || optOut) return;
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister identify setPersonProperties reset get_distinct_id alias set_config startSessionRecording stopSessionRecording captureException opt_in_capturing opt_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */
  posthog.init(TOKEN, {
    api_host: '/ingest', ui_host: 'https://eu.posthog.com',
    person_profiles: 'always', capture_pageview: true, capture_pageleave: true, autocapture: true,
    capture_performance: true, enable_heatmaps: true,
    session_recording: { maskAllInputs: true },
  });
  posthog.register({ app: 'madrid-passport', app_version: VERSION, lang, standalone: standalone(), dark: matchMedia('(prefers-color-scheme: dark)').matches });
  addEventListener('appinstalled', () => track('app_installed'));
  addEventListener('error', (e) => track('js_error', { message: String(e.message).slice(0, 200), source: (e.filename || '').split('/').pop(), line: e.lineno }));
  on = true;
}

export const track = (event, props) => { if (on) window.posthog.capture(event, props); };
export const register = (props) => { if (on) window.posthog.register(props); };
export const setPerson = (props) => { if (on) window.posthog.setPersonProperties(props); };
export const identify = (id) => { if (on) window.posthog.identify(id); };
export const resetUser = () => { if (on) window.posthog.reset(); };
