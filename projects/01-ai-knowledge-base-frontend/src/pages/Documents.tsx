import { useState } from 'react'
import { Upload, Trash2, FileText, RefreshCw, Eye, File, ChevronDown, FileCode } from 'lucide-react'
import { format } from 'date-fns'
import {
  useDocuments,
  useDeleteDocument,
  useBatchDeleteDocuments,
  useBatchUpdateStatus
} from '@/hooks/useDocuments'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { DocumentUpload } from '@/components/DocumentUpload'
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog'
import type { Document } from '@/types'
import { useToast } from '@/hooks/use-toast'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Documents: React.FC = () => {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedKB, setSelectedKB] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // 获取可访问的知识库列表
  const { data: kbsData = [], isLoading: kbsLoading, error: kbsError } = useAccessibleKBs()

  // 获取文档列表
  const { data: docsData, isLoading, refetch } = useDocuments({
    kb_id: selectedKB,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    search: searchKeyword
  })

  const deleteMutation = useDeleteDocument()
  const batchDeleteMutation = useBatchDeleteDocuments()
  const batchUpdateMutation = useBatchUpdateStatus()

  const handleKBChange = (value: string) => {
    setSelectedKB(value)
    setPage(1)
    setSelectedIds([])
  }

  const handleDelete = async () => {
    if (!deletingDoc) return

    try {
      await deleteMutation.mutateAsync(deletingDoc.id)
      toast({
        title: '成功',
        description: '文档删除成功',
      })
      setDeleteDialogOpen(false)
      setDeletingDoc(null)
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '删除失败',
      })
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: '提示',
        description: '请先选择要删除的文档',
      })
      return
    }

    try {
      const result = await batchDeleteMutation.mutateAsync(selectedIds)
      if (result.failed_count > 0) {
        toast({
          title: '部分成功',
          description: `成功 ${result.success_count} 个，失败 ${result.failed_count} 个`,
        })
      } else {
        toast({
          title: '成功',
          description: `成功删除 ${result.success_count} 个文档`,
        })
      }
      setSelectedIds([])
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '批量删除失败',
      })
    }
  }

  const handleBatchReprocess = async () => {
    if (selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: '提示',
        description: '请先选择要重新处理的文档',
      })
      return
    }

    try {
      const result = await batchUpdateMutation.mutateAsync({
        document_ids: selectedIds,
        status: 'pending',
        trigger_reprocess: true,
      })

      if (result.failed_count > 0) {
        toast({
          title: '部分成功',
          description: `成功 ${result.success_count} 个，失败 ${result.failed_count} 个`,
        })
      } else {
        toast({
          title: '成功',
          description: `已将 ${result.success_count} 个文档加入处理队列`,
        })
      }
      setSelectedIds([])
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '批量重新处理失败',
      })
    }
  }

  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) return

    try {
      const result = await batchUpdateMutation.mutateAsync({
        document_ids: selectedIds,
        status: status as any,
      })

      toast({
        title: '成功',
        description: `已更新 ${result.success_count} 个文档的状态`,
      })
      setSelectedIds([])
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error?.message || '批量更新失败',
      })
    }
  }

  const handleUploadSuccess = () => {
    refetch()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any, label: string }> = {
      pending: { variant: 'secondary', label: '待处理' },
      processing: { variant: 'default', label: '处理中' },
      completed: { variant: 'default', label: '已完成' },
      failed: { variant: 'destructive', label: '失败' }
    }
    const config = configs[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredData = docsData?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">文档管理</h1>
        <p className="text-muted-foreground">管理知识库中的文档资源</p>
      </div>

      {/* 工具栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* 知识库选择 */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium text-sm">选择知识库：</span>
                <Select value={selectedKB} onValueChange={handleKBChange}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder={kbsLoading ? "加载中..." : "请选择知识库"} />
                  </SelectTrigger>
                  <SelectContent>
                    {kbsData.filter(kb => kb.id && kb.id.trim() !== '').map(kb => (
                      <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setUploadOpen(true)} disabled={!selectedKB}>
                <Upload className="mr-2 h-4 w-4" />
                上传文档
              </Button>
            </div>

            {/* 筛选和搜索 */}
            {selectedKB && (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <span className="text-sm">状态筛选：</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="processing">处理中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="failed">失败</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="搜索文件名..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full md:w-[250px]"
                  />
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      已选择 {selectedIds.length} 项
                    </span>
                  )}

                  {/* 批量操作下拉菜单 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedIds.length === 0}
                      >
                        批量操作
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>批量操作</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleBatchReprocess}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        重新处理
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBatchUpdateStatus('pending')}>
                        设为待处理
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBatchUpdateStatus('completed')}>
                        标记为已完成
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleBatchDelete}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        批量删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 文档列表 */}
      <Card>
        <CardHeader>
          <CardTitle>文档列表</CardTitle>
          <CardDescription>管理您的文档资源</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedKB ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <File className="h-12 w-12 mb-4" />
              <p>请先选择一个知识库查看文档</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              暂无文档
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredData.length}
                        onCheckedChange={(checked) => {
                          setSelectedIds(checked ? filteredData.map(d => d.id) : [])
                        }}
                      />
                    </TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>文档块数</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(prev =>
                              checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id)
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {doc.filename.toLowerCase().endsWith('.md') ? (
                            <FileCode className="h-4 w-4 text-purple-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="truncate max-w-xs">{doc.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {doc.file_type.split('/').pop()?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>{doc.chunk_count || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), 'yyyy-MM-dd HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreviewDoc(doc)
                              setPreviewOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingDoc(doc)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上传对话框 */}
      <DocumentUpload
        kbId={selectedKB}
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文档 "{deletingDoc?.filename}" 吗？此操作不可恢复。
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

      {/* 文档预览对话框 */}
      <DocumentPreviewDialog
        document={previewDoc}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewDoc(null)
        }}
      />
    </div>
  )
}
