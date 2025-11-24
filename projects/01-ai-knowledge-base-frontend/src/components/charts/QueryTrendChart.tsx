import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { QueryAnalytics } from '@/types/analytics'
import { Skeleton } from '@/components/ui/skeleton'

interface QueryTrendChartProps {
  data: QueryAnalytics[]
  isLoading?: boolean
  title?: string
  description?: string
}

export const QueryTrendChart: React.FC<QueryTrendChartProps> = ({
  data,
  isLoading,
  title = '查询趋势',
  description = '搜索和问答请求的时间趋势'
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="search_count" 
              stroke="hsl(var(--primary))" 
              name="搜索次数"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="ask_count" 
              stroke="hsl(142 71% 45%)" 
              name="问答次数"
              strokeWidth={2}
              dot={{ fill: 'hsl(142 71% 45%)' }}
            />
            <Line 
              type="monotone" 
              dataKey="total_queries" 
              stroke="hsl(221 83% 53%)" 
              name="总查询"
              strokeWidth={2}
              dot={{ fill: 'hsl(221 83% 53%)' }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

