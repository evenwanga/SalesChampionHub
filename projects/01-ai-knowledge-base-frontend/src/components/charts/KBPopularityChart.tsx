import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { KBPopularity } from '@/types/analytics'
import { Skeleton } from '@/components/ui/skeleton'

interface KBPopularityChartProps {
  data: KBPopularity[]
  isLoading?: boolean
  title?: string
  description?: string
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(221 83% 53%)',
  'hsl(142 71% 45%)',
  'hsl(47 96% 53%)',
  'hsl(280 84% 60%)',
  'hsl(346 84% 61%)',
  'hsl(24 95% 53%)',
  'hsl(197 84% 53%)',
  'hsl(120 60% 50%)',
  'hsl(280 60% 50%)',
]

export const KBPopularityChart: React.FC<KBPopularityChartProps> = ({
  data,
  isLoading,
  title = '热门知识库',
  description = '按查询次数排名的知识库'
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

  // 截取前10个
  const top10 = data.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top10} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              type="category" 
              dataKey="kb_name" 
              width={150}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [`${value} 次`, '查询次数']}
            />
            <Bar dataKey="query_count" radius={[0, 4, 4, 0]}>
              {top10.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

