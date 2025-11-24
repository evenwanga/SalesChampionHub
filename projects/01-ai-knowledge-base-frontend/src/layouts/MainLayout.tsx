import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Database,
  FileText,
  Search,
  MessageSquare,
  LayoutDashboard,
  User,
  LogOut,
  Bot,
  ChevronDown,
  Shield,
  Activity,
  BarChart3,
} from 'lucide-react'
import { useLogto } from '@logto/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    title: '工作台',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '知识库',
    href: '/knowledge-bases',
    icon: Database,
  },
  {
    title: '文档管理',
    href: '/documents',
    icon: FileText,
  },
  {
    title: '语义搜索',
    href: '/search',
    icon: Search,
  },
  {
    title: '智能问答',
    href: '/assistant',
    icon: MessageSquare,
  },
  {
    title: '统计分析',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: '审计日志',
    href: '/audit-logs',
    icon: Shield,
  },
  {
    title: '性能监控',
    href: '/monitoring',
    icon: Activity,
  },
]

export const MainLayout: React.FC = () => {
  const [username, setUsername] = useState<string>('用户')
  const navigate = useNavigate()
  const location = useLocation()

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
  }, []) // 空依赖数组，只在组件挂载时执行一次

  const handleLogout = async () => {
    const postLogoutRedirectUri =
      import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000'
    await signOut(postLogoutRedirectUri)
  }

  const getUserInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">AI知识库</h1>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-secondary font-medium'
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-4">
            {/* 移动端显示标题 */}
            <div className="flex items-center gap-2 md:hidden">
              <Bot className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold">AI知识库</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getUserInitials(username)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm md:inline-block">{username}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>个人资料</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
