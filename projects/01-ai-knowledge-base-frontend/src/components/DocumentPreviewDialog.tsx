import { Download, FileText, Calendar, Hash } from 'lucide-react'
import { format } from 'date-fns'
import { useDocumentPreview, useDocumentChunks } from '@/hooks/useDocuments'
import documentService from '@/services/documentService'
import type { Document } from '@/types'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DocumentPreviewDialogProps {
  document: Document | null
  open: boolean
  onClose: () => void
}

export const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  document,
  open,
  onClose,
}) => {
  const { data: preview, isLoading, error } = useDocumentPreview(document?.id || null)
  const { data: chunksData } = useDocumentChunks(document?.id || null, 50)

  const handleDownload = () => {
    if (document) {
      try {
        documentService.downloadDocument(document.id, document.filename)
      } catch (error) {
        console.error('Download failed:', error)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: '待处理' },
      processing: { variant: 'default', label: '处理中' },
      completed: { variant: 'default', label: '已完成' },
      failed: { variant: 'destructive', label: '失败' },
    }
    const config = configs[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            文档预览
          </DialogTitle>
          <DialogDescription>查看文档的提取内容和元数据</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>
              加载文档预览失败：{(error as Error).message}
            </AlertDescription>
          </Alert>
        ) : preview ? (
          <div className="space-y-4">
            {/* 元数据 */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">文件名</p>
                  <p className="text-sm font-medium">{preview.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">状态</p>
                  {getStatusBadge(preview.status)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">上传时间</p>
                  <p className="text-sm">
                    {format(new Date(preview.created_at), 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">文档块数</p>
                  <p className="text-sm">{preview.chunk_count || 0}</p>
                </div>
              </div>
            </div>

            {/* 内容预览 - 使用 Tabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">文档内容</h4>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  下载原文件
                </Button>
              </div>
              
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">文本内容</TabsTrigger>
                  <TabsTrigger value="chunks">
                    文档块 ({chunksData?.total || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                  <ScrollArea className="h-96 border rounded-lg p-4">
                    {preview.content ? (
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {preview.content}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        {preview.status === 'completed'
                          ? '该文档未包含可提取的文本内容'
                          : '文档尚未处理完成'}
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="chunks">
                  {chunksData ? (
                    <div className="space-y-4">
                      {/* 统计信息 */}
                      {chunksData.stats && (
                        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg text-sm">
                          <div>
                            <p className="text-muted-foreground">总块数</p>
                            <p className="font-semibold">{chunksData.stats.total_chunks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">平均大小</p>
                            <p className="font-semibold">
                              {Math.round(chunksData.stats.avg_chunk_size)} 字符
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">大小范围</p>
                            <p className="font-semibold">
                              {chunksData.stats.min_chunk_size} - {chunksData.stats.max_chunk_size}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">总Token数</p>
                            <p className="font-semibold">{chunksData.stats.total_tokens}</p>
                          </div>
                        </div>
                      )}

                      {/* 块列表 */}
                      <ScrollArea className="h-96 border rounded-lg">
                        <div className="space-y-2 p-4">
                          {chunksData.chunks.map((chunk) => (
                            <div
                              key={chunk.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">块 #{chunk.chunk_index}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {chunk.content.length} 字符
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* 分页提示 */}
                      {chunksData.total > 50 && (
                        <div className="text-center text-sm text-muted-foreground">
                          显示 {chunksData.chunks.length} / {chunksData.total} 个文档块
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      加载中...
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

