interface ExportTestScenariosButtonProps {
  onClick: () => void
}

export function ExportTestScenariosButton({ onClick }: ExportTestScenariosButtonProps) {
  return (
    <button
      type="button"
      className="action-btn export-report-btn"
      onClick={onClick}
      aria-label="Export test scenarios"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11.5 11 13.5 15.5 9" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3.5" y="4" width="17" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 8.5h17" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="action-btn__label">Export test scenarios</span>
    </button>
  )
}
