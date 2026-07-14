import { useState, useEffect, useRef } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:         '#1B4332',
  hover:      'rgba(255,255,255,0.07)',
  activeBg:   'rgba(245,124,0,0.18)',
  activeText: '#F57C00',
  text:       'rgba(255,255,255,0.82)',
  muted:      'rgba(255,255,255,0.38)',
  iconMuted:  'rgba(255,255,255,0.5)',
  border:     'rgba(255,255,255,0.08)',
  label:      'rgba(255,255,255,0.32)',
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <li style={{
      listStyle: 'none',
      padding: '12px 14px 3px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: C.label,
    }}>
      {children}
    </li>
  )
}

// ── Top-level single nav item ─────────────────────────────────────────────────
function NavItem({ to, icon, children }) {
  return (
    <li style={{ listStyle: 'none' }}>
      <NavLink
        to={to}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 12px',
          borderRadius: 8,
          color: isActive ? C.activeText : C.text,
          background: isActive ? C.activeBg : 'transparent',
          fontWeight: isActive ? 600 : 500,
          fontSize: 13,
          textDecoration: 'none',
          transition: 'background 0.13s, color 0.13s',
        })}
      >
        {({ isActive }) => (
          <>
            <i className={icon} style={{ fontSize: 16, width: 18, flexShrink: 0, color: isActive ? C.activeText : C.iconMuted }} />
            <span>{children}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

// ── Sub-link inside a collapse section ───────────────────────────────────────
function SideLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px 5px 38px',
        borderRadius: 6,
        fontSize: 12.5,
        color: isActive ? C.activeText : C.text,
        background: isActive ? C.activeBg : 'transparent',
        fontWeight: isActive ? 600 : 400,
        textDecoration: 'none',
        transition: 'background 0.13s, color 0.13s',
      })}
    >
      {children}
    </NavLink>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapseMenu({ icon, label, badge, children, paths = [] }) {
  const location = useLocation()
  const isChildActive = paths.some(p => location.pathname.startsWith(p))
  const [open, setOpen] = useState(isChildActive)

  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li style={{ listStyle: 'none' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '7px 12px',
          borderRadius: 8,
          background: open ? C.hover : 'transparent',
          color: isChildActive ? C.activeText : C.text,
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: isChildActive ? 600 : 500,
          transition: 'background 0.13s, color 0.13s',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <i
          className={icon}
          style={{ fontSize: 16, width: 18, flexShrink: 0, color: isChildActive ? C.activeText : C.iconMuted }}
        />
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
          <span style={{
            background: '#F57C00',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 50,
            letterSpacing: '0.03em',
          }}>
            {badge}
          </span>
        )}
        <i
          className="ri-arrow-right-s-line"
          style={{
            fontSize: 16,
            color: C.muted,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? 800 : 0,
        transition: 'max-height 0.25s ease',
      }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: '2px 0 4px' }}>
          {children}
        </ul>
      </div>
    </li>
  )
}

