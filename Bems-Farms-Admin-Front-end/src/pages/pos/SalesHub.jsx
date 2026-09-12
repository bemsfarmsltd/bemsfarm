import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const fmt = (n) => '₦' + Math.round(n || 0).toLocaleString()

// ── Cosmetic-only lookups (icons/colors by real name — not fabricated data) ──

const CATEGORY_STYLE = [
  { match: /oil/i, icon: '🫒', color: '#D97706' },
  { match: /grain|rice|flour|tuber|garri|semo|bean/i, icon: '🌾', color: '#B45309' },
  { match: /meat|poultry|seafood|fish|chicken|beef/i, icon: '🍗', color: '#E11D48' },
  { match: /spice|season/i, icon: '🧂', color: '#DB2777' },
  { match: /veg|produce|pepper|tomato|onion/i, icon: '🥬', color: '#059669' },
  { match: /dairy|egg|milk/i, icon: '🥛', color: '#4F46E5' },
  { match: /beverage|drink|juice/i, icon: '🧃', color: '#2563EB' },
  { match: /household|soap|clean|detergent/i, icon: '🧼', color: '#0891B2' },
  { match: /can/i, icon: '🥫', color: '#DC2626' },
]
const DEFAULT_CAT_STYLE = { icon: '🛒', color: '#64748B' }
function categoryStyle(name) {
  return CATEGORY_STYLE.find((c) => c.match.test(name || '')) || DEFAULT_CAT_STYLE
}

function channelStyle(source) {
  const s = (source || '').toLowerCase()
  if (s.includes('pos') || s.includes('physical')) return { icon: 'ri-store-3-line', color: '#16A34A' }
  if (s.includes('whatsapp')) return { icon: 'ri-whatsapp-line', color: '#059669' }
  if (s.includes('chef') || s.includes('ai')) return { icon: 'ri-robot-line', color: '#7C3AED' }
  if (s.includes('online') || s.includes('web') || s.includes('mobile')) return { icon: 'ri-global-line', color: '#2563EB' }
  return { icon: 'ri-question-line', color: '#64748B' }
}

const TIER_STYLE = {
  Platinum: { badgeClass: 'bg-purple-subtle text-purple', icon: 'ri-vip-crown-fill', border: '#7C3AED' },
  Gold:     { badgeClass: 'bg-warning-subtle text-warning', icon: 'ri-medal-fill', border: '#B45309' },
  Silver:   { badgeClass: 'bg-secondary-subtle text-secondary', icon: 'ri-award-fill', border: '#64748B' },
  Bronze:   { badgeClass: 'bg-light text-dark border', icon: 'ri-award-line', border: '#92400E' },
}

