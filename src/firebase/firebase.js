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

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase auth persistence:', error)
})

// Hybrid sign-in: popup for normal browsers, redirect only for installed PWAs.
//
// Popup avoids two Firebase-Auth-on-Vercel problems: hash routes getting
// stripped by the redirect handler, and cross-origin storage isolation
// preventing getRedirectResult from reading the credential out of the
// firebaseapp.com iframe. Both go away when the popup posts the result
// back directly to the host window.
//
// In an installed standalone PWA, popups can't open or can't post back —
// so we fall back to redirect there.
function isStandalonePWA() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  // iOS legacy flag
  return window.navigator && window.navigator.standalone === true
}

export function signInWithGoogle() {
  if (isStandalonePWA()) {
    return signInWithRedirect(auth, googleProvider)
  }
  return signInWithPopup(auth, googleProvider)
}

// Still called once at app start so the standalone-PWA redirect path
// works. In the popup path this resolves to null and does nothing.
export function consumeRedirectResult() {
  return getRedirectResult(auth)
}

export function signOutUser() {
  return signOut(auth)
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}
