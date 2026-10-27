import axios from 'axios'
import toast from 'react-hot-toast'

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.bemsfarms.com/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request (only if real token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token && token !== 'dev-token') config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Handle 401 and deactivated/suspended accounts globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDev = import.meta.env.DEV || localStorage.getItem('admin_token') === 'dev-token'
    const status = error.response?.status
    const errCode = error.response?.data?.code || ''
    const errMsg = String(error.response?.data?.message || '')

    const isDeactivatedOrSuspended =
      errCode === 'ACCOUNT_DEACTIVATED' ||
      errCode === 'ACCOUNT_SUSPENDED' ||
      errCode === 'USER_NOT_FOUND' ||
      /account (deactivated|suspended|inactive|deleted)/i.test(errMsg) ||
      /user not found/i.test(errMsg)

    if ((status === 401 || isDeactivatedOrSuspended) && !isDev) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      delete api.defaults.headers.common.Authorization

      if (isDeactivatedOrSuspended) {
        try {
          sessionStorage.setItem('admin_kick_reason', errMsg || 'Account deactivated or suspended')
        } catch {}
      }

      if (!window.location.pathname.includes('/login')) {
        window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject(error)
  }
)

export default api
