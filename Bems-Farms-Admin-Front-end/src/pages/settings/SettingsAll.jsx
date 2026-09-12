import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const SETTINGS_SECTIONS = [
  {
    id: 'preferences',
    title: 'Preferences',
    subtitle: 'Customize the interface of your brand',
    icon: 'ri-equalizer-line',
    items: [
      { name: 'Branding', path: '/settings/general' },
      { name: 'Email Template', path: '/settings/notifications' },
      { name: 'Invoice Template', path: '/settings/invoices' },
      { name: 'Subscription', path: '/settings/general' },
      { name: 'User Authentication', path: '/settings/manager' }
    ]
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    subtitle: 'Manage Payment Methods for your Services',
    icon: 'ri-bank-card-line',
    items: [
      { name: 'Payment Methods', path: '/settings/payment' }
    ]
  },
  {
    id: 'configuration',
    title: 'Configuration',
    subtitle: 'Setup API Keys & Webhooks and Manage Notifications',
    icon: 'ri-sound-module-line',
    items: [
      { name: 'API Keys & Webhooks', path: '/settings/general' },
      { name: 'OTP', path: '/settings/notifications' },
      { name: 'Notifications', path: '/settings/notifications' },
      { name: 'IP Whitelisting', path: '/settings/manager' }
    ]
  },
  {
    id: 'business-settings',
    title: 'Business Settings',
    subtitle: 'Setup your Business',
    icon: 'ri-store-2-line',
    items: [
      { name: 'Settlement & Scheduling', path: '/settings/pos' },
      { name: 'Settlement Accounts', path: '/settings/payment' },
      { name: 'Pricing', path: '/settings/tax' },
      { name: 'Virtual Accounts', path: '/settings/payment' },
      { name: 'Service Charge', path: '/settings/pos' },
      { name: 'Wallet Currencies', path: '/settings/currencies' }
    ]
  },
  {
    id: 'funds-transfer',
    title: 'Funds Transfer',
    subtitle: 'Set transfer limits',
    icon: 'ri-exchange-dollar-line',
    items: [
      { name: 'Limit Settings', path: '/settings/pos' },
      { name: 'Transfer Settings', path: '/settings/payment' }
    ]
  },
  {
    id: 'rewards-settings',
    title: 'Rewards Settings',
    subtitle: 'Customize your Rewards',
    icon: 'ri-gift-line',
    items: [
      { name: 'Reward System', path: '/settings/coupons' },
      { name: 'Reward Categories', path: '/settings/coupons' },
      { name: 'Reward on Product', path: '/settings/coupons' }
    ]
  },
  {
    id: 'commerce-settings',
    title: 'Commerce Settings',
    subtitle: 'Setup your Store Front',
    icon: 'ri-shopping-basket-line',
    items: [
      { name: 'Customize Store front', path: '/settings/general' },
      { name: 'Delivery Settings', path: '/settings/pos' },
      { name: 'Product Categories', path: '/products/categories' }
    ]
  },
  {
    id: 'payroll-settings',
    title: 'Payroll Settings',
    subtitle: 'Setup your payroll settings',
    icon: 'ri-money-dollar-circle-line',
    items: [
      { name: 'Payroll Activities', path: '/staff/payroll' },
      { name: 'Notifications', path: '/settings/notifications' },
      { name: 'Role', path: '/settings/manager' },
      { name: 'Allowance', path: '/settings/manager' },
      { name: 'Deductions', path: '/settings/tax' },
      { name: 'Reimbursement', path: '/staff/payroll' }
    ]
  },
  {
    id: 'feature-flag',
    title: 'Feature Flag',
    subtitle: 'Disable Features you do not want to see on the portal',
    icon: 'ri-flag-line',
    items: [
      { name: 'Features', path: '/settings/pos' },
      { name: 'Request History', path: '/activity-logs' }
    ]
  }
]

export default function SettingsAll() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const navigate = useNavigate()

  // Filter sections and items based on search input
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_SECTIONS

    const query = searchQuery.toLowerCase().trim()
    return SETTINGS_SECTIONS.map(section => {
      const sectionMatches = section.title.toLowerCase().includes(query) || section.subtitle.toLowerCase().includes(query)
      const matchingItems = section.items.filter(item => item.name.toLowerCase().includes(query))

      if (sectionMatches || matchingItems.length > 0) {
        return {
          ...section,
          items: sectionMatches ? section.items : matchingItems
        }
      }
      return null
    }).filter(Boolean)
  }, [searchQuery])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Settings
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
        </div>

        {/* Search Setting Bar */}
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
          <input
            type="text"
            placeholder="Search Setting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <i className="ri-close-line"></i>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Card Title & Icon */}
                <div className="flex items-start gap-3 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0 mt-0.5">
                    <i className={`${section.icon} text-base text-slate-600`}></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {section.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                {/* Sub-links List */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                  {section.items.map((item, idx) => (
                    <div key={idx}>
                      <Link
                        to={item.path}
                        className="inline-block text-[13.5px] font-semibold text-[#8B1538] hover:text-[#5c0d23] hover:translate-x-0.5 transition-all"
                      >
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <i className="ri-search-2-line text-3xl text-slate-300 mb-2 block"></i>
            <p className="text-sm font-semibold text-slate-600">No settings found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Business Account */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-red-200/90 shadow-sm mt-10">
        <div className="flex items-start gap-3.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
            <i className="ri-delete-bin-7-line text-lg"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Delete Business Account
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Permanently remove this business account and all of its contents. This action is not reversible, so please continue with caution.
            </p>
          </div>
        </div>

        <div className="mt-5 sm:pl-[46px]">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-[0.98] inline-flex items-center gap-2"
          >
            <i className="ri-delete-bin-line"></i>
            Delete Business Account
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Safety */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
              <i className="ri-error-warning-fill"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Are you absolutely sure?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              This will permanently delete the store catalog, transactional history, customer wallets, and configurations. This action cannot be undone.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <span className="font-mono text-red-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  alert('For enterprise security and data integrity, business account deletion requires direct SuperAdmin OTP confirmation.')
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
