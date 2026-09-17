export type Role = 'user' | 'assistant'

export type Stage = 'thinking' | 'retrieving' | 'generating'

export interface SourceCitation {
  chunkId: string
  sourceFile: string
  programId?: string
  sectionName?: string
  sectionPurpose?: string
  lineStart?: number
  lineEnd?: number
  fileType?: string
  similarity: number
  snippet: string
}

export interface GraphRelationship {
  fromId: string
  fromLabel: string
  fromType: string
  relType: string
  toId: string
  toLabel: string
  toType: string
  /** "OUTGOING" (what the asked-about program calls, transitively), "INCOMING"
   * (what calls into it, transitively), or absent for edges with no single
   * seed program to be directional relative to (keyword fallback, business flow). */
  direction?: 'OUTGOING' | 'INCOMING' | null
}

export interface ImpactedFile {
  id: string
  label: string
  type: string
}

export interface ImpactTier {
  order: number
  nodes: ImpactedFile[]
  hasCycle: boolean
}

export interface ImpactAnalysis {
  tiers: ImpactTier[]
  truncated: boolean
}

export interface ProgramSource {
  programId: string
  sourceFile: string
  content: string
}

export interface BusinessRule {
  rule: string
  chunkId: string | null
}

export interface TechnicalRule {
  rule: string
  chunkId: string | null
}

export interface DecisionTableRow {
  condition: string
  outcome: string
  exception: string | null
  chunkId: string | null
}

export interface DataDictionaryEntry {
  term: string
  technicalName: string | null
  description: string
  chunkId: string | null
}

export interface BusinessFlowEdge {
  fromActivity: string
  relation: string
  toActivity: string
}

export interface BusinessFlow {
  edges: BusinessFlowEdge[]
}

export interface Message {
  id: string
  role: Role
  content: string
  sources?: SourceCitation[]
  graphContext?: GraphRelationship[]
  chunksRetrieved?: number
  followUpQuestions?: string[]
  isStreaming?: boolean
  stage?: Stage
  error?: boolean
  sourceQuestion?: string
  parentId?: string | null
  siblingIds?: string[]
  siblingIndex?: number
  justBranched?: boolean
  impactAnalysis?: ImpactAnalysis | null
  businessRules?: BusinessRule[]
  decisionTable?: DecisionTableRow[]
  businessFlow?: BusinessFlow | null
  dataDictionary?: DataDictionaryEntry[]
  technicalRules?: TechnicalRule[]
}

export interface AskResponse {
  answer: string
  sources: SourceCitation[]
  graphContext: GraphRelationship[]
  chunksRetrieved: number
  followUpQuestions: string[]
  impactAnalysis: ImpactAnalysis | null
  businessRules: BusinessRule[]
  decisionTable: DecisionTableRow[]
  businessFlow: BusinessFlow | null
  dataDictionary: DataDictionaryEntry[]
  technicalRules: TechnicalRule[]
}

export type SseEvent =
  | {
      type: 'metadata'
      sources: SourceCitation[]
      graphContext: GraphRelationship[]
      chunksRetrieved: number
    }
  | { type: 'token'; content: string }
  | {
      type: 'correction'
      sources: SourceCitation[]
      graphContext: GraphRelationship[]
      impactAnalysis: null
      businessRules: BusinessRule[]
      decisionTable: DecisionTableRow[]
      businessFlow: null
      dataDictionary: DataDictionaryEntry[]
      technicalRules: TechnicalRule[]
    }
  | { type: 'followups'; questions: string[] }
  | { type: 'businessRules'; rules: BusinessRule[] }
  | { type: 'decisionTable'; rows: DecisionTableRow[] }
  | { type: 'businessFlow'; flow: BusinessFlow }
  | { type: 'dataDictionary'; entries: DataDictionaryEntry[] }
  | { type: 'technicalRules'; rules: TechnicalRule[] }
  | { type: 'impactAnalysis'; analysis: ImpactAnalysis }

export type ResponseMode = 'stream' | 'complete'

// ── Persistent chat history ─────────────────────────────────────────────

export interface StoredMessagePayload {
  sources?: SourceCitation[]
  graphContext?: GraphRelationship[]
  followUpQuestions?: string[]
  error?: boolean
  impactAnalysis?: ImpactAnalysis | null
  businessRules?: BusinessRule[]
  decisionTable?: DecisionTableRow[]
  businessFlow?: BusinessFlow | null
  dataDictionary?: DataDictionaryEntry[]
  technicalRules?: TechnicalRule[]
}

export interface ConversationSummary {
  id: string
  title: string | null
  lastActiveAt: string
  messageCount: number
}

export interface ConversationListResponse {
  conversations: ConversationSummary[]
  hasMore: boolean
}

export interface ConversationMessage {
  id: string
  role: Role
  content: string
  payload: StoredMessagePayload | null
  createdAt: string
  parentId: string | null
  siblingIds: string[]
  siblingIndex: number
}

export interface ConversationDetail {
  id: string
  title: string | null
  messages: ConversationMessage[]
}

export interface FeedbackEntry {
  id: string
  userEmail: string
  question: string | null
  answerSnippet: string | null
  message: string
  createdAt: string
}

export interface FeedbackStats {
  totalCount: number
  last7DaysCount: number
  recent: FeedbackEntry[]
}

export type SecurityViolationType = 'prompt_injection' | 'pii_requested' | 'pii_provided'

export interface SecurityEvent {
  id: string
  userEmail: string
  question: string
  violationType: SecurityViolationType
  createdAt: string
}

export interface SecurityStats {
  totalCount: number
  promptInjectionCount: number
  piiRequestedCount: number
  piiProvidedCount: number
  recent: SecurityEvent[]
}
