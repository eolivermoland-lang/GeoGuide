/* Vercel serverless function: proxy Overpass med automatisk mirror-fallback.
 * Brukes som backup for navnløse POI-kategorier som Photon ikke finner. */

const MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

export default async function handler(req, res) {
  const data = req.query.data;
  if (!data) {
    res.status(400).json({ error: 'missing data parameter' });
    return;
  }
  const qs = `data=${encodeURIComponent(data)}`;

  let lastError = null;
  for (const mirror of MIRRORS) {
    try {
      const r = await fetch(`${mirror}?${qs}`, {
        headers: {
          'User-Agent': 'GeoGuide/0.1 (https://github.com)',
          'Accept': 'application/json'
        }
      });
      if (!r.ok) {
        lastError = `${mirror} HTTP ${r.status}`;
        continue;
      }
      const text = await r.text();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
      res.status(200).send(text);
      return;
    } catch (e) {
      lastError = `${mirror} ${e.message}`;
    }
  }
  res.status(502).json({ error: 'all mirrors failed', detail: lastError });
}
