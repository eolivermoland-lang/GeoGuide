/* Linje-baserte SVG-ikoner. Brukes både i React (CategoryIcon) og
 * i Leaflet divIcon (categoryIconHtml). Stilen er enkel og monokrom
 * så den aldri ser ut som emojis. */

const PATHS = {
  toilets:
    '<path d="M7 4v4M7 11v9M17 4v4M17 13v7M17 13h-3l1.5-5a1.5 1.5 0 1 1 3 0L20 13zM4 8h6M14 8h6"/>',
  restaurants:
    '<path d="M6 3v8M9 3v8M7.5 3v18M14 3c-1.5 2-2 4-2 6s.5 4 2 4v8"/>',
  cafes:
    '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 10h2a3 3 0 0 1 0 6h-2M7 2c.5 1 .5 2 0 3M11 2c.5 1 .5 2 0 3"/>',
  pharmacies:
    '<path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="9"/>',
  hospitals:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 9v6M9 12h6"/>',
  gyms:
    '<path d="M3 9v6M21 9v6M6 6v12M18 6v12M6 12h12"/>',
  supermarkets:
    '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
  gas_stations:
    '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V7l-3-3"/>',
  parking:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  atms:
    '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h2M7 14h6M15 14h2"/>',
  hotels:
    '<path d="M3 20V8M3 14h18v6M7 11a2 2 0 1 0 0-.001M12 11h9V8a2 2 0 0 0-2-2h-7"/>',
  parks:
    '<path d="M12 14v7M8 14h8M6 14l6-10 6 10z"/>',
  bus_stops:
    '<rect x="5" y="3" width="14" height="14" rx="2"/><path d="M5 10h14M8 17v3M16 17v3"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
  schools:
    '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v6c0 1.5 2.5 3 5 3s5-1.5 5-3v-6"/>',
  default:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
};

/* React-komponent for sidebar/UI */
export function CategoryIcon({ name, size = 22, color = 'currentColor', strokeWidth = 2 }) {
  const inner = PATHS[name] || PATHS.default;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/* HTML-string til Leaflet divIcon */
export function markerIconHtml(name, bgColor) {
  const inner = PATHS[name] || PATHS.default;
  return `
    <div class="marker-pin" style="--pin-bg:${bgColor}">
      <div class="marker-pin__body">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="#fff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round">${inner}</svg>
      </div>
    </div>`;
}

/* Pil-markør for brukerens posisjon. heading i grader (0 = nord) */
export function userArrowHtml(heading) {
  const rot = (typeof heading === 'number' && !isNaN(heading)) ? heading : null;
  const arrow = rot != null
    ? `<div class="user-arrow__cone" style="transform:rotate(${rot}deg)"></div>`
    : '';
  return `
    <div class="user-arrow">
      ${arrow}
      <div class="user-arrow__dot"></div>
    </div>`;
}
