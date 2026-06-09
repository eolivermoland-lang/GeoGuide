import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { CATEGORIES } from '../services/overpass.js';
import { CategoryIcon } from '../icons.jsx';
import { searchPlace } from '../services/nominatim.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useMapData } from '../context/MapDataContext.jsx';

export default function Sidebar({
  open,
  onClose,
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
      aria-hidden={!open ? undefined : undefined}
    >
      <div className="sidebar__header">
        <strong className="sidebar__title">{t('appName')}</strong>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label={t('closeMenu')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

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
        className="btn-locate"
        onClick={handleUseMyLocation}
        disabled={locating}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {locating ? t('locating') : t('useMyLocation')}
      </button>

      {results.length > 0 && (
        <ul className="result-list" aria-label={t('search')}>
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="result-btn"
                onClick={() => { onPickResult(r); setResults([]); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                     strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="categories">
        <h2>{t('categories')}</h2>
        <div className="category-grid">
          {Object.keys(CATEGORIES).map((cat) => {
            const def = CATEGORIES[cat];
            const pois = poisByCategory[cat];
            const isActive = activeCategory === cat;
            const isLoading = loadingPois && isActive;
            const count = Array.isArray(pois) ? pois.length : null;
            return (
              <button
                key={cat}
                type="button"
                className="category-tile"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                style={{ '--cat-color': def.color }}
              >
                <span className="category-tile__icon">
                  <CategoryIcon name={cat} size={26} />
                </span>
                <span className="category-tile__label">{t(`cat_${cat}`)}</span>
                {isLoading && <span className="category-tile__badge">…</span>}
                {!isLoading && isActive && count != null && (
                  <span className="category-tile__badge">{count}</span>
                )}
              </button>
            );
          })}
        </div>
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
