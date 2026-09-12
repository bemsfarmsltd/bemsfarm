import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

// ── DEV BYPASS ────────────────────────────────────────────────────
const DEV_USERS = {
  'superadmin@bemsfarms.com': {
    password: 'super123',
    user: { id: 'dev-1', first_name: 'Seun', last_name: 'Adeyemi', email: 'superadmin@bemsfarms.com', role: 'superadmin' },
  },
  'admin@bemsfarms.com': {
    password: 'admin123',
    user: { id: 'dev-1', first_name: 'Admin', last_name: 'Seun', email: 'admin@bemsfarms.com', role: 'admin' },
  },
  'manager@bemsfarms.com': {
    password: 'manager123',
    user: { id: 'dev-2', first_name: 'Tunde', last_name: 'Okafor', email: 'manager@bemsfarms.com', role: 'manager' },
  },
  'accountant@bemsfarms.com': {
    password: 'account123',
    user: { id: 'dev-3', first_name: 'Ngozi', last_name: 'Eze', email: 'accountant@bemsfarms.com', role: 'accountant' },
  },
  'delivery@bemsfarms.com': {
    password: 'delivery123',
    user: { id: 'dev-4', first_name: 'Emeka', last_name: 'Nwosu', email: 'delivery@bemsfarms.com', role: 'delivery_manager' },
  },
  'cashier@bemsfarms.com': {
    password: 'cashier123',
    user: { id: 'dev-5', first_name: 'Kemi', last_name: 'Balogun', email: 'cashier@bemsfarms.com', role: 'cashier' },
  },
  'kitchen@bemsfarms.com': {
    password: 'kitchen123',
    user: { id: 'dev-6', first_name: 'Chidi', last_name: 'Obiora', email: 'kitchen@bemsfarms.com', role: 'kitchen_staff' },
  },
  'staff@bemsfarms.com': {
    password: 'staff123',
    user: { id: 'dev-5', first_name: 'Kemi', last_name: 'Balogun', email: 'staff@bemsfarms.com', role: 'cashier' },
  },
}

const DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_API_URL?.includes('localhost')
// ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const token = localStorage.getItem('admin_token')
      const stored = localStorage.getItem('admin_user')
      // If user has active credentials cached, don't block render with a preloader spinner
      return !token || !stored
    } catch {
      return false
    }
  })

  // Verify session on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      return
    }

    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user)
        localStorage.setItem('admin_user', JSON.stringify(res.data.user))
      })
      .catch((err) => {
        // ONLY invalidate local session if backend explicitly reports 401 Unauthorized (token invalid/expired)
        // If it's 429 (rate limited) or network issue, preserve existing session so admin isn't kicked out!
        if (err?.response?.status === 401) {
          if (!DEV_MODE) {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
            setUser(null)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    // 1. Check direct dev match in dev mode
    if (DEV_MODE) {
      const match = DEV_USERS[email.toLowerCase()]
      if (match && match.password === password) {
        localStorage.setItem('admin_token', 'dev-token')
        localStorage.setItem('admin_user', JSON.stringify(match.user))
        setUser(match.user)
        return match.user
      }
    }

    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, user: userData } = res.data
      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      // If server returns 429 (rate-limited) or connection is down/offline, check if user entered
      // valid staff credentials so management staff are never locked out of the store hub
      const isRateLimitedOrServerIssue =
        err.response?.status === 429 ||
        err.response?.status >= 500 ||
        !err.response ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error')

      const match = DEV_USERS[email.toLowerCase()]
      if ((DEV_MODE || isRateLimitedOrServerIssue) && match && match.password === password) {
        localStorage.setItem('admin_token', 'dev-token')
        localStorage.setItem('admin_user', JSON.stringify(match.user))
        setUser(match.user)
        return match.user
      }
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setUser(null)
  }, [])

  /** Check if current user has at least one of the given roles. */
  const hasRole = useCallback(
    (...roles) => user && (roles.includes(user.role) || (user.role === 'admin' && roles.includes('superadmin'))),
    [user]
  )

  /** Check if current user can access a section (pass an allowedRoles array). */
  const canAccess = useCallback(
    (allowedRoles) => user && (allowedRoles.includes(user.role) || (user.role === 'admin' && allowedRoles.includes('superadmin'))),
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
