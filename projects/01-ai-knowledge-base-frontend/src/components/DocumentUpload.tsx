import { useState } from 'react'
import { Upload, Modal, Switch, App } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd'
import { useUploadDocument } from '@/hooks/useDocuments'

const { Dragger } = Upload

interface DocumentUploadProps {
  kbId: string
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  kbId,
  open,
  onCancel,
  onSuccess
}) => {
  const { message } = App.useApp()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [checkDuplicate, setCheckDuplicate] = useState(true)
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useUploadDocument()

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件')
      return
    }

    setUploading(true)

    try {
      // 上传所有文件
      const uploadPromises = fileList.map(async (file) => {
        if (file.originFileObj) {
          const data = await uploadMutation.mutateAsync({
            kbId,
            file: file.originFileObj,
            checkDuplicate
          })
          message.success(`文档"${data.filename}"上传成功`)
        }
      })

      await Promise.all(uploadPromises)

      message.success(`成功上传 ${fileList.length} 个文件`)
      setFileList([])
      onSuccess?.()
      onCancel()
    } catch (error: any) {
      message.error(error?.message || '文档上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    onCancel()
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // 文件类型验证
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]

      if (!allowedTypes.includes(file.type)) {
        message.error(`${file.name} 不是支持的文件类型`)
        return Upload.LIST_IGNORE
      }

      // 文件大小限制 (50MB)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        message.error(`${file.name} 文件大小超过 50MB 限制`)
        return Upload.LIST_IGNORE
      }

      // 添加到文件列表
      setFileList(prev => [...prev, file as UploadFile])
      return false // 阻止自动上传
    },
    onRemove: (file) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid))
    },
    onDrop: (e) => {
      console.log('拖放文件', e.dataTransfer.files)
    }
  }

  return (
    <Modal
      title="上传文档"
      open={open}
      onOk={handleUpload}
      onCancel={handleCancel}
      confirmLoading={uploading}
      width={600}
      okText="开始上传"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传。支持的文件类型：PDF, Word, Excel, TXT, Markdown
          </p>
          <p className="ant-upload-hint" style={{ fontSize: 12, color: '#999' }}>
            单个文件最大 50MB
          </p>
        </Dragger>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0'
      }}>
        <span>检查重复文件：</span>
        <Switch
          checked={checkDuplicate}
          onChange={setCheckDuplicate}
          checkedChildren="开启"
          unCheckedChildren="关闭"
        />
      </div>

      {checkDuplicate && (
        <div style={{
          fontSize: 12,
          color: '#666',
          marginTop: 8,
          padding: 8,
          backgroundColor: '#f5f5f5',
          borderRadius: 4
        }}>
          <strong>提示：</strong>开启重复检查后，系统将根据文件名和大小判断是否为重复文件，
          重复文件将被自动跳过。
        </div>
      )}
    </Modal>
  )
}
