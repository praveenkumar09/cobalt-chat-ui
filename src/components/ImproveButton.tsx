import { useState } from 'react'

export function ImproveButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    setSent(true)
    window.setTimeout(() => {
      setOpen(false)
      setSent(false)
      setText('')
    }, 1600)
  }

  return (
    <div className="improve-wrap">
      <button
        type="button"
        className={`action-btn improve-btn${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Suggest improvement"
      >
        <svg
          className="improve-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4.9 1 .9 1.7V16h5.2v-.4c0-.7.3-1.3.9-1.7A6 6 0 0 0 12 3Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="action-btn__label">Suggest improvement</span>
      </button>

      <div className={`improve-panel-frame${open ? ' is-open' : ''}`}>
        <div className="improve-panel-inner">
          {sent ? (
            <div className="improve-confirm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12.5 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Thanks — feedback noted.
            </div>
          ) : (
            <div className="improve-panel">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What should be better about this answer?"
                rows={2}
              />
              <button type="button" className="improve-send" onClick={submit} disabled={!text.trim()}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
