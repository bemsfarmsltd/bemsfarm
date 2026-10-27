import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',    label: 'All Activity',     icon: '📋' },
  { id: 'orders', label: 'Orders & Payments', icon: '🛍️' },
  { id: 'staff',  label: 'Staff & Admin',    icon: '👤' },
  { id: 'auth',   label: 'Security & Logins',icon: '🔐' },
  { id: 'system', label: 'System & Settings',icon: '⚙️' },
]

function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000)  return `${Math.max(1, Math.floor(diff / 1000))}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function parseDevice(ua) {
  if (!ua) return { label: 'Web Admin', icon: '💻' }
  if (/BemsFarmsMobile/i.test(ua)) return { label: 'Customer App', icon: '📱' }
  if (/BemsFarmsDriver/i.test(ua)) return { label: 'Driver App', icon: '🛵' }
  if (/iPhone|iPad/i.test(ua)) return { label: 'iOS Mobile', icon: '📱' }
  if (/Android/i.test(ua)) return { label: 'Android', icon: '📱' }
  if (/Macintosh|Mac OS/i.test(ua)) return { label: 'macOS', icon: '💻' }
  if (/Windows/i.test(ua)) return { label: 'Windows PC', icon: '🖥️' }
  if (/Linux/i.test(ua)) return { label: 'Linux Server', icon: '🐧' }
  return { label: 'Browser', icon: '🌐' }
}

function parseLocation(event) {
  if (!event) return { flag: '🌐', display: '—' }
  const locObj = event.details?.location
  if (locObj && typeof locObj === 'object') {
    const flag = locObj.flag || (locObj.country_code === 'NG' ? '🇳🇬' : '📍')
    const display = locObj.display || `${locObj.city ? locObj.city + ', ' : ''}${locObj.country || ''}`
    if (display) return { flag, display }
  }
  if (event.location && !event.location.includes('Detecting')) {
    return { flag: '🇳🇬', display: event.location }
  }
  return { flag: '📍', display: 'Online Session' }
}

// ─── Human Plain English Narrative ───────────────────────────────────────────
export function getHumanNarrative(e) {
  if (!e) return { title: 'System Event', story: 'System operation recorded', icon: '⚡' }

  const actor = e.actor_name || e.details?.author_name || e.details?.user_name || (e.actor_id ? `User #${e.actor_id}` : 'System')
  const action = (e.action || '').trim()
  const details = e.details || {}
  const isSuccess = e.outcome === 'success' || e.outcome === 'committed'

  // Notifications
  if (action.startsWith('NOTIF_')) {
    const notifType = action.replace('NOTIF_', '').toLowerCase().replace(/_/g, ' ')
    return {
      title: details.title || `System Alert: ${notifType}`,
      story: details.message || `Automated dispatch notification sent.`,
      icon: '🔔'
    }
  }

  // Deployments & Releases
  if (action === 'deploy' || e.source === 'deployment') {
    return {
      title: 'Production Code Deployed',
      story: `Automated server deployment completed successfully.`,
      icon: '🚀'
    }
  }

  // Authentication & Logins
  if (action === 'LOGIN_SUCCESS' || action === 'POST /api/auth/login' || action === 'POST /api/driver/auth/login') {
    if (isSuccess) {
      return {
        title: 'User Signed In',
        story: `${actor} (${e.actor_role || 'Staff'}) logged into the platform.`,
        icon: '🔐'
      }
    }
    return {
      title: 'Failed Sign-In Attempt',
      story: `Incorrect credentials submitted for ${details.email || actor}.`,
      icon: '⚠️'
    }
  }

  if (action.includes('logout')) {
    return {
      title: 'Signed Out',
      story: `${actor} closed their session.`,
      icon: '🚪'
    }
  }

  if (action.includes('password')) {
    return {
      title: 'Password Changed / Reset',
      story: `${actor} updated security password credentials.`,
      icon: '🔑'
    }
  }

  if (action.includes('register') || action.includes('signup')) {
    return {
      title: 'New Account Registered',
      story: `${actor} created a new customer account.`,
      icon: '🎉'
    }
  }

  // Orders & Purchases
  if (action.includes('order') || e.entity_type === 'order') {
    const orderId = e.entity_id || details.order_id || details.body?.order_id || ''
    if (action.includes('POST') || action === 'insert') {
      return {
        title: `New Order Placed ${orderId ? `#${orderId}` : ''}`,
        story: `${actor} created a new order for fulfillment.`,
        icon: '🛍️'
      }
    }
    if (action.includes('status') || action === 'update') {
      const status = details.status || details.body?.status || ''
      return {
        title: `Order Updated ${orderId ? `#${orderId}` : ''}`,
        story: `${actor} updated order ${orderId ? `#${orderId}` : ''}${status ? ` to status "${status}"` : ''}.`,
        icon: '📦'
      }
    }
    return {
      title: `Order Action ${orderId ? `#${orderId}` : ''}`,
      story: `${actor} updated order record details.`,
      icon: '📦'
    }
  }

  // Products & Inventory
  if (action.includes('product') || e.entity_type === 'product') {
    const name = details.name || details.body?.name || e.entity_id || ''
    return {
      title: 'Product Catalog Updated',
      story: `${actor} modified product information for "${name}".`,
      icon: '🏷️'
    }
  }

  // Driver & Dispatch
  if (action.includes('driver') || action.includes('delivery')) {
    return {
      title: 'Driver / Delivery Activity',
      story: `${actor} updated delivery status or driver location.`,
      icon: '🛵'
    }
  }

  // Database operations
  if (action === 'update' || action === 'insert' || action === 'delete') {
    const table = e.entity_type || 'record'
    return {
      title: `${action.toUpperCase()} on ${table}`,
      story: `${actor} ${action}d a record in the database.`,
      icon: action === 'delete' ? '🗑️' : '✏️'
    }
  }

  // Generic fallback
  const cleanAction = action.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '')
  return {
    title: cleanAction.split('/').filter(Boolean).slice(-2).join(' ').replace(/[-_]/g, ' ') || 'System Activity',
    story: `${actor} performed action on ${e.resource || cleanAction}.`,
    icon: '⚡'
  }
}

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, subtext, icon, color }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: 2 }}>
          {Number(value || 0).toLocaleString()}
        </div>
        {subtext && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Event Detail Drawer ──────────────────────────────────────────────────────
function EventDrawer({ event, onClose }) {
  if (!event) return null
  const narrative = getHumanNarrative(event)
  const loc = parseLocation(event)
  const dev = parseDevice(event.user_agent)
  const isSuccess = event.outcome === 'success' || event.outcome === 'committed'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 520,
      background: '#fff',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight .2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{narrative.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {narrative.title}
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Event #{event.id} · {relativeTime(event.occurred_at)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#64748b',
            padding: 4
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Story Summary */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
            Summary of Action
          </div>
          <div style={{ fontSize: 13, color: '#14532d', lineHeight: 1.5 }}>
            {narrative.story}
          </div>
        </div>

        {/* Core Attributes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            Event Details
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {[
              { label: 'Timestamp', value: fmtDate(event.occurred_at) },
              { label: 'Status / Outcome', value: isSuccess ? '✅ Successful' : `⚠️ ${event.outcome || 'Failed'}` },
              { label: 'Actor Name', value: event.actor_name || 'System / Automated' },
              { label: 'Role', value: event.actor_role || 'User' },
              { label: 'Location', value: `${loc.flag} ${loc.display}` },
              { label: 'Device / Client', value: `${dev.icon} ${dev.label}` },
              { label: 'IP Address', value: event.ip_address || '—' },
              { label: 'Action Tag', value: event.action || '—' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: i < 7 ? '1px solid #f1f5f9' : 'none',
                background: i % 2 === 0 ? '#fff' : '#f8fafc',
                fontSize: 12
              }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payload / Context (if available) */}
        {event.details && Object.keys(event.details).length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Technical Data
            </div>
            <pre style={{
              background: '#0f172a',
              color: '#94a3b8',
              padding: 14,
              borderRadius: 8,
              fontSize: 11,
              maxHeight: 200,
              overflow: 'auto',
              margin: 0
            }}>
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: '#e2e8f0',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: '#334155'
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SystemAudit() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery]       = useState('')
  const [timeFilter, setTimeFilter]         = useState('30d')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [page, setPage]                     = useState(1)

  const [data, setData]                     = useState(null)
  const [stats, setStats]                   = useState(null)
  const [loading, setLoading]               = useState(true)
  const [selectedEvent, setSelectedEvent]   = useState(null)
  const [exporting, setExporting]           = useState(false)
  const [refreshIndex, setRefreshIndex]     = useState(0)

  const debounceRef = useRef(null)

  // 1. Fetch live summary statistics
  useEffect(() => {
    api.get('/audit/stats')
      .then(res => setStats(res.data))
      .catch(() => {})
  }, [refreshIndex])

  // 2. Fetch paginated events
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)

      const params = { page, category: activeCategory }
      if (searchQuery.trim()) params.search = searchQuery.trim()

      if (timeFilter === 'today') {
        const d = new Date().toISOString().slice(0, 10)
        params.from = d
      } else if (timeFilter === '7d') {
        const d = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
        params.from = d
      } else if (timeFilter === '30d') {
        const d = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
        params.from = d
      }

      if (statusFilter === 'success') params.outcome = 'success'
      if (statusFilter === 'failure') params.outcome = 'failure'

      api.get('/audit', { params })
        .then(res => setData(res.data))
        .catch(() => setData({ events: [], total: 0 }))
        .finally(() => setLoading(false))
    }, 250)
  }, [activeCategory, searchQuery, timeFilter, statusFilter, page, refreshIndex])

  // Handle Export CSV
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = { category: activeCategory }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const res = await api.get('/audit/export', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `bems-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not export audit log. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil((data?.total || 0) / 50) || 1

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Slide-over Event Drawer Overlay */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 9998, backdropFilter: 'blur(2px)' }}
        />
      )}
      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📋</span> Activity & Audit Log
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Comprehensive timeline of staff actions, customer orders, sign-ins, and system operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setRefreshIndex(v => v + 1)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#10b981',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {exporting ? 'Exporting…' : '⬇️ Export CSV'}
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Total Events (30d)"
          value={stats?.month || 0}
          icon="📊"
          color="#3b82f6"
          subtext="Verified business operations"
        />
        <StatCard
          label="Today's Activity"
          value={stats?.today || 0}
          icon="⚡"
          color="#10b981"
          subtext="Actions recorded today"
        />
        <StatCard
          label="Orders & Sales"
          value={stats?.order_events || 0}
          icon="🛍️"
          color="#8b5cf6"
          subtext="Orders placed & fulfilled (30d)"
        />
        <StatCard
          label="Staff & Admin"
          value={stats?.staff_actions || 0}
          icon="👤"
          color="#f59e0b"
          subtext="Admin & manager actions (30d)"
        />
      </div>

      {/* ── Controls & Filter Bar ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: 20 }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 12px', overflowX: 'auto', gap: 4 }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setPage(1) }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                  padding: '14px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  transition: 'all .15s'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 14, color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by staff, action, customer, or order #..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={e => { setTimeFilter(e.target.value); setPage(1) }}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#fff',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#fff',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Outcomes</option>
            <option value="success">Successful Only</option>
            <option value="failure">Failed / Warning Only</option>
          </select>

          {/* Reset button if filtered */}
          {(searchQuery || statusFilter !== 'all' || timeFilter !== '30d') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setTimeFilter('30d')
                setPage(1)
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Events Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: 140 }}>When</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b' }}>Action & Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: 180 }}>User / Staff</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: 160 }}>Channel & Location</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: 100 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: 90, textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
                    <div>Loading activity log records…</div>
                  </td>
                </tr>
              ) : !data?.events?.length ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
                    <div style={{ fontWeight: 600, color: '#475569' }}>No activity records found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search or adjusting your date range.</div>
                  </td>
                </tr>
              ) : (
                data.events.map(event => {
                  const narrative = getHumanNarrative(event)
                  const loc = parseLocation(event)
                  const dev = parseDevice(event.user_agent)
                  const isSuccess = event.outcome === 'success' || event.outcome === 'committed'

                  return (
                    <tr
                      key={event.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Time */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{relativeTime(event.occurred_at)}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmtDate(event.occurred_at)}</div>
                      </td>

                      {/* Action & Story */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{narrative.icon}</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{narrative.title}</span>
                        </div>
                        <div style={{ color: '#475569', fontSize: 12.5, lineHeight: 1.4 }}>
                          {narrative.story}
                        </div>
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {event.actor_name || 'System'}
                        </div>
                        {event.actor_role && (
                          <span style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '1px 7px',
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: event.actor_role === 'superadmin' ? '#fef3c7' : '#f1f5f9',
                            color: event.actor_role === 'superadmin' ? '#92400e' : '#475569'
                          }}>
                            {event.actor_role}
                          </span>
                        )}
                      </td>

                      {/* Channel & Location */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontWeight: 500 }}>
                          <span>{dev.icon}</span>
                          <span>{dev.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {loc.flag} {loc.display}
                        </div>
                      </td>

                      {/* Outcome Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isSuccess ? '#ecfdf5' : '#fef2f2',
                          color: isSuccess ? '#059669' : '#dc2626'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSuccess ? '#10b981' : '#ef4444' }} />
                          {isSuccess ? 'Success' : 'Failed'}
                        </span>
                      </td>

                      {/* Details Button */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                        <button
                          onClick={() => setSelectedEvent(event)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
          <div>
            Showing {data?.events?.length || 0} of {Number(data?.total || 0).toLocaleString()} events
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: page <= 1 ? '#f1f5f9' : '#fff',
                color: page <= 1 ? '#94a3b8' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 6px', fontWeight: 600, color: '#0f172a' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: page >= totalPages ? '#f1f5f9' : '#fff',
                color: page >= totalPages ? '#94a3b8' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
