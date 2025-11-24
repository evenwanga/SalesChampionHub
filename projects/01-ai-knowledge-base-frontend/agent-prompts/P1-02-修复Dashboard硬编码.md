# Agent任务：修复Dashboard硬编码数据

**优先级：** P1 - 影响用户信任  
**预计工作量：** 2小时  
**影响范围：** 用户体验和数据可信度

---

## 任务背景

### 问题描述
Dashboard页面显示的统计数据是硬编码的假数据，不反映实际系统状态。这会误导用户，降低系统可信度。

### 当前实现
**文件：** `projects/01-ai-knowledge-base-frontend/src/pages/Dashboard.tsx`

```typescript
const stats = [
  { title: '知识库', value: '5', ... },      // 硬编码
  { title: '文档总数', value: '128', ... },   // 硬编码
  { title: '今日搜索', value: '45', ... },    // 硬编码
  { title: '提问次数', value: '32', ... },   // 硬编码
]
```

### 可用的后端接口
1. `GET /api/v1/knowledge-bases?limit=1` - 返回 `meta.total` 获取知识库总数
2. `GET /api/v1/knowledge-bases/:id/stats` - 获取各知识库的文档统计
3. `GET /api/v1/query-stats?start_date=today&end_date=today` - 获取今日查询统计

---

## 实现目标

将Dashboard的4个统计卡片改为使用真实API数据：
1. **知识库总数** - 从知识库列表接口获取
2. **文档总数** - 汇总所有知识库的文档数
3. **今日搜索次数** - 从查询统计接口获取
4. **提问次数** - 从查询统计接口获取

---

## 实现步骤

### 步骤1：创建Dashboard专用Hook

**文件：** `projects/01-ai-knowledge-base-frontend/src/hooks/useDashboardStats.ts` （新建）

```typescript
import { useQuery } from '@tanstack/react-query'
import knowledgeBaseService from '@/services/knowledgeBaseService'
import searchService from '@/services/searchService'

export interface DashboardStats {
  totalKBs: number
  totalDocuments: number
  todaySearches: number
  todayQuestions: number
  loading: boolean
  error: Error | null
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats(): DashboardStats {
  // 1. 获取知识库总数
  const { data: kbData, isLoading: kbLoading, error: kbError } = useQuery({
    queryKey: ['dashboard', 'kb-count'],
    queryFn: async () => {
      const result = await knowledgeBaseService.listKBs({ limit: 1, offset: 0 })
      return result.meta.total
    },
    staleTime: 2 * 60 * 1000, // 2分钟
  })

  // 2. 获取所有知识库（用于汇总文档数）
  const { data: allKBsData, isLoading: allKBsLoading, error: allKBsError } = useQuery({
    queryKey: ['dashboard', 'all-kbs'],
    queryFn: async () => {
      const result = await knowledgeBaseService.listKBs({ limit: 100 })
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })

  // 3. 获取今日查询统计
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const { data: queryStats, isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: ['dashboard', 'query-stats', today],
    queryFn: async () => {
      return await searchService.getQueryStats({
        start_date: today,
        end_date: today,
        group_by: 'day'
      })
    },
    staleTime: 1 * 60 * 1000, // 1分钟（更频繁更新）
  })

  // 计算文档总数
  const totalDocuments = allKBsData?.reduce((sum, kb) => sum + (kb.document_count || 0), 0) || 0

  // 提取今日统计
  const todayStats = queryStats?.[0] || {
    total_queries: 0,
    search_count: 0,
    ask_count: 0
  }

  return {
    totalKBs: kbData || 0,
    totalDocuments,
    todaySearches: todayStats.search_count || 0,
    todayQuestions: todayStats.ask_count || 0,
    loading: kbLoading || allKBsLoading || queryLoading,
    error: kbError || allKBsError || queryError || null,
  }
}
```

### 步骤2：修改Dashboard组件

**文件：** `projects/01-ai-knowledge-base-frontend/src/pages/Dashboard.tsx`

**替换内容：**

