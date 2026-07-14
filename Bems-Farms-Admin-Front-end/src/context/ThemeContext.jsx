import { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('bems_theme')
      if (saved !== null) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    } catch {
      return false
    }
  })

  // Apply data-theme attribute synchronously before first paint
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Listen to OS theme preference changes (only when user hasn't saved a preference)
  useLayoutEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const handler = (e) => {
      if (!localStorage.getItem('bems_theme')) setIsDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      // Add transition class, then apply theme, remove class after animation
      document.documentElement.classList.add('theme-transitioning')
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      try { localStorage.setItem('bems_theme', next ? 'dark' : 'light') } catch {}
      setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300)
      return next
    })
  }, [])

  return (
    <ThemeCtx.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
