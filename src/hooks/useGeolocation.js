import { useCallback, useRef, useState } from 'react';

const OSLO = { lat: 59.9139, lng: 10.7522 };

export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | prompting | granted | denied | unavailable | timeout
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const watch = useCallback((onUpdate) => {
    if (!('geolocation' in navigator)) return () => {};
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        setPosition(p);
        onUpdate?.(p);
      },
      (err) => {
        console.warn('Geolocation watch error:', err.code, err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const request = useCallback(() => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const r = { status: 'unavailable', position: OSLO, error: 'Geolocation API ikke støttet i denne nettleseren.' };
        setStatus('unavailable'); setPosition(OSLO); setError(r.error);
        resolve(r); return;
      }
      setStatus('prompting');
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setPosition(p); setStatus('granted');
          resolve({ status: 'granted', position: p });
        },
        (err) => {
          let s = 'denied';
          let msg = err.message || 'Ukjent feil';
          if (err.code === 1) { s = 'denied'; msg = 'Posisjon avvist. Tillat posisjon i nettleseren (og i Systemvalg på Mac → Sikkerhet → Posisjonstjenester).'; }
          else if (err.code === 2) { s = 'unavailable'; msg = 'Posisjon utilgjengelig.'; }
          else if (err.code === 3) { s = 'timeout'; msg = 'Posisjonsforespørsel tok for lang tid.'; }
          console.warn('Geolocation error:', err.code, msg);
          setError(msg); setStatus(s); setPosition(OSLO);
          resolve({ status: s, position: OSLO, error: msg });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  }, []);

  return { position, status, error, request, watch, fallback: OSLO };
}
