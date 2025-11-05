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
      // Get access token without resource parameter
      // This returns the default access token (IdToken) from Logto
      getAccessToken()
        .then((token) => {
          // Store token in window object for axios interceptor
          (window as any).__logtoAccessToken = token
          console.log('Access token obtained successfully')
          setTokenReady(true)
        })
        .catch((error) => {
          console.error('Failed to get access token:', error)
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
