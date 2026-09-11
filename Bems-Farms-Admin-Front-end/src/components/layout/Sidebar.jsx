import { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

function SideLink({ to, icon, badge, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link d-flex align-items-center gap-2.5 ${isActive ? 'active' : ''}`}
    >
      {icon && <i className={`${icon} menu-icon`}></i>}
      <span className="nav-link-text">{children}</span>
      {badge && <span className="nav-badge-pill ms-auto">{badge}</span>}
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
          <span className="badge-luxury-ai me-1">{badge}</span>
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
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'BF'
  const roleMeta = user ? ROLE_META[user.role] : null

  /* Inject/update refined sidebar styles on mount */
  useEffect(() => {
    const id = 'sidebar-luxury-styles'
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
        bottom: 76px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        height: auto !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.12) transparent;
        padding: 0.75rem 0.65rem 1.5rem !important;
      }
      #main-sidebar .navbar-menu::-webkit-scrollbar { width: 3px; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-track { background: transparent; }
      #main-sidebar .navbar-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
      
      #main-sidebar .sidebar-profile-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 76px !important;
        z-index: 10 !important;
        background: linear-gradient(to top, #04120B 40%, rgba(7,31,20,0.95)) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      
      .menu-section-divider {
        font-size: 0.65rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.12em !important;
        text-transform: uppercase !important;
        color: rgba(167, 243, 208, 0.5) !important;
        padding: 1.1rem 0.65rem 0.35rem !important;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .menu-section-divider:first-of-type {
        padding-top: 0.35rem !important;
      }
      
      #main-sidebar .nav-link {
        color: rgba(226, 232, 240, 0.8) !important;
        font-size: 0.835rem !important;
        font-weight: 600 !important;
        border-radius: 0.65rem !important;
        padding: 0.52rem 0.75rem !important;
        margin: 0.1rem 0 !important;
        transition: all 0.15s ease !important;
        position: relative;
        text-decoration: none !important;
      }
      #main-sidebar .nav-link:hover {
        color: #FFFFFF !important;
        background-color: rgba(255, 255, 255, 0.07) !important;
        transform: translateX(2px);
      }
      #main-sidebar .nav-link.active {
        color: #FFFFFF !important;
        background: linear-gradient(135deg, rgba(20, 60, 45, 0.95), rgba(27, 94, 63, 0.85)) !important;
        border: 1px solid rgba(110, 231, 183, 0.35) !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
        font-weight: 700 !important;
      }
      #main-sidebar .nav-link.active .menu-icon {
        color: #F59E0B !important;
      }
      
      #main-sidebar .menu-icon {
        font-size: 1.1rem !important;
        color: rgba(167, 243, 208, 0.7) !important;
        width: 20px;
        text-align: center;
        flex-shrink: 0;
      }
      
      #main-sidebar .menu-arrow {
        font-size: 1rem !important;
        color: rgba(255, 255, 255, 0.4) !important;
        transition: transform 0.2s ease;
      }
      #main-sidebar .nav-link:not(.collapsed) .menu-arrow {
        transform: rotate(90deg);
        color: #F59E0B !important;
      }
      
      #main-sidebar .sub-navbar-nav {
        border-left: 1px solid rgba(255, 255, 255, 0.12);
        margin: 0.2rem 0 0.4rem 1.45rem !important;
        padding-left: 0.6rem !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link {
        font-size: 0.8rem !important;
        font-weight: 500 !important;
        color: rgba(203, 213, 225, 0.7) !important;
        padding: 0.35rem 0.65rem !important;
        border-radius: 0.5rem !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link:hover {
        color: #6EE7B7 !important;
        background-color: rgba(255, 255, 255, 0.05) !important;
      }
      #main-sidebar .sub-navbar-nav .nav-link.active {
        color: #FFFFFF !important;
        background-color: rgba(20, 60, 45, 0.8) !important;
        border: 1px solid rgba(110, 231, 183, 0.25) !important;
      }
      
      .badge-luxury-ai {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: #071F14;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.04em;
        padding: 2px 6px;
        border-radius: 9999px;
        box-shadow: 0 2px 6px rgba(245, 158, 11, 0.35);
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

            {/* ── COMMAND CENTER ── */}
            <li className="menu-section-divider">
              <span>Command Center</span>
            </li>

            <li className="nav-item">
              <SideLink to="/dashboard" icon="ri-dashboard-3-line">
                Executive Overview
              </SideLink>
            </li>

            {showPOS && (
              <li className="nav-item">
                <SideLink to="/pos" icon="ri-store-2-line">
                  POS &amp; Checkout Register
                </SideLink>
              </li>
            )}

            {/* ── CATALOG & INVENTORY ── */}
            {(showProducts || showInventory) && (
              <li className="menu-section-divider">
                <span>Catalog &amp; Stock</span>
              </li>
            )}

            {showProducts && (
              <CollapseMenu id="productsMenu" icon="ri-price-tag-3-line" label="Product Catalog">
                <li><SideLink to="/products">All Products</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/add">Add Product</SideLink></li>}
                <li><SideLink to="/products/categories">Categories</SideLink></li>
                <li><SideLink to="/products/sub-categories">Sub-Categories</SideLink></li>
                <li><SideLink to="/products/units">Units of Measure</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/brands">Brands</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/variants">Variants</SideLink></li>}
                <li><SideLink to="/products/reviews">Customer Reviews</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/barcode">Barcode Labels</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/products/export">Bulk Export</SideLink></li>}
              </CollapseMenu>
            )}

            {showInventory && (
              <CollapseMenu id="inventoryMenu" icon="ri-archive-stack-line" label="Inventory Engine">
                <li><SideLink to="/inventory/stock">Stock Registry</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/stock-in">Receive Stock (In)</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/stock-out">Dispatch Stock (Out)</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/adjustment">Stock Adjustments</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/transfer">Branch Transfer</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/batches">Batches &amp; Expiry</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/warehouses">Warehouses</SideLink></li>}
                <li><SideLink to="/inventory/alerts">Low Stock Alerts</SideLink></li>
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/valuation">Asset Valuation</SideLink></li>}
                {is('superadmin', 'admin', 'manager') && <li><SideLink to="/inventory/lost-items">Damaged &amp; Lost</SideLink></li>}
              </CollapseMenu>
            )}

            {/* ── COMMERCE & LOGISTICS ── */}
            {(showOrders || showDelivery) && (
              <li className="menu-section-divider">
                <span>Commerce &amp; Logistics</span>
              </li>
            )}

            {showOrders && (
              <CollapseMenu id="ordersMenu" icon="ri-shopping-bag-3-line" label="Orders &amp; Invoices">
                <li><SideLink to="/orders">Order History</SideLink></li>
                <li><SideLink to="/orders/invoices">Invoices &amp; Receipts</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/orders/refunds">Refunds &amp; Returns</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {showDelivery && (
              <CollapseMenu id="deliveriesMenu" icon="ri-truck-line" label="Dispatch &amp; Fleet">
                <li><SideLink to="/deliveries/active">Active Deliveries</SideLink></li>
                <li><SideLink to="/deliveries/map">Live Delivery Map</SideLink></li>
                <li><SideLink to="/deliveries/zones">Delivery Zones</SideLink></li>
                <li><SideLink to="/deliveries/drivers">Driver Roster</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── CRM & WORKFORCE ── */}
            {(showCustomers || showStaff) && (
              <li className="menu-section-divider">
                <span>Relations &amp; Team</span>
              </li>
            )}

            {showCustomers && (
              <CollapseMenu id="customersMenu" icon="ri-user-heart-line" label="Customer Relations">
                <li><SideLink to="/customers">Customer Directory</SideLink></li>
                <li><SideLink to="/customers/loyalty">Loyalty Rewards</SideLink></li>
                <li><SideLink to="/customers/activity">Customer Activity</SideLink></li>
              </CollapseMenu>
            )}

            {showStaff && (
              <CollapseMenu id="staffMenu" icon="ri-team-line" label="Staff &amp; Workforce">
                <li><SideLink to="/staff">Staff Directory</SideLink></li>
                <li><SideLink to="/staff/add">Add Staff Member</SideLink></li>
                <li><SideLink to="/staff/roles">Roles &amp; Access Control</SideLink></li>
                <li><SideLink to="/staff/attendance">Attendance Registry</SideLink></li>
                <li><SideLink to="/staff/schedule">Shifts &amp; Scheduling</SideLink></li>
                <li><SideLink to="/staff/holidays">Public Holidays</SideLink></li>
                <li><SideLink to="/staff/payroll">Payroll Engine</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── FINANCIALS & INTELLIGENCE ── */}
            {(showFinance || showReports) && (
              <li className="menu-section-divider">
                <span>Financials &amp; Intelligence</span>
              </li>
            )}

            {showFinance && (
              <CollapseMenu id="accountsMenu" icon="ri-bank-card-line" label="Treasury &amp; Ledger">
                <li><SideLink to="/accounts/overview">Financial Overview</SideLink></li>
                <li><SideLink to="/accounts/transactions">Ledger Transactions</SideLink></li>
                <li><SideLink to="/accounts/income">Revenue Inflow</SideLink></li>
                <li><SideLink to="/accounts/expenses">Operating Expenses</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/commissions">Driver Commissions</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/bank">Bank Accounts</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/accounts/transfer">Funds Transfer</SideLink></li>
                )}
              </CollapseMenu>
            )}

            {showReports && (
              <CollapseMenu id="reportsMenu" icon="ri-bar-chart-grouped-line" label="Analytics &amp; Reports">
                <li><SideLink to="/reports/sales">Sales Performance</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/reports/inventory">Inventory Valuation</SideLink></li>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/reports/customers">Customer Retention</SideLink></li>
                )}
                <li><SideLink to="/reports/expenses">Expense Analysis</SideLink></li>
                <li><SideLink to="/reports/finance">P&amp;L Statements</SideLink></li>
              </CollapseMenu>
            )}

            {/* ── AI & ENTERPRISE CONFIG ── */}
            {(showChefAI || showStores || showSettings) && (
              <li className="menu-section-divider">
                <span>AI &amp; Enterprise Config</span>
              </li>
            )}

            {showChefAI && (
              <CollapseMenu id="chefBemsMenu" icon="ri-robot-line" label="Chef Bems AI" badge="AI">
                <li><SideLink to="/chef-bems/conversations">AI Conversations</SideLink></li>
                {is('superadmin', 'admin', 'manager') && (
                  <li><SideLink to="/chef-bems/dietary-rules">Dietary Rules Matrix</SideLink></li>
                )}
                <li><SideLink to="/chef-bems/meal-associations">Dish Associations</SideLink></li>
              </CollapseMenu>
            )}

            {showStores && (
              <CollapseMenu id="storesMenu" icon="ri-store-3-line" label="Multi-Branch Network">
                <li><SideLink to="/stores">All Branch Locations</SideLink></li>
                <li><SideLink to="/stores/add">Add New Branch</SideLink></li>
              </CollapseMenu>
            )}

            {showSettings && (
              <CollapseMenu id="settingsMenu" icon="ri-settings-3-line" label="Platform Settings">
                <li><SideLink to="/settings/general">General Settings</SideLink></li>
                {is('superadmin', 'admin') && <li><SideLink to="/settings/pos">POS Configuration</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/payment">Payment Gateways</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/coupons">Promotions &amp; Discounts</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/tax">Tax Rules (VAT)</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/currencies">Multi-Currency</SideLink></li>}
                {is('superadmin', 'admin') && <li><SideLink to="/settings/invoices">Invoice Templates</SideLink></li>}
                <li><SideLink to="/settings/notifications">Notification Center</SideLink></li>
                {is('superadmin', 'admin') && <li><SideLink to="/settings/manager">Branch Permissions</SideLink></li>}
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
