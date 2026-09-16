import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StatsCard from '../../components/ui/StatsCard'
import Badge, { statusColor } from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table'
import DetailModal from '../../components/ui/DetailModal'
import DetailTable from '../../components/ui/DetailTable'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function fmtNaira(v) {
  const n = Number(v || 0)
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n.toLocaleString()}`
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return String(dateStr)
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Shared drill-down column presets ──────────────────────────────────────────

const orderColumns = [
  {
    key: 'order',
    label: 'Order Ref',
    render: (r) => (
      <span
        className="fw-bold font-monospace"
        style={{
          backgroundColor: '#F0F9FF',
          color: '#0369A1',
          padding: '0.25rem 0.6rem',
          borderRadius: '0.4rem',
          border: '1px solid #BAE6FD',
          fontSize: '0.78rem',
        }}
      >
        {r.order_ref || r.id}
      </span>
    ),
  },
  {
    key: 'customer',
    label: 'Customer',
    render: (r) => (
      <div>
        <div className="fw-semibold text-dark" style={{ fontSize: '0.86rem' }}>
          {r.customer_name || r.customer || 'Guest Customer'}
        </div>
        {(r.customer_phone || r.phone) && (
          <div className="text-muted fs-xs font-monospace">{r.customer_phone || r.phone}</div>
        )}
      </div>
    ),
  },
  {
    key: 'items',
    label: 'Items',
    align: 'center',
    render: (r) => (
      <span className="badge bg-light text-secondary border px-2.5 py-1" style={{ fontSize: '0.75rem' }}>
        {r.item_count ?? r.items ?? 1} item{((r.item_count ?? r.items ?? 1) === 1 ? '' : 's')}
      </span>
    ),
  },
  {
    key: 'total',
    label: 'Total Amount',
    align: 'right',
    render: (r) => (
      <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.9rem' }}>
        {fmtNaira(r.total_amount ?? r.total)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (r) => <Badge label={r.status} color={statusColor(r.status)} dot />,
  },
  {
    key: 'created_at',
    label: 'Date & Time',
    render: (r) => (
      <div>
        <div className="text-dark fw-medium" style={{ fontSize: '0.82rem' }}>
          {r.created_at ? fmtDate(r.created_at) : (r.date || '—')}
        </div>
        <div className="text-muted fs-xs">
          {r.time_ago || (r.created_at ? formatTimeAgo(r.created_at) : (r.time || '—'))}
        </div>
      </div>
    ),
  },
]

const productSoldColumns = [
  {
    key: 'name',
    label: 'Product',
    render: (r) => (
      <div>
        <p className="fw-bold text-dark mb-0" style={{ fontSize: '0.86rem' }}>{r.name}</p>
        {r.sku && (
          <span className="badge bg-light text-secondary border font-monospace mt-0.5" style={{ fontSize: '0.68rem' }}>
            {r.sku}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'sold',
    label: 'Units Sold',
    align: 'right',
    render: (r) => (
      <span className="badge bg-light text-dark border px-2.5 py-1 fw-bold" style={{ fontSize: '0.78rem' }}>
        {Number(r.units_sold ?? r.sold ?? r.qty_sold ?? 0).toLocaleString()} units
      </span>
    ),
  },
  {
    key: 'revenue',
    label: 'Total Revenue',
    align: 'right',
    render: (r) => (
      <span className="fw-bold text-success font-monospace" style={{ fontSize: '0.9rem' }}>
        {fmtNaira(r.total_revenue ?? r.revenue)}
      </span>
    ),
  },
]

const lowStockColumns = [
  {
    key: 'name',
    label: 'Product Name',
    render: (r) => (
      <div>
        <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name}</div>
        {r.category && <span className="text-muted fs-xs">{r.category}</span>}
      </div>
    ),
  },
  {
    key: 'sku',
    label: 'SKU',
    render: (r) => (
      <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.72rem' }}>
        {r.sku || '—'}
      </span>
    ),
  },
  {
    key: 'stock',
    label: 'Current Stock',
    align: 'right',
    render: (r) => {
      const qty = Number(r.stock ?? r.qty ?? 0)
      const isCritical = qty <= 0
      return (
        <span
          className="badge"
          style={{
            backgroundColor: isCritical ? '#FFE4E6' : '#FEF3C7',
            color: isCritical ? '#BE123C' : '#B45309',
            border: isCritical ? '1px solid #FECDD3' : '1px solid #FDE68A',
            fontWeight: 800,
            fontSize: '0.75rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '9999px',
          }}
        >
          {qty} {r.unit || 'units'}
        </span>
      )
    },
  },
  {
    key: 'reorder',
    label: 'Reorder Level',
    align: 'right',
    render: (r) => (
      <span className="text-muted fw-bold font-monospace">
        {r.low_stock_threshold ?? r.reorder_qty ?? '—'}
      </span>
    ),
  },
]

const deliveryColumns = [
  {
    key: 'ref',
    label: 'Delivery Ref',
    render: (r) => (
      <span
        className="fw-bold font-monospace"
        style={{
          backgroundColor: '#F0F9FF',
          color: '#0369A1',
          padding: '0.25rem 0.6rem',
          borderRadius: '0.4rem',
          border: '1px solid #BAE6FD',
          fontSize: '0.78rem',
        }}
      >
        {r.delivery_ref || r.id}
      </span>
    ),
  },
  {
    key: 'customer',
    label: 'Recipient / Customer',
    render: (r) => <div className="fw-semibold text-dark">{r.customer_name || r.customer || '—'}</div>,
  },
  {
    key: 'driver',
    label: 'Assigned Driver',
    render: (r) => (
      <div className="d-flex align-items-center gap-1.5">
        <i className="ri-steering-line text-muted" />
        <span className="fw-medium text-dark">{r.driver || 'Unassigned'}</span>
      </div>
    ),
  },
  {
    key: 'zone',
    label: 'Delivery Zone',
    render: (r) => (
      <span className="badge bg-light text-secondary border" style={{ fontSize: '0.72rem' }}>
        {r.zone || 'Default'}
      </span>
    ),
  },
  {
    key: 'eta',
    label: 'Estimated Time',
    align: 'right',
    render: (r) => (
      <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.84rem' }}>
        {r.eta ? `${r.eta} mins` : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Dispatch Status',
    render: (r) => <Badge label={(r.status || '').replace(/_/g, ' ')} color={statusColor(r.status)} dot />,
  },
]

const staffColumns = [
  {
    key: 'name',
    label: 'Staff Member',
    render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name}</div>,
  },
  {
    key: 'role',
    label: 'Designation / Role',
    render: (r) => (
      <span className="badge bg-light text-secondary border text-capitalize" style={{ fontSize: '0.72rem' }}>
        {String(r.role || 'Staff').replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    key: 'shift',
    label: 'Assigned Shift',
    render: (r) => <span className="text-muted fw-medium">{r.shift || 'Morning Shift'}</span>,
  },
  {
    key: 'clock_in',
    label: 'Clock In Time',
    render: (r) => (
      <span className="font-monospace text-dark fw-semibold">
        {r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Attendance',
    render: (r) => <Badge label={(r.status || '').replace(/_/g, ' ')} color={statusColor(r.status)} dot />,
  },
]

function useApexChart(ref, optionsFn, deps = []) {
  useEffect(() => {
    if (!ref.current || !window.ApexCharts) return
    ref.current.innerHTML = ''
    const chart = new window.ApexCharts(ref.current, optionsFn())
    chart.render()
    return () => chart.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ── Shared loading skeleton ───────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="py-5 text-center text-muted">
      <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
      Loading live data…
    </div>
  )
}

function TabError({ onRetry }) {
  return (
    <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mt-2">
      <i className="ri-wifi-off-line fs-4" />
      <div className="flex-grow-1">
        <strong>Could not load dashboard data.</strong>
        <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
      </div>
      <button className="btn btn-sm btn-outline-warning" onClick={onRetry}>Retry</button>
    </div>
  )
}

// ── Tab 1: Overview Tab (Executive Summary) ───────────────────────────────────

function OverviewTab() {
  const { hasRole } = useAuth()
  const revenueRef  = useRef(null)
  const ordersRef   = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/dashboard/overview')
      setData(res.data)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const weekDays   = data?.charts?.week_revenue?.map(r => r.label) ?? []
  const revenueArr = data?.charts?.week_revenue?.map(r => Number(r.revenue)) ?? []
  const ordersArr  = data?.charts?.week_orders?.map(r => Number(r.orders)) ?? []
  const pipeline   = data?.pipeline ?? {}
  const kpis       = data?.kpis ?? {}

  useApexChart(revenueRef, () => ({
    chart:      { type: 'area', height: 150, toolbar: { show: false }, sparkline: { enabled: false } },
    series:     [{ name: 'Revenue (₦)', data: revenueArr }],
    dataLabels: { enabled: false },
    stroke:     { curve: 'smooth', width: 2 },
    fill:       { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02 } },
    colors:     ['#143c2d'],
    xaxis:      { categories: weekDays, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '11px' } } },
    yaxis:      { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k`, style: { fontSize: '11px' } } },
    grid:       { borderColor: '#EFECE6', strokeDashArray: 3, padding: { top: 0, bottom: 0 } },
    tooltip:    { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [revenueArr.join()])

  useApexChart(ordersRef, () => ({
    chart:       { type: 'bar', height: 150, toolbar: { show: false } },
    series:      [{ name: 'Orders', data: ordersArr }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
    dataLabels:  { enabled: false },
    colors:      ['#F59E0B'],
    xaxis:       { categories: weekDays, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '11px' } } },
    yaxis:       { labels: { style: { fontSize: '11px' } } },
    grid:       { borderColor: '#EFECE6', strokeDashArray: 3, padding: { top: 0, bottom: 0 } },
  }), [ordersArr.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const recentOrders        = data?.recent_orders ?? []
  const topProducts         = data?.top_products ?? []
  const lowStock            = data?.low_stock ?? []
  const activeDeliveries    = data?.active_deliveries ?? []
  const aiConvs             = data?.recent_convs ?? []
  const activeCustomersList = data?.active_customers_list ?? []
  const staffTodayList      = data?.staff_today ?? []

  const openOrders = () => setModal({
    title: "Today's Orders", subtitle: 'Most recent orders across all sales channels',
    icon: 'ri-shopping-cart-2-line', columns: orderColumns, rows: recentOrders,
  })
  const openPending = () => setModal({
    title: 'Pending Orders', subtitle: 'Confirmed / processing — awaiting fulfillment',
    icon: 'ri-time-line', columns: orderColumns,
    rows: recentOrders.filter(o => ['new_order', 'processing', 'pending'].includes(o.status)),
  })
  const openDeliveries = () => setModal({
    title: 'Active Deliveries', subtitle: 'Currently dispatched or en route',
    icon: 'ri-bike-line', columns: deliveryColumns, rows: activeDeliveries,
  })
  const openLowStock = () => setModal({
    title: 'Low Stock Alerts', subtitle: 'At or below reorder threshold',
    icon: 'ri-alert-line', columns: lowStockColumns, rows: lowStock,
  })
  const openActiveCustomers = () => setModal({
    title: 'Active Customers', subtitle: 'Ordered in the last 30 days, by spend',
    icon: 'ri-user-3-line',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'orders', label: 'Orders', align: 'right' },
      { key: 'spent', label: 'Total Spent', align: 'right', render: (r) => fmtNaira(r.spent) },
    ],
    rows: activeCustomersList,
  })
  const openStaffToday = () => setModal({
    title: 'Staff on Duty', subtitle: "Today's attendance log",
    icon: 'ri-team-line', columns: staffColumns, rows: staffTodayList,
  })
  const openWeekRevenue = () => setModal({
    title: 'Revenue This Week', subtitle: 'Daily gross receipts',
    icon: 'ri-line-chart-line',
    columns: [{ key: 'label', label: 'Day' }, { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) }],
    rows: data?.charts?.week_revenue ?? [],
  })
  const openWeekOrders = () => setModal({
    title: 'Orders Per Day', subtitle: 'Volume across the last 7 days',
    icon: 'ri-bar-chart-grouped-line',
    columns: [{ key: 'label', label: 'Day' }, { key: 'orders', label: 'Orders', align: 'right' }],
    rows: data?.charts?.week_orders ?? [],
  })

  const pipelineChips = [
    { label: 'Confirmed',        count: pipeline.confirmed   ?? 0, icon: 'ri-time-line',             bg: '#fef3c7', txt: '#b45309', border: '#fde68a', link: '/orders',                   roles: null },
    { label: 'Preparing',        count: pipeline.preparing   ?? 0, icon: 'ri-archive-stack-line',    bg: '#e0f2fe', txt: '#0369a1', border: '#bae6fd', link: '/orders',                   roles: null },
    { label: 'Dispatched',       count: pipeline.dispatched  ?? 0, icon: 'ri-truck-line',            bg: '#f3e8ff', txt: '#7e22ce', border: '#e9d5ff', link: '/deliveries/active',        roles: ['superadmin','admin','manager','delivery_manager'] },
    { label: 'Delivered',        count: pipeline.delivered   ?? 0, icon: 'ri-checkbox-circle-line',  bg: '#dcfce7', txt: '#15803d', border: '#86efac', link: '/orders',                   roles: null },
    { label: 'Returns',          count: pipeline.returned    ?? 0, icon: 'ri-arrow-go-back-line',    bg: '#ffe4e6', txt: '#be123c', border: '#fecdd3', link: '/orders/refunds',           roles: ['superadmin','admin','manager'] },
    { label: 'AI Inquiries',     count: kpis.pending_ai      ?? 0, icon: 'ri-robot-line',            bg: '#ccfbf1', txt: '#0f766e', border: '#99f6e4', link: '/chef-bems/conversations',  roles: ['superadmin','admin','manager','kitchen_staff'] },
  ]

  return (
    <>
      {/* 6 Executive Summary KPI Cards */}
      <div className="row g-2 mb-2.5">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Today's Revenue"   value={fmtNaira(kpis.revenue_today)}         sub={`${kpis.orders_today ?? 0} orders today`}        riIcon="ri-money-dollar-circle-line" color="green" onClick={openOrders} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Pending Orders"    value={kpis.pending_orders ?? 0}              sub={`${kpis.ready_dispatch ?? 0} ready for dispatch`} riIcon="ri-shopping-cart-2-line"    color="amber" onClick={openPending} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Deliveries" value={kpis.active_deliveries ?? 0}           sub={`${kpis.en_route ?? 0} en route now`}             riIcon="ri-bike-line"               color="blue" onClick={openDeliveries} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Low Stock Alerts"  value={kpis.low_stock_alerts ?? 0}             sub="Requires restocking"                              riIcon="ri-alert-line"              color="red" onClick={openLowStock} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Customers"  value={(kpis.active_customers ?? 0).toLocaleString()} sub={`↑ ${kpis.new_this_week ?? 0} new this week`}  riIcon="ri-user-3-line"             color="purple" onClick={openActiveCustomers} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Staff on Duty"     value={kpis.staff_on_duty ?? 0}               sub={`${kpis.staff_absent ?? 0} absent today`}         riIcon="ri-team-line"               color="teal" onClick={openStaffToday} />
        </div>
      </div>

      {/* Pipeline chips */}
      <div className="row g-2 mb-2.5">
        {pipelineChips.filter(({ roles }) => !roles || hasRole(...roles))
        .map(({ label, count, icon, bg, txt, border, link }) => (
          <div className="col-6 col-sm-4 col-xl" key={label} style={{ minWidth: 0 }}>
            <Link to={link} className="text-decoration-none d-block">
              <div className="card mb-0" style={{ borderRadius: '0.625rem', border: '1px solid #EFECE6', transition: 'all 0.15s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div className="card-body d-flex align-items-center gap-2 py-2 px-2.5">
                  <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 26, height: 26, borderRadius: '0.5rem', backgroundColor: bg, color: txt, border: `1px solid ${border}` }}>
                    <i className={icon} style={{ fontSize: 13 }} />
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex align-items-baseline gap-1.5">
                      <span className="fw-black font-display text-dark" style={{ fontSize: '0.95rem', lineHeight: 1 }}>{count}</span>
                      <span className="text-muted fw-semibold text-truncate" style={{ fontSize: '0.68rem', letterSpacing: '0.02em' }}>{label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-2.5 mb-2.5">
        <div className="col-xl-8">
          <div className="card mb-0 h-100 chart-panel-clickable" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }} onClick={openWeekRevenue} role="button" tabIndex={0}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.92rem' }}>Revenue This Week</h6>
                  <p className="text-muted fw-medium mb-0" style={{ fontSize: '0.72rem' }}>Daily gross receipts in Naira (₦) · click for details</p>
                </div>
              </div>
              <div ref={revenueRef} />
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card mb-0 h-100 chart-panel-clickable" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }} onClick={openWeekOrders} role="button" tabIndex={0}>
            <div className="card-body p-3">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.92rem' }}>Orders Per Day</h6>
              <p className="text-muted fw-medium mb-2" style={{ fontSize: '0.72rem' }}>Volume across active days · click for details</p>
              <div ref={ordersRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="row g-2.5 mb-3">
        <div className="col-xl-4">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center gap-2">
              <i className="ri-flashlight-line text-warning" style={{ fontSize: 16 }} />
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Quick Actions</h6>
            </div>
            <div className="card-body p-2.5">
              <div className="row g-1.5">
                {[
                  { label: 'New Order',     icon: 'ri-add-circle-line',        to: '/orders',              primary: true,  roles: null },
                  { label: 'POS Terminal',  icon: 'ri-store-2-line',           to: '/pos',                 primary: false, roles: ['superadmin','admin','manager','cashier'] },
                  { label: 'Stock In',      icon: 'ri-archive-stack-line',     to: '/inventory/stock-in',  primary: false, roles: ['superadmin','admin','manager','kitchen_staff'] },
                  { label: 'Restock Cal',   icon: 'ri-calendar-event-line',    to: '/inventory/schedule',  primary: false, roles: ['superadmin','admin','manager','kitchen_staff'] },
                  { label: 'Add Product',   icon: 'ri-price-tag-3-line',       to: '/products/add',        primary: false, roles: ['superadmin','admin','manager'] },
                  { label: 'Invite Member', icon: 'ri-mail-send-line',         to: '/onboarding?tab=onboarding', primary: false, roles: ['superadmin','admin','manager'] },
                  { label: 'Team Directory', icon: 'ri-team-line',             to: '/onboarding',          primary: false, roles: ['superadmin','admin','manager'] },
                  { label: 'Sales Report',  icon: 'ri-bar-chart-grouped-line', to: '/reports/sales',       primary: false, roles: ['superadmin','admin','manager','accountant'] },
                  { label: 'Finance',       icon: 'ri-bank-card-line',         to: '/accounts/overview',   primary: false, roles: ['superadmin','admin','manager','accountant'] },
                  { label: 'Deliveries',    icon: 'ri-bike-line',              to: '/deliveries/active',   primary: false, roles: ['superadmin','admin','manager','delivery_manager'] },
                ].filter(({ roles }) => !roles || hasRole(...roles))
                .map(({ label, icon, to, primary }) => (
                  <div className="col-6" key={label}>
                    <Link to={to} className="btn w-100 d-flex align-items-center justify-content-start gap-1.5 py-1.5 px-2 text-decoration-none text-truncate"
                      style={{ backgroundColor: primary ? '#143c2d' : '#FAF8F5', color: primary ? '#FFFFFF' : '#1F2937', border: primary ? '1px solid #143c2d' : '1px solid #EFECE6', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s ease' }}>
                      <i className={`${icon} ${primary ? 'text-white' : 'text-success'}`} style={{ fontSize: 13 }} />
                      <span className="text-truncate">{label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Recent Orders</h6>
              <Link to="/orders" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>View all →</Link>
            </div>
            <div className="card-body p-0">
              {recentOrders.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No orders yet today.</p>
              ) : (
                <Table>
                  <Thead><Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th></Thead>
                  <Tbody>
                    {recentOrders.map((o) => (
                      <Tr key={o.id}>
                        <Td><Link to={`/orders/${o.id}`} className="fw-bold text-dark text-decoration-none font-display" style={{ fontSize: '0.78rem' }}>{o.order_ref || o.id}</Link></Td>
                        <Td className="fw-semibold text-dark" style={{ fontSize: '0.78rem' }}>{o.customer_name || o.customer}</Td>
                        <Td className="text-muted" style={{ fontSize: '0.75rem' }}>{o.item_count ?? o.items ?? 1}</Td>
                        <Td className="fw-bold font-display text-dark" style={{ fontSize: '0.78rem' }}>{fmtNaira(o.total_amount ?? o.total)}</Td>
                        <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                        <Td className="text-muted" style={{ fontSize: '0.72rem' }}>{o.time_ago || formatTimeAgo(o.created_at) || o.time}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist: Top Products, Active Deliveries, Low Stock */}
      <div className="row g-2.5 mb-3">
        <div className="col-xl-4 col-md-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-fire-line text-danger" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Top Selling Produce</h6>
              </div>
            </div>
            <div className="card-body p-0">
              {topProducts.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No sales data yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.76rem' }}>
                    <thead className="bg-light text-muted border-bottom" style={{ fontSize: '0.68rem' }}>
                      <tr><th className="ps-3 py-2">PRODUCT</th><th className="text-center py-2">SOLD</th><th className="text-end pe-3 py-2">REVENUE</th></tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 5).map((p, idx) => (
                        <tr key={p.sku || idx}>
                          <td className="ps-3 py-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge rounded-pill bg-light text-dark fw-bold border" style={{ fontSize: '0.65rem' }}>#{idx + 1}</span>
                              <div className="min-w-0">
                                <div className="fw-bold text-dark text-truncate" style={{ maxWidth: 140 }}>{p.name}</div>
                                <div className="text-muted" style={{ fontSize: '0.65rem' }}>{p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-2 fw-semibold text-dark">{p.units_sold ?? p.sold}</td>
                          <td className="text-end pe-3 py-2 fw-bold text-success font-display">{fmtNaira(p.total_revenue ?? p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-bike-line text-primary" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Active Deliveries</h6>
              </div>
              <Link to="/deliveries/active" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Dispatch Hub →</Link>
            </div>
            <div className="card-body p-2.5">
              {activeDeliveries.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No active deliveries.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {activeDeliveries.slice(0, 4).map((d) => (
                    <div key={d.id} className="p-2 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FAF8F5', border: '1px solid #EFECE6' }}>
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <div className="rounded-circle d-flex align-items-center justify-content-center bg-white border flex-shrink-0" style={{ width: 30, height: 30 }}>
                          <i className="ri-e-bike-2-line text-success" style={{ fontSize: 14 }} />
                        </div>
                        <div className="min-w-0">
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="fw-bold text-dark text-truncate" style={{ fontSize: '0.76rem' }}>{d.customer}</span>
                            <span className="text-muted" style={{ fontSize: '0.68rem' }}>({d.delivery_ref || d.id})</span>
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: '0.68rem' }}>
                            <i className="ri-map-pin-line me-1" />{d.zone || '—'} • <span className="fw-semibold text-dark">{d.driver || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0 ps-2">
                        <span className="badge" style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: d.status === 'en_route' ? '#e0f2fe' : d.status === 'awaiting_pickup' ? '#fef3c7' : '#f1f5f9', color: d.status === 'en_route' ? '#0369a1' : d.status === 'awaiting_pickup' ? '#b45309' : '#475569', border: '1px solid currentColor' }}>
                          {d.status?.replace(/_/g, ' ')}
                        </span>
                        {d.eta && <div className="text-muted mt-0.5" style={{ fontSize: '0.65rem' }}>ETA: {d.eta} min</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-12">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-alert-line text-danger" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Low Stock Watchlist</h6>
              </div>
              <Link to="/inventory/stock-in" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Stock In →</Link>
            </div>
            <div className="card-body p-2.5">
              {lowStock.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">All items are well stocked ✓</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {lowStock.slice(0, 5).map((item) => (
                    <div key={item.id || item.sku} className="p-2 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FFFDF5', border: '1px solid #FEF3C7' }}>
                      <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.76rem' }}>{item.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                          SKU: <span className="font-monospace">{item.sku}</span> • Reorder: {item.low_stock_threshold ?? item.reorder}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold" style={{ fontSize: '0.72rem' }}>
                          {item.stock ?? item.qty} left
                        </span>
                        <div className="mt-1">
                          <Link to="/inventory/stock-in" className="btn btn-xs py-0.5 px-2 btn-outline-success fw-bold" style={{ fontSize: '0.65rem', borderRadius: '0.375rem' }}>Restock</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chef Bems AI Activity */}
      <div className="row g-2.5 mb-3">
        <div className="col-12">
          <div className="card mb-0" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-robot-line text-info" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Chef Bems AI Inquiries</h6>
              </div>
              <Link to="/chef-bems/conversations" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>View All →</Link>
            </div>
            <div className="card-body p-2.5">
              {aiConvs.length === 0 ? (
                <p className="text-muted text-center py-3 fs-sm">No AI conversations today.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {aiConvs.slice(0, 3).map((conv, i) => (
                    <div key={i} className="p-2 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FAF8F5', border: '1px solid #EFECE6' }}>
                      <div className="min-w-0 me-2">
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="fw-bold text-dark text-truncate" style={{ fontSize: '0.76rem' }}>{conv.customer}</span>
                          <span className="text-muted" style={{ fontSize: '0.68rem' }}>• {conv.time_ago || conv.time}</span>
                        </div>
                        <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>"{conv.query}"</div>
                      </div>
                      <span className="badge flex-shrink-0" style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: conv.status === 'resolved' || conv.status === 'completed' ? '#dcfce7' : '#fef3c7', color: conv.status === 'resolved' || conv.status === 'completed' ? '#15803d' : '#b45309', border: '1px solid currentColor' }}>
                        {conv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} items`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 2: Sales Tab (Commercial Performance) ──────────────────────────────────

function SalesTab() {
  const revWeekRef  = useRef(null)
  const revMonthRef = useRef(null)
  const categoryRef = useRef(null)
  const paymentRef  = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/sales')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const weekDays   = data?.charts?.daily_7d?.map(r => r.day_label) ?? []
  const revenueW   = data?.charts?.daily_7d?.map(r => Number(r.revenue)) ?? []
  const months6    = data?.charts?.monthly_6m?.map(r => r.month) ?? []
  const incomeM    = data?.charts?.monthly_6m?.map(r => Number(r.revenue)) ?? []
  const catLabels  = data?.charts?.by_category?.map(r => r.category) ?? []
  const catValues  = data?.charts?.by_category?.map(r => Number(r.revenue)) ?? []
  const payLabels  = data?.charts?.by_payment?.map(r => r.method) ?? []
  const payValues  = data?.charts?.by_payment?.map(r => Number(r.amount)) ?? []
  const sources    = data?.charts?.by_source ?? []
  const kpis       = data?.kpis ?? {}

  useApexChart(revWeekRef, () => ({
    chart: { type: 'area', height: 210, toolbar: { show: false } },
    series: [{ name: 'Revenue', data: revenueW }],
    dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: ['#0ab39c'],
    xaxis: { categories: weekDays, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [revenueW.join()])

  useApexChart(revMonthRef, () => ({
    chart: { type: 'bar', height: 210, toolbar: { show: false } },
    series: [{ name: 'Revenue', data: incomeM }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false }, colors: ['#405189'],
    xaxis: { categories: months6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000000).toFixed(1)}M` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [incomeM.join()])

  useApexChart(categoryRef, () => ({
    chart: { type: 'donut', height: 210 },
    series: catValues.length ? catValues : [1],
    labels: catLabels.length ? catLabels : ['No data'],
    colors: ['#0ab39c','#405189','#f7b84b','#f06548','#3577f1','#299cdb'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    tooltip: { y: { formatter: (v) => fmtNaira(v) } },
  }), [catValues.join()])

  useApexChart(paymentRef, () => ({
    chart: { type: 'donut', height: 210 },
    series: payValues.length ? payValues : [1],
    labels: payLabels.length ? payLabels.map(l => l.replace(/_/g, ' ').toUpperCase()) : ['No data'],
    colors: ['#405189','#0ab39c','#f7b84b','#f06548'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    tooltip: { y: { formatter: (v) => fmtNaira(v) } },
  }), [payValues.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const topProducts  = data?.top_products ?? []
  const returnsTodayList = data?.returns_today_list ?? []
  const skusSoldList = data?.skus_sold_list ?? []

  const openReturnsToday = () => setModal({
    title: 'Returns & Refunds Today', subtitle: 'Refund requests submitted today',
    icon: 'ri-arrow-go-back-line',
    columns: [
      { key: 'order_id', label: 'Order' },
      { key: 'product', label: 'Product', render: (r) => r.product || '—' },
      { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' },
      { key: 'refund_amount', label: 'Amount', align: 'right', render: (r) => fmtNaira(r.refund_amount) },
      { key: 'status', label: 'Status', render: (r) => <Badge label={r.status} color={statusColor(r.status)} /> },
    ],
    rows: returnsTodayList,
  })
  const openSkusSold = () => setModal({
    title: 'Unique SKUs Sold Today', subtitle: 'Products with completed sales today',
    icon: 'ri-price-tag-3-line', columns: productSoldColumns, rows: skusSoldList,
  })
  const openDaily7d = () => setModal({
    title: 'Revenue This Week (7 Days)', subtitle: 'Daily revenue receipts',
    icon: 'ri-line-chart-line',
    columns: [{ key: 'day_label', label: 'Day' }, { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) }],
    rows: data?.charts?.daily_7d ?? [],
  })
  const openMonthly6m = () => setModal({
    title: 'Monthly Revenue History (Last 6 Months)', subtitle: 'Monthly sales totals',
    icon: 'ri-bar-chart-grouped-line',
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) },
      { key: 'orders', label: 'Orders', align: 'right' },
    ],
    rows: data?.charts?.monthly_6m ?? [],
  })
  const openByCategory = () => setModal({
    title: 'Sales by Category', subtitle: 'This month category distribution',
    icon: 'ri-pie-chart-line',
    columns: [{ key: 'category', label: 'Category' }, { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) }],
    rows: data?.charts?.by_category ?? [],
  })
  const openByPayment = () => setModal({
    title: 'Sales by Payment Method', subtitle: 'This month tender breakdown',
    icon: 'ri-bank-card-line',
    columns: [
      { key: 'method', label: 'Method', render: (r) => (r.method || '').replace(/_/g, ' ') },
      { key: 'count', label: 'Orders', align: 'right' },
      { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmtNaira(r.amount) },
    ],
    rows: data?.charts?.by_payment ?? [],
  })

  return (
    <>
      {/* 4 Unique Commercial KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Monthly Sales Volume" value={fmtNaira(kpis.month_revenue)} sub={`${kpis.orders_month ?? 0} orders this month`} riIcon="ri-line-chart-line" color="green" onClick={openMonthly6m} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Avg Order Value (AOV)" value={fmtNaira(kpis.avg_order_value)} sub="Average transaction spend" riIcon="ri-funds-line" color="amber" onClick={openDaily7d} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Active SKUs Moving" value={kpis.skus_sold ?? 0} sub="Unique products sold today" riIcon="ri-price-tag-3-line" color="teal" onClick={openSkusSold} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Returns & Refunds" value={kpis.returns_today ?? 0} sub={`${fmtNaira(kpis.returns_value)} refunded today`} riIcon="ri-arrow-go-back-line" color="red" onClick={openReturnsToday} />
        </div>
      </div>

      {/* Revenue Trends */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openDaily7d} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.9rem' }}>7-Day Revenue Velocity</h6>
                <span className="badge bg-light text-muted border fs-xs">Daily Gross</span>
              </div>
              <p className="text-muted fs-xs mb-2">Daily receipts trend over the past 7 days</p>
              <div ref={revWeekRef} />
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openMonthly6m} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.9rem' }}>6-Month Revenue Trajectory</h6>
                <span className="badge bg-light text-muted border fs-xs">Monthly Inflows</span>
              </div>
              <p className="text-muted fs-xs mb-2">Month-on-month sales performance comparison</p>
              <div ref={revMonthRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Category, Payment Tender & Sales Channels */}
      <div className="row g-3 mb-3">
        <div className="col-xl-4 col-md-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openByCategory} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-body p-3">
              <h6 className="fw-bold font-display text-dark mb-1" style={{ fontSize: '0.9rem' }}>Revenue by Category</h6>
              <p className="text-muted fs-xs mb-2">Share of sales across product lines</p>
              <div ref={categoryRef} />
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openByPayment} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-body p-3">
              <h6 className="fw-bold font-display text-dark mb-1" style={{ fontSize: '0.9rem' }}>Payment Methods</h6>
              <p className="text-muted fs-xs mb-2">Cash, Transfer, POS &amp; Card tender mix</p>
              <div ref={paymentRef} />
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-12">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Sales Channels</h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle fs-xs">This Month</span>
            </div>
            <div className="card-body p-3">
              {sources.length === 0 ? (
                <div className="text-center py-4 text-muted fs-sm">No sales channel data recorded.</div>
              ) : (
                <div className="d-flex flex-column gap-2.5">
                  {sources.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FAF8F5', border: '1px solid #EFECE6' }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                          <i className={s.source?.toLowerCase().includes('pos') ? 'ri-store-2-line text-success' : 'ri-global-line text-primary'} style={{ fontSize: 16 }} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark fs-sm">{s.source || 'Direct / Web'}</div>
                          <div className="text-muted fs-xs">{s.count ?? 0} orders processed</div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success font-display fs-sm">{fmtNaira(s.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Products Commercial Roster */}
      <div className="card mb-0" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
        <div className="card-header py-2.5 px-3 d-flex align-items-center justify-content-between border-bottom">
          <div className="d-flex align-items-center gap-2">
            <i className="ri-fire-line text-danger" style={{ fontSize: 16 }} />
            <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Top Revenue Generating Products</h6>
          </div>
          <Link to="/products/list" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Manage Catalog →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Rank</Th><Th>Product &amp; SKU</Th><Th className="text-center">Units Sold</Th><Th className="text-end pe-3">Gross Revenue</Th></Thead>
            <Tbody>
              {topProducts.length === 0 ? (
                <Tr><Td colSpan={4} className="text-center text-muted py-4 fs-sm">No sales data recorded.</Td></Tr>
              ) : topProducts.map((p, i) => (
                <Tr key={p.sku || i}>
                  <Td><span className="badge rounded-pill bg-light text-dark fw-bold border" style={{ fontSize: '0.7rem' }}>#{i + 1}</span></Td>
                  <Td>
                    <p className="fw-bold text-dark fs-sm mb-0">{p.name}</p>
                    <span className="text-muted fs-xs font-monospace">{p.sku}</span>
                  </Td>
                  <Td className="text-center fw-semibold fs-sm">{p.units_sold ?? p.sold}</Td>
                  <Td className="text-end pe-3 fw-bold text-success font-display fs-sm">{fmtNaira(p.total_revenue ?? p.revenue)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} records`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 3: Finance Tab (Accounts, P&L, Dues) ──────────────────────────────────

function FinanceTab() {
  const incomeRef = useRef(null)
  const profitRef = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/finance')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const months6  = data?.charts?.monthly_6m?.map(r => r.month) ?? []
  const incomeM  = data?.charts?.monthly_6m?.map(r => Number(r.income)) ?? []
  const expensesM = data?.charts?.monthly_6m?.map(r => Number(r.expenses)) ?? []
  const kpis     = data?.kpis ?? {}
  const accounts = data?.accounts ?? []
  const dues     = data?.supplier_dues ?? []
  const productProfitability = data?.product_profitability ?? []

  useApexChart(incomeRef, () => ({
    chart: { type: 'line', height: 210, toolbar: { show: false } },
    series: [{ name: 'Income', data: incomeM }, { name: 'Expenses', data: expensesM }],
    stroke: { curve: 'smooth', width: [2, 2] },
    colors: ['#0ab39c', '#f06548'],
    dataLabels: { enabled: false },
    xaxis: { categories: months6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top', fontSize: '11px' },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [incomeM.join(), expensesM.join()])

  useApexChart(profitRef, () => ({
    chart: { type: 'bar', height: 210, toolbar: { show: false } },
    series: [{ name: 'Net Profit', data: incomeM.map((inc, i) => inc - (expensesM[i] ?? 0)) }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', colors: { ranges: [{ from: -999999, to: 0, color: '#f06548' }] } } },
    dataLabels: { enabled: false }, colors: ['#0ab39c'],
    xaxis: { categories: months6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [incomeM.join(), expensesM.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const monthlyColumns = [
    { key: 'month', label: 'Month' },
    { key: 'income', label: 'Income', align: 'right', render: (r) => fmtNaira(r.income) },
    { key: 'expenses', label: 'Expenses', align: 'right', render: (r) => fmtNaira(r.expenses) },
    { key: 'net', label: 'Net Profit', align: 'right', render: (r) => fmtNaira(Number(r.income || 0) - Number(r.expenses || 0)) },
  ]
  const openMonthly = (title, sub) => setModal({ title, subtitle: sub, icon: 'ri-line-chart-line', columns: monthlyColumns, rows: data?.charts?.monthly_6m ?? [] })
  const openAccounts = () => setModal({
    title: 'Bank Accounts Ledger', subtitle: 'Active corporate, retail settlement and operations accounts',
    icon: 'ri-bank-line',
    columns: [
      {
        key: 'account_name',
        label: 'Account Name',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.account_name || r.account}</div>,
      },
      {
        key: 'bank_name',
        label: 'Financial Institution',
        render: (r) => <span className="fw-medium text-dark">{r.bank_name || r.bank}</span>,
      },
      {
        key: 'account_type',
        label: 'Type',
        render: (r) => <span className="badge bg-light text-secondary border text-capitalize">{r.account_type || r.type || 'Checking'}</span>,
      },
      {
        key: 'balance',
        label: 'Available Balance',
        align: 'right',
        render: (r) => <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.9rem' }}>{fmtNaira(r.balance)}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => <Badge label={r.status || 'active'} color="green" dot />,
      },
    ],
    rows: accounts,
  })
  const openDues = () => setModal({
    title: 'Supplier Invoices Due', subtitle: 'Outstanding produce and supplies procurement payments',
    icon: 'ri-truck-line',
    columns: [
      {
        key: 'supplier',
        label: 'Supplier / Vendor',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.supplier_name || r.supplier || r.name}</div>,
      },
      {
        key: 'invoice_no',
        label: 'Invoice Ref',
        render: (r) => (
          <span className="badge bg-light text-dark font-monospace border" style={{ fontSize: '0.74rem' }}>
            {r.invoice_number || r.invoice_no || '—'}
          </span>
        ),
      },
      {
        key: 'due_date',
        label: 'Due Date',
        render: (r) => <span className="text-dark fw-medium">{fmtDate(r.due_date || r.due)}</span>,
      },
      {
        key: 'amount',
        label: 'Payable Amount',
        align: 'right',
        render: (r) => <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.9rem' }}>{fmtNaira(r.amount)}</span>,
      },
      {
        key: 'status',
        label: 'Payment Status',
        render: (r) => <Badge label={r.status || 'pending'} color={r.status === 'overdue' ? 'red' : 'amber'} dot />,
      },
    ],
    rows: dues,
  })

  return (
    <>
      {/* 4 Clean Core Financial Health KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Monthly Inflows" value={fmtNaira(kpis.month_revenue)} sub="Gross recorded receipts" riIcon="ri-money-dollar-circle-line" color="green" onClick={() => openMonthly('Monthly Inflows', 'Income by month, last 6 months')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Operating Expenses" value={fmtNaira(kpis.month_expenses)} sub="Total approved outflows" riIcon="ri-subtract-line" color="red" onClick={() => openMonthly('Monthly Expenses', 'Expenses by month, last 6 months')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Net Operating Profit" value={fmtNaira(kpis.net_profit)} sub={`${kpis.profit_margin ? Number(kpis.profit_margin).toFixed(1) + '%' : '0%'} operating margin`} riIcon="ri-funds-line" color="blue" onClick={() => openMonthly('Net Profit', 'Income vs. expenses, last 6 months')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Accounts Payable / Dues" value={fmtNaira(kpis.outstanding_dues)} sub={`${kpis.due_count ?? 0} supplier invoices pending`} riIcon="ri-bank-card-line" color="amber" onClick={openDues} />
        </div>
      </div>

      {/* Income vs Expenses & Net Profit Trend */}
      <div className="row g-3 mb-3">
        <div className="col-xl-7">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={() => openMonthly('Income vs Expenses', 'Last 6 months')} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.9rem' }}>Income vs Expenses</h6>
                <p className="text-muted fs-xs mb-0">6-Month financial trajectory</p>
              </div>
              <div className="d-flex gap-2">
                <span className="badge bg-success-subtle text-success border border-success-subtle fs-xs">● Income</span>
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-xs">● Expenses</span>
              </div>
            </div>
            <div className="card-body p-3">
              <div ref={incomeRef} />
            </div>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={() => openMonthly('Net Profit by Month', 'Last 6 months')} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.9rem' }}>Net Profit by Month</h6>
              <p className="text-muted fs-xs mb-0">Monthly surplus / deficit</p>
            </div>
            <div className="card-body p-3">
              <div ref={profitRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Bank Accounts & Supplier Dues */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-bank-line text-primary" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Bank Accounts &amp; Liquidity</h6>
              </div>
              <span className="fw-bold text-success font-display fs-sm">Total: {fmtNaira(kpis.total_balance)}</span>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Account Name</Th><Th>Bank</Th><Th>Type</Th><Th className="text-end pe-3">Balance</Th></Thead>
                <Tbody>
                  {accounts.length === 0 ? (
                    <Tr><Td colSpan={4} className="text-center text-muted py-4 fs-sm">No bank accounts configured.</Td></Tr>
                  ) : accounts.map((a, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-bold text-dark fs-sm mb-0">{a.account_name || a.account}</p></Td>
                      <Td className="fs-sm text-muted">{a.bank_name || a.bank}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs border">{a.account_type || a.type}</span></Td>
                      <Td className="text-end pe-3 fw-bold text-success font-display fs-sm">{fmtNaira(a.balance)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-truck-line text-warning" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Supplier Payments Due</h6>
              </div>
              <Link to="/suppliers/payments" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>All Invoices →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Supplier</Th><Th>Amount</Th><Th>Due Date</Th><Th>Status</Th></Thead>
                <Tbody>
                  {dues.length === 0 ? (
                    <Tr><Td colSpan={4} className="text-center text-muted py-4 fs-sm">No outstanding dues ✓</Td></Tr>
                  ) : dues.map((s, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-semibold text-dark fs-sm mb-0">{s.name || s.supplier}</p></Td>
                      <Td className="fw-bold font-display text-danger fs-sm">{fmtNaira(s.amount)}</Td>
                      <Td className="fs-sm text-muted">{fmtDate(s.due_date || s.due)}</Td>
                      <Td><Badge label={(s.status||'').replace(/_/g,' ')} color={s.status==='overdue'?'red':'amber'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Product Profitability Analysis */}
      <div className="card mb-0" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
        <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="ri-scales-3-line text-success" style={{ fontSize: 16 }} />
            <div>
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Product Margins &amp; Unit Economics</h6>
              <p className="text-muted fs-xs mb-0">Cost price vs. selling price analysis (last 30 days)</p>
            </div>
          </div>
          <Link to="/products/list" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Pricing Catalog →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Product</Th><Th>Cost Price</Th><Th>Selling Price</Th><Th className="text-center">Units Sold</Th><Th className="text-center">Margin %</Th><Th className="text-end pe-3">Net Profit</Th></Thead>
            <Tbody>
              {productProfitability.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No sales data recorded in the last 30 days.</Td></Tr>
              ) : productProfitability.map((p, i) => (
                <Tr key={i}>
                  <Td>
                    <p className="fw-bold text-dark fs-sm mb-0">{p.name}</p>
                    <span className="text-muted fs-xs font-monospace">{p.sku}</span>
                  </Td>
                  <Td className="fs-sm text-muted">{fmtNaira(p.cost_price)}</Td>
                  <Td className="fs-sm fw-semibold text-dark">{fmtNaira(p.selling_price)}</Td>
                  <Td className="text-center fs-sm">{p.units_sold}</Td>
                  <Td className="text-center"><Badge label={`${p.margin_pct.toFixed(1)}%`} color={p.margin_pct >= 20 ? 'green' : p.margin_pct >= 0 ? 'amber' : 'red'} /></Td>
                  <Td className={`text-end pe-3 fw-bold font-display fs-sm ${p.profit < 0 ? 'text-danger' : 'text-success'}`}>{fmtNaira(p.profit)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} records`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 4: Inventory Tab (Stock Valuation & Reorder Alerts) ───────────────────

function InventoryTab() {
  const stockRef = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/inventory')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const catNames  = data?.charts?.value_by_category?.map(r => r.category) ?? []
  const catValues = data?.charts?.value_by_category?.map(r => Number(r.value)) ?? []
  const kpis      = data?.kpis ?? {}
  const lowStock  = data?.low_stock_items ?? []
  const invList   = data?.inventory_list ?? []
  const expiringBatches = data?.expiring_batches ?? []

  useApexChart(stockRef, () => ({
    chart: { type: 'bar', height: 210, toolbar: { show: false } },
    series: [{ name: 'Stock Value (₦)', data: catValues.length ? catValues : [0] }],
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: false }, colors: ['#405189'],
    xaxis: { categories: catNames.length ? catNames : ['No data'], axisBorder: { show: false } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => fmtNaira(v) } },
  }), [catValues.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const openInvList = (title, sub, rows = invList) => setModal({
    title, subtitle: sub, icon: 'ri-archive-stack-line',
    columns: [
      {
        key: 'name',
        label: 'Product Name',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name}</div>,
      },
      {
        key: 'sku',
        label: 'SKU',
        render: (r) => <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.72rem' }}>{r.sku || '—'}</span>,
      },
      {
        key: 'category',
        label: 'Category',
        render: (r) => <span className="badge bg-light text-dark border">{r.category || 'Produce'}</span>,
      },
      {
        key: 'stock',
        label: 'Stock on Hand',
        align: 'right',
        render: (r) => {
          const qty = Number(r.stock ?? r.qty ?? 0)
          return (
            <span
              className="badge"
              style={{
                backgroundColor: qty <= 0 ? '#FFE4E6' : qty <= 5 ? '#FEF3C7' : '#DCFCE7',
                color: qty <= 0 ? '#BE123C' : qty <= 5 ? '#B45309' : '#15803D',
                border: qty <= 0 ? '1px solid #FECDD3' : qty <= 5 ? '1px solid #FDE68A' : '1px solid #86EFAC',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              {qty} {r.unit || 'units'}
            </span>
          )
        },
      },
      {
        key: 'value',
        label: 'Stock Value',
        align: 'right',
        render: (r) => <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.88rem' }}>{fmtNaira(r.value ?? (r.stock ?? 0) * (r.unit_price || r.price || 0))}</span>,
      },
    ],
    rows,
  })
  const openLowStock = () => setModal({
    title: 'Below Reorder Level', subtitle: 'Products at or under safety reorder threshold',
    icon: 'ri-alert-line', columns: lowStockColumns, rows: lowStock,
  })
  const openExpiring = () => setModal({
    title: 'Expiring Batches (7 Days)', subtitle: 'Fresh produce batches nearing expiration date',
    icon: 'ri-timer-flash-line',
    columns: [
      {
        key: 'name',
        label: 'Product Name',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name}</div>,
      },
      {
        key: 'batch_no',
        label: 'Batch Number',
        render: (r) => <span className="badge bg-light text-dark font-monospace border">{r.batch_no || r.batch || '—'}</span>,
      },
      {
        key: 'quantity',
        label: 'Batch Qty',
        align: 'right',
        render: (r) => <span className="fw-bold text-dark">{r.quantity ?? r.qty ?? '—'} units</span>,
      },
      {
        key: 'expiry_date',
        label: 'Expiry Date',
        render: (r) => <span className="badge" style={{ backgroundColor: '#FFE4E6', color: '#BE123C', border: '1px solid #FECDD3', fontWeight: 700 }}>{fmtDate(r.expiry_date)}</span>,
      },
    ],
    rows: expiringBatches,
  })
  const openByCategory = () => setModal({
    title: 'Stock Valuation by Category', subtitle: 'Current inventory holding value per produce category',
    icon: 'ri-list-check-2',
    columns: [
      { key: 'category', label: 'Category', render: (r) => <div className="fw-bold text-dark">{r.category}</div> },
      { key: 'value', label: 'Holding Valuation', align: 'right', render: (r) => <span className="fw-bold text-dark font-monospace">{fmtNaira(r.value)}</span> },
    ],
    rows: data?.charts?.value_by_category ?? [],
  })

  return (
    <>
      {/* 4 Clean Actionable Inventory KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Total Stock Valuation" value={fmtNaira(kpis.total_value)} sub={`Across ${kpis.total_skus ?? 0} active SKUs`} riIcon="ri-store-line" color="green" onClick={openByCategory} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Below Reorder Level" value={`${kpis.low_stock_count ?? 0} items`} sub="Immediate action needed" riIcon="ri-alert-line" color="red" onClick={openLowStock} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Expiring (7 Days)" value={`${kpis.expiring_count ?? 0} batches`} sub="Check batch expiration" riIcon="ri-timer-flash-line" color="amber" onClick={openExpiring} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Zero Stock / Out" value={`${kpis.out_of_stock ?? 0} items`} sub="Zero quantity in stock" riIcon="ri-delete-bin-line" color="red" onClick={() => openInvList('Zero Stock Items', 'Products currently out of stock', invList.filter(i => Number(i.stock ?? i.qty) === 0))} />
        </div>
      </div>

      {/* Stock Value by Category & Low Stock Watchlist */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openByCategory} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-body p-3">
              <h6 className="fw-bold font-display text-dark mb-1" style={{ fontSize: '0.9rem' }}>Stock Value by Category</h6>
              <p className="text-muted fs-xs mb-2">Total monetary value of produce in warehouse</p>
              <div ref={stockRef} />
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-alert-line text-danger" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Low Stock Action Required</h6>
              </div>
              <Link to="/inventory/alerts" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>All Alerts →</Link>
            </div>
            <div className="card-body p-2.5">
              {lowStock.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">All inventory items are above reorder threshold ✓</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {lowStock.slice(0, 4).map((item) => (
                    <div key={item.id || item.sku} className="p-2 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FFFDF5', border: '1px solid #FEF3C7' }}>
                      <div>
                        <div className="fw-bold text-dark fs-sm">{item.name}</div>
                        <div className="text-muted fs-xs">
                          SKU: <span className="font-monospace">{item.sku}</span> • Reorder Threshold: {item.reorder_qty ?? item.low_stock_threshold ?? 5}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold fs-xs">
                          {item.stock ?? item.qty} left
                        </span>
                        <div className="mt-1">
                          <Link to="/inventory/stock-in" className="btn btn-xs py-0.5 px-2 btn-outline-success fw-bold" style={{ fontSize: '0.65rem', borderRadius: '0.375rem' }}>Restock</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Inventory Stock Directory */}
      <div className="card mb-0" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
        <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
          <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Warehouse Stock Ledger</h6>
          <Link to="/inventory/stock" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Full Inventory →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Product</Th><Th>Category</Th><Th className="text-center">Qty in Stock</Th><Th className="text-end">Valuation</Th><Th className="text-center pe-3">Status</Th></Thead>
            <Tbody>
              {invList.length === 0 ? (
                <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No inventory items found.</Td></Tr>
              ) : invList.slice(0, 10).map((item, i) => (
                <Tr key={item.id || i}>
                  <Td>
                    <p className="fw-bold text-dark fs-sm mb-0">{item.name}</p>
                    <span className="text-muted fs-xs font-monospace">{item.sku}</span>
                  </Td>
                  <Td className="text-muted fs-sm">{item.category || '—'}</Td>
                  <Td className="text-center fw-bold fs-sm">{item.stock ?? item.qty}</Td>
                  <Td className="text-end fw-bold font-display text-success fs-sm">{fmtNaira((item.stock ?? item.qty ?? 0) * (item.unit_price || item.price || 0))}</Td>
                  <Td className="text-center pe-3"><Badge label={(item.stock_status || (Number(item.stock ?? item.qty) <= 5 ? 'low' : 'in stock')).replace(/_/g, ' ')} color={item.stock_status === 'out_of_stock' || Number(item.stock ?? item.qty) === 0 ? 'red' : item.stock_status === 'low' || Number(item.stock ?? item.qty) <= 5 ? 'amber' : 'green'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} items`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 5: Operations Tab (Logistics, Drivers & Procurement) ──────────────────

function OperationsTab() {
  const deliveryRef = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/operations')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const breakdown = data?.delivery_breakdown ?? {}
  const kpis      = data?.kpis ?? {}

  useApexChart(deliveryRef, () => {
    const statuses = ['assigned','awaiting_pickup','en_route','delivered']
    const vals     = statuses.map(s => breakdown[s] ?? 0)
    return {
      chart: { type: 'donut', height: 210 },
      series: vals.some(v => v > 0) ? vals : [1],
      labels: ['Assigned', 'Awaiting Pickup', 'En Route', 'Delivered'],
      colors: ['#f7b84b','#405189','#0ab39c','#143c2d'],
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%' } } },
    }
  }, [JSON.stringify(breakdown)])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const deliveries = data?.active_deliveries ?? []
  const staffList  = data?.staff_today ?? []
  const purchaseOrders = data?.purchase_orders ?? []
  const driversOnDutyList = data?.drivers_on_duty_list ?? []
  const deliveryTimesList = data?.delivery_times_list ?? []

  const openDeliveries = () => setModal({ title: 'Active Deliveries', subtitle: 'Currently dispatched or en route', icon: 'ri-bike-line', columns: deliveryColumns, rows: deliveries })
  const openDrivers = () => setModal({
    title: 'Fleet Drivers on Duty', subtitle: 'Active dispatch riders and drivers available or en route',
    icon: 'ri-steering-2-line',
    columns: [
      {
        key: 'name',
        label: 'Driver Name',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name}</div>,
      },
      {
        key: 'vehicle_type',
        label: 'Vehicle Fleet',
        render: (r) => (
          <span className="badge bg-light text-secondary border text-capitalize">
            <i className="ri-e-bike-2-line me-1" />
            {r.vehicle_type || 'Motorcycle'}
          </span>
        ),
      },
      {
        key: 'zone',
        label: 'Primary Zone',
        render: (r) => <span className="badge bg-light text-dark border">{r.zone || 'Central'}</span>,
      },
      {
        key: 'rating',
        label: 'Driver Rating',
        align: 'right',
        render: (r) => (
          <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 800 }}>
            {r.rating ? `${r.rating} ★` : '5.0 ★'}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Duty Status',
        render: (r) => <Badge label={(r.status || 'available').replace(/_/g, ' ')} color={r.status === 'on_delivery' ? 'blue' : 'green'} dot />,
      },
    ],
    rows: driversOnDutyList,
  })
  const openAvgDeliveryTime = () => setModal({
    title: 'Completed Deliveries Speed Log', subtitle: "Today's delivered dispatches and transit duration log",
    icon: 'ri-time-line',
    columns: [
      {
        key: 'delivery_ref',
        label: 'Delivery Ref',
        render: (r) => (
          <span className="badge bg-light text-primary font-monospace border" style={{ fontSize: '0.74rem' }}>
            {r.delivery_ref || r.id || '—'}
          </span>
        ),
      },
      {
        key: 'dispatched_at',
        label: 'Dispatched At',
        render: (r) => (
          <span className="font-monospace text-dark">
            {r.dispatched_at ? new Date(r.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        ),
      },
      {
        key: 'delivered_at',
        label: 'Delivered At',
        render: (r) => (
          <span className="font-monospace text-dark">
            {r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        ),
      },
      {
        key: 'minutes',
        label: 'Transit Time',
        align: 'right',
        render: (r) => (
          <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: 800 }}>
            {r.minutes ? `${r.minutes} mins` : '—'}
          </span>
        ),
      },
    ],
    rows: deliveryTimesList,
  })
  const openStaffToday = () => setModal({ title: 'Staff Attendance Log', subtitle: 'Full shift attendance register', icon: 'ri-team-line', columns: staffColumns, rows: staffList })
  const openPurchaseOrders = () => setModal({
    title: 'Supplier Purchase Orders', subtitle: 'Procurement orders for fresh produce and packaging',
    icon: 'ri-shopping-bag-3-line',
    columns: [
      {
        key: 'po_ref',
        label: 'PO Ref',
        render: (r) => (
          <span className="fw-bold font-monospace text-primary" style={{ backgroundColor: '#F0F9FF', padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #BAE6FD', fontSize: '0.78rem' }}>
            {r.po_ref || r.reference || r.id}
          </span>
        ),
      },
      {
        key: 'supplier',
        label: 'Supplier / Vendor',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.supplier || r.supplier_name || '—'}</div>,
      },
      {
        key: 'amount',
        label: 'Order Total',
        align: 'right',
        render: (r) => <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.88rem' }}>{fmtNaira(r.amount)}</span>,
      },
      {
        key: 'date',
        label: 'PO Date',
        render: (r) => <span className="text-dark fw-medium">{fmtDate(r.date)}</span>,
      },
      {
        key: 'status',
        label: 'PO Status',
        render: (r) => <Badge label={r.status} color={statusColor(r.status)} dot />,
      },
    ],
    rows: purchaseOrders,
  })

  return (
    <>
      {/* 4 Core Operations & Fulfillment KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Active Deliveries" value={kpis.active_deliveries ?? 0} sub="Currently dispatched / en route" riIcon="ri-bike-line" color="blue" onClick={openDeliveries} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Drivers on Duty" value={kpis.drivers_on_duty ?? 0} sub="Active fleet on the road" riIcon="ri-steering-2-line" color="teal" onClick={openDrivers} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Avg Delivery Time" value={`${kpis.avg_delivery_mins ?? 0} mins`} sub="SLA target: 30 minutes" riIcon="ri-time-line" color="amber" onClick={openAvgDeliveryTime} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Open Purchase Orders" value={purchaseOrders.length} sub="Produce procurement orders" riIcon="ri-shopping-bag-3-line" color="red" onClick={openPurchaseOrders} />
        </div>
      </div>

      {/* Active Deliveries Hub & Delivery Breakdown */}
      <div className="row g-3 mb-3">
        <div className="col-xl-8">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-bike-line text-info" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Active Deliveries Dispatch Board</h6>
              </div>
              <Link to="/deliveries/active" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Dispatch Hub →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Ref</Th><Th>Customer</Th><Th>Driver</Th><Th>Zone</Th><Th>ETA</Th><Th className="text-center pe-3">Status</Th></Thead>
                <Tbody>
                  {deliveries.length === 0 ? (
                    <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No active deliveries at the moment.</Td></Tr>
                  ) : deliveries.map((d) => (
                    <Tr key={d.id}>
                      <Td><span className="fw-bold text-dark fs-sm">{d.delivery_ref || d.id}</span></Td>
                      <Td className="fw-semibold text-dark fs-sm">{d.customer}</Td>
                      <Td className="fs-sm text-muted">{d.driver || '—'}</Td>
                      <Td className="text-muted fs-sm">{d.zone || '—'}</Td>
                      <Td className="fw-bold text-dark fs-sm">{d.eta ? `${d.eta} min` : '—'}</Td>
                      <Td className="text-center pe-3"><Badge label={(d.status||'').replace(/_/g,' ')} color={d.status==='en_route'?'green':d.status==='awaiting_pickup'?'blue':d.status==='assigned'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Delivery Status Breakdown</h6>
              <p className="text-muted fs-xs mb-0">Today's fulfillment distribution</p>
            </div>
            <div className="card-body p-3">
              <div ref={deliveryRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Attendance & Purchase Orders */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-team-line text-primary" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Staff Attendance Today</h6>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle fs-xs">{staffList.filter(s=>s.status==='present').length} Present</span>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Staff Member</Th><Th>Role</Th><Th>Shift</Th><Th>Clock In</Th><Th className="text-center pe-3">Status</Th></Thead>
                <Tbody>
                  {staffList.length === 0 ? (
                    <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No attendance records today.</Td></Tr>
                  ) : staffList.map((s, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-bold text-dark fs-sm mb-0">{s.name}</p></Td>
                      <Td className="text-muted fs-sm">{s.role}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs border">{s.shift || '—'}</span></Td>
                      <Td className="fs-sm text-dark">{s.clock_in ? new Date(s.clock_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</Td>
                      <Td className="text-center pe-3"><Badge label={(s.status||'').replace(/_/g,' ')} color={s.status==='present'?'green':s.status==='absent'?'red':'amber'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-shopping-bag-3-line text-warning" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Procurement &amp; Purchase Orders</h6>
              </div>
              <Link to="/purchase" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>All POs →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Ref</Th><Th>Supplier</Th><Th>Amount</Th><Th>Date</Th><Th className="text-center pe-3">Status</Th></Thead>
                <Tbody>
                  {purchaseOrders.length === 0 ? (
                    <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No purchase orders found.</Td></Tr>
                  ) : purchaseOrders.map((p, i) => (
                    <Tr key={i}>
                      <Td><span className="fw-bold text-dark fs-sm">{p.po_ref || p.reference || p.id}</span></Td>
                      <Td className="fs-sm text-dark">{p.supplier}</Td>
                      <Td className="fw-bold font-display text-dark fs-sm">{fmtNaira(p.amount)}</Td>
                      <Td className="text-muted fs-sm">{fmtDate(p.date)}</Td>
                      <Td className="text-center pe-3"><Badge label={p.status} color={p.status==='paid'?'green':p.status==='received'?'blue':p.status==='pending'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} records`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 6: Customers Tab (Growth, Wallets & Loyalty) ──────────────────────────

const customerColumns = [
  {
    key: 'name',
    label: 'Customer Name',
    render: (r) => (
      <div>
        <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name || 'Registered Customer'}</div>
        {r.email && <div className="text-muted fs-xs">{r.email}</div>}
      </div>
    ),
  },
  {
    key: 'phone',
    label: 'Phone Number',
    render: (r) => (
      <span className="font-monospace text-dark fw-medium" style={{ fontSize: '0.8rem' }}>
        {r.phone || '—'}
      </span>
    ),
  },
  {
    key: 'orders',
    label: 'Lifetime Orders',
    align: 'center',
    render: (r) => (
      <span className="badge bg-light text-dark border px-2.5 py-1 fw-bold" style={{ fontSize: '0.78rem' }}>
        {r.total_orders ?? r.orders ?? 0}
      </span>
    ),
  },
  {
    key: 'points',
    label: 'Loyalty Points',
    align: 'right',
    render: (r) => (
      <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 800, fontSize: '0.75rem' }}>
        {(r.points ?? 0).toLocaleString()} pts
      </span>
    ),
  },
  {
    key: 'wallet',
    label: 'Wallet Balance',
    align: 'right',
    render: (r) => (
      <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.88rem' }}>
        {fmtNaira(r.wallet_balance ?? r.wallet)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Account Status',
    render: (r) => <Badge label={r.status || 'active'} color={statusColor(r.status || 'active')} dot />,
  },
]

function CustomersTab() {
  const growthRef = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/customers')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const growthMonths = data?.charts?.growth_last_6?.map(r => r.month) ?? []
  const growthCounts = data?.charts?.growth_last_6?.map(r => Number(r.new_customers)) ?? []
  const kpis         = data?.kpis ?? {}
  const customers    = data?.customer_list ?? []

  useApexChart(growthRef, () => ({
    chart: { type: 'area', height: 210, toolbar: { show: false } },
    series: [{ name: 'New Customers', data: growthCounts.length ? growthCounts : [0] }],
    dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: ['#405189'],
    xaxis: { categories: growthMonths, axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} customers` } },
  }), [growthCounts.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const openCustomers = (title, sub) => setModal({ title, subtitle: sub, icon: 'ri-group-line', columns: customerColumns, rows: customers })
  const openGrowth = () => setModal({
    title: 'Customer Growth (Last 6 Months)', subtitle: 'Monthly new customer registrations',
    icon: 'ri-line-chart-line',
    columns: [{ key: 'month', label: 'Month' }, { key: 'new_customers', label: 'New Customers', align: 'right' }],
    rows: data?.charts?.growth_last_6 ?? [],
  })

  return (
    <>
      {/* 4 Core Customer & Loyalty Metrics */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Total Customers" value={(kpis.total_customers ?? 0).toLocaleString()} sub="Active customer profiles" riIcon="ri-group-line" color="blue" onClick={() => openCustomers('Total Customers', 'Top registered customers')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="New Signups This Month" value={kpis.new_this_month ?? 0} sub="New accounts registered" riIcon="ri-user-add-line" color="green" onClick={openGrowth} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Customer Wallet Float" value={fmtNaira(kpis.wallet_balance)} sub={`${fmtNaira(kpis.wallet_funded)} lifetime funded`} riIcon="ri-wallet-3-line" color="purple" onClick={() => openCustomers('Wallet Balances', 'Customer wallets')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Loyalty Points Pool" value={`${(kpis.total_points ?? 0).toLocaleString()} pts`} sub={`${(kpis.lifetime_points ?? 0).toLocaleString()} pts issued all-time`} riIcon="ri-vip-crown-line" color="amber" onClick={() => openCustomers('Loyalty Points Pool', 'Customer loyalty points balance')} />
        </div>
      </div>

      {/* Customer Growth & Wallet Health */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openGrowth} role="button" tabIndex={0} style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.9rem' }}>New Customer Acquisition Trend</h6>
              <p className="text-muted fs-xs mb-0">Signups over the last 6 months</p>
            </div>
            <div className="card-body p-3">
              <div ref={growthRef} />
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Wallet &amp; Loyalty Health</h6>
              <Link to="/customers/loyalty" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Loyalty Settings →</Link>
            </div>
            <div className="card-body p-3">
              <div className="row g-2.5">
                <div className="col-6">
                  <div className="p-3 rounded border text-center" style={{ backgroundColor: '#FAF8F5' }}>
                    <i className="ri-wallet-3-line fs-4 text-primary mb-1 d-inline-block" />
                    <div className="text-muted fs-xs">Total Wallet Funded</div>
                    <div className="fw-bold font-display text-dark fs-sm mt-0.5">{fmtNaira(kpis.wallet_funded)}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded border text-center" style={{ backgroundColor: '#FAF8F5' }}>
                    <i className="ri-shopping-bag-line fs-4 text-danger mb-1 d-inline-block" />
                    <div className="text-muted fs-xs">Total Wallet Spent</div>
                    <div className="fw-bold font-display text-dark fs-sm mt-0.5">{fmtNaira(kpis.wallet_spent)}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded border text-center" style={{ backgroundColor: '#FAF8F5' }}>
                    <i className="ri-medal-line fs-4 text-warning mb-1 d-inline-block" />
                    <div className="text-muted fs-xs">Lifetime Points Issued</div>
                    <div className="fw-bold font-display text-dark fs-sm mt-0.5">{(kpis.lifetime_points ?? 0).toLocaleString()} pts</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded border text-center" style={{ backgroundColor: '#FAF8F5' }}>
                    <i className="ri-coin-line fs-4 text-success mb-1 d-inline-block" />
                    <div className="text-muted fs-xs">Active Points Balance</div>
                    <div className="fw-bold font-display text-dark fs-sm mt-0.5">{(kpis.total_points ?? 0).toLocaleString()} pts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers Directory */}
      <div className="card mb-0" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
        <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
          <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Top Customers by Order Volume</h6>
          <Link to="/customers" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>All Customers →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Customer Name</Th><Th>Phone</Th><Th className="text-center">Total Orders</Th><Th className="text-center">Loyalty Points</Th><Th className="text-end">Wallet Float</Th><Th className="text-center pe-3">Status</Th></Thead>
            <Tbody>
              {customers.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No customer records found.</Td></Tr>
              ) : customers.map((c, i) => (
                <Tr key={i}>
                  <Td><p className="fw-bold text-dark fs-sm mb-0">{c.name}</p></Td>
                  <Td className="text-muted fs-sm">{c.phone || '—'}</Td>
                  <Td className="text-center fw-bold fs-sm">{c.total_orders ?? c.orders ?? 0}</Td>
                  <Td className="text-center"><span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-xs">{(c.points ?? 0).toLocaleString()} pts</span></Td>
                  <Td className="text-end fw-bold font-display text-success fs-sm">{fmtNaira(c.wallet_balance ?? c.wallet)}</Td>
                  <Td className="text-center pe-3"><Badge label={c.status || 'active'} color={c.status==='active'?'green':'red'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} customers`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Tab 7: Chef Bems AI Tab (Conversations, Recipes & Rules) ──────────────────

function ChefBemsTab() {
  const aiRef = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [modal, setModal]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setData((await api.get('/dashboard/ai')).data) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const breakdown = data?.conv_breakdown ?? {}
  const kpis      = data?.kpis ?? {}

  useApexChart(aiRef, () => {
    const vals = [breakdown.new ?? 0, breakdown.pending ?? 0, (breakdown.resolved ?? breakdown.completed ?? 0)]
    return {
      chart: { type: 'donut', height: 210 },
      series: vals.some(v => v > 0) ? vals : [1],
      labels: ['New / Unread', 'Pending Reply', 'Resolved'],
      colors: ['#f7b84b','#405189','#0ab39c'],
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%' } } },
    }
  }, [JSON.stringify(breakdown)])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const convs         = data?.recent_convs ?? []
  const dietaryRules  = data?.dietary_rules ?? []
  const mealAssocs    = data?.meal_associations ?? []

  const convColumns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (r) => (
        <div className="fw-semibold text-dark" style={{ fontSize: '0.86rem' }}>
          {r.customer_name || r.customer || 'Anonymous Shopper'}
        </div>
      ),
    },
    {
      key: 'query',
      label: 'AI Chat Query',
      render: (r) => (
        <div className="fst-italic text-dark" style={{ fontSize: '0.82rem', maxWidth: 380 }}>
          "{r.query}"
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge label={r.status} color={statusColor(r.status)} dot />,
    },
    {
      key: 'created_at',
      label: 'Time Ago',
      render: (r) => (
        <span className="text-muted fs-xs font-monospace">
          {r.created_at ? formatTimeAgo(r.created_at) : (r.time || '—')}
        </span>
      ),
    },
  ]
  const openConvs = (title, sub, rows = convs) => setModal({ title, subtitle: sub, icon: 'ri-robot-line', columns: convColumns, rows })
  const openDietaryRules = () => setModal({
    title: 'Active Dietary & Health Rules', subtitle: 'Configured recipe, allergen and diet constraints',
    icon: 'ri-file-list-3-line',
    columns: [
      {
        key: 'name',
        label: 'Condition / Dietary Rule',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.name || r.condition || r.rule}</div>,
      },
      {
        key: 'scope',
        label: 'Constraint & Scope',
        render: (r) => <span className="badge bg-light text-secondary border">{r.scope || r.rule_text || 'Active AI Rule'}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => <Badge label={r.status || 'active'} color="green" dot />,
      },
    ],
    rows: dietaryRules,
  })
  const openMealAssocs = () => setModal({
    title: 'Meal & Produce Pairing Intelligence', subtitle: 'Product ↔ recipe pairing affinity graph',
    icon: 'ri-links-line',
    columns: [
      {
        key: 'meal',
        label: 'Recipe / Produce Pairing',
        render: (r) => <div className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>{r.meal || r.product || r.name}</div>,
      },
      {
        key: 'association_count',
        label: 'Affinity Score / Pairing Count',
        align: 'right',
        render: (r) => (
          <span className="badge" style={{ backgroundColor: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', fontWeight: 800 }}>
            {r.association_count ?? r.score ?? 1} linkages
          </span>
        ),
      },
    ],
    rows: mealAssocs,
  })

  return (
    <>
      {/* 4 Clean AI KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Today's AI Inquiries" value={kpis.conversations_today ?? 0} sub="Customer recipe & produce chats" riIcon="ri-robot-line" color="blue" onClick={() => openConvs('Conversations Today', 'Most recent conversations')} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Pending Inquiries" value={kpis.pending_replies ?? 0} sub="Awaiting resolution" riIcon="ri-message-3-line" color="amber" onClick={() => openConvs('Pending Replies', 'Awaiting response', convs.filter(c => c.status === 'pending'))} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Resolved Inquiries" value={breakdown.resolved ?? breakdown.completed ?? 0} sub="Successfully handled" riIcon="ri-checkbox-circle-line" color="green" onClick={() => openConvs('Resolved Inquiries', 'Successfully answered', convs.filter(c => c.status === 'resolved' || c.status === 'completed'))} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard title="Configured Rules &amp; Pairs" value={(kpis.dietary_rules ?? 0) + (kpis.meal_associations ?? 0)} sub={`${kpis.dietary_rules ?? 0} dietary • ${kpis.meal_associations ?? 0} meal links`} riIcon="ri-links-line" color="teal" onClick={openDietaryRules} />
        </div>
      </div>

      {/* AI Conversation Status & Recent Inquiries */}
      <div className="row g-3 mb-3">
        <div className="col-xl-4">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom">
              <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>AI Conversation Status</h6>
              <p className="text-muted fs-xs mb-0">Today's query resolution mix</p>
            </div>
            <div className="card-body p-3">
              <div ref={aiRef} />
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-robot-line text-primary" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Recent Customer AI Conversations</h6>
              </div>
              <Link to="/chef-bems/conversations" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>All Inquiries →</Link>
            </div>
            <div className="card-body p-0">
              {convs.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No customer inquiries recorded today.</p>
              ) : (
                <div className="d-flex flex-column">
                  {convs.slice(0, 5).map((c, i) => (
                    <div key={i} className={`p-3 d-flex align-items-start gap-3 ${i < Math.min(convs.length, 5) - 1 ? 'border-bottom' : ''}`}>
                      <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>
                        {(c.customer || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-dark fs-sm">{c.customer}</span>
                          <Badge label={c.status} color={c.status === 'new' ? 'amber' : c.status === 'resolved' || c.status === 'completed' ? 'green' : 'blue'} />
                        </div>
                        <p className="text-muted fs-sm mb-1 text-truncate">"{c.query}"</p>
                        <span className="text-muted fs-xs">{c.created_at ? formatTimeAgo(c.created_at) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dietary Rules & Meal Associations */}
      <div className="row g-3 mb-3">
        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-file-list-3-line text-info" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Active Dietary Rules</h6>
              </div>
              <Link to="/chef-bems/dietary-rules" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Manage Rules →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Rule / Condition</Th><Th>Constraint Scope</Th><Th className="text-center pe-3">Status</Th></Thead>
                <Tbody>
                  {dietaryRules.length === 0 ? (
                    <Tr><Td colSpan={3} className="text-center text-muted py-4 fs-sm">No dietary rules configured.</Td></Tr>
                  ) : dietaryRules.map((r, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-bold text-dark fs-sm mb-0">{r.name || r.condition || r.rule}</p></Td>
                      <Td className="text-muted fs-sm">{r.scope || r.rule_text || 'Active constraint'}</Td>
                      <Td className="text-center pe-3"><Badge label={r.status || 'active'} color="green" /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card mb-0 h-100" style={{ borderRadius: '0.75rem', border: '1px solid #EFECE6' }}>
            <div className="card-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-links-line text-success" style={{ fontSize: 16 }} />
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Meal &amp; Produce Pairings</h6>
              </div>
              <Link to="/chef-bems/meal-associations" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Manage Pairings →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Produce Pairing</Th><Th className="text-center pe-3">Association Strength</Th></Thead>
                <Tbody>
                  {mealAssocs.length === 0 ? (
                    <Tr><Td colSpan={2} className="text-center text-muted py-4 fs-sm">No meal pairings configured.</Td></Tr>
                  ) : mealAssocs.map((m, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-bold text-dark fs-sm mb-0">{m.meal}</p></Td>
                      <Td className="text-center pe-3"><span className="badge bg-success-subtle text-success border border-success-subtle fs-xs">{m.association_count} strength</span></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <DetailModal
          title={modal.title}
          subtitle={modal.subtitle}
          icon={modal.icon}
          countBadge={`${(modal.rows ?? []).length} records`}
          onClose={() => setModal(null)}
          footer={<span className="text-muted fs-xs fw-semibold">{(modal.rows ?? []).length} record{(modal.rows ?? []).length === 1 ? '' : 's'} available</span>}
        >
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const ALL_TABS = [
  { key: 'overview',   label: 'Overview',    icon: 'ri-dashboard-2-line',     roles: null },
  { key: 'sales',      label: 'Sales',       icon: 'ri-line-chart-line',      roles: ['superadmin','admin','manager','accountant'] },
  { key: 'finance',    label: 'Finance',     icon: 'ri-bank-card-line',       roles: ['superadmin','admin','manager','accountant'] },
  { key: 'inventory',  label: 'Inventory',   icon: 'ri-archive-stack-line',   roles: ['superadmin','admin','manager','kitchen_staff'] },
  { key: 'operations', label: 'Operations',  icon: 'ri-settings-3-line',      roles: ['superadmin','admin','manager','delivery_manager'] },
  { key: 'customers',  label: 'Customers',   icon: 'ri-group-line',           roles: ['superadmin','admin','manager'] },
  { key: 'ai',         label: 'Chef Bems AI',icon: 'ri-robot-line',           roles: ['superadmin','admin','manager','kitchen_staff'] },
]

const DEFAULT_TAB = {
  superadmin: 'overview', admin: 'overview', manager: 'overview',
  accountant: 'finance',  kitchen_staff: 'inventory', cashier: 'sales',
  delivery_manager: 'operations', driver: 'operations',
}

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  const TABS = ALL_TABS.filter(t => !t.roles || hasRole(...t.roles))
  const defaultTab = (user && DEFAULT_TAB[user.role]) ?? 'overview'
  const firstTab   = TABS[0]?.key ?? 'overview'
  const activeTab  = (tabParam && TABS.some(t => t.key === tabParam))
    ? tabParam
    : (TABS.some(t => t.key === defaultTab) ? defaultTab : firstTab)

  const setTab = (key) => setSearchParams({ tab: key }, { replace: true })

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.name?.split(' ')[0] ?? 'Admin'} 👋`}
        sub="Here's what's happening at Bems Farms today."
      >
        <button className="btn btn-sm btn-outline-success" onClick={() => window.location.reload()}>
          <i className="ri-refresh-line me-1" /> Refresh
        </button>
      </PageHeader>

      {/* Tab Navigation */}
      <div className="d-flex align-items-center gap-1 mb-3 flex-wrap" style={{ borderBottom: '2px solid #EFECE6', paddingBottom: '0.25rem' }}>
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`btn btn-sm d-flex align-items-center gap-1.5 ${activeTab === key ? 'btn-dark' : 'btn-light'}`}
            style={{ borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.78rem', border: activeTab === key ? '1px solid #1f2937' : '1px solid transparent' }}
          >
            <i className={icon} style={{ fontSize: 13 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Active Tab View */}
      {activeTab === 'overview'   && <OverviewTab />}
      {activeTab === 'sales'      && <SalesTab />}
      {activeTab === 'finance'    && <FinanceTab />}
      {activeTab === 'inventory'  && <InventoryTab />}
      {activeTab === 'operations' && <OperationsTab />}
      {activeTab === 'customers'  && <CustomersTab />}
      {activeTab === 'ai'         && <ChefBemsTab />}
    </div>
  )
}
