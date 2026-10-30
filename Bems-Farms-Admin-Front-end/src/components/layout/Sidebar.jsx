import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_META } from '../../lib/roles'

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Role helpers
  const is = (...roles) => hasRole(...roles)
  const isAppDeveloper = user?.role === 'app_developer'

  // First sub-category route mapping for each rail category
  const CATEGORY_FIRST_ROUTES = {
    dashboards: '/dashboard?tab=overview',
    pos: '/pos',
    inventory: '/inventory/stock-in',
    products: '/products',
    orders: '/orders',
    deliveries: '/deliveries/active',
    customers: '/customers',
    finance: '/accounts/transactions',
    reports: '/reports/sales',
    chef: '/chef-bems/conversations',
    settings: isAppDeveloper ? '/settings/mobile-apps' : '/settings/general',
    godeye: '/god-eye',
  }

  const showInventory = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showProducts  = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showOrders    = is('superadmin', 'admin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff')
  const showDelivery  = is('superadmin', 'admin', 'manager', 'delivery_manager')
  const showCustomers = is('superadmin', 'admin', 'manager', 'cashier')
  const showFinance   = is('superadmin', 'admin', 'manager', 'accountant')
  const showReports   = is('superadmin', 'admin', 'manager', 'accountant')
  const showStaff     = is('superadmin', 'admin', 'manager')
  const showChefAI    = is('superadmin', 'admin', 'manager', 'kitchen_staff')
  const showStores    = is('superadmin', 'admin')
  const showSettings  = is('superadmin', 'admin', 'manager', 'app_developer')
  const showPOS       = is('superadmin', 'admin', 'manager', 'cashier')
  // Audit log is accessible to superadmins and administrators
  const showGodEye    = is('superadmin', 'admin')

  // Auto-detect active category based on current pathname
  const getActiveCategoryFromPath = (path) => {
    if (path.startsWith('/dashboard')) return 'dashboards'
    if (path.startsWith('/pos')) return 'pos'
    if (path.startsWith('/inventory')) return 'inventory'
    if (path.startsWith('/products')) return 'products'
    if (path.startsWith('/orders')) return 'orders'
    if (path.startsWith('/deliveries')) return 'deliveries'
    if (path.startsWith('/customers')) return 'customers'
    if (path.startsWith('/accounts')) return 'finance'
    if (path.startsWith('/reports')) return 'reports'
    if (path.startsWith('/chef-bems')) return 'chef'
    if (path.startsWith('/onboarding') || path.startsWith('/staff') || path.startsWith('/settings')) return 'settings'
    if (path.startsWith('/god-eye') || path.startsWith('/audit')) return 'godeye'
    return 'dashboards'
  }

  const [activeTab, setActiveTab] = useState(() => getActiveCategoryFromPath(location.pathname))
  const [isRailExpanded, setIsRailExpanded] = useState(false)

  const handleCategoryClick = (tabKey) => {
    setActiveTab(tabKey)
    const targetRoute = CATEGORY_FIRST_ROUTES[tabKey]
    if (targetRoute) {
      navigate(targetRoute)
    }
  }

  useEffect(() => {
    setActiveTab(getActiveCategoryFromPath(location.pathname))
  }, [location.pathname])

  // Helper to check which dashboard tab is currently open
  const isDashboardTabActive = (tabKey) => {
    if (!location.pathname.startsWith('/dashboard')) return false
    const currentTab = new URLSearchParams(location.search).get('tab')
    if (!currentTab && tabKey === 'overview') return true
    return currentTab === tabKey
  }

  // Helper to check which onboarding tab is currently open
  const isOnboardingTabActive = (tabKey) => {
    if (!location.pathname.startsWith('/onboarding') && !location.pathname.startsWith('/staff') && !location.pathname.startsWith('/settings/team')) return false
    const currentTab = new URLSearchParams(location.search).get('tab')
    if (tabKey === 'staff') {
      return (!currentTab || currentTab === 'staff') && !location.pathname.includes('invites') && !location.pathname.includes('roles')
    }
    if (tabKey === 'onboarding') {
      return currentTab === 'onboarding' || location.pathname.includes('invites')
    }
    if (tabKey === 'roles') {
      return currentTab === 'roles' || location.pathname.includes('roles')
    }
    return false
  }

  const hasSubpanel = activeTab !== 'godeye' && activeTab !== 'pos'

  // Sync body class when no subpanel is active (e.g. God Eye full-width mode)
  useEffect(() => {
    if (!hasSubpanel) {
      document.body.classList.add('no-subpanel')
    } else {
      document.body.classList.remove('no-subpanel')
    }
    return () => document.body.classList.remove('no-subpanel')
  }, [hasSubpanel])

  // Sync body class when rail expands on hover so entire layout pushes smoothly together
  useEffect(() => {
    if (isRailExpanded) {
      document.body.classList.add('rail-is-hovered')
    } else {
      document.body.classList.remove('rail-is-hovered')
    }
    return () => document.body.classList.remove('rail-is-hovered')
  }, [isRailExpanded])

  // Inject Two-Column Dual Sidebar Styles
  useEffect(() => {
    const id = 'sidebar-signature-dual-styles'
    let style = document.getElementById(id)
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      .dual-sidebar-container {
        display: flex;
        width: 268px;
        height: 100%;
        position: relative;
        transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dual-sidebar-container.no-subpanel {
        width: 68px !important;
      }
      body.rail-is-hovered .dual-sidebar-container {
        width: 415px;
      }
      body.rail-is-hovered .dual-sidebar-container.no-subpanel {
        width: 215px !important;
      }
      .dual-sidebar-container.no-subpanel .sidebar-sub-panel {
        display: none !important;
      }
      
      /* ── COLUMN 1: LIGHT RAIL (68px default -> expands to 215px on hover) ── */
      .sidebar-icon-rail {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 68px;
        background-color: #FFFFFF;
        border-right: 1px solid #E5E7EB;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0 0.5rem 0.75rem;
        z-index: 20;
        overflow-x: hidden;
        overflow-y: auto;
        transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease;
        scrollbar-width: none;
      }
      .sidebar-icon-rail::-webkit-scrollbar { display: none; }
      
      .sidebar-icon-rail:hover,
      .sidebar-icon-rail.rail-open,
      body.rail-is-hovered .sidebar-icon-rail {
        width: 215px;
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.08);
      }
      
      /* Rail Brand Header (Begins right from top bar level) */
      .rail-brand-header {
        width: 100%;
        height: 3.5rem;
        min-height: 3.5rem;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #E5E7EB;
        margin-bottom: 0.65rem;
      }
      
      .rail-brand-btn {
        width: 100%;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        padding: 0 7px;
        text-decoration: none;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      .rail-brand-btn:hover {
        background: #F8FAFC;
      }
      
      .rail-brand-b {
        width: 34px;
        height: 34px;
        min-width: 34px;
        object-fit: contain;
        filter: drop-shadow(0 2px 6px rgba(20, 60, 45, 0.15));
        flex-shrink: 0;
      }
      
      .rail-brand-full {
        margin-left: 0.65rem;
        opacity: 0;
        transform: translateX(-8px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        white-space: nowrap;
        display: flex;
        align-items: center;
        pointer-events: none;
      }
      
      .rail-brand-text-img {
        height: 18px;
        width: auto;
        object-fit: contain;
      }
      
      .sidebar-icon-rail:hover .rail-brand-full,
      .sidebar-icon-rail.rail-open .rail-brand-full,
      body.rail-is-hovered .rail-brand-full {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      
      .rail-nav-list {
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      
      .rail-btn {
        width: 100%;
        min-height: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        color: #475569;
        cursor: pointer;
        padding: 0 11px;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        text-decoration: none;
        white-space: nowrap;
      }
      
      .rail-btn .rail-icon {
        font-size: 1.25rem;
        min-width: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .rail-btn .rail-label {
        font-size: 13.5px;
        font-weight: 600;
        color: inherit;
        margin-left: 0.5rem;
        opacity: 0;
        transform: translateX(-6px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        pointer-events: none;
      }
      
      .sidebar-icon-rail:hover .rail-btn .rail-label,
      .sidebar-icon-rail.rail-open .rail-btn .rail-label,
      body.rail-is-hovered .rail-btn .rail-label {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      
      .rail-btn:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
      
      /* Active Luxury Forest Green Client-Side Pill */
      .rail-btn.active {
        background: linear-gradient(135deg, #143C2D, #0B281B);
        color: #FFFFFF !important;
        box-shadow: 0 4px 14px rgba(20, 60, 45, 0.28);
      }
      .rail-btn.active::before {
        content: '';
        position: absolute;
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 22px;
        background: #F59E0B;
        border-radius: 0 4px 4px 0;
      }
      
      /* ── COLUMN 2: WHITE SUB-NAVIGATION PANEL (PUSHES SMOOTHLY WHEN RAIL EXPANDS) ── */
      .sidebar-sub-panel {
        position: absolute;
        left: 68px;
        top: 3.5rem;
        bottom: 0;
        width: 200px;
        background: #FAFAFA;
        border-right: 1px solid #E5E7EB;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.02);
        display: flex;
        flex-direction: column;
        z-index: 10;
        overflow: hidden;
        transition: left 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      .sidebar-icon-rail:hover ~ .sidebar-sub-panel,
      .sidebar-icon-rail.rail-open ~ .sidebar-sub-panel,
      body.rail-is-hovered .sidebar-sub-panel {
        left: 215px;
      }
      
      .sub-panel-header {
        padding: 0.95rem 1.15rem 0.85rem;
        border-bottom: 1px solid #E5E7EB;
        background: #FAFAFA;
      }
      .sub-panel-title {
        font-size: 15px;
        font-weight: 800;
        color: #0F172A;
        letter-spacing: -0.01em;
        margin: 0;
      }
      
      .sub-panel-nav {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem 0.65rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .sub-section-header {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #94A3B8;
        padding: 0.85rem 0.85rem 0.3rem;
        text-transform: uppercase;
        user-select: none;
      }
      .sub-section-header:first-of-type {
        padding-top: 0.2rem;
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
        outline: none !important;
        border: none !important;
      }
      .dual-sub-link:focus,
      .dual-sub-link:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      .dual-sub-link:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
      .dual-sub-link.active {
        background: #EAF5EF;
        color: #143C2D;
        font-weight: 750;
        border-left: 3px solid #143C2D !important;
        padding-left: calc(0.85rem - 3px);
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

  return (
    <div id="main-sidebar" className="main-sidebar">
      <div className={`dual-sidebar-container ${!hasSubpanel ? 'no-subpanel' : ''}`}>

        {/* ── LEFT COLUMN: DARK RAIL (Hover expands to full width with text) ── */}
        <div
          className={`sidebar-icon-rail ${isRailExpanded ? 'rail-open' : ''}`}
          onMouseEnter={() => setIsRailExpanded(true)}
          onMouseLeave={() => setIsRailExpanded(false)}
        >
          {/* Top Brand / Logo Mark (Only B when closed, expands to full BEMS FARMS) */}
          <div className="rail-brand-header">
            <Link to="/dashboard" className="rail-brand-btn" title="Bems Farms">
              <img src="/bemsfarms_icon_b.png" alt="B" className="rail-brand-b" />
              <div className="rail-brand-full">
                <img src="/bemsfarms_text.png" alt="Bems Farms" className="rail-brand-text-img" />
              </div>
            </Link>
          </div>

          <div className="rail-nav-list">

            {/* Dashboards — hidden for app developers */}
            {!isAppDeveloper && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'dashboards' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('dashboards')}
                title="Dashboards"
              >
                <i className="ri-dashboard-2-line rail-icon"></i>
                <span className="rail-label">Dashboards</span>
              </button>
            )}


            {/* 3. Inventory (BEFORE Products) */}
            {showInventory && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('inventory')}
                title="Stock & Inventory"
              >
                <i className="ri-archive-stack-line rail-icon"></i>
                <span className="rail-label">Inventory</span>
              </button>
            )}

            {/* 4. Products & Catalog */}
            {showProducts && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('products')}
                title="Products & Catalog"
              >
                <i className="ri-price-tag-3-line rail-icon"></i>
                <span className="rail-label">Products</span>
              </button>
            )}

            {/* 5. Orders */}
            {showOrders && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('orders')}
                title="Sales & Orders"
              >
                <i className="ri-shopping-bag-3-line rail-icon"></i>
                <span className="rail-label">Orders</span>
              </button>
            )}

            {/* 6. Deliveries */}
            {showDelivery && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('deliveries')}
                title="Operations & Dispatch"
              >
                <i className="ri-truck-line rail-icon"></i>
                <span className="rail-label">Deliveries</span>
              </button>
            )}

            {/* 7. Customers */}
            {showCustomers && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('customers')}
                title="Customers CRM"
              >
                <i className="ri-user-heart-line rail-icon"></i>
                <span className="rail-label">Customers</span>
              </button>
            )}

            {/* 8. Finance */}
            {showFinance && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'finance' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('finance')}
                title="Finance & Accounts"
              >
                <i className="ri-bank-card-line rail-icon"></i>
                <span className="rail-label">Finance</span>
              </button>
            )}

            {/* 9. Reports & Analytics */}
            {showReports && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('reports')}
                title="Reports & Analytics"
              >
                <i className="ri-bar-chart-box-line rail-icon"></i>
                <span className="rail-label">Reports</span>
              </button>
            )}

            {/* 10. Chef Bems AI */}
            {showChefAI && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'chef' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('chef')}
                title="Chef Bems AI"
              >
                <i className="ri-robot-line rail-icon"></i>
                <span className="rail-label">Chef Bems AI</span>
              </button>
            )}

            {/* 11. Settings & Onboarding / Mobile Apps */}
            {showSettings && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('settings')}
                title={isAppDeveloper ? "Mobile Apps" : "Settings & Onboarding"}
              >
                <i className={`${isAppDeveloper ? 'ri-smartphone-line' : 'ri-settings-3-line'} rail-icon`}></i>
                <span className="rail-label">{isAppDeveloper ? 'Mobile Apps' : 'Settings'}</span>
              </button>
            )}

            {/* 12. Audit Log — superadmin / admin */}
            {showGodEye && (
              <button
                type="button"
                className={`rail-btn ${activeTab === 'godeye' ? 'active' : ''}`}
                onClick={() => handleCategoryClick('godeye')}
                title="System Activity & Audit Log"
                style={activeTab === 'godeye' ? { background: 'linear-gradient(135deg,#1e293b,#0f172a)', color: '#10b981' } : {}}
              >
                <i className="ri-history-line rail-icon" style={{ fontSize: 19, lineHeight: 1 }}></i>
                <span className="rail-label" style={{ fontWeight: activeTab === 'godeye' ? 700 : 500 }}>Audit Log</span>
              </button>
            )}
          </div>

          {/* Bottom Logout */}
          <div className="pt-2 border-top border-secondary border-opacity-10 w-100">
            <button
              type="button"
              className="rail-btn text-danger"
              onClick={logout}
              title="Sign Out"
            >
              <i className="ri-logout-box-r-line rail-icon"></i>
              <span className="rail-label font-weight-bold">Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: WHITE SUB-NAVIGATION PANEL (SHOWN ONLY WHEN SUBPANEL ACTIVE) ── */}
        {hasSubpanel && (
          <div className="sidebar-sub-panel">

            {/* Subpanel Header */}
            <div className="sub-panel-header">
              <div className="sub-panel-title">
                {activeTab === 'dashboards' && 'Dashboards'}
                {activeTab === 'inventory' && 'Stock & Warehouses'}
                {activeTab === 'products' && 'Products & Catalog'}
                {activeTab === 'orders' && 'Sales & Orders'}
                {activeTab === 'deliveries' && 'Operations & Dispatch'}
                {activeTab === 'customers' && 'Customer CRM'}
                {activeTab === 'finance' && 'Finance & Accounts'}
                {activeTab === 'chef' && 'Chef Bems AI'}
                {activeTab === 'stores' && 'Multi-Store Network'}
                {activeTab === 'settings' && (isAppDeveloper ? 'Mobile Apps Ecosystem' : 'Settings & Onboarding')}
              </div>
            </div>

          {/* Subpanel Links List */}
          <div className="sub-panel-nav">

            {/* 1. DASHBOARDS */}
            {activeTab === 'dashboards' && (
              <>
                {is('superadmin', 'admin', 'manager') && (
                  <Link
                    to="/dashboard?tab=overview"
                    className={`dual-sub-link ${isDashboardTabActive('overview') ? 'active' : ''}`}
                  >
                    <span>Overview</span>
                  </Link>
                )}
                <Link
                  to="/dashboard?tab=sales"
                  className={`dual-sub-link ${isDashboardTabActive('sales') ? 'active' : ''}`}
                >
                  <span>Sales &amp; Orders</span>
                </Link>
                {is('superadmin', 'admin', 'manager', 'accountant') && (
                  <Link
                    to="/dashboard?tab=finance"
                    className={`dual-sub-link ${isDashboardTabActive('finance') ? 'active' : ''}`}
                  >
                    <span>Finance &amp; Revenue</span>
                  </Link>
                )}
                {is('superadmin', 'admin', 'manager', 'kitchen_staff') && (
                  <Link
                    to="/dashboard?tab=inventory"
                    className={`dual-sub-link ${isDashboardTabActive('inventory') ? 'active' : ''}`}
                  >
                    <span>Inventory &amp; Stock</span>
                  </Link>
                )}
                {is('superadmin', 'admin', 'manager', 'delivery_manager') && (
                  <Link
                    to="/dashboard?tab=operations"
                    className={`dual-sub-link ${isDashboardTabActive('operations') ? 'active' : ''}`}
                  >
                    <span>Operations &amp; Dispatch</span>
                  </Link>
                )}
                {is('superadmin', 'admin', 'manager', 'cashier') && (
                  <Link
                    to="/dashboard?tab=customers"
                    className={`dual-sub-link ${isDashboardTabActive('customers') ? 'active' : ''}`}
                  >
                    <span>Customer Insights</span>
                  </Link>
                )}
                {is('superadmin', 'admin', 'manager', 'kitchen_staff') && (
                  <Link
                    to="/dashboard?tab=ai"
                    className={`dual-sub-link ${isDashboardTabActive('ai') ? 'active' : ''}`}
                  >
                    <span>Chef Bems AI</span>
                  </Link>
                )}
              </>
            )}

            {/* 2. INVENTORY */}
            {activeTab === 'inventory' && (
              <>
                {is('superadmin', 'admin', 'manager', 'kitchen_staff') && (
                  <NavLink to="/inventory/stock-in" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Restock Products</span>
                  </NavLink>
                )}
                <NavLink to="/inventory/schedule" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Restock Calendar</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/transfer" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Stock Transfer</span>
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
                  <NavLink to="/inventory/batches" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Batches &amp; Expiry</span>
                  </NavLink>
                )}
                <NavLink to="/inventory/alerts" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Low Stock Alerts</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/inventory/warehouses" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Warehouses</span>
                  </NavLink>
                )}
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
                {is('superadmin', 'admin') && (
                  <NavLink to="/god-eye?category=inventory" className={() => `dual-sub-link ${location.pathname.startsWith('/god-eye') && location.search.includes('category=inventory') ? 'active' : ''}`}>
                    <span>Inventory Audit Log</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 3. PRODUCTS */}
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
                <NavLink to="/products/units" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Units of Measure</span>
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
                <NavLink to="/products/reviews" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Customer Reviews</span>
                </NavLink>
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
                {is('superadmin', 'admin') && (
                  <NavLink to="/god-eye?category=orders" className={() => `dual-sub-link ${location.pathname.startsWith('/god-eye') && location.search.includes('category=orders') ? 'active' : ''}`}>
                    <span>Orders Audit Trail</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 5. DELIVERIES */}
            {activeTab === 'deliveries' && (
              <>
                <NavLink to="/deliveries/active" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Active Deliveries</span>
                </NavLink>
                <NavLink to="/deliveries/auto-assign" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Auto-Dispatch Logs</span>
                </NavLink>
                <NavLink to="/deliveries/map" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Delivery Map</span>
                </NavLink>
                <NavLink to="/deliveries/zones" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Coverage Zones</span>
                </NavLink>
                <NavLink
                  to="/deliveries/drivers"
                  className={() => `dual-sub-link ${location.pathname.startsWith('/deliveries/drivers') && new URLSearchParams(location.search).get('tab') !== 'chat' ? 'active' : ''}`}
                >
                  <span>Dispatch Drivers</span>
                </NavLink>
                <NavLink
                  to="/deliveries/drivers?tab=chat"
                  className={() => `dual-sub-link ${location.pathname.startsWith('/deliveries/drivers') && new URLSearchParams(location.search).get('tab') === 'chat' ? 'active' : ''}`}
                >
                  <span>Courier Dispatch Chat</span>
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
                <NavLink to="/customers/wallet" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Wallet Balances</span>
                </NavLink>
                {['superadmin','admin','manager'].includes(user?.role) && <>
                  <NavLink to="/customers/messages" className="dual-sub-link">Customer Messages</NavLink>
                  <NavLink to="/customers/broadcasts" className="dual-sub-link">Announcements</NavLink>
                  <NavLink to="/customers/demand" className="dual-sub-link">Product Demand</NavLink>
                </>}
                <NavLink to="/customers/activity" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Customer Activity</span>
                </NavLink>
              </>
            )}

            {/* 7. FINANCE */}
            {activeTab === 'finance' && (
              <>
                <NavLink to="/accounts/transactions" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>All Transactions</span>
                </NavLink>
                <NavLink to="/accounts/income" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Income &amp; Revenue</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/accounts/commissions" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Driver Commissions</span>
                  </NavLink>
                )}
                <NavLink to="/accounts/wallets" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Wallet &amp; Gateway Hub</span>
                </NavLink>
                {is('superadmin', 'admin') && (
                  <NavLink to="/god-eye?category=finance" className={() => `dual-sub-link ${location.pathname.startsWith('/god-eye') && location.search.includes('category=finance') ? 'active' : ''}`}>
                    <span>Financial Audit Log</span>
                  </NavLink>
                )}
              </>
            )}

            {/* 8. REPORTS */}
            {activeTab === 'reports' && (
              <>
                <NavLink to="/reports/sales" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Store Sales &amp; POS</span>
                </NavLink>
                <NavLink to="/reports/inventory" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Inventory &amp; Stock</span>
                </NavLink>
                <NavLink to="/reports/finance" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Finance &amp; Revenue</span>
                </NavLink>
                <NavLink to="/reports/customers" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Customer Analytics</span>
                </NavLink>
                <NavLink to="/reports/purchases" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Purchase Orders</span>
                </NavLink>
                {is('superadmin', 'admin') && (
                  <NavLink to="/god-eye?category=pos" className={() => `dual-sub-link ${location.pathname.startsWith('/god-eye') && location.search.includes('category=pos') ? 'active' : ''}`}>
                    <span>Store &amp; POS Audit</span>
                  </NavLink>
                )}
              </>
            )}


            {/* 9. CHEF BEMS AI */}
            {activeTab === 'chef' && (
              <>
                <NavLink to="/chef-bems/conversations" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Live Conversations</span>
                </NavLink>
                <NavLink to="/chef-bems/meals" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Meals &amp; Recipe Bundles</span>
                </NavLink>
                <NavLink to="/chef-bems/stock-gaps" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Recipe Stock Gaps</span>
                </NavLink>
                <NavLink to="/chef-bems/substitutions" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Ingredient Substitutions</span>
                </NavLink>
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/chef-bems/dietary-rules" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Dietary &amp; Nutrition Rules</span>
                  </NavLink>
                )}
                {is('superadmin', 'admin', 'manager') && (
                  <NavLink to="/chef-bems/allergy-rules" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Allergy &amp; Safety Rules</span>
                  </NavLink>
                )}
                <NavLink to="/chef-bems/meal-associations" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Meal &amp; Recipe Associations</span>
                </NavLink>
              </>
            )}

            {/* 10. SETTINGS & ONBOARDING */}
            {activeTab === 'settings' && (
              <>
                <div className="sub-section-header">{isAppDeveloper ? 'Account' : 'Store & Account'}</div>
                <NavLink to="/settings/profile" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>My Profile &amp; Security</span>
                </NavLink>
                {!isAppDeveloper && (
                  <NavLink to="/settings/general" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Store Profile</span>
                  </NavLink>
                )}

                {/* Team Onboarding & Staff Management */}
                {showStaff && !isAppDeveloper && (
                  <>
                    <div className="sub-section-header">Team &amp; Access</div>
                    <Link
                      to="/onboarding?tab=onboarding"
                      className={`dual-sub-link ${isOnboardingTabActive('onboarding') ? 'active' : ''}`}
                    >
                      <span>Team Onboarding</span>
                    </Link>
                    <Link
                      to="/onboarding"
                      className={`dual-sub-link ${isOnboardingTabActive('staff') ? 'active' : ''}`}
                    >
                      <span>Staff Directory</span>
                    </Link>
                    <Link
                      to="/onboarding?tab=roles"
                      className={`dual-sub-link ${isOnboardingTabActive('roles') ? 'active' : ''}`}
                    >
                      <span>Roles &amp; Permissions</span>
                    </Link>
                  </>
                )}
                {is('superadmin', 'admin') && !isAppDeveloper && (
                  <NavLink to="/settings/manager" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                    <span>Admin System Access</span>
                  </NavLink>
                )}

                {/* Store Operations & Billing Settings */}
                {!isAppDeveloper && (
                  <>
                    <div className="sub-section-header">Billing &amp; Store Ops</div>
                    <NavLink to="/settings/payment" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                      <span>Payment &amp; Tax</span>
                    </NavLink>
                    {is('superadmin', 'admin', 'manager', 'accountant') && (
                      <NavLink to="/settings/invoices" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                        <span>Invoices &amp; Bank Details</span>
                      </NavLink>
                    )}
                    {is('superadmin', 'admin', 'manager', 'cashier') && (
                      <NavLink to="/settings/pos" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                        <span>POS Thermal Receipts</span>
                      </NavLink>
                    )}
                    <NavLink to="/settings/notifications" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                      <span>Notifications</span>
                    </NavLink>
                  </>
                )}

                {/* Mobile Apps & Distribution */}
                <div className="sub-section-header">Mobile Ecosystem</div>
                <NavLink to="/settings/mobile-apps" className={({ isActive }) => `dual-sub-link ${isActive ? 'active' : ''}`}>
                  <span>Mobile Apps</span>
                </NavLink>
              </>
            )}

          </div>{/* end sub-panel-nav */}

        </div>
      )}{/* end sidebar-sub-panel */}

    </div>
  </div>
)
}
