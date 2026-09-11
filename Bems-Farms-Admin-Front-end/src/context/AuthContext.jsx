import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { isStaffRole } from '../lib/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('token')
    if (!adminToken) {
      setLoading(false)
      return
    }

    api.get('/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } })
      .then((res) => {
        const u = res.data.user
        if (u && isStaffRole(u.role)) {
          setUser(u)
          localStorage.setItem('admin_token', adminToken)
          localStorage.setItem('admin_user', JSON.stringify(u))
        } else {
          setUser(null)
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    if (!isStaffRole(userData?.role)) {
      throw new Error('Access Denied: This portal is strictly restricted to Bems Farms staff and administrators.')
    }
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
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

  const bypassLogin = useCallback(async () => {
    const res = await api.post('/auth/admin-bypass')
    const { token, user: userData } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, bypassLogin, logout, hasRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
