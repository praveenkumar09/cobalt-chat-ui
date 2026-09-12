import { AiaLogo } from './AiaLogo'
import { StatusShimmer } from './StatusShimmer'
import { HeartButton } from './HeartButton'
import { ImproveButton } from './ImproveButton'
import { CopyButton } from './CopyButton'
import { RegenerateButton } from './RegenerateButton'
import { SourceCitations } from './SourceCitations'
import { KeyRelationships } from './KeyRelationships'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import type { Message } from '../types'
import type { RelationshipView } from '../hooks/useRelationshipView'

interface MessageBubbleProps {
  message: Message
  onRegenerate?: (id: string) => void
  onAsk?: (question: string) => void
  isBusy?: boolean
  isLatest?: boolean
  relationshipView: RelationshipView
}

export function MessageBubble({ message, onRegenerate, onAsk, isBusy, isLatest, relationshipView }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const showStatus = !isUser && message.isStreaming && message.content.length === 0 && message.stage
  const showActions = !isUser && !message.isStreaming && !message.error && message.content.length > 0
  const showRetry = !isUser && !message.isStreaming && !!message.error && !!message.sourceQuestion
  const showFollowups =
    isLatest &&
    !isUser &&
    !isBusy &&
    !message.isStreaming &&
    !message.error &&
    !!message.followUpQuestions &&
    message.followUpQuestions.length > 0 &&
    !!onAsk

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
          ) : (
            <span className="bubble__text">{message.content}</span>
          )}
          {!isUser && message.isStreaming && message.content.length > 0 && <span className="bubble__caret" />}
        </div>

        {showActions && (
          <div className="message-actions">
            <HeartButton />
            <ImproveButton />
            <CopyButton text={message.content} />
            {onRegenerate && message.sourceQuestion && (
              <RegenerateButton onRegenerate={() => onRegenerate(message.id)} disabled={isBusy} />
            )}
          </div>
        )}

        {showRetry && onRegenerate && (
          <div className="message-actions">
            <RegenerateButton onRegenerate={() => onRegenerate(message.id)} isError disabled={isBusy} />
          </div>
        )}

        {!isUser && !message.isStreaming && !message.error && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}

        {!isUser && !message.isStreaming && !message.error && message.graphContext && message.graphContext.length > 0 && (
          <KeyRelationships relationships={message.graphContext} view={relationshipView} />
        )}

        {showFollowups && (
          <FollowUpSuggestions questions={message.followUpQuestions!} onSelect={onAsk!} disabled={isBusy} />
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
