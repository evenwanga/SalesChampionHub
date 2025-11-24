import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SearchHotword {
  word: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

interface SearchHotwordsCardProps {
  data: SearchHotword[]
  isLoading?: boolean
  title?: string
  description?: string
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case 'down':
      return <TrendingDown className="h-3 w-3 text-red-500" />
    case 'stable':
      return <Minus className="h-3 w-3 text-muted-foreground" />
  }
}

export const SearchHotwordsCard: React.FC<SearchHotwordsCardProps> = ({
  data,
  isLoading,
  title = '搜索热词',
  description = '用户最常搜索的关键词'
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
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
        <div className="space-y-2">
          {data.map((hotword, index) => (
            <div 
              key={hotword.word}
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
                <span className="font-medium">{hotword.word}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendIcon trend={hotword.trend} />
                <span className="text-sm text-muted-foreground">{hotword.count}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

