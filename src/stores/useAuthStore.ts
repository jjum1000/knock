import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'

interface AuthState {
  userId: string | null
  userName: string | null
  authToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  register: (name: string, age: number) => Promise<void>
  login: (name: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      authToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      register: async (name: string, age: number) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register(name, age)
          if (response.success && response.data) {
            const { user, token } = response.data
            localStorage.setItem('authToken', token)
            localStorage.setItem('userId', user.id)
            set({
              userId: user.id,
              userName: user.name,
              authToken: token,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      login: async (name: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(name)
          if (response.success && response.data) {
            const { user, token } = response.data
            localStorage.setItem('authToken', token)
            localStorage.setItem('userId', user.id)
            set({
              userId: user.id,
              userName: user.name,
              authToken: token,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('userId')
        set({
          userId: null,
          userName: null,
          authToken: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        authToken: state.authToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
