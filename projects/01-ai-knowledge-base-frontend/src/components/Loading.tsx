import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface LoadingProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
  fullscreen?: boolean
  spinning?: boolean
  children?: React.ReactNode
}

/**
 * Reusable loading component with different display modes
 */
export const Loading: React.FC<LoadingProps> = ({
  tip,
  size = 'large',
  fullscreen = false,
  spinning = true,
  children,
}) => {
  const loadingIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'default' ? 32 : 24 }} spin />

  if (!spinning && children) {
    return <>{children}</>
  }

  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }}
      >
        <Spin indicator={loadingIcon} size={size} tip={tip} />
      </div>
    )
  }

  if (children) {
    return (
      <Spin indicator={loadingIcon} size={size} tip={tip} spinning={spinning}>
        {children}
      </Spin>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 0',
      }}
    >
      <Spin indicator={loadingIcon} size={size} tip={tip} />
    </div>
  )
}

/**
 * Full screen loading component
 */
export const FullScreenLoading: React.FC<{ tip?: string }> = ({ tip = '加载中...' }) => {
  return <Loading fullscreen tip={tip} />
}

/**
 * Inline loading component for wrapping content
 */
export const InlineLoading: React.FC<{ loading: boolean; tip?: string; children: React.ReactNode }> = ({
  loading,
  tip,
  children,
}) => {
  return (
    <Loading spinning={loading} tip={tip}>
      {children}
    </Loading>
  )
}

/**
 * Card loading skeleton
 */
export const CardLoading: React.FC = () => {
  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}
    >
      <Spin size="large" tip="加载中..." />
    </div>
  )
}
