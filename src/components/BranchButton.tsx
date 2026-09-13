interface BranchButtonProps {
  onBranch: () => void
  disabled?: boolean
}

export function BranchButton({ onBranch, disabled }: BranchButtonProps) {
  return (
    <button
      type="button"
      className="action-btn branch-btn"
      onClick={onBranch}
      disabled={disabled}
      aria-label="Branch from this response"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="12" r="2.5" />
        <path d="M6 8.5V15.5" strokeLinecap="round" />
        <path d="M8.3 7.2 15.7 10.7" strokeLinecap="round" />
        <path d="M8.3 16.8 15.7 13.3" strokeLinecap="round" />
      </svg>
      <span className="action-btn__label">Branch from here</span>
    </button>
  )
}
