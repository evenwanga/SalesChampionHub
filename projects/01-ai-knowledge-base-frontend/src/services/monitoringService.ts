import api from './api'
import type { APIResponse } from '@/types'
import type { SystemStatus, MetricsSnapshot } from '@/types/monitoring'

/**
 * 监控服务 - 提供系统监控相关接口
 */
export const monitoringService = {
  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await api.get<APIResponse<SystemStatus>>('/system/status')
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '获取系统状态失败')
    }
    return response.data.data
  },

  /**
   * 获取指标快照
   */
  async getMetricsSnapshot(): Promise<MetricsSnapshot> {
    const response = await api.get<APIResponse<MetricsSnapshot>>('/system/metrics')
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '获取指标快照失败')
    }
    return response.data.data
  },

  /**
   * 获取健康状态
   */
  async getHealthCheck(): Promise<any> {
    const response = await api.get('/health')
    return response.data
  },
}

