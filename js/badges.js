// Logros. test(s) recibe { places, districts, barrios, lvl, blvl, visits } y devuelve [actual, objetivo]. en = [nombre, descripción] en inglés.
(() => {
  const count = (s, f) => s.places.filter((p) => f(p) && s.lvl(p.id) > 0).length;
  const total = (s, f) => s.places.filter(f).length;
  const ofType = (t) => (p) => p.type === t;
  const all = (t) => (s) => [count(s, ofType(t)), total(s, ofType(t))];
  const barrios = (s) => s.barrios.filter((b) => s.blvl(b) > 0).length;
  const gps = (s) => s.places.filter((p) => s.lvl(p.id) === 2).length;
  const fullDistricts = (s) => s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length;
  // Lugares con otros dentro (parent): completos cuando están visitados él y todos los suyos
  const nests = (s) => s.places.filter((p) => s.places.some((k) => k.parent === p.id));
  const nestsDone = (s) => nests(s).filter((p) => s.lvl(p.id) > 0 && s.places.every((k) => k.parent !== p.id || s.lvl(k.id) > 0)).length;
  window.MP_BADGES = [
    { id: 'primer-sello', icon: 'ticket', name: 'Primer sello', desc: 'Marca tu primer lugar', en: ['First stamp', 'Mark your first place'], test: (s) => [count(s, () => true), 1] },
    { id: 'gps-1', icon: 'pin', name: 'Estuve aquí', desc: 'Confirma un lugar por GPS', en: ['I was here', 'Confirm a place by GPS'], test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 1] },
    { id: 'visitas-10', icon: 'walk', name: 'Paseante', desc: 'Visita 10 lugares', en: ['Stroller', 'Visit 10 places'], test: (s) => [count(s, () => true), 10] },
    { id: 'visitas-25', icon: 'route', name: 'Andarín', desc: 'Visita 25 lugares', en: ['Walker', 'Visit 25 places'], test: (s) => [count(s, () => true), 25] },
    { id: 'visitas-50', icon: 'compass', name: 'Explorador', desc: 'Visita 50 lugares', en: ['Explorer', 'Visit 50 places'], test: (s) => [count(s, () => true), 50] },
    { id: 'visitas-100', icon: 'ticket', name: 'Cien sellos', desc: 'Visita 100 lugares', en: ['A hundred stamps', 'Visit 100 places'], test: (s) => [count(s, () => true), 100] },
    { id: 'visitas-250', icon: 'compass', name: 'Madrid de memoria', desc: 'Visita 250 lugares', en: ['Madrid by heart', 'Visit 250 places'], test: (s) => [count(s, () => true), 250] },
    { id: 'gps-10', icon: 'target', name: 'Pisando calle', desc: 'Confirma 10 lugares por GPS', en: ['Street level', 'Confirm 10 places by GPS'], test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length, 10] },
    { id: 'gps-50', icon: 'target', name: 'Suela gastada', desc: 'Confirma 50 lugares por GPS', en: ['Worn-out soles', 'Confirm 50 places by GPS'], test: (s) => [gps(s), 50] },
    { id: 'distrito-1', icon: 'flag', name: 'Distrito completo', desc: 'Completa un distrito entero', en: ['Full district', 'Complete a whole district'], test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 1] },
    { id: 'distrito-5', icon: 'map', name: 'Media ciudad', desc: 'Completa 5 distritos', en: ['Half the city', 'Complete 5 districts'], test: (s) => [s.districts.filter((d) => d.places.length && d.places.every((p) => s.lvl(p.id) > 0)).length, 5] },
    { id: 'distrito-10', icon: 'map', name: 'De distrito en distrito', desc: 'Completa 10 distritos', en: ['District hopper', 'Complete 10 districts'], test: (s) => [fullDistricts(s), 10] },
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
    { id: 'monumentos', icon: 'monumento', name: 'Piedra a piedra', desc: 'Visita todos los monumentos', en: ['Stone by stone', 'Visit every monument'], test: all('Monumento') },
    { id: 'cultura', icon: 'cultura', name: 'Agenda cultural', desc: 'Visita todos los sitios de cultura', en: ['Culture vulture', 'Visit every culture spot'], test: all('Cultura') },
    { id: 'calles', icon: 'calle', name: 'Callejeando', desc: 'Recorre todas las calles', en: ['Street wanderer', 'Walk every street'], test: all('Calle') },
    { id: 'rincon-1', icon: 'flag', name: 'Rincón a rincón', desc: 'Visita un lugar y todo lo que hay dentro (p. ej. el Retiro)', en: ['Every corner', 'Visit a place and everything inside it (e.g. the Retiro)'], test: (s) => [nestsDone(s), 1] },
    { id: 'rincon-all', icon: 'star', name: 'Hasta el último rincón', desc: 'Completa todos los lugares con sitios dentro', en: ['Down to the last corner', 'Complete every place that has spots inside'], test: (s) => [nestsDone(s), nests(s).length] },
    { id: 'barrios-10', icon: 'barrio', name: 'Barrio a barrio', desc: 'Pisa 10 barrios', en: ['Block by block', 'Set foot in 10 neighbourhoods'], test: (s) => [barrios(s), 10] },
    { id: 'barrios-50', icon: 'route', name: 'Callejero', desc: 'Pisa 50 barrios', en: ['Street map', 'Set foot in 50 neighbourhoods'], test: (s) => [barrios(s), 50] },
    { id: 'barrios-all', icon: 'map', name: 'De punta a punta', desc: 'Pisa todos los barrios de Madrid', en: ['End to end', 'Set foot in every neighbourhood'], test: (s) => [barrios(s), s.barrios.length] },
    { id: 'madrid-entero', icon: 'crown', name: 'Gato de pura cepa', desc: 'Visita todos los lugares de Madrid', en: ['True-born Gato', 'Visit every place in Madrid'], test: (s) => [count(s, () => true), s.places.length] },
    // Los dos últimos y más difíciles: todo confirmado con GPS (dorados)
    { id: 'barrios-gps-all', icon: 'target', name: 'Huella dorada', desc: 'Pisa con GPS todos los barrios de Madrid', en: ['Golden footprint', 'Walk every neighbourhood in Madrid with GPS'], test: (s) => [s.barrios.filter((b) => s.blvl(b) === 2).length, s.barrios.length] },
    { id: 'todo-gps', icon: 'star', name: 'Leyenda de Madrid', desc: 'Confirma con GPS absolutamente todo: lugares y barrios', en: ['Madrid legend', 'Confirm absolutely everything with GPS: places and neighbourhoods'], test: (s) => [s.places.filter((p) => s.lvl(p.id) === 2).length + s.barrios.filter((b) => s.blvl(b) === 2).length, s.places.length + s.barrios.length] },
  ];
})();
