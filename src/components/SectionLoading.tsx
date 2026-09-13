interface SectionLoadingProps {
  label: string
}

/** Lightweight "still working on it" placeholder for a below-the-chat section
 * whose data hasn't arrived yet, reusing the existing status-shimmer look. */
export function SectionLoading({ label }: SectionLoadingProps) {
  return (
    <span className="status-shimmer section-loading">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{label}…</span>
    </span>
  )
}
