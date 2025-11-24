import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

interface ServiceStatus {
  available: boolean
  status: string
  latency?: string
}

interface SystemStatus {
  services: Record<string, ServiceStatus>
  timestamp: string
}

/**
 * 获取系统状态
 * @param refetchInterval 自动刷新间隔（毫秒）
 */
export const useSystemStatus = (refetchInterval?: number) => {
  return useQuery<SystemStatus>({
    queryKey: ['system-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/health')
        
        // 解析健康检查响应
        const data = response.data
        
        return {
          services: {
            database: {
              available: data.database?.status === 'healthy',
              status: data.database?.status || 'unknown',
              latency: data.database?.latency || undefined,
            },
            redis: {
              available: data.redis?.status === 'healthy',
              status: data.redis?.status || 'unknown',
              latency: data.redis?.latency || undefined,
            },
            embedding: {
              available: data.embedding?.status === 'healthy',
              status: data.embedding?.status || 'unknown',
              latency: data.embedding?.latency || undefined,
            },
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error)
        // 返回默认不可用状态
        return {
          services: {
            database: { available: false, status: 'unknown' },
            redis: { available: false, status: 'unknown' },
            embedding: { available: false, status: 'unknown' },
          },
          timestamp: new Date().toISOString(),
        }
      }
    },
    refetchInterval: refetchInterval,
    retry: 1,
  })
}
