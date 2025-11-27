import { Activity, Server, Database, Zap, AlertCircle, CheckCircle, Clock3, Gauge, Cpu, MemoryStick, HardDrive, Network } from 'lucide-react'
import { useMemo } from 'react'
import { useSystemStatus } from '@/hooks/useMonitoring'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const Monitoring: React.FC = () => {
  const { data: systemStatus, isLoading } = useSystemStatus(10000) // 10秒刷新一次

  const cpuUsage = useMemo(() => systemStatus?.system?.cpu?.usage_percent ?? 0, [systemStatus])
  const memoryUsage = useMemo(() => systemStatus?.system?.memory?.used_percent ?? 0, [systemStatus])
  const memoryTotal = useMemo(() => systemStatus?.system?.memory?.total ?? 0, [systemStatus])
  const memoryUsed = useMemo(() => systemStatus?.system?.memory?.used ?? 0, [systemStatus])
  const diskUsage = useMemo(() => systemStatus?.system?.disk?.used_percent ?? 0, [systemStatus])
  const diskTotal = useMemo(() => systemStatus?.system?.disk?.total ?? 0, [systemStatus])
  const diskUsed = useMemo(() => systemStatus?.system?.disk?.used ?? 0, [systemStatus])
  const netRecv = useMemo(() => systemStatus?.system?.network?.bytes_recv ?? 0, [systemStatus])
  const netSent = useMemo(() => systemStatus?.system?.network?.bytes_sent ?? 0, [systemStatus])

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const formatDuration = (s?: string) => {
    if (!s) return '未知'
    // 简单将 "72h3m0.5s" 等格式转成人类可读
    return s
      .replace(/h/g, '小时')
      .replace(/m/g, '分钟')
      .replace(/s/g, '秒')
  }

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

      {/* 运行概览 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoading
              ? '加载中...'
              : systemStatus?.status || '未知'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">运行时长</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoading ? '加载中...' : formatDuration(systemStatus?.uptime)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">版本</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoading ? '加载中...' : systemStatus?.version || '未知'}
          </CardContent>
        </Card>
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
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{isLoading ? '加载中...' : `${cpuUsage.toFixed(1)}%`}</span>
            </div>
            <Progress value={cpuUsage} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>内存使用率</CardTitle>
            <CardDescription>当前系统内存占用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isLoading ? '加载中...' : `${memoryUsage.toFixed(1)}% (${(memoryUsed / 1024 / 1024 / 1024).toFixed(2)} / ${(memoryTotal / 1024 / 1024 / 1024).toFixed(2)} GB)`}
              </span>
            </div>
            <Progress value={memoryUsage} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* 存储与网络 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>磁盘使用率</CardTitle>
            <CardDescription>当前磁盘占用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isLoading ? '加载中...' : `${diskUsage.toFixed(1)}% (${formatBytes(diskUsed)} / ${formatBytes(diskTotal)})`}
              </span>
            </div>
            <Progress value={diskUsage} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>网络流量</CardTitle>
            <CardDescription>自启动以来收发字节数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span>接收：{isLoading ? '加载中...' : formatBytes(netRecv)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span>发送：{isLoading ? '加载中...' : formatBytes(netSent)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API 响应时间 */}
      <Card>
        <CardHeader>
          <CardTitle>API 响应时间</CardTitle>
          <CardDescription>最近 24 小时平均响应时间趋势（暂未接入）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>

      {/* 错误日志 */}
      <Card>
        <CardHeader>
          <CardTitle>最近错误</CardTitle>
          <CardDescription>系统最近的错误和警告（暂无数据源）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            暂无错误数据源
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
