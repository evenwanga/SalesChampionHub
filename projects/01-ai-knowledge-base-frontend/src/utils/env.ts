/**
 * Environment variable validation and access utilities
 * Ensures required environment variables are present and valid
 * Supports both build-time (import.meta.env) and runtime (window.__ENV__) configuration
 */

// Extend Window interface to include __ENV__
declare global {
  interface Window {
    __ENV__?: {
      VITE_LOGTO_ENDPOINT?: string
      VITE_LOGTO_APP_ID?: string
      VITE_LOGTO_REDIRECT_URI?: string
      VITE_LOGTO_POST_LOGOUT_REDIRECT_URI?: string
      VITE_LOGTO_API_RESOURCE?: string
      VITE_API_BASE_URL?: string
    }
  }
}

interface EnvConfig {
  VITE_LOGTO_ENDPOINT: string
  VITE_LOGTO_APP_ID: string
  VITE_LOGTO_REDIRECT_URI: string
  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: string
  VITE_LOGTO_API_RESOURCE: string
}

/**
 * Get environment variable from runtime (window.__ENV__) or build-time (import.meta.env)
 * Priority: window.__ENV__ > import.meta.env
 */
function getEnvVar(key: string): string | undefined {
  // Try runtime config first (Docker)
  if (typeof window !== 'undefined' && window.__ENV__) {
    const value = window.__ENV__[key as keyof typeof window.__ENV__]
    if (value) return value
  }

  // Fallback to build-time config (development)
  return import.meta.env[key]
}

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variable is missing
 */
function validateEnv(): EnvConfig {
  const errors: string[] = []

  // Check VITE_LOGTO_ENDPOINT
  const endpoint = getEnvVar('VITE_LOGTO_ENDPOINT')
  if (!endpoint) {
    errors.push('VITE_LOGTO_ENDPOINT is not defined')
  } else if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    errors.push('VITE_LOGTO_ENDPOINT must start with http:// or https://')
  }

  // Check VITE_LOGTO_APP_ID
  const appId = getEnvVar('VITE_LOGTO_APP_ID')
  if (!appId) {
    errors.push('VITE_LOGTO_APP_ID is not defined')
  } else if (appId.length < 10) {
    errors.push('VITE_LOGTO_APP_ID appears to be invalid (too short)')
  }

  // Check VITE_LOGTO_REDIRECT_URI
  const redirectUri = getEnvVar('VITE_LOGTO_REDIRECT_URI')
  if (!redirectUri) {
    errors.push('VITE_LOGTO_REDIRECT_URI is not defined')
  } else if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    errors.push('VITE_LOGTO_REDIRECT_URI must start with http:// or https://')
  } else if (!redirectUri.includes('/callback')) {
    console.warn('⚠️  VITE_LOGTO_REDIRECT_URI should typically end with /callback')
  }

  // Check VITE_LOGTO_POST_LOGOUT_REDIRECT_URI
  const postLogoutUri = getEnvVar('VITE_LOGTO_POST_LOGOUT_REDIRECT_URI')
  if (!postLogoutUri) {
    errors.push('VITE_LOGTO_POST_LOGOUT_REDIRECT_URI is not defined')
  } else if (!postLogoutUri.startsWith('http://') && !postLogoutUri.startsWith('https://')) {
    errors.push('VITE_LOGTO_POST_LOGOUT_REDIRECT_URI must start with http:// or https://')
  }

  // Check VITE_LOGTO_API_RESOURCE
  const apiResource = getEnvVar('VITE_LOGTO_API_RESOURCE')
  if (!apiResource) {
    errors.push('VITE_LOGTO_API_RESOURCE is not defined')
  } else if (!apiResource.startsWith('http://') && !apiResource.startsWith('https://')) {
    errors.push('VITE_LOGTO_API_RESOURCE must start with http:// or https://')
  }

  // If there are errors, throw with detailed message
  if (errors.length > 0) {
    const errorMessage = `
环境变量配置错误：

${errors.map((err, i) => `${i + 1}. ${err}`).join('\n')}

请检查配置：
- Docker 环境: 确保 .env 文件存在且 docker-entrypoint.sh 正确生成了 env-config.js
- 开发环境: 确保 .env 文件存在且包含所有必需变量

参考示例：
VITE_LOGTO_ENDPOINT=http://localhost:3001
VITE_LOGTO_APP_ID=kvci81ndlx6l7erivlz5i
VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb

当前配置来源: ${typeof window !== 'undefined' && window.__ENV__ ? 'window.__ENV__ (Docker runtime)' : 'import.meta.env (build-time)'}
    `
    throw new Error(errorMessage)
  }

  return {
    VITE_LOGTO_ENDPOINT: endpoint!,
    VITE_LOGTO_APP_ID: appId!,
    VITE_LOGTO_REDIRECT_URI: redirectUri!,
    VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: postLogoutUri!,
    VITE_LOGTO_API_RESOURCE: apiResource!,
  }
}

/**
 * Validated environment configuration
 * Throws error if validation fails
 */
export const env = validateEnv()

const normalizeBaseUrl = (value?: string): string | undefined => {
  if (!value) return undefined
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const optionalApiBase = normalizeBaseUrl(getEnvVar('VITE_API_BASE_URL'))
export const apiBaseUrl = optionalApiBase || '/api/v1'

/**
 * Safe access to environment variables with fallbacks
 */
export const getEnv = (key: keyof EnvConfig, fallback?: string): string => {
  return env[key] || fallback || ''
}

/**
 * Check if running in development mode
 */
export const isDevelopment = import.meta.env.DEV

/**
 * Check if running in production mode
 */
export const isProduction = import.meta.env.PROD

/**
 * Get the current mode (development or production)
 */
export const mode = import.meta.env.MODE

/**
 * Print environment configuration (for debugging)
 * Masks sensitive values
 */
export function printEnvConfig() {
  const configSource = typeof window !== 'undefined' && window.__ENV__
    ? 'window.__ENV__ (Docker runtime)'
    : 'import.meta.env (build-time)'

  console.log('🔧 Environment Configuration:')
  console.log(`  Config Source: ${configSource}`)
  console.log(`  Mode: ${mode}`)
  console.log(`  VITE_LOGTO_ENDPOINT: ${env.VITE_LOGTO_ENDPOINT}`)
  console.log(`  VITE_LOGTO_APP_ID: ${env.VITE_LOGTO_APP_ID.substring(0, 8)}...`)
  console.log(`  VITE_LOGTO_REDIRECT_URI: ${env.VITE_LOGTO_REDIRECT_URI}`)
  console.log(`  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: ${env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI}`)
  console.log(`  VITE_LOGTO_API_RESOURCE: ${env.VITE_LOGTO_API_RESOURCE}`)
  console.log(`  VITE_API_BASE_URL: ${optionalApiBase || '/api/v1'}`)
}
