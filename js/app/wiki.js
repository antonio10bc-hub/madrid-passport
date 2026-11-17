// Wikipedia desde el navegador: foto/descripción que falten en data.js y descripción en inglés (wiki_en).
import { lang } from './i18n.js';

export const wikiSummary = async (title, host = 'es') => {
  const r = await fetch(`https://${host}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!r.ok) throw new Error('wiki ' + r.status);
  return r.json();
};
const cached = async (key, title, host) => {
  try { const s = JSON.parse(localStorage.getItem(key)); if (s) return s; } catch {}
  const w = await wikiSummary(title, host);
  if (w.type === 'disambiguation') return null;
  const s = { img: w.thumbnail?.source, desc: w.extract, url: w.content_urls?.mobile?.page };
  try { localStorage.setItem(key, JSON.stringify(s)); } catch {}
  return s;
};

// Devuelve true si ha completado algo (para volver a pintar la ficha)
export async function enrich(p) {
  let changed = false;
  if (!(p.desc && p.img) && p.wiki && !p._tried) {
    p._tried = true;
    try {
      const s = await cached('mp.wiki.' + p.id, p.wiki, 'es');
      if (s) { p.img ||= s.img; p.desc ||= s.desc; p.url ||= s.url; changed = true; }
    } catch {}
  }
  if (lang === 'en' && p.wiki_en && !p.desc_en && !p._triedEn) {
    p._triedEn = true;
    try {
      const s = await cached('mp.wiki.en.' + p.id, p.wiki_en, 'en');
      if (s?.desc) { p.desc_en = s.desc; p.url_en = s.url; p.img ||= s.img; changed = true; }
    } catch {}
  }
  return changed;
}
