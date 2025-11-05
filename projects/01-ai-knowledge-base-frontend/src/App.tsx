import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LogtoProvider } from '@logto/react'
import type { LogtoConfig } from '@logto/react'

// Layouts
import { MainLayout } from './layouts/MainLayout'

// Pages
import { Login } from './pages/Login'
import { Callback } from './pages/Callback'
import { Dashboard } from './pages/Dashboard'
import { KnowledgeBases } from './pages/KnowledgeBases'
import { Documents } from './pages/Documents'
import { Search } from './pages/Search'
import { Assistant } from './pages/Assistant'

// Components
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

// Utils
import { env, printEnvConfig } from './utils/env'

// Print environment configuration in development mode
if (import.meta.env.DEV) {
  printEnvConfig()
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Logto configuration with validated environment variables
const logtoConfig: LogtoConfig = {
  endpoint: env.VITE_LOGTO_ENDPOINT,
  appId: env.VITE_LOGTO_APP_ID,
}

function App() {
  return (
    <ErrorBoundary>
      <LogtoProvider config={logtoConfig}>
        <QueryClientProvider client={queryClient}>
        <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#667eea',
            borderRadius: 6,
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="knowledge-bases" element={<KnowledgeBases />} />
              <Route path="documents" element={<Documents />} />
              <Route path="search" element={<Search />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
      </LogtoProvider>
    </ErrorBoundary>
  )
}

export default App
