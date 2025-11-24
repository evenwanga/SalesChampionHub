import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User as UserIcon, FileText, Trash2, Clock, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { useAsk } from '@/hooks/useRAG'
import searchService from '@/services/searchService'
import type { RagSource, SSEChunkEvent, SSEEvent, AskRequest } from '@/types'
import { getErrorMessage } from '@/utils/error'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  timestamp: Date
  processingTime?: number
}

export const Assistant: React.FC = () => {
  const { toast } = useToast()
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      let sources: RagSource[] = []

      const streamPayload = await searchService.buildQueryPayload({
        type: 'stream',
        query: userMessage.content,
        kbIds: selectedKBs,
        topK,
        includeSources,
      }) as AskRequest

      const stream = searchService.askStream(streamPayload)

      for await (const event of stream) {
        const sseEvent = event as SSEEvent

        if (sseEvent.event === 'sources') {
          sources = sseEvent.data as RagSource[]
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.sources = sources
            }
            return updated
          })
        } else if (sseEvent.event === 'chunk') {
          const chunkEvent = sseEvent as SSEChunkEvent
          const chunk = typeof chunkEvent.data === 'object' && chunkEvent.data
            ? (chunkEvent.data as { content: string }).content
            : ''
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
          toast({
            variant: 'destructive',
            title: '错误',
            description: '流式响应错误',
          })
          console.error('SSE Error:', sseEvent.data)
        }
      }
    } catch (error: any) {
      const friendly = getErrorMessage(error, '问答失败')
      toast({
        variant: 'destructive',
        title: '错误',
        description: friendly,
      })
      console.error('Stream error:', error)
    } finally {
      setIsStreaming(false)
    }
  }

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
        kbIds: selectedKBs,
        topK,
        includeSources,
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
        processingTime: result.latency_ms
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: getErrorMessage(error, '问答失败'),
      })
    }
  }

  const handleSubmit = () => {
    if (useStream) {
      handleStreamAsk()
    } else {
      handleNonStreamAsk()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleClear = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">智能问答</h1>
        <p className="text-muted-foreground">基于 RAG 的智能对话助手</p>
      </div>

      {/* 配置区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kbs">
                选择知识库 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedKBs[0]}
                onValueChange={(value) => setSelectedKBs([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择知识库" />
                </SelectTrigger>
                <SelectContent>
                  {kbsData.map(kb => (
                    <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="topK">返回结果数:</Label>
                <Select value={String(topK)} onValueChange={(v) => setTopK(Number(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="includeSources">显示来源:</Label>
                <Switch
                  id="includeSources"
                  checked={includeSources}
                  onCheckedChange={setIncludeSources}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="useStream">流式响应:</Label>
                <Switch
                  id="useStream"
                  checked={useStream}
                  onCheckedChange={setUseStream}
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                disabled={messages.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空对话
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 对话区域 */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>对话记录</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bot className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">你好！我是AI助手</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                基于你的知识库回答问题。请选择知识库后开始提问
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}
                    <div className={`flex flex-col gap-2 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content || (isStreaming && !isUser ? '思考中...' : '')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(msg.timestamp, 'HH:mm:ss')}
                        {msg.processingTime && (
                          <span>· 耗时 {msg.processingTime}ms</span>
                        )}
                      </div>
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <Collapsible className="w-full">
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <FileText className="mr-2 h-4 w-4" />
                              参考来源 ({msg.sources.length})
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2">
                            {msg.sources.map((source, index) => (
                              <Card key={source.chunk_id} className="text-xs">
                                <CardContent className="p-3 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">#{index + 1}</Badge>
                                    <FileText className="h-3 w-3 text-blue-500" />
                                    <span className="font-medium">{source.filename}</span>
                                    <Badge variant="secondary" className="ml-auto">
                                      <Zap className="mr-1 h-3 w-3" />
                                      {(source.similarity * 100).toFixed(1)}%
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground line-clamp-2">
                                    {source.content_snippet}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <UserIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* 输入区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Textarea
              placeholder="输入你的问题... (Enter 发送, Shift + Enter 换行)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={2}
              disabled={selectedKBs.length === 0 || isStreaming || askMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || selectedKBs.length === 0 || isStreaming || askMutation.isPending}
              size="lg"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 提示：按 Enter 键发送，Shift + Enter 换行
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
