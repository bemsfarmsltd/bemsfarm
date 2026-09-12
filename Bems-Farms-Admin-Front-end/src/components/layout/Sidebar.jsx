import { useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

function SideLink({ to, icon, badge, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link d-flex align-items-center gap-2.5 ${isActive ? 'active' : ''}`}
    >
      {icon && <i className={`${icon} menu-icon`}></i>}
      <span className="nav-link-text flex-grow-1">{children}</span>
      {badge && <span className="hostinger-badge-pill ms-auto">{badge}</span>}
    </NavLink>
  )
}

function CollapseMenu({ id, icon, label, badge, children }) {
  return (
    <li className="nav-item">
      <a
        className="nav-link collapsed d-flex align-items-center gap-2.5"
        href={`#${id}`}
        data-bs-toggle="collapse"
        role="button"
        aria-expanded="false"
        aria-controls={id}
      >
        <i className={`${icon} menu-icon`}></i>
        <span className="nav-link-text flex-grow-1">{label}</span>
        {badge && (
          <span className="hostinger-badge-pill me-1">{badge}</span>
        )}
        <i className="ri-arrow-right-s-line menu-arrow"></i>
      </a>
      <div className="collapse" id={id}>
        <ul className="sub-navbar-nav list-unstyled">
          {children}
        </ul>
      </div>
    </li>
  )
}

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth()
  const location = useLocation()
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'BF'
  const roleMeta = user ? ROLE_META[user.role] : null

  /* Inject/update Hostinger-inspired sidebar styles on mount */
  useEffect(() => {
    const id = 'sidebar-hostinger-styles'
    let style = document.getElementById(id)
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      #main-sidebar {
        background-color: #0F111A !important;
        border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      #main-sidebar .sidebar-wrapper {
        height: 100% !important;
        overflow: hidden !important;
        display: block !important;
        background: #0F111A !important;
      }
      #main-sidebar .navbar-menu {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 74px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        height: auto !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.12) transparent;
        padding: 0.85rem 0.75rem 1.5rem !important;
        background: transparent !important;
      }
      #main-sidebar .navbar-menu::-webkit-scrollbar { width: 4px; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-track { background: transparent; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      
      #main-sidebar .sidebar-profile-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 74px !important;
        z-index: 10 !important;
        background: rgba(15, 17, 26, 0.96) !important;
        backdrop-filter: blur(12px) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      
      .menu-section-divider {
        font-size: 0.68rem !important;
        font-weight: 750 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
        color: #64748B !important;
        padding: 1.25rem 0.85rem 0.35rem !important;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap !important;
      }
      .menu-section-divider:first-of-type {
        padding-top: 0.4rem !important;
      }
      
      #main-sidebar .nav-link {
        color: #94A3B8 !important;
        font-size: 0.84rem !important;
        font-weight: 550 !important;
        border-radius: 10px !important;
        padding: 0.58rem 0.85rem !important;
        margin: 0.12rem 0 !important;
        transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
        position: relative;
        text-decoration: none !important;
        white-space: nowrap !important;
        display: flex !important;
        align-items: center !important;
      }
      #main-sidebar .nav-link-text {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        display: inline-block !important;
      }
      #main-sidebar .nav-link:hover {
        color: #FFFFFF !important;
        background-color: rgba(255, 255, 255, 0.08) !important;
      }
      
      /* Hostinger Clean Active Highlight */
      #main-sidebar .nav-link.active {
        color: #0F172A !important;
        background-color: #FFFFFF !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
        font-weight: 700 !important;
      }
      #main-sidebar .nav-link.active .menu-icon {
        color: #059669 !important;
      }
      #main-sidebar .nav-link.active .menu-arrow {
        color: #0F172A !important;
      }
      
      #main-sidebar .menu-icon {
        font-size: 1.15rem !important;
        color: #64748B !important;
        width: 20px;
        text-align: center;
        flex-shrink: 0;
        transition: color 0.15s ease;
      }
      #main-sidebar .nav-link:hover .menu-icon {
        color: #E2E8F0 !important;
      }
      
      #main-sidebar .menu-arrow {
        font-size: 1rem !important;
        color: #64748B !important;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #main-sidebar .nav-link:not(.collapsed) .menu-arrow {
        transform: rotate(90deg);
        color: #FFFFFF !important;
      }
      
      #main-sidebar .sub-navbar-nav {
        border-left: 1.5px solid rgba(255, 255, 255, 0.1) !important;
        margin: 0.2rem 0 0.4rem 1.45rem !important;
        padding-left: 0.65rem !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link {
        font-size: 0.81rem !important;
        font-weight: 500 !important;
        color: #94A3B8 !important;
        padding: 0.38rem 0.7rem !important;
        border-radius: 8px !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link:hover {
        color: #FFFFFF !important;
        background-color: rgba(255, 255, 255, 0.06) !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link.active {
        color: #34D399 !important;
        background-color: rgba(16, 185, 129, 0.14) !important;
        border: 1px solid rgba(16, 185, 129, 0.22) !important;
        font-weight: 600 !important;
        box-shadow: none !important;
      }
      
      .hostinger-badge-pill {
        background: rgba(99, 102, 241, 0.16);
        color: #A5B4FC;
        border: 1px solid rgba(99, 102, 241, 0.3);
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 2px 7px;
        border-radius: 9999px;
      }
    `
  }, [])

  // Role helpers
  const is = (...roles) => hasRole(...roles)

  const showProducts  = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showInventory = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showOrders    = is('superadmin', 'admin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff')
  const showDelivery  = is('superadmin', 'admin', 'manager', 'delivery_manager')
  const showCustomers = is('superadmin', 'admin', 'manager', 'cashier')
  const showStaff     = is('superadmin', 'admin', 'manager')
  const showFinance   = is('superadmin', 'admin', 'manager', 'accountant')
  const showReports   = is('superadmin', 'admin', 'manager', 'accountant')
  const showChefAI    = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showStores    = is('superadmin', 'admin')
  const showSettings  = is('superadmin', 'admin', 'manager')
  const showPOS       = is('superadmin', 'admin', 'manager', 'cashier')

  return (
    <div id="main-sidebar" className="main-sidebar">
      <div className="sidebar-wrapper">

        {/* ── Scrollable nav menu ── */}
        <div className="navbar-menu" id="navbar-menu-list">
          <ul className="list-unstyled navbar-nav-menu mb-0">

            {/* ── MAIN ── */}
            <li className="menu-section-divider">
              <span>Main</span>
            </li>

            <li className="nav-item">
              <SideLink to="/dashboard" icon="ri-dashboard-2-line">
                Dashboard
              </SideLink>
            </li>

            {showPOS && (
              <li className="nav-item">
                <SideLink to="/pos" icon="ri-store-2-line">
                  Point of Sale
                </SideLink>
              </li>
            )}

            {/* ── PRODUCTS & STOCK ── */}
            {(showProducts || showInventory) && (
              <li className="menu-section-divider">
                <span>Products &amp; Stock</span>
              </li>
            )}

            {showProducts && (
              <CollapseMenu id="productsMenu" icon="ri-price-tag-3-line" label="Products">
                <li><SideLink to="/products">All Products</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/add">Add Product</SideLink></li>}
                <li><SideLink to="/products/categories">Categories</SideLink></li>
                <li><SideLink to="/products/sub-categories">Sub-Categories</SideLink></li>
                <li><SideLink to="/products/units">Units of Measure</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/brands">Brands</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/variants">Variants</SideLink></li>}
                <li><SideLink to="/products/reviews">Reviews</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/barcode">Barcode</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/export">Bulk Export</SideLink></li>}
              </CollapseMenu>
            )}

            {showInventory && (
              <CollapseMenu id="inventoryMenu" icon="ri-archive-stack-line" label="Inventory">
                <li><SideLink to="/inventory/stock">Stock List</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/stock-in">Stock In</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/stock-out">Stock Out</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/adjustment">Adjustments</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/transfer">Stock Transfer</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/batches">Batches &amp; Expiry</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/warehouses">Warehouses</SideLink></li>}
                <li><SideLink to="/inventory/alerts">Low Stock Alerts</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/valuation">Valuation</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/lost-items">Lost &amp; Damaged</SideLink></li>}
              </CollapseMenu>
            )}

            {/* ── SALES & ORDERS ── */}
            {showOrders && (
              <li className="menu-section-divider">
                <span>Sales &amp; Orders</span>
              </li>
            )}

            {showOrders && (
              <CollapseMenu id="ordersMenu" icon="ri-shopping-bag-3-line" label="Orders">
                <li><SideLink to="/orders">All Orders</SideLink></li>
                <li><SideLink to="/orders/invoices">Invoices</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/orders/refunds">Refunds</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {/* ── OPERATIONS ── */}
            {(showDelivery || showCustomers || showStaff) && (
              <li className="menu-section-divider">
                <span>Operations</span>
              </li>
            )}

            {showDelivery && (
              <CollapseMenu id="deliveriesMenu" icon="ri-truck-line" label="Deliveries">
                <li><SideLink to="/deliveries/active">Active Deliveries</SideLink></li>
                <li><SideLink to="/deliveries/map">Delivery Map</SideLink></li>
                <li><SideLink to="/deliveries/zones">Delivery Zones</SideLink></li>
                <li><SideLink to="/deliveries/drivers">Drivers</SideLink></li>
              </CollapseMenu>
            )}

            {showCustomers && (
              <CollapseMenu id="customersMenu" icon="ri-user-heart-line" label="Customers">
                <li><SideLink to="/customers">All Customers</SideLink></li>
                <li><SideLink to="/customers/loyalty">Loyalty Points</SideLink></li>
                <li><SideLink to="/customers/activity">Activity Log</SideLink></li>
              </CollapseMenu>
            )}

            {showStaff && (
              <CollapseMenu id="staffMenu" icon="ri-team-line" label="Staff &amp; HR">
                <li><SideLink to="/staff">Staff List</SideLink></li>
                <li><SideLink to="/staff/add">Add Staff</SideLink></li>
                <li><SideLink to="/staff/roles">Roles &amp; Permissions</SideLink></li>
                <li><SideLink to="/staff/attendance">Attendance</SideLink></li>
                <li><SideLink to="/staff/schedule">Schedule &amp; Shifts</SideLink></li>
                <li><SideLink to="/staff/holidays">Holidays</SideLink></li>
                <li><SideLink to="/staff/payroll">Payroll</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── FINANCE & REPORTS ── */}
            {(showFinance || showReports) && (
              <li className="menu-section-divider">
                <span>Finance &amp; Reports</span>
              </li>
            )}

            {showFinance && (
              <CollapseMenu id="accountsMenu" icon="ri-bank-card-line" label="Accounts">
                <li><SideLink to="/accounts/overview">Overview</SideLink></li>
                <li><SideLink to="/accounts/transactions">All Transactions</SideLink></li>
                <li><SideLink to="/accounts/income">Income</SideLink></li>
                <li><SideLink to="/accounts/expenses">Expenses</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/commissions">Driver Commissions</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/bank">Bank Accounts</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/transfer">Money Transfer</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {showReports && (
              <CollapseMenu id="reportsMenu" icon="ri-bar-chart-grouped-line" label="Reports">
                <li><SideLink to="/reports/sales">Sales Report</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/reports/inventory">Inventory Report</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/reports/customers">Customer Report</SideLink></li>
                )}
                <li><SideLink to="/reports/expenses">Expense Report</SideLink></li>
                <li><SideLink to="/reports/finance">Finance Report</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── TOOLS & CONFIG ── */}
            {(showChefAI || showStores || showSettings) && (
              <li className="menu-section-divider">
                <span>Tools &amp; Config</span>
              </li>
            )}

            {showChefAI && (
              <CollapseMenu id="chefBemsMenu" icon="ri-robot-line" label="Chef Bems AI" badge="AI">
                <li><SideLink to="/chef-bems/conversations">Conversations</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/chef-bems/dietary-rules">Dietary Rules</SideLink></li>
                )}
                <li><SideLink to="/chef-bems/meal-associations">Meal Associations</SideLink></li>
              </CollapseMenu>
            )}

            {showStores && (
              <CollapseMenu id="storesMenu" icon="ri-store-3-line" label="Multi-Store">
                <li><SideLink to="/stores">All Stores</SideLink></li>
                <li><SideLink to="/stores/add">Add Store</SideLink></li>
              </CollapseMenu>
            )}

            {showSettings && (
              <CollapseMenu id="settingsMenu" icon="ri-settings-3-line" label="Settings">
                <li><SideLink to="/settings/general">General</SideLink></li>
                {is('superadmin', 'admin') && <li><SideLink to="/settings/pos">POS Settings</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/payment">Payment Methods</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/coupons">Coupons &amp; Discounts</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/tax">Tax Settings</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/currencies">Currencies</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/invoices">Invoice Templates</SideLink></li>}
                <li><SideLink to="/settings/notifications">Notifications</SideLink></li>
                {is('superadmin', 'admin') && <li><SideLink to="/settings/manager">Manager Settings</SideLink></li>}
              </CollapseMenu>
            )}

            <li className="mb-3"></li>
          </ul>
        </div>

        {/* ── Profile pinned to bottom ── */}
        <div className="sidebar-profile-footer px-3 d-flex align-items-center">
          <div className="dropdown dropup w-100">
            <button
              className="btn p-2 w-100 text-start d-flex align-items-center gap-2.5 border-0"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'background 0.2s ease'
              }}
            >
              <div className="position-relative flex-shrink-0">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 13,
                    background: 'linear-gradient(135deg, #F59E0B, #B45309)',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  {initials}
                </div>
                {/* Active green pulse badge */}
                <span
                  className="position-absolute rounded-circle"
                  style={{
                    width: 9,
                    height: 9,
                    backgroundColor: '#10B981',
                    border: '2px solid #071F14',
                    bottom: 0,
                    right: 0
                  }}
                />
              </div>

              <div className="flex-grow-1 overflow-hidden">
                <div className="fw-bold text-truncate" style={{ fontSize: 13, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {user?.first_name || 'Bems'} {user?.last_name || 'Admin'}
                </div>
                <div style={{ fontSize: 10.5, color: '#6EE7B7', fontWeight: 700 }}>
                  {roleMeta?.label ?? user?.role ?? 'Super Admin'}
                </div>
              </div>

              <i className="ri-arrow-up-s-line" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}></i>
            </button>

            <div className="dropdown-menu mb-2 shadow-lg" style={{ borderRadius: '0.875rem', border: '1px solid #EFECE6', padding: '0.5rem' }}>
              <div className="px-3 py-2 border-bottom mb-1">
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Active Role Profile</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', fontSize: 11, fontWeight: 700 }}>
                    <i className="ri-shield-star-line me-1"></i>{roleMeta?.label ?? 'Staff'}
                  </span>
                </div>
              </div>
              <Link className="dropdown-item py-2 fw-medium rounded" to="/settings/general" style={{ fontSize: 13 }}>
                <i className="ri-user-line me-2 text-muted"></i>My Profile
              </Link>
              {showSettings && (
                <Link className="dropdown-item py-2 fw-medium rounded" to="/settings/general" style={{ fontSize: 13 }}>
                  <i className="ri-settings-3-line me-2 text-muted"></i>Settings
                </Link>
              )}
              <div className="dropdown-divider"></div>
              <button
                type="button"
                className="dropdown-item text-danger border-0 bg-transparent w-100 text-start py-2 fw-bold rounded"
                style={{ fontSize: 13 }}
                onClick={logout}
              >
                <i className="ri-logout-box-r-line me-2"></i>Sign Out
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
