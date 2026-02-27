import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '@/types/api'

interface AuthState {
  isAuthenticated: boolean
  account: Account | null
  isLoading: boolean
  error: string | null

  setAuthenticated: (authenticated: boolean, account?: Account | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      account: null,
      isLoading: false,
      error: null,

      setAuthenticated: (authenticated, account = null) =>
        set({ isAuthenticated: authenticated, account, error: null }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () =>
        set({
          isAuthenticated: false,
          account: null,
          error: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        account: state.account,
      }),
    }
  )
)
