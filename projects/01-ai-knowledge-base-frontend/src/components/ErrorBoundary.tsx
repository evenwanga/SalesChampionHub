import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents the entire app from crashing when a component error occurs
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('Error Boundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send error to logging service like Sentry
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>出错了</CardTitle>
              </div>
              <CardDescription>
                抱歉，页面加载出现问题。请尝试刷新页面或联系技术支持。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>
                  刷新页面
                </Button>
                <Button variant="outline" onClick={this.handleReset}>
                  返回上一页
                </Button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <Alert variant="destructive">
                  <AlertTitle>错误详情 (仅开发环境可见)</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.toString()}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-md bg-muted p-4">
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </details>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
