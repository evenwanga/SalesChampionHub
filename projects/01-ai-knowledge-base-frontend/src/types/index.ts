// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  error_code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// User and Auth Types
export interface UserInfo {
  id: string
  username: string
  email: string
  tenant_id: string
  tenant_name: string
  organization_id?: string
  organization_name?: string
  roles: string[]
  permissions: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

// Knowledge Base Types
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  owner_type?: 'tenant' | 'organization' | 'user'  // Optional for backward compatibility
  owner_id: string
  created_by?: string
  visibility: 'public' | 'private' | 'organization'
  embedding_model: string
  metadata: Record<string, unknown>
  is_active?: boolean
  document_count?: number
  chunk_count?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface CreateKBRequest {
  name: string
  description?: string
  owner_type: 'tenant' | 'organization' | 'user'
  owner_id: string
  visibility?: 'public' | 'private' | 'organization'
  embedding_model?: string
  metadata?: Record<string, unknown>
}

export interface UpdateKBRequest {
  name?: string
  description?: string
  visibility?: 'public' | 'private' | 'organization'
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export interface KBStats {
  kb_id: string
  total_documents: number
  total_chunks: number
  total_size: number
  last_updated: string
}

export interface KBListOptions {
  owner_type?: 'tenant' | 'organization' | 'user'
  owner_id?: string
  limit?: number
  offset?: number
  search?: string
}

// Mount Types
export interface Mount {
  id: string
  kb_id: string
  mount_type: 'tenant' | 'organization' | 'user'
  mount_target_id: string
  permissions: string[]
  created_by: string
  created_at: string
}

export interface MountRequest {
  kb_id: string
  mount_target_id: string
  permissions?: string[]
}

// Document Types
export interface Document {
  id: string
  kb_id: string
  filename: string
  file_type: string
  file_size: number
  file_path: string
  content_preview: string
  uploaded_by: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  metadata: Record<string, unknown>
  chunk_count?: number
  processed_at?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface UploadDocumentRequest {
  kb_id: string
  file: File
  check_duplicate?: boolean
}

export interface DocumentListOptions {
  kb_id: string
  limit?: number
  offset?: number
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  file_type?: string
  search?: string
}

export interface UpdateDocumentStatusRequest {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  set_processed_at?: boolean
}

export interface BatchDeleteRequest {
  document_ids: string[]
}

export interface BatchDeleteResponse {
  success_count: number
  failed_count: number
  failed_ids?: string[]
}

// Chunk Types
export interface Chunk {
  id: string
  document_id: string
  kb_id: string
  content: string
  chunk_index: number
  token_count: number
  metadata: Record<string, unknown>
  created_at: string
}

// Search and RAG Types
export interface SearchRequest {
  query: string
  kb_ids: string[]
  top_k?: number
  min_score?: number
  filters?: Record<string, unknown>
}

export interface SearchResult {
  chunk_id: string
  document_id: string
  kb_id: string
  content: string
  score: number
  document: {
    filename: string
    file_type: string
  }
  metadata: Record<string, unknown>
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  kb_ids: string[]
  total: number
  processing_time_ms: number
}

export interface AskRequest {
  question: string
  kb_ids: string[]
  top_k?: number
  include_sources?: boolean
  stream?: boolean
}

export interface AskResponse {
  answer: string
  sources: SearchResult[]
  query: string
  kb_ids: string[]
  processing_time_ms: number
}

// Query Log Types
export interface QueryLog {
  id: number
  tenant_id: string
  user_id: string
  query_text: string // 匹配后端字段名
  query_type: 'search' | 'ask'
  kb_ids: string[]
  result_count: number
  latency_ms: number // 匹配后端字段名
  created_at: string
}

export interface QueryHistoryOptions {
  limit?: number
  offset?: number
}

export interface QueryStatsOptions {
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
}

export interface QueryStats {
  period: string
  total_queries: number
  avg_processing_time_ms: number
  search_count: number
  ask_count: number
}

// SSE Event Types (for streaming responses)
export interface SSEEvent {
  event: 'sources' | 'chunk' | 'done' | 'error'
  data: unknown
}

export interface SSESourcesEvent extends SSEEvent {
  event: 'sources'
  data: SearchResult[]
}

export interface SSEChunkEvent extends SSEEvent {
  event: 'chunk'
  data: string
}

export interface SSEDoneEvent extends SSEEvent {
  event: 'done'
  data: {
    total_chunks: number
    processing_time_ms: number
  }
}

export interface SSEErrorEvent extends SSEEvent {
  event: 'error'
  data: {
    error: string
    message: string
  }
}
