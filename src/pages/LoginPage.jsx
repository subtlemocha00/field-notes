import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { signInWithGoogle } from '../firebase/firebase.js'

export default function LoginPage() {
  const { user, isLoading, authError } = useAuth()
  const [error, setError] = useState(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (isLoading) {
    return (
      <div className="center-screen">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSignIn() {
    setError(null)
    setIsSigningIn(true)
    try {
      // Popup path resolves here with the credential — AuthContext's
      // onAuthStateChanged listener will pick it up and unmount this page.
      // Redirect path (installed PWA) navigates away; this await never
      // resolves and AuthContext consumes the result on the next load.
      await signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      // auth/popup-closed-by-user / auth/cancelled-popup-request are not
      // real errors — user just dismissed the popup.
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setError(null)
      } else {
        const code = err?.code ? ` (${err.code})` : ''
        setError(`Sign-in failed${code}. Please try again.`)
      }
      setIsSigningIn(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="card login-card">
        <div>
          <h1 className="login-card__title">Field Notes</h1>
          <p className="text-muted">A field book for construction inspectors.</p>
        </div>
        <button
          type="button"
          className="btn btn--block"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {(error || authError) && (
          <p className="login-card__error">{error || authError}</p>
        )}
      </div>
    </div>
  )
}
