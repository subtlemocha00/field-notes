import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  // While auth is still initializing (redirect-result consumption +
  // initial onAuthStateChanged) we MUST NOT redirect. AuthContext
  // guarantees isLoading stays true until both have completed, so
  // this single check is sufficient.
  if (isLoading) {
    console.log('[auth] ProtectedRoute waiting (isLoading=true)')
    return (
      <div className="center-screen">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    console.log('[auth] ProtectedRoute redirect -> /login')
    return <Navigate to="/login" replace />
  }

  return children
}
