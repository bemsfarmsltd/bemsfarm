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
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`
    : 'BF'

  return (
    <header className="main-topbar" id="main-topbar">
      {/* Left: Brand logo */}
      <div className="navbar-brand">
        <Link to="/dashboard" aria-label="Bems Farms Admin" className="d-flex align-items-center gap-2 text-decoration-none">
          <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: 28, width: 'auto' }} />
          <span className="fw-black text-dark d-none d-sm-inline font-display" style={{ fontSize: 16, letterSpacing: -0.5 }}>
            Bems Farms
          </span>
        </Link>
      </div>

      {/* Centre: Sidebar toggle + quick actions */}
      <div className="d-flex align-items-center gap-2 ps-2">
        <button
          type="button"
          id="toggleSidebar"
          className="sidebar-toggle btn p-0"
          aria-label="sidebar-toggle"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <i className="ri-layout-left-line fs-17 text-dark"></i>
        </button>

        {/* Add New dropdown */}
        <div className="dropdown d-none d-xl-block">
          <button
            className="btn topbar-action-pill btn-primary-bf"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="ri-add-line"></i>
            <span>Add New</span>
          </button>
          <div className="dropdown-menu shadow-lg border-0" style={{ borderRadius: '1rem', padding: '1rem' }}>
            <div className="d-flex gap-4 py-1">
              <div className="dropdown-col min-w-40">
                <div className="p-1 d-flex align-items-center gap-3 mb-2">
                  <div className="avatar size-8 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"><i className="ri-shopping-cart-2-line"></i></div>
                  <Link to="/orders" className="fw-semibold text-dark text-decoration-none fs-sm">New Order</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-2">
                  <div className="avatar size-8 rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center"><i className="ri-user-add-line"></i></div>
                  <Link to="/customers/add" className="fw-semibold text-dark text-decoration-none fs-sm">New Customer</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3">
                  <div className="avatar size-8 rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center"><i className="ri-file-list-3-line"></i></div>
                  <Link to="/orders/invoices" className="fw-semibold text-dark text-decoration-none fs-sm">Invoice</Link>
                </div>
              </div>
              <div className="dropdown-col min-w-40">
                <div className="p-1 d-flex align-items-center gap-3 mb-2">
                  <div className="avatar size-8 rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"><i className="ri-price-tag-3-line"></i></div>
                  <Link to="/products/add" className="fw-semibold text-dark text-decoration-none fs-sm">Add Product</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3 mb-2">
                  <div className="avatar size-8 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"><i className="ri-archive-stack-line"></i></div>
                  <Link to="/inventory/stock-in" className="fw-semibold text-dark text-decoration-none fs-sm">Stock In</Link>
                </div>
                <div className="p-1 d-flex align-items-center gap-3">
                  <div className="avatar size-8 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"><i className="ri-truck-line"></i></div>
                  <Link to="/deliveries/active" className="fw-semibold text-dark text-decoration-none fs-sm">Deliveries</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store switcher */}
        <div className="dropdown d-none d-xl-block">
          <button
            className="btn topbar-action-pill bg-white border text-dark"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            style={{ borderColor: '#E2DDD5' }}
          >
            <i className="ri-store-2-line text-success"></i>
            <span>Bems Farms HQ</span>
          </button>
        </div>
      </div>

      {/* Right: Storefront link + search + notifications + profile */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 ms-auto">
        {/* Storefront Link Button */}
        <a
          href="https://www.bemsfarms.com"
          target="_blank"
          rel="noreferrer"
          className="btn topbar-action-pill bg-white border text-dark d-none d-sm-inline-flex text-decoration-none"
          style={{ borderColor: '#E2DDD5' }}
        >
          <i className="ri-external-link-line text-warning"></i>
          <span>Live Storefront</span>
        </a>

        {/* Search */}
        <div className="align-items-center d-none d-lg-flex position-relative">
          <i className="ri-search-line position-absolute text-muted" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}></i>
          <input
            type="search"
            className="topbar-search-input"
            placeholder="Search orders, stock..."
            style={{ width: 220 }}
          />
        </div>

        {/* Fullscreen */}
        <button
          type="button"
          className="btn p-2 rounded-circle border-0 d-none d-md-block text-muted"
          id="fullScreenButton"
          aria-label="fullscreen"
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
            else document.exitFullscreen?.()
          }}
        >
          <i className="ri-fullscreen-line fs-17"></i>
        </button>

        {/* Notifications */}
        <div className="dropdown d-none d-md-block">
          <button
            className="btn p-2 rounded-circle border-0 position-relative text-muted"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="ri-notification-3-line fs-17"></i>
            <span className="position-absolute top-1 end-1 p-1 bg-success border border-light rounded-circle"></span>
          </button>
          <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-0" style={{ width: 320, borderRadius: '1rem' }}>
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
              <h6 className="mb-0 fw-bold font-display">Notifications</h6>
              <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>3 New</span>
            </div>
            <div className="vstack divide-y" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <div className="p-3 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"><i className="ri-alert-line"></i></div>
                  <div>
                    <p className="mb-0 fw-semibold fs-sm">Tomatoes below reorder level</p>
                    <p className="text-muted fs-xs mb-0">3 kg left — threshold: 10 kg</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center"><i className="ri-time-line"></i></div>
                  <div>
                    <p className="mb-0 fw-semibold fs-sm">Batch expiring soon</p>
                    <p className="text-muted fs-xs mb-0">BT-2026-0041 expires in 2 days</p>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"><i className="ri-shopping-bag-line"></i></div>
                  <div>
                    <p className="mb-0 fw-semibold fs-sm">New order received</p>
                    <p className="text-muted fs-xs mb-0">Amara Obi — ₦18,500</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 border-top text-center">
              <Link to="/inventory/alerts" className="text-decoration-none fw-bold text-success fs-xs">View all alerts</Link>
            </div>
          </div>
        </div>

        {/* Profile dropdown */}
        <div className="dropdown profile-dropdown">
          <button className="btn p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white shadow-sm"
              style={{ width: 36, height: 36, fontSize: 13, background: 'linear-gradient(135deg, #143c2d, #1b5e3f)', border: '2px solid #ffffff' }}
            >
              {initials}
            </div>
          </button>
          <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-0" style={{ width: 240, borderRadius: '1rem' }}>
            <div className="d-flex align-items-center gap-3 px-3 py-3 border-bottom">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white flex-shrink-0"
                style={{ width: 38, height: 38, fontSize: 14, background: 'linear-gradient(135deg, #143c2d, #1b5e3f)' }}
              >
                {initials}
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <h6 className="mb-0 text-truncate fw-bold font-display">{user?.first_name || 'Admin'} {user?.last_name || ''}</h6>
                <p className="mb-0 text-truncate text-muted fs-xs">{user?.email || 'admin@bemsfarms.com'}</p>
              </div>
            </div>
            <div className="p-2">
              <Link className="dropdown-item rounded-3 py-2 fw-semibold fs-sm" to="/settings/general">
                <i className="ri-user-line me-2 text-muted"></i>My Profile
              </Link>
              <Link className="dropdown-item rounded-3 py-2 fw-semibold fs-sm" to="/staff">
                <i className="ri-team-line me-2 text-muted"></i>Staff &amp; HR
              </Link>
              <Link className="dropdown-item rounded-3 py-2 fw-semibold fs-sm" to="/settings/general">
                <i className="ri-settings-3-line me-2 text-muted"></i>Settings
              </Link>
              <div className="dropdown-divider my-1"></div>
              <button
                type="button"
                className="dropdown-item rounded-3 py-2 fw-bold text-danger border-0 bg-transparent w-100 text-start fs-sm"
                onClick={handleLogout}
              >
                <i className="ri-logout-box-r-line me-2"></i>Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
