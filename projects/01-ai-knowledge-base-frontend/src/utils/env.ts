/**
 * Environment variable validation and access utilities
 * Ensures required environment variables are present and valid
 */

interface EnvConfig {
  VITE_LOGTO_ENDPOINT: string
  VITE_LOGTO_APP_ID: string
  VITE_LOGTO_REDIRECT_URI: string
  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: string
}

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variable is missing
 */
function validateEnv(): EnvConfig {
  const errors: string[] = []

  // Check VITE_LOGTO_ENDPOINT
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT
  if (!endpoint) {
    errors.push('VITE_LOGTO_ENDPOINT is not defined')
  } else if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    errors.push('VITE_LOGTO_ENDPOINT must start with http:// or https://')
  }

  // Check VITE_LOGTO_APP_ID
  const appId = import.meta.env.VITE_LOGTO_APP_ID
  if (!appId) {
    errors.push('VITE_LOGTO_APP_ID is not defined')
  } else if (appId.length < 10) {
    errors.push('VITE_LOGTO_APP_ID appears to be invalid (too short)')
  }

  // Check VITE_LOGTO_REDIRECT_URI
  const redirectUri = import.meta.env.VITE_LOGTO_REDIRECT_URI
  if (!redirectUri) {
    errors.push('VITE_LOGTO_REDIRECT_URI is not defined')
  } else if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    errors.push('VITE_LOGTO_REDIRECT_URI must start with http:// or https://')
  } else if (!redirectUri.includes('/callback')) {
    console.warn('⚠️  VITE_LOGTO_REDIRECT_URI should typically end with /callback')
  }

  // Check VITE_LOGTO_POST_LOGOUT_REDIRECT_URI
  const postLogoutUri = import.meta.env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI
  if (!postLogoutUri) {
    errors.push('VITE_LOGTO_POST_LOGOUT_REDIRECT_URI is not defined')
  } else if (!postLogoutUri.startsWith('http://') && !postLogoutUri.startsWith('https://')) {
    errors.push('VITE_LOGTO_POST_LOGOUT_REDIRECT_URI must start with http:// or https://')
  }

  // If there are errors, throw with detailed message
  if (errors.length > 0) {
    const errorMessage = `
环境变量配置错误：

${errors.map((err, i) => `${i + 1}. ${err}`).join('\n')}

请检查 .env 文件并确保所有必需的环境变量都已正确配置。

参考示例：
VITE_LOGTO_ENDPOINT=http://localhost:3001
VITE_LOGTO_APP_ID=your_app_id_here
VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
    `
    throw new Error(errorMessage)
  }

  return {
    VITE_LOGTO_ENDPOINT: endpoint,
    VITE_LOGTO_APP_ID: appId,
    VITE_LOGTO_REDIRECT_URI: redirectUri,
    VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: postLogoutUri,
  }
}

/**
 * Validated environment configuration
 * Throws error if validation fails
 */
export const env = validateEnv()

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
  console.log('🔧 Environment Configuration:')
  console.log(`  Mode: ${mode}`)
  console.log(`  VITE_LOGTO_ENDPOINT: ${env.VITE_LOGTO_ENDPOINT}`)
  console.log(`  VITE_LOGTO_APP_ID: ${env.VITE_LOGTO_APP_ID.substring(0, 8)}...`)
  console.log(`  VITE_LOGTO_REDIRECT_URI: ${env.VITE_LOGTO_REDIRECT_URI}`)
  console.log(`  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: ${env.VITE_LOGTO_POST_LOGOUT_REDIRECT_URI}`)
}
