import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'
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

  const roleMeta = user?.role ? ROLE_META[user.role] : null
  const roleLabel = roleMeta?.label || 'Administrator'

  return (
    <header className="main-topbar" id="main-topbar">
      {/* ── Left Zone: Active Branch Indicator + Add New Action + POS ── */}
      <div className="d-flex align-items-center gap-2">
        {/* Branch / Store Selector Pill */}
        <div className="dropdown d-none d-lg-block">
          <button
            className="btn topbar-branch-pill d-flex align-items-center gap-2"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="Active Store Branch"
          >
            <span className="live-status-dot"></span>
            <i className="ri-store-2-line text-success"></i>
            <span className="fw-bold fs-xs text-dark">Bems Farms HQ</span>
            <i className="ri-arrow-down-s-line text-muted" style={{ fontSize: 13 }}></i>
          </button>
          <ul className="dropdown-menu shadow-lg border-0 p-2" style={{ borderRadius: '0.75rem', minWidth: 210 }}>
            <li><span className="dropdown-header text-uppercase fs-xxs fw-bold text-muted">Active Branch</span></li>
            <li>
              <button className="dropdown-item active rounded-2 fs-sm fw-semibold d-flex align-items-center justify-content-between py-1.5 px-2.5">
                <span className="d-flex align-items-center gap-2">
                  <span className="live-status-dot"></span>
                  Bems Farms HQ
                </span>
                <i className="ri-check-line"></i>
              </button>
            </li>
            <li><hr className="dropdown-divider my-1" /></li>
            <li>
              <Link to="/stores" className="dropdown-item rounded-2 fs-sm text-muted d-flex align-items-center gap-2 py-1.5 px-2.5">
                <i className="ri-store-3-line"></i>
                <span>Manage Stores</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Add New Quick Actions Dropdown */}
        <div className="dropdown">
          <button
            className="btn topbar-action-pill btn-primary-bf"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="ri-add-line"></i>
            <span className="d-none d-sm-inline">Add New</span>
          </button>
          <div className="dropdown-menu shadow-lg border-0 p-3" style={{ borderRadius: '1rem', width: 340 }}>
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <span className="fw-bold fs-xs text-uppercase text-muted">Quick Creation</span>
              <span className="badge bg-success-subtle text-success fs-xxs">Shortcuts</span>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <Link to="/orders" className="d-flex align-items-center gap-2 p-2 rounded-3 text-decoration-none text-dark bg-light hover-bg">
                  <div className="avatar size-7 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-shopping-cart-2-line"></i>
                  </div>
                  <span className="fw-semibold fs-xs">New Order</span>
                </Link>
              </div>
              <div className="col-6">
                <Link to="/products/add" className="d-flex align-items-center gap-2 p-2 rounded-3 text-decoration-none text-dark bg-light hover-bg">
                  <div className="avatar size-7 rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-price-tag-3-line"></i>
                  </div>
                  <span className="fw-semibold fs-xs">Add Product</span>
                </Link>
              </div>
              <div className="col-6">
                <Link to="/inventory/stock-in" className="d-flex align-items-center gap-2 p-2 rounded-3 text-decoration-none text-dark bg-light hover-bg">
                  <div className="avatar size-7 rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-archive-stack-line"></i>
                  </div>
                  <span className="fw-semibold fs-xs">Stock In</span>
                </Link>
              </div>
              <div className="col-6">
                <Link to="/customers/add" className="d-flex align-items-center gap-2 p-2 rounded-3 text-decoration-none text-dark bg-light hover-bg">
                  <div className="avatar size-7 rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-user-add-line"></i>
                  </div>
                  <span className="fw-semibold fs-xs">New Customer</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Standalone Point of Sale Button on Topbar */}
        <Link
          to="/pos"
          className="btn topbar-action-pill-light d-inline-flex align-items-center gap-1.5 text-decoration-none"
          title="Open Point of Sale (POS)"
        >
          <i className="ri-computer-line text-success"></i>
          <span className="fw-bold">Point of Sale</span>
          <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: 9 }}>Live</span>
        </Link>
      </div>

      {/* ── Center Zone: Global Executive Command Search Bar ── */}
      <div className="topbar-search-container d-none d-md-flex align-items-center mx-auto position-relative">
        <i
          className="ri-search-line position-absolute"
          style={{ left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8' }}
        ></i>
        <input
          type="search"
          className="topbar-search-input w-100"
          placeholder="Search products, orders, stock, customers..."
        />
        <span className="topbar-search-shortcut">⌘K</span>
      </div>

      {/* ── Right Zone: Live Store + Notifications + Profile ── */}
      <div className="d-flex align-items-center gap-2 ms-auto">
        {/* Live Storefront Link */}
        <a
          href="https://www.bemsfarms.com"
          target="_blank"
          rel="noreferrer"
          className="btn topbar-action-pill-light d-none d-sm-inline-flex text-decoration-none"
          title="Open Customer Storefront in New Tab"
        >
          <i className="ri-external-link-line" style={{ color: '#F59E0B' }}></i>
          <span>Storefront</span>
        </a>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          className="btn topbar-icon-btn d-none d-md-flex"
          id="fullScreenButton"
          aria-label="fullscreen"
          title="Fullscreen Mode"
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
            else document.exitFullscreen?.()
          }}
        >
          <i className="ri-fullscreen-line fs-16"></i>
        </button>

        {/* Notifications Dropdown */}
        <div className="dropdown d-none d-md-block">
          <button
            className="btn topbar-icon-btn position-relative"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="System Notifications"
          >
            <i className="ri-notification-3-line fs-16"></i>
            <span className="position-absolute top-1 end-1 p-1 bg-danger border border-white rounded-circle"></span>
          </button>
          <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-0" style={{ width: 320, borderRadius: '1rem' }}>
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
              <h6 className="mb-0 fw-bold font-display">Notifications</h6>
              <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>3 New</span>
            </div>
            <div className="vstack divide-y" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <div className="p-3 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-alert-line"></i>
                  </div>
                  <div>
                    <p className="mb-0 fw-semibold fs-sm">Tomatoes below reorder level</p>
                    <p className="text-muted fs-xs mb-0">3 kg left — threshold: 10 kg</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-bottom">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-time-line"></i>
                  </div>
                  <div>
                    <p className="mb-0 fw-semibold fs-sm">Batch expiring soon</p>
                    <p className="text-muted fs-xs mb-0">BT-2026-0041 expires in 2 days</p>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="avatar size-8 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-shopping-bag-line"></i>
                  </div>
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

        {/* User Profile Pill */}
        <div className="dropdown profile-dropdown">
          <button
            className="btn p-1 topbar-profile-btn d-flex align-items-center gap-2"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white shadow-sm flex-shrink-0"
              style={{ width: 32, height: 32, fontSize: 12, background: 'linear-gradient(135deg, #143C2D, #0B281B)', border: '1.5px solid #10B981' }}
            >
              {initials}
            </div>
            <div className="d-none d-lg-block text-start pe-1" style={{ lineHeight: 1.15 }}>
              <span className="fw-bold text-dark d-block text-truncate" style={{ fontSize: 12.5, maxWidth: 110 }}>
                {user?.first_name || 'Admin'} {user?.last_name?.[0] ? `${user.last_name[0]}.` : ''}
              </span>
              <span className="text-muted text-truncate d-block" style={{ fontSize: 10 }}>
                {roleLabel}
              </span>
            </div>
            <i className="ri-arrow-down-s-line text-muted d-none d-lg-block" style={{ fontSize: 13 }}></i>
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
