// Idiomas: español (por defecto) e inglés. t('clave', { var }) → texto. Los nombres propios no se traducen.
export const LANGS = [['es', 'Español'], ['en', 'English']];
const TYPES = {
  Plaza: ['Plaza', 'Plazas', 'Square', 'Squares'], Calle: ['Calle', 'Calles', 'Street', 'Streets'], Barrio: ['Barrio', 'Barrios', 'Neighbourhood', 'Neighbourhoods'],
  Parque: ['Parque', 'Parques', 'Park', 'Parks'], Gastronomía: ['Gastronomía', 'Gastronomía', 'Food & drink', 'Food & drink'], Mercado: ['Mercado', 'Mercados', 'Market', 'Markets'],
  Museo: ['Museo', 'Museos', 'Museum', 'Museums'], Monumento: ['Monumento', 'Monumentos', 'Monument', 'Monuments'], Iglesia: ['Iglesia', 'Iglesias', 'Church', 'Churches'],
  Cultura: ['Cultura', 'Cultura', 'Culture', 'Culture'], Estadio: ['Estadio', 'Estadios', 'Stadium', 'Stadiums'], Mirador: ['Mirador', 'Miradores', 'Viewpoint', 'Viewpoints'],
  Teatro: ['Teatro', 'Teatros', 'Theatre', 'Theatres'],
};
const DICT = {
  es: {
    'pl.share': 'Compartir', 'pl.share.done': 'He sellado {name} en {app}', 'pl.share.todo': 'Mira {name} en {app}', 'pl.copied': 'Enlace copiado', 'pl.copied.fail': 'No se pudo compartir',
    'rate.q': '¿Qué te pareció?', 'rate.star1': '1 estrella', 'rate.starN': '{n} estrellas',
    'comm.n': 'Sellado por {n} viajeros', 'comm.love': '{n} le dan ★★★', 'comm.rank': 'fuiste el {n}.º en sellarlo', 'comm.gem': 'Joya oculta', 'comm.gems': 'Joyas ocultas · encantan y casi nadie va',
    'rep.link': 'Reportar un error', 'rep.title': '¿Qué está mal?', 'rep.coords': 'La ubicación', 'rep.photo': 'La foto', 'rep.info': 'La información', 'rep.closed': 'Ya no existe o cerró', 'rep.other': 'Otra cosa',
    'rep.ph': 'Detalles (opcional)', 'rep.cancel': 'Cancelar', 'rep.send': 'Enviar', 'rep.thanks': 'Gracias, lo revisaremos', 'rep.limit': 'Has enviado 5 avisos hoy. Vuelve a probar mañana',
    settings: 'Ajustes', close: 'Cerrar', privacy: 'Política de privacidad', 'ob.aria': 'Introducción', 'ob.skip': 'Saltar', 'ob.next': 'Continuar', 'ob.start': 'Activar ubicación y empezar', 'ob.later': 'Ahora no', 'ob.again': 'Ver la introducción',
    'ob.5.t': '¿Ya has estado?', 'ob.5.d': 'Marca los que ya conoces y empieza con tus primeros sellos.', 'ob.5.n': '{n} marcados · +{pts} pts',
    'in.parent': 'Está en', 'in.children': 'Aquí dentro', 'seo.all': 'Todos los lugares',
    'ob.2.t': 'Marca lo que visitas', 'ob.2.d': 'Toca ✓ cuando pases por un sitio y tu pasaporte se irá llenando.',
    'ob.3.t': 'Confírmalo con GPS', 'ob.3.d': 'Si estás allí, consigue el doble check dorado.',
    'ob.4.t': 'Sube de nivel', 'ob.4.d': 'Gana puntos, desbloquea sellos y pinta tu mapa. De Turista a Gato.', 'tab.diary': 'Diario', 'tab.map': 'Mapa', 'tab.badges': 'Logros',
    'aria.progress': 'Progreso', 'aria.locate': 'Mi ubicación', 'aria.share': 'Compartir mi mapa', 'aria.dismiss': 'Descartar',
    'suggest.ok': 'Confirmar', today: 'Hoy', yesterday: 'Ayer', nodate: 'Sin fecha', back: 'Volver',
    'search.ph': 'Buscar lugares, barrios…', 'search.clear': 'Limpiar búsqueda', results_1: '{n} resultado', results_n: '{n} resultados', noresults: 'Sin resultados',
    districts: 'Distritos', places_of: '{done}/{total} lugares', n_places: '{n} lugares', n_barrios: '{n} barrios',
    place_1: '{n} lugar', place_n: '{n} lugares', barrio_1: '{n} barrio', barrio_n: '{n} barrios', barrio: 'Barrio', barrios: 'Barrios', 'f.all': 'Todos', 'f.todo': 'Pendientes', 'f.done': 'Visitados',
    'empty.filter': 'Nada por aquí con este filtro', visited: 'Visitado', 'gps.confirmed': 'Confirmado por GPS', at: 'a {d}', directions: 'Cómo llegar', 'dir.transit': 'Transporte', 'near.cta': 'Ver lugares pendientes cerca de mí', 'near.title': 'Cerca de ti · menos de {n} min', 'near.closest': 'Pendientes más cercanos', min_walk: '{n} min a pie', 'next.title': 'Sigue explorando · pendiente cerca', sort: 'Ordenar', filter: 'Filtrar', 'sort.zone': 'Zona', 'sort.near': 'Cerca', 'sort.todo': 'Pendientes 1º', 'metro.at': 'Metro más cercano · {d} · {min} min a pie',
    src: 'Texto: Wikipedia', 'src.es': 'Texto: Wikipedia (en español)',
    'chk.been': 'He estado', 'chk.gps': 'Verificar con GPS', 'chk.locked': 'Confirmado por GPS · no se puede quitar', 'chk.marked': 'Marcado como visitado', 'chk.unmarked': 'Quitado de visitados', undo: 'Deshacer', 'barrio.unmarked.toast': 'Barrio desmarcado: {name}',
    'list.f': 'Favoritos', 'list.w': 'Quiero ir', 'list.f1': 'Favorito', 'list.w1': 'Quiero ir', 'list.empty': 'Aún no hay lugares en esta lista.<br>Ábrelos y pulsa ♥ Favorito o Quiero ir.',
    'list.f.add': 'Añadido a favoritos', 'list.f.del': 'Quitado de favoritos', 'list.w.add': 'Añadido a «Quiero ir»', 'list.w.del': 'Quitado de «Quiero ir»', 'chk.already': 'Ya verificado por GPS',
    'gps.far': 'Estás a {d} · acércate más', 'gps.fail': 'No se pudo obtener tu ubicación', 'gps.na': 'GPS no disponible',
    'sg.marked': 'Ya lo marcaste', 'sg.at': 'a {d} · ¿confirmar por GPS?',
    'barrio.new': 'Nuevo barrio pisado: {name}', 'barrio.kicker': 'Nuevo barrio pisado',
    'barrio.hint': 'Se sellan solos al pasar con el GPS (dorado) o al visitar uno de sus lugares (rojo). Toca uno pendiente para marcarlo a mano.',
    'barrio.lock.gps': 'Pisado con GPS · no se puede quitar', 'barrio.lock.place': 'Sellado por un lugar visitado de este barrio', 'barrio.marked.toast': 'Barrio marcado: {name}',
    'access.Plaza': 'Espacio público · acceso libre 24 h', 'access.Calle': 'Espacio público · acceso libre', 'access.Barrio': 'Espacio público · acceso libre',
    'access.Parque': 'Acceso libre · consulta horario de apertura', 'access.Gastronomía': 'Establecimiento · consulta horario', 'access.Mercado': 'Consulta horario de apertura',
    'access.Museo': 'Consulta horario y precio en la web oficial', 'access.Monumento': 'Exterior libre · interior: consulta horario y precio', 'access.Iglesia': 'Consulta horario de culto y visitas',
    'access.Cultura': 'Consulta programación, horario y precio', 'access.Estadio': 'Tour y partidos: consulta en la web oficial', 'access.Mirador': 'Consulta horario y precio',
    'access.Teatro': 'Consulta cartelera, horario y precio', 'access.x': 'Consulta horario',
    'pass.story': 'Llevas {v}, {g}, {b} y {d}.', 'pass.places': 'lugares', 'pass.gps': 'con GPS', 'pass.barrios': 'barrios', 'pass.districts': 'de {n} distritos',
    'cal.prev': 'Mes anterior', 'cal.next': 'Mes siguiente', 'cal.gps': 'con GPS', 'cal.pick': 'Toca un día marcado para ver qué visitaste.', 'k.visited': 'Visitados', 'k.barrios': 'Barrios', 'diary.empty': 'Tu diario está vacío.<br>Marca tu primer lugar para empezar.', language: 'Idioma',
    'consent.title': '¡Hola, soy Maya!', 'consent.text': '¿Me dejas contar, de forma anónima, cómo usas la app? Así la mejoramos. Sin publicidad y sin vender datos.',
    'consent.ok': 'Vale', 'consent.no': 'No, gracias', 'set.stats': 'Estadísticas anónimas', 'set.install': 'Instalar la app', 'set.install.ios': 'En Safari: pulsa Compartir ⬆︎ y luego «Añadir a pantalla de inicio»', 'set.install.other': 'Abre el menú del navegador ⋮ y elige «Añadir a pantalla de inicio»', 'set.on': 'Sí', 'set.off': 'No',
    'acct.save': 'Guarda tu pasaporte', 'acct.why': 'Inicia sesión para no perder tu progreso y usarlo en otros dispositivos.', 'acct.google': 'Entrar con Google',
    'acct.out': 'Salir', 'acct.fail': 'No se pudo iniciar sesión', 'acct.bye': 'Sesión cerrada · tu progreso sigue en este móvil',
    'sync.idle': 'Conectado', 'sync.syncing': 'Sincronizando…', 'sync.ok': 'Guardado en la nube', 'sync.error': 'Error al sincronizar · reintentar',
    level: 'Nivel', pts: 'pts', 'level.next': 'Te faltan {n} pts para {name}',
    'level.up': '¡Ahora eres {name}!',
    bytype: 'Por tipo', 'gps.n': '{n} lugares con GPS', stamps: 'Mis sellos', 'badge.kicker': 'Logro desbloqueado', rank: 'Has visitado más lugares que el {pct} % de los viajeros', 'level.kicker': 'Nivel {n}', 'level.pts': '{n} puntos', 'badge.new': 'Logro desbloqueado: {name}',
    'share.post': 'Publicación', 'share.story': 'Historia', 'share.dl': 'Imagen descargada', 'share.fail': 'No se pudo generar la imagen', 'share.visited': 'visitados', 'share.gps': 'confirmados GPS', 'share.pending': 'pendientes', 'share.districts': 'distritos completos', 'share.barrios': 'barrios',
    'heat.legend': '% visitado', 'map.error': 'Error cargando el mapa',
    'debug.on': 'GPS falso activado', 'debug.off': 'GPS falso desactivado', 'debug.move': 'Mover', 'debug.cancel': 'Cancelar', 'debug.tap': 'toca el mapa para colocarte',
    'debug.nopos': 'sin posición', 'debug.set': 'Posición falsa fijada', 'debug.need': 'Pulsa «Mover» y toca el mapa para fijar tu posición falsa', 'debug.reset': 'Progreso borrado',
  },
  en: {
    'pl.share': 'Share', 'pl.share.done': 'I stamped {name} on {app}', 'pl.share.todo': 'Check out {name} on {app}', 'pl.copied': 'Link copied', 'pl.copied.fail': "Couldn't share",
    'rate.q': 'How was it?', 'rate.star1': '1 star', 'rate.starN': '{n} stars',
    'comm.n': 'Stamped by {n} travellers', 'comm.love': '{n} gave it ★★★', 'comm.rank': 'you were #{n} to stamp it', 'comm.gem': 'Hidden gem', 'comm.gems': 'Hidden gems · loved, rarely visited',
    'rep.link': 'Report a problem', 'rep.title': "What's wrong?", 'rep.coords': 'Location', 'rep.photo': 'Photo', 'rep.info': 'Information', 'rep.closed': 'Gone or closed', 'rep.other': 'Something else',
    'rep.ph': 'Details (optional)', 'rep.cancel': 'Cancel', 'rep.send': 'Send', 'rep.thanks': "Thanks, we'll look into it", 'rep.limit': "You've sent 5 reports today. Please try again tomorrow",
    settings: 'Settings', close: 'Close', privacy: 'Privacy policy', 'ob.aria': 'Introduction', 'ob.skip': 'Skip', 'ob.next': 'Continue', 'ob.start': 'Enable location and start', 'ob.later': 'Not now', 'ob.again': 'Watch the intro again',
    'ob.5.t': 'Been there already?', 'ob.5.d': 'Tick the ones you know and start with your first stamps.', 'ob.5.n': '{n} ticked · +{pts} pts',
    'in.parent': 'Inside', 'in.children': 'Inside here', 'seo.all': 'All places',
    'ob.2.t': 'Mark what you visit', 'ob.2.d': 'Tap ✓ when you pass by a place and your passport fills up.',
    'ob.3.t': 'Confirm it with GPS', 'ob.3.d': "If you're there, get the golden double check.",
    'ob.4.t': 'Level up', 'ob.4.d': 'Earn points, unlock stamps and paint your map. From Tourist to Gato.', 'tab.diary': 'Diary', 'tab.map': 'Map', 'tab.badges': 'Badges',
    'aria.progress': 'Progress', 'aria.locate': 'My location', 'aria.share': 'Share my map', 'aria.dismiss': 'Dismiss',
    'suggest.ok': 'Confirm', today: 'Today', yesterday: 'Yesterday', nodate: 'No date', back: 'Back',
    'search.ph': 'Search places, neighbourhoods…', 'search.clear': 'Clear search', results_1: '{n} result', results_n: '{n} results', noresults: 'No results',
    districts: 'Districts', places_of: '{done}/{total} places', n_places: '{n} places', n_barrios: '{n} neighbourhoods',
    place_1: '{n} place', place_n: '{n} places', barrio_1: '{n} neighbourhood', barrio_n: '{n} neighbourhoods', barrio: 'Neighbourhood', barrios: 'Neighbourhoods', 'f.all': 'All', 'f.todo': 'To do', 'f.done': 'Visited',
    'empty.filter': 'Nothing here with this filter', visited: 'Visited', 'gps.confirmed': 'Confirmed by GPS', at: '{d} away', directions: 'Directions', 'dir.transit': 'Transit', 'near.cta': 'Show places to visit near me', 'near.title': 'Near you · under {n} min', 'near.closest': 'Closest to visit', min_walk: '{n} min walk', 'next.title': 'Keep exploring · nearby to visit', sort: 'Sort', filter: 'Filter', 'sort.zone': 'Area', 'sort.near': 'Nearest', 'sort.todo': 'To do first', 'metro.at': 'Nearest metro · {d} · {min} min walk',
    src: 'Text: Wikipedia', 'src.es': 'Text: Wikipedia (in Spanish)',
    'chk.been': "I've been here", 'chk.gps': 'Verify with GPS', 'chk.locked': "Confirmed by GPS · can't be removed", 'chk.marked': 'Marked as visited', 'chk.unmarked': 'Removed from visited', undo: 'Undo', 'barrio.unmarked.toast': 'Neighbourhood unmarked: {name}',
    'list.f': 'Favourites', 'list.w': 'Want to go', 'list.f1': 'Favourite', 'list.w1': 'Want to go', 'list.empty': 'No places in this list yet.<br>Open one and tap ♥ Favourite or Want to go.',
    'list.f.add': 'Added to favourites', 'list.f.del': 'Removed from favourites', 'list.w.add': 'Added to «Want to go»', 'list.w.del': 'Removed from «Want to go»', 'chk.already': 'Already verified by GPS',
    'gps.far': "You're {d} away · get closer", 'gps.fail': "Couldn't get your location", 'gps.na': 'GPS not available',
    'sg.marked': 'Already marked', 'sg.at': '{d} away · confirm by GPS?',
    'barrio.new': 'New neighbourhood: {name}', 'barrio.kicker': 'New neighbourhood',
    'barrio.hint': 'They get stamped when you walk through with GPS on (gold) or visit one of their places (red). Tap a pending one to mark it by hand.',
    'barrio.lock.gps': "Walked with GPS · can't be removed", 'barrio.lock.place': 'Stamped by a visited place in this neighbourhood', 'barrio.marked.toast': 'Neighbourhood marked: {name}',
    'access.Plaza': 'Public space · open 24/7', 'access.Calle': 'Public space · open access', 'access.Barrio': 'Public space · open access',
    'access.Parque': 'Free entry · check opening hours', 'access.Gastronomía': 'Venue · check opening hours', 'access.Mercado': 'Check opening hours',
    'access.Museo': 'Check hours and prices on the official website', 'access.Monumento': 'Outside: free · inside: check hours and prices', 'access.Iglesia': 'Check service and visiting hours',
    'access.Cultura': 'Check programme, hours and prices', 'access.Estadio': 'Tours and matches: see the official website', 'access.Mirador': 'Check hours and prices',
    'access.Teatro': 'Check listings, times and prices', 'access.x': 'Check opening hours',
    'pass.story': 'You have {v}, {g}, {b} and {d}.', 'pass.places': 'places', 'pass.gps': 'with GPS', 'pass.barrios': 'neighbourhoods', 'pass.districts': 'of {n} districts',
    'cal.prev': 'Previous month', 'cal.next': 'Next month', 'cal.gps': 'with GPS', 'cal.pick': 'Tap a marked day to see what you visited.', 'k.visited': 'Visited', 'k.barrios': 'Areas', 'diary.empty': 'Your diary is empty.<br>Mark your first place to begin.', language: 'Language',
    'consent.title': "Hi, I'm Maya!", 'consent.text': 'May I anonymously count how you use the app? It helps us make it better. No ads, no selling data.',
    'consent.ok': 'Sure', 'consent.no': 'No, thanks', 'set.stats': 'Anonymous statistics', 'set.install': 'Install the app', 'set.install.ios': 'In Safari: tap Share ⬆︎, then “Add to Home Screen”', 'set.install.other': 'Open the browser menu ⋮ and choose “Add to Home Screen”', 'set.on': 'Yes', 'set.off': 'No',
    'acct.save': 'Save your passport', 'acct.why': 'Sign in so you never lose your progress and can use it on other devices.', 'acct.google': 'Sign in with Google',
    'acct.out': 'Sign out', 'acct.fail': "Couldn't sign in", 'acct.bye': 'Signed out · your progress stays on this phone',
    'sync.idle': 'Connected', 'sync.syncing': 'Syncing…', 'sync.ok': 'Saved to the cloud', 'sync.error': 'Sync error · retry',
    level: 'Level', pts: 'pts', 'level.next': '{n} pts to {name}',
    'level.up': 'You are now {name}!',
    bytype: 'By type', 'gps.n': '{n} places with GPS', stamps: 'My stamps', 'badge.kicker': 'Badge unlocked', rank: "You've visited more places than {pct}% of travellers", 'level.kicker': 'Level {n}', 'level.pts': '{n} points', 'badge.new': 'Badge unlocked: {name}',
    'share.post': 'Post', 'share.story': 'Story', 'share.dl': 'Image downloaded', 'share.fail': "Couldn't create the image", 'share.visited': 'visited', 'share.gps': 'GPS confirmed', 'share.pending': 'to do', 'share.districts': 'districts done', 'share.barrios': 'neighbourhoods',
    'heat.legend': '% visited', 'map.error': "Couldn't load the map",
    'debug.on': 'Fake GPS on', 'debug.off': 'Fake GPS off', 'debug.move': 'Move', 'debug.cancel': 'Cancel', 'debug.tap': 'tap the map to place yourself',
    'debug.nopos': 'no position', 'debug.set': 'Fake position set', 'debug.need': 'Tap «Move» and then the map to set a fake position', 'debug.reset': 'Progress cleared',
  },
};

const pick = () => {
  try { const s = localStorage.getItem('mp.lang'); if (DICT[s]) return s; } catch {}
  const q = new URLSearchParams(location.search).get('lang');
  if (DICT[q]) return q;
  return /^es\b/i.test(navigator.language || 'es') ? 'es' : 'en';
};
export let lang = pick();
export const locale = () => (lang === 'en' ? 'en-GB' : 'es-ES');
// Textos propios de la ciudad (js/city.js) por encima de los generales
const CITY_TEXT = window.MP_CITY?.text || {};
for (const l of Object.keys(DICT)) Object.assign(DICT[l], CITY_TEXT[l] || {});
export const t = (k, v = {}) => String(DICT[lang][k] ?? DICT.es[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
export const typeName = (ty) => (TYPES[ty] ? TYPES[ty][lang === 'en' ? 2 : 0] : ty);
export const typePlural = (ty) => (TYPES[ty] ? TYPES[ty][lang === 'en' ? 3 : 1] : ty);

// Textos fijos del HTML: data-i18n (texto) y data-i18n-aria (aria-label)
export function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}
export function setLang(l) {
  if (!DICT[l]) return;
  lang = l;
  try { localStorage.setItem('mp.lang', l); } catch {}
  applyStatic();
}
