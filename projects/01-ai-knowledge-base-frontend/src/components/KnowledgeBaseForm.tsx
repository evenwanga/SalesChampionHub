import { Form, Input, Modal, Alert, Switch } from 'antd'
import { useLogto } from '@logto/react'
import { useEffect, useState } from 'react'
import type { KnowledgeBase, CreateKBRequest, UpdateKBRequest } from '@/types'

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
  const [form] = Form.useForm()
  const isEditing = !!initialValues
  const { getIdTokenClaims } = useLogto()
  const [currentUser, setCurrentUser] = useState<{
    id: string
    name: string
    username?: string
  } | null>(null)

  // 根据弹窗状态和初始值同步表单内容
  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    if (isEditing && initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        description: initialValues.description,
        is_active: initialValues.is_active,
        owner_type: initialValues.owner_type,
        owner_id: initialValues.owner_id,
      })
    } else if (!isEditing) {
      form.resetFields()
      form.setFieldsValue({
        owner_type: 'user',
        is_active: true,
      })
    }
  }, [open, isEditing, initialValues, form])

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
            // 自动设置所有者ID为当前用户
            form.setFieldsValue({
              owner_type: 'user',
              owner_id: claims.sub
            })
          }
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
      })()
    }
  }, [open, isEditing, getIdTokenClaims, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
      form.resetFields()
    } catch (error) {
      if ((error as any)?.errorFields) {
        console.error('表单验证失败:', error)
      } else {
        console.error('提交失败:', error)
      }
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={isEditing ? '编辑知识库' : '创建知识库'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues || { owner_type: 'user', is_active: true }}
      >
        {!isEditing && currentUser && (
          <Alert
            message="所有者信息"
            description={
              <div>
                <p style={{ margin: '8px 0 0 0' }}>
                  <strong>当前用户：</strong>{currentUser.name}
                  {currentUser.username && ` (@${currentUser.username})`}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  知识库将自动设置为您的个人知识库
                </p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="知识库名称"
          name="name"
          rules={[
            { required: true, message: '请输入知识库名称' },
            { min: 2, max: 100, message: '名称长度应在2-100个字符之间' }
          ]}
        >
          <Input placeholder="例如：销售话术库" />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          rules={[
            { max: 500, message: '描述不能超过500个字符' }
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="描述知识库的用途和内容..."
            showCount
            maxLength={500}
          />
        </Form.Item>

        {/* 状态开关 - 编辑时可见 */}
        {isEditing && (
          <Form.Item
            label="状态"
            name="is_active"
            valuePropName="checked"
            tooltip="启用后知识库可被正常使用，停用后将无法访问"
          >
            <Switch
              checkedChildren="激活"
              unCheckedChildren="停用"
            />
          </Form.Item>
        )}

        {/* 隐藏字段 - 自动设置为当前用户 */}
        <Form.Item name="owner_type" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="owner_id" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}