// ── Profile footer dropdown ───────────────────────────────────────────────────
function ProfileFooter({ user, roleMeta, initials, showSettings }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          background: open ? C.hover : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: 8,
          transition: 'background 0.13s',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          flexShrink: 0,
          background: roleMeta?.color ?? '#F57C00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
            {roleMeta?.label ?? user?.role}
          </div>
        </div>
        <i
          className="ri-arrow-up-s-line"
          style={{
            color: C.muted,
            fontSize: 16,
            transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          zIndex: 200,
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Signed in as</div>
            {roleMeta && (
              <span style={{
                background: roleMeta.bg,
                color: roleMeta.color,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 50,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <i className={roleMeta.icon} style={{ fontSize: 11 }} />{roleMeta.label}
              </span>
            )}
          </div>
          <div style={{ padding: '4px 0' }}>
            <MenuLink to="/settings/general" icon="ri-user-line" onClick={() => setOpen(false)}>My Profile</MenuLink>
            {showSettings && (
              <MenuLink to="/settings/general" icon="ri-settings-3-line" onClick={() => setOpen(false)}>Settings</MenuLink>
            )}
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
            <MenuLink to="/login" icon="ri-logout-box-r-line" danger onClick={() => setOpen(false)}>Sign Out</MenuLink>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, icon, children, danger, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 14px',
        fontSize: 13,
        color: danger ? '#ef4444' : '#111827',
        textDecoration: 'none',
        fontWeight: 500,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <i className={icon} style={{ fontSize: 15, color: danger ? '#ef4444' : '#6b7280' }} />
      {children}
    </Link>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ mobileOpen = false }) {
  const { user, hasRole } = useAuth()
  const initials = user
    ? (`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`).toUpperCase() || 'AS'
    : 'AS'
  const roleMeta = user ? ROLE_META[user.role] : null

  const is = (...roles) => hasRole(...roles)

  const showProducts  = is('superadmin', 'manager', 'kitchen_staff')
  const showInventory = is('superadmin', 'manager', 'kitchen_staff')
  const showOrders    = is('superadmin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff')
  const showDelivery  = is('superadmin', 'manager', 'delivery_manager')
  const showCustomers = is('superadmin', 'manager', 'cashier')
  const showStaff     = is('superadmin', 'manager')
  const showFinance   = is('superadmin', 'manager', 'accountant')
  const showReports   = is('superadmin', 'manager', 'accountant')
  const showChefAI    = is('superadmin', 'manager', 'kitchen_staff')
  const showSettings  = is('superadmin', 'manager')
  const showPOS       = is('superadmin', 'manager', 'cashier')

  return (
    <aside style={{
      width: 258,
      minWidth: 258,
      height: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      fontFamily: 'Nunito, sans-serif',
      // On small screens sidebar slides in/out; on desktop it's always visible
      transform: mobileOpen ? 'translateX(0)' : undefined,
      transition: 'transform 0.25s ease',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '8px', padding: '6px 12px' }}>
          <img src="/logo.png" alt="Bems Farms Logo" style={{ maxHeight: '32px', objectFit: 'contain' }} />
        </Link>
      </div>

      {/* ── Scrollable nav ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '6px 10px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.12) transparent',
      }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>

          {/* MAIN */}
          <SectionLabel>Main</SectionLabel>
          <NavItem to="/dashboard" icon="ri-dashboard-2-line">Dashboard</NavItem>
          {showPOS && <NavItem to="/pos" icon="ri-store-2-line">Point of Sale</NavItem>}

          {/* PRODUCTS & STOCK */}
          {(showProducts || showInventory) && <SectionLabel>Products &amp; Stock</SectionLabel>}

          {showProducts && (
            <CollapseMenu icon="ri-price-tag-3-line" label="Products" paths={['/products']}>
              <li><SideLink to="/products">All Products</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/products/add">Add Product</SideLink></li>}
              <li><SideLink to="/products/categories">Categories</SideLink></li>
              <li><SideLink to="/products/sub-categories">Sub-Categories</SideLink></li>
              <li><SideLink to="/products/units">Units of Measure</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/products/variants">Variants</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/products/barcode">Barcode</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/products/export">Bulk Export</SideLink></li>}
            </CollapseMenu>
          )}

          {showInventory && (
            <CollapseMenu icon="ri-archive-stack-line" label="Inventory" paths={['/inventory']}>
              <li><SideLink to="/inventory/stock">Stock List</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/adjustment">Adjustments</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/transfer">Stock Transfer</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/batches">Batch Management</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/warehouses">Warehouses</SideLink></li>}
              <li><SideLink to="/inventory/alerts">Low Stock Alerts</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/valuation">Valuation</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/inventory/lost-items">Lost &amp; Damaged</SideLink></li>}
            </CollapseMenu>
          )}

          {/* SALES */}
          {showOrders && <SectionLabel>Sales</SectionLabel>}

          {showOrders && (
            <CollapseMenu icon="ri-shopping-cart-2-line" label="Orders" paths={['/orders']}>
              <li><SideLink to="/orders">All Orders</SideLink></li>
              {is('superadmin', 'manager', 'accountant', 'cashier') && (
                <li><SideLink to="/orders/receipts">Receipts</SideLink></li>
              )}
              {is('superadmin', 'manager') && (
                <li><SideLink to="/orders/refunds">Returns &amp; Refunds</SideLink></li>
              )}
            </CollapseMenu>
          )}

          {/* OPERATIONS */}
          {(showDelivery || showCustomers || showStaff) && <SectionLabel>Operations</SectionLabel>}

          {showDelivery && (
            <CollapseMenu icon="ri-bike-line" label="Deliveries" paths={['/deliveries']}>
              <li><SideLink to="/deliveries/active">Active Deliveries</SideLink></li>
              <li>
                <SideLink to="/deliveries/map">
                  Live Map&nbsp;
                  <span style={{
                    background: '#22c55e', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 50,
                  }}>Live</span>
                </SideLink>
              </li>
              <li><SideLink to="/deliveries/drivers">Drivers</SideLink></li>
              <li><SideLink to="/deliveries/zones">Delivery Zones</SideLink></li>
            </CollapseMenu>
          )}

          {showCustomers && (
            <CollapseMenu icon="ri-user-3-line" label="Customers" paths={['/customers']}>
              <li><SideLink to="/customers">All Customers</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/customers/loyalty">Loyalty Points</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/customers/activity">Activity Log</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/customers/report">Customer Report</SideLink></li>}
            </CollapseMenu>
          )}

          {showStaff && (
            <CollapseMenu icon="ri-team-line" label="Staff" paths={['/staff']}>
              <li><SideLink to="/staff">All Staff</SideLink></li>
              <li><SideLink to="/staff/add">Add Staff</SideLink></li>
              <li><SideLink to="/staff/roles">Roles &amp; Permissions</SideLink></li>
              <li><SideLink to="/staff/attendance">Attendance</SideLink></li>
              <li><SideLink to="/staff/schedule">Schedule</SideLink></li>
              <li><SideLink to="/staff/holidays">Holidays</SideLink></li>
              <li><SideLink to="/staff/payroll">Payroll</SideLink></li>
            </CollapseMenu>
          )}

          {/* FINANCE */}
          {(showFinance || showReports) && <SectionLabel>Finance</SectionLabel>}

          {showFinance && (
            <CollapseMenu icon="ri-bank-card-line" label="Accounts" paths={['/accounts']}>
              <li><SideLink to="/accounts/overview">Finance Overview</SideLink></li>
              <li><SideLink to="/accounts/transactions">All Transactions</SideLink></li>
              <li><SideLink to="/accounts/income">Income</SideLink></li>
              <li><SideLink to="/accounts/expenses">Expenses</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/accounts/commissions">Driver Commissions</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/accounts/bank">Bank Accounts</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/accounts/transfer">Money Transfer</SideLink></li>}
              <li><SideLink to="/accounts/reconciliation">Payment Reconciliation</SideLink></li>
            </CollapseMenu>
          )}

          {showReports && (
            <CollapseMenu icon="ri-bar-chart-grouped-line" label="Reports" paths={['/reports']}>
              <li><SideLink to="/reports/sales">Sales Report</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/reports/inventory">Inventory Report</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/reports/customers">Customer Report</SideLink></li>}
              <li><SideLink to="/reports/expenses">Expense Report</SideLink></li>
              <li><SideLink to="/reports/finance">Finance Report</SideLink></li>
            </CollapseMenu>
          )}

          {/* TOOLS & CONFIG */}
          {(showChefAI || showSettings) && <SectionLabel>Tools &amp; Config</SectionLabel>}

          {showChefAI && (
            <CollapseMenu icon="ri-robot-line" label="Chef Bems AI" badge="AI" paths={['/chef-bems']}>
              <li><SideLink to="/chef-bems/conversations">Conversations</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/chef-bems/dietary-rules">Dietary Rules</SideLink></li>}
              <li><SideLink to="/chef-bems/meal-associations">Meal Associations</SideLink></li>
              {is('superadmin', 'manager') && <li><SideLink to="/chef-bems/substitutions">Substitutions</SideLink></li>}
              {is('superadmin', 'manager') && <li><SideLink to="/chef-bems/recommendations">Recommendations</SideLink></li>}
            </CollapseMenu>
          )}

          {showSettings && (
            <CollapseMenu icon="ri-settings-3-line" label="Settings" paths={['/settings']}>
              <li><SideLink to="/settings/general">General</SideLink></li>
              {is('superadmin') && <li><SideLink to="/settings/pos">POS Settings</SideLink></li>}
              {is('superadmin') && <li><SideLink to="/settings/payment">Payment Methods</SideLink></li>}
              {is('superadmin') && <li><SideLink to="/settings/coupons">Coupons &amp; Discounts</SideLink></li>}
              {is('superadmin') && <li><SideLink to="/settings/tax">Tax Settings</SideLink></li>}
              {is('superadmin') && <li><SideLink to="/settings/currencies">Currencies</SideLink></li>}
              {is('superadmin') && <li><SideLink to="/settings/invoices">Invoice Templates</SideLink></li>}
              <li><SideLink to="/settings/notifications">Notifications</SideLink></li>
              {is('superadmin') && <li><SideLink to="/settings/manager">Manager Settings</SideLink></li>}
            </CollapseMenu>
          )}

          <li style={{ height: 10 }} />
        </ul>
      </div>

      {/* ── Profile footer ── */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <ProfileFooter
          user={user}
          roleMeta={roleMeta}
          initials={initials}
          showSettings={showSettings}
        />
      </div>

    </aside>
  )
}
