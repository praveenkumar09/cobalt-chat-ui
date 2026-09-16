import { ChatWindow } from './components/ChatWindow'
import { AuthScreen } from './components/AuthScreen'
import { AdminPage } from './components/AdminPage'
import { StatsPage } from './components/StatsPage'
import { useSession } from './hooks/useSession'

export default function App() {
  const { session, verifying, login, logout } = useSession()

  if (verifying) {
    return <div className="app-shell" />
  }

  if (!session) {
    return <AuthScreen onAuthenticated={login} />
  }

  // No router in this app — /admin and /stats are plain path checks. Both
  // stay gated behind the same login as everything else, just with no
  // separate admin role yet.
  const goTo = (path: string) => {
    window.location.pathname = path
  }

  if (window.location.pathname === '/admin') {
    return <AdminPage email={session.email} onBack={() => goTo('/')} onLogout={logout} />
  }

  if (window.location.pathname === '/stats') {
    return <StatsPage email={session.email} onBack={() => goTo('/')} onLogout={logout} />
  }

  return (
    <div className="app-shell">
      <ChatWindow session={session} onLogout={logout} />
    </div>
  )
}
