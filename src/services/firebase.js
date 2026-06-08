import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

// Placeholder-config. Lim inn ekte verdier i .env (se .env.example).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000:web:000',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app;
let auth;
try {
  app = initializeApp(config);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init failed – using fallback local auth.', e);
}

/* --- Fallback "local auth" så appen funker uten Firebase-nøkler --- */
const LOCAL_USERS_KEY = 'geoguide.local-users';
const LOCAL_SESSION_KEY = 'geoguide.local-session';

function readLocalUsers() {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}'); }
  catch { return {}; }
}
function writeLocalUsers(u) { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(u)); }

async function localSignUp(email, password, displayName) {
  const users = readLocalUsers();
  if (users[email]) throw new Error('auth/email-already-in-use');
  users[email] = { password, displayName };
  writeLocalUsers(users);
  const user = { email, displayName };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  return user;
}
async function localSignIn(email, password) {
  const users = readLocalUsers();
  const u = users[email];
  if (!u || u.password !== password) throw new Error('auth/invalid-credential');
  const user = { email, displayName: u.displayName };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  return user;
}
function localCurrentUser() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null'); }
  catch { return null; }
}
function localSignOut() { localStorage.removeItem(LOCAL_SESSION_KEY); }

/* --- Eksporterte API-funksjoner --- */
export async function signIn(email, password) {
  if (isFirebaseConfigured && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { email: cred.user.email, displayName: cred.user.displayName };
  }
  return localSignIn(email, password);
}

export async function signUp(email, password, displayName) {
  if (isFirebaseConfigured && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    return { email: cred.user.email, displayName };
  }
  return localSignUp(email, password, displayName);
}

export async function signOut() {
  if (isFirebaseConfigured && auth) return fbSignOut(auth);
  localSignOut();
}

export function subscribeAuth(callback) {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (u) => {
      callback(u ? { email: u.email, displayName: u.displayName } : null);
    });
  }
  callback(localCurrentUser());
  const handler = () => callback(localCurrentUser());
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function mapAuthError(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || err || '');
  const all = code + ' ' + msg;
  if (all.includes('api-key-not-valid') || all.includes('API key not valid') || all.includes('API_KEY_INVALID'))
    return {
      nb: 'Firebase API-nøkkelen er ikke gyldig. Sjekk .env-filen og start dev-serveren på nytt (npm run dev).',
      en: 'Firebase API key is invalid. Check your .env file and restart the dev server (npm run dev).'
    };
  if (all.includes('operation-not-allowed') || all.includes('OPERATION_NOT_ALLOWED'))
    return {
      nb: 'E-post/passord-innlogging er ikke aktivert i Firebase. Slå det på under Authentication → Sign-in method.',
      en: 'Email/password sign-in is not enabled in Firebase. Enable it under Authentication → Sign-in method.'
    };
  if (all.includes('email-already-in-use')) return { nb: 'E-posten er allerede registrert.', en: 'Email already registered.' };
  if (all.includes('invalid-credential') || all.includes('wrong-password') || all.includes('user-not-found'))
    return { nb: 'Feil e-post eller passord.', en: 'Wrong email or password.' };
  if (all.includes('weak-password')) return { nb: 'Passordet er for svakt.', en: 'Password too weak.' };
  if (all.includes('invalid-email')) return { nb: 'Ugyldig e-postadresse.', en: 'Invalid email address.' };
  if (all.includes('network-request-failed')) return { nb: 'Nettverksfeil. Sjekk internett.', en: 'Network error. Check internet.' };
  return { nb: `Noe gikk galt: ${msg || code || 'ukjent feil'}`, en: `Something went wrong: ${msg || code || 'unknown error'}` };
}
