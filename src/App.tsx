import { ChatWindow } from './components/ChatWindow'
import { AuthScreen } from './components/AuthScreen'
import { useSession } from './hooks/useSession'

export default function App() {
  const { session, verifying, login, logout } = useSession()

  if (verifying) {
    return <div className="app-shell" />
  }

  if (!session) {
    return <AuthScreen onAuthenticated={login} />
  }

  return (
    <div className="app-shell">
      <ChatWindow session={session} onLogout={logout} />
    </div>
  )
}
