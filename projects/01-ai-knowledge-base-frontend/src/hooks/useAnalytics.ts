import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import searchService from '@/services/searchService'
import knowledgeBaseService from '@/services/knowledgeBaseService'
import type {
  QueryAnalytics,
  KBPopularity,
  OverviewStats,
  TimeRange,
  AnalyticsOptions,
} from '@/types/analytics'
import { subDays, subMonths, subYears, format } from 'date-fns'

/**
 * Query keys for analytics data
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
  queryTrend: (options: AnalyticsOptions) => [...analyticsKeys.all, 'query-trend', options] as const,
  kbPopularity: (timeRange: TimeRange) => [...analyticsKeys.all, 'kb-popularity', timeRange] as const,
  searchHotwords: (timeRange: TimeRange) => [...analyticsKeys.all, 'search-hotwords', timeRange] as const,
}

/**
 * 获取时间范围的起止日期
 */
function getDateRange(timeRange: TimeRange): { start_date: string; end_date: string } {
  const now = new Date()
  const end_date = format(now, 'yyyy-MM-dd')
  
  let startDate: Date
  switch (timeRange) {
    case '24h':
      startDate = subDays(now, 1)
      break
    case '7d':
      startDate = subDays(now, 7)
      break
    case '30d':
      startDate = subDays(now, 30)
      break
    case '90d':
      startDate = subDays(now, 90)
      break
    case '1y':
      startDate = subYears(now, 1)
      break
    case 'all':
      startDate = new Date('2020-01-01')
      break
    default:
      startDate = subDays(now, 7)
  }
  
  return {
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date,
  }
}

/**
 * Hook to fetch overview statistics
 */
export function useOverviewStats() {
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // 获取知识库总数
  const { data: kbData } = useQuery({
    queryKey: ['analytics', 'kb-count'],
    queryFn: async () => {
      const result = await knowledgeBaseService.listKBs({ limit: 1 })
      return result.meta.total
    },
    staleTime: 2 * 60 * 1000,
  })
  
  // 获取所有知识库（用于文档汇总）
  const { data: allKBsData } = useQuery({
    queryKey: ['analytics', 'all-kbs'],
    queryFn: async () => {
      const result = await knowledgeBaseService.listKBs({ limit: 100 })
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })
  
  // 获取查询统计
  const { data: queryStats } = useQuery({
    queryKey: ['analytics', 'query-stats-overview'],
    queryFn: async () => {
      return await searchService.getQueryStats({
        start_date: today,
        end_date: today,
        group_by: 'day',
      })
    },
    staleTime: 1 * 60 * 1000,
  })
  
  const overviewStats: OverviewStats = useMemo(() => {
    const totalDocs = allKBsData?.reduce((sum, kb) => sum + (kb.document_count || 0), 0) || 0
    const todayStats = queryStats?.[0]
    
    return {
      total_kbs: kbData || 0,
      total_documents: totalDocs,
      total_queries: todayStats?.total_queries || 0,
      active_users: 0, // TODO: 需要后端支持
      storage_used_mb: 0, // TODO: 需要后端支持
      storage_limit_mb: 1000, // TODO: 需要后端支持
      avg_response_time_ms: todayStats?.avg_processing_time_ms || 0,
      success_rate: 95, // TODO: 需要后端支持
    }
  }, [kbData, allKBsData, queryStats])
  
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: () => Promise.resolve(overviewStats),
    staleTime: 1 * 60 * 1000,
    enabled: true,
  })
}

/**
 * Hook to fetch query trend data
 */
export function useQueryTrend(options: AnalyticsOptions = {}) {
  const timeRange = options.time_range || '7d'
  const groupBy = options.group_by || (timeRange === '24h' ? 'hour' : 'day')
  const { start_date, end_date } = options.start_date && options.end_date
    ? { start_date: options.start_date, end_date: options.end_date }
    : getDateRange(timeRange)
  
  return useQuery({
    queryKey: analyticsKeys.queryTrend({ ...options, time_range: timeRange }),
    queryFn: async (): Promise<QueryAnalytics[]> => {
      const stats = await searchService.getQueryStats({
        start_date,
        end_date,
        group_by: groupBy as 'day' | 'week' | 'month',
      })
      
      // 转换为QueryAnalytics格式
      return stats.map(stat => ({
        period: stat.period,
        total_queries: stat.total_queries,
        search_count: stat.search_count,
        ask_count: stat.ask_count,
        avg_response_time_ms: stat.avg_processing_time_ms || 0,
        success_rate: 95, // TODO: 需要后端支持
        error_count: 0, // TODO: 需要后端支持
      }))
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch knowledge base popularity
 */
export function useKBPopularity(timeRange: TimeRange = '7d') {
  return useQuery({
    queryKey: analyticsKeys.kbPopularity(timeRange),
    queryFn: async (): Promise<KBPopularity[]> => {
      // 获取所有知识库
      const result = await knowledgeBaseService.listKBs({ limit: 100 })
      
      // 模拟热度数据（实际应该从后端获取）
      // TODO: 需要后端提供知识库使用统计接口
      return result.data.map(kb => ({
        kb_id: kb.id,
        kb_name: kb.name,
        query_count: Math.floor(Math.random() * 1000), // 模拟数据
        document_count: kb.document_count || 0,
        last_accessed: kb.updated_at || kb.created_at,
      })).sort((a, b) => b.query_count - a.query_count).slice(0, 10)
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for search hotwords
 * TODO: 需要后端支持搜索热词统计
 */
export function useSearchHotwords(timeRange: TimeRange = '7d') {
  return useQuery({
    queryKey: analyticsKeys.searchHotwords(timeRange),
    queryFn: async () => {
      // 模拟数据，实际应该从后端获取
      return [
        { word: 'API文档', count: 156, trend: 'up' as const },
        { word: '配置指南', count: 142, trend: 'up' as const },
        { word: '故障排查', count: 128, trend: 'stable' as const },
        { word: '最佳实践', count: 95, trend: 'down' as const },
        { word: '快速开始', count: 87, trend: 'up' as const },
        { word: '部署文档', count: 76, trend: 'stable' as const },
        { word: '性能优化', count: 64, trend: 'up' as const },
        { word: '安全配置', count: 52, trend: 'stable' as const },
      ]
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook for document growth trend
 */
export function useDocumentGrowth(timeRange: TimeRange = '30d') {
  return useQuery({
    queryKey: ['analytics', 'document-growth', timeRange],
    queryFn: async () => {
      // TODO: 需要后端提供文档增长趋势接口
      // 暂时返回模拟数据
      const { start_date, end_date } = getDateRange(timeRange)
      const start = new Date(start_date)
      const end = new Date(end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      return Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        return {
          period: format(date, 'yyyy-MM-dd'),
          document_count: Math.floor(Math.random() * 20) + 10,
          kb_count: Math.floor(Math.random() * 3) + 1,
        }
      })
    },
    staleTime: 5 * 60 * 1000,
  })
}

