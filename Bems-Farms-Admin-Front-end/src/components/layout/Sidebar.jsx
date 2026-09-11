import { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

function SideLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  )
}

function CollapseMenu({ id, icon, label, badge, children }) {
  return (
    <li className="nav-item">
      <a className="nav-link collapsed" href={`#${id}`}
        data-bs-toggle="collapse" role="button"
        aria-expanded="false" aria-controls={id}>
        <i className={`${icon} menu-icon`}></i>
        <span>{label}</span>
        {badge && <span className="badge bg-success-subtle text-success ms-auto" style={{ fontSize: 9 }}>{badge}</span>}
        <i className="ri-arrow-right-s-line ms-auto menu-arrow"></i>
      </a>
      <div className="collapse" id={id}>
        <ul className="sub-navbar-nav">
          {children}
        </ul>
      </div>
    </li>
  )
}

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth()
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'AS'
  const roleMeta = user ? ROLE_META[user.role] : null

  /* Inject/update sidebar styles on every mount */
  useEffect(() => {
    const id = 'sidebar-compact-styles'
    let style = document.getElementById(id)
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      #main-sidebar .sidebar-wrapper {
        height: 100% !important;
        overflow: hidden !important;
        display: block !important;
      }
      #main-sidebar .navbar-menu {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 70px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        height: auto !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.12) transparent;
      }
      #main-sidebar .navbar-menu::-webkit-scrollbar { width: 3px; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-track { background: transparent; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
      #main-sidebar .sidebar-profile-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 70px !important;
        z-index: 10 !important;
      }
      #main-sidebar .navbar-nav-menu .nav-link {
        padding-top: 0.38rem;
        padding-bottom: 0.38rem;
      }
      #main-sidebar .sub-navbar-nav .nav-link {
        padding-top: 0.28rem;
        padding-bottom: 0.28rem;
        font-size: 0.8125rem;
      }
      #main-sidebar .menu-label {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        margin-top: 0.6rem !important;
        margin-bottom: 0.1rem !important;
        font-size: 0.68rem;
        letter-spacing: 0.06em;
      }
    `
  }, [])

  // Role helpers
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
  const showStores    = is('superadmin')
  const showSettings  = is('superadmin', 'manager')
  const showPOS       = is('superadmin', 'manager', 'cashier')

  const showProductsSection  = showProducts || showInventory
  const showSalesLabel       = showOrders
  const showOperationsLabel  = showDelivery || showCustomers || showStaff
  const showFinanceLabel     = showFinance || showReports
  const showToolsLabel       = showChefAI || showStores || showSettings

  return (
    <div id="main-sidebar" className="main-sidebar">
      <div className="sidebar-wrapper">

        {/* ── Scrollable nav menu ── */}
        <div className="navbar-menu px-3" id="navbar-menu-list">
          <ul className="list-unstyled navbar-nav-menu mb-0" style={{ paddingTop: '0.5rem' }}>

            {/* ── MAIN ── */}
            <li className="menu-label px-2"><span>Main</span></li>

            <li className="nav-item">
              <SideLink to="/dashboard">
                <i className="ri-dashboard-2-line menu-icon"></i>
                <span>Dashboard</span>
              </SideLink>
            </li>

            {showPOS && (
              <li className="nav-item">
                <SideLink to="/pos">
                  <i className="ri-store-2-line menu-icon"></i>
                  <span>Point of Sale</span>
                </SideLink>
              </li>
            )}

            {/* ── PRODUCTS & STOCK ── */}
            {showProductsSection && (
              <li className="menu-label px-2"><span>Products &amp; Stock</span></li>
            )}

            {showProducts && (
              <CollapseMenu id="productsMenu" icon="ri-price-tag-3-line" label="Products">
                <li><SideLink to="/products">All Products</SideLink></li>
                {is('superadmin', 'manager') && <li><SideLink to="/products/add">Add Product</SideLink></li>}
                <li><SideLink to="/products/categories">Categories</SideLink></li>
                <li><SideLink to="/products/sub-categories">Sub-Categories</SideLink></li>
                <li><SideLink to="/products/units">Units of Measure</SideLink></li>
                {is('superadmin', 'manager') && <li><SideLink to="/products/brands">Brands</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/products/variants">Variants</SideLink></li>}
                <li><SideLink to="/products/reviews">Reviews</SideLink></li>
                {is('superadmin', 'manager') && <li><SideLink to="/products/barcode">Barcode</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/products/export">Bulk Export</SideLink></li>}
              </CollapseMenu>
            )}

            {showInventory && (
              <CollapseMenu id="inventoryMenu" icon="ri-archive-stack-line" label="Inventory">
                <li><SideLink to="/inventory/stock">Stock List</SideLink></li>
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/stock-in">Stock In</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/stock-out">Stock Out</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/adjustment">Adjustments</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/transfer">Stock Transfer</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/batches">Batch Management</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/warehouses">Warehouses</SideLink></li>}
                <li><SideLink to="/inventory/alerts">Low Stock Alerts</SideLink></li>
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/valuation">Valuation</SideLink></li>}
                {is('superadmin', 'manager') && <li><SideLink to="/inventory/lost-items">Lost &amp; Damaged</SideLink></li>}
              </CollapseMenu>
            )}

            {/* ── SALES ── */}
            {showSalesLabel && (
              <li className="menu-label px-2"><span>Sales</span></li>
            )}

            {showOrders && (
              <CollapseMenu id="ordersMenu" icon="ri-shopping-cart-2-line" label="Orders">
                <li><SideLink to="/orders">All Orders</SideLink></li>
                {is('superadmin', 'manager', 'accountant', 'cashier') && (
                  <li><SideLink to="/orders/invoices">Invoices</SideLink></li>
                )}
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/orders/refunds">Returns &amp; Refunds</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {/* ── OPERATIONS ── */}
            {showOperationsLabel && (
              <li className="menu-label px-2"><span>Operations</span></li>
            )}

            {showDelivery && (
              <CollapseMenu id="deliveriesMenu" icon="ri-bike-line" label="Deliveries">
                <li><SideLink to="/deliveries/active">Active Deliveries</SideLink></li>
                <li><SideLink to="/deliveries/map">
                  Live Map
                  <span className="badge rounded-pill bg-success ms-2" style={{ fontSize: 9 }}>Live</span>
                </SideLink></li>
                <li><SideLink to="/deliveries/drivers">Drivers</SideLink></li>
                <li><SideLink to="/deliveries/zones">Delivery Zones</SideLink></li>
              </CollapseMenu>
            )}

            {showCustomers && (
              <CollapseMenu id="customersMenu" icon="ri-user-3-line" label="Customers">
                <li><SideLink to="/customers">All Customers</SideLink></li>
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/customers/loyalty">Loyalty Points</SideLink></li>
                )}
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/customers/activity">Activity Log</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {showStaff && (
              <CollapseMenu id="staffMenu" icon="ri-team-line" label="Staff">
                <li><SideLink to="/staff">All Staff</SideLink></li>
                <li><SideLink to="/staff/add">Add Staff</SideLink></li>
                <li><SideLink to="/staff/roles">Roles &amp; Permissions</SideLink></li>
                <li><SideLink to="/staff/attendance">Attendance</SideLink></li>
                <li><SideLink to="/staff/schedule">Schedule</SideLink></li>
                <li><SideLink to="/staff/holidays">Holidays</SideLink></li>
                <li><SideLink to="/staff/payroll">Payroll</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── FINANCE ── */}
            {showFinanceLabel && (
              <li className="menu-label px-2"><span>Finance</span></li>
            )}

            {showFinance && (
              <CollapseMenu id="accountsMenu" icon="ri-bank-card-line" label="Accounts">
                <li><SideLink to="/accounts/overview">Finance Overview</SideLink></li>
                <li><SideLink to="/accounts/transactions">All Transactions</SideLink></li>
                <li><SideLink to="/accounts/income">Income</SideLink></li>
                <li><SideLink to="/accounts/expenses">Expenses</SideLink></li>
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/accounts/commissions">Driver Commissions</SideLink></li>
                )}
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/accounts/bank">Bank Accounts</SideLink></li>
                )}
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/accounts/transfer">Money Transfer</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {showReports && (
              <CollapseMenu id="reportsMenu" icon="ri-bar-chart-grouped-line" label="Reports">
                <li><SideLink to="/reports/sales">Sales Report</SideLink></li>
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/reports/inventory">Inventory Report</SideLink></li>
                )}
                {is('superadmin', 'manager') && (
                  <li><SideLink to="/reports/customers">Customer Report</SideLink></li>
                )}
                <li><SideLink to="/reports/expenses">Expense Report</SideLink></li>
                <li><SideLink to="/reports/finance">Finance Report</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── TOOLS & CONFIG ── */}
            {showToolsLabel && (
              <li className="menu-label px-2"><span>Tools &amp; Config</span></li>
            )}

            {showChefAI && (
              <CollapseMenu id="chefBemsMenu" icon="ri-robot-line" label="Chef Bems AI" badge="AI">
                <li><SideLink to="/chef-bems/conversations">Conversations</SideLink></li>
                {is('superadmin', 'manager') && (
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

            <li className="mb-2"></li>
          </ul>
        </div>

        {/* ── Profile pinned to bottom ── */}
        <div className="sidebar-profile-footer" style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div className="dropdown dropup w-100">
            <button
              className="btn p-0 w-100 text-start d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div
                className="d-flex align-items-center justify-content-center rounded fw-bold text-white flex-shrink-0"
                style={{ width: 32, height: 32, fontSize: 12, background: roleMeta?.color ?? '#10b981' }}
              >
                {initials}
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <div className="fw-medium text-truncate" style={{ fontSize: 13, color: '#fff' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {roleMeta?.label ?? user?.role}
                </div>
              </div>
              <i className="ri-arrow-up-s-line" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}></i>
            </button>
            <div className="dropdown-menu mb-1">
              <div className="px-3 py-2 border-bottom mb-1">
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Signed in as</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="badge rounded-pill" style={{ background: roleMeta?.bg, color: roleMeta?.color, fontSize: 11 }}>
                    <i className={`${roleMeta?.icon} me-1`}></i>{roleMeta?.label}
                  </span>
                </div>
              </div>
              <Link className="dropdown-item" to="/settings/general">
                <i className="ri-user-line me-2"></i>My Profile
              </Link>
              {showSettings && (
                <Link className="dropdown-item" to="/settings/general">
                  <i className="ri-settings-3-line me-2"></i>Settings
                </Link>
              )}
              <div className="dropdown-divider"></div>
              <button
                type="button"
                className="dropdown-item text-danger border-0 bg-transparent w-100 text-start"
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
