import api from './api'
import type {
  Document,
  DocumentListOptions,
  UpdateDocumentStatusRequest,
  BatchDeleteResponse,
  BatchUpdateStatusRequest,
  BatchUpdateStatusResponse,
  DocumentPreview,
  DocumentChunksResponse,
  PaginatedResponse,
  APIResponse,
} from '@/types'

class DocumentService {
  /**
   * Upload a document
   */
  async uploadDocument(kbId: string, file: File, checkDuplicate = false): Promise<Document> {
    const formData = new FormData()
    formData.append('kb_id', kbId)
    formData.append('file', file)
    formData.append('check_duplicate', String(checkDuplicate))

    const response = await api.post<Document>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  /**
   * List documents in a knowledge base
   */
  async listDocuments(options: DocumentListOptions): Promise<PaginatedResponse<Document>> {
    const response = await api.get<APIResponse<{ documents: Document[]; total: number; limit: number; offset: number }>>(
      '/documents',
      { params: options }
    )

    return {
      data: response.data.data!.documents,
      meta: {
        total: response.data.data!.total,
        limit: response.data.data!.limit,
        offset: response.data.data!.offset,
      }
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await api.get<APIResponse<Document>>(`/documents/${id}`)
    return response.data.data!
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`)
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(id: string, data: UpdateDocumentStatusRequest): Promise<void> {
    await api.put(`/documents/${id}/status`, data)
  }

  /**
   * Batch delete documents
   */
  async batchDeleteDocuments(documentIds: string[]): Promise<BatchDeleteResponse> {
    const response = await api.post<APIResponse<BatchDeleteResponse>>('/documents/batch-delete', {
      document_ids: documentIds,
    })
    return response.data.data!
  }

  /**
   * Batch update document status
   */
  async batchUpdateStatus(data: BatchUpdateStatusRequest): Promise<BatchUpdateStatusResponse> {
    const response = await api.post<APIResponse<BatchUpdateStatusResponse>>(
      '/documents/batch-update-status',
      data
    )
    return response.data.data!
  }

  /**
   * Preview document content
   */
  async previewDocument(id: string): Promise<DocumentPreview> {
    const response = await api.get<APIResponse<DocumentPreview>>(`/documents/${id}/preview`)
    return response.data.data!
  }

  /**
   * Download document
   */
  downloadDocument(id: string, filename: string): void {
    const token = (window as any).__logtoAccessToken
    const url = `${api.defaults.baseURL}/documents/${id}/download`
    
    // Create temporary link and fetch with authorization
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      })
      .catch(error => {
        console.error('Download failed:', error)
        throw error
      })
  }

  /**
   * List document chunks
   */
  async listDocumentChunks(
    documentId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<DocumentChunksResponse> {
    const response = await api.get<APIResponse<DocumentChunksResponse>>(
      `/documents/${documentId}/chunks`,
      { params: { limit, offset } }
    )
    return response.data.data!
  }
}

export default new DocumentService()
