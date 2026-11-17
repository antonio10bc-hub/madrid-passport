// Iconos lineales 24×24 (stroke = currentColor). MP_ICON(nombre, clase) → <svg>.
(() => {
  const P = {
    plaza: '<path d="M4 20h16M6 20v-3h12v3M12 17V9"/><path d="M8 9c0-2 2-3 4-5 2 2 4 3 4 5z"/>',
    calle: '<path d="M12 3v18M12 6h7l2 2-2 2h-7M12 13H5l-2 2 2 2h7"/>',
    barrio: '<path d="M3 20V10l5-4 5 4v10M13 20v-7l4-3 4 3v7M2 20h20M7 20v-4h2v4"/>',
    parque: '<path d="M12 3l-6 8h3.5L5 17h14l-4.5-6H18z"/><path d="M12 17v4"/>',
    gastronomia: '<path d="M4 9h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V9z"/><path d="M17 11h1.5a2.5 2.5 0 010 5H17M8 3v3M12 3v3"/>',
    mercado: '<path d="M3 10h18l-2 10H5L3 10z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3"/>',
    museo: '<path d="M3 9l9-5 9 5M4 20h16M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/>',
    monumento: '<path d="M4 20V8h16v12M4 8l8-4 8 4M9 20v-5a3 3 0 016 0v5M3 20h18"/>',
    iglesia: '<path d="M12 2v4M10 4h4M7 21V11l5-4 5 4v10M3 21h18M10 21v-4a2 2 0 014 0v4"/>',
    cultura: '<path d="M4 5h16v6a8 8 0 01-16 0V5z"/><path d="M9 10h.01M15 10h.01M9 14c1.5 1.2 4.5 1.2 6 0"/>',
    estadio: '<ellipse cx="12" cy="10" rx="9" ry="5"/><ellipse cx="12" cy="10" rx="4.5" ry="2"/><path d="M3 10v4c0 2.8 4 5 9 5s9-2.2 9-5v-4"/>',
    mirador: '<circle cx="7" cy="16" r="3.5"/><circle cx="17" cy="16" r="3.5"/><path d="M10.5 16h3M4.5 13.5L7 5h3l.5 8M19.5 13.5L17 5h-3l-.5 8"/>',
    teatro: '<path d="M3 4h18M5 4v16M19 4v16M3 20h18"/><path d="M5 4c0 6 2.5 9 5 9M19 4c0 6-2.5 9-5 9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>',
    bookmark: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    sort: '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ticket: '<path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6.5v1.5M14 11v2M14 16v1.5"/>',
    walk: '<circle cx="13" cy="4" r="1.8"/><path d="M10 21l2-6-2.5-2.5L11 8l3 3 3 1M9.5 12.5L8 15M12 15l3 6"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 000-6H9a3 3 0 010-6h7"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
    map: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
    cat: '<path d="M5 20v-9L4 4.5l4.5 3h7L20 4.5 19 11v9z"/><path d="M9.5 13h.01M14.5 13h.01M10.5 16.5h3"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 19h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const TYPE = { Plaza: 'plaza', Calle: 'calle', Barrio: 'barrio', Parque: 'parque', Gastronomía: 'gastronomia', Mercado: 'mercado',
    Museo: 'museo', Monumento: 'monumento', Iglesia: 'iglesia', Cultura: 'cultura', Estadio: 'estadio', Mirador: 'mirador', Teatro: 'teatro' };
  window.MP_ICON = (name, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[TYPE[name] || name] || P.pin}</svg>`;
})();
