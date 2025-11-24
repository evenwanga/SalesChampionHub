import { Shield, Search, User, FileText } from 'lucide-react'
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

// 模拟审计日志数据
const mockLogs = [
  {
    id: '1',
    action: 'create',
    resource: 'knowledge_base',
    resourceName: '销售话术库',
    user: '张三',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    status: 'success',
    ip: '192.168.1.100',
  },
  {
    id: '2',
    action: 'upload',
    resource: 'document',
    resourceName: '产品介绍.pdf',
    user: '李四',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'success',
    ip: '192.168.1.101',
  },
  {
    id: '3',
    action: 'delete',
    resource: 'document',
    resourceName: '旧文档.docx',
    user: '王五',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'success',
    ip: '192.168.1.102',
  },
  {
    id: '4',
    action: 'search',
    resource: 'knowledge_base',
    resourceName: '销售话术库',
    user: '赵六',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: 'success',
    ip: '192.168.1.103',
  },
  {
    id: '5',
    action: 'update',
    resource: 'knowledge_base',
    resourceName: '产品知识库',
    user: '张三',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    status: 'failed',
    ip: '192.168.1.100',
  },
]

const AuditLogs: React.FC = () => {
  const getActionBadge = (action: string) => {
    const configs: Record<string, { variant: any; label: string }> = {
      create: { variant: 'default', label: '创建' },
      update: { variant: 'secondary', label: '更新' },
      delete: { variant: 'destructive', label: '删除' },
      upload: { variant: 'default', label: '上传' },
      search: { variant: 'outline', label: '搜索' },
    }
    const config = configs[action] || { variant: 'outline', label: action }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getResourceIcon = (resource: string) => {
    if (resource === 'document') return <FileText className="h-4 w-4" />
    if (resource === 'knowledge_base') return <Shield className="h-4 w-4" />
    return null
  }

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default" className="bg-green-500">
        成功
      </Badge>
    ) : (
      <Badge variant="destructive">失败</Badge>
    )
  }

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
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">操作次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">今日活跃</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">异常操作</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">需要关注</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.1%</div>
            <p className="text-xs text-muted-foreground">今日统计</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选工具栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  <SelectItem value="create">创建</SelectItem>
                  <SelectItem value="update">更新</SelectItem>
                  <SelectItem value="delete">删除</SelectItem>
                  <SelectItem value="upload">上传</SelectItem>
                  <SelectItem value="search">搜索</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="资源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部资源</SelectItem>
                  <SelectItem value="knowledge_base">知识库</SelectItem>
                  <SelectItem value="document">文档</SelectItem>
                </SelectContent>
              </Select>

              <Input placeholder="搜索用户..." className="w-[200px]" />
            </div>

            <Button>
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
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
                {mockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResourceIcon(log.resource)}
                        <span className="text-sm">{log.resourceName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {log.user}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ip}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogs
