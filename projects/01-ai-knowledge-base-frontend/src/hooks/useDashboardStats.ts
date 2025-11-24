import { useState, useEffect } from 'react'
import { useKnowledgeBases } from './useKnowledgeBases'

interface DashboardStats {
  totalKBs: number
  totalDocuments: number
  todaySearches: number
  todayQuestions: number
  loading: boolean
  error: Error | null
}

/**
 * Dashboard 统计数据 Hook
 * 获取工作台的各项统计数据
 */
export const useDashboardStats = (): DashboardStats => {
  const [todaySearches, setTodaySearches] = useState(0)
  const [todayQuestions, setTodayQuestions] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  // 获取知识库列表
  const { data: kbData, isLoading: kbLoading, error: kbError } = useKnowledgeBases({
    limit: 100,
    offset: 0,
  })

  // 计算总文档数
  const totalDocuments = kbData?.data?.reduce(
    (sum, kb) => sum + (kb.document_count || 0),
    0
  ) || 0

  const totalKBs = kbData?.meta?.total || 0

  // 模拟获取今日搜索和提问次数（实际应该从后端 API 获取）
  useEffect(() => {
    // TODO: 从后端 API 获取今日统计数据
    // 这里暂时使用模拟数据
    const fetchTodayStats = async () => {
      try {
        // 模拟 API 调用延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 模拟数据 - 实际应该调用真实 API
        setTodaySearches(Math.floor(Math.random() * 50))
        setTodayQuestions(Math.floor(Math.random() * 30))
      } catch (err) {
        setError(err as Error)
      }
    }

    fetchTodayStats()
  }, [])

  return {
    totalKBs,
    totalDocuments,
    todaySearches,
    todayQuestions,
    loading: kbLoading,
    error: kbError || error,
  }
}
