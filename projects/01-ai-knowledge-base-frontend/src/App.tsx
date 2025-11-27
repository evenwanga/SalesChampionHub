import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { Analytics } from './pages/Analytics'
import { Monitoring } from './pages/Monitoring'
import AuditLogs from './pages/AuditLogs'
import Contacts from './pages/Contacts'

// Components
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/toaster'

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
  scopes: ['read', 'write', 'delete', 'admin'], // Request all available scopes
  resources: [env.VITE_LOGTO_API_RESOURCE], // API resource to get access token for
}

function App() {
  return (
    <ErrorBoundary>
      <LogtoProvider config={logtoConfig}>
        <QueryClientProvider client={queryClient}>
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
                <Route path="analytics" element={<Analytics />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="contacts" element={<Contacts />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </QueryClientProvider>
      </LogtoProvider>
    </ErrorBoundary>
  )
}

export default App
