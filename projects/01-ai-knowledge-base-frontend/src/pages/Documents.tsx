import { useState } from 'react'
import {
  Button,
  Table,
  Space,
  Tag,
  Popconfirm,
  Card,
  Select,
  Input,
  Tooltip,
  Progress,
  App
} from 'antd'
import {
  UploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  useDocuments,
  useDeleteDocument,
  useBatchDeleteDocuments
} from '@/hooks/useDocuments'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { DocumentUpload } from '@/components/DocumentUpload'
import type { Document } from '@/types'

const { Search } = Input

export const Documents: React.FC = () => {
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedKB, setSelectedKB] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 获取可访问的知识库列表
  const { data: kbsData, isLoading: kbsLoading, error: kbsError } = useAccessibleKBs()

  // 获取文档列表
  const { data: docsData, isLoading, refetch } = useDocuments({
    kb_id: selectedKB,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status: statusFilter as any,
    search: searchKeyword
  })

  const deleteMutation = useDeleteDocument()
  const batchDeleteMutation = useBatchDeleteDocuments()

  // 处理知识库选择
  const handleKBChange = (value: string) => {
    setSelectedKB(value)
    setPage(1)
    setSelectedRowKeys([])
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('文档删除成功')
      refetch()
    } catch (error: any) {
      message.error(error?.message || '删除失败')
    }
  }

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文档')
      return
    }

    try {
      const result = await batchDeleteMutation.mutateAsync(selectedRowKeys as string[])
      if (result.failed_count > 0) {
        message.warning(`批量删除完成：成功 ${result.success_count} 个，失败 ${result.failed_count} 个`)
      } else {
        message.success(`成功删除 ${result.success_count} 个文档`)
      }
      setSelectedRowKeys([])
      refetch()
    } catch (error: any) {
      message.error(error?.message || '批量删除失败')
    }
  }

  // 处理上传成功
  const handleUploadSuccess = () => {
    refetch()
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // 获取状态标签配置
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待处理' },
      processing: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' }
    }
    return configs[status] || { color: 'default', text: status }
  }

  // 表格列定义
  const columns: ColumnsType<Document> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <Tooltip title={text}>
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          'application/pdf': { color: 'red', label: 'PDF' },
          'application/msword': { color: 'blue', label: 'DOC' },
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: 'blue', label: 'DOCX' },
          'text/plain': { color: 'default', label: 'TXT' },
          'text/markdown': { color: 'purple', label: 'MD' }
        }
        const config = typeMap[type] || { color: 'default', label: type.split('/')[1]?.toUpperCase() || 'Unknown' }
        return <Tag color={config.color}>{config.label}</Tag>
      }
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: Document) => {
        const config = getStatusConfig(status)
        return (
          <Space direction="vertical" size={0}>
            <Tag color={config.color}>{config.text}</Tag>
            {status === 'processing' && record.chunk_count !== undefined && (
              <Progress
                percent={Math.min(100, (record.chunk_count || 0) * 10)}
                size="small"
                status="active"
                showInfo={false}
              />
            )}
          </Space>
        )
      }
    },
    {
      title: '文档块数',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      width: 100,
      render: (count: number) => count || '-'
    },
    {
      title: '内容预览',
      dataIndex: 'content_preview',
      key: 'content_preview',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ color: '#666', fontSize: 12 }}>{text || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '处理时间',
      dataIndex: 'processed_at',
      key: 'processed_at',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: Document) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => message.info('详情功能开发中')}
            >
              详情
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除文档"${record.filename}"吗？此操作不可恢复。`}
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

  // 搜索过滤
  const filteredData = docsData?.data || []

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    }
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>文档管理</h1>
        <p style={{ color: '#666', margin: 0 }}>管理知识库中的文档资源</p>
      </div>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 第一行：知识库选择 */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <span style={{ fontWeight: 500 }}>选择知识库：</span>
              <Select
                placeholder={kbsLoading ? "加载中..." : kbsError ? "加载失败" : "请选择知识库"}
                style={{ width: 300 }}
                value={selectedKB || undefined}
                onChange={handleKBChange}
                options={(kbsData || []).map(kb => ({
                  label: kb.name,
                  value: kb.id
                }))}
                showSearch
                optionFilterProp="label"
                loading={kbsLoading}
                disabled={kbsLoading || !!kbsError}
                notFoundContent={kbsError ? "加载失败，请刷新页面" : "暂无知识库"}
              />
            </Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadOpen(true)}
              disabled={!selectedKB}
            >
              上传文档
            </Button>
          </Space>

          {/* 第二行：筛选和搜索 */}
          {selectedKB && (
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <span>状态筛选：</span>
                <Select
                  placeholder="全部状态"
                  style={{ width: 150 }}
                  value={statusFilter || undefined}
                  onChange={setStatusFilter}
                  allowClear
                  options={[
                    { label: '待处理', value: 'pending' },
                    { label: '处理中', value: 'processing' },
                    { label: '已完成', value: 'completed' },
                    { label: '失败', value: 'failed' }
                  ]}
                />
                <Search
                  placeholder="搜索文件名..."
                  allowClear
                  style={{ width: 250 }}
                  onSearch={setSearchKeyword}
                  onChange={e => !e.target.value && setSearchKeyword('')}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                >
                  刷新
                </Button>
              </Space>

              <Space>
                {selectedRowKeys.length > 0 && (
                  <span style={{ color: '#666' }}>
                    已选择 {selectedRowKeys.length} 项
                  </span>
                )}
                <Popconfirm
                  title="批量删除"
                  description={`确定要删除选中的 ${selectedRowKeys.length} 个文档吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确认"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={selectedRowKeys.length === 0}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedRowKeys.length === 0}
                    loading={batchDeleteMutation.isPending}
                  >
                    批量删除
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          )}
        </Space>
      </Card>

      {/* 文档列表 */}
      <Card>
        {!selectedKB ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>请先选择一个知识库查看文档</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={isLoading}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: docsData?.meta?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个文档`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage)
                setPageSize(newPageSize)
              }
            }}
            scroll={{ x: 1400 }}
          />
        )}
      </Card>

      {/* 上传对话框 */}
      <DocumentUpload
        kbId={selectedKB}
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
