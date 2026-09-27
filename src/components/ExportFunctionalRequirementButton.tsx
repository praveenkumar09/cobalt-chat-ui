interface ExportFunctionalRequirementButtonProps {
  onClick: () => void
}

export function ExportFunctionalRequirementButton({ onClick }: ExportFunctionalRequirementButtonProps) {
  return (
    <button
      type="button"
      className="action-btn export-report-btn"
      onClick={onClick}
      aria-label="Export functional requirement report"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 14.5 1.8 1.8L15 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="action-btn__label">Export functional requirement</span>
    </button>
  )
}
