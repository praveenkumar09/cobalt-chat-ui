import { useTheme } from '../hooks/useTheme'

const GRAFANA_BASE_URL = (import.meta.env.VITE_GRAFANA_BASE_URL as string | undefined) ?? 'http://localhost:3001'
const DASHBOARD_UID = 'cobalt-rag-overview'

interface StatsPageProps {
  email: string
  onBack: () => void
  onLogout: () => void
}

export function StatsPage({ email, onBack, onLogout }: StatsPageProps) {
  const { theme } = useTheme()

  // Bare "kiosk" (no value) hides Grafana's own nav chrome — the newer
  // left-sidebar nav in Grafana 10+ ignores the legacy "kiosk=tv" value, which
  // only ever hid the old top bar — so the embed reads as part of this app
  // rather than a separate site. Anonymous viewer access is enabled on the
  // Grafana container (see docker-compose.yml) specifically so this iframe
  // never has to prompt for a separate Grafana login.
  const dashboardUrl =
    `${GRAFANA_BASE_URL}/d/${DASHBOARD_UID}/cobalt-rag-overview` +
    `?orgId=1&kiosk&theme=${theme}&refresh=30s`

  return (
    <div className="stats-page">
      <header className="admin-page__header stats-page__header">
        <div>
          <h1>Stats</h1>
          <p className="admin-page__subtitle">Signed in as {email}</p>
        </div>
        <div className="admin-page__header-actions">
          <button
            type="button"
            className="admin-page__link-btn"
            onClick={() => {
              window.location.pathname = '/admin'
            }}
          >
            Feedback
          </button>
          <button type="button" className="admin-page__link-btn" onClick={onBack}>
            Back to chat
          </button>
          <button type="button" className="admin-page__link-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <iframe
        className="stats-page__frame"
        src={dashboardUrl}
        title="Cobalt RAG — Grafana dashboard"
        frameBorder={0}
      />
    </div>
  )
}
