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
      // Redirect-based: navigates away to Google. The promise normally
      // doesn't resolve here — the page reloads and AuthContext picks up
      // the result via getRedirectResult.
      await signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setError('Sign-in failed. Please try again.')
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
          {isSigningIn ? 'Redirecting…' : 'Sign in with Google'}
        </button>
        {(error || authError) && (
          <p className="login-card__error">{error || authError}</p>
        )}
      </div>
    </div>
  )
}
