import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { KARTVERKET_TILE_URL, KARTVERKET_ATTRIBUTION } from '../services/kartverket.js';
import { CATEGORIES } from '../services/overpass.js';
import { useI18n } from '../i18n/I18nContext.jsx';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function makeCategoryIcon(color, emoji) {
  const html = `
    <div style="
      background:${color};
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:grid;place-items:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      border:2px solid #fff;
    ">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${emoji}</span>
    </div>`;
  return L.divIcon({
    html, className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28]
  });
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center, map]);
  return null;
}

/* Sender senterpunkt + radius (meter) til foreldre. Debounced. */
function ViewReporter({ onChange }) {
  const timer = useRef(null);
  const map = useMapEvents({
    moveend() { schedule(); },
    zoomend() { schedule(); }
  });
  function report() {
    const c = map.getCenter();
    const b = map.getBounds();
    const ne = b.getNorthEast();
    let radius = c.distanceTo(ne); // meter
    if (!isFinite(radius) || radius < 200) radius = 1500;
    if (radius > 30000) radius = 30000;
    console.log('[GeoGuide] view:', c.lat.toFixed(4), c.lng.toFixed(4), 'r=', Math.round(radius), 'm');
    onChange({ lat: c.lat, lng: c.lng, radius });
  }
  function schedule() {
    clearTimeout(timer.current);
    timer.current = setTimeout(report, 800);
  }
  useEffect(() => {
    setTimeout(report, 300);
    return () => clearTimeout(timer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function MapView({ center, userPosition, pois, activeCategory, focusTarget, onViewChange, showSearchHere, onSearchHere, loadingPois, onSelectPoi }) {
  const { t } = useI18n();
  const categoryDef = activeCategory ? CATEGORIES[activeCategory] : null;
  const icon = useMemo(
    () => categoryDef ? makeCategoryIcon(categoryDef.color, categoryDef.icon) : DefaultIcon,
    [categoryDef]
  );

  return (
    <div className="map-container">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        scrollWheelZoom
        zoomControl
        keyboard
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={KARTVERKET_TILE_URL}
          attribution={KARTVERKET_ATTRIBUTION}
          maxZoom={20}
        />
        {userPosition && (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={9}
            pathOptions={{ color: '#0062ba', fillColor: '#0062ba', fillOpacity: 0.85, weight: 3 }}
          >
            <Popup>{t('yourLocation')}</Popup>
          </CircleMarker>
        )}
        {pois && pois.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelectPoi?.(p) }}
          >
            <Tooltip direction="top" offset={[0, -30]} opacity={0.95}>
              {p.name || t(`cat_${activeCategory}`)}
            </Tooltip>
          </Marker>
        ))}
        <FlyTo center={focusTarget} />
        <ViewReporter onChange={onViewChange} />
      </MapContainer>
      {(showSearchHere || loadingPois) && activeCategory && (
        <button
          type="button"
          className="search-here-btn"
          onClick={onSearchHere}
          disabled={loadingPois}
        >
          <span aria-hidden="true">🔍</span>
          {loadingPois ? t('searching') : t('searchHere')}
        </button>
      )}
      <div className="attribution">{t('attributionMap')}</div>
    </div>
  );
}
