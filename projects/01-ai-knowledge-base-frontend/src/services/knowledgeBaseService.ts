import api from './api'
import type {
  KnowledgeBase,
  CreateKBRequest,
  UpdateKBRequest,
  KBStats,
  KBListOptions,
  PaginatedResponse,
  MountRequest,
  Mount,
  APIResponse,
} from '@/types'

class KnowledgeBaseService {
  /**
   * List knowledge bases
   */
  async listKBs(options?: KBListOptions): Promise<PaginatedResponse<KnowledgeBase>> {
    const response = await api.get<APIResponse<PaginatedResponse<KnowledgeBase>>>(
      '/knowledge-bases',
      { params: options }
    )
    return response.data.data!
  }

  /**
   * Get knowledge base by ID
   */
  async getKB(id: string): Promise<KnowledgeBase> {
    const response = await api.get<APIResponse<KnowledgeBase>>(`/knowledge-bases/${id}`)
    return response.data.data!
  }

  /**
   * Create a new knowledge base
   */
  async createKB(data: CreateKBRequest): Promise<KnowledgeBase> {
    const response = await api.post<APIResponse<KnowledgeBase>>('/knowledge-bases', data)
    return response.data.data!
  }

  /**
   * Update a knowledge base
   */
  async updateKB(id: string, data: UpdateKBRequest): Promise<KnowledgeBase> {
    const response = await api.put<APIResponse<KnowledgeBase>>(`/knowledge-bases/${id}`, data)
    return response.data.data!
  }

  /**
   * Delete a knowledge base (soft delete)
   */
  async deleteKB(id: string): Promise<void> {
    await api.delete(`/knowledge-bases/${id}`)
  }

  /**
   * Get knowledge base statistics
   */
  async getKBStats(id: string): Promise<KBStats> {
    const response = await api.get<APIResponse<KBStats>>(`/knowledge-bases/${id}/stats`)
    return response.data.data!
  }

  /**
   * Get user's accessible knowledge bases
   */
  async getAccessibleKBs(): Promise<KnowledgeBase[]> {
    const response = await api.get<APIResponse<KnowledgeBase[]>>('/user/accessible-kbs')
    return response.data.data!
  }

  /**
   * Mount KB to tenant
   */
  async mountKBToTenant(data: MountRequest): Promise<Mount> {
    const response = await api.post<APIResponse<Mount>>('/mounts/tenant', data)
    return response.data.data!
  }

  /**
   * Mount KB to organization
   */
  async mountKBToOrganization(data: MountRequest): Promise<Mount> {
    const response = await api.post<APIResponse<Mount>>('/mounts/organization', data)
    return response.data.data!
  }

  /**
   * Mount KB to user
   */
  async mountKBToUser(data: MountRequest): Promise<Mount> {
    const response = await api.post<APIResponse<Mount>>('/mounts/user', data)
    return response.data.data!
  }

  /**
   * Unmount KB
   */
  async unmount(mountId: string): Promise<void> {
    await api.delete(`/mounts/${mountId}`)
  }
}

export default new KnowledgeBaseService()
