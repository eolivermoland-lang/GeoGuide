/* POI-tjeneste med to kilder:
 * 1) Photon (komoot) — gratis, ingen nøkkel, CORS. Bra for navn-rike kategorier.
 * 2) Overpass via Vite-proxy — bedre for navnløse kategorier (toaletter, gym).
 * Vi prøver Photon først, og faller tilbake til Overpass hvis Photon ga lite.
 */

const PHOTON_URL = 'https://photon.komoot.io/api';
// /api/overpass håndteres av Vite-proxy i dev og Vercel-funksjon i prod
const OVERPASS_ENDPOINTS = ['/api/overpass'];

export const CATEGORIES = {
  toilets:     { tag: 'amenity:toilets',         q: 'toalett',    icon: '🚻', color: '#2a7ab8', preferOverpass: true },
  restaurants: { tag: 'amenity:restaurant',      q: 'restaurant', icon: '🍽️', color: '#c46a18' },
  pharmacies:  { tag: 'amenity:pharmacy',        q: 'apotek',     icon: '⚕️', color: '#117a3d' },
  gyms:        { tag: 'leisure:fitness_centre',  q: 'gym',        icon: '🏋️', color: '#7a1aa1', preferOverpass: true }
};

const cache = new Map();

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fromPhoton(category, lat, lng, radiusMeters, signal) {
  const def = CATEGORIES[category];
  const params = new URLSearchParams({
    q: def.q,
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    limit: '50',
    osm_tag: def.tag,
    lang: 'default'
  });
  const url = `${PHOTON_URL}?${params}`;
  console.log('[photon] →', category);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Photon HTTP ' + res.status);
  const json = await res.json();
  return (json.features || [])
    .map((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords) return null;
      const [ln, la] = coords;
      const props = f.properties || {};
      const dist = distanceMeters(lat, lng, la, ln);
      if (dist > radiusMeters * 1.3) return null;
      return {
        id: `photon-${props.osm_type || 'n'}-${props.osm_id}`,
        lat: la, lng: ln, dist,
        name: props.name || null,
        address: [props.street, props.housenumber, props.city || props.town || props.village]
          .filter(Boolean).join(' ') || null,
        opening: null, phone: null
      };
    })
    .filter(Boolean);
}

async function fromOverpass(category, lat, lng, radiusMeters, signal) {
  const def = CATEGORIES[category];
  const filter = def.tag.replace(':', '=');
  const r = Math.round(radiusMeters);
  const query = `[out:json][timeout:25];nwr[${filter}](around:${r},${lat.toFixed(5)},${lng.toFixed(5)});out center 100;`;
  const data = encodeURIComponent(query);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log('[overpass] →', endpoint, category);
      const res = await fetch(`${endpoint}?data=${data}`, { signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const els = json.elements || [];
      const pois = els.map((el) => {
        const la = el.lat ?? el.center?.lat;
        const ln = el.lon ?? el.center?.lon;
        if (la == null || ln == null) return null;
        const tags = el.tags || {};
        return {
          id: `osm-${el.type}-${el.id}`,
          osmType: el.type, osmId: el.id,
          lat: la, lng: ln,
          dist: distanceMeters(lat, lng, la, ln),
          name: tags.name || tags['name:no'] || tags['name:nb'] || tags.brand || null,
          address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:postcode'], tags['addr:city']]
            .filter(Boolean).join(' ') || null,
          opening: tags.opening_hours || null,
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || tags.url || null,
          email: tags.email || tags['contact:email'] || null,
          cuisine: tags.cuisine || null,
          wheelchair: tags.wheelchair || null,
          fee: tags.fee || null,
          brand: tags.brand || null,
          image: tags.image || null,
          wikipedia: tags.wikipedia || null,
          wikidata: tags.wikidata || null,
          description: tags.description || tags['description:no'] || tags['description:nb'] || null,
          tags
        };
      }).filter(Boolean);
      console.log('[overpass] ✓', pois.length, category, 'fra', endpoint);
      if (pois.length > 0) return pois;
    } catch (e) {
      if (signal?.aborted) throw e;
      console.warn('[overpass] mirror feilet:', endpoint, e.message);
    }
  }
  return [];
}

function merge(a, b) {
  const seen = new Set();
  const out = [];
  for (const p of [...a, ...b]) {
    // Slå sammen duplikater basert på avrundet posisjon
    const key = `${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.sort((x, y) => x.dist - y.dist);
}

export async function fetchPois(category, lat, lng, radiusMeters = 1500, signal) {
  const def = CATEGORIES[category];
  if (!def) throw new Error('Unknown category: ' + category);
  const r = Math.round(radiusMeters);
  const cKey = `${category}:${lat.toFixed(3)}:${lng.toFixed(3)}:${r}`;
  if (cache.has(cKey)) return cache.get(cKey);

  let photonResults = [];
  let overpassResults = [];

  if (def.preferOverpass) {
    // Hent Overpass først for toaletter/gym (Photon finner ikke disse uten navn)
    overpassResults = await fromOverpass(category, lat, lng, radiusMeters, signal).catch(() => []);
    if (overpassResults.length < 5) {
      photonResults = await fromPhoton(category, lat, lng, radiusMeters, signal).catch(() => []);
    }
  } else {
    photonResults = await fromPhoton(category, lat, lng, radiusMeters, signal).catch(() => []);
    if (photonResults.length < 5) {
      overpassResults = await fromOverpass(category, lat, lng, radiusMeters, signal).catch(() => []);
    }
  }

  const combined = merge(photonResults, overpassResults);
  console.log('[pois] ✓', combined.length, category, '(photon:', photonResults.length, ', overpass:', overpassResults.length, ')');
  if (combined.length > 0) cache.set(cKey, combined);
  return combined;
}

export function clearPoiCache() { cache.clear(); }
