import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import knowledgeBaseService from '@/services/knowledgeBaseService'
import type { KnowledgeBase, CreateKBRequest, UpdateKBRequest, KBListOptions } from '@/types'

/**
 * Query keys for knowledge base data
 */
export const kbKeys = {
  all: ['knowledge-bases'] as const,
  lists: () => [...kbKeys.all, 'list'] as const,
  list: (filters: KBListOptions) => [...kbKeys.lists(), filters] as const,
  details: () => [...kbKeys.all, 'detail'] as const,
  detail: (id: string) => [...kbKeys.details(), id] as const,
  accessible: () => [...kbKeys.all, 'accessible'] as const,
  stats: (id: string) => [...kbKeys.all, 'stats', id] as const,
}

/**
 * Hook to fetch knowledge base list with pagination and filtering
 */
export function useKnowledgeBases(options?: KBListOptions) {
  // Stabilize queryKey to prevent infinite loops
  const queryKey = useMemo(
    () => kbKeys.list(options || {}),
    [options?.limit, options?.offset, options?.search]
  )

  return useQuery({
    queryKey,
    queryFn: () => knowledgeBaseService.listKBs(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch a single knowledge base
 */
export function useKnowledgeBase(id: string) {
  return useQuery({
    queryKey: kbKeys.detail(id),
    queryFn: () => knowledgeBaseService.getKB(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch knowledge base statistics
 */
export function useKBStats(id: string) {
  return useQuery({
    queryKey: kbKeys.stats(id),
    queryFn: () => knowledgeBaseService.getKBStats(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes (stats change more frequently)
  })
}

/**
 * Hook to fetch accessible knowledge bases for current user
 */
export function useAccessibleKBs() {
  return useQuery({
    queryKey: kbKeys.accessible(),
    queryFn: () => knowledgeBaseService.getAccessibleKBs(),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a new knowledge base
 */
export function useCreateKB() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateKBRequest) => knowledgeBaseService.createKB(data),
    onSuccess: () => {
      // Invalidate and refetch knowledge base lists
      queryClient.invalidateQueries({ queryKey: kbKeys.lists() })
      queryClient.invalidateQueries({ queryKey: kbKeys.accessible() })
    },
  })
}

/**
 * Hook to update a knowledge base
 */
export function useUpdateKB() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKBRequest }) =>
      knowledgeBaseService.updateKB(id, data),
    onSuccess: (data: KnowledgeBase, variables) => {
      // Update cache with new data
      queryClient.setQueryData(kbKeys.detail(variables.id), data)
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: kbKeys.lists() })
    },
  })
}

/**
 * Hook to delete a knowledge base
 */
export function useDeleteKB() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => knowledgeBaseService.deleteKB(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: kbKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: kbKeys.lists() })
      queryClient.invalidateQueries({ queryKey: kbKeys.accessible() })
    },
  })
}
