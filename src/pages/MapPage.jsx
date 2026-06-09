import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import MapView from '../components/MapView.jsx';
import PlaceDetails from '../components/PlaceDetails.jsx';
import { useI18n, LangSwitch } from '../i18n/I18nContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMapData } from '../context/MapDataContext.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { fetchPois } from '../services/overpass.js';
import '../styles/map.css';
import '../styles/details.css';

const FALLBACK = { lat: 59.9139, lng: 10.7522 };

export default function MapPage() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { position, geoStatus, poisByCategory, setPoisByCategory, setPosition } = useMapData();
  const geo = useGeolocation();
  const center = position || FALLBACK;
  const [activeCategory, setActiveCategory] = useState(null);
  const [followUser, setFollowUser] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);
  const [view, setView] = useState(null);
  const [lastFetchedView, setLastFetchedView] = useState(null);
  const [loadingPois, setLoadingPois] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const abortRef = useRef(null);

  // Start kontinuerlig posisjonsoppdatering så pinpointeren følger brukeren
  useEffect(() => {
    const stop = geo.watch((p) => setPosition(p));
    return stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(async (category, currentView) => {
    if (!currentView || !category) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingPois(true);
    setPoiError(null);
    try {
      const pois = await fetchPois(category, currentView.lat, currentView.lng, currentView.radius, controller.signal);
      setPoisByCategory((prev) => ({ ...prev, [category]: pois }));
      setLastFetchedView({ lat: currentView.lat, lng: currentView.lng, radius: currentView.radius, category });
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[GeoGuide] POI fetch failed:', e);
        setPoiError(e.message || 'fetch failed');
      }
    } finally {
      setLoadingPois(false);
    }
  }, [setPoisByCategory]);

  // Hent automatisk når brukeren KLIKKER en kategori (ikke ved pan/zoom)
  useEffect(() => {
    if (activeCategory && view) {
      runSearch(activeCategory, view);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Vis "Søk i dette området"-knapp når brukeren har flyttet siden siste søk
  const movedSinceFetch = activeCategory && view && lastFetchedView && (
    lastFetchedView.category !== activeCategory ||
    Math.abs(view.lat - lastFetchedView.lat) > 0.005 ||
    Math.abs(view.lng - lastFetchedView.lng) > 0.005 ||
    Math.abs(view.radius - lastFetchedView.radius) > 500
  );

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const activePois = activeCategory ? poisByCategory[activeCategory] : null;

  return (
    <div className="app-layout">
      <header className="app-header">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <span aria-hidden="true">☰</span>
          <span className="sr-only">{sidebarOpen ? t('closeMenu') : t('openMenu')}</span>
        </button>
        <h1>
          <span className="app-header__logo" aria-hidden="true">G</span>
          {t('appName')}
        </h1>
        <div className="app-header__spacer" />
        <LangSwitch />
        {user && (
          <span className="app-header__user">
            {user.displayName || user.email}
          </span>
        )}
        <button type="button" className="app-header__logout" onClick={handleLogout}>
          {t('logout')}
        </button>
      </header>
      <div className="app-body">
        <Sidebar
          open={sidebarOpen}
          poisByCategory={poisByCategory}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onPickResult={(r) => {
            setFocusTarget({ lat: r.lat, lng: r.lng });
            setSidebarOpen(false);
          }}
          loadingPois={loadingPois}
          poiError={poiError}
        />
        <main id="main-content">
          <MapView
            center={center}
            userPosition={position}
            pois={activePois}
            activeCategory={activeCategory}
            focusTarget={focusTarget}
            onViewChange={setView}
            showSearchHere={movedSinceFetch}
            onSearchHere={() => runSearch(activeCategory, view)}
            loadingPois={loadingPois}
            onSelectPoi={setSelectedPoi}
            followUser={followUser}
            onUserDrag={() => setFollowUser(false)}
            onRecenter={() => setFollowUser(true)}
          />
          {selectedPoi && (
            <PlaceDetails
              poi={selectedPoi}
              category={activeCategory}
              onClose={() => setSelectedPoi(null)}
              userPosition={position}
            />
          )}
        </main>
      </div>
    </div>
  );
}
