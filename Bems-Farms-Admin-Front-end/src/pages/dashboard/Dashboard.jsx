import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import StatsCard from '../../components/ui/StatsCard'
import Badge, { statusColor } from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
function fmt(n)         { return Number(n || 0).toLocaleString('en-NG') }
function fmtCurrency(n) { return `₦${fmt(n)}` }

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

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = '100%', mb = 8 }) {
  return (
    <div style={{
      height: h, width: w, marginBottom: mb, borderRadius: 6,
      background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-muted) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}

// ── Card helpers ──────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'var(--bg-card)',
  borderRadius: 12,
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  height: '100%',
}

function Card({ children, style }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>
}

function CardHeader({ children }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {children}
    </div>
  )
}

function CardTitle({ icon, children }) {
  return (
    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon && <i className={icon} style={{ fontSize: 15, color: 'var(--text-muted)' }} />}
      {children}
    </span>
  )
}

function ViewLink({ to, children }) {
  return (
    <Link to={to} style={{ fontSize: 12, fontWeight: 600, color: '#1B4332', textDecoration: 'none' }}>
      {children}
    </Link>
  )
}

function CardBody({ children, flush }) {
  return <div style={{ padding: flush ? 0 : '16px' }}>{children}</div>
}

// ── Grid helpers ──────────────────────────────────────────────────────────────
function StatGrid({ children, cols = 'repeat(auto-fill, minmax(160px, 1fr))' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, marginBottom: 20 }}>
      {children}
    </div>
  )
}

function TwoCol({ left, right, ratio = '1fr 1fr', gap = 16, mb = 20 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: ratio, gap, marginBottom: mb }}>
      {left}
      {right}
    </div>
  )
}

