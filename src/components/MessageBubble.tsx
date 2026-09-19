import { memo, useState } from 'react'
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
import { BusinessRulesView } from './BusinessRulesView'
import { TechnicalRulesView } from './TechnicalRulesView'
import { DecisionTableView } from './DecisionTableView'
import { DataDictionaryView } from './DataDictionaryView'
import { CodeReferenceModal } from './CodeReferenceModal'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import { SectionPlaceholder } from './SectionPlaceholder'
import { MarkdownMessage } from './MarkdownMessage'
import type { BusinessFlow, GraphRelationship, Message, ResponseMode } from '../types'
import type { RelationshipView } from '../hooks/useRelationshipView'
import type { ViewMode } from '../hooks/useViewMode'

function toGraphRelationships(flow: BusinessFlow): GraphRelationship[] {
  return flow.edges.map((e) => ({
    fromId: e.fromActivity,
    fromLabel: e.fromActivity,
    fromType: 'BUSINESS_ACTIVITY',
    relType: e.relation,
    toId: e.toActivity,
    toLabel: e.toActivity,
    toType: 'BUSINESS_ACTIVITY',
  }))
}

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
  responseMode: ResponseMode
}

// Memoized: ChatWindow re-renders on every streamed token (once per animation
// frame — see useChat's updateMessage), and .map() over `messages` keeps the
// same object reference for every message except the one actively streaming.
// Without memo, every OTHER message's bubble (markdown parse, syntax
// highlighting, chevron sections, etc.) would redo that work every frame too,
// so the cost of a single streaming response scales with total conversation
// length instead of staying constant — this is what makes a long conversation
// feel increasingly janky. Requires every prop below to be reference-stable
// across renders when the underlying data hasn't changed (see ChatWindow's
// handleBranch for why that matters).
function MessageBubbleComponent({
  message,
  onRegenerate,
  onAsk,
  onBranch,
  onSelectSibling,
  isBusy,
  isLatest,
  relationshipView,
  viewMode,
  responseMode,
}: MessageBubbleProps) {
  const [openRefChunkId, setOpenRefChunkId] = useState<string | null>(null)
  const [openRefProgramId, setOpenRefProgramId] = useState<string | null>(null)
  const openRefCitation = message.sources?.find((s) => s.chunkId === openRefChunkId) ?? null

  const openReference = (chunkId: string) => {
    setOpenRefProgramId(null)
    setOpenRefChunkId(chunkId)
  }
  const openNodeSource = (id: string) => {
    setOpenRefChunkId(null)
    setOpenRefProgramId(id)
  }
  const closeReference = () => {
    setOpenRefChunkId(null)
    setOpenRefProgramId(null)
  }

  const isUser = message.role === 'user'
  const showStatus = !isUser && message.isStreaming && message.content.length === 0 && message.stage
  const showActions = !isUser && !message.isStreaming && !message.error && message.content.length > 0
  const showRetry = !isUser && !message.isStreaming && !!message.error && !!message.sourceQuestion
  const showDeveloperExtras = viewMode !== 'business'
  // Still working on a below-the-chat section: answer text has started, the
  // stream hasn't fully finished, and this particular field hasn't landed yet.
  const stillFilling = !isUser && !message.error && message.isStreaming && message.content.length > 0
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
            <ImproveButton question={message.sourceQuestion} answer={message.content} />
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

        {showDeveloperExtras && !isUser && !message.error && (
          <>
            {message.technicalRules ? (
              <TechnicalRulesView rules={message.technicalRules} onOpenReference={openReference} />
            ) : (
              stillFilling && <SectionPlaceholder label="Technical rules" />
            )}
          </>
        )}

        {showDeveloperExtras &&
          !isUser &&
          !message.error &&
          message.sources &&
          message.sources.length > 0 && <SourceCitations sources={message.sources} />}

        {showDeveloperExtras &&
          !isUser &&
          !message.error &&
          message.graphContext &&
          message.graphContext.length > 0 && (
            <KeyRelationships
              relationships={message.graphContext}
              view={relationshipView}
              onNodeClick={openNodeSource}
            />
          )}

        {viewMode === 'tech' && !isUser && !message.error && message.impactAnalysis && (
          <ImpactAnalysisView
            analysis={message.impactAnalysis}
            question={message.sourceQuestion}
            answer={message.content}
            mode={responseMode}
          />
        )}

        {!isUser && !message.error && (
          <>
            {message.dataDictionary ? (
              <DataDictionaryView entries={message.dataDictionary} onOpenReference={openReference} />
            ) : (
              stillFilling && <SectionPlaceholder label="Data dictionary" />
            )}
          </>
        )}

        {viewMode === 'business' && !isUser && !message.error && (
          <>
            {message.businessRules ? (
              <BusinessRulesView rules={message.businessRules} onOpenReference={openReference} />
            ) : (
              stillFilling && <SectionPlaceholder label="Business rules" />
            )}
            {message.decisionTable ? (
              <DecisionTableView rows={message.decisionTable} onOpenReference={openReference} />
            ) : (
              stillFilling && <SectionPlaceholder label="Decision table" />
            )}
            {message.businessFlow ? (
              <KeyRelationships
                relationships={toGraphRelationships(message.businessFlow)}
                view={relationshipView}
                label="Business flow"
              />
            ) : (
              stillFilling && <SectionPlaceholder label="Business flow" />
            )}
          </>
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

      <CodeReferenceModal
        isOpen={openRefChunkId !== null || openRefProgramId !== null}
        citation={openRefCitation}
        programId={openRefProgramId}
        onClose={closeReference}
      />
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)
