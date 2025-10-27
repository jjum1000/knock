import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User as FirebaseUser } from 'firebase/auth'
import { register, login, signOut, onAuthChanged } from '@/services/auth'

interface AuthState {
  user: FirebaseUser | null
  userId: string | null
  userName: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  registerUser: (name: string, age: number) => Promise<void>
  loginUser: (name: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: FirebaseUser | null) => void
  clearError: () => void
  initialize: () => void
}

export const useFirebaseAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userId: null,
      userName: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      registerUser: async (name: string, age: number) => {
        set({ isLoading: true, error: null })
        try {
          const authUser = await register(name, age)
          set({
            userId: authUser.uid,
            userName: authUser.displayName,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      loginUser: async (name: string) => {
        set({ isLoading: true, error: null })
        try {
          const authUser = await login(name)
          set({
            userId: authUser.uid,
            userName: authUser.displayName,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        try {
          await signOut()
          set({
            user: null,
            userId: null,
            userName: null,
            isAuthenticated: false,
            error: null,
          })
        } catch (error: any) {
          set({ error: error.message || 'Logout failed' })
        }
      },

      setUser: (user: FirebaseUser | null) => {
        if (user) {
          set({
            user,
            userId: user.uid,
            userName: user.displayName,
            isAuthenticated: true,
          })
        } else {
          set({
            user: null,
            userId: null,
            userName: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),

      initialize: () => {
        // Listen to Firebase auth state changes
        onAuthChanged((user) => {
          get().setUser(user)
        })
      },
    }),
    {
      name: 'firebase-auth-store',
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
