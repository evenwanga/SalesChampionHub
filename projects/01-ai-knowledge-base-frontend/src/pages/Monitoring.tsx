import { Activity, Server, Database, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { useSystemStatus } from '@/hooks/useMonitoring'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const Monitoring: React.FC = () => {
  const { data: systemStatus, isLoading } = useSystemStatus(10000) // 10秒刷新一次

  const getStatusBadge = (available: boolean, status: string) => {
    return available ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">性能监控</h1>
        <p className="text-muted-foreground">实时监控系统运行状态和性能指标</p>
      </div>

      {/* 系统状态总览 */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>系统状态</AlertTitle>
        <AlertDescription>
          {isLoading
            ? '正在检查系统状态...'
            : systemStatus &&
              Object.values(systemStatus.services).every((s) => s.available)
            ? '所有服务运行正常'
            : '部分服务异常，请检查'}
        </AlertDescription>
      </Alert>

      {/* 服务状态卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据库</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">检查中...</div>
            ) : systemStatus?.services.database ? (
              <>
                {getStatusBadge(
                  systemStatus.services.database.available,
                  systemStatus.services.database.status
                )}
                {systemStatus.services.database.latency && (
                  <p className="text-xs text-muted-foreground">
                    延迟: {systemStatus.services.database.latency}
                  </p>
                )}
              </>
            ) : (
              <Badge variant="secondary">未知</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis 缓存</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">检查中...</div>
            ) : systemStatus?.services.redis ? (
              <>
                {getStatusBadge(
                  systemStatus.services.redis.available,
                  systemStatus.services.redis.status
                )}
                {systemStatus.services.redis.latency && (
                  <p className="text-xs text-muted-foreground">
                    延迟: {systemStatus.services.redis.latency}
                  </p>
                )}
              </>
            ) : (
              <Badge variant="secondary">未知</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">向量化服务</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">检查中...</div>
            ) : systemStatus?.services.embedding ? (
              <>
                {getStatusBadge(
                  systemStatus.services.embedding.available,
                  systemStatus.services.embedding.status
                )}
                {systemStatus.services.embedding.latency && (
                  <p className="text-xs text-muted-foreground">
                    延迟: {systemStatus.services.embedding.latency}
                  </p>
                )}
              </>
            ) : (
              <Badge variant="secondary">未知</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 性能指标 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPU 使用率</CardTitle>
            <CardDescription>当前系统 CPU 占用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={35} className="h-2" />
            <p className="text-sm text-muted-foreground">35% (模拟数据)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>内存使用率</CardTitle>
            <CardDescription>当前系统内存占用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={62} className="h-2" />
            <p className="text-sm text-muted-foreground">62% (模拟数据)</p>
          </CardContent>
        </Card>
      </div>

      {/* API 响应时间 */}
      <Card>
        <CardHeader>
          <CardTitle>API 响应时间</CardTitle>
          <CardDescription>最近 24 小时平均响应时间趋势</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            响应时间图表开发中...
          </div>
        </CardContent>
      </Card>

      {/* 错误日志 */}
      <Card>
        <CardHeader>
          <CardTitle>最近错误</CardTitle>
          <CardDescription>系统最近的错误和警告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">API 响应超时</p>
                  <p className="text-xs text-muted-foreground">
                    /api/search 端点响应时间超过 3 秒
                  </p>
                  <p className="text-xs text-muted-foreground">2 分钟前</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">数据库连接失败</p>
                  <p className="text-xs text-muted-foreground">连接池已满，等待可用连接</p>
                  <p className="text-xs text-muted-foreground">15 分钟前</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
