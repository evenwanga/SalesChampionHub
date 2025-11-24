import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">统计分析</h1>
        <p className="text-muted-foreground">查看系统使用统计和数据分析</p>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总使用次数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500" />
              <span className="text-green-500"> +12.5%</span> 较上周
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500" />
              <span className="text-green-500"> +8</span> 本周新增
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">-0.3s</span> 较上周
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+0.5%</span> 较上周
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <Card>
        <CardHeader>
          <CardTitle>使用趋势</CardTitle>
          <CardDescription>最近 7 天的系统使用情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            图表组件开发中...
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>热门知识库</CardTitle>
            <CardDescription>访问量 TOP 5</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">知识库 {i}</p>
                    <p className="text-xs text-muted-foreground">{200 - i * 20} 次访问</p>
                  </div>
                  <div className="h-2 w-24 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${100 - i * 15}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户活跃度</CardTitle>
            <CardDescription>最近 7 天活跃用户分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              用户分布图表开发中...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
