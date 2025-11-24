import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { QueryAnalytics } from '@/types/analytics'
import { Skeleton } from '@/components/ui/skeleton'

interface ResponseTimeChartProps {
  data: QueryAnalytics[]
  isLoading?: boolean
  title?: string
  description?: string
}

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({
  data,
  isLoading,
  title = '响应时间趋势',
  description = '平均查询响应时间'
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
              label={{ value: 'ms', position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [`${value.toFixed(2)} ms`, '响应时间']}
            />
            <Line 
              type="monotone" 
              dataKey="avg_response_time_ms" 
              stroke="hsl(280 84% 60%)" 
              name="平均响应时间"
              strokeWidth={2}
              dot={{ fill: 'hsl(280 84% 60%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

