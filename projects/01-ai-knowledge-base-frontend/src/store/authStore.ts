import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo, LoginRequest } from '@/types'
import { authService } from '@/services'

interface AuthState {
  // State
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  setUser: (user: UserInfo) => void
  setToken: (token: string) => void
  clearError: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.login(credentials)

          // Store token and user info
          authService.setToken(response.token)
          authService.setUserInfo(response.user)

          set({
            token: response.token,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          })
          throw error
        }
      },

      // Logout action
      logout: () => {
        authService.logout()
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      // Set user info
      setUser: (user: UserInfo) => {
        set({ user, isAuthenticated: true })
      },

      // Set token
      setToken: (token: string) => {
        set({ token, isAuthenticated: true })
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      },

      // Initialize auth state from localStorage
      initialize: async () => {
        const token = authService.getToken()
        const user = authService.getUserInfo()

        if (token && user) {
          set({
            token,
            user,
            isAuthenticated: true,
          })

          // Optionally verify token is still valid
          try {
            const currentUser = await authService.getCurrentUser(token)
            authService.setUserInfo(currentUser)
            set({ user: currentUser })
          } catch (error) {
            // Token is invalid, logout
            get().logout()
          }
        } else {
          set({ isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
