import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHandleSignInCallback } from '@logto/react'
import { Spin } from 'antd'

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 16
    }}>
      <Spin size="large" />
      <p style={{ fontSize: 16, color: '#666' }}>
        {isLoading ? '正在登录...' : '登录完成'}
      </p>
    </div>
  )
}
