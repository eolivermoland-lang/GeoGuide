import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { KARTVERKET_TILE_URL, KARTVERKET_ATTRIBUTION } from '../services/kartverket.js';
import { CATEGORIES } from '../services/overpass.js';
import { markerIconHtml, userArrowHtml } from '../icons.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function makeCategoryIcon(name, color) {
  return L.divIcon({
    html: markerIconHtml(name, color),
    className: 'marker-pin-wrap',
    iconSize: [36, 44],
    iconAnchor: [18, 40],
    popupAnchor: [0, -34]
  });
}

function makeUserIcon(heading) {
  return L.divIcon({
    html: userArrowHtml(heading),
    className: 'user-arrow-wrap',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center, map]);
  return null;
}

/* Følger brukerens posisjon. Slår seg av om brukeren drar kartet manuelt. */
function FollowUser({ userPosition, follow, onUserDrag }) {
  const map = useMap();
  useMapEvents({
    dragstart() { onUserDrag?.(); }
  });
  useEffect(() => {
    if (!follow || !userPosition) return;
    map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 0.5 });
  }, [follow, userPosition?.lat, userPosition?.lng, map]);
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

export default function MapView({ center, userPosition, pois, activeCategory, focusTarget, onViewChange, showSearchHere, onSearchHere, loadingPois, onSelectPoi, followUser, onUserDrag, onRecenter }) {
  const { t } = useI18n();
  const categoryDef = activeCategory ? CATEGORIES[activeCategory] : null;
  const icon = useMemo(
    () => categoryDef ? makeCategoryIcon(activeCategory, categoryDef.color) : makeCategoryIcon('default', '#444'),
    [categoryDef, activeCategory]
  );
  const userIcon = useMemo(
    () => makeUserIcon(userPosition?.heading),
    [userPosition?.heading]
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
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={userIcon}
            keyboard={false}
            interactive={false}
          />
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
        <FollowUser userPosition={userPosition} follow={followUser} onUserDrag={onUserDrag} />
        <ViewReporter onChange={onViewChange} />
      </MapContainer>
      {userPosition && (
        <button
          type="button"
          className={`recenter-btn${followUser ? ' recenter-btn--active' : ''}`}
          onClick={onRecenter}
          aria-pressed={followUser}
          aria-label={t('recenter')}
          title={t('recenter')}
        >
          <span aria-hidden="true">📍</span>
        </button>
      )}
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
