import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { authApi } from './services/api'
import { Header } from './components/layout/Header'
import { Container } from './components/layout/Container'
import { AuthTabs } from './components/auth/AuthTabs'
import { PlaylistsList } from './components/playlists/PlaylistsList'
import { TracksList } from './components/tracks/TracksList'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function AppContent() {
  const { isAuthenticated, setAuthenticated, setLoading, isLoading } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      try {
        const status = await authApi.checkStatus()
        setAuthenticated(status.authenticated, status.account)
      } catch (error) {
        console.error('Failed to check auth status:', error)
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [setAuthenticated, setLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xl opacity-75">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <Header />
      <Container>
        {!isAuthenticated ? (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 text-shadow-lg">
                Welcome! 👋
              </h1>
              <p className="text-lg opacity-90">
                Download music from Yandex Music with high quality
              </p>
            </div>
            <AuthTabs />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PlaylistsList />
              <TracksList />
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
