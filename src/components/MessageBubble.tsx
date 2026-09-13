import { AiaLogo } from './AiaLogo'
import { StatusShimmer } from './StatusShimmer'
import { HeartButton } from './HeartButton'
import { ImproveButton } from './ImproveButton'
import { CopyButton } from './CopyButton'
import { RegenerateButton } from './RegenerateButton'
import { BranchButton } from './BranchButton'
import { SiblingNav } from './SiblingNav'
import { SourceCitations } from './SourceCitations'
import { KeyRelationships } from './KeyRelationships'
import { ImpactAnalysisView } from './ImpactAnalysisView'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import type { Message } from '../types'
import type { RelationshipView } from '../hooks/useRelationshipView'
import type { ViewMode } from '../hooks/useViewMode'

interface MessageBubbleProps {
  message: Message
  onRegenerate?: (id: string) => void
  onAsk?: (question: string) => void
  onBranch?: (id: string) => void
  onSelectSibling?: (id: string) => void
  isBusy?: boolean
  isLatest?: boolean
  relationshipView: RelationshipView
  viewMode: ViewMode
}

export function MessageBubble({
  message,
  onRegenerate,
  onAsk,
  onBranch,
  onSelectSibling,
  isBusy,
  isLatest,
  relationshipView,
  viewMode,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const showStatus = !isUser && message.isStreaming && message.content.length === 0 && message.stage
  const showActions = !isUser && !message.isStreaming && !message.error && message.content.length > 0
  const showRetry = !isUser && !message.isStreaming && !!message.error && !!message.sourceQuestion
  const showDeveloperExtras = viewMode !== 'business'
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
        {onSelectSibling && message.siblingIds && message.siblingIds.length > 1 && (
          <SiblingNav
            siblingIds={message.siblingIds}
            siblingIndex={message.siblingIndex ?? 0}
            onSelect={onSelectSibling}
            disabled={isBusy}
          />
        )}

        <div
          className={[
            'bubble',
            isUser ? 'bubble--user' : 'bubble--assistant',
            message.error ? 'bubble--error' : '',
            message.justBranched ? 'bubble--branch-flash' : '',
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
            {showDeveloperExtras && onBranch && (
              <BranchButton onBranch={() => onBranch(message.id)} disabled={isBusy} />
            )}
          </div>
        )}

        {showRetry && onRegenerate && (
          <div className="message-actions">
            <RegenerateButton onRegenerate={() => onRegenerate(message.id)} isError disabled={isBusy} />
          </div>
        )}

        {showDeveloperExtras &&
          !isUser &&
          !message.isStreaming &&
          !message.error &&
          message.sources &&
          message.sources.length > 0 && <SourceCitations sources={message.sources} />}

        {showDeveloperExtras &&
          !isUser &&
          !message.isStreaming &&
          !message.error &&
          message.graphContext &&
          message.graphContext.length > 0 && (
            <KeyRelationships relationships={message.graphContext} view={relationshipView} />
          )}

        {viewMode === 'impact' &&
          !isUser &&
          !message.isStreaming &&
          !message.error &&
          message.impactAnalysis && <ImpactAnalysisView analysis={message.impactAnalysis} />}

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
