import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n, LangSwitch } from '../i18n/I18nContext.jsx';
import { mapAuthError } from '../services/firebase.js';
import '../styles/auth.css';

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export default function AuthPage() {
  const { t, lang } = useI18n();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!email) return setErr(t('errEmailRequired'));
    if (!validEmail(email)) return setErr(t('errInvalidEmail'));
    if (password.length < 6) return setErr(t('errPasswordMin'));
    if (mode === 'signup' && password !== confirm) return setErr(t('errPasswordMatch'));

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      navigate('/loading', { replace: true });
    } catch (e) {
      console.error('Auth error:', e);
      const m = mapAuthError(e);
      setErr(m[lang] || m.nb);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="auth-page">
      <LangSwitch />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card__logo">
          <div className="auth-card__logo-mark" aria-hidden="true">G</div>
          <div>
            <h1 id="auth-title">{t('appName')}</h1>
            <p className="lead">{t('tagline')}</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label={t('appName')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => { setMode('login'); setErr(null); }}
          >{t('tabLogin')}</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => { setMode('signup'); setErr(null); }}
          >{t('tabSignup')}</button>
        </div>

        {err && (
          <div className="alert alert--error" role="alert">{err}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="name">{t('name')}</label>
              <input
                id="name" name="name" type="text" autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password" name="password" type="password" required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="confirm">{t('confirmPassword')}</label>
              <input
                id="confirm" name="confirm" type="password" required
                autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          <button type="submit" className="btn" disabled={busy}>
            {busy
              ? (mode === 'signup' ? t('creatingAccount') : t('loggingIn'))
              : (mode === 'signup' ? t('signupBtn') : t('loginBtn'))}
          </button>
        </form>

        <p className="auth-footer">{t('privacy')}</p>
      </section>
    </main>
  );
}
