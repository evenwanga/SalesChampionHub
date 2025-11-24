import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHandleSignInCallback } from '@logto/react'
import { Loader2 } from 'lucide-react'

export const Callback: React.FC = () => {
  const navigate = useNavigate()
  const { isLoading, error } = useHandleSignInCallback(() => {
    // 登录成功后重定向到首页
    navigate('/', { replace: true })
  })

  useEffect(() => {
    if (error) {
      console.error('登录回调错误:', error)
      // 登录失败，重定向回登录页
      navigate('/login', { replace: true })
    }
  }, [error, navigate])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-base text-muted-foreground">
        {isLoading ? '正在登录...' : '登录完成'}
      </p>
    </div>
  )
}
