import { useState } from 'react'
import {
  Button,
  Table,
  Space,
  Tag,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Input,
  Tooltip,
  App
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  BlockOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  useKnowledgeBases,
  useCreateKB,
  useUpdateKB,
  useDeleteKB
} from '@/hooks/useKnowledgeBases'
import { KnowledgeBaseForm } from '@/components/KnowledgeBaseForm'
import type { KnowledgeBase, CreateKBRequest, UpdateKBRequest } from '@/types'

const { Search } = Input

export const KnowledgeBases: React.FC = () => {
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingKB, setEditingKB] = useState<KnowledgeBase | undefined>()

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
        message.success('知识库更新成功')
      } else {
        // 创建
        await createMutation.mutateAsync(values as CreateKBRequest)
        message.success('知识库创建成功')
      }
      setFormOpen(false)
      setEditingKB(undefined)
      // 手动刷新列表
      refetch()
    } catch (error: any) {
      message.error(error?.message || '操作失败')
    }
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('知识库删除成功')
      // 手动刷新列表
      refetch()
    } catch (error: any) {
      message.error(error?.message || '删除失败')
    }
  }

  // 搜索过滤
  const filteredData = data?.data?.filter(kb =>
    searchKeyword ? kb.name.toLowerCase().includes(searchKeyword.toLowerCase()) : true
  ) || []

  // 表格列定义
  const columns: ColumnsType<KnowledgeBase> = [
    {
      title: '知识库名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>暂无描述</span>
    },
    {
      title: '所有者',
      key: 'owner',
      width: 200,
      render: (_: any, record: KnowledgeBase) => {
        const ownerType = record.owner_type || 'user' // 默认为 user
        const colorMap: Record<string, string> = {
          tenant: 'blue',
          organization: 'green',
          user: 'purple'
        }
        const labelMap: Record<string, string> = {
          tenant: '租户',
          organization: '组织',
          user: '个人'
        }

        // 如果是用户类型，尝试显示用户名（这里简化处理，实际可能需要查询用户信息）
        const displayText = ownerType === 'user'
          ? `个人知识库`
          : `${labelMap[ownerType] || ownerType}知识库`

        return (
          <Space>
            <Tag color={colorMap[ownerType]} icon={ownerType === 'user' ? <UserOutlined /> : undefined}>
              {labelMap[ownerType] || ownerType}
            </Tag>
            <Tooltip title={`ID: ${record.owner_id}`}>
              <span style={{ fontSize: '12px', color: '#666' }}>{displayText}</span>
            </Tooltip>
          </Space>
        )
      }
    },
    {
      title: '统计信息',
      key: 'stats',
      width: 300,
      render: (_: any, record: KnowledgeBase) => (
        <Space size="middle">
          <Statistic
            title="文档"
            value={record.document_count || 0}
            prefix={<FileTextOutlined />}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title="文档块"
            value={record.chunk_count || 0}
            prefix={<BlockOutlined />}
            valueStyle={{ fontSize: 14 }}
          />
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '激活' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: KnowledgeBase) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除知识库"${record.name}"吗？此操作不可恢复。`}
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 计算总统计
  const totalDocs = data?.data?.reduce((sum, kb) => sum + (kb.document_count || 0), 0) || 0
  const totalChunks = data?.data?.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0) || 0

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>知识库管理</h1>
        <p style={{ color: '#666', margin: 0 }}>管理和组织您的知识库资源</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="知识库总数"
              value={data?.meta?.total || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="文档总数"
              value={totalDocs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="文档块总数"
              value={totalChunks}
              prefix={<BlockOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="搜索知识库名称..."
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchKeyword}
            onChange={e => !e.target.value && setSearchKeyword('')}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            size="middle"
          >
            创建知识库
          </Button>
        </Space>
      </Card>

      {/* 知识库列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个知识库`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage)
              setPageSize(newPageSize)
            }
          }}
          scroll={{ x: 1200 }}
        />
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
    </div>
  )
}
