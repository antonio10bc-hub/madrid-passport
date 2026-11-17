// Puntos de interés. El distrito se asigna en runtime por su posición (data/distritos.geojson).
// zone = barrio / zona dentro del distrito (para agrupar en la lista). coords = [lat, lng].
window.PLACES = [
  // Centro
  { id: 'puerta-sol', zone: 'Sol', name: 'Puerta del Sol', type: 'Plaza', coords: [40.4169, -3.7035] },
  { id: 'plaza-mayor', zone: 'Sol', name: 'Plaza Mayor', type: 'Plaza', coords: [40.4155, -3.7074] },
  { id: 'san-miguel', zone: 'Sol', name: 'Mercado de San Miguel', type: 'Mercado', coords: [40.4154, -3.7090] },
  { id: 'san-gines', zone: 'Sol', name: 'Chocolatería San Ginés', type: 'Gastronomía', coords: [40.4169, -3.7068] },
  { id: 'descalzas', zone: 'Sol', name: 'Descalzas Reales', type: 'Monumento', coords: [40.4183, -3.7058] },
  { id: 'palacio-real', zone: 'Palacio', name: 'Palacio Real', type: 'Monumento', coords: [40.4180, -3.7143] },
  { id: 'almudena', zone: 'Palacio', name: 'Catedral de la Almudena', type: 'Iglesia', coords: [40.4157, -3.7144] },
  { id: 'plaza-oriente', zone: 'Palacio', name: 'Plaza de Oriente', type: 'Plaza', coords: [40.4184, -3.7122] },
  { id: 'sabatini', zone: 'Palacio', name: 'Jardines de Sabatini', type: 'Parque', coords: [40.4207, -3.7139] },
  { id: 'cava-baja', zone: 'La Latina', name: 'Cava Baja', type: 'Calle', coords: [40.4122, -3.7088] },
  { id: 'plaza-paja', zone: 'La Latina', name: 'Plaza de la Paja', type: 'Plaza', coords: [40.4130, -3.7120] },
  { id: 'san-francisco', zone: 'La Latina', name: 'San Francisco el Grande', type: 'Iglesia', coords: [40.4106, -3.7146] },
  { id: 'rastro', zone: 'La Latina', name: 'El Rastro', type: 'Mercado', coords: [40.4087, -3.7075] },
  { id: 'plaza-lavapies', zone: 'Lavapiés', name: 'Plaza de Lavapiés', type: 'Plaza', coords: [40.4089, -3.7006] },
  { id: 'reina-sofia', zone: 'Lavapiés', name: 'Museo Reina Sofía', type: 'Museo', coords: [40.4080, -3.6946] },
  { id: 'tabacalera', zone: 'Lavapiés', name: 'La Tabacalera', type: 'Cultura', coords: [40.4068, -3.7030] },
  { id: 'san-fernando', zone: 'Lavapiés', name: 'Mercado de San Fernando', type: 'Mercado', coords: [40.4083, -3.7024] },
  { id: 'santa-ana', zone: 'Barrio de las Letras', name: 'Plaza de Santa Ana', type: 'Plaza', coords: [40.4146, -3.7009] },
  { id: 'lope', zone: 'Barrio de las Letras', name: 'Casa Museo Lope de Vega', type: 'Museo', coords: [40.4130, -3.6975] },
  { id: 'trinitarias', zone: 'Barrio de las Letras', name: 'Convento de las Trinitarias', type: 'Monumento', coords: [40.4127, -3.6985] },
  { id: 'congreso', zone: 'Barrio de las Letras', name: 'Congreso de los Diputados', type: 'Monumento', coords: [40.4163, -3.6966] },
  { id: 'dos-mayo', zone: 'Malasaña', name: 'Plaza del Dos de Mayo', type: 'Plaza', coords: [40.4275, -3.7040] },
  { id: 'san-ildefonso', zone: 'Malasaña', name: 'Mercado de San Ildefonso', type: 'Mercado', coords: [40.4231, -3.7016] },
  { id: 'alemanes', zone: 'Malasaña', name: 'San Antonio de los Alemanes', type: 'Iglesia', coords: [40.4220, -3.7040] },
  { id: 'conde-duque', zone: 'Malasaña', name: 'Cuartel de Conde Duque', type: 'Cultura', coords: [40.4275, -3.7105] },
  { id: 'plaza-chueca', zone: 'Chueca', name: 'Plaza de Chueca', type: 'Plaza', coords: [40.4228, -3.6975] },
  { id: 'san-anton', zone: 'Chueca', name: 'Mercado de San Antón', type: 'Mercado', coords: [40.4215, -3.6980] },
  { id: 'longoria', zone: 'Chueca', name: 'Palacio Longoria', type: 'Monumento', coords: [40.4248, -3.6960] },
  { id: 'romanticismo', zone: 'Chueca', name: 'Museo del Romanticismo', type: 'Museo', coords: [40.4259, -3.6990] },
  // Retiro
  { id: 'cristal', zone: 'Parque del Retiro', name: 'Palacio de Cristal', type: 'Parque', coords: [40.4138, -3.6822] },
  { id: 'estanque', zone: 'Parque del Retiro', name: 'Estanque Grande', type: 'Parque', coords: [40.4183, -3.6830] },
  { id: 'prado', zone: 'Jerónimos', name: 'Museo del Prado', type: 'Museo', coords: [40.4138, -3.6908] },
  { id: 'botanico', zone: 'Jerónimos', name: 'Real Jardín Botánico', type: 'Parque', coords: [40.4113, -3.6898] },
  { id: 'alcala', zone: 'Parque del Retiro', name: 'Puerta de Alcalá', type: 'Monumento', coords: [40.4200, -3.6887] },
  // Salamanca
  { id: 'colon', zone: 'Recoletos', name: 'Plaza de Colón', type: 'Plaza', coords: [40.4250, -3.6893] },
  { id: 'man', zone: 'Recoletos', name: 'Museo Arqueológico Nacional', type: 'Museo', coords: [40.4238, -3.6895] },
  { id: 'lazaro', zone: 'Castellana', name: 'Museo Lázaro Galdiano', type: 'Museo', coords: [40.4374, -3.6871] },
  { id: 'mercado-paz', zone: 'Castellana', name: 'Mercado de la Paz', type: 'Mercado', coords: [40.4280, -3.6835] },
  { id: 'ventas', zone: 'Guindalera', name: 'Plaza de toros de Las Ventas', type: 'Monumento', coords: [40.4320, -3.6630] },
  // Chamberí
  { id: 'anden-0', name: 'Andén 0 · Estación Chamberí', type: 'Cultura', coords: [40.4325, -3.6985] },
  { id: 'sorolla', name: 'Museo Sorolla', type: 'Museo', coords: [40.4356, -3.6927] },
  { id: 'olavide', name: 'Plaza de Olavide', type: 'Plaza', coords: [40.4325, -3.7035] },
  { id: 'vallehermoso', name: 'Mercado de Vallehermoso', type: 'Mercado', coords: [40.4370, -3.7095] },
  // Moncloa-Aravaca
  { id: 'debod', name: 'Templo de Debod', type: 'Monumento', coords: [40.4240, -3.7177] },
  { id: 'rosaleda', name: 'Rosaleda del Parque del Oeste', type: 'Parque', coords: [40.4270, -3.7230] },
  { id: 'florida', name: 'San Antonio de la Florida', type: 'Iglesia', coords: [40.4253, -3.7271] },
  { id: 'faro', name: 'Faro de Moncloa', type: 'Mirador', coords: [40.4370, -3.7200] },
  { id: 'museo-america', name: 'Museo de América', type: 'Museo', coords: [40.4380, -3.7225] },
  // Arganzuela
  { id: 'matadero', name: 'Matadero Madrid', type: 'Cultura', coords: [40.3920, -3.6980] },
  { id: 'planetario', name: 'Planetario de Madrid', type: 'Cultura', coords: [40.3920, -3.6850] },
  { id: 'madrid-rio', name: 'Madrid Río · Puente de Arganzuela', type: 'Parque', coords: [40.3960, -3.7020] },
  // Otros distritos
  { id: 'bernabeu', name: 'Estadio Santiago Bernabéu', type: 'Estadio', coords: [40.4531, -3.6883] },
  { id: 'auditorio', name: 'Auditorio Nacional', type: 'Cultura', coords: [40.4460, -3.6770] },
  { id: 'maravillas', name: 'Mercado de Maravillas', type: 'Mercado', coords: [40.4485, -3.7025] },
  { id: 'tio-pio', name: 'Cerro del Tío Pío', type: 'Mirador', coords: [40.3960, -3.6550] },
  { id: 'capricho', name: 'Parque El Capricho', type: 'Parque', coords: [40.4560, -3.5980] },
  { id: 'metropolitano', name: 'Estadio Metropolitano', type: 'Estadio', coords: [40.4362, -3.5995] },
  { id: 'pardo', name: 'Palacio Real de El Pardo', type: 'Monumento', coords: [40.5225, -3.7750] },
  { id: 'usera-china', name: 'Barrio chino de Usera', type: 'Gastronomía', coords: [40.3870, -3.7090] },
  { id: 'ermita-isidro', name: 'Ermita de San Isidro', type: 'Iglesia', coords: [40.4000, -3.7240] },
  // Tetuán
  { id: 'rodriguez-sahagun', name: 'Parque Rodríguez Sahagún', type: 'Parque', coords: [40.4630, -3.7070] },
  { id: 'ventilla', name: 'Parque de la Ventilla', type: 'Parque', coords: [40.4655, -3.6990] },
  // Chamartín
  { id: 'ciencias-naturales', name: 'Museo Nacional de Ciencias Naturales', type: 'Museo', coords: [40.4410, -3.6895] },
  // Fuencarral-El Pardo
  { id: 'cuatro-torres', name: 'Cuatro Torres', type: 'Mirador', coords: [40.4770, -3.6880] },
  { id: 'vaguada', name: 'La Vaguada · Barrio del Pilar', type: 'Barrio', coords: [40.4790, -3.7080] },
  { id: 'fuencarral-pueblo', name: 'Casco antiguo de Fuencarral', type: 'Barrio', coords: [40.4945, -3.6930] },
  // Latina
  { id: 'cuna-verde-latina', name: 'Cuña Verde de Latina', type: 'Parque', coords: [40.3880, -3.7650] },
  { id: 'cruces', name: 'Parque de las Cruces', type: 'Parque', coords: [40.3790, -3.7520] },
  { id: 'caramuel', name: 'Parque Caramuel · Puerta del Ángel', type: 'Parque', coords: [40.4085, -3.7360] },
  // Carabanchel
  { id: 'parque-isidro', name: 'Parque de San Isidro', type: 'Parque', coords: [40.3990, -3.7210] },
  { id: 'sacramental-isidro', name: 'Sacramental de San Isidro', type: 'Monumento', coords: [40.3975, -3.7265] },
  { id: 'santa-maria-antigua', name: 'Ermita de Santa María la Antigua', type: 'Iglesia', coords: [40.3800, -3.7350] },
  // Usera
  { id: 'pradolongo', name: 'Parque Pradolongo', type: 'Parque', coords: [40.3800, -3.7050] },
  // Puente de Vallecas
  { id: 'estadio-vallecas', name: 'Estadio de Vallecas', type: 'Estadio', coords: [40.3918, -3.6588] },
  { id: 'palomeras', name: 'Parque Lineal de Palomeras', type: 'Parque', coords: [40.3830, -3.6420] },
  // Moratalaz
  { id: 'cuna-odonnell', name: "Cuña Verde de O'Donnell", type: 'Parque', coords: [40.4120, -3.6460] },
  { id: 'moratalaz-centro', name: 'Paseo de Moratalaz', type: 'Calle', coords: [40.4060, -3.6460] },
  { id: 'fontarron', name: 'Parque de Fontarrón', type: 'Parque', coords: [40.4000, -3.6400] },
  // Ciudad Lineal
  { id: 'arturo-soria', name: 'Calle Arturo Soria', type: 'Calle', coords: [40.4500, -3.6510] },
  { id: 'calero', name: 'Parque de El Calero', type: 'Parque', coords: [40.4320, -3.6490] },
  { id: 'pueblo-nuevo', name: 'Pueblo Nuevo', type: 'Barrio', coords: [40.4355, -3.6420] },
  // Hortaleza
  { id: 'felipe-vi', name: 'Parque Felipe VI', type: 'Parque', coords: [40.4830, -3.6230] },
  { id: 'juan-pablo-ii', name: 'Parque Juan Pablo II', type: 'Parque', coords: [40.4590, -3.6440] },
  { id: 'hortaleza-pueblo', name: 'Casco histórico de Hortaleza', type: 'Barrio', coords: [40.4720, -3.6420] },
  // Villaverde
  { id: 'boetticher', name: 'Nave Boetticher', type: 'Cultura', coords: [40.3490, -3.7090] },
  { id: 'dehesa-boyal', name: 'Parque de la Dehesa Boyal', type: 'Parque', coords: [40.3410, -3.7110] },
  { id: 'villaverde-alto', name: 'Villaverde Alto', type: 'Barrio', coords: [40.3410, -3.7130] },
  // Villa de Vallecas
  { id: 'vallecas-pueblo', name: 'Casco histórico de Vallecas', type: 'Barrio', coords: [40.3780, -3.6220] },
  { id: 'gavia', name: 'Parque de la Gavia', type: 'Parque', coords: [40.3670, -3.6100] },
  { id: 'santa-eugenia', name: 'Santa Eugenia', type: 'Barrio', coords: [40.3830, -3.6050] },
  // Vicálvaro
  { id: 'valdebernardo', name: 'Parque Forestal de Valdebernardo', type: 'Parque', coords: [40.4000, -3.6230] },
  { id: 'vicalvaro-pueblo', name: 'Casco histórico de Vicálvaro', type: 'Barrio', coords: [40.4030, -3.6070] },
  { id: 'cerro-almodovar', name: 'Cerro Almodóvar', type: 'Mirador', coords: [40.3920, -3.5880] },
  // San Blas-Canillejas
  { id: 'quinta-molinos', name: 'Quinta de los Molinos', type: 'Parque', coords: [40.4430, -3.6180] },
  { id: 'torre-arias', name: 'Quinta de Torre Arias', type: 'Parque', coords: [40.4470, -3.6125] },
  // Barajas
  { id: 'juan-carlos-i', name: 'Parque Juan Carlos I', type: 'Parque', coords: [40.4650, -3.6080] },
  { id: 'barajas-pueblo', name: 'Casco histórico de Barajas', type: 'Barrio', coords: [40.4740, -3.5795] },
];
