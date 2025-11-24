import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import documentService from '@/services/documentService'
import type { DocumentListOptions, UpdateDocumentStatusRequest, BatchUpdateStatusRequest } from '@/types'

/**
 * Query keys for document data
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: DocumentListOptions) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
}

/**
 * Hook to fetch document list with pagination and filtering
 */
export function useDocuments(options: DocumentListOptions) {
  return useQuery({
    queryKey: documentKeys.list(options),
    queryFn: () => documentService.listDocuments(options),
    enabled: !!options.kb_id,
    staleTime: 2 * 60 * 1000, // 2 minutes (documents change frequently)
  })
}

/**
 * Hook to fetch a single document
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentService.getDocument(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ kbId, file, checkDuplicate }: { kbId: string; file: File; checkDuplicate?: boolean }) =>
      documentService.uploadDocument(kbId, file, checkDuplicate),
    onSuccess: (_data, variables) => {
      // Invalidate document lists for this KB
      queryClient.invalidateQueries({
        queryKey: documentKeys.lists(),
        predicate: (query) => {
          const queryKey = query.queryKey as ReturnType<typeof documentKeys.list>
          return queryKey[2]?.kb_id === variables.kbId
        }
      })
    },
  })
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to batch delete documents
 */
export function useBatchDeleteDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentIds: string[]) => documentService.batchDeleteDocuments(documentIds),
    onSuccess: () => {
      // Invalidate all document lists
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to update document status
 */
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentStatusRequest }) =>
      documentService.updateDocumentStatus(id, data),
    onSuccess: (_data, variables) => {
      // Invalidate the specific document and all lists
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to batch update document status
 */
export function useBatchUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BatchUpdateStatusRequest) => 
      documentService.batchUpdateStatus(data),
    onSuccess: () => {
      // Invalidate all document lists
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to preview a document
 */
export function useDocumentPreview(id: string | null) {
  return useQuery({
    queryKey: ['document-preview', id],
    queryFn: () => documentService.previewDocument(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch document chunks
 */
export function useDocumentChunks(documentId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['document-chunks', documentId, limit],
    queryFn: () => documentService.listDocumentChunks(documentId!, limit, 0),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  })
}
