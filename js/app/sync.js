// Cuenta (Google vía Supabase) y sincronización del progreso.
import { esc, toast } from './util.js';
import { S, DISTRICTS, persist, onSave } from './state.js';
import { t } from './i18n.js';
import { render } from './views.js';
import { track, identify, resetUser, register } from './analytics.js';

let syncState = 'idle', syncT = null;   // idle | syncing | ok | error
function scheduleSync() {
  if (!window.MPAuth?.user) return;
  clearTimeout(syncT); syncT = setTimeout(pushNow, 1200);
}
async function pushNow() {
  if (!MPAuth.user) return;
  syncState = 'syncing'; renderAccount();
  try { await MPAuth.push(S.visits, S.badges); syncState = 'ok'; }
  catch (e) { console.error(e); syncState = 'error'; track('sync_error'); }
  renderAccount();
}
// Fusión al iniciar sesión: por lugar (o barrio), el nivel más alto y las fechas más antiguas; logros: unión
export function mergeVisits(a, b) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    const o = out[id];
    if (!o) { out[id] = v; continue; }
    const min = (x, y) => (x && y ? Math.min(x, y) : x || y);
    out[id] = { lvl: Math.max(o.lvl || 0, v.lvl || 0), t: min(o.t, v.t), gpsAt: min(o.gpsAt, v.gpsAt), gps: o.gps || v.gps };
    if (!out[id].gpsAt) delete out[id].gpsAt;
    if (!out[id].gps) delete out[id].gps;
  }
  return out;
}
async function onAuth(user) {
  register({ logged_in: !!user });
  if (!user) { syncState = 'idle'; renderAccount(); return; }
  identify(user.id);
  syncState = 'syncing'; renderAccount();
  try {
    const remote = await MPAuth.pull();
    S.visits = mergeVisits(S.visits, remote?.visits);
    for (const [k, ts] of Object.entries(remote?.badges || {})) S.badges[k] = S.badges[k] ? Math.min(S.badges[k], ts) : ts;
    persist();
    await pushNow();
    if (DISTRICTS.length) render({ keepScroll: true });
  } catch (e) { console.error(e); syncState = 'error'; renderAccount(); }
}

const GOOGLE_G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function accountHTML() {
  if (!window.MPAuth?.enabled) return S.debug ? '<div class="acct off">Inicio de sesión sin configurar (js/config.js)</div>' : '';
  const u = MPAuth.user;
  if (!u) return `<div class="acct"><div class="acct-txt"><b>${t('acct.save')}</b><small>${t('acct.why')}</small></div>
    <button class="gbtn" id="login">${GOOGLE_G}<span>${t('acct.google')}</span></button></div>`;
  const m = u.user_metadata || {}, name = m.full_name || m.name || u.email;
  const st = t('sync.' + syncState);
  return `<div class="acct in">${m.avatar_url ? `<img class="avatar" src="${esc(m.avatar_url)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${esc((name || '?')[0].toUpperCase())}</span>`}
    <div class="acct-txt"><b>${esc(name)}</b><small class="sync ${syncState}" ${syncState === 'error' ? 'id="retry"' : ''}>${st}</small></div>
    <button class="link" id="logout">${t('acct.out')}</button></div>`;
}
export function renderAccount() {
  const el = document.getElementById('acct-slot');
  if (!el) return;
  el.innerHTML = accountHTML();
  el.querySelector('#login')?.addEventListener('click', () => { track('login_clicked'); MPAuth.signIn().catch(() => toast(t('acct.fail'), true)); });
  el.querySelector('#logout')?.addEventListener('click', async () => { await MPAuth.signOut(); track('logout'); resetUser(); toast(t('acct.bye')); });
  el.querySelector('#retry')?.addEventListener('click', pushNow);
}

export function initSync() {
  onSave(scheduleSync);
  window.MPAuth?.init(onAuth).catch((e) => console.error(e));
}
