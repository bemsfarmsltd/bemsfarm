import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)


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
