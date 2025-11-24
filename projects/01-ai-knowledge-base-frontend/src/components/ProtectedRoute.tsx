import { Navigate } from 'react-router-dom'
import { useLogto } from '@logto/react'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

type WindowWithLogto = Window & {
  __logtoAccessToken?: string
}

const setGlobalAccessToken = (token?: string) => {
  if (typeof window === 'undefined') return
  ;(window as WindowWithLogto).__logtoAccessToken = token
}

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component - wraps routes that require authentication
 * Redirects to login page if user is not authenticated
 * Ensures Logto API access token is fetched once before rendering children
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, getAccessToken, signOut } = useLogto()
  const [tokenReady, setTokenReady] = useState(false)
  const refreshTimerRef = useRef<number>()
  const [forceLogout, setForceLogout] = useState(false)

  // 监听 API 401 错误事件
  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent
      console.error('Unauthorized access detected:', customEvent.detail)
      
      // 清除 token 并强制登出
      setGlobalAccessToken(undefined)
      setTokenReady(false)
      setForceLogout(true)
      
      // 执行登出操作
      const postLogoutRedirectUri = 
        import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000'
      void signOut(postLogoutRedirectUri)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [signOut])

  useEffect(() => {
    const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE || 'https://api.saleschampionhub.com/kb'

    if (!isAuthenticated) {
      setTokenReady(false)
      setGlobalAccessToken(undefined)
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
      }
      return
    }

    let cancelled = false

    const fetchAccessToken = async () => {
      try {
        const token = await getAccessToken(apiResource)
        if (!cancelled) {
          setGlobalAccessToken(token)
          setTokenReady(true)
          setForceLogout(false) // 重置强制登出标志
        }
      } catch (error) {
        console.error('Failed to fetch Logto access token:', error)
        if (!cancelled) {
          // 获取 token 失败时，标记为就绪但不设置 token
          // 这样可以让页面继续渲染，而 API 请求会失败并触发 401 处理
          setTokenReady(true)
        }
      }
    }

    setTokenReady(false)
    void fetchAccessToken()

    const intervalId = window.setInterval(() => {
      void fetchAccessToken()
    }, 45 * 60 * 1000) // Refresh every 45 minutes
    refreshTimerRef.current = intervalId

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [getAccessToken, isAuthenticated])

  const isAuthInitializing = isLoading && !isAuthenticated

  // Show loading spinner while Logto SDK initializes or token is being fetched
  if (isAuthInitializing || (isAuthenticated && !tokenReady)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {isAuthInitializing ? '正在验证身份...' : '正在获取访问令牌...'}
        </p>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render children if authenticated
  return <>{children}</>
}
