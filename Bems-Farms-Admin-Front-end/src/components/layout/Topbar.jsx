import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ROLE_META } from '../../lib/roles'
import toast from 'react-hot-toast'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:     'var(--bg-topbar)',
  border: 'var(--border)',
  text:   'var(--text-primary)',
  muted:  'var(--text-muted)',
  hover:  'var(--bg-hover)',
  green:  '#1B4332',
  accent: '#F57C00',
}

// ── Close dropdown on outside click ──────────────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return { open, setOpen, ref }
}

// ── Small icon button ─────────────────────────────────────────────────────────
function IconBtn({ icon, onClick, title, badge, active }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 8,
        background: active ? C.hover : 'transparent',
        border: 'none', cursor: 'pointer',
        color: '#374151', flexShrink: 0,
        transition: 'background 0.13s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.hover}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <i className={icon} style={{ fontSize: 18 }} />
      {badge && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7, borderRadius: '50%',
          background: '#22c55e', border: '1.5px solid #fff',
          display: 'block',
        }} />
      )}
    </button>
  )
}

// ── Dropdown panel shell ──────────────────────────────────────────────────────
function DropPanel({ children, style }) {
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      border: `1px solid ${C.border}`,
      zIndex: 400,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Add New dropdown ──────────────────────────────────────────────────────────
const ADD_COLS = [
  [
    { to: '/orders',           icon: 'ri-shopping-cart-2-line', label: 'New Order' },
    { to: '/customers',        icon: 'ri-user-add-line',         label: 'New Customer' },
    { to: '/orders/invoices',  icon: 'ri-file-list-3-line',     label: 'Invoice' },
    { to: '/settings/coupons', icon: 'ri-coupon-3-line',        label: 'Coupons' },
  ],
  [
    { to: '/products/add',       icon: 'ri-price-tag-3-line',   label: 'Add Product' },
    { to: '/deliveries/active',  icon: 'ri-truck-line',         label: 'Deliveries' },
    { to: '/reports/sales',      icon: 'ri-bar-chart-line',     label: 'Reports' },
  ],
  [
    { to: '/staff/add',                  icon: 'ri-team-line',       label: 'New Staff' },
    { to: '/chef-bems/conversations',    icon: 'ri-robot-line',      label: 'Chef Bems AI' },
    { to: '/settings/general',           icon: 'ri-settings-3-line', label: 'Settings' },
    { to: '/customers/loyalty',          icon: 'ri-heart-line',      label: 'Loyalty' },
  ],
]

function AddNewDropdown() {
  const { open, setOpen, ref } = useDropdown()

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          background: open ? C.hover : 'transparent',
          border: `1px solid ${C.border}`,
          color: C.text, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          transition: 'background 0.13s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.hover}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <i className="ri-add-line" style={{ fontSize: 16 }} />
        Add New
      </button>

      {open && (
        <DropPanel style={{ left: 0, minWidth: 480 }}>
          <div style={{ display: 'flex', padding: '10px 8px' }}>
            {ADD_COLS.map((col, ci) => (
              <div key={ci} style={{ flex: 1 }}>
                {col.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 8px', borderRadius: 8, marginBottom: 2,
                      textDecoration: 'none', color: C.text,
                      fontSize: 13, fontWeight: 500,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: '#f9fafb', border: `1px solid ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={item.icon} style={{ fontSize: 14, color: C.green }} />
                    </div>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </DropPanel>
      )}
    </div>
  )
}

// ── Notifications dropdown ────────────────────────────────────────────────────
const MOCK_NOTES = [
  {
    id: 1,
    icon: 'ri-alert-line', color: '#ef4444', iconBg: 'var(--bg-red-faint)',
    title: 'Tomatoes below reorder level',
    sub: '3 kg left — reorder threshold: 10 kg',
    time: '5 min ago',
  },
  {
    id: 2,
    icon: 'ri-time-line', color: '#f59e0b', iconBg: 'var(--bg-yellow-faint)',
    title: 'Batch BT-2024-0041 expiring soon',
    sub: 'Expires in 2 days',
    time: '1 hour ago',
  },
  {
    id: 3,
    icon: 'ri-shopping-bag-line', color: '#22c55e', iconBg: 'var(--bg-green-faint)',
    title: 'New order #BF-2026-000124',
    sub: 'Amara Obi — ₦18,500',
    time: '2 hours ago',
  },
]

function NotificationsDropdown() {
  const { open, setOpen, ref } = useDropdown()

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <IconBtn
        icon="ri-notification-3-line"
        title="Notifications"
        badge
        active={open}
        onClick={() => setOpen(o => !o)}
      />

      {open && (
        <DropPanel style={{ width: 340, right: 0 }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifycontent: 'space-between',
            padding: '14px 16px 12px', borderBottom: `1px solid var(--border-subtle)`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Notifications</span>
            <span style={{
              background: 'var(--bg-muted)', color: C.muted,
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 50,
            }}>
              {MOCK_NOTES.length} New
            </span>
          </div>

          {/* Items */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {MOCK_NOTES.map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: i < MOCK_NOTES.length - 1 ? `1px solid var(--border-subtle)` : 'none',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: n.iconBg, color: n.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={n.icon} style={{ fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{n.sub}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid var(--border-subtle)`, textAlign: 'center' }}>
            <Link
              to="/inventory/alerts"
              onClick={() => setOpen(false)}
              style={{ fontSize: 13, color: C.green, fontWeight: 600, textDecoration: 'none' }}
            >
              View all notifications
            </Link>
          </div>
        </DropPanel>
      )}
    </div>
  )
}

// ── Profile dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ user, roleMeta, initials, onLogout }) {
  const { open, setOpen, ref } = useDropdown()

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 6px 4px 4px', borderRadius: 10,
          background: open ? C.hover : 'transparent',
          border: 'none', cursor: 'pointer',
          transition: 'background 0.13s',
          fontFamily: 'Nunito, sans-serif',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.hover}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: roleMeta?.color ?? C.green,
          color: '#fff', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initials}
        </div>
        <i className="ri-arrow-down-s-line" style={{ fontSize: 16, color: C.muted }} />
      </button>

      {open && (
        <DropPanel style={{ width: 250, right: 0 }}>
          {/* User info header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid var(--border-subtle)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                background: roleMeta?.color ?? C.green,
                color: '#fff', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {initials}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{
                  fontSize: 11, color: C.muted,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.email}
                </div>
              </div>
            </div>
            {roleMeta && (
              <span style={{
                background: roleMeta.bg, color: roleMeta.color,
                fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 50,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <i className={roleMeta.icon} style={{ fontSize: 11 }} />
                {roleMeta.label}
              </span>
            )}
          </div>

          {/* Links */}
          <div style={{ padding: '6px 0' }}>
            <DropLink to="/settings/general" icon="ri-user-line" onClick={() => setOpen(false)}>
              My Profile
            </DropLink>
            <DropLink to="/staff" icon="ri-team-line" onClick={() => setOpen(false)}>
              Staff Management
            </DropLink>
            <DropLink to="/settings/general" icon="ri-settings-3-line" onClick={() => setOpen(false)}>
              Settings
            </DropLink>
            <div style={{ borderTop: `1px solid var(--border-subtle)`, margin: '4px 0' }} />
            <button
              onClick={() => { setOpen(false); onLogout() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '7px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: '#ef4444',
                fontFamily: 'Nunito, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-red-faint)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <i className="ri-logout-box-r-line" style={{ fontSize: 15, color: '#ef4444' }} />
              Log Out
            </button>
          </div>
        </DropPanel>
      )}
    </div>
  )
}

