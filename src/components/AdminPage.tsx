import { useEffect, useState } from 'react'
import { getFeedbackStats, FeedbackApiError } from '../api/feedbackClient'
import { getSecurityStats, SecurityApiError } from '../api/securityClient'
import type { FeedbackStats, SecurityStats, SecurityViolationType } from '../types'

interface AdminPageProps {
  email: string
  onBack: () => void
  onLogout: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

const VIOLATION_LABEL: Record<SecurityViolationType, string> = {
  prompt_injection: 'Prompt injection',
  pii_requested: 'PII requested',
  pii_provided: 'PII provided',
}

export function AdminPage({ email, onBack, onLogout }: AdminPageProps) {
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null)
  const [securityError, setSecurityError] = useState<string | null>(null)

  useEffect(() => {
    getFeedbackStats()
      .then(setStats)
      .catch((e) => setError(e instanceof FeedbackApiError ? 'Could not load feedback stats.' : 'Something went wrong.'))
    getSecurityStats()
      .then(setSecurityStats)
      .catch((e) => setSecurityError(e instanceof SecurityApiError ? 'Could not load security stats.' : 'Something went wrong.'))
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

      <h1 className="admin-page__section-title">Security</h1>

      {securityError && <div className="admin-page__error">{securityError}</div>}
      {!securityError && !securityStats && <div className="admin-page__loading">Loading security stats…</div>}

      {securityStats && (
        <>
          <section className="admin-page__tiles">
            <div className="admin-tile">
              <span className="admin-tile__value">{securityStats.totalCount}</span>
              <span className="admin-tile__label">Total flagged questions</span>
            </div>
            <div className="admin-tile admin-tile--danger">
              <span className="admin-tile__value">{securityStats.promptInjectionCount}</span>
              <span className="admin-tile__label">Prompt injection attempts</span>
            </div>
            <div className="admin-tile admin-tile--warning">
              <span className="admin-tile__value">{securityStats.piiRequestedCount}</span>
              <span className="admin-tile__label">PII requested</span>
            </div>
            <div className="admin-tile admin-tile--warning">
              <span className="admin-tile__value">{securityStats.piiProvidedCount}</span>
              <span className="admin-tile__label">PII volunteered by user</span>
            </div>
          </section>

          <section className="admin-page__section">
            <h2>Recent flagged questions</h2>
            {securityStats.recent.length === 0 ? (
              <p className="admin-page__empty">No security violations detected yet.</p>
            ) : (
              <div className="decision-table-frame">
                <table className="decision-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>User</th>
                      <th>Question</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityStats.recent.map((entry, i) => (
                      <tr key={entry.id} style={{ animationDelay: `${i * 40}ms` }}>
                        <td>{formatDate(entry.createdAt)}</td>
                        <td>{entry.userEmail}</td>
                        <td>{entry.question}</td>
                        <td>
                          <span className={`security-badge security-badge--${entry.violationType}`}>
                            {VIOLATION_LABEL[entry.violationType]}
                          </span>
                        </td>
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
