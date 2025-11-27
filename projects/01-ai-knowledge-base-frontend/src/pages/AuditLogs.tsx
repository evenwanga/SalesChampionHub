import { useMemo, useState } from 'react'
import { Shield, Search, User, FileText, RefreshCw, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuditLogs, useAuditStats } from '@/hooks/useAuditLogs'
import { ACTION_LABELS, RESOURCE_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types/audit'

const AuditLogs: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('')

  const {
    logs,
    loading,
    error,
    queryLogs,
    refetch,
  } = useAuditLogs({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const { stats, loading: statsLoading, error: statsError } = useAuditStats(1)

  const handleSearch = () => {
    queryLogs({
      action: actionFilter === 'all' ? undefined : actionFilter,
      resource_type: resourceFilter === 'all' ? undefined : resourceFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      user_id: userFilter || undefined,
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
  }

  const getActionBadge = (action: string) => {
    const label = ACTION_LABELS[action] || action
    const configs: Record<string, { variant: any; label: string }> = {
      'kb.create': { variant: 'default', label },
      'kb.update': { variant: 'secondary', label },
      'kb.delete': { variant: 'destructive', label },
      'doc.upload': { variant: 'default', label },
      'doc.delete': { variant: 'destructive', label },
      'search.query': { variant: 'outline', label },
    }
    const config = configs[action] || { variant: 'outline', label }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getResourceIcon = (resource: string) => {
    if (resource === 'document') return <FileText className="h-4 w-4" />
    if (resource === 'knowledge_base') return <Shield className="h-4 w-4" />
    return null
  }

  const getStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status] || status
    const color = STATUS_COLORS[status] || 'text-muted-foreground bg-muted'
    return <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{label}</span>
  }

  const errorCount = useMemo(() => logs.filter(log => log.status !== 'success').length, [logs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">审计日志</h1>
        <p className="text-muted-foreground">查看系统操作记录和安全审计</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日操作</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_operations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">操作次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.unique_users ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">今日活跃</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">异常操作</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : errorCount}</div>
            <p className="text-xs text-muted-foreground">包含失败/错误</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${(stats?.success_rate ?? 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">今日统计</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      )}

      {/* 筛选工具栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  <SelectItem value="kb.create">创建知识库</SelectItem>
                  <SelectItem value="kb.update">更新知识库</SelectItem>
                  <SelectItem value="kb.delete">删除知识库</SelectItem>
                  <SelectItem value="doc.upload">上传文档</SelectItem>
                  <SelectItem value="doc.delete">删除文档</SelectItem>
                  <SelectItem value="search.query">搜索</SelectItem>
                </SelectContent>
              </Select>

              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="资源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部资源</SelectItem>
                  <SelectItem value="knowledge_base">知识库</SelectItem>
                  <SelectItem value="document">文档</SelectItem>
                  <SelectItem value="system">系统</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failure">失败</SelectItem>
                  <SelectItem value="error">错误</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="用户ID或用户名（后端需支持）"
                className="w-[220px]"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 审计日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>操作记录</CardTitle>
          <CardDescription>系统所有操作的详细记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>操作</TableHead>
                  <TableHead>资源</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>IP 地址</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getResourceIcon(log.resource_type)}
                          <div className="text-sm">
                            <div>{RESOURCE_TYPE_LABELS[log.resource_type] || log.resource_type}</div>
                            {log.details?.resource_name && (
                              <div className="text-xs text-muted-foreground">{log.details.resource_name}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.username || log.user_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogs
