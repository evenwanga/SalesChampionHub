import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText } from 'lucide-react'
import { useUploadDocument } from '@/hooks/useDocuments'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface DocumentUploadProps {
  kbId: string
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

interface FileWithPreview extends File {
  preview?: string
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  kbId,
  open,
  onCancel,
  onSuccess
}) => {
  const { toast } = useToast()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [checkDuplicate, setCheckDuplicate] = useState(true)
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useUploadDocument()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    const maxSize = 50 * 1024 * 1024 // 50MB

    const validFiles = acceptedFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: '文件类型不支持',
          description: `${file.name} 不是支持的文件类型`,
        })
        return false
      }

      if (file.size > maxSize) {
        toast({
          variant: 'destructive',
          title: '文件太大',
          description: `${file.name} 文件大小超过 50MB 限制`,
        })
        return false
      }

      return true
    })

    setFiles(prev => [...prev, ...validFiles])
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        variant: 'destructive',
        title: '没有文件',
        description: '请先选择要上传的文件',
      })
      return
    }

    setUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const data = await uploadMutation.mutateAsync({
          kbId,
          file,
          checkDuplicate
        })
        return data
      })

      await Promise.all(uploadPromises)

      toast({
        title: '上传成功',
        description: `成功上传 ${files.length} 个文件`,
      })

      setFiles([])
      onSuccess?.()
      onCancel()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '上传失败',
        description: error?.message || '文档上传失败',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFiles([])
    onCancel()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            将文档上传到知识库进行处理和向量化
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? '释放文件以上传' : '点击或拖拽文件到此区域上传'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 PDF, Word, Excel, TXT, Markdown
                </p>
                <p className="text-xs text-muted-foreground">
                  单个文件最大 50MB
                </p>
              </div>
            </div>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>已选择的文件 ({files.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重复检查选项 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="check-duplicate">检查重复文件</Label>
              <p className="text-sm text-muted-foreground">
                根据文件名和大小判断是否为重复文件
              </p>
            </div>
            <Switch
              id="check-duplicate"
              checked={checkDuplicate}
              onCheckedChange={setCheckDuplicate}
            />
          </div>

          {checkDuplicate && (
            <Alert>
              <AlertDescription className="text-xs">
                <strong>提示：</strong>开启重复检查后，系统将根据文件名和大小判断是否为重复文件，
                重复文件将被自动跳过。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={uploading}>
            取消
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? '上传中...' : '开始上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
