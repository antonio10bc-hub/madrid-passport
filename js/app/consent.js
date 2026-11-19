// Banner de consentimiento con Maya: pide permiso para la analítica (PostHog) la primera vez. Sin respuesta no se envía nada.
import { t } from './i18n.js';
import { maya } from './maya.js';
import { consentNeeded, setConsent } from './analytics.js';

export function maybeConsent() {
  if (!consentNeeded() || document.querySelector('.consent')) return;
  const el = document.createElement('section');
  el.className = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('consent.title'));
  el.innerHTML = `${maya('happy', 'maya consent-maya')}
    <div class="consent-txt"><b>${t('consent.title')}</b><p>${t('consent.text')} <a href="privacy.html">${t('privacy')}</a></p>
    <div class="consent-btns"><button class="consent-no">${t('consent.no')}</button><button class="consent-ok">${t('consent.ok')}</button></div></div>`;
  const done = (yes) => { setConsent(yes); el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  el.querySelector('.consent-ok').onclick = () => done(true);
  el.querySelector('.consent-no').onclick = () => done(false);
  document.getElementById('app').appendChild(el);
}
