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
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/ask-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
            // Event line - we'll combine it with the next data line
            continue
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim()

            try {
              const eventData = JSON.parse(dataStr)

              // Determine event type from the data structure
              let event: SSEEvent
              if (eventData.sources) {
                event = { event: 'sources', data: eventData.sources }
              } else if (eventData.chunk !== undefined) {
                event = { event: 'chunk', data: eventData.chunk }
              } else if (eventData.total_chunks !== undefined) {
                event = { event: 'done', data: eventData }
              } else if (eventData.error) {
                event = { event: 'error', data: eventData }
              } else {
                continue // Unknown event type
              }

              yield event
            } catch (e) {
              console.error('Failed to parse SSE data:', e, dataStr)
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
}

export default new SearchService()
