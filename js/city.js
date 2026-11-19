// Ciudad de esta app. Todo lo propio de Madrid está aquí (y en los datos: js/data.js, data/*.geojson, data/metro.json,
// tools/places.tsv); el resto del código es genérico. Para otra ciudad: copiar este archivo y tools/city.json, y cambiar los datos.
window.MP_CITY = {
  id: 'madrid', name: 'Madrid', app: 'Madrid Passport', site: 'https://www.madridpassport.com',
  // Mapa: centro [lng, lat], zoom inicial y mínimo, límites por los que se puede mover
  map: { center: [-3.70, 40.42], zoom: 10.5, minZoom: 9.3, maxBounds: [[-4.55, 39.85], [-2.85, 41.0]],
    attribution: 'Ayto. Madrid', hideBaseLabel: 'Madrid' },          // etiqueta del mapa base que se quita (se solapaba con los distritos)
  files: { districts: 'data/distritos.geojson', barrios: 'data/barrios.geojson', metro: 'data/metro.json' },
  // Lugares icónicos para marcar en el último paso del onboarding
  iconic: ['puerta-sol', 'plaza-mayor', 'parque-retiro', 'palacio-real', 'gran-via', 'prado', 'debod', 'cibeles', 'bernabeu'],
  // Textos con el nombre de la ciudad o su tono local (niveles castizos). Mandan sobre los de js/app/i18n.js.
  text: {
    es: {
      'title.home': 'Explora Madrid', 'ob.1.t': 'Explora Madrid', 'ob.1.d': '{d} distritos, {b} barrios y más de {n} lugares esperando tu sello.',
      'd.sub': 'Distrito de Madrid · {done}/{total} visitados · {gps} GPS', 'level.max': 'Nivel máximo: eres un gato de Madrid',
      'share.city': 'Todo Madrid', 'share.title': 'Mi Madrid', 'share.join': 'Únete y explora Madrid conmigo', 'stamp.gps': 'CONFIRMADO POR GPS · MADRID PASSPORT ·',
      'lvl.turista': 'Turista', 'lvl.forastero': 'Forastero', 'lvl.visitante': 'Visitante', 'lvl.vecino': 'Vecino',
      'lvl.madrileno': 'Madrileño', 'lvl.castizo': 'Castizo', 'lvl.chulapo': 'Chulapo', 'lvl.gato': 'Gato',
    },
    en: {
      'title.home': 'Explore Madrid', 'ob.1.t': 'Explore Madrid', 'ob.1.d': '{d} districts, {b} neighbourhoods and {n}+ places waiting for your stamp.',
      'd.sub': 'Madrid district · {done}/{total} visited · {gps} GPS', 'level.max': "Top level: you're a true Madrid gato",
      'share.city': 'All of Madrid', 'share.title': 'My Madrid', 'share.join': 'Join me exploring Madrid', 'stamp.gps': 'CONFIRMED BY GPS · MADRID PASSPORT ·',
      'lvl.turista': 'Tourist', 'lvl.forastero': 'Outsider', 'lvl.visitante': 'Visitor', 'lvl.vecino': 'Neighbour',
      'lvl.madrileno': 'Madrileño', 'lvl.castizo': 'Castizo', 'lvl.chulapo': 'Chulapo', 'lvl.gato': 'Gato',
    },
  },
};
