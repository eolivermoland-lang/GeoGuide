import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext(null);
const STORAGE_KEY = 'geoguide.lang';

function detectInitialLang() {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) return saved;
  const nav = typeof navigator !== 'undefined' && navigator.language;
  if (nav && nav.toLowerCase().startsWith('en')) return 'en';
  return 'nb';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'nb';
  }, [lang]);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.nb[key] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="Velg språk / Choose language">
      <button
        type="button"
        aria-pressed={lang === 'nb'}
        onClick={() => setLang('nb')}
      >NO</button>
      <button
        type="button"
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >EN</button>
    </div>
  );
}
