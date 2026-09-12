export type Role = 'user' | 'assistant'

export type Stage = 'thinking' | 'retrieving' | 'generating'

export interface Message {
  id: string
  role: Role
  content: string
  sources?: string[]
  graphContext?: string[]
  chunksRetrieved?: number
  isStreaming?: boolean
  stage?: Stage
  error?: boolean
}

export interface AskResponse {
  answer: string
  sources: string[]
  graphContext: string[]
  chunksRetrieved: number
}

export type SseEvent =
  | { type: 'metadata'; sources: string[]; graphContext: string[]; chunksRetrieved: number }
  | { type: 'token'; content: string }

export type ResponseMode = 'stream' | 'complete'
