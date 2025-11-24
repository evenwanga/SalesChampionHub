import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLogto } from '@logto/react'
import type { KnowledgeBase, CreateKBRequest, UpdateKBRequest } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User } from 'lucide-react'

interface KnowledgeBaseFormProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: CreateKBRequest | UpdateKBRequest) => void
  initialValues?: KnowledgeBase
  loading?: boolean
}

export const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  loading
}) => {
  const isEditing = !!initialValues
  const { getIdTokenClaims } = useLogto()
  const [currentUser, setCurrentUser] = useState<{
    id: string
    name: string
    username?: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateKBRequest & UpdateKBRequest>({
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
      owner_type: 'user',
      owner_id: ''
    }
  })

  const isActive = watch('is_active')

  // 根据弹窗状态和初始值同步表单内容
  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    if (isEditing && initialValues) {
      reset({
        name: initialValues.name,
        description: initialValues.description || '',
        is_active: initialValues.is_active,
        owner_type: initialValues.owner_type,
        owner_id: initialValues.owner_id,
      })
    } else if (!isEditing) {
      reset({
        name: '',
        description: '',
        owner_type: 'user',
        is_active: true,
        owner_id: ''
      })
    }
  }, [open, isEditing, initialValues, reset])

  // 获取当前用户信息
  useEffect(() => {
    if (open && !isEditing) {
      (async () => {
        try {
          const claims = await getIdTokenClaims()
          if (claims?.sub) {
            const userName = (claims.username as string) || (claims.name as string) || '当前用户'
            setCurrentUser({
              id: claims.sub,
              name: userName,
              username: claims.username as string
            })
            setValue('owner_type', 'user')
            setValue('owner_id', claims.sub)
          }
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
      })()
    }
  }, [open, isEditing, getIdTokenClaims, setValue])

  const handleFormSubmit = handleSubmit((data) => {
    onSubmit(data)
  })

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑知识库' : '创建知识库'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '修改知识库的基本信息' : '创建一个新的知识库'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {!isEditing && currentUser && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>当前用户：</strong>{currentUser.name}
                    {currentUser.username && ` (@${currentUser.username})`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    知识库将自动设置为您的个人知识库
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              知识库名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例如：销售话术库"
              {...register('name', {
                required: '请输入知识库名称',
                minLength: { value: 2, message: '名称至少2个字符' },
                maxLength: { value: 100, message: '名称不能超过100个字符' }
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="描述知识库的用途和内容..."
              rows={4}
              {...register('description', {
                maxLength: { value: 500, message: '描述不能超过500个字符' }
              })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">状态</Label>
                <p className="text-sm text-muted-foreground">
                  启用后知识库可被正常使用，停用后将无法访问
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '提交中...' : isEditing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
