/* Tilleggsdata for et POI: bilde fra Wikipedia, parset åpningstider. */

/* Henter et thumbnail fra Wikipedia.
 * OSM-tag "wikipedia" har formatet "lang:Sidetittel", f.eks. "no:Oslo S".
 * OSM-tag "wikidata" er en Q-ID, f.eks. "Q123456".
 */
export async function fetchPlaceImage(poi, signal) {
  // Forsøk 1: direkte image-URL fra OSM
  if (poi.image) {
    if (poi.image.startsWith('File:')) {
      return wikimediaFileUrl(poi.image);
    }
    if (/^https?:\/\//.test(poi.image)) return poi.image;
  }

  // Forsøk 2: Wikipedia-tag
  if (poi.wikipedia) {
    const [lang, ...titleParts] = poi.wikipedia.split(':');
    const title = titleParts.join(':');
    if (lang && title) {
      try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const json = await res.json();
          if (json.thumbnail?.source) return json.thumbnail.source;
          if (json.originalimage?.source) return json.originalimage.source;
        }
      } catch {}
    }
  }

  // Forsøk 3: Wikidata Q-ID → P18 (bilde-property)
  if (poi.wikidata) {
    try {
      const url = `https://www.wikidata.org/wiki/Special:EntityData/${poi.wikidata}.json`;
      const res = await fetch(url, { signal });
      if (res.ok) {
        const json = await res.json();
        const file = json.entities?.[poi.wikidata]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (file) return wikimediaFileUrl(`File:${file}`);
      }
    } catch {}
  }

  return null;
}

function wikimediaFileUrl(fileTag, width = 600) {
  const name = fileTag.replace(/^File:/, '').replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

/* Parser OSM opening_hours og gir tilbake { weekly, openNow, raw }.
 * Støtter de mest vanlige formatene. Komplekse uttrykk vises som rå tekst. */
const DAY_NAMES_NB = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MAP = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };

export function parseOpeningHours(raw, lang = 'nb') {
  if (!raw) return null;
  const dayNames = lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_NB;

  if (raw === '24/7') {
    return { raw, weekly: Array(7).fill('24/7'), openNow: true, simple: true };
  }

  const weekly = Array(7).fill(null);
  const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
  let parseSuccess = true;

  for (const part of parts) {
    // F.eks. "Mo-Fr 09:00-17:00" eller "Sa 10:00-14:00" eller "Mo,We,Fr 08:00-20:00"
    const m = part.match(/^([A-Za-z,\- ]+)\s+([\d:,\-]+)$/);
    if (!m) { parseSuccess = false; continue; }
    const [, daysSpec, timeSpec] = m;
    const days = expandDays(daysSpec);
    if (!days.length) { parseSuccess = false; continue; }
    for (const d of days) weekly[d] = timeSpec;
  }

  return {
    raw,
    weekly: weekly.map((v, i) => ({ day: dayNames[i], times: v })),
    openNow: isOpenNow(weekly),
    simple: parseSuccess
  };
}

function expandDays(spec) {
  const out = new Set();
  for (const seg of spec.split(',')) {
    const range = seg.trim().match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!range) return [];
    const start = DAY_MAP[range[1]];
    const end = range[2] != null ? DAY_MAP[range[2]] : start;
    if (end >= start) for (let d = start; d <= end; d++) out.add(d);
    else { for (let d = start; d <= 6; d++) out.add(d); for (let d = 0; d <= end; d++) out.add(d); }
  }
  return [...out];
}

function isOpenNow(weekly) {
  const now = new Date();
  const day = now.getDay();
  const times = weekly[day];
  if (!times) return false;
  if (times === '24/7') return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const range of times.split(',')) {
    const m = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (minutes >= start && minutes < end) return true;
  }
  return false;
}

/* Haversine-avstand i meter mellom to lat/lng-par. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Format avstand pent: "320 m" / "1,4 km" / "12 km". */
export function formatDistance(meters, lang = 'nb') {
  if (meters == null || !isFinite(meters)) return null;
  const decimal = lang === 'en' ? '.' : ',';
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1).replace('.', decimal)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/* Returnerer URL til navigasjon i brukerens foretrukne karttjeneste. */
export function directionsUrl(lat, lng, name) {
  const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const q = name ? encodeURIComponent(name) : `${lat},${lng}`;
  if (isApple) {
    return `https://maps.apple.com/?daddr=${lat},${lng}&q=${q}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${q}`;
}

export function osmUrl(osmType, osmId) {
  if (!osmType || !osmId) return null;
  return `https://www.openstreetmap.org/${osmType}/${osmId}`;
}
