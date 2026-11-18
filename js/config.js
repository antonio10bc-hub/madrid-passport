// Configuración pública de Supabase (la anon key es pública por diseño; la seguridad la da RLS en la base de datos).
// Rellenar tras crear el proyecto: Supabase → Project Settings → API.
window.MP_CONFIG = {
  supabaseUrl: 'https://nskkysjqdceukxidvnos.supabase.co',
  supabaseAnonKey: 'sb_publishable_HmPl4k_MxLDGIfYRALcy8g_0U5hZmef',   // publishable key (pública)
  // ID de cliente OAuth de Google (público). Si está, el inicio de sesión usa el botón de Google en la propia web
  // y Google muestra «madrid-passport.vercel.app» en vez del dominio de Supabase. Vacío = redirección clásica.
  googleClientId: '19557147727-6sg5nneevrg53hc3ahssbslpqk6ujs6b.apps.googleusercontent.com',
};