function DropLink({ to, icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 14px', fontSize: 13, fontWeight: 500,
        color: C.text, textDecoration: 'none',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <i className={icon} style={{ fontSize: 15, color: C.muted }} />
      {children}
    </Link>
  )
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const roleMeta = user ? ROLE_META[user.role] : null

  const initials = user
    ? (`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`).toUpperCase() || 'BF'
    : 'BF'

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Sync fullscreen state with escape key
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 258,
      right: 0,
      height: 60,
      background: 'var(--bg-topbar)',
      borderBottom: `1px solid var(--border)`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 20px 0 16px',
      zIndex: 99,
      fontFamily: 'Nunito, sans-serif',
      color: 'var(--text-primary)',
    }}>

      {/* Sidebar toggle */}
      <IconBtn
        icon="ri-menu-line"
        title="Toggle sidebar"
        onClick={onToggleSidebar}
      />

      {/* Add New */}
      <AddNewDropdown />

      {/* Store indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8,
        border: `1px solid var(--border)`,
        fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        flexShrink: 0,
      }}>
        <i className="ri-store-2-line" style={{ fontSize: 15, color: C.green }} />
        <span>Bems Farms HQ</span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <i className="ri-search-line" style={{
          position: 'absolute', left: 10, fontSize: 15,
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          type="search"
          placeholder="Search Bems Farms..."
          style={{
            paddingLeft: 32, paddingRight: 12,
            height: 36, width: 210,
            border: `1px solid var(--border)`, borderRadius: 8,
            fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-hover)',
            outline: 'none', fontFamily: 'Nunito, sans-serif',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--green-mid)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Fullscreen */}
      <IconBtn
        icon={isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        onClick={toggleFullscreen}
      />

      {/* Dark mode */}
      <IconBtn
        icon={isDark ? 'ri-sun-line' : 'ri-moon-line'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleTheme}
        active={isDark}
      />

      {/* Notifications */}
      <NotificationsDropdown />

      {/* Profile */}
      <ProfileDropdown
        user={user}
        roleMeta={roleMeta}
        initials={initials}
        onLogout={handleLogout}
      />
    </header>
  )
}
