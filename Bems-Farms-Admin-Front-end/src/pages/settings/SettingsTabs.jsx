import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/settings/team', label: 'Team Onboarding' },
  { to: '/settings/staff', label: 'Staff Accounts' },
  { to: '/settings/roles', label: 'Roles & Permissions' },
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
  return (
    <>
      <div className="mb-5">
        <h4 className="fs-xl">Settings</h4>
        <p className="text-muted">Manage overall store preferences and system configurations.</p>
      </div>
      <ul className="nav nav-underline mb-5 border-bottom nav-primary" role="tablist">
        {TABS.map(t => (
          <li className="nav-item" role="presentation" key={t.to}>
            <NavLink to={t.to} className={({ isActive }) => `nav-link py-6px ${isActive ? 'active' : ''}`}>{t.label}</NavLink>
          </li>
        ))}
      </ul>
    </>
  )
}
