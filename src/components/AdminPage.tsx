import { useEffect, useState } from 'react'
import { getFeedbackStats, FeedbackApiError } from '../api/feedbackClient'
import type { FeedbackStats } from '../types'

interface AdminPageProps {
  email: string
  onBack: () => void
  onLogout: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function AdminPage({ email, onBack, onLogout }: AdminPageProps) {
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFeedbackStats()
      .then(setStats)
      .catch((e) => setError(e instanceof FeedbackApiError ? 'Could not load feedback stats.' : 'Something went wrong.'))
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Admin</h1>
          <p className="admin-page__subtitle">Signed in as {email}</p>
        </div>
        <div className="admin-page__header-actions">
          <button
            type="button"
            className="admin-page__link-btn"
            onClick={() => {
              window.location.pathname = '/stats'
            }}
          >
            Stats dashboard
          </button>
          <button type="button" className="admin-page__link-btn" onClick={onBack}>
            Back to chat
          </button>
          <button type="button" className="admin-page__link-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {error && <div className="admin-page__error">{error}</div>}

      {!error && !stats && <div className="admin-page__loading">Loading feedback stats…</div>}

      {stats && (
        <>
          <section className="admin-page__tiles">
            <div className="admin-tile">
              <span className="admin-tile__value">{stats.totalCount}</span>
              <span className="admin-tile__label">Total suggestions</span>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__value">{stats.last7DaysCount}</span>
              <span className="admin-tile__label">Last 7 days</span>
            </div>
          </section>

          <section className="admin-page__section">
            <h2>Recent improvement suggestions</h2>
            {stats.recent.length === 0 ? (
              <p className="admin-page__empty">No feedback submitted yet.</p>
            ) : (
              <div className="decision-table-frame">
                <table className="decision-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>User</th>
                      <th>Question</th>
                      <th>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((entry, i) => (
                      <tr key={entry.id} style={{ animationDelay: `${i * 40}ms` }}>
                        <td>{formatDate(entry.createdAt)}</td>
                        <td>{entry.userEmail}</td>
                        <td>{entry.question ?? <span className="decision-table__empty">—</span>}</td>
                        <td>{entry.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
