import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { CATEGORIES } from '../services/overpass.js';
import { searchPlace } from '../services/nominatim.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useMapData } from '../context/MapDataContext.jsx';

export default function Sidebar({
  open,
  poisByCategory,
  activeCategory,
  setActiveCategory,
  onPickResult,
  loadingPois,
  poiError
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const abortRef = useRef(null);
  const geo = useGeolocation();
  const { setPosition, setGeoStatus, setGeoError, geoStatus, geoError } = useMapData();

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const r = await searchPlace(query, controller.signal);
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleUseMyLocation() {
    setLocating(true);
    const { status, position, error } = await geo.request();
    setGeoStatus(status);
    setPosition(position);
    setGeoError(error || null);
    setLocating(false);
    if (status === 'granted') {
      onPickResult({ lat: position.lat, lng: position.lng });
    }
  }

  return (
    <aside
      className="sidebar"
      data-open={open ? 'true' : 'false'}
      aria-label={t('appName')}
    >
      <form className="search-form" role="search" onSubmit={handleSearch}>
        <label htmlFor="search-input" className="sr-only">{t('search')}</label>
        <input
          id="search-input"
          type="search"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" disabled={searching}>{t('search')}</button>
      </form>

      <button
        type="button"
        className="btn btn--secondary"
        onClick={handleUseMyLocation}
        disabled={locating}
      >
        <span aria-hidden="true">📍</span>
        {locating ? t('locating') : t('useMyLocation')}
      </button>

      {results.length > 0 && (
        <ul className="category-list" aria-label={t('search')}>
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="category-btn"
                onClick={() => { onPickResult(r); setResults([]); }}
              >
                <span className="category-btn__icon" aria-hidden="true">📍</span>
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h2>{t('categories')}</h2>
        <ul className="category-list">
          {Object.keys(CATEGORIES).map((cat) => {
            const def = CATEGORIES[cat];
            const pois = poisByCategory[cat];
            const isActive = activeCategory === cat;
            const isLoading = loadingPois && isActive;
            return (
              <li key={cat}>
                <button
                  type="button"
                  className="category-btn"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                >
                  <span className="category-btn__icon" aria-hidden="true">{def.icon}</span>
                  <span>{t(`cat_${cat}`)}</span>
                  <span className="category-btn__count">
                    {isLoading ? '…' : (isActive ? (Array.isArray(pois) ? pois.length : '–') : '')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {poiError && (
        <p className="geo-status geo-status--error" role="alert">
          {t('poiError')}
        </p>
      )}
      {activeCategory && !loadingPois && !poiError &&
        poisByCategory[activeCategory] && poisByCategory[activeCategory].length === 0 && (
        <p className="geo-status" role="status">{t('poiEmpty')}</p>
      )}
      {geoStatus && geoStatus !== 'granted' && geoStatus !== 'idle' && (
        <p className={`geo-status ${geoStatus === 'denied' ? 'geo-status--error' : ''}`} role="status">
          {geoError || (geoStatus === 'denied' ? t('geoDenied') : t('geoUnavailable'))}
        </p>
      )}
    </aside>
  );
}
