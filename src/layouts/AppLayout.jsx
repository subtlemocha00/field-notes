import { Outlet } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { signOutUser } from '../firebase/firebase.js'

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
        <div className="app-header__title">Field Notes</div>
        <div className="app-header__actions">
          <span className="app-header__user">
            {user?.displayName || user?.email}
          </span>
          <button type="button" className="btn btn--secondary" onClick={handleLogout}>
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
