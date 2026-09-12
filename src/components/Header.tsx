import { useEffect, useRef, useState } from 'react'
import { AiaLogo } from './AiaLogo'
import type { ResponseMode } from '../types'
import type { Theme } from '../hooks/useTheme'
import { FONT_SIZE_ORDER, type FontSize } from '../hooks/useFontSize'
import type { RelationshipView } from '../hooks/useRelationshipView'

interface HeaderProps {
  mode: ResponseMode
  onModeChange: (mode: ResponseMode) => void
  onClear: () => void
  disabled: boolean
  easyMode: boolean
  onToggleEasyMode: () => void
  theme: Theme
  onToggleTheme: () => void
  fontSize: FontSize
  onFontSizeChange: (size: FontSize) => void
  relationshipView: RelationshipView
  onRelationshipViewChange: (view: RelationshipView) => void
}

const RELATIONSHIP_VIEW_ORDER: RelationshipView[] = ['cards', 'chain', 'hub']

const RELATIONSHIP_VIEW_LABEL: Record<RelationshipView, string> = {
  cards: 'Cards',
  chain: 'Chain',
  hub: 'Hub',
}

const FONT_SIZE_LABEL: Record<FontSize, string> = {
  sm: 'A',
  md: 'A',
  lg: 'A',
  xl: 'A',
}

const FONT_SIZE_TITLE: Record<FontSize, string> = {
  sm: 'Small text',
  md: 'Default text',
  lg: 'Large text',
  xl: 'Extra large text',
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
  fontSize,
  onFontSizeChange,
  relationshipView,
  onRelationshipViewChange,
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsOpen])

  return (
    <header className="chat-header">
      <div className="chat-header__leading">
        <div className="settings-anchor" ref={settingsRef}>
          <button
            type="button"
            className={`icon-btn settings-trigger${settingsOpen ? ' is-active' : ''}`}
            onClick={() => setSettingsOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={settingsOpen}
            aria-label="Chat settings"
            title="Chat settings"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={settingsOpen ? 'settings-trigger__icon is-open' : 'settings-trigger__icon'}
            >
              <circle cx="12" cy="12" r="3.2" />
              <path
                d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.4a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.6a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6.2 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10.6A1.65 1.65 0 0 0 11.6 2.7V2.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.14.63.62 1.15 1.51 1.51H19.4a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {settingsOpen && (
            <div className="settings-panel" role="menu">
              <div className="settings-panel__row settings-panel__row--1">
                <span className="settings-panel__label">Response mode</span>
                <div className="mode-toggle" role="tablist" aria-label="Response mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'stream'}
                    className={mode === 'stream' ? 'mode-toggle__btn is-active' : 'mode-toggle__btn'}
                    onClick={() => onModeChange('stream')}
                    disabled={disabled}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
                    </svg>
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3.5" y="5" width="17" height="14" rx="2.4" />
                      <path d="M3.5 9.5h17" strokeLinecap="round" />
                    </svg>
                    Full
                  </button>
                </div>
              </div>

              <div className="settings-panel__row settings-panel__row--2">
                <span className="settings-panel__label">Text size</span>
                <div className="font-size-toggle" role="group" aria-label="Text size">
                  {FONT_SIZE_ORDER.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={size === fontSize ? 'font-size-toggle__btn is-active' : 'font-size-toggle__btn'}
                      onClick={() => onFontSizeChange(size)}
                      aria-pressed={size === fontSize}
                      title={FONT_SIZE_TITLE[size]}
                      style={{ fontSize: `${11 + FONT_SIZE_ORDER.indexOf(size) * 2}px` }}
                    >
                      {FONT_SIZE_LABEL[size]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-panel__row settings-panel__row--3">
                <span className="settings-panel__label">Key relationships</span>
                <div className="relationship-view-toggle" role="group" aria-label="Key relationships view">
                  {RELATIONSHIP_VIEW_ORDER.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={v === relationshipView ? 'relationship-view-toggle__btn is-active' : 'relationship-view-toggle__btn'}
                      onClick={() => onRelationshipViewChange(v)}
                      aria-pressed={v === relationshipView}
                    >
                      {RELATIONSHIP_VIEW_LABEL[v]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-header__identity">
          <AiaLogo />
          <div className="chat-header__text">
            <h1>AIA Orbit</h1>
            <p>Explore, Understand, Build Together</p>
          </div>
        </div>
      </div>

      <div className="chat-header__actions">
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
