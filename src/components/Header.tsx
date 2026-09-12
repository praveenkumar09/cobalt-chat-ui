import { AiaLogo } from './AiaLogo'
import type { ResponseMode } from '../types'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  mode: ResponseMode
  onModeChange: (mode: ResponseMode) => void
  onClear: () => void
  disabled: boolean
  easyMode: boolean
  onToggleEasyMode: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function Header({
  mode,
  onModeChange,
  onClear,
  disabled,
  easyMode,
  onToggleEasyMode,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header__identity">
        <AiaLogo />
        <div className="chat-header__text">
          <h1>AIA Orbit</h1>
          <p>Explore, Understand, Build Together</p>
        </div>
      </div>

      <div className="chat-header__actions">
        <div className="mode-toggle" role="tablist" aria-label="Response mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'stream'}
            className={mode === 'stream' ? 'mode-toggle__btn is-active' : 'mode-toggle__btn'}
            onClick={() => onModeChange('stream')}
            disabled={disabled}
          >
            Live
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'complete'}
            className={mode === 'complete' ? 'mode-toggle__btn is-active' : 'mode-toggle__btn'}
            onClick={() => onModeChange('complete')}
            disabled={disabled}
          >
            Full
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4.2" />
              <path
                d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className={`icon-btn${easyMode ? ' is-active' : ''}`}
          onClick={onToggleEasyMode}
          aria-pressed={easyMode}
          aria-label={easyMode ? 'Exit full-screen easy-read mode' : 'Full-screen easy-read mode'}
          title="Full-screen, larger text"
        >
          {easyMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button type="button" className="icon-btn" onClick={onClear} aria-label="Clear conversation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h10Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
