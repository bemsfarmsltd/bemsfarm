import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Re-initialize Lucide icons after render
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons()
  })

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`
    : 'BF'

  return (
    <header className="main-topbar" id="main-topbar">
      {/* Left: logo + sidebar toggle */}
      <div className="navbar-brand gap-2">
        <div className="logos">
          <Link to="/dashboard" aria-label="Bems Farms Admin">
            {/* dark logo */}
            <span className="logo-dark fw-bold text-dark" style={{ fontSize: 16, letterSpacing: -0.5 }}>
              🌿 Bems Farms
            </span>
            {/* light logo */}
            <span className="logo-light fw-bold text-white" style={{ fontSize: 16, letterSpacing: -0.5 }}>
              🌿 Bems Farms
            </span>
          </Link>
        </div>
        <button
          type="button"
          id="toggleSidebar"
          className="sidebar-toggle btn p-0"
          aria-label="sidebar-toggle"
          onClick={onToggleSidebar}
        >
          <i className="ri-layout-left-line fs-17"></i>
        </button>
      </div>

      {/* Centre: quick actions */}
      <div className="d-flex align-items-center gap-2">
        {/* Add New dropdown */}
        <div className="dropdown d-none d-xl-block">
          <button
            className="btn topbar-link w-auto shadow-none px-3"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Add New<i className="ri-add-line ps-1"></i>
          </button>
          <div className="dropdown-menu row">
            <div className="d-flex gap-8 py-2">
              <div className="dropdown-col min-w-40">
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-shopping-cart-2-line"></i></div>
                  <Link to="/orders" className="fw-normal link link-custom">New Order</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-user-add-line"></i></div>
                  <Link to="/customers/add" className="fw-normal link link-custom">New Customer</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-file-list-3-line"></i></div>
                  <Link to="/orders/invoices" className="fw-normal link link-custom">Invoice</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-coupon-3-line"></i></div>
                  <Link to="/settings/coupons" className="fw-normal link link-custom">Coupons</Link>
                </div>
              </div>
              <div className="dropdown-col min-w-40">
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-price-tag-3-line"></i></div>
                  <Link to="/products/add" className="fw-normal link link-custom">Add Product</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-archive-stack-line"></i></div>
                  <Link to="/inventory/stock-in" className="fw-normal link link-custom">Stock In</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-truck-line"></i></div>
                  <Link to="/deliveries/active" className="fw-normal link link-custom">Deliveries</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-bar-chart-line"></i></div>
                  <Link to="/reports/sales" className="fw-normal link link-custom">Reports</Link>
                </div>
              </div>
              <div className="dropdown-col min-w-40">
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-team-line"></i></div>
                  <Link to="/staff/add" className="fw-normal link link-custom">New Staff</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-robot-line"></i></div>
                  <Link to="/chef-bems/conversations" className="fw-normal link link-custom">Chef Bems AI</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-settings-3-line"></i></div>
                  <Link to="/settings/general" className="fw-normal link link-custom">Settings</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3">
                  <div className="avatar size-9 border rounded shadow-sm"><i className="ri-heart-line"></i></div>
                  <Link to="/customers/loyalty" className="fw-normal link link-custom">Loyalty</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store switcher */}
        <div className="dropdown d-none d-xl-block">
          <button
            className="topbar-link btn dropdown-toggle shadow-none w-auto px-3"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="ri-store-2-line fs-16 text-primary"></i>
            <span>Bems Farms HQ</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <a className="dropdown-item d-flex align-items-center gap-2" href="#!">
                <i className="ri-store-2-line text-primary"></i> Bems Farms HQ
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Right: search + tools + notifications + profile */}
      <div className="d-flex align-items-center gap-3 ms-auto">
        {/* Search */}
        <div className="align-items-center d-none d-lg-flex">
          <div className="position-relative navbar-search">
            <i className="ri-search-line icon fs-15"></i>
            <input
              type="search"
              className="form-control shadow-none border-0 bg-light h-9"
              placeholder="Search Bems Farms..."
            />
          </div>
        </div>

        {/* Fullscreen */}
        <button
          type="button"
          className="topbar-link btn d-none d-md-block"
          id="fullScreenButton"
          aria-label="fullscreen"
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
            else document.exitFullscreen?.()
          }}
        >
          <i data-lucide="maximize-2" className="size-4"></i>
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          id="darkModeButton"
          className="topbar-link topbar-mode btn nav-link collapsed-mode"
          aria-label="dark mode"
          onClick={() => {
            const html = document.documentElement
            const current = html.getAttribute('data-bs-theme')
            html.setAttribute('data-bs-theme', current === 'dark' ? 'light' : 'dark')
          }}
        >
          <i data-lucide="moon" className="size-4 dark"></i>
          <i data-lucide="sun" className="size-4 light"></i>
        </button>

        {/* Notifications */}
        <div className="dropdown d-none d-md-block">
          <button
            className="btn topbar-link"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <span className="position-relative">
              <i data-lucide="bell-ring" className="size-4"></i>
              <span className="notification-animate position-absolute top-0 end-0 size-1-5 animate-ping bg-success rounded-circle"></span>
              <span className="notification-animate position-absolute top-0 end-0 size-1-5 bg-success rounded-circle"></span>
            </span>
          </button>
          <div className="dropdown-menu dropdown-menu-end dropdown-menu-lg p-0">
            <div className="d-flex align-items-center border-bottom gap-2 p-4">
              <h6 className="flex-grow-1 mb-0">Notifications</h6>
              <span className="badge bg-light border text-muted">3 New</span>
            </div>
            <div className="vstack divide-y" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <div className="p-4 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-9 rounded-circle bg-danger-subtle text-danger"><i className="ri-alert-line"></i></div>
                  <div>
                    <p className="mb-0 fw-medium fs-sm">Tomatoes below reorder level</p>
                    <p className="text-muted fs-xs mb-0">3 kg left — reorder threshold: 10 kg</p>
                    <p className="text-muted fs-xs">5 minutes ago</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-9 rounded-circle bg-warning-subtle text-warning"><i className="ri-time-line"></i></div>
                  <div>
                    <p className="mb-0 fw-medium fs-sm">Batch BT-2024-0041 expiring soon</p>
                    <p className="text-muted fs-xs mb-0">Expires in 2 days</p>
                    <p className="text-muted fs-xs">1 hour ago</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-9 rounded-circle bg-success-subtle text-success"><i className="ri-shopping-bag-line"></i></div>
                  <div>
                    <p className="mb-0 fw-medium fs-sm">New order #BF-2026-000124</p>
                    <p className="text-muted fs-xs mb-0">Amara Obi — ₦18,500</p>
                    <p className="text-muted fs-xs">2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 border-top text-center">
              <Link to="/inventory/alerts" className="link link-custom fs-sm">View all notifications</Link>
            </div>
          </div>
        </div>

        {/* Profile dropdown */}
        <div className="dropdown profile-dropdown">
          <button className="btn p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <div
              className="avatar size-8 rounded bg-success text-white d-flex align-items-center justify-content-center fw-bold"
              style={{ fontSize: 13 }}
            >
              {initials}
            </div>
          </button>
          <div className="dropdown-menu w-64 profile-dropdown-menu p-0">
            <div className="d-flex align-items-center gap-3 px-4 py-3 border-bottom">
              <div
                className="avatar size-9 rounded bg-success text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                style={{ fontSize: 13 }}
              >
                {initials}
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <h6 className="mb-0 text-truncate">{user?.first_name} {user?.last_name}</h6>
                <p className="mb-0 text-truncate">
                  <a href="#!" className="link link-custom-primary fs-sm">{user?.email}</a>
                </p>
              </div>
            </div>
            <div className="px-4 py-3">
              <ul className="list-unstyled mb-0">
                <li>
                  <Link className="profile-link rounded text-reset" to="/settings/general">
                    <i data-lucide="user" className="me-2 size-4 text-muted"></i> My Profile
                  </Link>
                </li>
                <li>
                  <Link className="profile-link rounded text-reset" to="/staff">
                    <i data-lucide="users" className="me-2 size-4 text-muted"></i> Staff Management
                  </Link>
                </li>
                <li>
                  <Link className="profile-link rounded text-reset" to="/settings/general">
                    <i data-lucide="settings" className="me-2 size-4 text-muted"></i> Settings
                  </Link>
                </li>
              </ul>
              <hr className="border my-2" />
              <ul className="list-unstyled mb-0">
                <li>
                  <button
                    className="profile-link rounded text-reset w-100 text-start border-0 bg-transparent"
                    onClick={handleLogout}
                  >
                    <i data-lucide="log-out" className="me-2 size-4 text-muted"></i> Log Out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
