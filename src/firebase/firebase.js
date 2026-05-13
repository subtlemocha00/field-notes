import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId']
const missing = requiredKeys.filter((key) => !firebaseConfig[key])
export const firebaseConfigError =
  missing.length > 0
    ? `Missing Firebase env vars: ${missing
        .map((k) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
        .join(', ')}.`
    : null

if (firebaseConfigError) {
  console.error(firebaseConfigError)
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true
})
export const storage = getStorage(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

// ── PWA detection ─────────────────────────────────────────────
// `display-mode: standalone` is the canonical signal on Android.
// `navigator.standalone === true` is the legacy iOS flag.
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  return window.navigator && window.navigator.standalone === true
}

// ── Persistence ───────────────────────────────────────────────
// Persistence is now awaited inside the sign-in flow, NOT at module
// load. Previously a fire-and-forget setPersistence() at the top of
// this file could race the redirect handoff: the OAuth round-trip
// would begin before browserLocalPersistence was installed, so the
// returning credential had nowhere durable to land.
let persistenceReady = null
function ensurePersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(
      (err) => {
        console.error('[auth] setPersistence failed', err)
        persistenceReady = null
        throw err
      }
    )
  }
  return persistenceReady
}

// ── Sign-in ──────────────────────────────────────────────────
// Hybrid: popup for normal browser tabs, redirect for installed
// standalone PWAs. Popups can't open from a homescreen-launched
// PWA window on Android, so redirect is the only path there.
export async function signInWithGoogle() {
  await ensurePersistence()
  const standalone = isStandalonePWA()
  console.log('[auth] signInWithGoogle standalone=%s', standalone)
  if (standalone) {
    return signInWithRedirect(auth, googleProvider)
  }
  return signInWithPopup(auth, googleProvider)
}

// Called once at app startup. Resolves to a UserCredential if the
// page just returned from an OAuth redirect; resolves to null on
// every other load. Always safe to await.
export async function consumeRedirectResult() {
  await ensurePersistence()
  const result = await getRedirectResult(auth)
  console.log(
    '[auth] consumeRedirectResult result=%s',
    result ? `user:${result.user?.uid}` : 'null'
  )
  return result
}

export function signOutUser() {
  return signOut(auth)
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}
