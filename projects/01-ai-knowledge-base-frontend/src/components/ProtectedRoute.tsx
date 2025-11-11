import { Navigate } from 'react-router-dom'
import { useLogto } from '@logto/react'
import { Spin } from 'antd'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component - wraps routes that require authentication
 * Redirects to login page if user is not authenticated
 * Fetches and stores Logto access token for API calls
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, getAccessToken } = useLogto()
  const [tokenReady, setTokenReady] = useState(false)

  // Get and store Logto access token when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Request access token for the API resource
      // This is required to get a proper access token (not ID token) for backend API
      const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE || 'https://api.saleschampionhub.com/kb'

      getAccessToken(apiResource)
        .then((token) => {
          // Store token in window object for axios interceptor
          (window as any).__logtoAccessToken = token
          console.log('Access token obtained successfully for resource:', apiResource)
          setTokenReady(true)
        })
        .catch((error) => {
          console.error('Failed to get access token for resource:', apiResource, error)
          // Continue anyway to avoid blocking the UI
          // The API calls will fail with 401, which is handled by axios interceptor
          setTokenReady(true)
        })
    }
  }, [isAuthenticated, isLoading, getAccessToken])

  // 显示加载状态（包括获取token时）
  if (isLoading || (isAuthenticated && !tokenReady)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        <Spin size="large" tip={isLoading ? '正在验证身份...' : '正在获取令牌...'} />
      </div>
    )
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
