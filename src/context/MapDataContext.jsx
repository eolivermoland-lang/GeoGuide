import { createContext, useContext, useMemo, useState } from 'react';

const MapDataContext = createContext(null);

export function MapDataProvider({ children }) {
  const [position, setPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoError, setGeoError] = useState(null);
  const [poisByCategory, setPoisByCategory] = useState({});
  const [loadingDone, setLoadingDone] = useState(false);

  const value = useMemo(() => ({
    position, setPosition,
    geoStatus, setGeoStatus,
    geoError, setGeoError,
    poisByCategory, setPoisByCategory,
    loadingDone, setLoadingDone
  }), [position, geoStatus, geoError, poisByCategory, loadingDone]);

  return <MapDataContext.Provider value={value}>{children}</MapDataContext.Provider>;
}

export function useMapData() {
  const ctx = useContext(MapDataContext);
  if (!ctx) throw new Error('useMapData must be used within MapDataProvider');
  return ctx;
}
