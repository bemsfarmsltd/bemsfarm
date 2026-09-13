import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  {
    to: '/settings/team',
    label: 'Staff & Team',
    matches: ['/settings/team', '/settings/staff', '/settings/roles', '/settings/onboarding'],
  },
  { to: '/settings/general', label: 'General' },
  { to: '/settings/pos', label: 'POS' },
  { to: '/settings/payment', label: 'Payment Gateway' },
  { to: '/settings/tax', label: 'Tax' },
  { to: '/settings/coupons', label: 'Coupons' },
  { to: '/settings/currencies', label: 'Currencies' },
  { to: '/settings/invoices', label: 'Invoices' },
  { to: '/settings/manager', label: 'Manager' },
]

export default function SettingsTabs() {
  const location = useLocation()

  return (
    <>
      <div className="mb-4">
        <h4 className="fs-xl fw-bold text-dark font-display mb-1">Settings</h4>
        <p className="text-muted fs-sm mb-0">Manage overall store preferences and system configurations.</p>
      </div>
      <ul className="nav nav-underline mb-4 border-bottom nav-primary" role="tablist">
        {TABS.map((t) => {
          const isActive = t.matches
            ? t.matches.some((m) => location.pathname.startsWith(m))
            : location.pathname === t.to

          return (
            <li className="nav-item" role="presentation" key={t.to}>
              <NavLink
                to={t.to}
                className={`nav-link py-2 px-3 fw-semibold ${isActive ? 'active text-primary' : 'text-muted'}`}
              >
                {t.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </>
  )
}
