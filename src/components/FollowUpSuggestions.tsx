interface FollowUpSuggestionsProps {
  questions: string[]
  onSelect: (question: string) => void
  disabled?: boolean
}

export function FollowUpSuggestions({ questions, onSelect, disabled }: FollowUpSuggestionsProps) {
  if (questions.length === 0) return null

  return (
    <div className="followups">
      <span className="followups__label">Continue exploring</span>
      <div className="followups__list">
        {questions.map((question, i) => (
          <button
            key={question}
            type="button"
            className="followup-chip"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => onSelect(question)}
            disabled={disabled}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
