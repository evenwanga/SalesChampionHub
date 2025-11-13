import { useMutation } from '@tanstack/react-query'
import searchService from '@/services/searchService'
import type { SearchRequest, SearchResponse } from '@/types'

/**
 * Hook to perform semantic search
 */
export function useSearch() {
  return useMutation({
    mutationFn: (data: SearchRequest) => searchService.search(data),
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
