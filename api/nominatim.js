/* Vercel serverless function: proxy Nominatim med User-Agent.
 * Nettleseren kan ikke sette User-Agent, og Nominatim krever det per policy. */

export default async function handler(req, res) {
  const params = new URLSearchParams(req.query).toString();
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'GeoGuide/0.1 (https://github.com)',
        'Accept': 'application/json',
        'Accept-Language': 'no,en'
      }
    });
    const text = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
