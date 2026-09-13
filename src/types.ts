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

export interface DecisionTableRow {
  condition: string
  outcome: string
  exception: string | null
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
  businessRules?: string[]
  decisionTable?: DecisionTableRow[]
  businessFlow?: BusinessFlow | null
}

export interface AskResponse {
  answer: string
  sources: SourceCitation[]
  graphContext: GraphRelationship[]
  chunksRetrieved: number
  followUpQuestions: string[]
  impactAnalysis: ImpactAnalysis | null
  businessRules: string[]
  decisionTable: DecisionTableRow[]
  businessFlow: BusinessFlow | null
}

export type SseEvent =
  | {
      type: 'metadata'
      sources: SourceCitation[]
      graphContext: GraphRelationship[]
      chunksRetrieved: number
      impactAnalysis?: ImpactAnalysis
    }
  | { type: 'token'; content: string }
  | {
      type: 'correction'
      sources: SourceCitation[]
      graphContext: GraphRelationship[]
      impactAnalysis: null
      businessRules: string[]
      decisionTable: DecisionTableRow[]
      businessFlow: null
    }
  | { type: 'followups'; questions: string[] }
  | { type: 'businessRules'; rules: string[] }
  | { type: 'decisionTable'; rows: DecisionTableRow[] }
  | { type: 'businessFlow'; flow: BusinessFlow }

export type ResponseMode = 'stream' | 'complete'

// ── Persistent chat history ─────────────────────────────────────────────

export interface StoredMessagePayload {
  sources?: SourceCitation[]
  graphContext?: GraphRelationship[]
  followUpQuestions?: string[]
  error?: boolean
  impactAnalysis?: ImpactAnalysis | null
  businessRules?: string[]
  decisionTable?: DecisionTableRow[]
  businessFlow?: BusinessFlow | null
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