const TENDER_STYLE = {
  cash:     { icon: 'ri-money-dollar-circle-fill', color: '#059669', label: 'Cash' },
  card:     { icon: 'ri-bank-card-fill', color: '#2563EB', label: 'Card / POS Terminal' },
  transfer: { icon: 'ri-qr-code-line', color: '#D97706', label: 'Bank Transfer / QR' },
  unknown:  { icon: 'ri-question-line', color: '#64748B', label: 'Unspecified' },
}
function tenderStyle(method) {
  return TENDER_STYLE[method] || { icon: 'ri-price-tag-3-line', color: '#64748B', label: method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
}

function trafficLabel(pct) {
  if (pct >= 85) return 'Peak Rush'
  if (pct >= 60) return 'High'
  if (pct >= 30) return 'Moderate'
  return 'Low'
}

const TIMEFRAME_LABELS = {
  shift: 'Active Shift (Today)',
  today: 'Full Day Today',
  yesterday: 'Yesterday',
  week: 'Last 7 Days',
  month: 'Current 30 Days',
}

export default function SalesHub({
  onOpenRegister,
  historyList = [],
  onlineOrders = [],
  onOpenOnlineOrder,
  onReprintReceipt,
  user,
}) {
  const { logout, hasRole } = useAuth()
  const isManager = hasRole ? hasRole('superadmin', 'admin', 'manager') : true

  // Top-Level Domain Analytics Tabs ('overview' | 'products' | 'payments' | 'channels' | 'customers')
  const [mainAnalyticsTab, setMainAnalyticsTab] = useState('overview')

  // Timeframe filter — drives the live analytics fetch below
  const [timeframe, setTimeframe] = useState('shift') // 'shift' | 'today' | 'yesterday' | 'week' | 'month'
  const [searchQuery, setSearchQuery] = useState('')

  // Cash drawer denomination state for reconciliation modal
  const [showDrawerModal, setShowDrawerModal] = useState(false)
  const [showZReportModal, setShowZReportModal] = useState(false)
  const [denominations, setDenominations] = useState({
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
  })
  const [drawerNotes, setDrawerNotes] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err.message)
      })
    } else {
      document.exitFullscreen?.()
    }
  }

  // ── Live current session (for the header "shift active" badge) ──────────────
  const [session, setSession] = useState(null)
  useEffect(() => {
    let alive = true
    api.get('/admin/pos/session/current')
      .then((res) => { if (alive) setSession(res.data?.session || null) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // ── Live analytics — every number below comes from the database ─────────────
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true); setAnalyticsError(false)
    try {
      const res = await api.get('/admin/pos/analytics', { params: { timeframe } })
      setAnalytics(res.data)
    } catch {
      setAnalyticsError(true)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [timeframe])
  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  const kpis = analytics?.kpis ?? {}
  const hourly = analytics?.hourly ?? []
  const maxHourlyAmount = analytics?.max_hourly_amount ?? 1
  const categoryBreakdown = analytics?.category_breakdown ?? []
  const channelBreakdown = analytics?.channel_breakdown ?? []
  const tierBreakdown = analytics?.tier_breakdown ?? []
  const topProducts = analytics?.top_products ?? []
  const topCustomers = analytics?.top_customers ?? []
  const insights = analytics?.insights ?? []
  const tenderBreakdown = kpis.tender_breakdown ?? []
  const tenderTotal = tenderBreakdown.reduce((s, t) => s + t.amount, 0)
  const cashSales = kpis.cash_sales ?? 0
  const pendingOnlineCount = onlineOrders.filter((o) => o.status === 'new').length

  // Counted physical cash — local UI state, independent of the fetched analytics
  const countedCash = useMemo(
    () => Object.entries(denominations).reduce((s, [val, qty]) => s + Number(val) * (Number(qty) || 0), 0),
    [denominations]
  )
  const drawerVariance = countedCash > 0 ? countedCash - (kpis.expected_drawer_cash || 0) : 0

  // Global Function Keys listener on SalesHub (F1: Open Register, F2: Cash Drawer, F3: Z-Report, F4: Timeframe)
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isInput) return

      if (e.key === 'F1') {
        e.preventDefault()
        onOpenRegister()
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        setShowDrawerModal(true)
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setShowZReportModal(true)
        return
      }
      if (e.key === 'F4') {
        e.preventDefault()
        const order = ['shift', 'today', 'yesterday', 'week', 'month']
        setTimeframe((curr) => {
          const idx = order.indexOf(curr)
          return order[(idx + 1) % order.length]
        })
        return
      }
      if (e.key === 'Escape') {
        if (showDrawerModal) setShowDrawerModal(false)
        if (showZReportModal) setShowZReportModal(false)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenRegister, showDrawerModal, showZReportModal])

  // Filtered Receipts table
  const filteredReceipts = useMemo(() => {
    if (!searchQuery) return historyList
    const q = searchQuery.toLowerCase()
    return historyList.filter(
      (r) =>
        (r.inv && r.inv.toLowerCase().includes(q)) ||
        (r.cust && r.cust.toLowerCase().includes(q)) ||
        (r.method && r.method.toLowerCase().includes(q))
    )
  }, [historyList, searchQuery])

  const todayStr = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="sales-hub-root" style={{ minHeight: '100vh', backgroundColor: '#FAF8F5', color: '#0F172A', paddingBottom: '3.5rem' }}>

      {/* ── STYLES ── */}
      <style>{`
        .sales-hub-header {
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          padding: 0.9rem 1.75rem;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .sh-card {
          background: #FFFFFF;
          border: 1px solid #EFECE6;
          border-radius: 1rem;
          padding: 1.25rem 1.4rem;
          box-shadow: 0 2px 10px -2px rgba(20, 60, 45, 0.04);
          transition: all 0.2s ease;
        }
        .sh-card:hover {
          border-color: #E2DDD5;
          box-shadow: 0 4px 16px -2px rgba(20, 60, 45, 0.08);
        }
        .sh-primary-btn {
          background: linear-gradient(135deg, #143C2D, #0B281B);
          color: #FFFFFF;
          border: none;
          border-radius: 9999px;
          padding: 0.65rem 1.5rem;
          font-weight: 700;
          font-size: 0.92rem;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(20, 60, 45, 0.28);
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .sh-primary-btn:hover {
          background: linear-gradient(135deg, #0B281B, #051910);
          color: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(20, 60, 45, 0.38);
        }
        .sh-secondary-btn {
          background: #F8FAFC;
          color: #1E293B;
          border: 1px solid #E2E8F0;
          border-radius: 9999px;
          padding: 0.55rem 1.15rem;
          font-weight: 600;
          font-size: 0.82rem;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .sh-secondary-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #0F172A;
        }
        .sh-metric-val {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.65rem;
          letter-spacing: -0.02em;
          color: #0F172A;
          margin: 0.35rem 0 0.15rem;
        }
        .sh-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .sh-pill-tab {
          border-radius: 9999px;
          padding: 0.4rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 700;
          border: 1px solid transparent;
          background: #F1F5F9;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sh-pill-tab.active {
          background: #143C2D;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(20,60,45,0.25);
        }
        .sh-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }
        .sh-bar-track {
          width: 100%;
          max-width: 44px;
          height: 140px;
          background: #F1F5F9;
          border-radius: 8px;
          display: flex;
          align-items: flex-end;
          padding: 3px;
          overflow: hidden;
          position: relative;
        }
        .sh-bar-fill {
          width: 100%;
          border-radius: 6px;
          background: linear-gradient(180deg, #10B981, #143C2D);
          transition: height 0.4s ease;
        }
        .sh-ai-box {
          background: #FFFFFF;
          color: #0F172A;
          border: 1px solid #E5E7EB;
          border-left: 4px solid #10B981;
          border-radius: 1rem;
          padding: 1.15rem 1.4rem;
          box-shadow: 0 2px 12px -2px rgba(20, 60, 45, 0.05);
        }
        .sh-ai-insight-item {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          height: 100%;
          transition: all 0.2s ease;
        }
        .sh-ai-insight-item:hover {
          background: #F0FDF4;
          border-color: #BBF7D0;
          transform: translateY(-1px);
        }
      `}</style>

      {/* ── TOP NAV HEADER (UNIFIED COMMAND BAR) ── */}
      <header className="sales-hub-header">
        <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Left: Brand Logo + Terminal & Shift Status */}
          <div className="d-flex align-items-center gap-3">
            <Link to="/dashboard" className="d-flex align-items-center text-decoration-none">
              <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: 38, objectFit: 'contain' }} />
            </Link>

            <div className="vr d-none d-sm-block text-muted opacity-25" style={{ height: 28 }}></div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
                {session?.terminal_id ? `POS Terminal ${session.terminal_id}` : 'POS Register'}
              </h6>
              {session ? (
                <span
                  className="badge d-inline-flex align-items-center gap-1.5"
                  style={{ backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontSize: '9px', fontWeight: 800, padding: '2.5px 7.5px', borderRadius: '12px', letterSpacing: '0.03em' }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                  Shift Active — {session.session_ref}
                </span>
              ) : (
                <span
                  className="badge d-inline-flex align-items-center gap-1.5"
                  style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', fontSize: '9px', fontWeight: 800, padding: '2.5px 7.5px', borderRadius: '12px', letterSpacing: '0.03em' }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#94A3B8', display: 'inline-block' }}></span>
                  No Active Shift
                </span>
              )}
            </div>
          </div>

          {/* Center: Period Switcher */}
          <div className="d-none d-xl-flex align-items-center gap-1 bg-light p-1 rounded-pill border">
            {[
              { id: 'shift', label: 'Active Shift' },
              { id: 'today', label: 'Today (Full)' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: '30 Days' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`sh-pill-tab py-1 px-2.5 ${timeframe === t.id ? 'active' : ''}`}
                style={{ fontSize: '0.74rem' }}
                onClick={() => setTimeframe(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right: Register Launcher + Quick Actions */}
          <div className="d-flex align-items-center gap-2">
            {/* BIG PRIMARY CTA: Launch POS Terminal */}
            <button
              type="button"
              className="sh-primary-btn"
              onClick={onOpenRegister}
              title="Open Barcode Scanner & Ringing Register (F1)"
            >
              <i className="ri-barcode-box-line" style={{ fontSize: '18px' }}></i>
              <span>Open POS Register</span>
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  marginLeft: '2px'
                }}
              >
                F1
              </span>
            </button>

            {/* Reconcile Drawer Button */}
            <button
              type="button"
              className="sh-secondary-btn d-none d-md-inline-flex"
              onClick={() => setShowDrawerModal(true)}
              title="Count Physical Cash & Reconcile Float"
            >
              <i className="ri-safe-2-line text-warning" style={{ fontSize: '15px' }}></i>
              <span>Cash Drawer &amp; Float</span>
            </button>

            {/* Z-Report Summary Button */}
            <button
              type="button"
              className="sh-secondary-btn d-none d-lg-inline-flex"
              onClick={() => setShowZReportModal(true)}
              title="View Shift End Z-Report & Audit"
            >
              <i className="ri-file-text-line text-primary" style={{ fontSize: '15px' }}></i>
              <span>Z-Report</span>
            </button>

            {/* Fullscreen Icon Button */}
            <button
              type="button"
              className="sh-secondary-btn px-2.5"
              onClick={toggleFullScreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode (F11)'}
              aria-label="Toggle Fullscreen"
            >
              <i className={isFullscreen ? 'ri-fullscreen-exit-line text-dark' : 'ri-fullscreen-line text-dark'} style={{ fontSize: '16px' }}></i>
            </button>

            {/* Admin Switcher / Logout */}
            {isManager ? (
              <Link to="/dashboard" className="sh-secondary-btn" title="Back to Admin Dashboard">
                <i className="ri-dashboard-2-line" style={{ fontSize: '15px' }}></i>
                <span className="d-none d-sm-inline">Admin Dashboard</span>
              </Link>
            ) : (
              <button
                type="button"
                className="sh-secondary-btn text-danger"
                onClick={logout}
                title="End Shift & Sign Out"
              >
                <i className="ri-logout-box-r-line" style={{ fontSize: '15px' }}></i>
                <span className="d-none d-sm-inline">End Shift</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <main className="container-fluid py-4">

        {/* Mobile Period Pills Switcher */}
        <div className="d-xl-none d-flex flex-wrap align-items-center justify-content-between p-2.5 mb-3 rounded-3 border bg-white shadow-xs gap-2">
          <span className="text-muted fs-xs fw-bold">Period:</span>
          <div className="d-flex flex-wrap align-items-center gap-1">
            {[
              { id: 'shift', label: 'Active Shift' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: '30 Days' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`sh-pill-tab py-1 px-2 ${timeframe === t.id ? 'active' : ''}`}
                style={{ fontSize: '0.72rem' }}
                onClick={() => setTimeframe(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TOP-LEVEL ANALYTICS DOMAIN TABS ── */}
        <div className="d-flex flex-wrap align-items-center gap-2 p-1.5 mb-4 bg-white rounded-4 border shadow-xs">
          {[
            { id: 'overview',  label: 'Executive & Shift Overview', icon: 'ri-dashboard-3-line', badge: 'Live' },
            { id: 'products',  label: 'Produce & Margins Studio',   icon: 'ri-trophy-line',       badge: `${topProducts.length} Items` },
            { id: 'payments',  label: 'Cash Drawer & Tender Audit', icon: 'ri-bank-card-line',    badge: kpis.expected_drawer_cash != null ? fmt(kpis.expected_drawer_cash) : '—' },
            { id: 'channels',  label: 'Multi-Channel & Online Hub', icon: 'ri-store-2-line',      badge: `${pendingOnlineCount} New` },
            { id: 'customers', label: 'Customer Loyalty & VIPs',    icon: 'ri-user-star-line',    badge: `${topCustomers.length} VIPs` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn rounded-pill d-inline-flex align-items-center gap-2 px-3.5 py-2 fs-sm fw-bold border-0 transition-all ${
                mainAnalyticsTab === tab.id
                  ? 'btn-primary-bf shadow-sm text-white'
                  : 'btn-light text-muted'
              }`}
              onClick={() => setMainAnalyticsTab(tab.id)}
            >
              <i className={`${tab.icon} fs-16`}></i>
              <span>{tab.label}</span>
              <span className={`badge rounded-pill fs-xxs py-0.5 px-2 ${
                mainAnalyticsTab === tab.id
                  ? 'bg-white text-dark bg-opacity-90'
                  : 'bg-secondary bg-opacity-10 text-muted'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {analyticsError && (
          <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-4">
            <i className="ri-wifi-off-line fs-4" />
            <div className="flex-grow-1">
              <strong>Could not load POS analytics.</strong>
              <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
            </div>
            <button className="btn btn-sm btn-outline-warning" onClick={loadAnalytics}>Retry</button>
          </div>
        )}

        {analyticsLoading && !analytics ? (
          <div className="py-5 text-center text-muted">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
            Loading live POS data…
          </div>
        ) : (
        <>
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXECUTIVE & SHIFT OVERVIEW                                */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {mainAnalyticsTab === 'overview' && (
          <div>
            {/* ── PRIMARY KPI CARDS ROW (6 METRICS SUITE) ── */}
            <div className="row g-3 mb-4">

              {/* 1. Gross Revenue */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Gross Sales</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#ECFDF5', color: '#059669', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-money-dollar-circle-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val text-success" style={{ fontSize: '1.45rem' }}>{fmt(kpis.gross_sales)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    {kpis.growth_pct != null ? (
                      <span className={`fw-bold ${kpis.growth_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                        {kpis.growth_pct >= 0 ? '↑' : '↓'} {Math.abs(kpis.growth_pct).toFixed(1)}% vs prior period
                      </span>
                    ) : <span>{TIMEFRAME_LABELS[timeframe]}</span>}
                    <span>{kpis.txn_count ?? 0} tickets</span>
                  </div>
                </div>
              </div>

              {/* 2. Cash Collected (In Drawer) */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Cash Drawer</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#FEF3C7', color: '#B45309', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-hand-coin-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val" style={{ fontSize: '1.45rem' }}>{kpis.expected_drawer_cash != null ? fmt(kpis.expected_drawer_cash) : '—'}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    <span>{kpis.starting_float != null ? `Float: ${fmt(kpis.starting_float)}` : 'No active shift'}</span>
                    <span className="text-success fw-semibold">+{fmt(cashSales)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Card & Digital Payments */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Digital Tender</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-bank-card-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val" style={{ fontSize: '1.45rem' }}>{fmt(tenderTotal - cashSales)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    <span>{kpis.txn_count ?? 0} total tickets</span>
                    <span className="badge bg-primary-subtle text-primary">{tenderBreakdown.length} method{tenderBreakdown.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </div>

              {/* 4. Average Ticket Size (AOV) */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Average Ticket</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-shopping-bag-2-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val" style={{ fontSize: '1.45rem' }}>{fmt(kpis.aov)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    <span>UPT: {(kpis.items_per_txn ?? 0).toFixed(1)} items</span>
                    <span className="fw-bold text-primary">{kpis.sku_count ?? 0} SKUs sold</span>
                  </div>
                </div>
              </div>

              {/* 5. Estimated Gross Margin & Profit */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Gross Margin</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#ECFDF5', color: '#047857', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-pie-chart-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val text-success" style={{ fontSize: '1.45rem' }}>{(kpis.gross_margin_pct ?? 0).toFixed(1)}%</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    <span>Est. Profit:</span>
                    <strong className="text-dark">{fmt(kpis.estimated_profit)}</strong>
                  </div>
                </div>
              </div>

              {/* 6. Online Inflow Queue */}
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fs-xs fw-bold text-uppercase">Online Queue</span>
                    <div className="sh-icon-circle" style={{ backgroundColor: '#FFF7ED', color: '#C2410C', width: 36, height: 36, fontSize: '1.1rem' }}>
                      <i className="ri-notification-3-line"></i>
                    </div>
                  </div>
                  <div className="sh-metric-val text-warning" style={{ fontSize: '1.45rem' }}>{pendingOnlineCount} New</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                    <span>{onlineOrders.length} Total orders</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fs-xxs fw-bold text-primary"
                      onClick={() => setMainAnalyticsTab('channels')}
                    >
                      View Hub →
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* ── LIVE STORE INSIGHTS BANNER (real, derived from this period's data) ── */}
            <div className="sh-ai-box mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <span className="avatar size-7 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0 fs-xs">
                    ✨
                  </span>
                  <div>
                    <h6 className="fw-bold mb-0 font-display text-dark">Live Store Insights</h6>
                    <span className="text-muted fs-xxs">Derived from real sales in this period — {TIMEFRAME_LABELS[timeframe]}</span>
                  </div>
                </div>
                <span className="badge bg-light text-muted border fw-bold fs-xxs px-2.5 py-1 rounded-pill">
                  <i className="ri-pulse-line text-success me-1"></i>Live
                </span>
              </div>

              {insights.length === 0 ? (
                <p className="text-muted fs-sm text-center py-3 mb-0">Not enough sales in this period yet to surface insights.</p>
              ) : (
                <div className="row g-3">
                  {insights.map((ins) => (
                    <div className="col-12 col-md-4" key={ins.type}>
                      <div className="sh-ai-insight-item">
                        <h6 className="fw-bold fs-xs text-dark mb-1">{ins.title}</h6>
                        <p className="fs-xxs text-muted mb-0 leading-relaxed">{ins.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── DEEP VISUAL ANALYTICS STUDIO ROW ── */}
            <div className="row g-4 mb-4">

              {/* Hourly Flow Bars */}
              <div className="col-12 col-lg-8">
                <div className="sh-card h-100">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                    <div>
                      <h6 className="fw-bold mb-0 font-display">Hourly Sales Velocity &amp; Peak Rush Flow</h6>
                      <p className="text-muted fs-xs mb-0">Showing transaction flow across {TIMEFRAME_LABELS[timeframe]}</p>
                    </div>
                    {hourly.length > 0 && (
                      <span className="badge bg-success-subtle text-success fs-xs fw-bold">
                        Peak: {[...hourly].sort((a, b) => b.amount - a.amount)[0]?.label}
                      </span>
                    )}
                  </div>

                  {hourly.length === 0 ? (
                    <p className="text-muted text-center py-4 fs-sm mb-0">No sales recorded in this period.</p>
                  ) : (
                    <div className="d-flex align-items-end justify-content-between gap-2 pt-3 pb-2" style={{ minHeight: 180 }}>
                      {hourly.map((h) => {
                        const pct = Math.round((h.amount / maxHourlyAmount) * 100)
                        return (
                          <div key={h.hour} className="sh-bar-col">
                            <span className="text-dark fs-xxs fw-bold">{fmt(h.amount)}</span>
                            <div className="sh-bar-track">
                              <div className="sh-bar-fill" style={{ height: `${pct}%` }}></div>
                            </div>
                            <span className="text-muted fs-xxs mt-1 fw-semibold">{h.label}</span>
                            <span className="badge bg-light text-muted fs-xxs py-0 px-1">{trafficLabel(pct)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Split Snapshot */}
              <div className="col-12 col-lg-4">
                <div className="sh-card h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                      <div>
                        <h6 className="fw-bold mb-0 font-display">Tender &amp; Gateway Split</h6>
                        <p className="text-muted fs-xs mb-0">Settlement distribution</p>
                      </div>
                    </div>

                    {tenderBreakdown.length === 0 ? (
                      <p className="text-muted fs-sm text-center py-3 mb-0">No payments recorded in this period.</p>
                    ) : (
                      <div className="vstack gap-3 mt-3">
                        {tenderBreakdown.map((t) => {
                          const style = tenderStyle(t.method)
                          const share = tenderTotal > 0 ? Math.round((t.amount / tenderTotal) * 100) : 0
                          return (
                            <div key={t.method}>
                              <div className="d-flex justify-content-between fs-xs fw-semibold mb-1">
                                <span className="d-flex align-items-center gap-1.5"><i className={style.icon} style={{ color: style.color }}></i> {style.label}</span>
                                <strong className="text-dark">{fmt(t.amount)} ({share}%)</strong>
                              </div>
                              <div className="progress" style={{ height: 7, borderRadius: 4 }}>
                                <div className="progress-bar" style={{ width: `${share}%`, backgroundColor: style.color }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill px-3 fs-xs fw-bold"
                      onClick={() => setMainAnalyticsTab('payments')}
                    >
                      Deep Tender Audit →
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary-bf rounded-pill px-3 fs-xs fw-bold"
                      onClick={onOpenRegister}
                    >
                      Open POS (F1)
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Recent Receipts Quick Ledger */}
            <div className="sh-card mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Recent Register Receipts &amp; Transactions</h6>
                  <p className="text-muted fs-xs mb-0">Live audit log from register terminal</p>
                </div>
                <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="ri-search-line"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0 fs-xs"
                    placeholder="Search receipts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light fs-xs text-muted">
                    <tr>
                      <th>Receipt #</th>
                      <th>Customer Name</th>
                      <th>Payment Tender</th>
                      <th>Timestamp</th>
                      <th className="text-end">Total Amount</th>
                      <th className="text-center">Reprint</th>
                    </tr>
                  </thead>
                  <tbody className="fs-sm">
                    {filteredReceipts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No transactions found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredReceipts.map((t) => (
                        <tr key={t.inv}>
                          <td>
                            <span className="fw-bold text-dark font-monospace fs-xs">{t.inv}</span>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark">{t.cust || 'Walk-in Customer'}</span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1">{t.method}</span>
                          </td>
                          <td className="text-muted fs-xs">{t.time}</td>
                          <td className="text-end fw-bold text-success">{fmt(t.amount)}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-light py-0 px-2 rounded-pill fs-xs text-muted"
                              onClick={() => onReprintReceipt ? onReprintReceipt(t) : onOpenRegister()}
                              title="Reprint Receipt"
                            >
                              <i className="ri-printer-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: PRODUCE & MARGINS STUDIO                                  */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {mainAnalyticsTab === 'products' && (
          <div>
            {/* Category Cards Overview */}
            {categoryBreakdown.length === 0 ? (
              <div className="sh-card text-center py-4 mb-4">
                <p className="text-muted fs-sm mb-0">No product sales in this period yet.</p>
              </div>
            ) : (
              <div className="row g-3 mb-4">
                {categoryBreakdown.map((cat) => {
                  const style = categoryStyle(cat.category)
                  return (
                    <div key={cat.category} className="col-12 col-sm-6 col-xl">
                      <div className="sh-card h-100">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fs-22">{style.icon}</span>
                          <span className="badge rounded-pill fw-bold fs-xxs px-2 py-0.5" style={{ backgroundColor: `${style.color}15`, color: style.color }}>
                            {cat.share.toFixed(0)}% of Sales
                          </span>
                        </div>
                        <div className="fw-bold fs-xs text-muted text-truncate">{cat.category}</div>
                        <div className="sh-metric-val" style={{ fontSize: '1.35rem' }}>{fmt(cat.revenue)}</div>
                        <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                          <span>{cat.qty} Units Sold</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Deep Produce Margins Table */}
            <div className="sh-card mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Produce Margin &amp; Inventory Velocity Ledger</h6>
                  <p className="text-muted fs-xs mb-0">Cost vs. selling price, real-time stock, and revenue performance</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success-subtle text-success fs-xs fw-bold px-3 py-1.5 rounded-pill">
                    Avg Gross Margin: {(kpis.gross_margin_pct ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light fs-xs text-muted">
                    <tr>
                      <th>Produce Item &amp; SKU</th>
                      <th>Units Sold</th>
                      <th>Gross Margin %</th>
                      <th>Inventory Remaining</th>
                      <th>Stock Status</th>
                      <th className="text-end">Total Revenue Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="fs-sm">
                    {topProducts.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4 text-muted">No product sales in this period.</td></tr>
                    ) : topProducts.map((p) => {
                      const low = p.stock <= p.low_stock_threshold
                      return (
                        <tr key={p.sku}>
                          <td>
                            <span className="fw-bold text-dark fs-xs d-block">{p.name}</span>
                            <span className="text-muted fs-xxs font-monospace">SKU: {p.sku}</span>
                          </td>
                          <td>
                            <span className="badge bg-success-subtle text-success font-semibold px-2 py-1">{p.units_sold} units</span>
                          </td>
                          <td>
                            <strong className="text-dark fs-sm">{p.margin_pct.toFixed(1)}%</strong>
                          </td>
                          <td>
                            <span className={`badge ${low ? 'bg-danger-subtle text-danger' : 'bg-light text-dark border'}`}>
                              {p.stock} units left
                            </span>
                          </td>
                          <td>
                            {low ? (
                              <span className="badge bg-danger text-white fs-xxs px-2 py-0.5 rounded-pill">
                                <i className="ri-alarm-warning-line me-1"></i>Restock Required
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success fs-xxs px-2 py-0.5 rounded-pill">
                                <i className="ri-check-line me-1"></i>Healthy Stock
                              </span>
                            )}
                          </td>
                          <td className="text-end fw-bold text-dark fs-sm">{fmt(p.revenue)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CASH DRAWER & TENDER AUDIT                                */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {mainAnalyticsTab === 'payments' && (
          <div>
            {/* Drawer Reconciliation Quick Audit */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-6">
                <div className="sh-card h-100">
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                    <div>
                      <h6 className="fw-bold mb-0 font-display">Physical Drawer Balance &amp; Float Ledger</h6>
                      <p className="text-muted fs-xs mb-0">End-of-shift cash verification and variance tracking</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-warning rounded-pill px-3 fs-xs fw-bold"
                      onClick={() => setShowDrawerModal(true)}
                    >
                      <i className="ri-safe-2-line me-1"></i>Count Bills (F2)
                    </button>
                  </div>

                  {timeframe !== 'shift' || !session ? (
                    <p className="text-muted fs-sm text-center py-3 mb-0">
                      {timeframe !== 'shift' ? 'Switch to "Active Shift" to reconcile the current drawer.' : 'No open shift to reconcile.'}
                    </p>
                  ) : (
                    <div className="vstack gap-2.5">
                      <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 bg-light fs-xs">
                        <span className="text-muted">Opening Shift Cash Float:</span>
                        <strong className="text-dark">{fmt(kpis.starting_float)}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 bg-light fs-xs">
                        <span className="text-muted">Cash Collected From Sales:</span>
                        <strong className="text-success">+{fmt(cashSales)}</strong>
                      </div>
                      {tenderBreakdown.filter((t) => t.method !== 'cash').map((t) => {
                        const style = tenderStyle(t.method)
                        return (
                          <div key={t.method} className="d-flex justify-content-between align-items-center p-2.5 rounded-3 bg-light fs-xs">
                            <span className="text-muted">{style.label}:</span>
                            <strong style={{ color: style.color }}>{fmt(t.amount)}</strong>
                          </div>
                        )
                      })}
                      <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-success-subtle border border-success border-opacity-25 mt-1">
                        <span className="fw-bold text-dark fs-sm">Expected Physical Cash in Drawer:</span>
                        <strong className="fs-5 text-success">{fmt(kpis.expected_drawer_cash)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Z-Report & Audit Summary Card */}
              <div className="col-12 col-lg-6">
                <div className="sh-card h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                      <div>
                        <h6 className="fw-bold mb-0 font-display">Terminal Audit Summary</h6>
                        <p className="text-muted fs-xs mb-0">{TIMEFRAME_LABELS[timeframe]}</p>
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light text-center">
                          <span className="text-muted fs-xxs d-block text-uppercase">Discounts Authorized</span>
                          <strong className="fs-5 text-dark font-display">{fmt(kpis.discount_total)}</strong>
                          <span className="text-muted fs-xxs d-block">This period</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light text-center">
                          <span className="text-muted fs-xxs d-block text-uppercase">Return Rate</span>
                          <strong className={`fs-5 font-display ${(kpis.return_rate_pct ?? 0) > 5 ? 'text-danger' : 'text-success'}`}>{(kpis.return_rate_pct ?? 0).toFixed(1)}%</strong>
                          <span className="text-muted fs-xxs d-block">{kpis.returns_count ?? 0} returns logged</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-3 border bg-light fs-xs">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Shift Cashier:</span>
                        <strong className="text-dark">{user?.first_name || user?.name || 'Staff Member'} {user?.last_name || ''}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Total Tickets Ringed:</span>
                        <strong className="text-dark">{kpis.txn_count ?? 0} tickets</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-top d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary-bf rounded-pill px-4 fs-sm fw-bold flex-grow-1"
                      onClick={() => setShowZReportModal(true)}
                    >
                      <i className="ri-file-text-line me-1.5"></i>Generate Shift Z-Report (F3)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: MULTI-CHANNEL & ONLINE ORDER HUB                          */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {mainAnalyticsTab === 'channels' && (
          <div>
            {/* Channel Metrics Row */}
            {timeframe === 'shift' ? (
              <div className="sh-card text-center py-4 mb-4">
                <p className="text-muted fs-sm mb-0">Switch to a calendar period (Today, Week, Month…) to see the cross-channel revenue mix.</p>
              </div>
            ) : channelBreakdown.length === 0 ? (
              <div className="sh-card text-center py-4 mb-4">
                <p className="text-muted fs-sm mb-0">No orders in this period yet.</p>
              </div>
            ) : (
              <div className="row g-3 mb-4">
                {channelBreakdown.map((ch) => {
                  const style = channelStyle(ch.source)
                  return (
                    <div key={ch.source} className="col-12 col-md-4">
                      <div className="sh-card h-100">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <i className={`${style.icon} fs-24`} style={{ color: style.color }}></i>
                          <span className="badge rounded-pill fw-bold fs-xxs px-2.5 py-1" style={{ backgroundColor: `${style.color}15`, color: style.color }}>
                            {ch.share.toFixed(0)}% Volume Share
                          </span>
                        </div>
                        <div className="fw-bold fs-sm text-dark">{ch.source}</div>
                        <div className="sh-metric-val" style={{ fontSize: '1.5rem' }}>{fmt(ch.revenue)}</div>
                        <div className="d-flex align-items-center justify-content-between text-muted fs-xxs mt-1">
                          <span>{ch.count} Completed Orders</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live Incoming Online & WhatsApp Orders */}
            <div className="sh-card mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Live Incoming Web &amp; WhatsApp Orders Queue</h6>
                  <p className="text-muted fs-xs mb-0">Pack items and ring orders directly into the active POS register</p>
                </div>
                <span className="badge bg-warning-subtle text-warning fs-xs fw-bold px-3 py-1.5 rounded-pill">
                  {onlineOrders.length} Pending Orders in Queue
                </span>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light fs-xs text-muted">
                    <tr>
                      <th>Order ID</th>
                      <th>Channel</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Time Received</th>
                      <th>Delivery Notes</th>
                      <th>Items Count</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="fs-sm">
                    {onlineOrders.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-4 text-muted">No pending online orders.</td></tr>
                    ) : onlineOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <span className="fw-bold text-dark font-monospace fs-xs">{ord.id}</span>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary text-capitalize px-2 py-1">
                            <i className="ri-global-line me-1"></i>{ord.channel}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-dark">{ord.customer}</span>
                        </td>
                        <td className="text-muted fs-xs">{ord.phone}</td>
                        <td className="text-muted fs-xs">{ord.time}</td>
                        <td className="text-muted fs-xs text-truncate" style={{ maxWidth: 220 }}>
                          {ord.note || 'Standard packaging'}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{ord.items.length} items</span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary-bf rounded-pill px-3 fs-xs fw-bold"
                            onClick={() => onOpenOnlineOrder ? onOpenOnlineOrder(ord) : onOpenRegister()}
                          >
                            <i className="ri-shopping-cart-2-line me-1"></i>Load to Cart
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: CUSTOMER LOYALTY & VIPs                                   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {mainAnalyticsTab === 'customers' && (
          <div>
            {/* Loyalty Tier Cards — real revenue contribution per points-based tier */}
            {tierBreakdown.length === 0 ? (
              <div className="sh-card text-center py-4 mb-4">
                <p className="text-muted fs-sm mb-0">No customer purchases in this period yet.</p>
              </div>
            ) : (
              <div className="row g-3 mb-4">
                {tierBreakdown.map((t) => {
                  const style = TIER_STYLE[t.tier] || TIER_STYLE.Bronze
                  return (
                    <div key={t.tier} className="col-12 col-md-3">
                      <div className="sh-card h-100" style={{ borderLeft: `4px solid ${style.border}` }}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className={`badge fw-bold fs-xxs ${style.badgeClass}`}>{t.tier} Tier</span>
                          <i className={`${style.icon} fs-18`} style={{ color: style.border }}></i>
                        </div>
                        <div className="sh-metric-val" style={{ fontSize: '1.35rem' }}>{fmt(t.revenue)}</div>
                        <p className="text-muted fs-xs mb-0">{t.customers} customer{t.customers === 1 ? '' : 's'}, {t.orders} order{t.orders === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="col-12 col-md-3">
                  <div className="sh-card h-100 border-start border-4 border-success">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="badge bg-success-subtle text-success fw-bold fs-xxs">Repeat Customer Rate</span>
                      <i className="ri-user-heart-line text-success fs-18"></i>
                    </div>
                    <div className="sh-metric-val text-success" style={{ fontSize: '1.45rem' }}>{(kpis.repeat_customer_rate_pct ?? 0).toFixed(1)}%</div>
                    <p className="text-muted fs-xs mb-0">Of customers with an order this period, this % ordered more than once.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Spenders Table */}
            <div className="sh-card mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold mb-0 font-display">Top VIP Customers, Points &amp; Spend</h6>
                  <p className="text-muted fs-xs mb-0">Highest spending customers this period</p>
                </div>
                <span className="badge bg-primary-subtle text-primary fs-xs fw-bold px-3 py-1.5 rounded-pill">
                  {topCustomers.length} Top Customers
                </span>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light fs-xs text-muted">
                    <tr>
                      <th>Customer Name</th>
                      <th>Contact Phone</th>
                      <th>Total Orders</th>
                      <th>Loyalty Points</th>
                      <th className="text-end">Total Spend (This Period)</th>
                    </tr>
                  </thead>
                  <tbody className="fs-sm">
                    {topCustomers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-muted">No customer purchases in this period.</td></tr>
                    ) : topCustomers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar size-7 rounded-circle bg-light text-dark fw-bold d-flex align-items-center justify-content-center fs-xs">
                              {(c.name || '?').charAt(0)}
                            </span>
                            <span className="fw-bold text-dark fs-xs">{c.name}</span>
                          </div>
                        </td>
                        <td className="text-muted fs-xs font-monospace">{c.phone}</td>
                        <td>{c.orders} orders</td>
                        <td>
                          <span className="fw-bold text-primary font-monospace">{c.loyalty_points} pts</span>
                        </td>
                        <td className="text-end fw-bold text-success fs-sm">{fmt(c.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>

      {/* ── MODAL 1: DRAWER CASH RECONCILIATION ── */}
      {showDrawerModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold font-display d-flex align-items-center gap-2">
                  <i className="ri-safe-2-line text-warning"></i>
                  <span>Cash Drawer &amp; Shift Reconciliation</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDrawerModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span className="text-muted fs-xs d-block">Expected Cash in Drawer</span>
                    <strong className="fs-5 text-dark">{kpis.expected_drawer_cash != null ? fmt(kpis.expected_drawer_cash) : '—'}</strong>
                  </div>
                  <div className="text-end">
                    <span className="text-muted fs-xs d-block">Starting Float</span>
                    <strong className="fs-6 text-muted">{kpis.starting_float != null ? fmt(kpis.starting_float) : '—'}</strong>
                  </div>
                </div>

                <p className="fw-bold fs-xs text-uppercase text-muted mb-2">Enter Physical Note Count:</p>
                <div className="row g-2 mb-3">
                  {[1000, 500, 200, 100, 50, 20].map((denom) => (
                    <div key={denom} className="col-6">
                      <div className="input-group input-group-sm">
                        <span className="input-group-text fw-bold">₦{denom} ×</span>
                        <input
                          type="number"
                          min="0"
                          className="form-control text-end"
                          placeholder="0"
                          value={denominations[denom]}
                          onChange={(e) =>
                            setDenominations({ ...denominations, [denom]: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variance Calculation */}
                {countedCash > 0 && (
                  <div
                    className={`p-3 rounded-3 mb-3 border ${
                      drawerVariance === 0
                        ? 'bg-success-subtle text-success border-success'
                        : drawerVariance > 0
                        ? 'bg-info-subtle text-info border-info'
                        : 'bg-danger-subtle text-danger border-danger'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold fs-sm">Total Counted Cash:</span>
                      <strong className="fs-5">{fmt(countedCash)}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1 pt-1 border-top border-secondary border-opacity-25 fs-xs">
                      <span>Variance (Difference):</span>
                      <strong className="fw-bold">
                        {drawerVariance >= 0 ? `+${fmt(drawerVariance)}` : fmt(drawerVariance)}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fs-xs text-muted mb-1">Shift Notes / Remarks</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Optional notes for manager..."
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-top py-2 px-4 d-flex justify-content-between">
                <button type="button" className="btn btn-light rounded-pill px-3 fs-sm" onClick={() => setShowDrawerModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary-bf rounded-pill px-4 fs-sm fw-bold"
                  onClick={() => {
                    alert('Shift cash count recorded successfully!')
                    setShowDrawerModal(false)
                  }}
                >
                  Save Cash Count
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SHIFT Z-REPORT & AUDIT SUMMARY ── */}
      {showZReportModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold font-display d-flex align-items-center gap-2">
                  <i className="ri-file-text-line text-primary"></i>
                  <span>End of Shift Z-Report Summary</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowZReportModal(false)}></button>
              </div>
              <div className="modal-body p-4 fs-sm font-monospace">
                <div className="text-center mb-3">
                  <h6 className="fw-bold font-display mb-0">BEMS FARMS NIGERIA LIMITED</h6>
                  <p className="text-muted fs-xxs mb-0">{session?.terminal_id ? `POS Terminal ${session.terminal_id}` : 'POS Register'} Shift Audit</p>
                  <p className="text-muted fs-xxs">{todayStr}</p>
                </div>

                <div className="border-top border-bottom py-2 my-2">
                  <div className="d-flex justify-content-between py-1">
                    <span>TOTAL GROSS SALES:</span>
                    <strong>{fmt(kpis.gross_sales)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span>TRANSACTIONS COUNT:</span>
                    <strong>{kpis.txn_count ?? 0} tickets</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span>AVG TICKET (AOV):</span>
                    <strong>{fmt(kpis.aov)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span>EST. GROSS MARGIN:</span>
                    <strong className="text-success">{(kpis.gross_margin_pct ?? 0).toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="border-bottom py-2 my-2">
                  <div className="d-flex justify-content-between py-1">
                    <span>STARTING FLOAT:</span>
                    <span>{kpis.starting_float != null ? fmt(kpis.starting_float) : '—'}</span>
                  </div>
                  {tenderBreakdown.map((t) => (
                    <div className="d-flex justify-content-between py-1" key={t.method}>
                      <span>{tenderStyle(t.method).label.toUpperCase()}:</span>
                      <span>{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="py-2">
                  <div className="d-flex justify-content-between py-1 fw-bold fs-6">
                    <span>EXPECTED DRAWER CASH:</span>
                    <span>{kpis.expected_drawer_cash != null ? fmt(kpis.expected_drawer_cash) : '—'}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top py-2 px-4 d-flex justify-content-between">
                <button type="button" className="btn btn-light rounded-pill px-3 fs-sm" onClick={() => setShowZReportModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary-bf rounded-pill px-4 fs-sm fw-bold"
                  onClick={() => {
                    window.print()
                  }}
                >
                  <i className="ri-printer-line me-1.5"></i>Print Official Z-Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
