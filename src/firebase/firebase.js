import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
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

// Surface the misconfiguration but don't throw at module load — a throw here
// happens before React mounts, leaving a blank white screen with no UI to
// recover from. The App renders a visible error instead.
if (firebaseConfigError) {
  console.error(firebaseConfigError)
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
// experimentalAutoDetectLongPolling avoids a classic Firestore Web SDK hang
// where the WebChannel transport stalls on some networks/extensions and
// addDoc/getDocs never resolve and never reject.
export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true
})
export const storage = getStorage(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase auth persistence:', error)
})

// Redirect (not popup) sign-in so the flow works inside an installed PWA on
// Android/iOS. Popups in standalone mode often can't open or can't post their
// result back to the host window, which manifests as a stuck "Signing in…"
// state or a white screen on relaunch.
export function signInWithGoogle() {
  return signInWithRedirect(auth, googleProvider)
}

// Called once at app start to consume the credential after Firebase has
// redirected the browser back from accounts.google.com.
export function consumeRedirectResult() {
  return getRedirectResult(auth)
}

export function signOutUser() {
  return signOut(auth)
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}
