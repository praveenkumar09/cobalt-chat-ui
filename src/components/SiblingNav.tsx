import { useState } from 'react'

interface SiblingNavProps {
  siblingIds: string[]
  siblingIndex: number
  onSelect: (messageId: string) => void | Promise<void>
  disabled?: boolean
}

export function SiblingNav({ siblingIds, siblingIndex, onSelect, disabled }: SiblingNavProps) {
  const [switching, setSwitching] = useState(false)
  if (siblingIds.length <= 1) return null

  const go = async (targetId: string) => {
    setSwitching(true)
    try {
      await onSelect(targetId)
    } finally {
      setSwitching(false)
    }
  }

  const goPrev = () => {
    if (siblingIndex > 0) go(siblingIds[siblingIndex - 1])
  }
  const goNext = () => {
    if (siblingIndex < siblingIds.length - 1) go(siblingIds[siblingIndex + 1])
  }

  return (
    <div className={`sibling-nav${switching ? ' is-switching' : ''}`} role="group" aria-label="Alternate branches">
      <button
        type="button"
        className="sibling-nav__btn"
        onClick={goPrev}
        disabled={disabled || switching || siblingIndex === 0}
        aria-label="Previous branch"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="sibling-nav__count">
        {siblingIndex + 1} / {siblingIds.length}
      </span>
      <button
        type="button"
        className="sibling-nav__btn"
        onClick={goNext}
        disabled={disabled || switching || siblingIndex === siblingIds.length - 1}
        aria-label="Next branch"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
