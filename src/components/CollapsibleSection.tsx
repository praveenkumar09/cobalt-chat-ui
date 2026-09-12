import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  label: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ label, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`rel-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="rel-section__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <svg
          className="rel-section__chevron"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="rel-section__label">{label}</span>
        <span className="rel-section__count">{count}</span>
      </button>

      <div className={`rel-section__body-frame${open ? ' is-open' : ''}`}>
        <div className="rel-section__body-inner">{children}</div>
      </div>
    </div>
  )
}
