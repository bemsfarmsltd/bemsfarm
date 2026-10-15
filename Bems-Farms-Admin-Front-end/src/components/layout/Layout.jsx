import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import DispatchAlertBanner from '../ui/DispatchAlertBanner'

/**
 * GotPOS two-column layout shell.
 *
 * The template uses data attributes on <html> to drive CSS:
 *   data-layout="two-column"  → two-column sidebar
 *   data-sidebar="large"      → wide sidebar
 *   data-sidebar-colors="dark"→ dark sidebar
 *   data-bs-theme             → light / dark mode
 *
 * Sidebar open/close is handled by toggling data-sidebar-size on <html>.
 */
export default function Layout() {
  const location = useLocation()
  const sidebarRef = useRef(null)

  /* Ensure sidebar starts in default (expanded) mode */
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-size', 'default')
    document.body.classList.remove('sidebar-condensed')
  }, [])



  /* Scroll page content to top on route change */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  /* Re-init Lucide icons on every render */
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons()
  })

  /* Close sidebar if user clicks outside on small screens */
  useEffect(() => {
    function handleOutsideClick(e) {
      const sidebar = document.getElementById('main-sidebar')
      if (!sidebar) return
      if (!sidebar.contains(e.target) && document.body.classList.contains('sidebar-open')) {
        closeSidebar()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function toggleSidebar() {
    const html = document.documentElement
    const current = html.getAttribute('data-sidebar-size') || 'default'
    if (current === 'condensed' || current === 'sm') {
      html.setAttribute('data-sidebar-size', 'default')
      document.body.classList.remove('sidebar-condensed')
    } else {
      html.setAttribute('data-sidebar-size', 'condensed')
      document.body.classList.add('sidebar-condensed')
    }
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open')
  }

  return (
    <div className="wrapper">
      {/* Dispatch alert popup — shown on any page when no driver is available */}
      <DispatchAlertBanner />

      {/* Sidebar overlay for mobile */}
      <div
        className="sidebar-overlay"
        onClick={closeSidebar}
        style={{ cursor: 'pointer' }}
      />

      <Sidebar ref={sidebarRef} />
      <Topbar onToggleSidebar={toggleSidebar} />

      {/* Main content area — matches GotPOS page-wrapper */}
      <div className="page-wrapper">
        <Outlet />

        {/* Footer */}
        <div className="main-footer">
          <div className="w-100">
            <div className="row align-items-center">
              <div className="col-lg-6 d-none d-lg-block">
                <ul className="d-flex align-items-center mb-0 list-unstyled gap-4">
                  <li><a href="#!" className="fw-medium link link-custom-primary">About</a></li>
                  <li><a href="#!" className="fw-medium link link-custom-primary">Support</a></li>
                </ul>
              </div>
              <div className="col-lg-6 text-muted text-center text-lg-end">
                &copy; {new Date().getFullYear()} Bems Farms Admin. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
