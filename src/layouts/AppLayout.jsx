import { Outlet } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { signOutUser } from '../firebase/firebase.js'

// Extract 1–2 initials from a Firebase user object.
// Priority: displayName first, email initial as fallback.
function getInitials(user) {
  if (!user) return '?'
  const name = (user.displayName || '').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }
  return (user.email?.[0] || '?').toUpperCase()
}

export default function AppLayout() {
  const { user } = useAuth()

  async function handleLogout() {
    try {
      await signOutUser()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__title">Field Notes</span>
        </div>

        <div className="app-header__actions">
          {/* Avatar shows user initial — title attr shows full name on long-press */}
          <div
            className="app-header__avatar"
            title={user?.displayName || user?.email}
            aria-label={`Signed in as ${user?.displayName || user?.email}`}
          >
            {getInitials(user)}
          </div>

          <button
            type="button"
            className="btn btn--secondary app-header__signout"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
