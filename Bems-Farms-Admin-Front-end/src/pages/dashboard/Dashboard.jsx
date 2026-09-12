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

// ── Shared drill-down column presets ──────────────────────────────────────────

const orderColumns = [
  { key: 'order', label: 'Order', render: (r) => r.order_ref || r.id },
  { key: 'customer', label: 'Customer', render: (r) => r.customer_name || r.customer || '—' },
  { key: 'items', label: 'Items', align: 'right', render: (r) => r.item_count ?? r.items ?? '—' },
  { key: 'total', label: 'Total', align: 'right', render: (r) => fmtNaira(r.total_amount ?? r.total) },
  { key: 'status', label: 'Status', render: (r) => <Badge label={r.status} color={statusColor(r.status)} /> },
  { key: 'created_at', label: 'Date', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : (r.time_ago || r.time || '—') },
]

const productSoldColumns = [
  { key: 'name', label: 'Product', render: (r) => <><p className="fw-medium fs-sm mb-0">{r.name}</p><span className="text-muted fs-xs">{r.sku}</span></> },
  { key: 'sold', label: 'Units Sold', align: 'right', render: (r) => r.units_sold ?? r.sold ?? r.qty_sold ?? '—' },
  { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.total_revenue ?? r.revenue) },
]

const lowStockColumns = [
  { key: 'name', label: 'Product', render: (r) => r.name },
  { key: 'sku', label: 'SKU', render: (r) => <span className="badge bg-light text-dark fs-xs">{r.sku}</span> },
  { key: 'stock', label: 'In Stock', align: 'right', render: (r) => r.stock ?? r.qty },
  { key: 'reorder', label: 'Reorder At', align: 'right', render: (r) => r.low_stock_threshold ?? r.reorder_qty ?? '—' },
]

