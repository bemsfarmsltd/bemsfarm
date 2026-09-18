import CustomerIntelligence from './CustomerIntelligence'
import {CustomerChat} from './CustomerMessages'
import {useAuth} from '../../context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = n => `₦${Number(n || 0).toLocaleString()}`
const ini = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtPts = n => Number(n || 0).toLocaleString() + ' pts'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const fmtRelative = d => {
  if (!d) return 'Never'
  const date = new Date(d)
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'Just now'
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'Just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TIER_CFG = {
  Platinum: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', icon: 'ri-vip-crown-2-fill', next: null, nextPts: null },
  Gold:     { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: 'ri-medal-2-fill', next: 'Platinum', nextPts: 10000 },
  Silver:   { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1', icon: 'ri-award-fill', next: 'Gold', nextPts: 5000 },
  Bronze:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: 'ri-star-half-fill', next: 'Silver', nextPts: 1000 },
}

const ORDER_STATUS_CFG = {
  delivered:        { label: 'Delivered', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  processing:       { label: 'Processing', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  confirmed:        { label: 'Confirmed', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  pending:          { label: 'Pending', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  out_for_delivery: { label: 'Out for Delivery', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  cancelled:        { label: 'Cancelled', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

const AVATAR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#f97316']

export default function CustomerDetail() {
  const { id } = useParams()
  const {user: currentStaff} = useAuth()
  const canEngage = ['superadmin','admin','manager'].includes(currentStaff?.role)
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Delete modal state requiring admin password
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [adminPassword, setAdminPassword]     = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [deleting, setDeleting]               = useState(false)

  const fetchCustomer = useCallback(async () => {
    if (!id || id === 'null' || id === 'undefined') {
      setLoading(false)
      setCustomer(null)
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/admin/customers/${id}`)
      setCustomer(res.data)
      setNotesText(res.data.notes || '')
    } catch (err) {
      toast.error('Failed to load customer profile')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  async function handleToggleStatus() {
    if (!customer) return
    const newStatus = customer.status === 'active' ? 'inactive' : 'active'
    const target = (customer.id != null && String(customer.id) !== 'null') ? customer.id : (customer.customer_code && customer.customer_code !== 'null' ? customer.customer_code : customer.email)
    setTogglingStatus(true)
    try {
      await api.patch(`/admin/customers/${target}/status`, { status: newStatus })
      setCustomer(prev => ({ ...prev, status: newStatus }))
      toast.success(`Customer status changed to ${newStatus}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer status')
    } finally {
      setTogglingStatus(false)
    }
  }

  async function handleSaveNotes() {
    if (!customer) return
    const target = (customer.id != null && String(customer.id) !== 'null') ? customer.id : (customer.customer_code && customer.customer_code !== 'null' ? customer.customer_code : customer.email)
    setSavingNotes(true)
    try {
      await api.patch(`/admin/customers/${target}/notes`, { notes: notesText })
      setCustomer(prev => ({ ...prev, notes: notesText }))
      toast.success('Internal notes saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleDeleteCustomer(e) {
    if (e) e.preventDefault()
    if (!adminPassword.trim()) {
      toast.error('Please enter your administrator password to authorize deletion')
      return
    }
    setDeleting(true)
    try {
      const target = (customer.id != null && String(customer.id) !== 'null') ? customer.id : (customer.customer_code && customer.customer_code !== 'null' ? customer.customer_code : customer.email)
      await api.delete(`/admin/customers/${target}`, {
        data: { admin_password: adminPassword },
      })
      toast.success(`Customer ${customer.name} deleted successfully`)
      navigate('/customers')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mb-0">Loading deep customer insights…</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="alert alert-light border d-inline-block p-4">
          <i className="ri-user-unfollow-line d-block mb-2 text-muted" style={{ fontSize: 36 }} />
          <h5>Customer Not Found</h5>
          <p className="text-muted mb-3">The customer you are looking for does not exist or has been removed.</p>
          <Link to="/customers" className="btn btn-primary btn-sm">
            <i className="ri-arrow-left-line me-1" /> Back to Customers
          </Link>
        </div>
      </div>
    )
  }

  const orders = customer.orders || []
  const addresses = customer.addresses || []
  const activity = customer.activity || []
  const loyaltyHistory = customer.loyalty || []
  const walletHistory = customer.wallet_transactions || []
  const aiContext = customer.ai_context || {}

  const avatarColor = AVATAR_COLORS[(customer.id || 0) % AVATAR_COLORS.length]
  const tc = TIER_CFG[customer.tier] || TIER_CFG.Bronze
  const points = Number(customer.points || 0)
  const ptsToNext = tc.next ? Math.max(0, tc.nextPts - points) : 0
  const pctToNext = tc.next ? Math.min(100, (points / tc.nextPts) * 100) : 100

  // Format Nigerian phone for WhatsApp
  let waPhone = (customer.phone || '').replace(/[^0-9+]/g, '')
  if (waPhone.startsWith('0')) waPhone = '234' + waPhone.slice(1)
  if (waPhone.startsWith('+')) waPhone = waPhone.slice(1)

  const isRecentLogin = customer.last_login && (Date.now() - new Date(customer.last_login).getTime() < 86400000)

  const TABS = [
    ...(canEngage ? [{id:'intelligence',label:'Product interest',icon:'ri-bar-chart-line'},{id:'messages',label:'Support chat',icon:'ri-chat-3-line'}] : []),
    { id: 'orders',    label: 'Order History',       icon: 'ri-shopping-bag-3-line', count: orders.length },
    { id: 'addresses', label: 'Delivery Addresses',  icon: 'ri-map-pin-user-line',   count: addresses.length },
    { id: 'activity',  label: 'Logins & Activity',   icon: 'ri-pulse-line',          count: activity.length },
    { id: 'loyalty',   label: 'Wallet & Loyalty',    icon: 'ri-wallet-3-line',       count: null },
    { id: 'profile',   label: 'Profile & Notes',     icon: 'ri-file-user-line',      count: null },
  ]

  return (
    <div className="container-fluid pb-4">
      {/* ── Page Heading & Top Bar ── */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2 pt-2">
        <div className="d-flex align-items-center gap-3">
          <Link to="/customers" className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
            <i className="ri-arrow-left-line" />
          </Link>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold">{customer.name}</h5>
              <span className="badge rounded-pill font-monospace" style={{ fontSize: 11, background: '#f1f5f9', color: '#334155' }}>
                {customer.customer_code}
              </span>
              <span className="badge" style={{
                fontSize: 11,
                background: customer.status === 'active' ? '#dcfce7' : '#fee2e2',
                color: customer.status === 'active' ? '#15803d' : '#b91c1c',
                border: `1px solid ${customer.status === 'active' ? '#86efac' : '#fca5a5'}`
              }}>
                <i className={`ri-${customer.status === 'active' ? 'checkbox-circle-fill' : 'close-circle-fill'} me-1`} />
                {customer.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: 12 }}>
              Customer since {fmtDate(customer.joined_at || customer.created_at)}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className={`btn btn-sm ${customer.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} d-flex align-items-center gap-1`}
          >
            {togglingStatus ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <i className={`ri-${customer.status === 'active' ? 'user-unfollow-line' : 'user-follow-line'}`} />
            )}
            {customer.status === 'active' ? 'Deactivate Customer' : 'Activate Customer'}
          </button>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
              <i className="ri-phone-line" /> Call
            </a>
          )}
          {waPhone && (
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1">
              <i className="ri-whatsapp-line" /> WhatsApp
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <i className="ri-mail-line" /> Email
            </a>
          )}
          <button
            onClick={() => {
              setAdminPassword('')
              setShowPassword(false)
              setShowDeleteModal(true)
            }}
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            title="Permanently remove this customer"
          >
            <i className="ri-delete-bin-line" /> Delete Customer
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* ── LEFT COLUMN: Core Customer Profile & Metrics ── */}
        <div className="col-lg-4 col-xl-3">
          {/* Identity & Last Login Card */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-4 text-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white mx-auto mb-3 shadow-sm"
                style={{ width: 72, height: 72, background: avatarColor, fontSize: 24 }}
              >
                {ini(customer.name)}
              </div>
              <h6 className="fw-bold mb-1" style={{ fontSize: 18 }}>{customer.name}</h6>
              <div className="text-muted font-monospace mb-3" style={{ fontSize: 12 }}>
                {customer.customer_code}
              </div>

              {/* Prominent Last Login Box */}
              <div className="p-3 rounded-3 mb-3 text-start" style={{
                background: customer.last_login ? (isRecentLogin ? '#f0fdf4' : '#f8fafc') : '#fef2f2',
                border: `1px solid ${customer.last_login ? (isRecentLogin ? '#bbf7d0' : '#e2e8f0') : '#fecaca'}`
              }}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-muted fw-semibold" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="ri-history-line me-1" /> Last Platform Login
                  </span>
                  <span className="badge rounded-pill" style={{
                    fontSize: 10,
                    background: customer.last_login ? (isRecentLogin ? '#dcfce7' : '#f1f5f9') : '#fee2e2',
                    color: customer.last_login ? (isRecentLogin ? '#15803d' : '#475569') : '#b91c1c'
                  }}>
                    {customer.last_login ? (isRecentLogin ? 'Active recently' : 'Inactive recently') : 'Never Logged In'}
                  </span>
                </div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>
                  {fmtRelative(customer.last_login)}
                </div>
                {customer.last_login ? (
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    <i className="ri-time-line me-1" /> {fmtDateTime(customer.last_login)}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Customer has not signed into the web store or mobile app yet.
                  </div>
                )}
              </div>

              {/* Active Channel Box */}
              <div className="p-2.5 rounded-3 mb-3 text-start d-flex align-items-center justify-content-between" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11 }}>
                  <i className="ri-radar-line me-1 text-primary" /> Active Channel
                </span>
                {(() => {
                  const ch = (customer.last_channel || 'web').toLowerCase()
                  const isApp = ch === 'app' || ch === 'mobile'
                  const isPos = ch === 'pos'
                  return (
                    <span className={`badge d-inline-flex align-items-center gap-1 ${isApp ? 'bg-success-subtle text-success border border-success-subtle' : isPos ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-primary-subtle text-primary border border-primary-subtle'}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                      <i className={isApp ? 'ri-smartphone-line' : isPos ? 'ri-store-2-line' : 'ri-global-line'} />
                      {isApp ? 'Mobile App' : isPos ? 'Point of Sale' : 'Web Store'}
                    </span>
                  )
                })()}
              </div>

              {/* Tier and Points Progress */}
              <div className="p-3 rounded-3 mb-3 text-start" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge d-flex align-items-center gap-1"
                    style={{ fontSize: 11, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                    <i className={tc.icon} /> {customer.tier} Tier
                  </span>
                  <span className="fw-bold" style={{ fontSize: 12, color: tc.color }}>
                    {fmtPts(points)}
                  </span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pctToNext}%`, height: '100%', background: tc.color, borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <div className="d-flex justify-content-between text-muted mt-2" style={{ fontSize: 11 }}>
                  <span>Lifetime: {fmtPts(customer.lifetime_points)}</span>
                  {tc.next ? <span>{fmtPts(ptsToNext)} to {tc.next}</span> : <span className="text-success fw-medium">Max Tier</span>}
                </div>
              </div>

              {/* Primary Contact Details */}
              <div className="text-start border-top pt-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="ri-phone-line text-muted" style={{ fontSize: 15 }} />
                  <span style={{ fontSize: 13 }}>{customer.phone || 'No phone recorded'}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="ri-mail-line text-muted" style={{ fontSize: 15 }} />
                  <span className="text-truncate" style={{ fontSize: 13 }}>{customer.email || 'No email recorded'}</span>
                </div>
                <div className="d-flex align-items-start gap-2 mb-1">
                  <i className="ri-map-pin-line text-muted mt-1" style={{ fontSize: 15 }} />
                  <span style={{ fontSize: 13 }}>{customer.address || customer.zone || 'No address configured'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white border-bottom py-2">
              <span className="fw-semibold" style={{ fontSize: 12 }}>CUSTOMER VALUE</span>
            </div>
            <div className="card-body p-3">
              <div className="row g-2">
                <div className="col-6">
                  <div className="p-2 rounded" style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
                    <div className="text-muted" style={{ fontSize: 10 }}>TOTAL ORDERS</div>
                    <div className="fw-bold text-primary" style={{ fontSize: 16 }}>{customer.total_orders || orders.length || 0}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 rounded" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                    <div className="text-muted" style={{ fontSize: 10 }}>TOTAL SPENT</div>
                    <div className="fw-bold text-success" style={{ fontSize: 14 }}>{fmt(customer.total_spent)}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 rounded" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <div className="text-muted" style={{ fontSize: 10 }}>WALLET BALANCE</div>
                    <div className="fw-bold" style={{ fontSize: 14, color: '#b45309' }}>{fmt(customer.wallet_balance)}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 rounded" style={{ background: '#f5f3ff', border: '1px solid #ede9fe' }}>
                    <div className="text-muted" style={{ fontSize: 10 }}>LOYALTY POINTS</div>
                    <div className="fw-bold" style={{ fontSize: 14, color: '#7c3aed' }}>{fmtPts(points)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Deep Information Tabs ── */}
        <div className="col-lg-8 col-xl-9">
          <div className="card border-0 shadow-sm">
            {/* Tab Navigation */}
            <div className="card-header bg-white border-bottom p-0">
              <ul className="nav nav-tabs card-header-tabs m-0 px-3" style={{ borderBottom: 'none' }}>
                {TABS.map(t => (
                  <li key={t.id} className="nav-item">
                    <button
                      onClick={() => setActiveTab(t.id)}
                      className={`nav-link d-flex align-items-center gap-2 py-3 px-3 ${activeTab === t.id ? 'active fw-bold' : 'text-muted'}`}
                      style={{
                        fontSize: 13,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        color: activeTab === t.id ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === t.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
                        borderRadius: 0,
                      }}
                    >
                      <i className={t.icon} style={{ fontSize: 15 }} />
                      <span>{t.label}</span>
                      {t.count !== null && (
                        <span className="badge rounded-pill" style={{
                          fontSize: 10,
                          background: activeTab === t.id ? '#eff6ff' : '#f1f5f9',
                          color: activeTab === t.id ? '#2563eb' : '#64748b'
                        }}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tab Contents */}
            <div className="card-body p-0">
              {/* ──────────────── TAB 1: ORDER HISTORY ──────────────── */}
              {canEngage && activeTab === 'intelligence' && <CustomerIntelligence customerId={customer.id} />}
              {canEngage && activeTab === 'messages' && <><Link className="btn btn-outline-primary mb-3" to={`/customers/broadcasts?customer=${customer.id}`}>Create personal announcement</Link><CustomerChat customerId={customer.id}/></>}
              {activeTab === 'orders' && (
                <div>
                  <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                      <span className="fw-semibold text-dark" style={{ fontSize: 13 }}>
                        All Orders ({orders.length})
                      </span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        Total Value: <strong>{fmt(orders.reduce((sum, o) => sum + Number(o.total || 0), 0))}</strong>
                      </span>
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="ri-shopping-basket-line d-block mb-2" style={{ fontSize: 36 }} />
                      <h6>No orders found</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>This customer hasn't placed any orders yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                        <thead style={{ background: '#f8fafc' }}>
                          <tr>
                            <th className="px-3 py-2 fw-medium text-muted">ORDER ID</th>
                            <th className="px-3 py-2 fw-medium text-muted">DATE</th>
                            <th className="px-3 py-2 fw-medium text-muted">CHANNEL</th>
                            <th className="px-3 py-2 fw-medium text-muted">ITEMS PURCHASED</th>
                            <th className="px-3 py-2 fw-medium text-muted">PAYMENT</th>
                            <th className="px-3 py-2 fw-medium text-muted">STATUS</th>
                            <th className="px-3 py-2 fw-medium text-muted text-end">TOTAL</th>
                            <th className="px-3 py-2 fw-medium text-muted text-center">ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => {
                            const sc = ORDER_STATUS_CFG[o.status] || ORDER_STATUS_CFG.delivered
                            const ch = (o.channel || 'web').toLowerCase()
                            const isApp = ch.includes('app') || ch.includes('mobile')
                            const isPos = ch.includes('pos') || ch.includes('store')
                            return (
                              <tr key={o.id}>
                                <td className="px-3 py-3">
                                  <Link to={`/orders/${o.id}`} className="fw-bold font-monospace text-primary text-decoration-none">
                                    #{o.id}
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-nowrap text-muted" style={{ fontSize: 12 }}>
                                  {fmtDateTime(o.created_at)}
                                </td>
                                <td className="px-3 py-3 text-nowrap">
                                  <span className="badge d-inline-flex align-items-center gap-1 shadow-xs"
                                    style={{
                                      fontSize: 11,
                                      background: isApp ? '#ecfdf5' : isPos ? '#fffbeb' : '#eff6ff',
                                      color: isApp ? '#059669' : isPos ? '#d97706' : '#2563eb',
                                      border: `1px solid ${isApp ? '#a7f3d0' : isPos ? '#fde68a' : '#bfdbfe'}`,
                                      padding: '3px 7px',
                                      borderRadius: 6
                                    }}>
                                    <i className={isApp ? 'ri-smartphone-line' : isPos ? 'ri-store-2-line' : 'ri-global-line'} style={{ fontSize: 11 }} />
                                    <span>{isApp ? 'App' : isPos ? 'POS' : 'Web'}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-3" style={{ maxWidth: 280 }}>
                                  <div className="text-truncate fw-medium" title={o.items_summary}>
                                    {o.items_summary || `${o.items_count || 1} item(s)`}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-nowrap">
                                  <span className="badge bg-light text-dark border" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                                    {o.payment_method || 'Standard'}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-nowrap">
                                  <span className="badge" style={{ fontSize: 11, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                    {sc.label}
                                  </span>
                                  {o.delivery_status && (
                                    <span className="badge bg-light text-muted border ms-1" style={{ fontSize: 10 }}>
                                      {o.delivery_status}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3 fw-bold text-success text-end">
                                  {fmt(o.total)}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Link to={`/orders/${o.id}`} className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ fontSize: 11 }}>
                                    View <i className="ri-arrow-right-s-line" />
                                  </Link>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── TAB 2: SAVED ADDRESSES ──────────────── */}
              {activeTab === 'addresses' && (
                <div className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <h6 className="fw-bold mb-0">Customer Delivery Address Book</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                        Saved delivery destinations configured by the customer for checkout.
                      </p>
                    </div>
                    <span className="badge bg-light text-dark border">
                      {addresses.length} saved address{addresses.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light">
                      <i className="ri-map-pin-line text-muted d-block mb-2" style={{ fontSize: 36 }} />
                      <h6 className="fw-medium text-dark">No saved delivery addresses found</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                        {customer.address ? `Profile Address: "${customer.address}"` : 'Customer has not added any addresses yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {addresses.map(a => (
                        <div key={a.id} className="col-md-6">
                          <div className="p-3 rounded-3 border h-100 position-relative shadow-sm" style={{ background: a.is_default ? '#f0fdf4' : '#ffffff', borderColor: a.is_default ? '#86efac' : '#e2e8f0' }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="badge bg-secondary" style={{ fontSize: 11 }}>
                                <i className="ri-home-4-line me-1" />{a.label || 'Home'}
                              </span>
                              {a.is_default && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: 10 }}>
                                  Default Delivery Address
                                </span>
                              )}
                            </div>
                            <div className="fw-bold mb-1" style={{ fontSize: 14 }}>
                              {a.receiver_name || customer.name}
                            </div>
                            <div className="text-muted mb-2" style={{ fontSize: 12 }}>
                              <i className="ri-phone-line me-1" />{a.receiver_phone || customer.phone || 'No recipient phone'}
                            </div>
                            <div className="p-2 rounded bg-light border text-dark mb-2" style={{ fontSize: 12, lineHeight: 1.5 }}>
                              <i className="ri-map-pin-2-fill text-danger me-1" />
                              {a.street_address}
                              {(a.city || a.state) && `, ${[a.city, a.state].filter(Boolean).join(', ')}`}
                            </div>
                            <div className="text-muted" style={{ fontSize: 10 }}>
                              Added on {fmtDate(a.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── TAB 3: LOGINS & PLATFORM ACTIVITY ──────────────── */}
              {activeTab === 'activity' && (
                <div className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <h6 className="fw-bold mb-0">Platform Activity & Security Audit</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                        Chronological audit trail of customer logins, actions, and security events.
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-dark border">
                        <i className="ri-shield-keyhole-line me-1" /> {activity.length} Recorded Events
                      </span>
                    </div>
                  </div>

                  {/* Highlight of Last Login at top */}
                  <div className="p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, background: '#eff6ff', color: '#2563eb' }}>
                        <i className="ri-login-circle-line" style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>Latest Authentication Session</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {customer.last_login ? `${fmtDateTime(customer.last_login)} (${fmtRelative(customer.last_login)})` : 'No login recorded yet'}
                        </div>
                      </div>
                    </div>
                    {customer.last_login && (
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                        <i className="ri-check-line me-1" /> Session Verified
                      </span>
                    )}
                  </div>

                  {activity.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light">
                      <i className="ri-pulse-line text-muted d-block mb-2" style={{ fontSize: 36 }} />
                      <h6 className="fw-medium text-dark">No activity records logged yet</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                        Customer activity such as logins, cart interactions, and profile updates will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="position-relative ps-3" style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 15 }}>
                      {activity.map(act => {
                        const isLogin = act.type?.toLowerCase().includes('login') || act.type?.toLowerCase().includes('auth')
                        const isOrder = act.type?.toLowerCase().includes('order')
                        return (
                          <div key={act.id} className="position-relative mb-4 pb-2">
                            {/* Dot */}
                            <div
                              className="position-absolute rounded-circle shadow-sm"
                              style={{
                                width: 14,
                                height: 14,
                                left: -24,
                                top: 4,
                                background: isLogin ? '#2563eb' : isOrder ? '#16a34a' : '#64748b',
                                border: '2px solid #fff'
                              }}
                            />
                            <div className="card border-0 shadow-sm p-3" style={{ background: '#f8fafc' }}>
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge ${isLogin ? 'bg-primary-subtle text-primary' : isOrder ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: 11 }}>
                                    {act.type}
                                  </span>
                                  {act.channel && (
                                    <span className="badge d-inline-flex align-items-center gap-1" style={{
                                      fontSize: 10,
                                      background: act.channel === 'app' ? '#ecfdf5' : act.channel === 'pos' ? '#fffbeb' : '#eff6ff',
                                      color: act.channel === 'app' ? '#059669' : act.channel === 'pos' ? '#d97706' : '#2563eb',
                                      border: `1px solid ${act.channel === 'app' ? '#a7f3d0' : act.channel === 'pos' ? '#fde68a' : '#bfdbfe'}`
                                    }}>
                                      <i className={act.channel === 'app' ? 'ri-smartphone-line' : act.channel === 'pos' ? 'ri-store-2-line' : 'ri-global-line'} />
                                      {act.channel === 'app' ? 'Mobile App' : act.channel === 'pos' ? 'POS' : 'Web'}
                                    </span>
                                  )}
                                  {act.entity_type && (
                                    <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>
                                      {act.entity_type} {act.entity_id ? `#${act.entity_id}` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted" style={{ fontSize: 11 }}>
                                  <i className="ri-time-line me-1" />{fmtDateTime(act.created_at)} ({fmtRelative(act.created_at)})
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── TAB 4: WALLET & LOYALTY ──────────────── */}
              {activeTab === 'loyalty' && (
                <div className="p-4">
                  {/* Summary row */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="p-3 rounded-3 border bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted" style={{ fontSize: 11 }}>CUSTOMER WALLET</span>
                          <i className="ri-wallet-3-line text-warning" style={{ fontSize: 20 }} />
                        </div>
                        <div className="fw-bold" style={{ fontSize: 22, color: '#b45309' }}>
                          {fmt(customer.wallet_balance)}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          Stored credits applicable at POS or Online checkout
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 rounded-3 border bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted" style={{ fontSize: 11 }}>LOYALTY POINTS</span>
                          <i className={tc.icon} style={{ fontSize: 20, color: tc.color }} />
                        </div>
                        <div className="fw-bold" style={{ fontSize: 22, color: tc.color }}>
                          {fmtPts(points)}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {customer.tier} Tier · {fmtPts(customer.lifetime_points)} Lifetime earned
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Ledger */}
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2">Wallet Transactions</h6>
                    {walletHistory.length === 0 ? (
                      <div className="p-3 text-center text-muted border rounded bg-light" style={{ fontSize: 12 }}>
                        No wallet transactions on record.
                      </div>
                    ) : (
                      <div className="table-responsive border rounded">
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: 12 }}>
                          <thead className="table-light">
                            <tr>
                              <th className="px-3 py-2">DATE</th>
                              <th className="px-3 py-2">CHANNEL</th>
                              <th className="px-3 py-2">TYPE</th>
                              <th className="px-3 py-2">NOTE</th>
                              <th className="px-3 py-2 text-end">AMOUNT</th>
                              <th className="px-3 py-2 text-end">BALANCE AFTER</th>
                            </tr>
                          </thead>
                          <tbody>
                            {walletHistory.map(w => {
                              const ch = (w.channel || 'web').toLowerCase()
                              const isApp = ch === 'app' || ch === 'mobile'
                              const isPos = ch === 'pos'
                              const isAdmin = ch === 'admin'
                              return (
                                <tr key={w.id}>
                                  <td className="px-3 py-2 text-muted">{fmtDateTime(w.created_at)}</td>
                                  <td className="px-3 py-2 text-nowrap">
                                    <span className="badge d-inline-flex align-items-center gap-1 shadow-xs"
                                      style={{
                                        fontSize: 10,
                                        background: isApp ? '#ecfdf5' : isPos ? '#fffbeb' : isAdmin ? '#f8fafc' : '#eff6ff',
                                        color: isApp ? '#059669' : isPos ? '#d97706' : isAdmin ? '#475569' : '#2563eb',
                                        border: `1px solid ${isApp ? '#a7f3d0' : isPos ? '#fde68a' : isAdmin ? '#e2e8f0' : '#bfdbfe'}`,
                                        padding: '3px 6px',
                                        borderRadius: 4
                                      }}>
                                      <i className={isApp ? 'ri-smartphone-line' : isPos ? 'ri-store-2-line' : isAdmin ? 'ri-shield-user-line' : 'ri-global-line'} />
                                      {isApp ? 'App' : isPos ? 'POS' : isAdmin ? 'Admin' : 'Web'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-capitalize">
                                    <span className={`badge ${w.type === 'credit' || w.type === 'top_up' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                      {w.type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{w.note || '—'}</td>
                                  <td className={`px-3 py-2 text-end fw-bold ${w.type === 'credit' || w.type === 'top_up' ? 'text-success' : 'text-danger'}`}>
                                    {w.type === 'credit' || w.type === 'top_up' ? '+' : '-'}{fmt(w.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-end fw-medium">{fmt(w.balance_after)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Loyalty Points History */}
                  <div>
                    <h6 className="fw-bold mb-2">Points Ledger</h6>
                    {loyaltyHistory.length === 0 ? (
                      <div className="p-3 text-center text-muted border rounded bg-light" style={{ fontSize: 12 }}>
                        No loyalty points activity recorded yet.
                      </div>
                    ) : (
                      <div className="table-responsive border rounded">
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: 12 }}>
                          <thead className="table-light">
                            <tr>
                              <th className="px-3 py-2">DATE</th>
                              <th className="px-3 py-2">CHANNEL</th>
                              <th className="px-3 py-2">EVENT / DESCRIPTION</th>
                              <th className="px-3 py-2 text-end">POINTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loyaltyHistory.map((p, idx) => {
                              const ch = (p.channel || 'web').toLowerCase()
                              const isApp = ch === 'app' || ch === 'mobile'
                              const isPos = ch === 'pos'
                              return (
                                <tr key={p.id || idx}>
                                  <td className="px-3 py-2 text-muted">{fmtDateTime(p.created_at)}</td>
                                  <td className="px-3 py-2 text-nowrap">
                                    <span className="badge d-inline-flex align-items-center gap-1 shadow-xs"
                                      style={{
                                        fontSize: 10,
                                        background: isApp ? '#ecfdf5' : isPos ? '#fffbeb' : '#eff6ff',
                                        color: isApp ? '#059669' : isPos ? '#d97706' : '#2563eb',
                                        border: `1px solid ${isApp ? '#a7f3d0' : isPos ? '#fde68a' : '#bfdbfe'}`,
                                        padding: '3px 6px',
                                        borderRadius: 4
                                      }}>
                                      <i className={isApp ? 'ri-smartphone-line' : isPos ? 'ri-store-2-line' : 'ri-global-line'} />
                                      {isApp ? 'App' : isPos ? 'POS' : 'Web'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{p.description || p.type}</td>
                                  <td className={`px-3 py-2 text-end fw-bold ${Number(p.points) > 0 ? 'text-success' : 'text-danger'}`}>
                                    {Number(p.points) > 0 ? '+' : ''}{Number(p.points).toLocaleString()} pts
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── TAB 5: PROFILE, CONTEXT & NOTES ──────────────── */}
              {activeTab === 'profile' && (
                <div className="p-4">
                  {/* Internal Staff Notes */}
                  <div className="card border-0 shadow-sm p-3 mb-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-dark" style={{ fontSize: 13 }}>
                        <i className="ri-sticky-note-line text-warning me-1" /> Customer Notes (Internal Admin Only)
                      </span>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                      >
                        {savingNotes ? <span className="spinner-border spinner-border-sm" /> : <i className="ri-save-line" />}
                        Save Notes
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Add important details, delivery preferences, or relationship history for this customer..."
                      value={notesText}
                      onChange={e => setNotesText(e.target.value)}
                      style={{ fontSize: 13, background: '#ffffff' }}
                    />
                    <small className="text-muted mt-1" style={{ fontSize: 11 }}>
                      These notes are visible to admin, cashiers, and managers and are never shown to the customer.
                    </small>
                  </div>

                  {/* Account Context & Preferences */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light h-100">
                        <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}>Account & Security Details</h6>
                        <div className="d-flex flex-column gap-2" style={{ fontSize: 12 }}>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">User ID:</span>
                            <span className="font-monospace fw-medium">{customer.id}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Customer Code:</span>
                            <span className="font-monospace fw-medium text-primary">{customer.customer_code}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Email Verified:</span>
                            <span className={`badge ${customer.email_verified ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                              {customer.email_verified ? 'Verified ✓' : 'Unverified'}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Account Registered:</span>
                            <span>{fmtDateTime(customer.joined_at || customer.created_at)}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Last Active Login:</span>
                            <span className="fw-semibold text-dark">{customer.last_login ? fmtDateTime(customer.last_login) : 'Never'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light h-100">
                        <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}>Preferences & Regional Context</h6>
                        <div className="d-flex flex-column gap-2" style={{ fontSize: 12 }}>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Preferred Language:</span>
                            <span className="text-uppercase fw-medium">{aiContext.preferred_language || 'EN'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Currency:</span>
                            <span className="fw-medium">{aiContext.preferred_currency || 'NGN (₦)'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Timezone:</span>
                            <span>{aiContext.timezone || 'Africa/Lagos (GMT+1)'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Saved Zone / City:</span>
                            <span>{customer.zone || customer.address || '—'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Account State:</span>
                            <span className={`badge ${customer.status === 'active' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                              {customer.status === 'active' ? 'Active / Permitted' : 'Suspended / Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DELETE / REMOVE MODAL WITH ADMIN PASSWORD AUTHORIZATION */}
      {showDeleteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { if (!deleting) setShowDeleteModal(false) }}
        >
          <div
            style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 25px 70px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: '#dc2626', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="d-flex align-items-center gap-2 text-white">
                <i className="ri-shield-keyhole-line" style={{ fontSize: 20 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Security Authorization Required</span>
              </div>
              <button className="btn-close btn-close-white btn-sm" disabled={deleting} onClick={() => setShowDeleteModal(false)} />
            </div>

            <form onSubmit={handleDeleteCustomer} className="p-4 text-start">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: '#fee2e2' }}
                >
                  <i className="ri-delete-bin-2-line" style={{ color: '#dc2626', fontSize: 22 }} />
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: 16 }}>Delete {customer.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {customer.customer_code} · {customer.email || customer.phone || 'No direct contact'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded mb-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
                  <strong className="d-block mb-1">
                    <i className="ri-error-warning-line me-1" />
                    Warning: Irreversible Action
                  </strong>
                  Deleting this customer account will remove their personal profile, delivery addresses, and revoke all active login sessions immediately. Historical financial reporting will be preserved.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: 12 }}>
                  Enter Your Administrator Password to Confirm:
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="ri-lock-password-line" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    autoFocus
                    required
                    onChange={e => setAdminPassword(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
                <div className="form-text" style={{ fontSize: 11 }}>
                  Your current login password is used to verify you have authorization to delete records.
                </div>
              </div>

              <div className="d-flex gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-fill"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger flex-fill d-flex align-items-center justify-content-center gap-1"
                  disabled={deleting || !adminPassword.trim()}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Verifying &amp; Deleting…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-delete-bin-line" />
                      <span>Verify &amp; Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
