interface ApiErrorLike {
  message?: string
  error?: string
}

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (error && typeof error === 'object') {
    const { message, error: err } = error as ApiErrorLike
    if (typeof message === 'string') return message
    if (typeof err === 'string') return err
    return fallback
  }

  return fallback
}
