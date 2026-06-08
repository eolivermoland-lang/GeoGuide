/* Adresse-/stedssøk i Norge via Nominatim.
 * Bruker /api/nominatim som proxies både i dev (Vite) og prod (Vercel). */
const ENDPOINT = '/api/nominatim';

export async function searchPlace(query, signal) {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    countrycodes: 'no',
    addressdetails: '1'
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal });
  if (!res.ok) throw new Error('Nominatim HTTP ' + res.status);
  const json = await res.json();
  return json.map((r) => ({
    id: r.place_id,
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon)
  }));
}
