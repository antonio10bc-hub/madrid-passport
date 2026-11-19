// Imagen para compartir: todo Madrid (mapa de calor por distrito) o un distrito (barrios pisados), post (1080×1350) o historia (1080×1920).
// L = textos traducidos { title, visited, gps, pending, districts, barrios, level, pts }. level = { n, name, pts } del usuario.
window.MPShare = (() => {
  // Identidad «Maya»: crema con cuadrícula, Fredoka (títulos y cifras) + DM Sans, coral y granate
  const RED = '#D6202C', CORAL = '#F25C4E', WINE = '#8C1D26', GOLD = '#E9A21B', INK = '#141414', MUTED = '#8A7A70', CREAM = '#FFF5EC';
  const FONT = '"DM Sans", -apple-system, system-ui, sans-serif', DISPLAY = '"Fredoka", "DM Sans", system-ui, sans-serif';
  const svgImg = (svg) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" ')); });
  const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
  let barriosCache;

  const L0 = { title: 'Mi Madrid', visited: 'visitados', gps: 'confirmados GPS', pending: 'pendientes', districts: 'distritos completos', barrios: 'barrios', level: 'Nivel', pts: 'pts' };
  async function render({ districts, places, barrios = [], lvl, blvl = () => 0, district = null, format = 'post', L = L0, level = null }) {
    const W = 1080, H = format === 'story' ? 1920 : 1350;
    barriosCache ||= await fetch('data/barrios.geojson').then((r) => r.json()).catch(() => null);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    await Promise.all(['600 30px Fredoka', '700 72px Fredoka', '500 26px "DM Sans"'].map((f) => document.fonts?.load(f).catch(() => {})));
    x.fillStyle = CREAM; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(140,29,38,.06)'; x.lineWidth = 2;   // cuadrícula
    for (let g = 0; g <= Math.max(W, H); g += 54) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.moveTo(0, g); x.lineTo(W, g); x.stroke(); }

    const scope = district ? [district] : districts;
    const pl = district ? district.places : places;
    let b = [180, 90, -180, -90];
    scope.forEach((d) => { b = [Math.min(b[0], d.bbox[0]), Math.min(b[1], d.bbox[1]), Math.max(b[2], d.bbox[2]), Math.max(b[3], d.bbox[3])]; });
    const k = Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180);
    const top = format === 'story' ? 440 : 310, bottom = format === 'story' ? 330 : 210;
    const area = { x: 80, y: top, w: W - 160, h: H - top - bottom };
    const s = Math.min(area.w / ((b[2] - b[0]) * k), area.h / (b[3] - b[1]));
    const ox = area.x + (area.w - (b[2] - b[0]) * k * s) / 2, oy = area.y + (area.h - (b[3] - b[1]) * s) / 2;
    const P = ([lng, lat]) => [ox + (lng - b[0]) * k * s, oy + (b[3] - lat) * s];
    const path = (g) => {
      x.beginPath();
      polys(g).forEach((poly) => poly.forEach((ring) => ring.forEach((pt, i) => { const [px, py] = P(pt); i ? x.lineTo(px, py) : x.moveTo(px, py); })));
    };

    scope.forEach((d) => {
      const r = d.places.length ? d.places.filter((p) => lvl(p.id) > 0).length / d.places.length : 0;
      path(d.feature.geometry);
      x.fillStyle = `rgba(214,32,44,${r ? 0.14 + 0.48 * r : 0.05})`; x.fill('evenodd');   // misma escala que el mapa de calor de la app
    });
    // Barrios pisados (en todo Madrid o en el distrito): rojo visitado, dorado GPS
    barrios.filter((bb) => (!district || bb.district === district) && blvl(bb) > 0).forEach((bb) => {
      path(bb.feature.geometry); x.fillStyle = blvl(bb) === 2 ? 'rgba(201,162,39,.22)' : 'rgba(214,32,44,.16)'; x.fill('evenodd');
    });
    if (barriosCache) {
      x.strokeStyle = 'rgba(214,32,44,.22)'; x.lineWidth = district ? 2 : 1;
      if (district) x.setLineDash([8, 8]);
      barriosCache.features.filter((f) => !district || f.properties.district === district.id).forEach((f) => { path(f.geometry); x.stroke(); });
      x.setLineDash([]);
    }
    x.strokeStyle = district ? RED : '#B8B8C0'; x.lineWidth = district ? 4 : 2; x.lineJoin = 'round';
    scope.forEach((d) => { path(d.feature.geometry); x.stroke(); });

    // Puntos: pendientes (solo en distrito, discontinuos), visitados (rojo), GPS (dorado)
    const R = district ? 1.6 : 1;
    const dot = (p, col, r) => { const [px, py] = P([p.coords[1], p.coords[0]]); x.beginPath(); x.arc(px, py, r * R, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke(); };
    if (district) pl.filter((p) => !lvl(p.id)).forEach((p) => {
      const [px, py] = P([p.coords[1], p.coords[0]]);
      x.beginPath(); x.arc(px, py, 9 * R, 0, 7); x.fillStyle = 'rgba(255,255,255,.85)'; x.fill();
      x.setLineDash([5, 5]); x.lineWidth = 2.5; x.strokeStyle = RED; x.stroke(); x.setLineDash([]);
    });
    pl.filter((p) => lvl(p.id) === 1).forEach((p) => dot(p, RED, 10));
    pl.filter((p) => lvl(p.id) === 2).forEach((p) => dot(p, GOLD, 12));

    // Mapa de calor: % por distrito sobre su etiqueta
    if (!district) {
      x.textAlign = 'center'; x.font = `700 26px ${FONT}`; x.lineJoin = 'round';
      scope.forEach((d) => {
        const n = d.places.length ? Math.round((d.places.filter((p) => lvl(p.id) > 0).length / d.places.length) * 100) : 0;
        if (!n) return;
        const [px, py] = P(d.label);
        x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.9)'; x.strokeText(n + '%', px, py + 9);
        x.fillStyle = INK; x.fillText(n + '%', px, py + 9);
      });
      x.textAlign = 'left';
    }

    // Textos
    const vis = pl.filter((p) => lvl(p.id) > 0).length, gps = pl.filter((p) => lvl(p.id) === 2).length;
    const pct = pl.length ? Math.round((vis / pl.length) * 100) : 0;
    const ty = format === 'story' ? 200 : 120;
    x.textBaseline = 'alphabetic';
    x.fillStyle = WINE; x.font = `600 32px ${DISPLAY}`; x.fillText(MP_CITY.app, 80, ty);
    x.fillStyle = INK; x.font = `700 ${district && district.name.length > 12 ? 62 : 76}px ${DISPLAY}`; x.fillText(district ? district.name : L.title, 80, ty + 82);
    // Maya en la esquina, celebrando, con el % en una chapa coral
    // % en chapa coral arriba a la derecha y Maya debajo, con aire entre ambos
    const pt = pct + '%'; x.font = `700 52px ${DISPLAY}`; const pw0 = x.measureText(pt).width + 44;
    x.beginPath(); x.roundRect ? x.roundRect(W - 80 - pw0, ty + 22, pw0, 76, 38) : x.rect(W - 80 - pw0, ty + 22, pw0, 76);
    x.fillStyle = CORAL; x.fill(); x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText(pt, W - 80 - pw0 / 2, ty + 79); x.textAlign = 'left';
    const mayIm = window.MPMaya ? await svgImg(window.MPMaya(pct >= 50 ? 'party' : 'happy')) : null;
    if (mayIm) { x.save(); x.translate(W - 80 - pw0 / 2, ty + 250); x.rotate(0.12); x.drawImage(mayIm, -90, -90, 180, 180); x.restore(); }
    // Nivel del usuario: píldora roja «NIVEL 3 · VISITANTE» + puntos
    if (level) {
      const label = `${L.level} ${level.n} · ${level.name}`, py = ty + 118, ph = 54;
      x.font = `600 28px ${DISPLAY}`;
      const pw = x.measureText(label).width + 48;
      x.beginPath(); x.roundRect ? x.roundRect(80, py, pw, ph, ph / 2) : x.rect(80, py, pw, ph);
      x.fillStyle = CORAL; x.fill();
      x.fillStyle = '#fff'; x.fillText(label, 104, py + 37);
      x.fillStyle = MUTED; x.font = `600 26px ${FONT}`; x.fillText(`${level.pts} ${L.pts}`, 80 + pw + 18, py + 36);
    }

    const third = district ? [pl.length - vis, L.pending, MUTED] : [barrios.filter((bb) => blvl(bb) > 0).length, L.barrios, INK];
    const bScope = district ? barrios.filter((bb) => bb.district === district) : barrios;
    const gold = gps + bScope.filter((bb) => blvl(bb) === 2).length;   // lugares y barrios confirmados con GPS, como en el Diario
    const stats = [[vis, L.visited, CORAL], [gold, L.gps, GOLD], third];
    const cw = (W - 160) / 3, sy = H - (format === 'story' ? 260 : 110);
    stats.forEach(([n, label, col], i) => {
      const sx = 80 + i * cw;
      x.fillStyle = col; x.font = `700 60px ${DISPLAY}`; x.fillText(String(n), sx, sy);
      x.fillStyle = MUTED; x.font = `500 26px ${FONT}`; x.fillText(label, sx, sy + 40);
    });
    // Invitación: texto y enlace para que quien lo vea se una (solo en historia, donde hay sitio)
    if (format === 'story' && L.join) {
      const host = MP_CITY.site.replace(/^https?:\/\/(www\.)?/, ''), fy = H - 76;
      x.textAlign = 'center';
      x.fillStyle = INK; x.font = `600 34px ${DISPLAY}`; x.fillText(L.join, W / 2, fy - 8);
      x.fillStyle = CORAL; x.font = `700 32px ${DISPLAY}`; x.fillText(host + '  →', W / 2, fy + 38);
      x.textAlign = 'left';
    }
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function share(opts) {
    const blob = await render(opts);
    const name = `${MP_CITY.id}-passport-${opts.district ? opts.district.id : MP_CITY.id}-${opts.format || 'post'}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      const text = opts.L?.join ? `${opts.L.join}: ${MP_CITY.site}/?utm_source=share` : undefined;   // texto con enlace para unirse (sin título: iOS muestra la miniatura)
      try { await navigator.share({ files: [file], text }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  }

  return { render, share };
})();
