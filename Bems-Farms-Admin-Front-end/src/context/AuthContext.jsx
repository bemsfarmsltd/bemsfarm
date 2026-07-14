import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

// ── DEV BYPASS ────────────────────────────────────────────────────
const DEV_USERS = {
  'superadmin@bemsfarms.com': {
    password: 'super123',
    user: { id: 'dev-1', first_name: 'Seun', last_name: 'Adeyemi', email: 'superadmin@bemsfarms.com', role: 'superadmin' },
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
  // Legacy fallbacks
  'admin@bemsfarms.com': {
    password: 'admin123',
    user: { id: 'dev-1', first_name: 'Admin', last_name: 'Seun', email: 'admin@bemsfarms.com', role: 'superadmin' },
  },
  'staff@bemsfarms.com': {
    password: 'staff123',
    user: { id: 'dev-5', first_name: 'Kemi', last_name: 'Balogun', email: 'staff@bemsfarms.com', role: 'cashier' },
  },
}
const DEV_MODE = import.meta.env.VITE_API_URL?.includes('localhost') || !import.meta.env.VITE_API_URL
// ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bems_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bems_token')
    if (!token) { setLoading(false); return }
    if (DEV_MODE && token === 'dev-token') { setLoading(false); return }

    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('bems_token')
        localStorage.removeItem('bems_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    if (DEV_MODE) {
      const match = DEV_USERS[email.toLowerCase()]
      if (match && match.password === password) {
        localStorage.setItem('bems_token', 'dev-token')
        localStorage.setItem('bems_user', JSON.stringify(match.user))
        setUser(match.user)
        return match.user
      }
      throw { response: { data: { message: 'Invalid credentials (dev mode)' } } }
    }
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    localStorage.setItem('bems_token', token)
    localStorage.setItem('bems_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bems_token')
    localStorage.removeItem('bems_user')
    setUser(null)
  }, [])

  /** Check if current user has at least one of the given roles. */
  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  )

  /** Check if current user can access a section (pass an allowedRoles array). */
  const canAccess = useCallback(
    (allowedRoles) => user && allowedRoles.includes(user.role),
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
