import { useState } from 'react'
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  List,
  Tag,
  Divider,
  Empty,
  Spin,
  Slider,
  Typography,
  Alert,
  App
} from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types'
import { getErrorMessage } from '@/utils/error'

const { TextArea } = Input
const { Text, Paragraph } = Typography

export const Search: React.FC = () => {
  const { message } = App.useApp()
  const [query, setQuery] = useState('')
  const [selectedKBs, setSelectedKBs] = useState<string[]>([])
  const [topK, setTopK] = useState(5)
  const [minScore, setMinScore] = useState(0.5)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchMeta, setSearchMeta] = useState<{
    query: string
    total: number
    processingTime: number
    serverTotal?: number
  } | null>(null)

  const { data: kbsData = [] } = useAccessibleKBs()
  const searchMutation = useSearch()

  // 执行搜索
  const handleSearch = async () => {
    if (!query.trim()) {
      return
    }

    if (selectedKBs.length === 0) {
      return
    }

    try {
      const trimmedQuery = query.trim()
      const result = await searchMutation.mutateAsync({
        query: trimmedQuery,
        kbIds: selectedKBs,
        topK,
        minScore,
      })

      setSearchResults(result.results)
      setSearchMeta({
        query: trimmedQuery,
        total: result.results.length,
        processingTime: result.latency_ms,
        serverTotal: result.total_count
      })
    } catch (error) {
      console.error('搜索失败:', error)
      message.error(getErrorMessage(error, '搜索失败，请稍后重试'))
    }
  }

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // 高亮搜索词
  const highlightText = (text: string, keyword: string): React.ReactNode => {
    if (!keyword) return text

    const regex = new RegExp(`(${keyword})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} style={{ backgroundColor: '#fff566', fontWeight: 600 }}>
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  // 获取相似度颜色
  const getScoreColor = (score: number): string => {
    if (score >= 0.9) return '#52c41a'
    if (score >= 0.8) return '#73d13d'
    if (score >= 0.7) return '#95de64'
    if (score >= 0.6) return '#faad14'
    return '#ff4d4f'
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>语义搜索</h1>
        <p style={{ color: '#666', margin: 0 }}>基于向量相似度的智能文档检索</p>
      </div>

      {/* 搜索配置区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 搜索输入 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>搜索内容</div>
            <TextArea
              placeholder="输入你想要搜索的问题或关键词...&#10;例如：如何提高销售转化率？"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ fontSize: 14 }}
            />
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              💡 提示：按 Enter 键直接搜索，Shift + Enter 换行
            </div>
          </div>

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
          <div>
            <div style={{ marginBottom: 16, fontWeight: 500 }}>高级选项</div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Top K */}
              <div>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>返回结果数 (Top K)</span>
                  <Text strong>{topK}</Text>
                </div>
                <Slider
                  min={1}
                  max={20}
                  value={topK}
                  onChange={setTopK}
                  marks={{
                    1: '1',
                    5: '5',
                    10: '10',
                    15: '15',
                    20: '20'
                  }}
                />
              </div>

              {/* 最低相似度 */}
              <div>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>最低相似度阈值</span>
                  <Text strong>{minScore.toFixed(2)}</Text>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={minScore}
                  onChange={setMinScore}
                  marks={{
                    0: '0',
                    0.5: '0.5',
                    1: '1'
                  }}
                />
              </div>
            </Space>
          </div>

          {/* 搜索按钮 */}
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={searchMutation.isPending}
            disabled={!query.trim() || selectedKBs.length === 0}
            block
          >
            搜索
          </Button>
        </Space>
      </Card>

      {/* 搜索结果区域 */}
      {searchMeta && (
        <Card>
          {/* 搜索元信息 */}
          <Alert
            message={
              <Space split={<Divider type="vertical" />}>
                <span>
                  <SearchOutlined /> 搜索关键词: <strong>{searchMeta.query}</strong>
                </span>
                <span>
                  <FileTextOutlined /> 找到 <strong>{searchMeta.total}</strong> 个相关结果
                  {typeof searchMeta.serverTotal === 'number' && searchMeta.serverTotal !== searchMeta.total && (
                    <span style={{ marginLeft: 8, color: '#999' }}>（服务器返回 {searchMeta.serverTotal} 条）</span>
                  )}
                </span>
                <span>
                  <ClockCircleOutlined /> 耗时 <strong>{searchMeta.processingTime}</strong> ms
                </span>
              </Space>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          {/* 结果列表 */}
          {searchResults.length === 0 ? (
            <Empty
              description="未找到相关内容"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <Spin spinning={searchMutation.isPending}>
              <List
                dataSource={searchResults}
                renderItem={(item, index) => (
                  <List.Item
                    key={item.chunk_id}
                    style={{
                      padding: '16px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      marginBottom: 12,
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: getScoreColor(item.similarity ?? (1 - item.distance / 2)),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 14
                          }}
                        >
                          #{index + 1}
                        </div>
                      }
                      title={
                        <Space>
                          <FileTextOutlined style={{ color: '#1890ff' }} />
                          <Text strong>{item.filename}</Text>
                          <Tag color={item.file_type.includes('pdf') ? 'red' : 'blue'}>
                            {item.file_type.split('/').pop()?.toUpperCase() || 'UNKNOWN'}
                          </Tag>
                          <Tag
                            color={getScoreColor(item.similarity ?? (1 - item.distance / 2))}
                            icon={<ThunderboltOutlined />}
                          >
                            相似度: {((item.similarity ?? (1 - item.distance / 2)) * 100).toFixed(1)}%
                          </Tag>
                        </Space>
                      }
                      description={
                        <div style={{ marginTop: 12 }}>
                          <Paragraph
                            style={{
                              fontSize: 14,
                              lineHeight: 1.8,
                              marginBottom: 8,
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {highlightText(item.content, searchMeta.query)}
                          </Paragraph>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Spin>
          )}
        </Card>
      )}

      {/* 空状态提示 */}
      {!searchMeta && !searchMutation.isPending && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" style={{ textAlign: 'center' }}>
                <Text>输入搜索内容，选择知识库，开始智能检索</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  语义搜索基于向量相似度算法，能理解问题的语义含义
                </Text>
              </Space>
            }
            style={{ padding: '60px 0' }}
          />
        </Card>
      )}
    </div>
  )
}
