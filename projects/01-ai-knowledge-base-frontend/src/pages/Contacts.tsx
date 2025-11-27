import { useState } from 'react'
import { Users, User, AlertTriangle, Folder, ChevronRight, ChevronDown, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useContacts } from '@/hooks/useContacts'

export const Contacts: React.FC = () => {
  const { data, isLoading, error, refetch } = useContacts()
  const hasData = (data || []).some((t) => t.users && t.users.length > 0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">通讯录</h1>
          <p className="text-muted-foreground">展示当前平台内的组织及用户（基于查询日志记录）</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <Users className="h-4 w-4" />
          刷新
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>加载通讯录失败</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>通讯录</CardTitle>
            <CardDescription>暂无组织/用户数据</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">请确认已在 Logto 中创建组织并添加用户</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>通讯录</CardTitle>
            <CardDescription>树状层级，可展开/折叠节点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data || []).map((tenant) => {
              const isOpen = expanded[tenant.tenant_id] ?? true
              return (
                <div key={tenant.tenant_id} className="space-y-1">
                  <button
                    onClick={() => toggle(tenant.tenant_id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {tenant.organization_name || tenant.tenant_id}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {tenant.users.length} 人
                    </Badge>
                  </button>
                  {isOpen && (
                    <div className="space-y-1 pl-6">
                      {tenant.users.length === 0 ? (
                        <div className="py-1 text-xs text-muted-foreground">暂无用户</div>
                      ) : (
                        tenant.users.map((u) => (
                          <div
                            key={u.user_id}
                            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40"
                          >
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {u.name || u.username || u.user_id}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                最近活跃：{format(new Date(u.last_active), 'yyyy-MM-dd HH:mm')}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-auto">
                              操作 {u.activity_count || 0}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Contacts
