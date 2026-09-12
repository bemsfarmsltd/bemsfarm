import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth()
  const location = useLocation()
  const roleMeta = user ? ROLE_META[user.role] : null

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

  // Auto-detect active category based on current pathname
  const getActiveCategoryFromPath = (path) => {
    if (path.startsWith('/products')) return 'products'
    if (path.startsWith('/inventory')) return 'inventory'
    if (path.startsWith('/orders')) return 'orders'
    if (path.startsWith('/deliveries')) return 'deliveries'
    if (path.startsWith('/customers')) return 'customers'
    if (path.startsWith('/staff')) return 'staff'
    if (path.startsWith('/accounts')) return 'finance'
    if (path.startsWith('/reports')) return 'reports'
    if (path.startsWith('/chef-bems')) return 'chef'
    if (path.startsWith('/stores')) return 'stores'
    if (path.startsWith('/settings')) return 'settings'
    if (path.startsWith('/pos')) return 'main'
    return 'main'
  }

  const [activeTab, setActiveTab] = useState(() => getActiveCategoryFromPath(location.pathname))
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setActiveTab(getActiveCategoryFromPath(location.pathname))
  }, [location.pathname])

  // Inject Two-Column Dual Sidebar Styles
  useEffect(() => {
    const id = 'sidebar-dual-column-styles'
    let style = document.getElementById(id)
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      .dual-sidebar-container {
        display: flex;
        width: 272px;
        height: 100%;
        background: #FFFFFF;
        position: relative;
      }
      
      /* ── COLUMN 1: SLIM DARK ICON RAIL (68px) ── */
      .sidebar-icon-rail {
        width: 68px;
        min-width: 68px;
        background-color: #0E111B;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.75rem 0;
        z-index: 10;
      }
      
      .rail-nav-list {
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 0.4rem;
        scrollbar-width: none;
      }
      .rail-nav-list::-webkit-scrollbar { display: none; }
      
      .rail-btn {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #94A3B8;
        font-size: 1.25rem;
        cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        text-decoration: none;
      }
      .rail-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #FFFFFF;
      }
      
      /* Active Gold/Amber Signature Bank Pill */
      .rail-btn.active {
        background: linear-gradient(135deg, #B45309, #92400E);
        color: #FFFFFF;
        box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
      }
      .rail-btn.active::before {
        content: '';
        position: absolute;
        left: -6px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 20px;
        background: #F59E0B;
        border-radius: 0 4px 4px 0;
      }
      
      /* ── COLUMN 2: WHITE SUB-NAVIGATION FLYOUT PANEL (204px) ── */
      .sidebar-sub-panel {
        width: 204px;
        min-width: 204px;
        background: #FFFFFF;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-right: 1px solid #E5E7EB;
        box-shadow: 4px 0 16px rgba(0, 0, 0, 0.06);
        transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      /* Smooth Hover Flyout Controls */
      #main-sidebar:not(:hover):not(.sidebar-expanded) .sidebar-sub-panel {
        opacity: 0;
        pointer-events: none;
        transform: translateX(-8px);
      }
      
      #main-sidebar:hover .sidebar-sub-panel,
      #main-sidebar.sidebar-expanded .sidebar-sub-panel {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
      }
      
      .sub-panel-header {
        padding: 1rem 1.15rem 0.75rem;
        border-bottom: 1px solid #F1F5F9;
        background: #FFFFFF;
      }
      .sub-panel-brand {
        font-size: 11px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94A3B8;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .sub-panel-title {
        font-size: 14.5px;
        font-weight: 800;
        color: #0F172A;
        margin-top: 2px;
        letter-spacing: -0.01em;
      }
      
      .sub-panel-nav {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem 0.65rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      
      .dual-sub-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.55rem 0.85rem;
        border-radius: 8px;
        color: #475569;
        font-size: 13px;
        font-weight: 550;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      .dual-sub-link:hover {
        background: #F8FAFC;
        color: #0F172A;
      }
      .dual-sub-link.active {
        background: #FEF3C7;
        color: #92400E;
        font-weight: 750;
      }
      
      .sub-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 999px;
        background: #F1F5F9;
        color: #475569;
      }
      .dual-sub-link.active .sub-badge {
        background: #FDE68A;
        color: #78350F;
      }
    `
  }, [])

  const handleRailHover = (categoryKey) => {
    setActiveTab(categoryKey)
  }

  return (
    <div
      id="main-sidebar"
      className={`main-sidebar ${isHovered ? 'sidebar-expanded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="dual-sidebar-container">

        {/* ── LEFT COLUMN: SLIM ICON RAIL ── */}
        <div className="sidebar-icon-rail">
          <div className="rail-nav-list">

            {/* Dashboard / Main */}
            <button
              type="button"
              className={`rail-btn ${activeTab === 'main' ? 'active' : ''}`}
              onMouseEnter={() => handleRailHover('main')}
              onClick={() => setActiveTab('main')}
              title="Overview"
            >
              <i className="ri-dashboard-2-line"></i>
            </button>

            {/* Products */}
            {showProducts && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'products' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('products')}
                onClick={() => setActiveTab('products')}
                title="Products"
              >
                <i className="ri-price-tag-3-line"></i>
              </button>
            )}

            {/* Inventory */}
            {showInventory && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('inventory')}
                onClick={() => setActiveTab('inventory')}
                title="Inventory"
              >
                <i className="ri-archive-stack-line"></i>
              </button>
            )}

            {/* Orders */}
            {showOrders && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('orders')}
                onClick={() => setActiveTab('orders')}
                title="Orders"
              >
                <i className="ri-shopping-bag-3-line"></i>
              </button>
            )}

            {/* Deliveries */}
            {showDelivery && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('deliveries')}
                onClick={() => setActiveTab('deliveries')}
                title="Deliveries"
              >
                <i className="ri-truck-line"></i>
              </button>
            )}

            {/* Customers */}
            {showCustomers && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'customers' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('customers')}
                onClick={() => setActiveTab('customers')}
                title="Customers"
              >
                <i className="ri-user-heart-line"></i>
              </button>
            )}

            {/* Staff */}
            {showStaff && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'staff' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('staff')}
                onClick={() => setActiveTab('staff')}
                title="Staff & HR"
              >
                <i className="ri-team-line"></i>
              </button>
            )}

            {/* Finance */}
            {showFinance && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'finance' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('finance')}
                onClick={() => setActiveTab('finance')}
                title="Finance & Accounts"
              >
                <i className="ri-bank-card-line"></i>
              </button>
            )}

            {/* Reports */}
            {showReports && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('reports')}
                onClick={() => setActiveTab('reports')}
                title="Reports"
              >
                <i className="ri-bar-chart-grouped-line"></i>
              </button>
            )}

            {/* Chef AI */}
            {showChefAI && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'chef' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('chef')}
                onClick={() => setActiveTab('chef')}
                title="Chef Bems AI"
              >
                <i className="ri-robot-line"></i>
              </button>
            )}

            {/* Multi-Store */}
            {showStores && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'stores' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('stores')}
                onClick={() => setActiveTab('stores')}
                title="Multi-Store"
              >
                <i className="ri-store-3-line"></i>
              </button>
            )}

            {/* Settings */}
            {showSettings && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onMouseEnter={() => handleRailHover('settings')}
                onClick={() => setActiveTab('settings')}
                title="Settings"
              >
                <i className="ri-settings-3-line"></i>
              </button>
            )}
          </div>

          {/* Bottom Logout */}
          <div className="pt-2 border-top border-secondary border-opacity-10 w-100 d-flex justify-content-center">
            <button
              type="button"
              className="rail-btn text-danger"
              onClick={logout}
              title="Sign Out"
            >
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: WHITE SUB-NAVIGATION FLYOUT PANEL ── */}
        <div className="sidebar-sub-panel">

          {/* Subpanel Header */}
          <div className="sub-panel-header">
            <div className="sub-panel-brand">
              <i className="ri-store-2-line text-warning"></i>
              <span>Bems Farms</span>
            </div>
            <div className="sub-panel-title">
              {activeTab === 'main' && 'Overview'}
              {activeTab === 'products' && 'Products & Catalog'}
              {activeTab === 'inventory' && 'Stock & Warehouses'}
              {activeTab === 'orders' && 'Sales & Orders'}
              {activeTab === 'deliveries' && 'Operations & Dispatch'}
              {activeTab === 'customers' && 'Customer CRM'}
              {activeTab === 'staff' && 'Staff & Payroll'}
              {activeTab === 'finance' && 'Accounts & Finance'}
              {activeTab === 'reports' && 'Analytics & Reports'}
              {activeTab === 'chef' && 'Chef Bems AI'}
              {activeTab === 'stores' && 'Multi-Store Network'}
              {activeTab === 'settings' && 'System Settings'}
            </div>
          </div>

          {/* Subpanel Links List */}
          <div className="sub-panel-nav">

            {/* 1. MAIN / OVERVIEW */}
            {activeTab === 'main' && (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Dashboard</span>
                </NavLink>
                {showPOS && (
                  <NavLink to="/pos" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Point of Sale</span>
                    <span className="sub-badge" style={{ background: '#ECFDF5', color: '#059669' }}>Live</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 2. PRODUCTS */}
            {activeTab === 'products' && (
              <>
                <NavLink to="/products" end className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Products</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/products/add" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Add Product</span>
                  </NavLink>
                )}
                <NavLink to="/products/categories" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Categories</span>
                </NavLink>
                <NavLink to="/products/sub-categories" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Sub-Categories</span>
                </NavLink>
                <NavLink to="/products/units" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Units of Measure</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/products/brands" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Brands</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/products/variants" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Variants</span>
                  </NavLink>
                )}
                <NavLink to="/products/reviews" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Customer Reviews</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/products/barcode" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Barcode Generator</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/products/export" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Bulk Export</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 3. INVENTORY */}
            {activeTab === 'inventory' && (
              <>
                <NavLink to="/inventory/stock" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Stock List</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/stock-in" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Stock In (Receiving)</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/stock-out" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Stock Out (Dispatch)</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/adjustment" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Adjustments</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/transfer" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Stock Transfer</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/batches" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Batches &amp; Expiry</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/warehouses" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Warehouses</span>
                  </NavLink>
                )}
                <NavLink to="/inventory/alerts" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Low Stock Alerts</span>
                  <span className="sub-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>Alert</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/valuation" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Valuation</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/lost-items" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Lost &amp; Damaged</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 4. ORDERS */}
            {activeTab === 'orders' && (
              <>
                <NavLink to="/orders" end className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Orders</span>
                </NavLink>
                <NavLink to="/orders/invoices" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Invoices</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/orders/refunds" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Refunds &amp; Returns</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 5. DELIVERIES */}
            {activeTab === 'deliveries' && (
              <>
                <NavLink to="/deliveries/active" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Active Deliveries</span>
                  <span className="sub-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>Live</span>
                </NavLink>
                <NavLink to="/deliveries/map" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Delivery Map</span>
                </NavLink>
                <NavLink to="/deliveries/zones" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Coverage Zones</span>
                </NavLink>
                <NavLink to="/deliveries/drivers" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Dispatch Drivers</span>
                </NavLink>
              </>
            )}

            {/* 6. CUSTOMERS */}
            {activeTab === 'customers' && (
              <>
                <NavLink to="/customers" end className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Customers</span>
                </NavLink>
                <NavLink to="/customers/loyalty" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Loyalty Rewards</span>
                </NavLink>
                <NavLink to="/customers/activity" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Customer Activity</span>
                </NavLink>
              </>
            )}

            {/* 7. STAFF */}
            {activeTab === 'staff' && (
              <>
                <NavLink to="/staff" end className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Staff Directory</span>
                </NavLink>
                <NavLink to="/staff/add" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Add New Staff</span>
                </NavLink>
                <NavLink to="/staff/roles" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Roles &amp; Permissions</span>
                </NavLink>
                <NavLink to="/staff/attendance" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Attendance</span>
                </NavLink>
                <NavLink to="/staff/schedule" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Shift Schedules</span>
                </NavLink>
                <NavLink to="/staff/holidays" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Holidays &amp; Leaves</span>
                </NavLink>
                <NavLink to="/staff/payroll" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Payroll</span>
                </NavLink>
              </>
            )}

            {/* 8. FINANCE */}
            {activeTab === 'finance' && (
              <>
                <NavLink to="/accounts/overview" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/accounts/transactions" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Transactions</span>
                </NavLink>
                <NavLink to="/accounts/income" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Income &amp; Revenue</span>
                </NavLink>
                <NavLink to="/accounts/expenses" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Expenses</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/accounts/commissions" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Driver Commissions</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/accounts/bank" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Bank Accounts</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/accounts/transfer" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Money Transfer</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 9. REPORTS */}
            {activeTab === 'reports' && (
              <>
                <NavLink to="/reports/sales" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Sales Report</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/reports/inventory" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Inventory Report</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/reports/customers" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Customer Report</span>
                  </NavLink>
                )}
                <NavLink to="/reports/expenses" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Expense Report</span>
                </NavLink>
                <NavLink to="/reports/finance" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Finance &amp; P&amp;L</span>
                </NavLink>
              </>
            )}

            {/* 10. CHEF BEMS AI */}
            {activeTab === 'chef' && (
              <>
                <NavLink to="/chef-bems/conversations" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Live Conversations</span>
                  <span className="sub-badge" style={{ background: '#EDE9FE', color: '#7C3AED' }}>AI</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/chef-bems/dietary-rules" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Dietary &amp; Nutrition Rules</span>
                  </NavLink>
                )}
                <NavLink to="/chef-bems/meal-associations" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Meal &amp; Recipe Associations</span>
                </NavLink>
              </>
            )}

            {/* 11. STORES */}
            {activeTab === 'stores' && (
              <>
                <NavLink to="/stores" end className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Store Locations</span>
                </NavLink>
                <NavLink to="/stores/add" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Add New Store</span>
                </NavLink>
              </>
            )}

            {/* 12. SETTINGS */}
            {activeTab === 'settings' && (
              <>
                <NavLink to="/settings/general" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>General Store Info</span>
                </NavLink>
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/pos" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>POS Terminal Config</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/payment" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Payment Gateways</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/coupons" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Discounts &amp; Coupons</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/tax" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Tax &amp; VAT</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/currencies" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Currencies</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/invoices" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Invoice Templates</span>
                  </NavLink>
                )}
                <NavLink to="/settings/notifications" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Notifications</span>
                </NavLink>
                {is('superadmin', 'admin') && (
                  <NavLink to="/settings/manager" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Manager Permissions</span>
                  </NavLink>
                )}
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
