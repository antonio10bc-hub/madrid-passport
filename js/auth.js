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
  return { enabled, init, signIn, signOut, pull, push, get user() { return user; } };
})();
