// Barrios y lugares. Coordenadas WGS84 [lat, lng].
window.BARRIOS = [
  { id: 'sol', name: 'Sol', tag: 'El kilómetro cero', center: [40.4166, -3.7050], places: [
    { id: 'puerta-sol', name: 'Puerta del Sol', type: 'Plaza', coords: [40.4169, -3.7035] },
    { id: 'plaza-mayor', name: 'Plaza Mayor', type: 'Plaza', coords: [40.4155, -3.7074] },
    { id: 'san-miguel', name: 'Mercado de San Miguel', type: 'Mercado', coords: [40.4154, -3.7090] },
    { id: 'san-gines', name: 'Chocolatería San Ginés', type: 'Gastronomía', coords: [40.4169, -3.7068] },
    { id: 'descalzas', name: 'Descalzas Reales', type: 'Monumento', coords: [40.4183, -3.7058] },
  ]},
  { id: 'palacio', name: 'Palacio', tag: 'El Madrid de los Austrias', center: [40.4185, -3.7145], places: [
    { id: 'palacio-real', name: 'Palacio Real', type: 'Monumento', coords: [40.4180, -3.7143] },
    { id: 'almudena', name: 'Catedral de la Almudena', type: 'Iglesia', coords: [40.4157, -3.7144] },
    { id: 'plaza-oriente', name: 'Plaza de Oriente', type: 'Plaza', coords: [40.4184, -3.7122] },
    { id: 'sabatini', name: 'Jardines de Sabatini', type: 'Parque', coords: [40.4207, -3.7139] },
    { id: 'debod', name: 'Templo de Debod', type: 'Monumento', coords: [40.4240, -3.7177] },
  ]},
  { id: 'latina', name: 'La Latina', tag: 'Tapas y Rastro', center: [40.4115, -3.7105], places: [
    { id: 'cava-baja', name: 'Cava Baja', type: 'Calle', coords: [40.4122, -3.7088] },
    { id: 'plaza-paja', name: 'Plaza de la Paja', type: 'Plaza', coords: [40.4130, -3.7120] },
    { id: 'san-francisco', name: 'San Francisco el Grande', type: 'Iglesia', coords: [40.4106, -3.7146] },
    { id: 'rastro', name: 'El Rastro', type: 'Mercado', coords: [40.4087, -3.7075] },
  ]},
  { id: 'lavapies', name: 'Lavapiés', tag: 'Multicultural y castizo', center: [40.4085, -3.7000], places: [
    { id: 'plaza-lavapies', name: 'Plaza de Lavapiés', type: 'Plaza', coords: [40.4089, -3.7006] },
    { id: 'reina-sofia', name: 'Museo Reina Sofía', type: 'Museo', coords: [40.4080, -3.6946] },
    { id: 'tabacalera', name: 'La Tabacalera', type: 'Cultura', coords: [40.4058, -3.7034] },
    { id: 'san-fernando', name: 'Mercado de San Fernando', type: 'Mercado', coords: [40.4083, -3.7024] },
  ]},
  { id: 'letras', name: 'Barrio de las Letras', tag: 'Cervantes, Lope y Quevedo', center: [40.4140, -3.6985], places: [
    { id: 'santa-ana', name: 'Plaza de Santa Ana', type: 'Plaza', coords: [40.4146, -3.7009] },
    { id: 'lope', name: 'Casa Museo Lope de Vega', type: 'Museo', coords: [40.4130, -3.6975] },
    { id: 'trinitarias', name: 'Convento de las Trinitarias', type: 'Monumento', coords: [40.4127, -3.6985] },
    { id: 'congreso', name: 'Congreso de los Diputados', type: 'Monumento', coords: [40.4163, -3.6966] },
  ]},
  { id: 'malasana', name: 'Malasaña', tag: 'La Movida', center: [40.4255, -3.7045], places: [
    { id: 'dos-mayo', name: 'Plaza del Dos de Mayo', type: 'Plaza', coords: [40.4275, -3.7040] },
    { id: 'san-ildefonso', name: 'Mercado de San Ildefonso', type: 'Mercado', coords: [40.4231, -3.7016] },
    { id: 'alemanes', name: 'San Antonio de los Alemanes', type: 'Iglesia', coords: [40.4220, -3.7040] },
    { id: 'conde-duque', name: 'Cuartel de Conde Duque', type: 'Cultura', coords: [40.4275, -3.7105] },
  ]},
  { id: 'chueca', name: 'Chueca', tag: 'Diverso y vibrante', center: [40.4232, -3.6975], places: [
    { id: 'plaza-chueca', name: 'Plaza de Chueca', type: 'Plaza', coords: [40.4228, -3.6975] },
    { id: 'san-anton', name: 'Mercado de San Antón', type: 'Mercado', coords: [40.4215, -3.6980] },
    { id: 'longoria', name: 'Palacio Longoria', type: 'Monumento', coords: [40.4248, -3.6960] },
    { id: 'romanticismo', name: 'Museo del Romanticismo', type: 'Museo', coords: [40.4259, -3.6990] },
  ]},
  { id: 'retiro', name: 'Retiro', tag: 'El pulmón de Madrid', center: [40.4150, -3.6860], places: [
    { id: 'cristal', name: 'Palacio de Cristal', type: 'Parque', coords: [40.4138, -3.6822] },
    { id: 'estanque', name: 'Estanque Grande', type: 'Parque', coords: [40.4183, -3.6830] },
    { id: 'alcala', name: 'Puerta de Alcalá', type: 'Monumento', coords: [40.4200, -3.6887] },
    { id: 'prado', name: 'Museo del Prado', type: 'Museo', coords: [40.4138, -3.6921] },
    { id: 'botanico', name: 'Real Jardín Botánico', type: 'Parque', coords: [40.4113, -3.6910] },
  ]},
  { id: 'salamanca', name: 'Salamanca', tag: 'Elegancia y compras', center: [40.4290, -3.6850], places: [
    { id: 'colon', name: 'Plaza de Colón', type: 'Plaza', coords: [40.4250, -3.6905] },
    { id: 'man', name: 'Museo Arqueológico Nacional', type: 'Museo', coords: [40.4238, -3.6895] },
    { id: 'lazaro', name: 'Museo Lázaro Galdiano', type: 'Museo', coords: [40.4374, -3.6871] },
    { id: 'mercado-paz', name: 'Mercado de la Paz', type: 'Mercado', coords: [40.4280, -3.6835] },
  ]},
  { id: 'chamberi', name: 'Chamberí', tag: 'Madrid auténtico', center: [40.4340, -3.7010], places: [
    { id: 'anden-0', name: 'Andén 0 · Estación Chamberí', type: 'Cultura', coords: [40.4325, -3.6985] },
    { id: 'sorolla', name: 'Museo Sorolla', type: 'Museo', coords: [40.4356, -3.6927] },
    { id: 'olavide', name: 'Plaza de Olavide', type: 'Plaza', coords: [40.4325, -3.7035] },
    { id: 'vallehermoso', name: 'Mercado de Vallehermoso', type: 'Mercado', coords: [40.4370, -3.7095] },
  ]},
];
