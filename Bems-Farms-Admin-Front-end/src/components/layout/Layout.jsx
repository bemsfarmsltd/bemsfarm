import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

export const SIDEBAR_W = 258
export const TOPBAR_H  = 60

export default function Layout() {
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Scroll to top and close mobile sidebar on every route change
  useEffect(() => {
    window.scrollTo(0, 0)
    setMobileSidebarOpen(false)
  }, [location.pathname])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>

      {/* Mobile overlay — tap to close sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 98,
          }}
        />
      )}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <Topbar onToggleSidebar={() => setMobileSidebarOpen(o => !o)} />

      {/* Main content — offset right of the fixed sidebar */}
      <main style={{
        marginLeft: SIDEBAR_W,
        paddingTop: TOPBAR_H,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1, padding: '24px 24px 32px' }}>
          <Outlet />
        </div>

        <footer style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-light)',
          background: 'var(--bg-topbar)',
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#!" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>About</a>
            <a href="#!" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Support</a>
          </div>
          <span>&copy; {new Date().getFullYear()} Bems Farms Admin. All rights reserved.</span>
        </footer>
      </main>

    </div>
  )
}
