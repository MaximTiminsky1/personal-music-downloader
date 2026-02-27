import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { Button } from '../ui/Button'
import { getSessionId } from '@/lib/session'

export function Header() {
  const { isAuthenticated, account, setAuthenticated } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authApi.logout()
      setAuthenticated(false)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="glass border-b border-white/20 mb-8">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-shadow">
              🎵 Personal Music Downloader
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && account && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium">{account.display_name}</p>
                  {account.login && (
                    <p className="text-sm opacity-75">@{account.login}</p>
                  )}
                </div>
                <Button variant="secondary" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="text-sm opacity-75">
                Log in to get started
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs opacity-50">
            Session ID: {getSessionId().slice(0, 8)}...
          </p>
        </div>
      </div>
    </header>
  )
}
