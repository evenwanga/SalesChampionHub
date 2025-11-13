import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import searchService from '@/services/searchService'
import type { AskRequest, QueryHistoryOptions, QueryStatsOptions, QueryStats } from '@/types'

/**
 * Query keys for RAG data
 */
export const ragKeys = {
  all: ['rag'] as const,
  queryHistory: (options?: QueryHistoryOptions) => [...ragKeys.all, 'history', options] as const,
  queryStats: (options?: QueryStatsOptions) => [...ragKeys.all, 'stats', options] as const,
}

/**
 * Hook to ask question (non-streaming)
 */
export function useAsk() {
  return useMutation({
    mutationFn: (data: AskRequest) => searchService.ask(data),
  })
}

/**
 * Hook to get query history
 */
export function useQueryHistory(options?: QueryHistoryOptions) {
  // Stabilize queryKey to prevent infinite loops
  const queryKey = useMemo(
    () => ragKeys.queryHistory(options),
    [options?.limit, options?.offset]
  )

  return useQuery({
    queryKey,
    queryFn: () => searchService.getQueryHistory(options),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get query statistics
 */
export function useQueryStats(options?: QueryStatsOptions) {
  // Stabilize queryKey to prevent infinite loops
  const queryKey = useMemo(
    () => ragKeys.queryStats(options),
    [options?.start_date, options?.end_date, options?.group_by]
  )

  return useQuery<QueryStats[]>({
    queryKey,
    queryFn: async (): Promise<QueryStats[]> => {
      try {
        return await searchService.getQueryStats(options)
      } catch (error) {
        // 优雅降级：如果API失败，返回空数组而不是抛出错误
        console.warn('Query stats API failed, using fallback data:', error)
        return []
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // 不重试，直接使用fallback
  })
}
