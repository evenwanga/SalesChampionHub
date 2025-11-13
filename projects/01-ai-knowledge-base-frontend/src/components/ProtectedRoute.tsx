import { Navigate } from 'react-router-dom'
import { useLogto } from '@logto/react'
import { Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'

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
  const { isAuthenticated, isLoading, getAccessToken } = useLogto()
  const [tokenReady, setTokenReady] = useState(false)
  const tokenFetchedRef = useRef(false)

  useEffect(() => {
    // Reset token state when user signs out
    if (!isAuthenticated) {
      tokenFetchedRef.current = false
      setTokenReady(false)
      setGlobalAccessToken(undefined)
      return
    }

    let cancelled = false

    const ensureToken = async () => {
      if (tokenFetchedRef.current) {
        setTokenReady(true)
        return
      }

      try {
        const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE || 'https://api.saleschampionhub.com/kb'
        const token = await getAccessToken(apiResource)

        if (!cancelled) {
          setGlobalAccessToken(token)
          tokenFetchedRef.current = true
          setTokenReady(true)
        }
      } catch (error) {
        console.error('Failed to fetch Logto access token:', error)
        if (!cancelled) {
          // Allow UI to render; backend calls will surface 401s if token missing
          setTokenReady(true)
        }
      }
    }

    void ensureToken()

    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated])

  const isAuthInitializing = isLoading && !isAuthenticated

  // Show loading spinner while Logto SDK initializes or token is being fetched
  if (isAuthInitializing || (isAuthenticated && !tokenReady)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div style={{ color: '#666', fontSize: '14px' }}>
          {isAuthInitializing ? '正在验证身份...' : '正在获取访问令牌...'}
        </div>
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
