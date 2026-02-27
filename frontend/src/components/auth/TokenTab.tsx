import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function TokenTab() {
  const [token, setToken] = useState('')
  const { setAuthenticated } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (token: string) => authApi.login(token),
    onSuccess: async () => {
      const status = await authApi.checkStatus()
      setAuthenticated(true, status.account)
      setToken('')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (token.trim()) {
      loginMutation.mutate(token.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token or Session_id..."
          error={loginMutation.error ? 'Invalid token' : undefined}
        />
        <p className="mt-2 text-sm opacity-75">
          Supports both OAuth tokens and Session_id
        </p>
      </div>

      <Button
        type="submit"
        fullWidth
        loading={loginMutation.isPending}
        disabled={!token.trim()}
      >
        Login
      </Button>

      {loginMutation.isSuccess && (
        <div className="glass p-3 rounded-lg bg-green-500/20 border-green-400/30">
          <p className="text-green-100">✓ Successfully authenticated!</p>
        </div>
      )}
    </form>
  )
}
