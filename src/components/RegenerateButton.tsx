import { useState } from 'react'

interface RegenerateButtonProps {
  onRegenerate: () => void
  isError?: boolean
  disabled?: boolean
}

export function RegenerateButton({ onRegenerate, isError, disabled }: RegenerateButtonProps) {
  const [spinning, setSpinning] = useState(false)

  const handleClick = () => {
    if (disabled) return
    setSpinning(true)
    onRegenerate()
    window.setTimeout(() => setSpinning(false), 600)
  }

  return (
    <button
      type="button"
      className={`action-btn regenerate-btn${isError ? ' is-retry' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isError ? 'Retry this response' : 'Regenerate this response'}
    >
      <svg
        className={`regenerate-icon${spinning ? ' is-spinning' : ''}`}
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 12a9 9 0 0 1 15.3-6.4M21 12a9 9 0 0 1-15.3 6.4" strokeLinecap="round" />
        <path d="M18 3v4.5h-4.5M6 21v-4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="action-btn__label">{isError ? 'Retry' : 'Regenerate'}</span>
    </button>
  )
}
