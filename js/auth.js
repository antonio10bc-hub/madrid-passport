// Inicio de sesión con Google (Supabase Auth) y sincronización del progreso en la tabla `progress`.
// La librería (≈220 KB) se carga bajo demanda: solo si hay sesión guardada, si volvemos de Google o al pulsar «Entrar».
window.MPAuth = (() => {
  const cfg = window.MP_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  let sb = null, user = null, loading = null, onChangeCb = () => {};

  const loadLib = () => (loading ||= new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    s.src = 'vendor/supabase/supabase.js'; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  }));
  async function client() {
    if (sb) return sb;
    await loadLib();
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    sb.auth.onAuthStateChange((_e, s) => {
      const nu = s?.user || null;
      if (nu?.id !== user?.id) { user = nu; onChangeCb(user); }
    });
    return sb;
  }
  const hasStoredSession = () => { try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch { return false; } };

  async function init(onChange) {
    onChangeCb = onChange;
    if (!enabled) return;
    const u = new URL(location.href);
    if (!hasStoredSession() && !u.searchParams.has('code')) return onChange(null);   // invitado: no cargamos nada
    const c = await client();
    const { data } = await c.auth.getSession();
    if (u.searchParams.has('code')) { u.searchParams.delete('code'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
    const nu = data.session?.user || null;
    if (nu?.id !== user?.id || !nu) { user = nu; onChange(user); }
  }
  const signIn = async () => (await client()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });

  // Botón oficial de Google (Google Identity Services): Google pide permiso en nombre de esta web, no de Supabase.
  // El token de Google se entrega a Supabase con signInWithIdToken (con nonce para evitar reutilizarlo).
  const gis = () => new Promise((res, rej) => {
    if (window.google?.accounts?.id) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  const sha256 = async (txt) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function renderGoogleButton(el, { lang = 'es', onError = () => {} } = {}) {
    await gis();
    const nonce = crypto.getRandomValues(new Uint32Array(4)).join('-');
    google.accounts.id.initialize({
      client_id: cfg.googleClientId, nonce: await sha256(nonce), use_fedcm_for_prompt: true, auto_select: false,
      callback: async ({ credential }) => {
        try {
          const { error } = await (await client()).auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
          if (error) throw error;
        } catch (e) { console.error(e); onError(e); }
      },
    });
    el.innerHTML = '';
    google.accounts.id.renderButton(el, { theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'filled_black' : 'outline',
      size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', locale: lang, width: Math.min(el.clientWidth || 320, 400) });
  }
  const signOut = async () => (await client()).auth.signOut();
  async function pull() {
    const { data, error } = await sb.from('progress').select('visits, badges, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function push(visits, badges) {
    const { error } = await sb.from('progress').upsert({ user_id: user.id, visits, badges, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  return { enabled, init, signIn, signOut, pull, push, renderGoogleButton, get gis() { return !!cfg.googleClientId; }, get user() { return user; } };
})();
