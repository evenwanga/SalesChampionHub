import { Loader2 } from 'lucide-react'

interface LoadingProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
  fullscreen?: boolean
  spinning?: boolean
  children?: React.ReactNode
}

/**
 * Reusable loading component with different display modes
 */
export const Loading: React.FC<LoadingProps> = ({
  tip,
  size = 'large',
  fullscreen = false,
  spinning = true,
  children,
}) => {
  const sizeMap = {
    small: 'h-6 w-6',
    default: 'h-8 w-8',
    large: 'h-12 w-12',
  }

  if (!spinning && children) {
    return <>{children}</>
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
          {tip && <p className="text-sm text-muted-foreground">{tip}</p>}
        </div>
      </div>
    )
  }

  if (children) {
    return (
      <div className="relative">
        {spinning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
            {tip && <p className="ml-2 text-sm text-muted-foreground">{tip}</p>}
          </div>
        )}
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
      {tip && <p className="text-sm text-muted-foreground">{tip}</p>}
    </div>
  )
}

/**
 * Full screen loading component
 */
export const FullScreenLoading: React.FC<{ tip?: string }> = ({ tip = '加载中...' }) => {
  return <Loading fullscreen tip={tip} />
}

/**
 * Inline loading component for wrapping content
 */
export const InlineLoading: React.FC<{ loading: boolean; tip?: string; children: React.ReactNode }> = ({
  loading,
  tip,
  children,
}) => {
  return (
    <Loading spinning={loading} tip={tip}>
      {children}
    </Loading>
  )
}

/**
 * Card loading skeleton
 */
export const CardLoading: React.FC = () => {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  )
}
