interface ReferenceButtonProps {
  onClick: () => void
}

/** Small "view source" pointer used by business rules / decision table rows
 * to open the exact code chunk that grounds them. */
export function ReferenceButton({ onClick }: ReferenceButtonProps) {
  return (
    <button type="button" className="reference-btn" onClick={onClick} aria-label="View referenced code">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 3h-6m6 0v6m0-6-9 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Code</span>
    </button>
  )
}
