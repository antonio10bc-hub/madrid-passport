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
    'title.home': 'Explora Madrid', 'tab.diary': 'Diario', 'tab.map': 'Mapa', 'tab.badges': 'Logros',
    'aria.progress': 'Progreso', 'aria.locate': 'Mi ubicación', 'aria.share': 'Compartir mi mapa', 'aria.dismiss': 'Descartar',
    'suggest.ok': 'Confirmar', today: 'Hoy', yesterday: 'Ayer', nodate: 'Sin fecha', back: 'Volver',
    'search.ph': 'Buscar lugares, barrios…', 'search.clear': 'Limpiar búsqueda', results_1: '{n} resultado', results_n: '{n} resultados', noresults: 'Sin resultados',
    districts: 'Distritos', places_of: '{done}/{total} lugares', n_places: '{n} lugares', n_barrios: '{n} barrios',
    place_1: '{n} lugar', place_n: '{n} lugares', barrio_1: '{n} barrio', barrio_n: '{n} barrios', barrio: 'Barrio', barrios: 'Barrios',
    'd.sub': 'Distrito de Madrid · {done}/{total} visitados · {gps} GPS', 'f.all': 'Todos', 'f.todo': 'Pendientes', 'f.done': 'Visitados',
    'empty.filter': 'Nada por aquí con este filtro', visited: 'Visitado', 'gps.confirmed': 'Confirmado por GPS', at: 'a {d}', directions: 'Cómo llegar', 'dir.transit': 'Transporte', 'metro.at': 'Metro más cercano · {d} · {min} min a pie',
    src: 'Texto: Wikipedia', 'src.es': 'Texto: Wikipedia (en español)',
    'chk.been': 'He estado', 'chk.gps': 'Verificar con GPS', 'chk.locked': 'Confirmado por GPS · no se puede quitar', 'chk.marked': 'Marcado como visitado', 'chk.unmarked': 'Quitado de visitados', undo: 'Deshacer', 'barrio.unmarked.toast': 'Barrio desmarcado: {name}',
    'list.f': 'Favoritos', 'list.w': 'Quiero ir', 'list.f1': 'Favorito', 'list.w1': 'Quiero ir', 'list.empty': 'Aún no hay lugares en esta lista.<br>Ábrelos y pulsa ♥ Favorito o Quiero ir.',
    'list.f.add': 'Añadido a favoritos', 'list.f.del': 'Quitado de favoritos', 'list.w.add': 'Añadido a «Quiero ir»', 'list.w.del': 'Quitado de «Quiero ir»', 'chk.already': 'Ya verificado por GPS',
    'gps.far': 'Estás a {d} · acércate más', 'gps.fail': 'No se pudo obtener tu ubicación', 'gps.na': 'GPS no disponible',
    'sg.marked': 'Ya lo marcaste', 'sg.at': 'a {d} · ¿confirmar por GPS?', 'stamp.gps': 'CONFIRMADO POR GPS · MADRID PASSPORT ·',
    'barrio.new': 'Nuevo barrio pisado: {name}', 'barrio.kicker': 'Nuevo barrio pisado',
    'barrio.hint': 'Se sellan solos al pasar con el GPS (dorado) o al visitar uno de sus lugares (rojo). Toca uno pendiente para marcarlo a mano.',
    'barrio.lock.gps': 'Pisado con GPS · no se puede quitar', 'barrio.lock.place': 'Sellado por un lugar visitado de este barrio', 'barrio.marked.toast': 'Barrio marcado: {name}',
    'access.Plaza': 'Espacio público · acceso libre 24 h', 'access.Calle': 'Espacio público · acceso libre', 'access.Barrio': 'Espacio público · acceso libre',
    'access.Parque': 'Acceso libre · consulta horario de apertura', 'access.Gastronomía': 'Establecimiento · consulta horario', 'access.Mercado': 'Consulta horario de apertura',
    'access.Museo': 'Consulta horario y precio en la web oficial', 'access.Monumento': 'Exterior libre · interior: consulta horario y precio', 'access.Iglesia': 'Consulta horario de culto y visitas',
    'access.Cultura': 'Consulta programación, horario y precio', 'access.Estadio': 'Tour y partidos: consulta en la web oficial', 'access.Mirador': 'Consulta horario y precio',
    'access.Teatro': 'Consulta cartelera, horario y precio', 'access.x': 'Consulta horario',
    'k.visited': 'Visitados', 'k.barrios': 'Barrios', 'diary.empty': 'Tu diario está vacío.<br>Marca tu primer lugar para empezar.', language: 'Idioma',
    'acct.save': 'Guarda tu pasaporte', 'acct.why': 'Inicia sesión para no perder tu progreso y usarlo en otros dispositivos.', 'acct.google': 'Entrar con Google',
    'acct.out': 'Salir', 'acct.fail': 'No se pudo iniciar sesión', 'acct.bye': 'Sesión cerrada · tu progreso sigue en este móvil',
    'sync.idle': 'Conectado', 'sync.syncing': 'Sincronizando…', 'sync.ok': 'Guardado en la nube', 'sync.error': 'Error al sincronizar · reintentar',
    level: 'Nivel', pts: 'pts', 'level.next': 'Te faltan {n} pts para {name}', 'level.max': 'Nivel máximo: eres un gato de Madrid',
    'level.up': '¡Ahora eres {name}!',
    'lvl.turista': 'Turista', 'lvl.forastero': 'Forastero', 'lvl.visitante': 'Visitante', 'lvl.vecino': 'Vecino', 'lvl.madrileno': 'Madrileño',
    'lvl.castizo': 'Castizo', 'lvl.chulapo': 'Chulapo', 'lvl.gato': 'Gato',
    bytype: 'Por tipo', stamps: 'Mis sellos', 'badge.kicker': 'Logro desbloqueado', 'level.kicker': 'Nivel {n}', 'level.pts': '{n} puntos', 'badge.new': 'Logro desbloqueado: {name}',
    'share.post': 'Publicación', 'share.story': 'Historia', 'share.city': 'Todo Madrid', 'share.dl': 'Imagen descargada', 'share.fail': 'No se pudo generar la imagen',
    'share.title': 'Mi Madrid', 'share.visited': 'visitados', 'share.gps': 'confirmados GPS', 'share.pending': 'pendientes', 'share.districts': 'distritos completos', 'share.barrios': 'barrios',
    'heat.legend': '% visitado', 'map.error': 'Error cargando el mapa',
    'debug.on': 'GPS falso activado', 'debug.off': 'GPS falso desactivado', 'debug.move': 'Mover', 'debug.cancel': 'Cancelar', 'debug.tap': 'toca el mapa para colocarte',
    'debug.nopos': 'sin posición', 'debug.set': 'Posición falsa fijada', 'debug.need': 'Pulsa «Mover» y toca el mapa para fijar tu posición falsa', 'debug.reset': 'Progreso borrado',
  },
  en: {
    'title.home': 'Explore Madrid', 'tab.diary': 'Diary', 'tab.map': 'Map', 'tab.badges': 'Badges',
    'aria.progress': 'Progress', 'aria.locate': 'My location', 'aria.share': 'Share my map', 'aria.dismiss': 'Dismiss',
    'suggest.ok': 'Confirm', today: 'Today', yesterday: 'Yesterday', nodate: 'No date', back: 'Back',
    'search.ph': 'Search places, neighbourhoods…', 'search.clear': 'Clear search', results_1: '{n} result', results_n: '{n} results', noresults: 'No results',
    districts: 'Districts', places_of: '{done}/{total} places', n_places: '{n} places', n_barrios: '{n} neighbourhoods',
    place_1: '{n} place', place_n: '{n} places', barrio_1: '{n} neighbourhood', barrio_n: '{n} neighbourhoods', barrio: 'Neighbourhood', barrios: 'Neighbourhoods',
    'd.sub': 'Madrid district · {done}/{total} visited · {gps} GPS', 'f.all': 'All', 'f.todo': 'To do', 'f.done': 'Visited',
    'empty.filter': 'Nothing here with this filter', visited: 'Visited', 'gps.confirmed': 'Confirmed by GPS', at: '{d} away', directions: 'Directions', 'dir.transit': 'Transit', 'metro.at': 'Nearest metro · {d} · {min} min walk',
    src: 'Text: Wikipedia', 'src.es': 'Text: Wikipedia (in Spanish)',
    'chk.been': "I've been here", 'chk.gps': 'Verify with GPS', 'chk.locked': "Confirmed by GPS · can't be removed", 'chk.marked': 'Marked as visited', 'chk.unmarked': 'Removed from visited', undo: 'Undo', 'barrio.unmarked.toast': 'Neighbourhood unmarked: {name}',
    'list.f': 'Favourites', 'list.w': 'Want to go', 'list.f1': 'Favourite', 'list.w1': 'Want to go', 'list.empty': 'No places in this list yet.<br>Open one and tap ♥ Favourite or Want to go.',
    'list.f.add': 'Added to favourites', 'list.f.del': 'Removed from favourites', 'list.w.add': 'Added to «Want to go»', 'list.w.del': 'Removed from «Want to go»', 'chk.already': 'Already verified by GPS',
    'gps.far': "You're {d} away · get closer", 'gps.fail': "Couldn't get your location", 'gps.na': 'GPS not available',
    'sg.marked': 'Already marked', 'sg.at': '{d} away · confirm by GPS?', 'stamp.gps': 'CONFIRMED BY GPS · MADRID PASSPORT ·',
    'barrio.new': 'New neighbourhood: {name}', 'barrio.kicker': 'New neighbourhood',
    'barrio.hint': 'They get stamped when you walk through with GPS on (gold) or visit one of their places (red). Tap a pending one to mark it by hand.',
    'barrio.lock.gps': "Walked with GPS · can't be removed", 'barrio.lock.place': 'Stamped by a visited place in this neighbourhood', 'barrio.marked.toast': 'Neighbourhood marked: {name}',
    'access.Plaza': 'Public space · open 24/7', 'access.Calle': 'Public space · open access', 'access.Barrio': 'Public space · open access',
    'access.Parque': 'Free entry · check opening hours', 'access.Gastronomía': 'Venue · check opening hours', 'access.Mercado': 'Check opening hours',
    'access.Museo': 'Check hours and prices on the official website', 'access.Monumento': 'Outside: free · inside: check hours and prices', 'access.Iglesia': 'Check service and visiting hours',
    'access.Cultura': 'Check programme, hours and prices', 'access.Estadio': 'Tours and matches: see the official website', 'access.Mirador': 'Check hours and prices',
    'access.Teatro': 'Check listings, times and prices', 'access.x': 'Check opening hours',
    'k.visited': 'Visited', 'k.barrios': 'Areas', 'diary.empty': 'Your diary is empty.<br>Mark your first place to begin.', language: 'Language',
    'acct.save': 'Save your passport', 'acct.why': 'Sign in so you never lose your progress and can use it on other devices.', 'acct.google': 'Sign in with Google',
    'acct.out': 'Sign out', 'acct.fail': "Couldn't sign in", 'acct.bye': 'Signed out · your progress stays on this phone',
    'sync.idle': 'Connected', 'sync.syncing': 'Syncing…', 'sync.ok': 'Saved to the cloud', 'sync.error': 'Sync error · retry',
    level: 'Level', pts: 'pts', 'level.next': '{n} pts to {name}', 'level.max': "Top level: you're a true Madrid gato",
    'level.up': 'You are now {name}!',
    'lvl.turista': 'Tourist', 'lvl.forastero': 'Outsider', 'lvl.visitante': 'Visitor', 'lvl.vecino': 'Neighbour', 'lvl.madrileno': 'Madrileño',
    'lvl.castizo': 'Castizo', 'lvl.chulapo': 'Chulapo', 'lvl.gato': 'Gato',
    bytype: 'By type', stamps: 'My stamps', 'badge.kicker': 'Badge unlocked', 'level.kicker': 'Level {n}', 'level.pts': '{n} points', 'badge.new': 'Badge unlocked: {name}',
    'share.post': 'Post', 'share.story': 'Story', 'share.city': 'All of Madrid', 'share.dl': 'Image downloaded', 'share.fail': "Couldn't create the image",
    'share.title': 'My Madrid', 'share.visited': 'visited', 'share.gps': 'GPS confirmed', 'share.pending': 'to do', 'share.districts': 'districts done', 'share.barrios': 'neighbourhoods',
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
