import { useRef, useState, type KeyboardEvent } from 'react'
import { playSendSound } from '../utils/sound'

interface ChatInputProps {
  onSend: (text: string) => void
  onStop: () => void
  isBusy: boolean
}

export function ChatInput({ onSend, onStop, isBusy }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [justSent, setJustSent] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (text: string) => {
    setValue(text)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`
    }
  }

  const submit = () => {
    if (!value.trim() || isBusy) return
    onSend(value)
    playSendSound()
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setJustSent(true)
    window.setTimeout(() => setJustSent(false), 520)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="chat-input">
      <div className="chat-input__field">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your policy, claims, or coverage…"
          rows={1}
        />
      </div>

      <div className={`send-slot${justSent ? ' is-sent' : ''}`}>
        <span className="send-ripple" aria-hidden="true" />

        {justSent && (
          <span className="send-flight" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12L20 4L14 20L11 13L4 12Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}

        {isBusy ? (
          <button type="button" className="send-btn send-btn--stop" onClick={onStop} aria-label="Stop response">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className={`send-btn${justSent ? ' is-sent' : ''}`}
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12L20 4L14 20L11 13L4 12Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
