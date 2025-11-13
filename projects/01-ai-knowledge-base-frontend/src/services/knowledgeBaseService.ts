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
    const response = await api.get<APIResponse<{
      knowledge_bases: KnowledgeBase[]
      total: number
      limit: number
      offset: number
    }>>(
      '/knowledge-bases',
      { params: options }
    )

    // 适配后端响应结构到前端期望的格式
    const backendData = response.data.data!
    return {
      data: backendData.knowledge_bases || [],
      meta: {
        total: backendData.total || 0,
        limit: backendData.limit || 10,
        offset: backendData.offset || 0
      }
    }
  }

  /**
   * Get knowledge base by ID
   */
  async getKB(id: string): Promise<KnowledgeBase> {
    const response = await api.get<APIResponse<{
      knowledge_base: KnowledgeBase
      stats?: KBStats
    }>>(`/knowledge-bases/${id}`)
    return response.data.data!.knowledge_base
  }

  /**
   * Create a new knowledge base
   */
  async createKB(data: CreateKBRequest): Promise<KnowledgeBase> {
    const response = await api.post<APIResponse<{ knowledge_base: KnowledgeBase }>>('/knowledge-bases', data)
    return response.data.data!.knowledge_base
  }

  /**
   * Update a knowledge base
   */
  async updateKB(id: string, data: UpdateKBRequest): Promise<KnowledgeBase> {
    const response = await api.put<APIResponse<{ knowledge_base: KnowledgeBase }>>(`/knowledge-bases/${id}`, data)
    return response.data.data!.knowledge_base
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
    const response = await api.get<APIResponse<{ knowledge_bases: KnowledgeBase[]; total: number }>>('/user/accessible-kbs')
    return response.data.data?.knowledge_bases || []
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
