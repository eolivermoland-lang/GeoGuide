import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { fetchPlaceImage, parseOpeningHours, directionsUrl, osmUrl, distanceMeters, formatDistance } from '../services/placeDetails.js';
import { CATEGORIES } from '../services/overpass.js';

export default function PlaceDetails({ poi, category, onClose, userPosition }) {
  const { t, lang } = useI18n();
  const [imgUrl, setImgUrl] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!poi) return;
    setImgUrl(null);
    setImgFailed(false);
    const controller = new AbortController();
    fetchPlaceImage(poi, controller.signal)
      .then((url) => { if (url) setImgUrl(url); })
      .catch(() => {});
    // Flytt fokus til lukke-knappen så Esc + Enter funker rett vekk
    setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => controller.abort();
  }, [poi]);

  // Escape lukker panelet
  useEffect(() => {
    if (!poi) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [poi, onClose]);

  if (!poi) return null;
  const def = CATEGORIES[category];
  const hours = parseOpeningHours(poi.opening, lang);
  const dirUrl = directionsUrl(poi.lat, poi.lng, poi.name);
  const osm = osmUrl(poi.osmType, poi.osmId);
  const realDist = userPosition
    ? distanceMeters(userPosition.lat, userPosition.lng, poi.lat, poi.lng)
    : null;
  const distLabel = formatDistance(realDist, lang);

  return (
    <>
      {/* Backdrop kun synlig på mobil; klikk for å lukke */}
      <div className="place-details__backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="place-details" role="dialog" aria-modal="false" aria-labelledby="place-title">
        <div className="place-details__drag-handle" aria-hidden="true" />
        <header className="place-details__header">
          <span className="place-details__category">{t(`cat_${category}`)}</span>
          <button
            ref={closeBtnRef}
            type="button"
            className="place-details__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <span aria-hidden="true" className="place-details__close-x">×</span>
            <span className="place-details__close-text">{t('close')}</span>
          </button>
        </header>

        <div className="place-details__hero" style={{ background: def?.color || '#0062ba' }}>
        {imgUrl && !imgFailed ? (
          <img
            src={imgUrl}
            alt=""
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="place-details__hero-icon" aria-hidden="true">{def?.icon || '📍'}</div>
        )}
      </div>

      <div className="place-details__body">
        <h2 id="place-title">{poi.name || t(`cat_${category}`)}</h2>

        {poi.brand && poi.brand !== poi.name && (
          <p className="place-details__brand">{poi.brand}</p>
        )}

        {poi.description && <p className="place-details__desc">{poi.description}</p>}

        {poi.cuisine && (
          <div className="place-details__pills">
            {poi.cuisine.split(';').map((c) => (
              <span key={c} className="pill">{c.trim()}</span>
            ))}
          </div>
        )}

        <a href={dirUrl} target="_blank" rel="noopener" className="btn place-details__primary">
          <span aria-hidden="true">🧭</span>
          {t('getDirections')}
        </a>

        <dl className="place-details__list">
          {(poi.address || distLabel) && (
            <Row icon="📍" label={t('address')}>
              {poi.address && <span>{poi.address}</span>}
              {distLabel && (
                <span className="place-details__sub">{distLabel} {t('away')}</span>
              )}
            </Row>
          )}

          {hours && (
            <Row icon="🕒" label={t('openingHours')}>
              {hours.simple ? (
                <div className="hours-grid">
                  {hours.weekly.map((d) => (
                    <div key={d.day} className="hours-row">
                      <span className="hours-day">{d.day}</span>
                      <span className="hours-time">{d.times || t('closed')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span>{hours.raw}</span>
              )}
              {hours.openNow !== undefined && (
                <span className={`status-pill ${hours.openNow ? 'status-pill--open' : 'status-pill--closed'}`}>
                  {hours.openNow ? t('openNow') : t('closedNow')}
                </span>
              )}
            </Row>
          )}

          {poi.phone && (
            <Row icon="📞" label={t('phone')}>
              <a href={`tel:${poi.phone}`}>{poi.phone}</a>
            </Row>
          )}

          {poi.website && (
            <Row icon="🌐" label={t('website')}>
              <a href={poi.website} target="_blank" rel="noopener">
                {poi.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </Row>
          )}

          {poi.email && (
            <Row icon="✉️" label={t('email')}>
              <a href={`mailto:${poi.email}`}>{poi.email}</a>
            </Row>
          )}

          {poi.wheelchair && (
            <Row icon="♿" label={t('wheelchair')}>
              {wheelchairLabel(poi.wheelchair, t)}
            </Row>
          )}

          {poi.fee && (
            <Row icon="💳" label={t('fee')}>
              {poi.fee === 'yes' ? t('feeYes') : poi.fee === 'no' ? t('feeNo') : poi.fee}
            </Row>
          )}
        </dl>

        {osm && (
          <a href={osm} target="_blank" rel="noopener" className="place-details__osm-link">
            {t('viewOnOsm')} ↗
          </a>
        )}
      </div>
      </aside>
    </>
  );
}

function Row({ icon, label, children }) {
  return (
    <div className="place-row">
      <dt><span aria-hidden="true" className="place-row__icon">{icon}</span> {label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function wheelchairLabel(v, t) {
  if (v === 'yes') return t('wheelchairYes');
  if (v === 'no') return t('wheelchairNo');
  if (v === 'limited') return t('wheelchairLimited');
  return v;
}
