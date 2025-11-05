import axios from 'axios'
import type { UserInfo, LoginRequest, LoginResponse } from '@/types'

// Note: Auth APIs are from User Center (subproject 0)
// User Center runs on a different base URL
const USER_CENTER_BASE_URL = import.meta.env.VITE_USER_CENTER_API || 'http://localhost:8000/api/v1'

const authApi = axios.create({
  baseURL: USER_CENTER_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

class AuthService {
  /**
   * Login to User Center
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.post<LoginResponse>('/auth/login', credentials)
    return response.data
  }

  /**
   * Logout (clear local storage)
   */
  logout(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  }

  /**
   * Get current user info from User Center
   */
  async getCurrentUser(token: string): Promise<UserInfo> {
    const response = await authApi.get<UserInfo>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }

  /**
   * Store auth token
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token)
  }

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * Store user info
   */
  setUserInfo(userInfo: UserInfo): void {
    localStorage.setItem('user_info', JSON.stringify(userInfo))
  }

  /**
   * Get stored user info
   */
  getUserInfo(): UserInfo | null {
    const userInfo = localStorage.getItem('user_info')
    return userInfo ? JSON.parse(userInfo) : null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export default new AuthService()
