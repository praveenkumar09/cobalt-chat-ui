interface SectionPlaceholderProps {
  label: string
}

/** A closed-looking, non-interactive stand-in for a below-the-chat section
 * whose data hasn't landed yet — visually a plain collapsed section (see
 * CollapsibleSection), not a "still working" spinner, so the wait for
 * business rules / decision table / etc. reads as normal UI rather than
 * something stuck. Swapped out for the real section the moment its data
 * arrives. */
export function SectionPlaceholder({ label }: SectionPlaceholderProps) {
  return (
    <div className="rel-section rel-section--placeholder">
      <div className="rel-section__header" aria-hidden="true">
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
        <span className="rel-section__placeholder-dot" />
      </div>
    </div>
  )
}
