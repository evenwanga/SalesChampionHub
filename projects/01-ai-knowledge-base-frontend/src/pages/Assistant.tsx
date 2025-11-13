import { useState, useRef, useEffect } from 'react'
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Switch,
  Tag,
  Collapse,
  List,
  Empty,
  App
} from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { useAsk } from '@/hooks/useRAG'
import searchService from '@/services/searchService'
import type { SearchResult, SSEEvent } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SearchResult[]
  timestamp: Date
  processingTime?: number
}

export const Assistant: React.FC = () => {
  const { message } = App.useApp()
  const [question, setQuestion] = useState('')
  const [selectedKBs, setSelectedKBs] = useState<string[]>([])
  const [topK, setTopK] = useState(5)
  const [includeSources, setIncludeSources] = useState(true)
  const [useStream, setUseStream] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: kbsData = [] } = useAccessibleKBs()
  const askMutation = useAsk()

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 处理流式响应
  const handleStreamAsk = async () => {
    if (!question.trim() || selectedKBs.length === 0) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setQuestion('')
    setIsStreaming(true)

    try {
      const startTime = Date.now()
      let sources: SearchResult[] = []

      const stream = searchService.askStream({
        question: userMessage.content,
        kb_ids: selectedKBs,
        top_k: topK,
        include_sources: includeSources,
        stream: true
      })

      for await (const event of stream) {
        const sseEvent = event as SSEEvent

        if (sseEvent.event === 'sources') {
          sources = sseEvent.data as SearchResult[]
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.sources = sources
            }
            return updated
          })
        } else if (sseEvent.event === 'chunk') {
          const chunk = sseEvent.data as string
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content += chunk
            }
            return updated
          })
        } else if (sseEvent.event === 'done') {
          const processingTime = Date.now() - startTime
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.processingTime = processingTime
            }
            return updated
          })
        } else if (sseEvent.event === 'error') {
          message.error('流式响应错误')
          console.error('SSE Error:', sseEvent.data)
        }
      }
    } catch (error: any) {
      message.error(error?.message || '问答失败')
      console.error('Stream error:', error)
    } finally {
      setIsStreaming(false)
    }
  }

  // 处理非流式响应
  const handleNonStreamAsk = async () => {
    if (!question.trim() || selectedKBs.length === 0) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setQuestion('')

    try {
      const result = await askMutation.mutateAsync({
        question: userMessage.content,
        kb_ids: selectedKBs,
        top_k: topK,
        include_sources: includeSources,
        stream: false
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
        processingTime: result.processing_time_ms
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      message.error(error?.message || '问答失败')
    }
  }

  // 提交问题
  const handleSubmit = () => {
    if (useStream) {
      handleStreamAsk()
    } else {
      handleNonStreamAsk()
    }
  }

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 清空对话
  const handleClear = () => {
    setMessages([])
  }

  // 渲染消息
  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user'

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            gap: 12
          }}
        >
          {/* 头像 */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isUser ? '#667eea' : '#52c41a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}
          >
            {isUser ? <UserOutlined /> : <RobotOutlined />}
          </div>

          {/* 消息内容 */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: isUser ? '#667eea' : '#f5f5f5',
                color: isUser ? 'white' : 'inherit'
              }}
            >
              <Paragraph
                style={{
                  margin: 0,
                  color: isUser ? 'white' : 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {msg.content || (isStreaming && !isUser ? '思考中...' : '')}
              </Paragraph>
            </div>

            {/* 时间戳和处理时间 */}
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#999',
                textAlign: isUser ? 'right' : 'left'
              }}
            >
              <Space size="small">
                <ClockCircleOutlined />
                {dayjs(msg.timestamp).format('HH:mm:ss')}
                {msg.processingTime && (
                  <span>· 耗时 {msg.processingTime}ms</span>
                )}
              </Space>
            </div>

            {/* 来源文档 */}
            {!isUser && msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Collapse
                  size="small"
                  items={[
                    {
                      key: '1',
                      label: (
                        <Space>
                          <FileTextOutlined />
                          <Text strong>参考来源 ({msg.sources.length})</Text>
                        </Space>
                      ),
                      children: (
                        <List
                          size="small"
                          dataSource={msg.sources}
                          renderItem={(source, index) => (
                            <List.Item key={source.chunk_id}>
                              <List.Item.Meta
                                avatar={
                                  <Tag color="blue">#{index + 1}</Tag>
                                }
                                title={
                                  <Space>
                                    <FileTextOutlined style={{ color: '#1890ff' }} />
                                    <Text strong>{source.document.filename}</Text>
                                    <Tag
                                      color="green"
                                      icon={<ThunderboltOutlined />}
                                    >
                                      {(source.score * 100).toFixed(1)}%
                                    </Tag>
                                  </Space>
                                }
                                description={
                                  <Paragraph
                                    ellipsis={{ rows: 2, expandable: true }}
                                    style={{ margin: 0, fontSize: 12 }}
                                  >
                                    {source.content}
                                  </Paragraph>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )
                    }
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>智能问答</h1>
        <p style={{ color: '#666', margin: 0 }}>基于 RAG 的智能对话助手</p>
      </div>

      {/* 配置区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 知识库选择 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              选择知识库 <span style={{ color: 'red' }}>*</span>
            </div>
            <Select
              mode="multiple"
              placeholder="请选择一个或多个知识库"
              style={{ width: '100%' }}
              value={selectedKBs}
              onChange={setSelectedKBs}
              options={kbsData.map(kb => ({
                label: kb.name,
                value: kb.id
              }))}
              maxTagCount="responsive"
            />
          </div>

          {/* 高级选项 */}
          <Space wrap>
            <Space>
              <Text>返回结果数:</Text>
              <Select
                value={topK}
                onChange={setTopK}
                style={{ width: 80 }}
                options={[
                  { label: '3', value: 3 },
                  { label: '5', value: 5 },
                  { label: '10', value: 10 }
                ]}
              />
            </Space>
            <Space>
              <Text>显示来源:</Text>
              <Switch checked={includeSources} onChange={setIncludeSources} />
            </Space>
            <Space>
              <Text>流式响应:</Text>
              <Switch checked={useStream} onChange={setUseStream} />
            </Space>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClear}
              disabled={messages.length === 0}
            >
              清空对话
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 对话区域 */}
      <Card
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 16,
          overflow: 'hidden'
        }}
        bodyStyle={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px'
        }}
      >
        {messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" style={{ textAlign: 'center' }}>
                <RobotOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Text>你好!我是AI助手,基于你的知识库回答问题</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请选择知识库后开始提问
                </Text>
              </Space>
            }
            style={{ marginTop: '20%' }}
          />
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </Card>

      {/* 输入区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            placeholder="输入你的问题...&#10;例如：如何提高销售转化率？"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ fontSize: 14 }}
            disabled={selectedKBs.length === 0 || isStreaming || askMutation.isPending}
          />
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={isStreaming || askMutation.isPending}
            disabled={!question.trim() || selectedKBs.length === 0}
            style={{ height: 'auto' }}
          >
            发送
          </Button>
        </Space.Compact>
        <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
          💡 提示：按 Enter 键发送，Shift + Enter 换行
        </div>
      </Card>
    </div>
  )
}
