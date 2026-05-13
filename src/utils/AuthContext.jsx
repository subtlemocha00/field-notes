import { createContext, useContext, useEffect, useState } from 'react'
import { consumeRedirectResult, subscribeToAuth } from '../firebase/firebase.js'

const AuthContext = createContext({ user: null, isLoading: true, authError: null })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = null

    // CRITICAL ORDERING — fixes the standalone-PWA login race.
    //
    // Old code fired consumeRedirectResult() without awaiting it, then
    // immediately subscribed to onAuthStateChanged. The listener's
    // first synchronous-ish callback would land with user=null, flip
    // isLoading to false, and ProtectedRoute would bounce to /login —
    // all before the OAuth credential had been processed. On Android
    // standalone PWAs, the second auth-state callback that should
    // follow sometimes never arrived because the OAuth bounce had
    // partitioned IndexedDB.
    //
    // New ordering:
    //   1. Await getRedirectResult — Firebase processes the redirect
    //      credential AND completes its initial IndexedDB restoration.
    //   2. THEN attach onAuthStateChanged — its first callback now
    //      reflects the post-redirect / restored user.
    //   3. THEN flip isLoading=false. Protected routes never make a
    //      decision on partial state.
    async function init() {
      console.log('[auth] init start')
      try {
        await consumeRedirectResult()
      } catch (err) {
        console.error('[auth] redirect sign-in failed', err)
        if (!cancelled) setAuthError(err?.message || 'Sign-in failed')
      }
      if (cancelled) return

      unsubscribe = subscribeToAuth((firebaseUser) => {
        console.log(
          '[auth] onAuthStateChanged user=%s',
          firebaseUser ? firebaseUser.uid : 'null'
        )
        if (cancelled) return
        setUser(firebaseUser)
        setIsLoading(false)
      })
    }

    init()

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
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
