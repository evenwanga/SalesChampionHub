import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { monitoringService } from '@/services/monitoringService'
import type { SystemStatus as MonitoringSystemStatus, ServiceInfo } from '@/types/monitoring'

interface ServiceStatus {
  available: boolean
  status: string
  latency?: string
  message?: string
}

interface SimpleSystemStatus {
  services: Record<string, ServiceStatus>
  timestamp: string
  uptime?: string
  version?: string
  system?: MonitoringSystemStatus['system']
  runtime?: MonitoringSystemStatus['runtime']
  status?: string
}

/**
 * 获取系统状态
 * @param refetchInterval 自动刷新间隔（毫秒）
 */
export const useSystemStatus = (refetchInterval?: number) => {
  return useQuery<SimpleSystemStatus>({
    queryKey: ['system-status'],
    queryFn: async () => {
      try {
        // 优先使用正式的系统状态接口
        const systemStatus = await monitoringService.getSystemStatus()

        const services: Record<string, ServiceStatus> = {}
        Object.entries(systemStatus.services || {}).forEach(([name, svc]: [string, ServiceInfo]) => {
          services[name] = {
            available: svc.available ?? (svc.status === 'healthy' || svc.status === 'ok'),
            status: svc.status || 'unknown',
            latency: svc.latency,
            message: svc.message,
          }
        })

        const expected = ['database', 'redis', 'embedding']
        expected.forEach((key) => {
          if (!services[key]) {
            services[key] = { available: false, status: 'unknown' }
          }
        })

        return {
          services,
          timestamp: systemStatus.timestamp || new Date().toISOString(),
          uptime: systemStatus.uptime,
          version: systemStatus.version,
          system: systemStatus.system,
          runtime: systemStatus.runtime,
          status: systemStatus.status,
        }
      } catch (error) {
        console.error('Failed to fetch system status, falling back to /health:', error)
        // 兜底：使用健康检查接口
        const response = await api.get('/health')
        const data = response.data
        const services: Record<string, ServiceStatus> = {}

        // 优先解析 data.services（如 {"database":"up","redis":"up"} 或包含对象）
        if (data?.services && typeof data.services === 'object') {
          Object.entries(data.services).forEach(([name, svc]: [string, any]) => {
            if (typeof svc === 'string') {
              services[name] = {
                available: ['up', 'healthy', 'ok'].includes(svc.toLowerCase()),
                status: svc,
              }
            } else if (svc && typeof svc === 'object') {
              services[name] = {
                available: svc.available ?? ['healthy', 'ok', 'up'].includes((svc.status || '').toLowerCase()),
                status: svc.status || 'unknown',
                latency: svc.latency,
                message: svc.message,
              }
            }
          })
        }

        // 兼容旧格式：顶层字段 database/redis/embedding
        if (Object.keys(services).length === 0) {
          const candidates = ['database', 'redis', 'embedding']
          candidates.forEach((key) => {
            const svc = (data as any)?.[key]
            if (svc) {
              if (typeof svc === 'string') {
                services[key] = {
                  available: ['up', 'healthy', 'ok'].includes(svc.toLowerCase()),
                  status: svc,
                }
              } else if (typeof svc === 'object') {
                services[key] = {
                  available: svc.available ?? ['healthy', 'ok', 'up'].includes((svc.status || '').toLowerCase()),
                  status: svc.status || 'unknown',
                  latency: svc.latency,
                  message: svc.message,
                }
              }
            }
          })
        }

        const expected = ['database', 'redis', 'embedding']
        expected.forEach((key) => {
          if (!services[key]) {
            services[key] = { available: false, status: 'unknown' }
          }
        })

        return {
          services,
          timestamp: new Date().toISOString(),
        }
      }
    },
    refetchInterval: refetchInterval,
    retry: 1,
  })
}
