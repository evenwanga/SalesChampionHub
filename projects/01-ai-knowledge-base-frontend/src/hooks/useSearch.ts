import { useMutation } from '@tanstack/react-query'
import searchService from '@/services/searchService'
import type { SearchResponse } from '@/types'

export interface SemanticSearchInput {
  query: string
  kbIds: string[]
  topK?: number
  searchType?: 'semantic' | 'hybrid'
  minScore?: number
}

/**
 * Hook to perform semantic search
 */
export function useSearch() {
  return useMutation({
    mutationFn: async ({ query, kbIds, topK, minScore, searchType }: SemanticSearchInput) => {
      const payload = await searchService.buildQueryPayload({
        type: 'search',
        query,
        kbIds,
        topK,
        minScore,
        searchType,
      })
      return searchService.search(payload)
    },
  })
}

/**
 * Hook to get last search results (for optimization)
 */
export function useLastSearch() {
  let lastSearchResults: SearchResponse | null = null

  return {
    getLastResults: () => lastSearchResults,
    setLastResults: (results: SearchResponse | null) => {
      lastSearchResults = results
    }
  }
}
