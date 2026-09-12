import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

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
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4" style={{ maxWidth: '1560px' }}>
      {/* Top Header Section */}
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '2px' }}>
            Settings
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Settings
          </h1>
        </div>

        {/* Search Setting Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <i
            className="ri-search-line"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              fontSize: '15px',
              pointerEvents: 'none'
            }}
          ></i>
          <input
            type="text"
            placeholder="Search Setting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: searchQuery ? '36px' : '14px',
              paddingTop: '9px',
              paddingBottom: '9px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '13.5px',
              color: '#0F172A',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#143c2d'
              e.target.style.boxShadow = '0 0 0 3px rgba(20, 60, 45, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E2E8F0'
              e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <i className="ri-close-line" style={{ fontSize: '16px' }}></i>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Settings Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <div
              key={section.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '22px 24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '210px',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'
                e.currentTarget.style.borderColor = '#CBD5E1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)'
                e.currentTarget.style.borderColor = '#E5E7EB'
              }}
            >
              <div>
                {/* Card Title & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <i className={`${section.icon}`} style={{ fontSize: '16px', color: '#475569' }}></i>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {section.title}
                  </h3>
                </div>

                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                  {section.subtitle}
                </p>

                {/* Sub-links List */}
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px'
                  }}
                >
                  {section.items.map((item, idx) => (
                    <div key={idx}>
                      <Link
                        to={item.path}
                        style={{
                          color: '#8B1538',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-block',
                          transition: 'color 0.15s, transform 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#5C0D23'
                          e.target.style.transform = 'translateX(2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#8B1538'
                          e.target.style.transform = 'none'
                        }}
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
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px dashed #E2E8F0'
            }}
          >
            <i className="ri-search-2-line" style={{ fontSize: '32px', color: '#94A3B8', display: 'block', marginBottom: '8px' }}></i>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>
              No settings found matching "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#143c2d',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
