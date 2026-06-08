/* Kartverket leverer åpne WMTS-tjenester for Norge.
 * "topo" er standard topografisk kart.
 * Tjenesten er gratis og krever ingen nøkkel. */

export const KARTVERKET_TILE_URL =
  'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png';

export const KARTVERKET_ATTRIBUTION =
  '<a href="https://www.kartverket.no/" target="_blank" rel="noopener">© Kartverket</a>';

/* Prefetcher en enkelt tile for å varme opp DNS + tile-cache. */
export function prefetchKartverket() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    // Tile for hele Norge ved zoom 5 (raskt nok)
    img.src = 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/5/9/17.png';
  });
}
