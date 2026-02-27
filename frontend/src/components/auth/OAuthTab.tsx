import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function OAuthTab() {
  const [authUrl, setAuthUrl] = useState<string>('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'initial' | 'waiting' | 'code'>('initial')
  const { setAuthenticated } = useAuthStore()

  const getUrlMutation = useMutation({
    mutationFn: () => authApi.getAuthUrl(),
    onSuccess: (data) => {
      setAuthUrl(data.auth_url)
      setStep('waiting')
    },
  })

  const exchangeCodeMutation = useMutation({
    mutationFn: (code: string) => authApi.exchangeCode(code),
    onSuccess: async () => {
      const status = await authApi.checkStatus()
      setAuthenticated(true, status.account)
      setStep('initial')
      setCode('')
    },
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth_success' && event.data.code) {
        setCode(event.data.code)
        setStep('code')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleGetUrl = () => {
    getUrlMutation.mutate()
  }

  const handleOpenAuth = () => {
    if (authUrl) {
      window.open(authUrl, '_blank')
    }
  }

  const handleExchangeCode = () => {
    if (code.trim()) {
      exchangeCodeMutation.mutate(code.trim())
    }
  }

  return (
    <div className="space-y-4">
      {step === 'initial' && (
        <>
          <p className="text-sm opacity-75 mb-4">
            Official authorization method via Yandex OAuth
          </p>
          <Button
            onClick={handleGetUrl}
            fullWidth
            loading={getUrlMutation.isPending}
          >
            Get authorization link
          </Button>
        </>
      )}

      {step === 'waiting' && (
        <>
          <div className="glass p-4 rounded-xl space-y-3">
            <p className="font-medium">Step 1: Open the link</p>
            <Button onClick={handleOpenAuth} fullWidth variant="secondary">
              🔗 Open Yandex OAuth
            </Button>
          </div>

          <div className="glass p-4 rounded-xl space-y-3">
            <p className="font-medium">Step 2: Paste the URL from address bar</p>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="https://music.yandex.ru/?code={***}&cid={***}"
            />
            <Button
              onClick={() => {
                if (code.trim()) {
                  setStep('code')
                }
              }}
              fullWidth
              disabled={!code.trim()}
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="glass p-4 rounded-xl bg-green-500/10 border-green-400/30">
            <p className="text-green-100 mb-2">✓ Code received!</p>
            <p className="text-sm opacity-75">Code: {code.slice(0, 20)}...</p>
          </div>

          <Button
            onClick={handleExchangeCode}
            fullWidth
            loading={exchangeCodeMutation.isPending}
          >
            Complete authorization
          </Button>

          {exchangeCodeMutation.error && (
            <div className="glass p-3 rounded-lg bg-red-500/20 border-red-400/30">
              <p className="text-red-100">Code exchange error</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
