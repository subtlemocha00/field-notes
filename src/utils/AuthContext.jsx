import { createContext, useContext, useEffect, useState } from 'react'
import { consumeRedirectResult, subscribeToAuth } from '../firebase/firebase.js'

const AuthContext = createContext({ user: null, isLoading: true, authError: null })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // The redirect-based sign-in returns the user via getRedirectResult on
    // the very next page load. Run it once at startup so the credential is
    // applied before we start watching auth state.
    consumeRedirectResult().catch((err) => {
      console.error('Redirect sign-in failed:', err)
      setAuthError(err?.message || 'Sign-in failed')
    })

    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser)
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
