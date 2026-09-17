import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/settings/general', label: 'General', icon: 'ri-store-2-line' },
  { to: '/settings/pos', label: 'POS & Receipts', icon: 'ri-computer-line' },
  { to: '/settings/tax', label: 'Tax & VAT', icon: 'ri-percent-line' },
  { to: '/settings/coupons', label: 'Coupons & Promos', icon: 'ri-coupon-3-line' },
  { to: '/settings/currencies', label: 'Currencies', icon: 'ri-money-dollar-circle-line' },
  { to: '/settings/invoices', label: 'Invoices', icon: 'ri-file-text-line' },
  { to: '/settings/notifications', label: 'Notifications', icon: 'ri-notification-3-line' },
  { to: '/settings/manager', label: 'Manager Permissions', icon: 'ri-shield-user-line' },
]

export default function SettingsTabs() {
  const location = useLocation()

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="fs-20 fw-bold text-dark font-display mb-1">System &amp; Store Settings</h4>
          <p className="text-muted fs-13 mb-0">Manage business profile, checkout preferences, thermal receipts, and connected services.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-12 fw-medium d-flex align-items-center gap-1.5">
            <span className="badge-dot bg-success"></span> Production Live
          </span>
        </div>
      </div>

      <div className="border-bottom overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <ul className="nav nav-pills flex-nowrap gap-1 pb-2" role="tablist">
          {TABS.map((t) => {
            const isActive = location.pathname === t.to || location.pathname.startsWith(`${t.to}/`)

            return (
              <li className="nav-item flex-shrink-0" role="presentation" key={t.to}>
                <NavLink
                  to={t.to}
                  className={`nav-link py-2 px-3 fw-medium d-flex align-items-center gap-1.5 rounded-pill transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted bg-transparent hover-bg-light'
                  }`}
                  style={{ fontSize: 13 }}
                >
                  <i className={`${t.icon} ${isActive ? 'text-white' : 'text-primary'} fs-15`}></i>
                  {t.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
