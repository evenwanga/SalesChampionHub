import { useState } from 'react'
import { Search as SearchIcon, FileText, Clock, Zap, Loader2 } from 'lucide-react'
import { useAccessibleKBs } from '@/hooks/useKnowledgeBases'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types'
import { getErrorMessage } from '@/utils/error'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const Search: React.FC = () => {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedKBs, setSelectedKBs] = useState<string[]>([])
  const [topK, setTopK] = useState(5)
  const [minScore, setMinScore] = useState(0.5)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchMeta, setSearchMeta] = useState<{
    query: string
    total: number
    processingTime: number
  } | null>(null)

  const { data: kbsData = [] } = useAccessibleKBs()
  const searchMutation = useSearch()

  const handleSearch = async () => {
    if (!query.trim() || selectedKBs.length === 0) {
      toast({
        variant: 'destructive',
        title: '提示',
        description: '请输入搜索内容并选择知识库',
      })
      return
    }

    try {
      const result = await searchMutation.mutateAsync({
        query: query.trim(),
        kbIds: selectedKBs,
        topK,
        minScore,
      })

      setSearchResults(result.results)
      setSearchMeta({
        query: query.trim(),
        total: result.results.length,
        processingTime: result.latency_ms
      })
    } catch (error) {
      console.error('搜索失败:', error)
      toast({
        variant: 'destructive',
        title: '搜索失败',
        description: getErrorMessage(error, '搜索失败，请稍后重试'),
      })
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.8) return 'text-green-500'
    if (score >= 0.7) return 'text-yellow-600'
    if (score >= 0.6) return 'text-orange-500'
    return 'text-red-500'
  }

  const highlightText = (text: string, keyword: string): React.ReactNode => {
    if (!keyword) return text
    const regex = new RegExp(`(${keyword})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">语义搜索</h1>
        <p className="text-muted-foreground">基于向量相似度的智能文档检索</p>
      </div>

      {/* 搜索配置区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* 搜索输入 */}
            <div className="space-y-2">
              <Label htmlFor="query">搜索内容</Label>
              <Textarea
                id="query"
                placeholder="输入你想要搜索的问题或关键词...例如：如何提高销售转化率？"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                💡 提示：输入完整的问题或关键词，系统会自动理解语义并查找相关内容
              </p>
            </div>

            {/* 知识库选择 */}
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

            {/* 高级选项 */}
            <div className="space-y-4">
              <Label>高级选项</Label>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topK">返回结果数 (Top K)</Label>
                  <span className="text-sm font-medium">{topK}</span>
                </div>
                <Slider
                  id="topK"
                  min={1}
                  max={20}
                  step={1}
                  value={[topK]}
                  onValueChange={([value]) => setTopK(value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="minScore">最低相似度阈值</Label>
                  <span className="text-sm font-medium">{minScore.toFixed(2)}</span>
                </div>
                <Slider
                  id="minScore"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[minScore]}
                  onValueChange={([value]) => setMinScore(value)}
                />
              </div>
            </div>

            {/* 搜索按钮 */}
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim() || selectedKBs.length === 0}
              className="w-full"
              size="lg"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  搜索中...
                </>
              ) : (
                <>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  搜索
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 搜索结果区域 */}
      {searchMeta && (
        <Card>
          <CardHeader>
            <Alert>
              <AlertDescription>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <SearchIcon className="h-4 w-4" />
                    搜索关键词: <strong>{searchMeta.query}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    找到 <strong>{searchMeta.total}</strong> 个相关结果
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    耗时 <strong>{searchMeta.processingTime}</strong> ms
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mb-4" />
                <p>未找到相关内容</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((item, index) => {
                  const score = item.similarity ?? (1 - item.distance / 2)
                  return (
                    <Card key={item.chunk_id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold">{item.filename}</span>
                                <Badge variant="outline">
                                  {item.file_type.split('/').pop()?.toUpperCase() || 'UNKNOWN'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Badge className={getScoreColor(score)}>
                            <Zap className="mr-1 h-3 w-3" />
                            {(score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {highlightText(item.content, searchMeta.query)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 空状态提示 */}
      {!searchMeta && !searchMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">开始智能检索</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                输入搜索内容，选择知识库，系统将基于向量相似度算法理解问题的语义含义，为您找到最相关的内容
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
