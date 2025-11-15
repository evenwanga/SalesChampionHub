import api from './api'
import type {
  SearchRequest,
  SearchResponse,
  AskRequest,
  AskResponse,
  QueryLog,
  QueryHistoryOptions,
  QueryStatsOptions,
  QueryStats,
  PaginatedResponse,
  APIResponse,
  SSEEvent,
} from '@/types'
import { apiBaseUrl } from '@/utils/env'
import { getErrorMessage } from '@/utils/error'

type WindowWithLogto = Window & { __logtoAccessToken?: string }

interface BasePayloadOptions {
  query: string
  kbIds: string[]
  topK?: number
}

type SearchPayloadOptions = BasePayloadOptions & {
  type: 'search'
  minScore?: number
  searchType?: 'semantic' | 'hybrid'
}

type AskPayloadOptions = BasePayloadOptions & {
  type: 'ask' | 'stream'
  includeSources?: boolean
}

type BuildPayloadOptions = SearchPayloadOptions | AskPayloadOptions

interface EmbeddingResponse {
  embedding: number[]
}

class SearchService {
  /**
   * Perform semantic search
   */
  async search(data: SearchRequest): Promise<SearchResponse> {
    const response = await api.post<APIResponse<SearchResponse>>('/search', data)
    return response.data.data!
  }

  /**
   * Ask a question with RAG (non-streaming)
   */
  async ask(data: AskRequest): Promise<AskResponse> {
    const response = await api.post<APIResponse<AskResponse>>('/ask', data)
    return response.data.data!
  }

  /**
   * Ask a question with RAG (streaming)
   * Returns an async generator for SSE events
   */
  async *askStream(data: AskRequest): AsyncGenerator<SSEEvent> {
    const token = typeof window !== 'undefined' ? (window as WindowWithLogto).__logtoAccessToken : undefined
    const response = await fetch(`${apiBaseUrl}/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent: SSEEvent['event'] | null = null

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) {
            continue // Skip empty lines and comments
          }

          // Parse SSE format: "event: eventName" and "data: jsonData"
          if (trimmed.startsWith('event:')) {
            const eventName = trimmed.substring(6).trim()
            if (eventName === 'sources' || eventName === 'chunk' || eventName === 'done' || eventName === 'error') {
              currentEvent = eventName
            } else {
              currentEvent = null
            }
            continue
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim()

            try {
              const parsed = dataStr ? JSON.parse(dataStr) : undefined
              if (!currentEvent) {
                continue
              }

              yield { event: currentEvent, data: parsed }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, dataStr)
            } finally {
              currentEvent = null
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Get query history
   */
  async getQueryHistory(options?: QueryHistoryOptions): Promise<PaginatedResponse<QueryLog>> {
    const response = await api.get<APIResponse<{ queries: QueryLog[]; total: number; limit: number; offset: number }>>(
      '/query-history',
      { params: options }
    )

    return {
      data: response.data.data!.queries,
      meta: {
        total: response.data.data!.total,
        limit: response.data.data!.limit,
        offset: response.data.data!.offset,
      }
    }
  }

  /**
   * Get query statistics
   */
  async getQueryStats(options?: QueryStatsOptions): Promise<QueryStats[]> {
    try {
      const response = await api.get<APIResponse<{ stats: QueryStats[] }>>('/query-stats', {
        params: options,
      })
      // Handle different possible response structures
      if (response.data.data) {
        // If data has a stats property, return it
        if ('stats' in response.data.data) {
          return response.data.data.stats
        }
        // If data itself is an array, return it
        if (Array.isArray(response.data.data)) {
          return response.data.data as QueryStats[]
        }
      }
      // Fallback to empty array
      return []
    } catch (error) {
      console.warn('Query stats API failed, using fallback data:', error)
      // Return empty array on error for graceful degradation
      return []
    }
  }

  async buildQueryPayload(options: SearchPayloadOptions): Promise<SearchRequest>
  async buildQueryPayload(options: AskPayloadOptions): Promise<AskRequest>
  async buildQueryPayload(options: BuildPayloadOptions): Promise<SearchRequest | AskRequest> {
    const trimmedQuery = options.query.trim()
    if (!trimmedQuery) {
      throw new Error('请输入查询内容')
    }

    const queryVector = await this.generateEmbedding(trimmedQuery)
    const base = {
      kb_ids: options.kbIds,
      top_k: options.topK,
      query_vector: queryVector,
    }

    if (options.type === 'search') {
      return {
        ...base,
        query_text: trimmedQuery,
        min_score: options.minScore,
        search_type: options.searchType,
      }
    }

    return {
      ...base,
      question: trimmedQuery,
      include_sources: options.includeSources,
      stream: options.type === 'stream',
    }
  }

  private async generateEmbedding(query: string): Promise<number[]> {
    try {
      const response = await api.post<APIResponse<EmbeddingResponse>>('/embedding', {
        text: query,
      })
      const vector = response.data.data?.embedding
      if (!vector || vector.length === 0) {
        throw new Error('向量生成失败')
      }
      return vector
    } catch (error) {
      const message = getErrorMessage(error)
      console.error('Embedding request failed:', message)
      throw new Error('生成查询向量时出现问题，请稍后再试')
    }
  }
}

export default new SearchService()
