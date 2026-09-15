import { AiaLogo } from './AiaLogo'
import { StatusShimmer } from './StatusShimmer'
import { HeartButton } from './HeartButton'
import { ImproveButton } from './ImproveButton'
import { MarkdownMessage } from './MarkdownMessage'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const showStatus = !isUser && message.isStreaming && message.content.length === 0 && message.stage
  const showActions = !isUser && !message.isStreaming && !message.error && message.content.length > 0

  return (
    <div className={`message-row ${isUser ? 'message-row--user' : 'message-row--assistant'}`}>
      {!isUser && (
        <div className="message-avatar">
          <AiaLogo size={28} />
        </div>
      )}

      <div className="message-stack">
        <div
          className={[
            'bubble',
            isUser ? 'bubble--user' : 'bubble--assistant',
            message.error ? 'bubble--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showStatus ? (
            <StatusShimmer stage={message.stage!} />
          ) : !isUser && !message.error && !message.isStreaming ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <span className="bubble__text">{message.content}</span>
          )}
          {!isUser && message.isStreaming && message.content.length > 0 && <span className="bubble__caret" />}
        </div>

        {showActions && (
          <div className="message-actions">
            <HeartButton />
            <ImproveButton />
          </div>
        )}

        {!isUser && !message.isStreaming && message.sources && message.sources.length > 0 && (
          <div className="message-meta">
            <span className="message-meta__label">Sources</span>
            {message.sources.map((source) => (
              <span key={source} className="chip">
                {source}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="message-avatar">
          <img src="/aia-sender.png" alt="You" />
        </div>
      )}
    </div>
  )
}
