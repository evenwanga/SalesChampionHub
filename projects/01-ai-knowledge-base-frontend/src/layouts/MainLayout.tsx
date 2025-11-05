import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SearchOutlined,
  CommentOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLogto } from '@logto/react'

const { Header, Content, Sider } = Layout

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [username, setUsername] = useState<string>('用户')
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  const { signOut, getIdTokenClaims } = useLogto()

  // 获取用户信息
  useEffect(() => {
    (async () => {
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
  }, [getIdTokenClaims])

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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
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
          }}
        >
          {collapsed ? '知' : '知识库'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{username}</span>
              <Avatar icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
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
