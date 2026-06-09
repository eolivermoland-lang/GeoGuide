import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { prefetchKartverket } from '../services/kartverket.js';
import { useMapData } from '../context/MapDataContext.jsx';
import '../styles/loading.css';

export default function LoadingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const { setPosition, setGeoStatus, setGeoError, setLoadingDone } = useMapData();
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(t('loadingGeo'));
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // 1) Posisjonstillatelse
      setStep(t('loadingGeo'));
      setProgress(20);
      const { status, position, error } = await geo.request();
      setGeoStatus(status);
      setPosition(position);
      setGeoError(error || null);
      setProgress(60);

      // 2) Prefetch kart-tile (med maks 2s timeout — ikke kritisk)
      setStep(t('loadingMap'));
      await Promise.race([
        prefetchKartverket(),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      setProgress(100);
      setStep(t('loadingDone'));
      setLoadingDone(true);

      // Kort pause så brukeren ser 100%
      setTimeout(() => navigate('/app', { replace: true }), 300);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main id="main-content" className="loading-page">
      <div className="loading-card">
        <h1>{t('loadingTitle')}</h1>
        <p>{t('loadingSubtitle')}</p>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}
          aria-label={t('loadingTitle')}
        >
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress__status" aria-live="polite">{step}</span>
      </div>
    </main>
  );
}
