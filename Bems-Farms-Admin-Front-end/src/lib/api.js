import axios from 'axios'
import toast from 'react-hot-toast'

// Use the existing API for local previews and production; VITE_API_URL can override it.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.bemsfarms.com/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !/\/auth\/(login|refresh|me)/.test(error.config?.url || '')) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
        window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject(error)
  }
)

export default api
