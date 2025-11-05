import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Typography } from 'antd'
import { LoginOutlined } from '@ant-design/icons'
import { useLogto } from '@logto/react'

const { Title, Text } = Typography

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
    <div style={{
      height: '100vh',
      minHeight: '600px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: 480,
          minWidth: 480,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            AI知识库管理平台
          </Title>
          <Text type="secondary">企业级智能知识管理系统</Text>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>
            使用统一账号登录系统
          </Text>
        </div>

        <Button
          type="primary"
          icon={<LoginOutlined />}
          block
          size="large"
          loading={isLoading}
          onClick={handleLogin}
          style={{ height: 48 }}
        >
          登录
        </Button>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2025 SalesChampionHub. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  )
}
