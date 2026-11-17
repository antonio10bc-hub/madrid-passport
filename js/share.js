// Genera una imagen (PNG 1080×1350) con los distritos de Madrid y los lugares visitados/confirmados.
window.MPShare = (() => {
  const W = 1080, H = 1350, RED = '#D6202C', GOLD = '#C9A227', INK = '#111114';
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif';
  const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

  async function render({ districts, places, lvl }) {
    const barrios = await (await fetch('data/barrios.geojson')).json().catch(() => null);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);

    // Proyección equirectangular corregida por latitud, encajada en el área del mapa
    let b = [180, 90, -180, -90];
    districts.forEach((d) => { b = [Math.min(b[0], d.bbox[0]), Math.min(b[1], d.bbox[1]), Math.max(b[2], d.bbox[2]), Math.max(b[3], d.bbox[3])]; });
    const k = Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180);
    const area = { x: 80, y: 250, w: W - 160, h: H - 250 - 200 };
    const s = Math.min(area.w / ((b[2] - b[0]) * k), area.h / (b[3] - b[1]));
    const ox = area.x + (area.w - (b[2] - b[0]) * k * s) / 2, oy = area.y + (area.h - (b[3] - b[1]) * s) / 2;
    const P = ([lng, lat]) => [ox + (lng - b[0]) * k * s, oy + (b[3] - lat) * s];
    const path = (g) => {
      x.beginPath();
      polys(g).forEach((poly) => poly.forEach((ring) => ring.forEach((pt, i) => { const [px, py] = P(pt); i ? x.lineTo(px, py) : x.moveTo(px, py); })));
    };

    // Distritos: relleno según progreso
    districts.forEach((d) => {
      const done = d.places.filter((p) => lvl(p.id) > 0).length;
      const r = d.places.length ? done / d.places.length : 0;
      path(d.feature.geometry);
      x.fillStyle = `rgba(214,32,44,${0.05 + 0.35 * r})`; x.fill('evenodd');
    });
    if (barrios) {
      x.strokeStyle = 'rgba(214,32,44,.18)'; x.lineWidth = 1;
      barrios.features.forEach((f) => { path(f.geometry); x.stroke(); });
    }
    x.strokeStyle = '#B8B8C0'; x.lineWidth = 2; x.lineJoin = 'round';
    districts.forEach((d) => { path(d.feature.geometry); x.stroke(); });

    // Puntos: visitados (rojo) y confirmados GPS (dorado, encima)
    const dot = (p, col, r) => { const [px, py] = P([p.coords[1], p.coords[0]]); x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke(); };
    places.filter((p) => lvl(p.id) === 1).forEach((p) => dot(p, RED, 10));
    places.filter((p) => lvl(p.id) === 2).forEach((p) => dot(p, GOLD, 12));

    // Textos
    const vis = places.filter((p) => lvl(p.id) > 0).length, gps = places.filter((p) => lvl(p.id) === 2).length;
    const dComplete = districts.filter((d) => d.places.length && d.places.every((p) => lvl(p.id) > 0)).length;
    x.textBaseline = 'alphabetic';
    x.fillStyle = RED; x.font = `600 30px ${FONT}`; x.fillText('MADRID PASSPORT', 80, 120);
    x.fillStyle = INK; x.font = `700 72px ${FONT}`; x.fillText('Mi Madrid', 80, 200);
    const pct = Math.round((vis / places.length) * 100);
    x.textAlign = 'right'; x.font = `700 72px ${FONT}`; x.fillStyle = RED; x.fillText(pct + '%', W - 80, 200); x.textAlign = 'left';

    const stats = [[vis, 'visitados', RED], [gps, 'confirmados GPS', GOLD], [dComplete, 'distritos completos', INK]];
    const cw = (W - 160) / 3;
    stats.forEach(([n, label, col], i) => {
      const sx = 80 + i * cw;
      x.fillStyle = col; x.font = `700 56px ${FONT}`; x.fillText(String(n), sx, H - 110);
      x.fillStyle = '#8A8A93'; x.font = `500 26px ${FONT}`; x.fillText(label, sx, H - 70);
    });
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function share(data) {
    const blob = await render(data);
    const file = new File([blob], 'mi-madrid-passport.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Mi Madrid Passport' }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  }

  return { render, share };
})();
