import { useTheme } from '../hooks/useTheme'

const GRAFANA_BASE_URL = (import.meta.env.VITE_GRAFANA_BASE_URL as string | undefined) ?? 'http://localhost:3001'
const DASHBOARD_UID = 'cobalt-rag-overview'

interface StatsPageProps {
  email: string
  onBack: () => void
  onLogout: () => void
}

// Panel ids and titles must match docker/grafana/dashboards/cobalt-rag-overview.json
// exactly — keep these in sync if panels are added/removed/renumbered there.
type Panel = { id: number; title: string }
type PanelSize = 'stat' | 'chart'

const SECTIONS: { title: string; rows: { size: PanelSize; panels: Panel[] }[] }[] = [
  {
    title: 'Answer quality',
    rows: [
      {
        size: 'stat',
        panels: [
          { id: 2, title: 'Out-of-scope rate' },
          { id: 3, title: 'Avg chunks retrieved / question' },
          { id: 4, title: 'Questions with graph context' },
          { id: 5, title: 'Impact-analysis triggers (1h)' },
        ],
      },
      { size: 'chart', panels: [{ id: 6, title: 'Answers: in-scope vs out-of-scope' }] },
    ],
  },
  {
    title: 'LLM call health',
    rows: [
      {
        size: 'chart',
        panels: [
          { id: 8, title: 'LLM call rate by type' },
          { id: 9, title: 'LLM call p95 latency by type' },
        ],
      },
      {
        size: 'chart',
        panels: [
          { id: 10, title: 'LLM call errors by type' },
          { id: 11, title: 'HTTP request rate (/api/ask*)' },
        ],
      },
    ],
  },
  {
    title: 'System health',
    rows: [
      {
        size: 'chart',
        panels: [
          { id: 13, title: 'HTTP p95 latency (all endpoints)' },
          { id: 14, title: 'JVM heap used' },
          { id: 15, title: 'Postgres pool — active connections' },
        ],
      },
    ],
  },
  {
    title: 'Security',
    rows: [
      {
        size: 'stat',
        panels: [
          { id: 17, title: 'Prompt injection attempts (24h)' },
          { id: 18, title: 'PII requested (24h)' },
          { id: 19, title: 'PII volunteered by user (24h)' },
        ],
      },
      {
        size: 'chart',
        panels: [
          { id: 20, title: 'Security violations by type' },
          { id: 21, title: 'Rate-limit rejections (1h)' },
        ],
      },
    ],
  },
]

// Individual "/d-solo/" panel embeds, NOT the whole dashboard in kiosk mode —
// this alone already confines Grafana's "Powered by Grafana" badge (which
// can't be removed in the open-source edition; that's an Enterprise-only
// white-labeling feature) to each panel's own corner instead of a page-wide
// overlay fixed to the whole iframe's viewport. On top of that, the iframe
// here is deliberately taller than its visible wrapper and shifted up by
// HEADER_CROP_PX, cropping Grafana's own title-and-badge row out of view
// entirely — the panel's title is instead rendered as plain text above it,
// under our own styling, guaranteed never to overlap anything.
const HEADER_CROP_PX = 32

function panelUrl(theme: string, panelId: number): string {
  return (
    `${GRAFANA_BASE_URL}/d-solo/${DASHBOARD_UID}/x` +
    `?orgId=1&panelId=${panelId}&theme=${theme}&from=now-6h&to=now&refresh=30s`
  )
}

function GrafanaPanel({ panel, theme, size }: { panel: Panel; theme: string; size: PanelSize }) {
  return (
    <div className="stats-panel-block">
      <div className="stats-panel-label">{panel.title}</div>
      <div className={`stats-panel-crop stats-panel-crop--${size}`}>
        <iframe
          className="stats-panel-frame"
          src={panelUrl(theme, panel.id)}
          title={`grafana-panel-${panel.id}`}
          style={{ top: -HEADER_CROP_PX, height: `calc(100% + ${HEADER_CROP_PX}px)` }}
          frameBorder={0}
        />
      </div>
    </div>
  )
}

export function StatsPage({ email, onBack, onLogout }: StatsPageProps) {
  const { theme } = useTheme()

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

      <div className="stats-page__body">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="stats-section-title">{section.title}</h2>
            {section.rows.map((row, i) => (
              <div key={i} className={`stats-grid stats-grid--${row.panels.length}`}>
                {row.panels.map((panel) => (
                  <GrafanaPanel key={panel.id} panel={panel} theme={theme} size={row.size} />
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
