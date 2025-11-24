import axios, { AxiosError } from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { APIResponse } from '@/types'
import { apiBaseUrl } from '@/utils/env'

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add Logto access token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get Logto access token from window.__logtoAccessToken
    // Note: Token should be set by ProtectedRoute or App component
    const token = (window as any).__logtoAccessToken

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => {
    // Return the data directly if it's a successful response
    return response
  },
  (error: AxiosError<APIResponse>) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // 清除 token
      ;(window as any).__logtoAccessToken = undefined
      
      // 不要直接使用 window.location.href 重定向，这会导致循环
      // 让应用层（React Router）处理重定向
      console.warn('API returned 401 - Access token is invalid or expired')
      
      // 可选：触发一个自定义事件，让应用监听并处理
      const event = new CustomEvent('auth:unauthorized', { 
        detail: { 
          message: 'Session expired or invalid token',
          timestamp: Date.now()
        }
      })
      window.dispatchEvent(event)
    }

    // Extract error message
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unknown error occurred'

    // Create a standardized error response
    const apiError: APIResponse = {
      success: false,
      error: errorMessage,
      error_code: error.response?.data?.error_code,
    }

    return Promise.reject(apiError)
  }
)

export default api
