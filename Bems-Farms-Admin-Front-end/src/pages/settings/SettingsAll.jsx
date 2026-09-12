import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const SETTINGS_SECTIONS = [
  {
    id: 'store-profile',
    title: 'Store Profile & Branding',
    subtitle: 'Manage farm business profile, store locations, and receipt brand identity',
    icon: 'ri-store-2-line',
    items: [
      { name: 'General Store Info & Contact', path: '/settings/general' },
      { name: 'Store Locations & Branches', path: '/stores' },
      { name: 'Receipt & Invoice Templates', path: '/settings/invoices' },
      { name: 'Business Hours & Operations', path: '/settings/general' }
    ]
  },
  {
    id: 'pos-terminal',
    title: 'POS Terminal Settings',
    subtitle: 'Configure register terminals, barcode scanners, and cashier shift limits',
    icon: 'ri-computer-line',
    items: [
      { name: 'POS Hardware & Barcode Scanners', path: '/settings/pos' },
      { name: 'Cash Drawer Reconciliation & Float', path: '/settings/pos' },
      { name: 'Quick-Ringing Hotkeys & Presets', path: '/settings/pos' },
      { name: 'Offline Mode & Auto-Sync', path: '/settings/pos' }
    ]
  },
  {
    id: 'payment-gateways',
    title: 'Payment Methods & Gateways',
    subtitle: 'Manage Paystack, Monnify, Bank Transfers, and POS Card terminals',
    icon: 'ri-bank-card-line',
    items: [
      { name: 'Online Gateways (Paystack & Monnify)', path: '/settings/payment' },
      { name: 'POS Bank Card Terminals', path: '/settings/payment' },
      { name: 'Direct Bank Transfer Verification', path: '/settings/payment' },
      { name: 'Cash on Delivery Settings', path: '/settings/payment' }
    ]
  },
  {
    id: 'tax-pricing',
    title: 'Tax, VAT & Pricing',
    subtitle: 'Configure Value Added Tax (VAT), produce exemptions, and currency rates',
    icon: 'ri-percent-line',
    items: [
      { name: 'VAT & Tax Rates (7.5%)', path: '/settings/tax' },
      { name: 'Agricultural Produce Exemptions', path: '/settings/tax' },
      { name: 'Multi-Currency & FX Exchange Rates', path: '/settings/currencies' },
      { name: 'Dynamic & Tiered Pricing', path: '/settings/tax' }
    ]
  },
  {
    id: 'discounts-loyalty',
    title: 'Discounts & Loyalty Rewards',
    subtitle: 'Setup promotional vouchers, customer loyalty points, and bulk discounts',
    icon: 'ri-gift-line',
    items: [
      { name: 'Coupon & Promo Code Rules', path: '/settings/coupons' },
      { name: 'Customer Loyalty Points System', path: '/settings/coupons' },
      { name: 'Wholesale & Bulk Volume Discounts', path: '/settings/coupons' },
      { name: 'Seasonal Produce Deals', path: '/settings/coupons' }
    ]
  },
  {
    id: 'dispatch-logistics',
    title: 'Dispatch & Delivery Logistics',
    subtitle: 'Setup doorstep delivery zones, shipping fee tiers, and dispatch routes',
    icon: 'ri-truck-line',
    items: [
      { name: 'Delivery Zones & Neighborhoods', path: '/settings/pos' },
      { name: 'Shipping Fee Distance Calculator', path: '/settings/pos' },
      { name: 'Dispatch Rider Fleet Management', path: '/deliveries' },
      { name: 'Perishable Produce Packaging Rules', path: '/deliveries' }
    ]
  },
  {
    id: 'alerts-notifications',
    title: 'Alerts & Notifications',
    subtitle: 'Manage customer SMS updates, email receipts, and low-stock warnings',
    icon: 'ri-notification-3-line',
    items: [
      { name: 'SMS & WhatsApp Order Updates', path: '/settings/notifications' },
      { name: 'Automated Email Receipts', path: '/settings/notifications' },
      { name: 'Low Stock & Restock Threshold Alerts', path: '/settings/notifications' },
      { name: 'Daily Shift Sales Summaries', path: '/settings/notifications' }
    ]
  },
  {
    id: 'roles-approvals',
    title: 'Roles & Manager Approvals',
    subtitle: 'Manage staff permissions, shift void approvals, and security policies',
    icon: 'ri-shield-user-line',
    items: [
      { name: 'Role-Based Access Control (RBAC)', path: '/settings/manager' },
      { name: 'Cashier Void & Discount Overrides', path: '/settings/manager' },
      { name: 'Manager Security PINs', path: '/settings/manager' },
      { name: 'System Activity & Audit Logs', path: '/activity-logs' }
    ]
  },
  {
    id: 'chef-bems-ai',
    title: 'Chef Bems AI & Smart Inventory',
    subtitle: 'Configure culinary AI recommendations, shelf-life monitoring, and forecasting',
    icon: 'ri-robot-line',
    items: [
      { name: 'Chef Bems Culinary AI Engine', path: '/chef-bems' },
      { name: 'Smart Demand & Restock Forecasting', path: '/inventory' },
      { name: 'Perishable Produce Shelf-Life Tracking', path: '/inventory' },
      { name: 'Recipe & Grocery Pairing Rules', path: '/chef-bems' }
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
                  <i className={`${section.icon}`} style={{ fontSize: '16px', color: '#143c2d' }}></i>
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
