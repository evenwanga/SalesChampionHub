import { Database, FileText, Search, HelpCircle, TrendingUp, Activity } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useSystemStatus } from '@/hooks/useMonitoring'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const Dashboard: React.FC = () => {
  // 使用专门的Dashboard统计Hook
  const { totalKBs, totalDocuments, todaySearches, todayQuestions, loading, error } = useDashboardStats()
  
  // 获取系统状态
  const { data: systemStatus, isLoading: systemLoading } = useSystemStatus(10000)

  // 配置统计卡片
  const stats = [
    {
      title: '知识库',
      value: loading ? '...' : totalKBs.toString(),
      description: '当前管理的知识库数量',
      icon: Database,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: '文档总数',
      value: loading ? '...' : totalDocuments.toString(),
      description: '已上传的文档总数',
      icon: FileText,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: '今日搜索',
      value: loading ? '...' : todaySearches.toString(),
      description: '今天的搜索请求次数',
      icon: Search,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
      trend: todaySearches > 0 ? `+${todaySearches}` : '',
    },
    {
      title: '今日提问',
      value: loading ? '...' : todayQuestions.toString(),
      description: '今天的智能问答次数',
      icon: HelpCircle,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
      trend: todayQuestions > 0 ? `+${todayQuestions}` : '',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
        <p className="text-muted-foreground">欢迎回来，这里是您的工作概览</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            加载统计数据失败：{error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                    {stat.trend && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>{stat.trend} 今日</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* System Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            系统状态
          </CardTitle>
          <CardDescription>实时监控系统运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          {systemLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : systemStatus ? (
            <div className="space-y-2">
              {Object.entries(systemStatus.services).map(([name, service], index, arr) => {
                const isLast = index === arr.length - 1
                const statusColor = service.available ? 'bg-green-500' : 'bg-red-500'
                const statusText = service.available ? service.status : '不可用'
                
                // 服务名称映射
                const serviceNames: Record<string, string> = {
                  'database': '数据库',
                  'redis': 'Redis缓存',
                  'embedding': '向量化服务'
                }
                const displayName = serviceNames[name] || name
                
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between py-2 ${!isLast ? 'border-b' : ''}`}
                  >
                    <span className="text-sm text-muted-foreground">{displayName}</span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${statusColor} ${service.available ? 'animate-pulse' : ''}`}></span>
                      {statusText}
                      {service.latency && (
                        <span className="text-xs text-muted-foreground">({service.latency})</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              无法获取系统状态
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
