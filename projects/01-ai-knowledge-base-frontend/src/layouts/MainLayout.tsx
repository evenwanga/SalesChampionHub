import { useState, useEffect, useMemo, useRef } from 'react'
import { Layout, Menu, Avatar, Dropdown, theme, Breadcrumb, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SearchOutlined,
  CommentOutlined,
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  RobotOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLogto } from '@logto/react'

const { Header, Content, Sider } = Layout
const { Text } = Typography

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [username, setUsername] = useState<string>('用户')
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  const { signOut, getIdTokenClaims } = useLogto()
  const userInfoFetchedRef = useRef(false)

  // 获取用户信息
  useEffect(() => {
    // 只获取一次用户信息，避免无限循环
    if (userInfoFetchedRef.current) return
    userInfoFetchedRef.current = true

    ;(async () => {
      try {
        const claims = await getIdTokenClaims()
        if (claims?.username) {
          setUsername(claims.username as string)
        } else if (claims?.name) {
          setUsername(claims.name as string)
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // 空依赖数组，只在组件挂载时执行一次

  const handleLogout = async () => {
    const postLogoutRedirectUri = import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000'
    await signOut(postLogoutRedirectUri)
  }

  // Menu items
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/knowledge-bases',
      icon: <DatabaseOutlined />,
      label: '知识库',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '语义搜索',
    },
    {
      key: '/assistant',
      icon: <CommentOutlined />,
      label: '智能问答',
    },
  ]

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  // 面包屑导航 - 使用 useMemo 缓存结果，避免重复计算
  const breadcrumbs = useMemo(() => {
    const pathMap: Record<string, { title: string; icon: React.ReactNode }> = {
      '/': { title: '工作台', icon: <DashboardOutlined /> },
      '/knowledge-bases': { title: '知识库', icon: <DatabaseOutlined /> },
      '/documents': { title: '文档管理', icon: <FileTextOutlined /> },
      '/search': { title: '语义搜索', icon: <SearchOutlined /> },
      '/assistant': { title: '智能问答', icon: <CommentOutlined /> }
    }

    const current = pathMap[location.pathname]
    if (!current) return []

    if (location.pathname === '/') {
      return [{ title: <><HomeOutlined /> 工作台</> }]
    }

    return [
      { title: <><HomeOutlined /> 首页</>, href: '/' },
      { title: <>{current.icon} {current.title}</> }
    ]
  }, [location.pathname])

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 'bold',
            gap: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <RobotOutlined style={{ fontSize: collapsed ? 18 : 24 }} />
          {!collapsed && <Text style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>AI知识库</Text>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 256, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 32px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14 }}>{username}</span>
              <Avatar size="default" icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: '24px 24px 0',
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
          }}
        >
          {breadcrumbs.length > 0 && (
            <Breadcrumb
              style={{ marginBottom: 16 }}
              items={breadcrumbs}
            />
          )}
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 64px - 48px)',
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
