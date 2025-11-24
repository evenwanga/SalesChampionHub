// Analytics & Statistics Types

/**
 * 知识库趋势数据
 */
export interface KBTrendData {
  period: string // 时间段 (YYYY-MM-DD)
  kb_count: number // 知识库数量
  document_count: number // 文档总数
  total_size_mb: number // 总存储大小(MB)
}

/**
 * 知识库热度数据
 */
export interface KBPopularity {
  kb_id: string
  kb_name: string
  query_count: number // 查询次数
  document_count: number // 文档数量
  last_accessed: string // 最后访问时间
}

/**
 * 查询分析数据
 */
export interface QueryAnalytics {
  period: string
  total_queries: number
  search_count: number
  ask_count: number
  avg_response_time_ms: number
  success_rate: number // 成功率 0-100
  error_count: number
}

/**
 * 时间段枚举
 */
export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all'

/**
 * 时间分组枚举
 */
export type TimeGroup = 'hour' | 'day' | 'week' | 'month'

/**
 * 搜索热词
 */
export interface SearchHotword {
  word: string
  count: number
  trend: 'up' | 'down' | 'stable' // 趋势
}

/**
 * 用户活跃度统计
 */
export interface UserActivity {
  period: string
  active_users: number // 活跃用户数
  new_users: number // 新用户数
  total_operations: number // 总操作数
}

/**
 * 功能使用统计
 */
export interface FeatureUsage {
  feature_name: string
  usage_count: number
  unique_users: number
  avg_duration_seconds: number
}

/**
 * 统计分析选项
 */
export interface AnalyticsOptions {
  time_range?: TimeRange
  group_by?: TimeGroup
  start_date?: string
  end_date?: string
}

/**
 * 总览统计数据
 */
export interface OverviewStats {
  total_kbs: number
  total_documents: number
  total_queries: number
  active_users: number
  storage_used_mb: number
  storage_limit_mb: number
  avg_response_time_ms: number
  success_rate: number
}

