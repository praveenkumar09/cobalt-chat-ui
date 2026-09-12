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
}

export interface AskResponse {
  answer: string
  sources: SourceCitation[]
  graphContext: GraphRelationship[]
  chunksRetrieved: number
  followUpQuestions: string[]
}

export type SseEvent =
  | { type: 'metadata'; sources: SourceCitation[]; graphContext: GraphRelationship[]; chunksRetrieved: number }
  | { type: 'token'; content: string }
  | { type: 'correction'; sources: SourceCitation[]; graphContext: GraphRelationship[] }
  | { type: 'followups'; questions: string[] }

export type ResponseMode = 'stream' | 'complete'
