import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { signInWithGoogle } from '../firebase/firebase.js'

export default function LoginPage() {
  const { user, isLoading } = useAuth()
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
      await signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setError('Sign-in failed. Please try again.')
    } finally {
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
        {error && <p className="login-card__error">{error}</p>}
      </div>
    </div>
  )
}