// ── Shared chart theme ────────────────────────────────────────────────────────
const CHART = {
  green: '#1B4332', greenLight: '#40916C',
  orange: '#F57C00', blue: '#3b82f6',
  amber: '#f59e0b', red: '#ef4444',
  grid: '#f1f5f9',
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
const PIPELINE = [
  { label: 'Confirmed',   key: 'confirmed',       icon: 'ri-time-line',            text: '#b45309', bg: '#fef3c7', link: '/orders' },
  { label: 'Processing',  key: 'processing',      icon: 'ri-archive-stack-line',   text: '#1d4ed8', bg: '#dbeafe', link: '/orders' },
  { label: 'Dispatched',  key: 'driver_assigned', icon: 'ri-truck-line',           text: '#0e7490', bg: '#cffafe', link: '/deliveries/active' },
  { label: 'Delivered',   key: 'delivered',       icon: 'ri-checkbox-circle-line', text: '#166534', bg: '#dcfce7', link: '/orders' },
  { label: 'Cancelled',   key: 'cancelled',       icon: 'ri-close-circle-line',    text: '#dc2626', bg: '#fee2e2', link: '/orders' },
  { label: 'New Orders',  key: 'new_order',       icon: 'ri-shopping-bag-3-line',  text: '#475569', bg: '#f1f5f9', link: '/orders' },
]

const QUICK_ACTIONS = [
  { label: 'New Order',    icon: 'ri-add-circle-line',        to: '/orders',          bg: '#1B4332', text: '#fff' },
  { label: 'New Purchase', icon: 'ri-shopping-bag-3-line',    to: '/purchase/add',    bg: '#f59e0b', text: '#fff' },
  { label: 'Add Product',  icon: 'ri-price-tag-3-line',       to: '/products/add',    bg: '#06b6d4', text: '#fff' },
  { label: 'Add Customer', icon: 'ri-user-add-line',          to: '/customers',       bg: '#6b7280', text: '#fff' },
  { label: 'POS Terminal', icon: 'ri-store-2-line',           to: '/pos',             bg: '#111827', text: '#fff' },
  { label: 'Add Staff',    icon: 'ri-team-line',              to: '/staff/add',       bg: '#7c3aed', text: '#fff' },
  { label: 'Sales Report', icon: 'ri-bar-chart-grouped-line', to: '/reports/sales',   bg: '#fff',    text: '#1B4332', border: '1.5px solid #1B4332' },
]

function OverviewTab({ data, isDark }) {
  const revenueRef = useRef(null)
  const ordersRef  = useRef(null)
  const { kpis = {}, charts = {}, recent_orders = [], pipeline = {} } = data

  useApexChart(revenueRef, () => ({
    chart: { type: 'area', height: 200, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [{ name: 'Revenue (₦)', data: (charts.week_revenue || []).map(r => r.revenue) }],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [CHART.green],
    xaxis: { categories: (charts.week_revenue || []).map(r => r.label), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: v => `₦${(v / 1000).toFixed(0)}k` } },
    grid: { borderColor: isDark ? '#334155' : CHART.grid, strokeDashArray: 4 },
    tooltip: { y: { formatter: v => fmtCurrency(v) } },
  }), [data, isDark])

  useApexChart(ordersRef, () => ({
    chart: { type: 'bar', height: 200, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [{ name: 'Orders', data: (charts.week_orders || []).map(r => r.orders) }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    colors: [CHART.orange],
    xaxis: { categories: (charts.week_orders || []).map(r => r.label), axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { borderColor: isDark ? '#334155' : CHART.grid, strokeDashArray: 4 },
  }), [data, isDark])

  return (
    <>
      <StatGrid>
        <StatsCard title="Today's Revenue"    value={fmtCurrency(kpis.revenue_today)}   sub={`${fmt(kpis.orders_today)} orders today`} riIcon="ri-money-dollar-circle-line" color="green" />
        <StatsCard title="Pending Orders"      value={fmt(kpis.pending_orders)}          sub="Awaiting action"  riIcon="ri-shopping-cart-2-line" color="amber" />
        <StatsCard title="Active Deliveries"   value={fmt(kpis.active_deliveries)}       sub="En route now"     riIcon="ri-bike-line"            color="blue" />
        <StatsCard title="Low Stock Alerts"    value={fmt(kpis.low_stock_alerts)}        sub="Action required"  riIcon="ri-alert-line"           color="red" />
        <StatsCard title="Active Customers"    value={fmt(kpis.active_customers)}        sub="Last 30 days"     riIcon="ri-user-3-line"          color="purple" />
        <StatsCard title="Staff on Duty"       value={fmt(kpis.staff_on_duty)}           sub="Clocked in today" riIcon="ri-team-line"            color="teal" />
      </StatGrid>

      {/* Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {PIPELINE.map(({ label, key, icon, text, bg, link }) => (
          <Link key={label} to={link} style={{ textDecoration: 'none' }}>
            <div style={{ ...cardStyle, height: 'auto' }}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={icon} style={{ fontSize: 16 }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{fmt(pipeline[key] || 0)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <TwoCol ratio="2fr 1fr"
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Revenue This Week</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>Daily revenue in Naira</div>
              <div ref={revenueRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Orders Per Day</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>This week</div>
              <div ref={ordersRef} />
            </CardBody>
          </Card>
        }
      />

      {/* Quick actions + Recent orders */}
      <TwoCol ratio="1fr 2fr"
        left={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-flashlight-line">Quick Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {QUICK_ACTIONS.map(({ label, icon, to, bg, text, border }) => (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 10px', borderRadius: 8,
                    background: bg, color: text,
                    border: border ?? 'none',
                    textDecoration: 'none', fontSize: 12, fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <i className={icon} style={{ fontSize: 14 }} />
                    {label}
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <ViewLink to="/orders">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead>
                  <Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th>
                </Thead>
                <Tbody>
                  {recent_orders.map(o => (
                    <Tr key={o.id}>
                      <Td><Link to={`/orders/${o.id}`} style={{ fontWeight: 600, fontSize: 13, color: '#1B4332', textDecoration: 'none' }}>{o.id}</Link></Td>
                      <Td>{o.customer}</Td>
                      <Td>{o.items}</Td>
                      <Td style={{ fontWeight: 700 }}>{fmtCurrency(o.total)}</Td>
                      <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                      <Td style={{ color: '#9ca3af', fontSize: 11 }}>{new Date(o.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</Td>
                    </Tr>
                  ))}
                  {recent_orders.length === 0 && (
                    <Tr><Td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>No orders today yet</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
      />
    </>
  )
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab({ data, isDark }) {
  const revMonthRef  = useRef(null)
  const categoryRef  = useRef(null)
  const paymentRef   = useRef(null)
  const sourceRef    = useRef(null)
  const { kpis = {}, charts = {}, top_products = [], recent_orders = [] } = data

  useApexChart(revMonthRef, () => ({
    chart: { type: 'area', height: 220, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [{ name: 'Revenue', data: (charts.last_6_months || []).map(r => parseFloat(r.revenue)) }],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [CHART.green],
    xaxis: { categories: (charts.last_6_months || []).map(r => r.month), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: v => `₦${(v / 1000).toFixed(0)}k` } },
    grid: { borderColor: isDark ? '#1E293B' : CHART.grid, strokeDashArray: 4 },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => fmtCurrency(v) } },
  }), [data, isDark])

  useApexChart(categoryRef, () => ({
    chart: { type: 'donut', height: 220, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: (charts.by_category || []).map(r => parseFloat(r.revenue)),
    labels: (charts.by_category || []).map(r => r.category),
    colors: [CHART.green, CHART.orange, CHART.blue, CHART.amber, CHART.red, '#8b5cf6'],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: isDark ? '#9CA3AF' : '#374151' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { colors: [isDark ? '#101726' : '#ffffff'] },
  }), [data, isDark])

  useApexChart(paymentRef, () => ({
    chart: { type: 'donut', height: 220, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: (charts.by_payment || []).map(r => parseInt(r.count)),
    labels: (charts.by_payment || []).map(r => r.method),
    colors: [CHART.green, CHART.orange, CHART.blue, CHART.amber],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: isDark ? '#9CA3AF' : '#374151' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { colors: [isDark ? '#101726' : '#ffffff'] },
  }), [data, isDark])

  useApexChart(sourceRef, () => ({
    chart: { type: 'donut', height: 220, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: (charts.by_source || []).map(r => parseInt(r.count)),
    labels: (charts.by_source || []).map(r => r.source),
    colors: [CHART.green, CHART.blue, CHART.orange, CHART.amber],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: isDark ? '#9CA3AF' : '#374151' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { colors: [isDark ? '#101726' : '#ffffff'] },
  }), [data, isDark])

  return (
    <>
      <StatGrid>
        <StatsCard title="Today's Revenue"  value={fmtCurrency(kpis.revenue_today)}   sub={`${fmt(kpis.orders_today)} orders`} riIcon="ri-money-dollar-circle-line" color="green" />
        <StatsCard title="Monthly Revenue"  value={fmtCurrency(kpis.revenue_month)}   sub="This month"   riIcon="ri-line-chart-line"       color="green" />
        <StatsCard title="Orders Today"     value={fmt(kpis.orders_today)}            sub="Total orders" riIcon="ri-shopping-cart-2-line"  color="blue" />
        <StatsCard title="Avg Order Value"  value={fmtCurrency(kpis.avg_order_value)} sub="Per order"    riIcon="ri-funds-line"            color="amber" />
        <StatsCard title="Monthly Orders"   value={fmt(kpis.orders_month)}            sub="This month"   riIcon="ri-bar-chart-line"        color="teal" />
      </StatGrid>

      <TwoCol ratio="2fr 1fr"
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Revenue Last 6 Months</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Monthly totals</div>
              <div ref={revMonthRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Revenue by Category</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>This month</div>
              <div ref={categoryRef} />
            </CardBody>
          </Card>
        }
      />

      <TwoCol ratio="1fr 1fr"
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>By Payment Method</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>This month</div>
              <div ref={paymentRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>By Order Source</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>This month</div>
              <div ref={sourceRef} />
            </CardBody>
          </Card>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <ViewLink to="/reports/sales">Full report →</ViewLink>
        </CardHeader>
        <CardBody flush>
          <Table>
            <Thead><Th>#</Th><Th>Product</Th><Th>Sold</Th><Th>Revenue</Th></Thead>
            <Tbody>
              {top_products.map((p, i) => (
                <Tr key={p.sku || i}>
                  <Td style={{ fontWeight: 700, color: '#9ca3af' }}>{i + 1}</Td>
                  <Td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.sku}</div>
                  </Td>
                  <Td style={{ fontWeight: 700 }}>{fmt(p.sold)}</Td>
                  <Td style={{ fontWeight: 700, color: '#166534' }}>{fmtCurrency(p.revenue)}</Td>
                </Tr>
              ))}
              {top_products.length === 0 && (
                <Tr><Td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No sales data yet</Td></Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <ViewLink to="/orders">View all →</ViewLink>
        </CardHeader>
        <CardBody flush>
          <Table>
            <Thead><Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th></Thead>
            <Tbody>
              {recent_orders.map(o => (
                <Tr key={o.id}>
                  <Td><Link to={`/orders/${o.id}`} style={{ fontWeight: 600, color: '#1B4332', textDecoration: 'none' }}>{o.id}</Link></Td>
                  <Td>{o.customer}</Td>
                  <Td>{o.items}</Td>
                  <Td style={{ fontWeight: 700 }}>{fmtCurrency(o.total)}</Td>
                  <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                  <Td style={{ color: '#9ca3af', fontSize: 11 }}>{new Date(o.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</Td>
                </Tr>
              ))}
              {recent_orders.length === 0 && (
                <Tr><Td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No orders yet</Td></Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  )
}

// ── Finance Tab ───────────────────────────────────────────────────────────────
function FinanceTab({ data, isDark }) {
  const incomeRef = useRef(null)
  const { kpis = {}, bank_accounts = [], supplier_dues = [], charts = {} } = data

  useApexChart(incomeRef, () => ({
    chart: { type: 'line', height: 220, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [
      { name: 'Income',   data: (charts.last_6_months || []).map(r => parseFloat(r.income)) },
      { name: 'Expenses', data: (charts.last_6_months || []).map(r => parseFloat(r.expenses)) },
    ],
    stroke: { curve: 'smooth', width: [2, 2] },
    colors: [CHART.green, CHART.red],
    dataLabels: { enabled: false },
    xaxis: { categories: (charts.last_6_months || []).map(r => r.month), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: v => `₦${(v / 1000).toFixed(0)}k` } },
    grid: { borderColor: isDark ? '#1E293B' : CHART.grid, strokeDashArray: 4 },
    legend: { position: 'top', labels: { colors: isDark ? '#9CA3AF' : '#374151' } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => fmtCurrency(v) } },
  }), [data, isDark])

  return (
    <>
      <StatGrid>
        <StatsCard title="Monthly Revenue"   value={fmtCurrency(kpis.revenue_month)}     sub="This month"  riIcon="ri-money-dollar-circle-line" color="green" />
        <StatsCard title="Monthly Expenses"  value={fmtCurrency(kpis.expenses_month)}    sub="This month"  riIcon="ri-subtract-line"            color="red" />
        <StatsCard title="Net Profit"        value={fmtCurrency(kpis.net_profit)}        sub="This month"  riIcon="ri-funds-line"               color="blue" />
        <StatsCard title="Profit Margin"     value={`${kpis.profit_margin || 0}%`}       sub="This month"  riIcon="ri-percent-line"             color="teal" />
        <StatsCard title="Total Bank Bal."   value={fmtCurrency(kpis.total_bank_balance)} sub="All accounts" riIcon="ri-bank-line"              color="purple" />
      </StatGrid>

      <Card style={{ marginBottom: 20 }}>
        <CardBody>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Income vs Expenses</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Last 6 months</div>
          <div ref={incomeRef} />
        </CardBody>
      </Card>

      <TwoCol
        left={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-bank-line">Bank Accounts</CardTitle>
              <ViewLink to="/accounts/bank">Manage →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Account</Th><Th>Bank</Th><Th>Type</Th><Th>Balance</Th></Thead>
                <Tbody>
                  {bank_accounts.map((a, i) => (
                    <Tr key={i}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{a.account_name}</Td>
                      <Td style={{ fontSize: 13 }}>{a.bank_name}</Td>
                      <Td><span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 50, fontWeight: 600 }}>{a.account_type}</span></Td>
                      <Td style={{ fontWeight: 700, color: '#166534' }}>{fmtCurrency(a.balance)}</Td>
                    </Tr>
                  ))}
                  {bank_accounts.length === 0 && (
                    <Tr><Td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No bank accounts yet</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-truck-line">Supplier Payments Due</CardTitle>
              <ViewLink to="/suppliers/payments">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Supplier</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></Thead>
                <Tbody>
                  {supplier_dues.map((s, i) => (
                    <Tr key={i}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{s.supplier_name || s.description}</Td>
                      <Td style={{ fontWeight: 700, fontSize: 13 }}>{fmtCurrency(s.amount)}</Td>
                      <Td style={{ fontSize: 13 }}>{s.due_date ? new Date(s.due_date).toLocaleDateString('en-NG') : '—'}</Td>
                      <Td><Badge label={s.status} color={s.status === 'paid' ? 'green' : s.status === 'approved' ? 'blue' : 'amber'} /></Td>
                    </Tr>
                  ))}
                  {supplier_dues.length === 0 && (
                    <Tr><Td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No pending dues</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
      />
    </>
  )
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab({ data, isDark }) {
  const stockRef = useRef(null)
  const { kpis = {}, low_stock_items = [], inventory_list = [], charts = {} } = data

  useApexChart(stockRef, () => ({
    chart: { type: 'bar', height: 220, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [{ name: 'Stock Value (₦)', data: (charts.value_by_category || []).map(r => parseFloat(r.value)) }],
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: false },
    colors: [CHART.green],
    xaxis: { categories: (charts.value_by_category || []).map(r => r.category), axisBorder: { show: false } },
    grid: { borderColor: isDark ? '#334155' : CHART.grid, strokeDashArray: 4 },
    tooltip: { y: { formatter: v => fmtCurrency(v) } },
  }), [data, isDark])

  return (
    <>
      <StatGrid cols="repeat(auto-fill, minmax(200px, 1fr))">
        <StatsCard title="Total Active SKUs"    value={fmt(kpis.total_skus)}      sub="All products"    riIcon="ri-price-tag-3-line"   color="blue" />
        <StatsCard title="Total Stock Value"    value={fmtCurrency(kpis.total_value)} sub="All products" riIcon="ri-store-line"         color="green" />
        <StatsCard title="Below Reorder Level"  value={fmt(kpis.low_stock_count)} sub="Need restocking" riIcon="ri-alert-line"         color="red" />
        <StatsCard title="Expiring (7 days)"    value={fmt(kpis.expiring_count)}  sub="Check batches"   riIcon="ri-timer-flash-line"   color="amber" />
      </StatGrid>

      <TwoCol
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Stock Value by Category</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>Current value</div>
              <div ref={stockRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-alert-line">Low Stock Items</CardTitle>
              <ViewLink to="/inventory/alerts">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              {low_stock_items.length === 0
                ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No low stock items 🎉</div>
                : low_stock_items.map((item, i) => (
                    <div key={item.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < low_stock_items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ri-archive-stack-line" style={{ fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                          <Badge label="Low Stock" color="red" />
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.sku}</div>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>{item.qty} units</span>
                          <span style={{ color: '#9ca3af' }}> · reorder at {item.reorder_qty}</span>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </CardBody>
          </Card>
        }
      />

      <Card style={{ marginTop: 4 }}>
        <CardHeader>
          <CardTitle>Inventory Stock List</CardTitle>
          <ViewLink to="/inventory/stock">Full list →</ViewLink>
        </CardHeader>
        <CardBody flush>
          <Table>
            <Thead><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th>Qty</Th><Th>Value</Th><Th>Status</Th></Thead>
            <Tbody>
              {inventory_list.map((item, i) => (
                <Tr key={i}>
                  <Td style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</Td>
                  <Td><span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 50, fontWeight: 600 }}>{item.sku}</span></Td>
                  <Td style={{ fontSize: 13, color: '#6b7280' }}>{item.category}</Td>
                  <Td style={{ fontWeight: 700 }}>{item.qty}</Td>
                  <Td style={{ fontSize: 13 }}>{fmtCurrency(item.value)}</Td>
                  <Td><Badge label={item.stock_status?.replace('_', ' ')} color={item.stock_status === 'low' || item.stock_status === 'out_of_stock' ? 'red' : 'green'} /></Td>
                </Tr>
              ))}
              {inventory_list.length === 0 && (
                <Tr><Td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No products yet</Td></Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  )
}

// ── Operations Tab ────────────────────────────────────────────────────────────
function OperationsTab({ data, isDark }) {
  const deliveryRef = useRef(null)
  const { kpis = {}, active_deliveries = [], staff_today = [], purchase_orders = [], delivery_breakdown = {} } = data

  useApexChart(deliveryRef, () => ({
    chart: { type: 'donut', height: 200, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: Object.values(delivery_breakdown).map(Number),
    labels: Object.keys(delivery_breakdown),
    colors: [CHART.green, CHART.orange, CHART.blue, CHART.red, '#6b7280'],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: isDark ? '#9CA3AF' : '#374151' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { colors: [isDark ? '#101726' : '#ffffff'] },
  }), [data, isDark])

  return (
    <>
      <StatGrid cols="repeat(auto-fill, minmax(200px, 1fr))">
        <StatsCard title="Active Deliveries"  value={fmt(kpis.active_deliveries)}     sub="En route"   riIcon="ri-bike-line"         color="blue" />
        <StatsCard title="Drivers On Duty"    value={fmt(kpis.drivers_on_duty)}       sub="Available"  riIcon="ri-steering-2-line"   color="teal" />
        <StatsCard title="Avg Delivery Time"  value={`${kpis.avg_delivery_mins || 0} min`} sub="Today" riIcon="ri-time-line"         color="amber" />
        <StatsCard title="Staff on Duty"      value={fmt(kpis.staff_on_duty)}         sub="Clocked in" riIcon="ri-team-line"         color="green" />
      </StatGrid>

      <TwoCol ratio="2fr 1fr"
        left={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-bike-line">Active Deliveries</CardTitle>
              <ViewLink to="/deliveries/active">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Ref</Th><Th>Customer</Th><Th>Driver</Th><Th>Zone</Th><Th>ETA</Th><Th>Status</Th></Thead>
                <Tbody>
                  {active_deliveries.map(d => (
                    <Tr key={d.id}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{d.delivery_ref}</Td>
                      <Td>{d.customer}</Td>
                      <Td style={{ fontSize: 13 }}>{d.driver}</Td>
                      <Td style={{ fontSize: 13, color: '#6b7280' }}>{d.zone}</Td>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{d.eta ? `${d.eta} min` : '—'}</Td>
                      <Td><Badge label={d.status?.replace('_', ' ')} color={statusColor(d.status)} /></Td>
                    </Tr>
                  ))}
                  {active_deliveries.length === 0 && (
                    <Tr><Td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No active deliveries</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Delivery Status</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Today's breakdown</div>
              <div ref={deliveryRef} />
            </CardBody>
          </Card>
        }
      />

      <TwoCol
        left={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-team-line">Staff Attendance Today</CardTitle>
              <ViewLink to="/staff/attendance">Full roster →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Name</Th><Th>Role</Th><Th>Shift</Th><Th>Clock In</Th><Th>Status</Th></Thead>
                <Tbody>
                  {staff_today.map((s, i) => (
                    <Tr key={i}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</Td>
                      <Td style={{ fontSize: 12, color: '#6b7280' }}>{s.role}</Td>
                      <Td><span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 50, fontWeight: 600 }}>{s.shift}</span></Td>
                      <Td style={{ fontSize: 13 }}>{s.clock_in || '—'}</Td>
                      <Td><Badge label={s.status?.replace('_', ' ')} color={s.status === 'present' ? 'green' : s.status === 'absent' ? 'red' : 'amber'} /></Td>
                    </Tr>
                  ))}
                  {staff_today.length === 0 && (
                    <Tr><Td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No attendance records today</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-shopping-bag-3-line">Recent Purchase Orders</CardTitle>
              <ViewLink to="/purchase">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Ref</Th><Th>Description</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th></Thead>
                <Tbody>
                  {purchase_orders.map((p, i) => (
                    <Tr key={i}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{p.po_ref || p.reference}</Td>
                      <Td style={{ fontSize: 13 }}>{p.supplier || p.description}</Td>
                      <Td style={{ fontWeight: 700, fontSize: 13 }}>{fmtCurrency(p.amount)}</Td>
                      <Td style={{ fontSize: 13, color: '#6b7280' }}>{p.date ? new Date(p.date).toLocaleDateString('en-NG') : '—'}</Td>
                      <Td><Badge label={p.status} color={statusColor(p.status)} /></Td>
                    </Tr>
                  ))}
                  {purchase_orders.length === 0 && (
                    <Tr><Td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No purchase orders</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
      />
    </>
  )
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab({ data, isDark }) {
  const growthRef = useRef(null)
  const { kpis = {}, customer_list = [], charts = {} } = data

  useApexChart(growthRef, () => ({
    chart: { type: 'area', height: 200, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [{ name: 'New Customers', data: (charts.growth_last_6 || []).map(r => parseInt(r.new_customers)) }],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [CHART.orange],
    xaxis: { categories: (charts.growth_last_6 || []).map(r => r.month), axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { borderColor: isDark ? '#1E293B' : CHART.grid, strokeDashArray: 4 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  }), [data, isDark])

  return (
    <>
      <StatGrid>
        <StatsCard title="Total Customers" value={fmt(kpis.total_customers)}       sub="All time"          riIcon="ri-group-line"         color="blue" />
        <StatsCard title="New This Month"  value={fmt(kpis.new_this_month)}        sub="This month"        riIcon="ri-user-add-line"      color="green" />
        <StatsCard title="Loyalty Points"  value={fmt(kpis.total_points)}          sub="Current balance"   riIcon="ri-medal-line"         color="amber" />
        <StatsCard title="Lifetime Points" value={fmt(kpis.lifetime_points)}       sub="All time earned"   riIcon="ri-vip-crown-line"     color="teal" />
        <StatsCard title="Wallet Balance"  value={fmtCurrency(kpis.wallet_balance)} sub="Combined"         riIcon="ri-wallet-3-line"      color="purple" />
        <StatsCard title="Total Funded"    value={fmtCurrency(kpis.wallet_funded)} sub="All time"          riIcon="ri-money-cny-box-line" color="green" />
      </StatGrid>

      <TwoCol ratio="1fr 2fr"
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>New Customer Growth</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Last 6 months</div>
              <div ref={growthRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <ViewLink to="/customers">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              <Table>
                <Thead><Th>Name</Th><Th>Phone</Th><Th>Orders</Th><Th>Points</Th><Th>Wallet</Th><Th>Status</Th></Thead>
                <Tbody>
                  {customer_list.map((c, i) => (
                    <Tr key={i}>
                      <Td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</Td>
                      <Td style={{ fontSize: 13, color: '#6b7280' }}>{c.phone}</Td>
                      <Td style={{ fontWeight: 700 }}>{c.total_orders}</Td>
                      <Td><span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 50, fontWeight: 600 }}>{fmt(c.points)} pts</span></Td>
                      <Td style={{ fontWeight: 600 }}>{fmtCurrency(c.wallet_balance)}</Td>
                      <Td><Badge label={c.status} color={c.status === 'active' ? 'green' : 'red'} /></Td>
                    </Tr>
                  ))}
                  {customer_list.length === 0 && (
                    <Tr><Td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No customers yet</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        }
      />
    </>
  )
}

// ── Chef Bems AI Tab ──────────────────────────────────────────────────────────
function ChefBemsTab({ data, isDark }) {
  const aiRef = useRef(null)
  const { kpis = {}, dietary_rules = [], meal_associations = [], recent_convs = [], conv_breakdown = {} } = data

  useApexChart(aiRef, () => ({
    chart: { type: 'donut', height: 200, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: Object.values(conv_breakdown).map(Number),
    labels: Object.keys(conv_breakdown),
    colors: [CHART.green, CHART.amber, CHART.orange, CHART.red],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [data, isDark])

  return (
    <>
      <StatGrid cols="repeat(auto-fill, minmax(200px, 1fr))">
        <StatsCard title="Today's Conversations" value={fmt(kpis.conversations_today)} sub="AI sessions"       riIcon="ri-chat-3-line"     color="blue" />
        <StatsCard title="Cart Conversions"       value={fmt(kpis.cart_conversions)}   sub="Orders from AI"    riIcon="ri-shopping-cart-2-line" color="green" />
        <StatsCard title="Dietary Rules"          value={fmt(kpis.dietary_rules)}      sub="Active rules"      riIcon="ri-file-list-3-line" color="amber" />
        <StatsCard title="Meal Associations"      value={fmt(kpis.meal_associations)}  sub="Configured"        riIcon="ri-links-line"       color="purple" />
      </StatGrid>

      <TwoCol ratio="1fr 2fr"
        left={
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Conversation Status</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>Today</div>
              <div ref={aiRef} />
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-robot-line">Recent AI Conversations</CardTitle>
              <ViewLink to="/chef-bems/conversations">View all →</ViewLink>
            </CardHeader>
            <CardBody flush>
              {recent_convs.length === 0
                ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No conversations today</div>
                : recent_convs.map((c, i) => (
                    <div key={c.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < recent_convs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {(c.customer || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.customer}</span>
                          <Badge label={c.status} color={c.status === 'success' ? 'green' : c.status === 'failed' ? 'red' : 'amber'} />
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>"{c.query}"</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(c.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))
              }
            </CardBody>
          </Card>
        }
      />

      <TwoCol
        left={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-file-list-3-line">Active Dietary Rules</CardTitle>
              <ViewLink to="/chef-bems/dietary-rules">Manage →</ViewLink>
            </CardHeader>
            <CardBody flush>
              {dietary_rules.length === 0
                ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No dietary rules configured</div>
                : dietary_rules.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < dietary_rules.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.scope}</div>
                      </div>
                      <Badge label={r.status} color="green" />
                    </div>
                  ))
              }
            </CardBody>
          </Card>
        }
        right={
          <Card>
            <CardHeader>
              <CardTitle icon="ri-links-line">Meal Associations</CardTitle>
              <ViewLink to="/chef-bems/meal-associations">Manage →</ViewLink>
            </CardHeader>
            <CardBody flush>
              {meal_associations.length === 0
                ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No meal associations yet</div>
                : meal_associations.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < meal_associations.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{m.meal}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{m.association_count} associations</span>
                    </div>
                  ))
              }
            </CardBody>
          </Card>
        }
      />
    </>
  )
}

// ── TABS CONFIG ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',    label: 'Overview',       icon: 'ri-dashboard-2-line',          endpoint: '/dashboard/overview' },
  { key: 'sales',       label: 'Sales & Orders', icon: 'ri-shopping-cart-2-line',      endpoint: '/dashboard/sales' },
  { key: 'finance',     label: 'Finance',        icon: 'ri-money-dollar-circle-line',  endpoint: '/dashboard/finance' },
  { key: 'inventory',   label: 'Inventory',      icon: 'ri-archive-stack-line',        endpoint: '/dashboard/inventory' },
  { key: 'operations',  label: 'Operations',     icon: 'ri-truck-line',                endpoint: '/dashboard/operations' },
  { key: 'customers',   label: 'Customers',      icon: 'ri-group-line',                endpoint: '/dashboard/customers' },
  { key: 'ai',          label: 'Chef Bems AI',   icon: 'ri-robot-line',                endpoint: '/dashboard/ai', badge: 'AI' },
]

// ── Button helpers ────────────────────────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif', transition: 'opacity 0.15s',
  textDecoration: 'none',
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [tabData, setTabData]     = useState({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const loadTab = useCallback(async (tabKey) => {
    if (tabData[tabKey]) return
    const tab = TABS.find(t => t.key === tabKey)
    if (!tab) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(tab.endpoint)
      setTabData(prev => ({ ...prev, [tabKey]: res.data }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [tabData])

  useEffect(() => { loadTab(activeTab) }, [activeTab])

  const handleTabChange = key => {
    setActiveTab(key)
    loadTab(key)
  }

  const refresh = () => {
    setTabData(prev => ({ ...prev, [activeTab]: undefined }))
    setError(null)
    setTimeout(() => loadTab(activeTab), 50)
  }

  const data = tabData[activeTab] || {}

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>

      <PageHeader
        title={`Good ${getGreeting()}, ${user?.first_name ?? 'Admin'}`}
        subtitle={today}
        actions={
          <>
            <button
              onClick={refresh}
              style={{ ...btnBase, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <i className="ri-refresh-line" style={{ fontSize: 15 }} />
              Refresh
            </button>
            <Link to="/orders" style={{ ...btnBase, background: '#1B4332', color: '#fff', border: 'none' }}>
              <i className="ri-add-line" style={{ fontSize: 15 }} />
              New Order
            </Link>
          </>
        }
      />

      {/* Tab navigation */}
      <div style={{ ...cardStyle, marginBottom: 20, overflow: 'visible' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '13px 18px', whiteSpace: 'nowrap',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#F57C00' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid #F57C00' : '2px solid transparent',
                  marginBottom: -1,
                  fontFamily: 'Nunito, sans-serif',
                  transition: 'color 0.13s',
                }}
              >
                <i className={tab.icon} style={{ fontSize: 15 }} />
                {tab.label}
                {tab.badge && (
                  <span style={{ background: '#F57C00', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 50 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'var(--bg-red-faint)', border: '1px solid var(--border)', color: '#dc2626',
        }}>
          <i className="ri-error-warning-line" style={{ fontSize: 18, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{error}</span>
          <button
            onClick={refresh}
            style={{ ...btnBase, padding: '5px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#dc2626', fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !tabData[activeTab] && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ ...cardStyle, padding: 16 }}>
              <Skeleton h={60} />
            </div>
          ))}
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {!loading && tabData[activeTab] && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'overview'   && <OverviewTab   data={data} isDark={isDark} />}
            {activeTab === 'sales'      && <SalesTab      data={data} isDark={isDark} />}
            {activeTab === 'finance'    && <FinanceTab     data={data} isDark={isDark} />}
            {activeTab === 'inventory'  && <InventoryTab  data={data} isDark={isDark} />}
            {activeTab === 'operations' && <OperationsTab data={data} isDark={isDark} />}
            {activeTab === 'customers'  && <CustomersTab  data={data} isDark={isDark} />}
            {activeTab === 'ai'         && <ChefBemsTab   data={data} isDark={isDark} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
