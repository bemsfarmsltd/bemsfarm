import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.bemsfarms.com/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request (only if real token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token && token !== 'dev-token') config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDev = import.meta.env.DEV || localStorage.getItem('admin_token') === 'dev-token'
    if (error.response?.status === 401 && !isDev) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
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
