// Logros. test(s) recibe { places, districts, lvl, visits } y devuelve [actual, objetivo].
(() => {
  const count = (s, f) => s.places.filter((p) => f(p) && s.lvl(p.id) > 0).length;
  const total = (s, f) => s.places.filter(f).length;
  const ofType = (t) => (p) => p.type === t;
  const all = (t) => (s) => [count(s, ofType(t)), total(s, ofType(t))];
  window.MP_BADGES = [
    { id: 'primer-sello', icon: 'ticket', name: 'Primer sello', desc: 'Marca tu primer lugar', test: (s) => [count(s, () => true), 1] },
    { id: 'gps-1', icon: 'pin', name: 'Estuve aquí', desc: 'Confirma un lugar por GPS', test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 1] },
    { id: 'visitas-10', icon: 'walk', name: 'Paseante', desc: 'Visita 10 lugares', test: (s) => [count(s, () => true), 10] },
    { id: 'visitas-25', icon: 'route', name: 'Andarín', desc: 'Visita 25 lugares', test: (s) => [count(s, () => true), 25] },
    { id: 'visitas-50', icon: 'compass', name: 'Explorador', desc: 'Visita 50 lugares', test: (s) => [count(s, () => true), 50] },
    { id: 'gps-10', icon: 'target', name: 'Pisando calle', desc: 'Confirma 10 lugares por GPS', test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 10] },
    { id: 'distrito-1', icon: 'flag', name: 'Distrito completo', desc: 'Completa un distrito entero', test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 1] },
    { id: 'distrito-5', icon: 'map', name: 'Media ciudad', desc: 'Completa 5 distritos', test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 5] },
    { id: 'los-21', icon: 'cat', name: 'Gato de los 21', desc: 'Visita al menos un lugar en cada distrito', test: (s) => [s.districts.filter((d) => d.places.some((p) => s.lvl(p.id) > 0)).length, s.districts.length] },
    { id: 'museos', icon: 'museo', name: 'Ruta de museos', desc: 'Visita todos los museos', test: all('Museo') },
    { id: 'mercados', icon: 'mercado', name: 'De mercado en mercado', desc: 'Visita todos los mercados', test: all('Mercado') },
    { id: 'parques', icon: 'parque', name: 'Pulmón verde', desc: 'Visita todos los parques', test: all('Parque') },
    { id: 'plazas', icon: 'plaza', name: 'De plaza en plaza', desc: 'Visita todas las plazas', test: all('Plaza') },
    { id: 'miradores', icon: 'mirador', name: 'Madrid desde arriba', desc: 'Visita todos los miradores', test: all('Mirador') },
    { id: 'iglesias', icon: 'iglesia', name: 'Campanario', desc: 'Visita todas las iglesias', test: all('Iglesia') },
    { id: 'estadios', icon: 'estadio', name: 'Grada', desc: 'Visita todos los estadios', test: all('Estadio') },
    { id: 'madrid-entero', icon: 'crown', name: 'Gato de pura cepa', desc: 'Visita todos los lugares de Madrid', test: (s) => [count(s, () => true), s.places.length] },
  ];
})();
