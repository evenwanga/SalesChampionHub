import { useState } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Database, 
  FileText, 
  Layers, 
  User,
  Building,
  Users
} from 'lucide-react'
import { format } from 'date-fns'
import {
  useKnowledgeBases,
  useCreateKB,
  useUpdateKB,
  useDeleteKB
} from '@/hooks/useKnowledgeBases'
import { KnowledgeBaseForm } from '@/components/KnowledgeBaseForm'
import type { KnowledgeBase, CreateKBRequest, UpdateKBRequest } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export const KnowledgeBases: React.FC = () => {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingKB, setEditingKB] = useState<KnowledgeBase | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingKB, setDeletingKB] = useState<KnowledgeBase | null>(null)

  // React Query hooks
  const { data, isLoading, refetch } = useKnowledgeBases({
    limit: pageSize,
    offset: (page - 1) * pageSize
  })

  const createMutation = useCreateKB()
  const updateMutation = useUpdateKB()
  const deleteMutation = useDeleteKB()

  // 处理创建
  const handleCreate = () => {
    setEditingKB(undefined)
    setFormOpen(true)
  }

  // 处理编辑
  const handleEdit = (record: KnowledgeBase) => {
    setEditingKB(record)
    setFormOpen(true)
  }

  // 处理表单提交
  const handleFormSubmit = async (values: CreateKBRequest | UpdateKBRequest) => {
    try {
      if (editingKB) {
        // 更新
        await updateMutation.mutateAsync({
          id: editingKB.id,
          data: values as UpdateKBRequest
        })
        toast({
          title: '成功',
          description: '知识库更新成功',
        })
      } else {
        // 创建
        await createMutation.mutateAsync(values as CreateKBRequest)
        toast({
          title: '成功',
          description: '知识库创建成功',
        })
      }
      setFormOpen(false)
      setEditingKB(undefined)
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '操作失败',
      })
    }
  }

  // 处理删除
  const handleDelete = async () => {
    if (!deletingKB) return
    
    try {
      await deleteMutation.mutateAsync(deletingKB.id)
      toast({
        title: '成功',
        description: '知识库删除成功',
      })
      setDeleteDialogOpen(false)
      setDeletingKB(null)
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '删除失败',
      })
    }
  }

  // 搜索过滤
  const filteredData = data?.data?.filter(kb =>
    searchKeyword ? kb.name.toLowerCase().includes(searchKeyword.toLowerCase()) : true
  ) || []

  // 计算总统计
  const totalDocs = data?.data?.reduce((sum, kb) => sum + (kb.document_count || 0), 0) || 0
  const totalChunks = data?.data?.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0) || 0

  // 获取所有者类型图标和标签
  const getOwnerInfo = (ownerType: string) => {
    const configs: Record<string, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
      tenant: { icon: Building, label: '租户', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      organization: { icon: Users, label: '组织', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      user: { icon: User, label: '个人', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
    }
    return configs[ownerType] || configs.user
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">知识库管理</h1>
        <p className="text-muted-foreground">管理和组织您的知识库资源</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">知识库总数</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.meta?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文档总数</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文档块总数</CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChunks}</div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="搜索知识库名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              创建知识库
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 知识库列表 */}
      <Card>
        <CardHeader>
          <CardTitle>知识库列表</CardTitle>
          <CardDescription>管理您的所有知识库</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>知识库名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>所有者</TableHead>
                    <TableHead className="text-center">文档数</TableHead>
                    <TableHead className="text-center">文档块数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((kb) => {
                    const ownerInfo = getOwnerInfo(kb.owner_type || 'user')
                    const OwnerIcon = ownerInfo.icon
                    return (
                      <TableRow key={kb.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            {kb.name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {kb.description || <span className="text-muted-foreground">暂无描述</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ownerInfo.color}>
                            <OwnerIcon className="mr-1 h-3 w-3" />
                            {ownerInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{kb.document_count || 0}</TableCell>
                        <TableCell className="text-center">{kb.chunk_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant={kb.is_active ? 'default' : 'secondary'}>
                            {kb.is_active ? '激活' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(kb.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(kb)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingKB(kb)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑表单 */}
      <KnowledgeBaseForm
        open={formOpen}
        onCancel={() => {
          setFormOpen(false)
          setEditingKB(undefined)
        }}
        onSubmit={handleFormSubmit}
        initialValues={editingKB}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识库 "{deletingKB?.name}" 吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