```typescript
import { Database, FileText, Search, HelpCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export const Dashboard: React.FC = () => {
  const { totalKBs, totalDocuments, todaySearches, todayQuestions, loading, error } = useDashboardStats()

  const stats = [
    {
      title: '知识库',
      value: loading ? '...' : totalKBs.toString(),
      description: '当前管理的知识库数量',
      icon: Database,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: '文档总数',
      value: loading ? '...' : totalDocuments.toString(),
      description: '已上传的文档总数',
      icon: FileText,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: '今日搜索',
      value: loading ? '...' : todaySearches.toString(),
      description: '今天的搜索请求次数',
      icon: Search,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    },
    {
      title: '提问次数',
      value: loading ? '...' : todayQuestions.toString(),
      description: '智能问答使用次数',
      icon: HelpCircle,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
          <p className="text-muted-foreground">欢迎回来，这里是您的工作概览</p>
        </div>
        {/* 可选：添加刷新按钮 */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            加载统计数据失败：{error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
          <CardDescription>查看最近的系统活动和操作记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {loading ? '加载中...' : '暂无活动记录'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 步骤3：（可选）添加更详细的统计

如果需要更丰富的Dashboard，可以添加：

**1. 文档状态分布：**
```typescript
// 在useDashboardStats中添加
const documentsByStatus = allKBsData?.reduce((acc, kb) => {
  // 需要后端提供更详细的stats接口
  return acc
}, { pending: 0, processing: 0, completed: 0, failed: 0 })
```

**2. 趋势图数据：**
```typescript
// 获取最近7天的查询统计
const { data: weeklyStats } = useQuery({
  queryKey: ['dashboard', 'weekly-stats'],
  queryFn: async () => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    return await searchService.getQueryStats({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      group_by: 'day'
    })
  },
  staleTime: 5 * 60 * 1000,
})
```

---

## 验证方法

### 1. 开发环境测试

**启动服务：**
```bash
# 终端1：启动后端
cd projects/01-ai-knowledge-base
go run cmd/server/main.go

# 终端2：启动前端
cd projects/01-ai-knowledge-base-frontend
npm run dev
```

**访问：** http://localhost:3000

**验证清单：**
- [ ] 页面加载时显示"..."加载状态
- [ ] 知识库总数显示正确（与知识库管理页面一致）
- [ ] 文档总数显示正确（汇总所有知识库）
- [ ] 今日搜索次数从0开始，执行搜索后递增
- [ ] 提问次数从0开始，执行问答后递增
- [ ] 错误时显示错误提示
- [ ] 刷新按钮工作正常

### 2. 数据一致性验证

**对比验证：**
```bash
# 1. 通过API直接查询
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/knowledge-bases?limit=1

# 2. 对比Dashboard显示的数量

# 3. 执行搜索
# 在前端执行一次搜索

# 4. 再次查询统计
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/query-stats?start_date=$(date +%Y-%m-%d)&end_date=$(date +%Y-%m-%d)"

# 5. 验证Dashboard数字是否更新
```

### 3. 边界情况测试

**测试场景：**
1. **无数据状态** - 清空数据库后，所有统计应为0
2. **网络错误** - 停止后端服务，应显示错误提示
3. **部分失败** - 模拟某个接口失败，其他数据仍应显示
4. **大数据量** - 创建大量知识库和文档，验证性能

---

## 性能优化建议

### 1. 缓存策略
```typescript
// 不同数据的缓存时间
{
  totalKBs: 2 * 60 * 1000,        // 2分钟（不常变）
  totalDocuments: 2 * 60 * 1000,  // 2分钟
  todayStats: 1 * 60 * 1000,      // 1分钟（频繁变化）
}
```

### 2. 避免过多请求
```typescript
// 如果知识库数量很多，考虑后端提供汇总接口
// GET /api/v1/stats/overview
// 返回所有统计数据
```

### 3. 加载状态优化
```typescript
// 使用骨架屏而非"..."
<Skeleton className="h-8 w-20" />
```

---

## 后续增强

### 可选功能（时间允许）

1. **自动刷新**
```typescript
// 每30秒自动刷新一次
useQuery({
  // ...
  refetchInterval: 30 * 1000,
})
```

2. **趋势指示器**
```typescript
<div className="flex items-center gap-1">
  <span className="text-2xl font-bold">{value}</span>
  <TrendingUp className="h-4 w-4 text-green-500" />
  <span className="text-xs text-green-500">+12%</span>
</div>
```

3. **图表可视化**
- 使用 recharts 或 chart.js
- 显示7天查询趋势
- 显示知识库文档分布

4. **快速操作按钮**
```typescript
<CardFooter>
  <Button variant="link" size="sm" asChild>
    <Link to="/knowledge-bases">查看详情 →</Link>
  </Button>
</CardFooter>
```

---

## 涉及文件清单

**新增文件：**
- `projects/01-ai-knowledge-base-frontend/src/hooks/useDashboardStats.ts`

**修改文件：**
- `projects/01-ai-knowledge-base-frontend/src/pages/Dashboard.tsx`

**相关文件（无需修改）：**
- `projects/01-ai-knowledge-base-frontend/src/services/knowledgeBaseService.ts`
- `projects/01-ai-knowledge-base-frontend/src/services/searchService.ts`

---

## 完成标准

- [ ] useDashboardStats Hook创建完成
- [ ] Dashboard组件修改完成
- [ ] 所有统计数据来自真实API
- [ ] 加载状态显示正确
- [ ] 错误处理完善
- [ ] 数据一致性验证通过
- [ ] 无TypeScript编译错误
- [ ] 无控制台警告
- [ ] 页面响应速度正常（< 1秒）
- [ ] 代码审查通过

---

**任务完成后，Dashboard将显示真实的系统统计数据，提升用户信任度。**

