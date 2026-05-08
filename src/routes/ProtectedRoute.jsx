import { Navigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="center-screen">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
