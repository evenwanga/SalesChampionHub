import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useKnowledgeBases } from './useKnowledgeBases'
import searchService from '@/services/searchService'
import knowledgeBaseService from '@/services/knowledgeBaseService'
import documentService from '@/services/documentService'
import type { QueryStats as QueryStatsType } from '@/types'

interface DashboardStats {
  totalKBs: number
  totalDocuments: number
  todaySearches: number
  todayQuestions: number
  loading: boolean
  error: Error | null
}

const normalizeError = (err: unknown): Error | null => {
  if (!err) return null
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  if (typeof err === 'object') {
    const maybeMessage = (err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error
    if (maybeMessage) {
      return new Error(maybeMessage)
    }
  }
  return new Error('获取统计数据失败')
}

/**
 * Dashboard 统计数据 Hook
 * 获取工作台的各项统计数据
 */
export const useDashboardStats = (): DashboardStats => {
  const today = format(new Date(), 'yyyy-MM-dd')

  // 获取知识库列表
  const { data: kbData, isLoading: kbLoading, error: kbError } = useKnowledgeBases({
    limit: 100,
    offset: 0,
  })

  // 获取今日查询统计
  const { data: queryStats, isLoading: queryLoading, error: queryError } = useQuery<QueryStatsType | null>({
    queryKey: ['dashboard', 'query-stats', today],
    queryFn: async () => {
      const stats = await searchService.getQueryStats({
        start_date: today,
        end_date: today,
        group_by: 'day',
      })
      return stats?.[0] ?? null
    },
    staleTime: 60 * 1000, // 今日数据更频繁刷新
  })

  // 计算总文档数
  const { data: docsTotal = 0, isLoading: docsLoading, error: docsError } = useQuery({
    queryKey: ['dashboard', 'kb-docs-total', kbData?.data?.map(kb => kb.id).join(',')],
    enabled: !!kbData?.data?.length,
    queryFn: async () => {
      const totals = await Promise.allSettled(
        (kbData?.data || []).map(async (kb) => {
          const res = await documentService.listDocuments({ kb_id: kb.id, limit: 1, offset: 0 })
          return res.meta.total || 0
        })
      )

      return totals.reduce((sum, result) => {
        if (result.status === 'fulfilled') {
          return sum + result.value
        }
        return sum
      }, 0)
    },
    staleTime: 60 * 1000, // 文档数量变化相对频繁，保持较短缓存
  })

  // KB stats 作为兜底（若后端修复后可移除）
  const { data: kbDocsTotal = 0, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard', 'kb-stats-docs-total', kbData?.data?.map(kb => kb.id).join(',')],
    enabled: !!kbData?.data?.length,
    queryFn: async () => {
      const stats = await Promise.all(
        (kbData?.data || []).map(kb => knowledgeBaseService.getKBStats(kb.id))
      )
      return stats.reduce((sum, stat) => sum + (stat?.total_documents || 0), 0)
    },
    staleTime: 2 * 60 * 1000,
  })

  const fallbackDocsTotal = kbData?.data?.reduce(
    (sum, kb) => sum + (kb.document_count || 0),
    0
  ) || 0

  const totalDocuments = docsTotal || kbDocsTotal || fallbackDocsTotal

  const totalKBs = kbData?.meta?.total || 0

  const todaySearches = queryStats?.search_count || 0
  const todayQuestions = queryStats?.ask_count || 0

  return {
    totalKBs,
    totalDocuments,
    todaySearches,
    todayQuestions,
    loading: kbLoading || queryLoading || docsLoading || statsLoading,
    error: normalizeError(kbError) || normalizeError(queryError) || normalizeError(docsError) || normalizeError(statsError),
  }
}
