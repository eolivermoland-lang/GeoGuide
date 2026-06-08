import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { MapDataProvider, useMapData } from './context/MapDataContext.jsx';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const LoadingPage = lazy(() => import('./pages/LoadingPage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));

function RequireAuth({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RequireLoaded({ children }) {
  const { user, initializing } = useAuth();
  const { loadingDone } = useMapData();
  if (initializing) return null;
  if (!user) return <Navigate to="/" replace />;
  if (!loadingDone) return <Navigate to="/loading" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (user) return <Navigate to="/loading" replace />;
  return children;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <MapDataProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<RedirectIfAuthed><AuthPage /></RedirectIfAuthed>} />
                <Route path="/loading" element={<RequireAuth><LoadingPage /></RequireAuth>} />
                <Route path="/app" element={<RequireLoaded><MapPage /></RequireLoaded>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </MapDataProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
