// Logros. test(s) recibe { places, districts, barrios, lvl, blvl, visits } y devuelve [actual, objetivo]. en = [nombre, descripción] en inglés.
(() => {
  const count = (s, f) => s.places.filter((p) => f(p) && s.lvl(p.id) > 0).length;
  const total = (s, f) => s.places.filter(f).length;
  const ofType = (t) => (p) => p.type === t;
  const all = (t) => (s) => [count(s, ofType(t)), total(s, ofType(t))];
  const barrios = (s) => s.barrios.filter((b) => s.blvl(b) > 0).length;
  window.MP_BADGES = [
    { id: 'primer-sello', icon: 'ticket', name: 'Primer sello', desc: 'Marca tu primer lugar', en: ['First stamp', 'Mark your first place'], test: (s) => [count(s, () => true), 1] },
    { id: 'gps-1', icon: 'pin', name: 'Estuve aquí', desc: 'Confirma un lugar por GPS', en: ['I was here', 'Confirm a place by GPS'], test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 1] },
    { id: 'visitas-10', icon: 'walk', name: 'Paseante', desc: 'Visita 10 lugares', en: ['Stroller', 'Visit 10 places'], test: (s) => [count(s, () => true), 10] },
    { id: 'visitas-25', icon: 'route', name: 'Andarín', desc: 'Visita 25 lugares', en: ['Walker', 'Visit 25 places'], test: (s) => [count(s, () => true), 25] },
    { id: 'visitas-50', icon: 'compass', name: 'Explorador', desc: 'Visita 50 lugares', en: ['Explorer', 'Visit 50 places'], test: (s) => [count(s, () => true), 50] },
    { id: 'gps-10', icon: 'target', name: 'Pisando calle', desc: 'Confirma 10 lugares por GPS', en: ['Street level', 'Confirm 10 places by GPS'], test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 10] },
    { id: 'distrito-1', icon: 'flag', name: 'Distrito completo', desc: 'Completa un distrito entero', en: ['Full district', 'Complete a whole district'], test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 1] },
    { id: 'distrito-5', icon: 'map', name: 'Media ciudad', desc: 'Completa 5 distritos', en: ['Half the city', 'Complete 5 districts'], test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 5] },
    { id: 'los-21', icon: 'cat', name: 'Gato de los 21', desc: 'Visita al menos un lugar en cada distrito', en: ['All 21', 'Visit at least one place in every district'], test: (s) => [s.districts.filter((d) => d.places.some((p) => s.lvl(p.id) > 0)).length, s.districts.length] },
    { id: 'museos', icon: 'museo', name: 'Ruta de museos', desc: 'Visita todos los museos', en: ['Museum route', 'Visit every museum'], test: all('Museo') },
    { id: 'mercados', icon: 'mercado', name: 'De mercado en mercado', desc: 'Visita todos los mercados', en: ['Market hopper', 'Visit every market'], test: all('Mercado') },
    { id: 'parques', icon: 'parque', name: 'Pulmón verde', desc: 'Visita todos los parques', en: ['Green lung', 'Visit every park'], test: all('Parque') },
    { id: 'plazas', icon: 'plaza', name: 'De plaza en plaza', desc: 'Visita todas las plazas', en: ['Square to square', 'Visit every square'], test: all('Plaza') },
    { id: 'miradores', icon: 'mirador', name: 'Madrid desde arriba', desc: 'Visita todos los miradores', en: ['Madrid from above', 'Visit every viewpoint'], test: all('Mirador') },
    { id: 'iglesias', icon: 'iglesia', name: 'Campanario', desc: 'Visita todas las iglesias', en: ['Bell tower', 'Visit every church'], test: all('Iglesia') },
    { id: 'estadios', icon: 'estadio', name: 'Grada', desc: 'Visita todos los estadios', en: ['In the stands', 'Visit every stadium'], test: all('Estadio') },
    { id: 'teatros', icon: 'teatro', name: 'Telón arriba', desc: 'Visita todos los teatros', en: ['Curtain up', 'Visit every theatre'], test: all('Teatro') },
    { id: 'gastro', icon: 'gastronomia', name: 'De tapas', desc: 'Visita todos los sitios de gastronomía', en: ['Tapas crawl', 'Visit every food & drink spot'], test: all('Gastronomía') },
    { id: 'barrios-10', icon: 'barrio', name: 'Barrio a barrio', desc: 'Pisa 10 barrios', en: ['Block by block', 'Set foot in 10 neighbourhoods'], test: (s) => [barrios(s), 10] },
    { id: 'barrios-50', icon: 'route', name: 'Callejero', desc: 'Pisa 50 barrios', en: ['Street map', 'Set foot in 50 neighbourhoods'], test: (s) => [barrios(s), 50] },
    { id: 'barrios-all', icon: 'map', name: 'De punta a punta', desc: 'Pisa todos los barrios de Madrid', en: ['End to end', 'Set foot in every neighbourhood'], test: (s) => [barrios(s), s.barrios.length] },
    { id: 'madrid-entero', icon: 'crown', name: 'Gato de pura cepa', desc: 'Visita todos los lugares de Madrid', en: ['True-born Gato', 'Visit every place in Madrid'], test: (s) => [count(s, () => true), s.places.length] },
  ];
})();
