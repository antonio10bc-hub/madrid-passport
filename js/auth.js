// Inicio de sesión con Google (Supabase Auth) y sincronización del progreso en la tabla `progress`.
window.MPAuth = (() => {
  const cfg = window.MP_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = enabled ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;
  let user = null;

  async function init(onChange) {
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    user = data.session?.user || null;
    // Quita ?code=… de la URL tras volver de Google
    const u = new URL(location.href);
    if (u.searchParams.has('code')) { u.searchParams.delete('code'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
    onChange(user);
    sb.auth.onAuthStateChange((_e, s) => {
      const nu = s?.user || null;
      if (nu?.id !== user?.id) { user = nu; onChange(user); }
    });
  }
  const signIn = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  const signOut = () => sb.auth.signOut();
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
