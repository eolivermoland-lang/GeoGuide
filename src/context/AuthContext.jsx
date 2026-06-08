import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeAuth, signIn, signUp, signOut } from '../services/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => unsub && unsub();
  }, []);

  const value = useMemo(() => ({
    user,
    initializing,
    signIn,
    signUp,
    signOut: async () => { await signOut(); setUser(null); }
  }), [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
