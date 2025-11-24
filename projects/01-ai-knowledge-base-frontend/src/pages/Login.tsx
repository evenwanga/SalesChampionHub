import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useLogto } from '@logto/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated, signIn, isLoading } = useLogto()

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async () => {
    const redirectUri = import.meta.env.VITE_LOGTO_REDIRECT_URI || 'http://localhost:3000/callback'
    await signIn(redirectUri)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">AI知识库管理平台</CardTitle>
          <CardDescription className="text-base">企业级智能知识管理系统</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            使用统一账号登录系统
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12"
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            登录
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            © 2025 SalesChampionHub. All rights reserved.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
