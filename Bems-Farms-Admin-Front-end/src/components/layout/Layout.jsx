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
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'var(--body-font)' }}>

      {/*
        Below 1024px the sidebar is an off-canvas drawer (hidden by default,
        slides in via .mobile-open) and main/topbar have no left offset.
        At 1024px+ it's the classic always-visible fixed sidebar.
        Previously: Sidebar's mobileOpen=false rendered `transform: undefined`,
        which is visually identical to translateX(0) — the sidebar was ALWAYS
        full-width-visible on every screen size, and main/topbar had
        marginLeft/left hardcoded to SIDEBAR_W unconditionally. On a 375px
        phone that left just 117px for all page content — this is why the
        entire admin dashboard was unusable on mobile, not any individual page.
      */}
      <style>{`
        .bf-admin-sidebar { transform: translateX(-100%); }
        .bf-admin-sidebar.mobile-open { transform: translateX(0); }
        .bf-admin-main { margin-left: 0; }
        .bf-admin-topbar { left: 0; }
        .bf-admin-topbar-wide-only { display: none; }
        @media (min-width: 1024px) {
          .bf-admin-sidebar { transform: translateX(0) !important; }
          .bf-admin-main { margin-left: ${SIDEBAR_W}px; }
          .bf-admin-topbar { left: ${SIDEBAR_W}px; }
          .bf-admin-topbar-wide-only { display: flex; }
        }
      `}</style>

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

      {/* Main content — offset right of the fixed sidebar on desktop only */}
      <main className="bf-admin-main" style={{
        paddingTop: TOPBAR_H,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: '1 0 auto', padding: '24px 24px 32px' }}>
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