const deliveryColumns = [
  { key: 'ref', label: 'Ref', render: (r) => r.delivery_ref || r.id },
  { key: 'customer', label: 'Customer' },
  { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
  { key: 'zone', label: 'Zone', render: (r) => r.zone || '—' },
  { key: 'eta', label: 'ETA', align: 'right', render: (r) => r.eta ? `${r.eta} min` : '—' },
  { key: 'status', label: 'Status', render: (r) => <Badge label={(r.status || '').replace(/_/g, ' ')} color={r.status === 'en_route' ? 'green' : r.status === 'awaiting_pickup' ? 'blue' : 'amber'} /> },
]

const staffColumns = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role', render: (r) => r.role || '—' },
  { key: 'shift', label: 'Shift', render: (r) => r.shift || '—' },
  { key: 'clock_in', label: 'Clock In', render: (r) => r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
  { key: 'status', label: 'Status', render: (r) => <Badge label={(r.status || '').replace(/_/g, ' ')} color={r.status === 'present' ? 'green' : r.status === 'absent' ? 'red' : 'amber'} /> },
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

// ── Tab components ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { hasRole } = useAuth()
  const revenueRef  = useRef(null)
  const ordersRef   = useRef(null)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)
  const [modal, setModal]   = useState(null)

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
    grid:        { borderColor: '#EFECE6', strokeDashArray: 3, padding: { top: 0, bottom: 0 } },
  }), [ordersArr.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const todayRevenue  = Number(kpis.revenue_today || 0)
  const recentOrders  = data?.recent_orders ?? []
  const topProducts   = data?.top_products ?? []
  const lowStock      = data?.low_stock ?? []
  const activeDeliveries = data?.active_deliveries ?? []
  const aiConvs       = data?.recent_convs ?? []
  const activeCustomersList = data?.active_customers_list ?? []
  const staffTodayList = data?.staff_today ?? []

  const openOrders = () => setModal({
    title: "Recent Orders", subtitle: 'Most recent orders across all channels',
    icon: 'ri-shopping-cart-2-line', columns: orderColumns, rows: recentOrders,
  })
  const openPending = () => setModal({
    title: 'Pending Orders', subtitle: 'Confirmed / processing — from most recent orders',
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
    title: 'Staff on Duty', subtitle: "Today's attendance",
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
    { label: 'AI Conversations', count: kpis.pending_ai ?? 0,      icon: 'ri-robot-line',            bg: '#ccfbf1', txt: '#0f766e', border: '#99f6e4', link: '/chef-bems/conversations',  roles: ['superadmin','admin','manager','kitchen_staff'] },
  ]

  return (
    <>
      {/* KPI row */}
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
          <StatsCard title="Low Stock Alerts"  value={kpis.low_stock_alerts ?? 0}             sub="Action required"                                  riIcon="ri-alert-line"              color="red" onClick={openLowStock} />
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
                  { label: 'New Order',    icon: 'ri-add-circle-line',        to: '/orders',              primary: true,  roles: null },
                  { label: 'POS Terminal', icon: 'ri-store-2-line',           to: '/pos',                 primary: false, roles: ['superadmin','admin','manager','cashier'] },
                  { label: 'Stock In',     icon: 'ri-archive-stack-line',     to: '/inventory/stock-in',  primary: false, roles: ['superadmin','admin','manager','kitchen_staff'] },
                  { label: 'Add Product',  icon: 'ri-price-tag-3-line',       to: '/products/add',        primary: false, roles: ['superadmin','admin','manager'] },
                  { label: 'Add Staff',    icon: 'ri-team-line',              to: '/staff/add',           primary: false, roles: ['superadmin','admin','manager'] },
                  { label: 'Sales Report', icon: 'ri-bar-chart-grouped-line', to: '/reports/sales',       primary: false, roles: ['superadmin','admin','manager','accountant'] },
                  { label: 'Finance',      icon: 'ri-bank-card-line',         to: '/accounts/overview',   primary: false, roles: ['superadmin','admin','manager','accountant'] },
                  { label: 'Deliveries',   icon: 'ri-bike-line',              to: '/deliveries/active',   primary: false, roles: ['superadmin','admin','manager','delivery_manager'] },
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
                        <Td className="text-muted" style={{ fontSize: '0.75rem' }}>{o.item_count ?? o.items}</Td>
                        <Td className="fw-bold font-display text-dark" style={{ fontSize: '0.78rem' }}>{fmtNaira(o.total_amount ?? o.total)}</Td>
                        <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                        <Td className="text-muted" style={{ fontSize: '0.72rem' }}>{o.time_ago || o.time}</Td>
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
              <Link to="/reports/sales" className="text-decoration-none fw-bold text-success" style={{ fontSize: '0.72rem' }}>Sales Report →</Link>
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
                <h6 className="fw-bold font-display text-dark mb-0" style={{ fontSize: '0.85rem' }}>Chef Bems AI Activity</h6>
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
                      <span className="badge flex-shrink-0" style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: conv.status === 'resolved' ? '#dcfce7' : '#fef3c7', color: conv.status === 'resolved' ? '#15803d' : '#b45309', border: '1px solid currentColor' }}>
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
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

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
  const kpis       = data?.kpis ?? {}

  useApexChart(revWeekRef, () => ({
    chart: { type: 'area', height: 220, toolbar: { show: false } },
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
    chart: { type: 'bar', height: 220, toolbar: { show: false } },
    series: [{ name: 'Revenue', data: incomeM }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false }, colors: ['#405189'],
    xaxis: { categories: months6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000000).toFixed(1)}M` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [incomeM.join()])

  useApexChart(categoryRef, () => ({
    chart: { type: 'donut', height: 220 },
    series: catValues.length ? catValues : [1],
    labels: catLabels.length ? catLabels : ['No data'],
    colors: ['#0ab39c','#405189','#f7b84b','#f06548','#3577f1','#299cdb'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [catValues.join()])

  useApexChart(paymentRef, () => ({
    chart: { type: 'donut', height: 220 },
    series: payValues.length ? payValues : [1],
    labels: payLabels.length ? payLabels : ['No data'],
    colors: ['#405189','#0ab39c','#f7b84b','#f06548'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [payValues.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const topProducts  = data?.top_products ?? []
  const recentOrders = data?.recent_orders ?? []
  const returnsTodayList = data?.returns_today_list ?? []
  const skusSoldList = data?.skus_sold_list ?? []

  const openRecentOrders = (title, sub) => setModal({ title, subtitle: sub, icon: 'ri-shopping-cart-2-line', columns: orderColumns, rows: recentOrders })
  const openReturnsToday = () => setModal({
    title: 'Returns Today', subtitle: 'Refund requests submitted today',
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
    title: 'Total SKUs Sold Today', subtitle: 'Unique products with at least one sale today',
    icon: 'ri-price-tag-3-line', columns: productSoldColumns, rows: skusSoldList,
  })
  const openDaily7d = () => setModal({
    title: 'Revenue This Week', subtitle: 'Daily breakdown',
    icon: 'ri-line-chart-line',
    columns: [{ key: 'day_label', label: 'Day' }, { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) }],
    rows: data?.charts?.daily_7d ?? [],
  })
  const openMonthly6m = () => setModal({
    title: 'Revenue Last 6 Months', subtitle: 'Monthly totals',
    icon: 'ri-bar-chart-grouped-line',
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) },
      { key: 'orders', label: 'Orders', align: 'right' },
    ],
    rows: data?.charts?.monthly_6m ?? [],
  })
  const openByCategory = () => setModal({
    title: 'Revenue by Category', subtitle: 'This month',
    icon: 'ri-pie-chart-line',
    columns: [{ key: 'category', label: 'Category' }, { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtNaira(r.revenue) }],
    rows: data?.charts?.by_category ?? [],
  })
  const openByPayment = () => setModal({
    title: 'By Payment Method', subtitle: 'This month',
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
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Today's Revenue"  value={fmtNaira(kpis.today_revenue)}   sub={`${kpis.orders_today ?? 0} orders`}         riIcon="ri-money-dollar-circle-line" color="green" onClick={() => openRecentOrders("Today's Revenue — Orders", 'Most recent orders')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Monthly Revenue"  value={fmtNaira(kpis.month_revenue)}   sub={new Date().toLocaleString('default',{month:'long',year:'numeric'})} riIcon="ri-line-chart-line" color="green" onClick={openMonthly6m} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Orders Today"     value={kpis.orders_today ?? 0}          sub={`Avg ${fmtNaira(kpis.avg_order_value)}/order`} riIcon="ri-shopping-cart-2-line" color="blue" onClick={() => openRecentOrders('Orders Today', 'Most recent orders')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Avg Order Value"  value={fmtNaira(kpis.avg_order_value)} sub="Per transaction"                               riIcon="ri-funds-line" color="amber" onClick={() => openRecentOrders('Avg Order Value — Orders', 'Most recent orders')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Returns Today"    value={kpis.returns_today ?? 0}         sub={fmtNaira(kpis.returns_value) + ' refunded'}   riIcon="ri-arrow-go-back-line" color="red" onClick={openReturnsToday} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Total SKUs Sold"  value={kpis.skus_sold ?? 0}             sub="Unique products today"                         riIcon="ri-price-tag-3-line" color="teal" onClick={openSkusSold} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-6"><div className="card mb-0 chart-panel-clickable" onClick={openDaily7d} role="button" tabIndex={0}><div className="card-body"><h6 className="fw-semibold mb-0">Revenue This Week</h6><p className="text-muted fs-xs mb-2 mt-1">Daily breakdown</p><div ref={revWeekRef} /></div></div></div>
        <div className="col-xl-6"><div className="card mb-0 chart-panel-clickable" onClick={openMonthly6m} role="button" tabIndex={0}><div className="card-body"><h6 className="fw-semibold mb-0">Revenue Last 6 Months</h6><p className="text-muted fs-xs mb-2 mt-1">Monthly totals</p><div ref={revMonthRef} /></div></div></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3"><div className="card mb-0 h-100 chart-panel-clickable" onClick={openByCategory} role="button" tabIndex={0}><div className="card-body"><h6 className="fw-semibold mb-0">Revenue by Category</h6><p className="text-muted fs-xs mb-2 mt-1">This month</p><div ref={categoryRef} /></div></div></div>
        <div className="col-xl-3"><div className="card mb-0 h-100 chart-panel-clickable" onClick={openByPayment} role="button" tabIndex={0}><div className="card-body"><h6 className="fw-semibold mb-0">By Payment Method</h6><p className="text-muted fs-xs mb-2 mt-1">This month</p><div ref={paymentRef} /></div></div></div>
        <div className="col-xl-6">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0">Top Selling Products</h6>
              <Link to="/reports/sales" className="link link-custom fs-sm">Full report →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>#</Th><Th>Product</Th><Th>Sold</Th><Th>Revenue</Th></Thead>
                <Tbody>
                  {topProducts.length === 0 ? (
                    <Tr><Td colSpan={4} className="text-center text-muted py-4 fs-sm">No sales data.</Td></Tr>
                  ) : topProducts.map((p, i) => (
                    <Tr key={p.sku || i}>
                      <Td><span className="fw-bold text-muted">{i + 1}</span></Td>
                      <Td><p className="fw-medium fs-sm mb-0">{p.name}</p><span className="text-muted" style={{ fontSize: 10 }}>{p.sku}</span></Td>
                      <Td className="fw-semibold">{p.units_sold ?? p.sold}</Td>
                      <Td className="fw-semibold text-success">{fmtNaira(p.total_revenue ?? p.revenue)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="fw-semibold mb-0">Recent Orders</h6>
          <Link to="/orders" className="link link-custom fs-sm">View all →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th></Thead>
            <Tbody>
              {recentOrders.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No recent orders.</Td></Tr>
              ) : recentOrders.map((o) => (
                <Tr key={o.id}>
                  <Td><Link to={`/orders/${o.id}`} className="fw-medium fs-sm link link-custom">{o.order_ref || o.id}</Link></Td>
                  <Td>{o.customer_name || o.customer}</Td>
                  <Td>{o.item_count ?? o.items}</Td>
                  <Td className="fw-semibold">{fmtNaira(o.total_amount ?? o.total)}</Td>
                  <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                  <Td className="text-muted fs-xs">{o.time_ago || o.time}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

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
    chart: { type: 'line', height: 220, toolbar: { show: false } },
    series: [{ name: 'Income', data: incomeM }, { name: 'Expenses', data: expensesM }],
    stroke: { curve: 'smooth', width: [2, 2] },
    colors: ['#0ab39c', '#f06548'],
    dataLabels: { enabled: false },
    xaxis: { categories: months6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top' },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [incomeM.join()])

  useApexChart(profitRef, () => ({
    chart: { type: 'bar', height: 220, toolbar: { show: false } },
    series: [{ name: 'Net Profit', data: incomeM.map((inc, i) => inc - (expensesM[i] ?? 0)) }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', colors: { ranges: [{ from: -999999, to: 0, color: '#f06548' }] } } },
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
    title: 'Bank Accounts', subtitle: 'Active accounts',
    icon: 'ri-bank-line',
    columns: [
      { key: 'account_name', label: 'Account', render: (r) => r.account_name || r.account },
      { key: 'bank_name', label: 'Bank', render: (r) => r.bank_name || r.bank },
      { key: 'account_type', label: 'Type', render: (r) => r.account_type || r.type },
      { key: 'balance', label: 'Balance', align: 'right', render: (r) => fmtNaira(r.balance) },
      { key: 'status', label: 'Status', render: (r) => <Badge label={r.status || 'active'} color="green" /> },
    ],
    rows: accounts,
  })
  const openDues = () => setModal({
    title: 'Supplier Payments Due', subtitle: 'Pending produce-purchase invoices',
    icon: 'ri-truck-line',
    columns: [
      { key: 'name', label: 'Supplier', render: (r) => r.name || r.supplier },
      { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmtNaira(r.amount) },
      { key: 'due_date', label: 'Due', render: (r) => r.due_date || r.due || '—' },
      { key: 'status', label: 'Status', render: (r) => <Badge label={(r.status || '').replace('-', ' ')} color={r.status === 'overdue' ? 'red' : 'blue'} /> },
    ],
    rows: dues,
  })
  const openProductProfitability = (title, sub) => setModal({
    title, subtitle: sub, icon: 'ri-scales-3-line',
    columns: [
      { key: 'name', label: 'Product', render: (r) => <><p className="fw-medium fs-sm mb-0">{r.name}</p><span className="text-muted fs-xs">{r.sku}</span></> },
      { key: 'cost_price', label: 'Cost Price', align: 'right', render: (r) => fmtNaira(r.cost_price) },
      { key: 'selling_price', label: 'Selling Price', align: 'right', render: (r) => fmtNaira(r.selling_price) },
      { key: 'units_sold', label: 'Units Sold', align: 'right' },
      { key: 'margin_pct', label: 'Margin', align: 'right', render: (r) => `${r.margin_pct.toFixed(1)}%` },
      { key: 'profit', label: 'Profit', align: 'right', render: (r) => fmtNaira(r.profit) },
    ],
    rows: productProfitability,
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Monthly Revenue"    value={fmtNaira(kpis.month_revenue)}    sub={new Date().toLocaleString('default',{month:'long'})} riIcon="ri-money-dollar-circle-line" color="green" onClick={() => openMonthly('Monthly Revenue', 'Income by month, last 6 months')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Monthly Expenses"   value={fmtNaira(kpis.month_expenses)}   sub="Total outflows"                              riIcon="ri-subtract-line"    color="red" onClick={() => openMonthly('Monthly Expenses', 'Expenses by month, last 6 months')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Net Profit"         value={fmtNaira(kpis.net_profit)}       sub="This month"                                  riIcon="ri-funds-line"       color="blue" onClick={() => openMonthly('Net Profit', 'Income vs. expenses, last 6 months')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Outstanding Dues"   value={fmtNaira(kpis.outstanding_dues)} sub={`${kpis.due_count ?? 0} supplier invoices`}  riIcon="ri-bank-card-line"   color="amber" onClick={openDues} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Total Bank Balance" value={fmtNaira(kpis.total_balance)}    sub={`Across ${kpis.account_count ?? 0} accounts`} riIcon="ri-bank-line"        color="teal" onClick={openAccounts} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Profit Margin"      value={kpis.profit_margin ? `${Number(kpis.profit_margin).toFixed(1)}%` : '—'} sub="This month" riIcon="ri-percent-line" color="purple" onClick={() => openMonthly('Profit Margin', 'Income vs. expenses, last 6 months')} /></div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-3"><StatsCard title="Product Revenue"    value={fmtNaira(kpis.cogs_month != null ? Number(kpis.cogs_month) + Number(kpis.gross_profit_month || 0) : 0)} sub="From order line items" riIcon="ri-shopping-cart-2-line" color="blue" onClick={() => openProductProfitability('Product Revenue', 'Last 30 days, by product')} /></div>
        <div className="col-6 col-sm-4 col-xl-3"><StatsCard title="Cost of Goods Sold" value={fmtNaira(kpis.cogs_month)}       sub="Cost price × units sold"                     riIcon="ri-price-tag-3-line" color="red" onClick={() => openProductProfitability('Cost of Goods Sold', 'Cost price × units sold — last 30 days')} /></div>
        <div className="col-6 col-sm-4 col-xl-3"><StatsCard title="Gross Profit"       value={fmtNaira(kpis.gross_profit_month)} sub="Revenue − COGS · this month"               riIcon="ri-line-chart-line"  color="green" onClick={() => openProductProfitability('Gross Profit', 'Revenue − COGS, by product — last 30 days')} /></div>
        <div className="col-6 col-sm-4 col-xl-3"><StatsCard title="Gross Margin"       value={kpis.gross_margin_pct ? `${Number(kpis.gross_margin_pct).toFixed(1)}%` : '—'} sub="Product-level margin" riIcon="ri-percent-line" color="amber" onClick={() => openProductProfitability('Gross Margin', 'Margin by product — last 30 days')} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card mb-0 chart-panel-clickable" onClick={() => openMonthly('Income vs Expenses', 'Last 6 months')} role="button" tabIndex={0}>
            <div className="card-header d-flex align-items-center justify-content-between">
              <div><h6 className="fw-semibold mb-0">Income vs Expenses</h6><p className="text-muted fs-xs mb-0 mt-1">Last 6 months</p></div>
              <div className="d-flex gap-3">
                <span className="fs-xs"><span className="badge bg-success me-1">●</span>Income</span>
                <span className="fs-xs"><span className="badge bg-danger me-1">●</span>Expenses</span>
              </div>
            </div>
            <div className="card-body"><div ref={incomeRef} /></div>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="card mb-0 chart-panel-clickable" onClick={() => openMonthly('Net Profit by Month', 'Last 6 months')} role="button" tabIndex={0}>
            <div className="card-body"><h6 className="fw-semibold mb-0">Net Profit by Month</h6><p className="text-muted fs-xs mb-2 mt-1">Last 6 months</p><div ref={profitRef} /></div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-bank-line text-primary me-2" />Bank Accounts</h6>
              <Link to="/accounts/bank" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Account</Th><Th>Bank</Th><Th>Type</Th><Th>Balance</Th><Th>Status</Th></Thead>
                <Tbody>
                  {accounts.length === 0 ? (
                    <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No bank accounts configured.</Td></Tr>
                  ) : accounts.map((a, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-medium fs-sm mb-0">{a.account_name || a.account}</p></Td>
                      <Td className="fs-sm">{a.bank_name || a.bank}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs">{a.account_type || a.type}</span></Td>
                      <Td className="fw-semibold text-success">{fmtNaira(a.balance)}</Td>
                      <Td><Badge label={a.status || 'active'} color="green" /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-truck-line text-warning me-2" />Supplier Payments Due</h6>
              <Link to="/suppliers/payments" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Supplier</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></Thead>
                <Tbody>
                  {dues.length === 0 ? (
                    <Tr><Td colSpan={4} className="text-center text-muted py-4 fs-sm">No outstanding dues.</Td></Tr>
                  ) : dues.map((s, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-medium fs-sm mb-0">{s.name || s.supplier}</p></Td>
                      <Td className="fw-semibold fs-sm">{fmtNaira(s.amount)}</Td>
                      <Td className="fs-sm">{s.due_date || s.due}</Td>
                      <Td><Badge label={(s.status||'').replace('-',' ')} color={s.status==='overdue'?'red':s.status==='due-soon'||s.status==='due_soon'?'amber':'blue'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {dues.length > 0 && (
                <div className="px-4 py-3 border-top d-flex justify-content-between">
                  <span className="fs-sm text-muted">Total outstanding</span>
                  <span className="fw-bold text-danger">{fmtNaira(kpis.outstanding_dues)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-0 mt-4">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div><h6 className="fw-semibold mb-0"><i className="ri-scales-3-line text-success me-2" />Product Profitability</h6><p className="text-muted fs-xs mb-0 mt-1">Cost vs. selling price · last 30 days</p></div>
          <Link to="/products/list" className="link link-custom fs-sm">Manage products →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Product</Th><Th>SKU</Th><Th>Cost Price</Th><Th>Selling Price</Th><Th>Units Sold</Th><Th>Margin</Th><Th>Profit</Th></Thead>
            <Tbody>
              {productProfitability.length === 0 ? (
                <Tr><Td colSpan={7} className="text-center text-muted py-4 fs-sm">No product sales in the last 30 days.</Td></Tr>
              ) : productProfitability.map((p, i) => (
                <Tr key={i}>
                  <Td><p className="fw-medium fs-sm mb-0">{p.name}</p></Td>
                  <Td><span className="badge bg-light text-dark fs-xs">{p.sku}</span></Td>
                  <Td className="fs-sm">{fmtNaira(p.cost_price)}</Td>
                  <Td className="fs-sm">{fmtNaira(p.selling_price)}</Td>
                  <Td className="fs-sm">{p.units_sold}</Td>
                  <Td><Badge label={`${p.margin_pct.toFixed(1)}%`} color={p.margin_pct >= 20 ? 'green' : p.margin_pct >= 0 ? 'amber' : 'red'} /></Td>
                  <Td className={`fw-semibold fs-sm ${p.profit < 0 ? 'text-danger' : 'text-success'}`}>{fmtNaira(p.profit)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

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
    chart: { type: 'bar', height: 220, toolbar: { show: false } },
    series: [{ name: 'Stock Value (₦)', data: catValues.length ? catValues : [0] }],
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: false }, colors: ['#405189'],
    xaxis: { categories: catNames.length ? catNames : ['No data'], axisBorder: { show: false } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [catValues.join()])

  if (loading) return <TabSkeleton />
  if (error)   return <TabError onRetry={load} />

  const openInvList = (title, sub, rows = invList) => setModal({
    title, subtitle: sub, icon: 'ri-archive-stack-line',
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'sku', label: 'SKU', render: (r) => <span className="badge bg-light text-dark fs-xs">{r.sku}</span> },
      { key: 'category', label: 'Category', render: (r) => r.category || '—' },
      { key: 'stock', label: 'Qty', align: 'right', render: (r) => r.stock ?? r.qty },
      { key: 'value', label: 'Value', align: 'right', render: (r) => fmtNaira(r.value ?? (r.stock ?? 0) * (r.unit_price || r.price || 0)) },
    ],
    rows,
  })
  const openLowStock = () => setModal({
    title: 'Below Reorder Level', subtitle: 'Products at or under their reorder threshold',
    icon: 'ri-alert-line', columns: lowStockColumns, rows: lowStock,
  })
  const openExpiring = () => setModal({
    title: 'Expiring Batches', subtitle: 'Within the next 7 days',
    icon: 'ri-timer-flash-line',
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'batch_no', label: 'Batch #' },
      { key: 'quantity', label: 'Qty', align: 'right' },
      { key: 'expiry_date', label: 'Expiry Date', render: (r) => r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—' },
    ],
    rows: expiringBatches,
  })
  const openByCategory = () => setModal({
    title: 'Stock Value by Category', subtitle: 'Current value in warehouse',
    icon: 'ri-list-check-2',
    columns: [{ key: 'category', label: 'Category' }, { key: 'value', label: 'Value', align: 'right', render: (r) => fmtNaira(r.value) }],
    rows: data?.charts?.value_by_category ?? [],
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Total Active SKUs"    value={kpis.total_skus ?? 0}                          sub="Across all categories"   riIcon="ri-price-tag-3-line"   color="blue" onClick={() => openInvList('Active SKUs', 'All active products, by stock level')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Total Stock Value"    value={fmtNaira(kpis.total_value)}                    sub="All warehouses"          riIcon="ri-store-line"         color="green" onClick={openByCategory} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Below Reorder Level" value={`${kpis.low_stock_count ?? 0} items`}           sub="Immediate action"        riIcon="ri-alert-line"         color="red" onClick={openLowStock} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Expiring (7 days)"   value={`${kpis.expiring_count ?? 0} batches`}          sub="Check expiry dates"      riIcon="ri-timer-flash-line"   color="amber" onClick={openExpiring} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Categories"          value={catNames.length ?? 0}                           sub="With active stock"       riIcon="ri-list-check-2"       color="teal" onClick={openByCategory} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Zero Stock Items"    value={kpis.out_of_stock ?? 0}                         sub="Out of stock"            riIcon="ri-delete-bin-line"    color="red" onClick={() => openInvList('Zero Stock Items', 'Products currently out of stock', invList.filter(i => Number(i.stock ?? i.qty) === 0))} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-6">
          <div className="card mb-0 chart-panel-clickable" onClick={openByCategory} role="button" tabIndex={0}>
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Stock Value by Category</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Current value in warehouse</p>
              <div ref={stockRef} />
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-alert-line text-danger me-2" />Low Stock Items</h6>
              <Link to="/inventory/alerts" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              {lowStock.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">All items are well stocked ✓</p>
              ) : lowStock.slice(0, 5).map((item, i) => (
                <div key={item.id || i} className={`p-4 d-flex align-items-start gap-3 ${i < Math.min(lowStock.length,5)-1 ? 'border-bottom' : ''}`}>
                  <div className="avatar size-9 rounded bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-archive-stack-line" />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <p className="fw-medium fs-sm mb-0">{item.name}</p>
                      <Badge label={item.stock_status || 'Low Stock'} color="red" />
                    </div>
                    <p className="text-muted fs-xs mb-0">{item.sku}</p>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="fs-xs"><span className="text-danger fw-semibold">{item.stock ?? item.qty}</span><span className="text-muted"> · reorder at {item.low_stock_threshold ?? item.reorder}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="fw-semibold mb-0">Inventory Stock List</h6>
          <Link to="/inventory/stock" className="link link-custom fs-sm">Full list →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th>Qty in Stock</Th><Th>Value</Th><Th>Status</Th></Thead>
            <Tbody>
              {invList.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No inventory data.</Td></Tr>
              ) : invList.slice(0, 10).map((item, i) => (
                <Tr key={item.id || i}>
                  <Td><p className="fw-medium fs-sm mb-0">{item.name}</p></Td>
                  <Td><span className="badge bg-light text-dark fs-xs">{item.sku}</span></Td>
                  <Td className="text-muted fs-sm">{item.category}</Td>
                  <Td className="fw-semibold fs-sm">{item.stock ?? item.qty}</Td>
                  <Td className="fs-sm">{fmtNaira((item.stock ?? 0) * (item.unit_price || item.price || 0))}</Td>
                  <Td><Badge label={(item.stock_status || (Number(item.stock) <= Number(item.low_stock_threshold ?? 5) ? 'low stock' : 'in stock'))} color={item.stock_status === 'low' || Number(item.stock) <= Number(item.low_stock_threshold ?? 5) ? 'red' : 'green'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

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
    const statuses = ['assigned','awaiting_pickup','en_route','pending']
    const vals     = statuses.map(s => breakdown[s] ?? 0)
    return {
      chart: { type: 'donut', height: 200 },
      series: vals.some(v => v > 0) ? vals : [1],
      labels: ['Assigned', 'Awaiting Pickup', 'En Route', 'Pending'],
      colors: ['#f7b84b','#405189','#0ab39c','#f06548'],
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

  const openDeliveries = () => setModal({ title: 'Active Deliveries', subtitle: 'Currently dispatched', icon: 'ri-bike-line', columns: deliveryColumns, rows: deliveries })
  const openDrivers = () => setModal({
    title: 'Drivers On Duty', subtitle: 'Active or currently on delivery',
    icon: 'ri-steering-2-line',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'vehicle_type', label: 'Vehicle', render: (r) => r.vehicle_type || '—' },
      { key: 'zone', label: 'Zone', render: (r) => r.zone || '—' },
      { key: 'rating', label: 'Rating', align: 'right', render: (r) => r.rating ?? '—' },
      { key: 'status', label: 'Status', render: (r) => <Badge label={(r.status || '').replace(/_/g, ' ')} color={r.status === 'on_delivery' ? 'blue' : 'green'} /> },
    ],
    rows: driversOnDutyList,
  })
  const openAvgDeliveryTime = () => setModal({
    title: 'Avg Delivery Time', subtitle: "Today's completed deliveries",
    icon: 'ri-time-line',
    columns: [
      { key: 'delivery_ref', label: 'Ref' },
      { key: 'dispatched_at', label: 'Dispatched', render: (r) => r.dispatched_at ? new Date(r.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
      { key: 'delivered_at', label: 'Delivered', render: (r) => r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
      { key: 'minutes', label: 'Minutes', align: 'right', render: (r) => r.minutes ?? '—' },
    ],
    rows: deliveryTimesList,
  })
  const openStaffToday = () => setModal({ title: 'Staff Attendance Today', subtitle: 'Full roster', icon: 'ri-team-line', columns: staffColumns, rows: staffList })
  const openPurchaseOrders = () => setModal({
    title: 'Purchase Orders', subtitle: 'Most recent',
    icon: 'ri-shopping-bag-3-line',
    columns: [
      { key: 'po_ref', label: 'Ref', render: (r) => r.po_ref || r.reference || r.id },
      { key: 'supplier', label: 'Supplier' },
      { key: 'amount', label: 'Amount', align: 'right', render: (r) => fmtNaira(r.amount) },
      { key: 'date', label: 'Date', render: (r) => r.date ? new Date(r.date).toLocaleDateString() : '—' },
      { key: 'status', label: 'Status', render: (r) => <Badge label={r.status} color={r.status === 'paid' ? 'green' : r.status === 'received' ? 'blue' : r.status === 'pending' ? 'amber' : 'red'} /> },
    ],
    rows: purchaseOrders,
  })
  const openStaffAbsent = () => setModal({ title: 'Staff Absent Today', subtitle: 'Not clocked in', icon: 'ri-user-unfollow-line', columns: staffColumns, rows: staffList.filter(s => s.status === 'absent') })
  const openDeliveryBreakdown = () => setModal({
    title: 'Delivery Status Breakdown', subtitle: 'Today',
    icon: 'ri-pie-chart-line',
    columns: [{ key: 'status', label: 'Status', render: (r) => (r.status || '').replace(/_/g, ' ') }, { key: 'count', label: 'Count', align: 'right' }],
    rows: Object.entries(breakdown).map(([status, count]) => ({ status, count })),
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Active Deliveries" value={kpis.active_deliveries ?? 0}           sub="Currently dispatched"      riIcon="ri-bike-line"            color="blue" onClick={openDeliveries} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Drivers On Duty"   value={kpis.drivers_on_duty ?? 0}             sub="Available on road"         riIcon="ri-steering-2-line"      color="teal" onClick={openDrivers} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Avg Delivery Time" value={`${kpis.avg_delivery_mins ?? 0} min`}  sub="vs target 30 min"          riIcon="ri-time-line"            color="amber" onClick={openAvgDeliveryTime} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Staff on Duty"     value={kpis.staff_on_duty ?? 0}               sub="Clocked in today"          riIcon="ri-team-line"            color="green" onClick={openStaffToday} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Purchase Orders"   value={purchaseOrders.length}                 sub="Recent POs"                riIcon="ri-shopping-bag-3-line"  color="red" onClick={openPurchaseOrders} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Staff Absent"      value={staffList.filter(s=>s.status==='absent').length} sub="Today" riIcon="ri-user-unfollow-line" color="purple" onClick={openStaffAbsent} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-bike-line text-info me-2" />Active Deliveries</h6>
              <Link to="/deliveries/active" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Ref</Th><Th>Customer</Th><Th>Driver</Th><Th>Zone</Th><Th>ETA</Th><Th>Status</Th></Thead>
                <Tbody>
                  {deliveries.length === 0 ? (
                    <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No active deliveries.</Td></Tr>
                  ) : deliveries.map((d) => (
                    <Tr key={d.id}>
                      <Td><span className="fw-medium fs-sm">{d.delivery_ref || d.id}</span></Td>
                      <Td>{d.customer}</Td>
                      <Td className="fs-sm">{d.driver || '—'}</Td>
                      <Td className="text-muted fs-sm">{d.zone || '—'}</Td>
                      <Td className="fw-medium fs-sm">{d.eta ? `${d.eta} min` : '—'}</Td>
                      <Td><Badge label={(d.status||'').replace(/_/g,' ')} color={d.status==='en_route'?'green':d.status==='awaiting_pickup'?'blue':d.status==='assigned'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openDeliveryBreakdown} role="button" tabIndex={0}>
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Delivery Status Breakdown</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Today</p>
              <div ref={deliveryRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-team-line text-primary me-2" />Staff Attendance Today</h6>
              <Link to="/staff/attendance" className="link link-custom fs-sm">Full roster →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Name</Th><Th>Role</Th><Th>Shift</Th><Th>Clock In</Th><Th>Status</Th></Thead>
                <Tbody>
                  {staffList.length === 0 ? (
                    <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No attendance records today.</Td></Tr>
                  ) : staffList.map((s, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-medium fs-sm mb-0">{s.name}</p></Td>
                      <Td className="text-muted fs-sm">{s.role}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs">{s.shift || '—'}</span></Td>
                      <Td className="fs-sm">{s.clock_in ? new Date(s.clock_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</Td>
                      <Td><Badge label={(s.status||'').replace(/_/g,' ')} color={s.status==='present'?'green':s.status==='absent'?'red':'amber'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-shopping-bag-3-line text-warning me-2" />Purchase Orders</h6>
              <Link to="/purchase" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Ref</Th><Th>Supplier</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th></Thead>
                <Tbody>
                  {purchaseOrders.length === 0 ? (
                    <Tr><Td colSpan={5} className="text-center text-muted py-4 fs-sm">No purchase orders.</Td></Tr>
                  ) : purchaseOrders.map((p, i) => (
                    <Tr key={i}>
                      <Td><span className="fw-medium fs-sm">{p.po_ref || p.reference || p.id}</span></Td>
                      <Td className="fs-sm">{p.supplier}</Td>
                      <Td className="fw-semibold fs-sm">{fmtNaira(p.amount)}</Td>
                      <Td className="text-muted fs-sm">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</Td>
                      <Td><Badge label={p.status} color={p.status==='paid'?'green':p.status==='received'?'blue':p.status==='pending'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

const customerColumns = [
  { key: 'name', label: 'Name', render: (r) => r.name },
  { key: 'phone', label: 'Phone', render: (r) => r.phone },
  { key: 'orders', label: 'Orders', align: 'right', render: (r) => r.total_orders ?? r.orders },
  { key: 'points', label: 'Points', align: 'right', render: (r) => `${(r.points ?? 0).toLocaleString()} pts` },
  { key: 'wallet', label: 'Wallet', align: 'right', render: (r) => fmtNaira(r.wallet_balance ?? r.wallet) },
  { key: 'status', label: 'Status', render: (r) => <Badge label={r.status} color={r.status === 'active' ? 'green' : 'red'} /> },
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
    chart: { type: 'area', height: 200, toolbar: { show: false } },
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
    title: 'New Customer Growth', subtitle: 'Last 6 months',
    icon: 'ri-line-chart-line',
    columns: [{ key: 'month', label: 'Month' }, { key: 'new_customers', label: 'New Customers', align: 'right' }],
    rows: data?.charts?.growth_last_6 ?? [],
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Total Customers"  value={(kpis.total_customers ?? 0).toLocaleString()} sub="All time"               riIcon="ri-group-line"          color="blue" onClick={() => openCustomers('Total Customers', 'Top 10 by order volume')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="New This Month"   value={kpis.new_this_month ?? 0}                    sub="Current month"          riIcon="ri-user-add-line"        color="green" onClick={openGrowth} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Loyalty Points"   value={(kpis.total_points ?? 0).toLocaleString()}   sub="Active balance"         riIcon="ri-vip-crown-line"       color="amber" onClick={() => openCustomers('Loyalty Points', 'By customer, top 10')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Lifetime Points"  value={(kpis.lifetime_points ?? 0).toLocaleString()} sub="All time issued"        riIcon="ri-medal-line"           color="teal" onClick={() => openCustomers('Lifetime Points', 'By customer, top 10')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Wallet Balance"   value={fmtNaira(kpis.wallet_balance)}               sub="Combined customer wallets" riIcon="ri-wallet-3-line"     color="purple" onClick={() => openCustomers('Wallet Balance', 'By customer, top 10')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Wallet Funded"    value={fmtNaira(kpis.wallet_funded)}                sub="Total top-ups"          riIcon="ri-bank-card-line"       color="green" onClick={() => openCustomers('Wallet Funded', 'By customer, top 10')} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-5">
          <div className="card mb-0 chart-panel-clickable" onClick={openGrowth} role="button" tabIndex={0}>
            <div className="card-body">
              <h6 className="fw-semibold mb-0">New Customer Growth</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Last 6 months</p>
              <div ref={growthRef} />
            </div>
          </div>
        </div>
        <div className="col-xl-7">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0">Loyalty &amp; Wallet Summary</h6>
              <Link to="/customers/loyalty" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body">
              <div className="row g-3 text-center">
                {[
                  { label: 'Points Issued',   value: (kpis.lifetime_points ?? 0).toLocaleString(), icon: 'ri-medal-line',       color: 'bg-warning-subtle text-warning' },
                  { label: 'Points Balance',  value: (kpis.total_points ?? 0).toLocaleString(),    icon: 'ri-coin-line',         color: 'bg-info-subtle text-info' },
                  { label: 'Wallet Funded',   value: fmtNaira(kpis.wallet_funded),                 icon: 'ri-wallet-3-line',     color: 'bg-primary-subtle text-primary' },
                  { label: 'Wallet Spent',    value: fmtNaira(kpis.wallet_spent),                  icon: 'ri-shopping-bag-line', color: 'bg-danger-subtle text-danger' },
                  { label: 'Wallet Balance',  value: fmtNaira(kpis.wallet_balance),                icon: 'ri-bank-card-line',    color: 'bg-success-subtle text-success' },
                  { label: 'New This Month',  value: kpis.new_this_month ?? 0,                     icon: 'ri-user-add-line',     color: 'bg-secondary-subtle text-secondary' },
                ].map(({ label, value, icon, color }) => (
                  <div className="col-4" key={label}>
                    <div className={`rounded p-3 d-flex flex-column align-items-center gap-1 ${color.split(' ')[0]}`}>
                      <i className={`${icon} fs-4 ${color.split(' ')[1]}`} />
                      <h6 className="fw-bold mb-0 mt-1">{value}</h6>
                      <p className="mb-0" style={{ fontSize: 10, opacity: 0.75 }}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="fw-semibold mb-0">Top Customers</h6>
          <Link to="/customers" className="link link-custom fs-sm">View all →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Name</Th><Th>Phone</Th><Th>Total Orders</Th><Th>Points</Th><Th>Wallet</Th><Th>Status</Th></Thead>
            <Tbody>
              {customers.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-muted py-4 fs-sm">No customers yet.</Td></Tr>
              ) : customers.map((c, i) => (
                <Tr key={i}>
                  <Td><p className="fw-medium fs-sm mb-0">{c.name}</p></Td>
                  <Td className="text-muted fs-sm">{c.phone}</Td>
                  <Td className="fw-semibold">{c.total_orders ?? c.orders}</Td>
                  <Td><span className="badge bg-warning-subtle text-warning">{(c.points ?? 0).toLocaleString()} pts</span></Td>
                  <Td className="fw-medium">{fmtNaira(c.wallet_balance ?? c.wallet)}</Td>
                  <Td><Badge label={c.status} color={c.status==='active'?'green':'red'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
          <DetailTable columns={modal.columns} rows={modal.rows} />
        </DetailModal>
      )}
    </>
  )
}

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
    const vals = [breakdown.new ?? 0, breakdown.pending ?? 0, breakdown.resolved ?? 0]
    return {
      chart: { type: 'donut', height: 200 },
      series: vals.some(v => v > 0) ? vals : [1],
      labels: ['New', 'Pending', 'Resolved'],
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
    { key: 'customer', label: 'Customer' },
    { key: 'query', label: 'Message', render: (r) => `"${r.query}"` },
    { key: 'status', label: 'Status', render: (r) => <Badge label={r.status} color={r.status === 'new' ? 'amber' : r.status === 'resolved' ? 'green' : 'blue'} /> },
    { key: 'created_at', label: 'Time', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
  ]
  const openConvs = (title, sub, rows = convs) => setModal({ title, subtitle: sub, icon: 'ri-robot-line', columns: convColumns, rows })
  const openDietaryRules = () => setModal({
    title: 'Active Dietary Rules', subtitle: 'Configured constraints',
    icon: 'ri-file-list-3-line',
    columns: [
      { key: 'name', label: 'Rule', render: (r) => r.name || r.condition || r.rule },
      { key: 'scope', label: 'Scope', render: (r) => r.scope || r.rule_text || 'Active constraint' },
      { key: 'status', label: 'Status', render: (r) => <Badge label={r.status || 'active'} color="green" /> },
    ],
    rows: dietaryRules,
  })
  const openMealAssocs = () => setModal({
    title: 'Meal Associations', subtitle: 'Product ↔ meal links',
    icon: 'ri-links-line',
    columns: [{ key: 'meal', label: 'Meal' }, { key: 'association_count', label: 'Associations', align: 'right' }],
    rows: mealAssocs,
  })
  const openBreakdown = () => setModal({
    title: 'Conversation Status', subtitle: 'Today',
    icon: 'ri-pie-chart-line',
    columns: [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count', align: 'right' }],
    rows: [
      { status: 'New', count: breakdown.new ?? 0 },
      { status: 'Pending', count: breakdown.pending ?? 0 },
      { status: 'Resolved', count: breakdown.resolved ?? 0 },
    ],
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Conversations Today" value={kpis.conversations_today ?? 0} sub="Today total"          riIcon="ri-robot-line"           color="blue" onClick={() => openConvs('Conversations Today', 'Most recent conversations')} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Pending Replies"     value={kpis.pending_replies ?? 0}     sub="Needs attention"      riIcon="ri-message-3-line"       color="amber" onClick={() => openConvs('Pending Replies', 'Awaiting a response', convs.filter(c => c.status === 'pending'))} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Resolved Today"      value={breakdown.resolved ?? 0}       sub="Successfully answered" riIcon="ri-checkbox-circle-line" color="green" onClick={() => openConvs('Resolved Today', 'Successfully answered', convs.filter(c => c.status === 'resolved'))} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Dietary Rules"       value={kpis.dietary_rules ?? 0}       sub="Active constraints"   riIcon="ri-file-list-3-line"     color="teal" onClick={openDietaryRules} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="Meal Associations"   value={kpis.meal_associations ?? 0}   sub="Product ↔ meal links" riIcon="ri-links-line"           color="purple" onClick={openMealAssocs} /></div>
        <div className="col-6 col-sm-4 col-xl-2"><StatsCard title="New Today"           value={breakdown.new ?? 0}            sub="Unread conversations" riIcon="ri-notification-3-line"  color="red" onClick={() => openConvs('New Today', 'Unread conversations', convs.filter(c => c.status === 'new'))} /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card mb-0 h-100 chart-panel-clickable" onClick={openBreakdown} role="button" tabIndex={0}>
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Conversation Status</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Today</p>
              <div ref={aiRef} />
              <div className="row text-center mt-3 g-0">
                <div className="col-4 border-end"><h6 className="fw-bold text-warning mb-0">{breakdown.new ?? 0}</h6><p className="text-muted mb-0" style={{ fontSize: 10 }}>New</p></div>
                <div className="col-4 border-end"><h6 className="fw-bold text-primary mb-0">{breakdown.pending ?? 0}</h6><p className="text-muted mb-0" style={{ fontSize: 10 }}>Pending</p></div>
                <div className="col-4"><h6 className="fw-bold text-success mb-0">{breakdown.resolved ?? 0}</h6><p className="text-muted mb-0" style={{ fontSize: 10 }}>Resolved</p></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-robot-line text-primary me-2" />Recent AI Conversations</h6>
              <Link to="/chef-bems/conversations" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              {convs.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No conversations today.</p>
              ) : convs.map((c, i) => (
                <div key={i} className={`px-4 py-3 d-flex align-items-start gap-3 ${i < convs.length-1 ? 'border-bottom' : ''}`}>
                  <div className="avatar size-8 rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ fontSize: 11 }}>
                    {(c.customer||'?').split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <p className="fw-medium fs-sm mb-1">{c.customer}</p>
                      <Badge label={c.status} color={c.status==='new'?'amber':c.status==='resolved'?'green':'blue'} />
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>"{c.query}"</p>
                    <span className="text-muted" style={{ fontSize: 10 }}>{c.created_at ? new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-file-list-3-line text-info me-2" />Active Dietary Rules</h6>
              <Link to="/chef-bems/dietary-rules" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              {dietaryRules.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No dietary rules configured.</p>
              ) : dietaryRules.map((r, i) => (
                <div key={i} className={`px-4 py-3 d-flex align-items-center justify-content-between ${i < dietaryRules.length-1 ? 'border-bottom' : ''}`}>
                  <div>
                    <p className="fw-medium fs-sm mb-0">{r.name || r.condition || r.rule}</p>
                    <span className="text-muted" style={{ fontSize: 11 }}>{r.scope || r.rule_text || 'Active constraint'}</span>
                  </div>
                  <Badge label={r.status || 'active'} color="green" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-links-line text-success me-2" />Meal Associations</h6>
              <Link to="/chef-bems/meal-associations" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              {mealAssocs.length === 0 ? (
                <p className="text-muted text-center py-4 fs-sm">No meal associations yet.</p>
              ) : mealAssocs.map((m, i) => (
                <div key={i} className={`px-4 py-3 ${i < mealAssocs.length-1 ? 'border-bottom' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <p className="fw-medium fs-sm mb-0">{m.meal}</p>
                    <span className="text-muted fs-xs">{m.association_count} associations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <DetailModal title={modal.title} subtitle={modal.subtitle} icon={modal.icon} onClose={() => setModal(null)}>
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
        <Link to="/reports/sales" className="btn btn-sm btn-success ms-2">
          <i className="ri-bar-chart-2-line me-1" /> Reports
        </Link>
      </PageHeader>

      {/* Tab Bar */}
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

      {/* Active Tab */}
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
