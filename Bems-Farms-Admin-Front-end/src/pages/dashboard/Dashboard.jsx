import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StatsCard from '../../components/ui/StatsCard'
import Badge, { statusColor } from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table'
import { useAuth } from '../../context/AuthContext'

// ── Mock data ───────────────────────────────────────────────────────────────
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const REVENUE   = [45000, 62000, 38000, 71000, 88000, 115000, 94000]
const ORDERS    = [12, 18, 10, 22, 27, 34, 29]
const INCOME_6M    = [820000, 910000, 1050000, 980000, 1240000, 2100000]
const EXPENSES_6M  = [410000, 470000, 530000, 490000, 620000, 890000]
const MONTHS_6 = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

const RECENT_ORDERS = [
  { id: 'BF-2026-000124', customer: 'Amara Obi',     items: 4, total: '₦18,500', status: 'dispatched', time: '12 min ago' },
  { id: 'BF-2026-000123', customer: 'Tunde Adeyemi', items: 2, total: '₦7,200',  status: 'preparing',  time: '28 min ago' },
  { id: 'BF-2026-000122', customer: 'Mrs. Okonkwo',  items: 6, total: '₦31,000', status: 'delivered',  time: '1h ago' },
  { id: 'BF-2026-000121', customer: 'Kemi Balogun',  items: 1, total: '₦3,500',  status: 'confirmed',  time: '2h ago' },
  { id: 'BF-2026-000120', customer: 'Seun Abiodun',  items: 3, total: '₦12,800', status: 'delivered',  time: '3h ago' },
  { id: 'BF-2026-000119', customer: 'Biodun Afolabi', items: 5, total: '₦22,500', status: 'preparing', time: '4h ago' },
]

const LOW_STOCK = [
  { name: 'Tomatoes',     sku: 'VEG-001', qty: '3 kg',   reorder: '10 kg',  expires: '2 days' },
  { name: 'Spinach',      sku: 'VEG-004', qty: '1.5 kg', reorder: '5 kg',   expires: '1 day'  },
  { name: 'Organic Eggs', sku: 'EGG-002', qty: '6 pcs',  reorder: '24 pcs', expires: '5 days' },
  { name: 'Palm Oil',     sku: 'OIL-001', qty: '2 L',    reorder: '10 L',   expires: '30 days' },
]

const ACTIVE_DELIVERIES = [
  { id: 'DEL-001', customer: 'Amara Obi',     driver: 'Emeka Nwosu',   zone: 'VI, Lagos',    eta: '12 min', status: 'en-route'  },
  { id: 'DEL-002', customer: 'Tunde Adeyemi', driver: 'Chidi Obi',     zone: 'Lagos Island', eta: '28 min', status: 'picked-up' },
  { id: 'DEL-003', customer: 'Kemi Balogun',  driver: 'Femi Adekunle', zone: 'Ikeja',        eta: '45 min', status: 'assigned'  },
  { id: 'DEL-004', customer: 'Mrs. Okonkwo',  driver: '—',             zone: 'Lekki Phase 1',eta: '—',      status: 'pending'   },
]

const TOP_PRODUCTS = [
  { name: 'Jollof Rice Box',    sku: 'MEAL-001', sold: 142, revenue: '₦568,000', trend:  12 },
  { name: 'Grilled Tilapia',    sku: 'MEAL-004', sold:  98, revenue: '₦392,000', trend:   8 },
  { name: 'Egusi Soup + Eba',   sku: 'MEAL-002', sold:  87, revenue: '₦261,000', trend:  -3 },
  { name: 'Vegetable Stir-Fry', sku: 'MEAL-003', sold:  76, revenue: '₦228,000', trend:  21 },
  { name: 'Fresh Tilapia (kg)', sku: 'FSH-001',  sold:  65, revenue: '₦195,000', trend:   5 },
]

const STAFF_LIST = [
  { name: 'Ngozi Adeyemi',   role: 'Chef',    status: 'on-duty',  clockIn: '7:02 AM',  shift: 'Morning' },
  { name: 'Emeka Nwosu',     role: 'Driver',  status: 'on-duty',  clockIn: '8:00 AM',  shift: 'Morning' },
  { name: 'Aisha Bello',     role: 'Cashier', status: 'on-duty',  clockIn: '9:00 AM',  shift: 'Morning' },
  { name: 'Femi Adekunle',   role: 'Driver',  status: 'on-duty',  clockIn: '9:30 AM',  shift: 'Morning' },
  { name: 'Amaka Eze',       role: 'Chef',    status: 'absent',   clockIn: '—',        shift: 'Morning' },
  { name: 'Tolu Fashola',    role: 'Waiter',  status: 'on-leave', clockIn: '—',        shift: 'Afternoon' },
]

const SUPPLIER_DUES = [
  { name: 'Fresh Valley Traders', item: 'Vegetables', amount: '₦28,500', due: 'Today',    status: 'overdue'  },
  { name: 'Oceanic Fish Market',  item: 'Seafood',     amount: '₦45,000', due: 'Tomorrow', status: 'due-soon' },
  { name: 'Prime Supplies',       item: 'Cooking Oil', amount: '₦18,750', due: 'Jul 28',   status: 'upcoming' },
  { name: 'Naija Grains Ltd',     item: 'Rice/Beans',  amount: '₦32,000', due: 'Aug 2',    status: 'upcoming' },
]

const PURCHASE_ORDERS = [
  { id: 'PO-2026-041', supplier: 'Fresh Valley Traders', amount: '₦45,000', date: 'Jul 22', status: 'received'  },
  { id: 'PO-2026-040', supplier: 'Oceanic Fish Market',  amount: '₦62,000', date: 'Jul 20', status: 'pending'   },
  { id: 'PO-2026-039', supplier: 'Prime Supplies',       amount: '₦28,000', date: 'Jul 18', status: 'overdue'   },
  { id: 'PO-2026-038', supplier: 'Naija Grains Ltd',     amount: '₦38,500', date: 'Jul 15', status: 'paid'      },
]

const AI_CONVERSATIONS = [
  { customer: 'Kemi Balogun',  query: 'I want a weekly vegan meal plan',    status: 'new',      time: '11:02 AM' },
  { customer: 'Amara Obi',     query: 'Lactose-free options for dinner',     status: 'resolved', time: '10:24 AM' },
  { customer: 'Tunde Adeyemi', query: 'Low-carb options for diabetics',      status: 'pending',  time: '9:48 AM'  },
  { customer: 'Mrs. Okonkwo',  query: 'Can I substitute eba with wheat?',    status: 'new',      time: '9:10 AM'  },
  { customer: 'Biodun Afolabi',query: 'Calorie count for the fish platter',  status: 'resolved', time: '8:55 AM'  },
]

const CUSTOMER_LIST = [
  { name: 'Amara Obi',      phone: '+234 810 000 1234', orders: 24, points: 1240, wallet: '₦5,000', status: 'active'   },
  { name: 'Tunde Adeyemi',  phone: '+234 802 345 6789', orders: 12, points:  620, wallet: '₦1,200', status: 'active'   },
  { name: 'Mrs. Okonkwo',   phone: '+234 706 789 0123', orders: 38, points: 1900, wallet: '₦8,500', status: 'active'   },
  { name: 'Kemi Balogun',   phone: '+234 817 234 5678', orders:  4, points:  200, wallet: '₦0',     status: 'inactive' },
  { name: 'Seun Abiodun',   phone: '+234 803 456 7890', orders: 17, points:  850, wallet: '₦3,000', status: 'active'   },
]

const INVENTORY_ITEMS = [
  { name: 'Tomatoes',       sku: 'VEG-001', category: 'Vegetables', qty: '3 kg',    value: '₦900',    status: 'low'     },
  { name: 'Spinach',        sku: 'VEG-004', category: 'Vegetables', qty: '1.5 kg',  value: '₦600',    status: 'low'     },
  { name: 'Organic Eggs',   sku: 'EGG-002', category: 'Poultry',    qty: '6 pcs',   value: '₦1,200',  status: 'low'     },
  { name: 'Rice (50kg bag)',sku: 'GRN-001', category: 'Grains',     qty: '12 bags', value: '₦72,000', status: 'in-stock'},
  { name: 'Palm Oil',       sku: 'OIL-001', category: 'Oils',       qty: '2 L',     value: '₦1,400',  status: 'low'     },
  { name: 'Tilapia (fresh)',sku: 'FSH-001', category: 'Seafood',    qty: '25 kg',   value: '₦75,000', status: 'in-stock'},
]

const ACCOUNTS = [
  { account: 'Main Operations',  bank: 'GTBank',   balance: '₦1,240,500', type: 'Current', status: 'active' },
  { account: 'Delivery Fund',    bank: 'Access',   balance: '₦180,000',   type: 'Savings', status: 'active' },
  { account: 'Supplier Payments',bank: 'Zenith',   balance: '₦620,000',   type: 'Current', status: 'active' },
  { account: 'Payroll Account',  bank: 'First Bank',balance: '₦320,000',  type: 'Current', status: 'active' },
]
// ────────────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

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

// ── Tab components ───────────────────────────────────────────────────────────

function OverviewTab() {
  const { hasRole } = useAuth()
  const revenueRef = useRef(null)
  const ordersRef  = useRef(null)

  useApexChart(revenueRef, () => ({
    chart:      { type: 'area', height: 200, toolbar: { show: false } },
    series:     [{ name: 'Revenue (₦)', data: REVENUE }],
    dataLabels: { enabled: false },
    stroke:     { curve: 'smooth', width: 2 },
    fill:       { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors:     ['#0ab39c'],
    xaxis:      { categories: WEEK_DAYS, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:      { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid:       { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip:    { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [])

  useApexChart(ordersRef, () => ({
    chart:       { type: 'bar', height: 200, toolbar: { show: false } },
    series:      [{ name: 'Orders', data: ORDERS }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels:  { enabled: false },
    colors:      ['#405189'],
    xaxis:       { categories: WEEK_DAYS, axisBorder: { show: false }, axisTicks: { show: false } },
    grid:        { borderColor: '#f1f5f9', strokeDashArray: 4 },
  }), [])

  return (
    <>
      {/* KPI row 1 */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Today's Revenue"   value="₦115,000" sub="23 orders today"       riIcon="ri-money-dollar-circle-line" color="green" trend={12} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Pending Orders"    value="8"         sub="3 ready for dispatch"  riIcon="ri-shopping-cart-2-line"    color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Deliveries" value="4"         sub="2 en route now"        riIcon="ri-bike-line"               color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Low Stock Alerts"  value="3"         sub="Action required"       riIcon="ri-alert-line"              color="red" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Customers"  value="1,247"     sub="↑ 18 new this week"    riIcon="ri-user-3-line"             color="purple" trend={5} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Staff on Duty"     value="8"         sub="2 absent today"        riIcon="ri-team-line"               color="teal" />
        </div>
      </div>

      {/* Pipeline quick-stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Confirmed',        count: 5,  icon: 'ri-time-line',             bg: 'bg-warning-subtle',   txt: 'text-warning',   link: '/orders',                      roles: null },
          { label: 'Preparing',        count: 3,  icon: 'ri-archive-stack-line',    bg: 'bg-primary-subtle',   txt: 'text-primary',   link: '/orders',                      roles: null },
          { label: 'Dispatched',       count: 6,  icon: 'ri-truck-line',            bg: 'bg-info-subtle',      txt: 'text-info',      link: '/deliveries/active',           roles: ['superadmin','manager','delivery_manager'] },
          { label: 'Delivered',        count: 12, icon: 'ri-checkbox-circle-line',  bg: 'bg-success-subtle',   txt: 'text-success',   link: '/orders',                      roles: null },
          { label: 'Returns',          count: 2,  icon: 'ri-arrow-go-back-line',    bg: 'bg-danger-subtle',    txt: 'text-danger',    link: '/orders/refunds',              roles: ['superadmin','manager'] },
          { label: 'AI Conversations', count: 5,  icon: 'ri-robot-line',            bg: 'bg-primary-subtle',   txt: 'text-primary',   link: '/chef-bems/conversations',     roles: ['superadmin','manager','kitchen_staff'] },
        ].filter(({ roles }) => !roles || hasRole(...roles))
        .map(({ label, count, icon, bg, txt, link }) => (
          <div className="col-6 col-sm-3 col-xl" key={label} style={{ minWidth: 0 }}>
            <Link to={link} className="text-decoration-none">
              <div className="card mb-0 h-100">
                <div className="card-body d-flex align-items-center gap-2 py-3 px-3">
                  <div className={`avatar size-9 rounded d-flex align-items-center justify-content-center flex-shrink-0 ${bg} ${txt}`}>
                    <i className={`${icon} fs-5`}></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">{count}</h6>
                    <p className="text-muted mb-0" style={{ fontSize: 11 }}>{label}</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <h6 className="fw-semibold mb-0">Revenue This Week</h6>
                  <p className="text-muted fs-xs mb-0 mt-1">Daily revenue in Naira</p>
                </div>
                <span className="badge bg-success-subtle text-success fs-xs">+12% vs last week</span>
              </div>
              <div ref={revenueRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Orders Per Day</h6>
              <p className="text-muted fs-xs mb-2 mt-1">This week</p>
              <div ref={ordersRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card mb-0 h-100">
            <div className="card-header">
              <h6 className="fw-semibold mb-0"><i className="ri-flashlight-line text-primary me-2"></i>Quick Actions</h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {[
                  { label: 'New Order',    icon: 'ri-add-circle-line',        to: '/orders',              color: 'btn-primary',         roles: null },
                  { label: 'POS Terminal', icon: 'ri-store-2-line',           to: '/pos',                 color: 'btn-dark',            roles: ['superadmin','manager','cashier'] },
                  { label: 'Stock In',     icon: 'ri-archive-stack-line',     to: '/inventory/stock-in',  color: 'btn-success',         roles: ['superadmin','manager','kitchen_staff'] },
                  { label: 'Add Product',  icon: 'ri-price-tag-3-line',       to: '/products/add',        color: 'btn-info',            roles: ['superadmin','manager'] },
                  { label: 'Add Staff',    icon: 'ri-team-line',              to: '/staff/add',           color: 'btn-secondary',       roles: ['superadmin','manager'] },
                  { label: 'Sales Report', icon: 'ri-bar-chart-grouped-line', to: '/reports/sales',       color: 'btn-outline-primary', roles: ['superadmin','manager','accountant'] },
                  { label: 'Finance',      icon: 'ri-bank-card-line',         to: '/accounts/overview',   color: 'btn-outline-success', roles: ['superadmin','manager','accountant'] },
                  { label: 'Deliveries',   icon: 'ri-bike-line',              to: '/deliveries/active',   color: 'btn-outline-info',    roles: ['superadmin','manager','delivery_manager'] },
                ].filter(({ roles }) => !roles || hasRole(...roles))
                .map(({ label, icon, to, color }) => (
                  <div className="col-6" key={label}>
                    <Link to={to} className={`btn ${color} btn-sm w-100 d-flex align-items-center gap-2`}>
                      <i className={icon}></i>
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0">Recent Orders</h6>
              <Link to="/orders" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th></Thead>
                <Tbody>
                  {RECENT_ORDERS.map((o) => (
                    <Tr key={o.id}>
                      <Td><Link to={`/orders/${o.id}`} className="fw-medium fs-sm link link-custom">{o.id}</Link></Td>
                      <Td>{o.customer}</Td>
                      <Td>{o.items}</Td>
                      <Td className="fw-semibold">{o.total}</Td>
                      <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                      <Td className="text-muted fs-xs">{o.time}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SalesTab() {
  const revWeekRef    = useRef(null)
  const revMonthRef   = useRef(null)
  const categoryRef   = useRef(null)
  const paymentRef    = useRef(null)

  useApexChart(revWeekRef, () => ({
    chart:      { type: 'area', height: 220, toolbar: { show: false } },
    series:     [{ name: 'Revenue', data: REVENUE }],
    dataLabels: { enabled: false },
    stroke:     { curve: 'smooth', width: 2 },
    fill:       { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors:     ['#0ab39c'],
    xaxis:      { categories: WEEK_DAYS, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:      { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid:       { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip:    { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [])

  useApexChart(revMonthRef, () => ({
    chart:  { type: 'bar', height: 220, toolbar: { show: false } },
    series: [{ name: 'Revenue', data: INCOME_6M }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    colors: ['#405189'],
    xaxis:  { categories: MONTHS_6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:  { labels: { formatter: (v) => `₦${(v/1000000).toFixed(1)}M` } },
    grid:   { borderColor: '#f1f5f9', strokeDashArray: 4 },
  }), [])

  useApexChart(categoryRef, () => ({
    chart:  { type: 'donut', height: 220 },
    series: [42, 28, 18, 12],
    labels: ['Meals', 'Seafood', 'Vegetables', 'Grains'],
    colors: ['#0ab39c','#405189','#f7b84b','#f06548'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [])

  useApexChart(paymentRef, () => ({
    chart:  { type: 'donut', height: 220 },
    series: [55, 30, 15],
    labels: ['Bank Transfer', 'Cash', 'Card'],
    colors: ['#405189','#0ab39c','#f7b84b'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [])

  return (
    <>
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Today's Revenue"   value="₦115,000"  sub="23 orders"          riIcon="ri-money-dollar-circle-line" color="green" trend={12} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Monthly Revenue"   value="₦2.1M"     sub="Jul 2026"            riIcon="ri-line-chart-line"          color="green" trend={8} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Orders Today"      value="23"         sub="Avg ₦5,000/order"   riIcon="ri-shopping-cart-2-line"     color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Avg Order Value"   value="₦4,960"    sub="↑ 6% vs last week"  riIcon="ri-funds-line"               color="amber" trend={6} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Returns Today"     value="2"          sub="₦8,200 refunded"    riIcon="ri-arrow-go-back-line"       color="red" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Conversion Rate"   value="84%"        sub="Orders / Visitors"  riIcon="ri-percent-line"             color="teal" />
        </div>
      </div>

      {/* Charts row */}
      <div className="row g-4 mb-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Revenue This Week</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Daily breakdown</p>
              <div ref={revWeekRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Revenue Last 6 Months</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Monthly totals</p>
              <div ref={revMonthRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Category + Payment breakdown */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3">
          <div className="card mb-0 h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Revenue by Category</h6>
              <p className="text-muted fs-xs mb-2 mt-1">This month</p>
              <div ref={categoryRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-3">
          <div className="card mb-0 h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">By Payment Method</h6>
              <p className="text-muted fs-xs mb-2 mt-1">This month</p>
              <div ref={paymentRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0">Top Selling Products</h6>
              <Link to="/reports/sales" className="link link-custom fs-sm">Full report →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>#</Th><Th>Product</Th><Th>Sold</Th><Th>Revenue</Th><Th>Trend</Th></Thead>
                <Tbody>
                  {TOP_PRODUCTS.map((p, i) => (
                    <Tr key={p.sku}>
                      <Td><span className="fw-bold text-muted">{i + 1}</span></Td>
                      <Td><p className="fw-medium fs-sm mb-0">{p.name}</p><span className="text-muted" style={{ fontSize: 10 }}>{p.sku}</span></Td>
                      <Td className="fw-semibold">{p.sold}</Td>
                      <Td className="fw-semibold text-success">{p.revenue}</Td>
                      <Td><span className={`fs-sm fw-medium ${p.trend > 0 ? 'text-success' : 'text-danger'}`}>{p.trend > 0 ? '↑' : '↓'} {Math.abs(p.trend)}%</span></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="fw-semibold mb-0">Recent Orders</h6>
          <Link to="/orders" className="link link-custom fs-sm">View all →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Time</Th></Thead>
            <Tbody>
              {RECENT_ORDERS.map((o) => (
                <Tr key={o.id}>
                  <Td><Link to={`/orders/${o.id}`} className="fw-medium fs-sm link link-custom">{o.id}</Link></Td>
                  <Td>{o.customer}</Td><Td>{o.items}</Td>
                  <Td className="fw-semibold">{o.total}</Td>
                  <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                  <Td className="text-muted fs-xs">{o.time}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </>
  )
}

function FinanceTab() {
  const incomeRef    = useRef(null)
  const profitRef    = useRef(null)

  useApexChart(incomeRef, () => ({
    chart:      { type: 'line', height: 220, toolbar: { show: false } },
    series:     [
      { name: 'Income',   data: INCOME_6M },
      { name: 'Expenses', data: EXPENSES_6M },
    ],
    stroke:     { curve: 'smooth', width: [2, 2] },
    colors:     ['#0ab39c', '#f06548'],
    dataLabels: { enabled: false },
    xaxis:      { categories: MONTHS_6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:      { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid:       { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend:     { position: 'top' },
  }), [])

  useApexChart(profitRef, () => ({
    chart:       { type: 'bar', height: 220, toolbar: { show: false } },
    series:      [{ name: 'Net Profit', data: INCOME_6M.map((inc, i) => inc - EXPENSES_6M[i]) }],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', colors: { ranges: [{ from: -999999, to: 0, color: '#f06548' }] } } },
    dataLabels:  { enabled: false },
    colors:      ['#0ab39c'],
    xaxis:       { categories: MONTHS_6, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis:       { labels: { formatter: (v) => `₦${(v/1000).toFixed(0)}k` } },
    grid:        { borderColor: '#f1f5f9', strokeDashArray: 4 },
  }), [])

  return (
    <>
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Monthly Revenue"    value="₦2.1M"     sub="Jul 2026"            riIcon="ri-money-dollar-circle-line" color="green" trend={8} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Monthly Expenses"   value="₦890K"     sub="Budget: ₦1M"         riIcon="ri-subtract-line"           color="red" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Net Profit"         value="₦1.21M"    sub="↑ 15% vs June"       riIcon="ri-funds-line"              color="blue" trend={15} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Outstanding Dues"   value="₦92,250"   sub="3 supplier invoices"  riIcon="ri-bank-card-line"          color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Total Bank Balance" value="₦2.36M"    sub="Across 4 accounts"   riIcon="ri-bank-line"               color="teal" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Profit Margin"      value="57.6%"     sub="Jul 2026"             riIcon="ri-percent-line"            color="purple" />
        </div>
      </div>

      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-semibold mb-0">Income vs Expenses</h6>
                <p className="text-muted fs-xs mb-0 mt-1">Last 6 months</p>
              </div>
              <div className="d-flex gap-3">
                <span className="fs-xs"><span className="badge bg-success me-1">●</span>Income</span>
                <span className="fs-xs"><span className="badge bg-danger me-1">●</span>Expenses</span>
              </div>
            </div>
            <div className="card-body"><div ref={incomeRef}></div></div>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Net Profit by Month</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Last 6 months</p>
              <div ref={profitRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank accounts + Supplier dues */}
      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-bank-line text-primary me-2"></i>Bank Accounts</h6>
              <Link to="/accounts/bank" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Account</Th><Th>Bank</Th><Th>Type</Th><Th>Balance</Th><Th>Status</Th></Thead>
                <Tbody>
                  {ACCOUNTS.map((a) => (
                    <Tr key={a.account}>
                      <Td><p className="fw-medium fs-sm mb-0">{a.account}</p></Td>
                      <Td className="fs-sm">{a.bank}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs">{a.type}</span></Td>
                      <Td className="fw-semibold text-success">{a.balance}</Td>
                      <Td><Badge label={a.status} color="green" /></Td>
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
              <h6 className="fw-semibold mb-0"><i className="ri-truck-line text-warning me-2"></i>Supplier Payments Due</h6>
              <Link to="/suppliers/payments" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Supplier</Th><Th>Item</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></Thead>
                <Tbody>
                  {SUPPLIER_DUES.map((s, i) => (
                    <Tr key={i}>
                      <Td><p className="fw-medium fs-sm mb-0">{s.name}</p></Td>
                      <Td className="text-muted fs-sm">{s.item}</Td>
                      <Td className="fw-semibold fs-sm">{s.amount}</Td>
                      <Td className="fs-sm">{s.due}</Td>
                      <Td><Badge label={s.status.replace('-',' ')} color={s.status==='overdue'?'red':s.status==='due-soon'?'amber':'blue'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <div className="px-4 py-3 border-top d-flex justify-content-between">
                <span className="fs-sm text-muted">Total outstanding</span>
                <span className="fw-bold text-danger">₦92,250</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function InventoryTab() {
  const stockRef = useRef(null)

  useApexChart(stockRef, () => ({
    chart:  { type: 'bar', height: 220, toolbar: { show: false } },
    series: [{ name: 'Stock Value (₦)', data: [75000, 72000, 4800, 10200, 2500, 18000] }],
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: false },
    colors: ['#405189'],
    xaxis:  { categories: ['Seafood', 'Grains', 'Vegetables', 'Oils', 'Dairy', 'Poultry'], axisBorder: { show: false } },
    yaxis:  { labels: { style: { fontSize: '11px' } } },
    grid:   { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `₦${v.toLocaleString()}` } },
  }), [])

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Total Active SKUs"    value="248"      sub="Across all categories"  riIcon="ri-price-tag-3-line"   color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Total Stock Value"    value="₦4.8M"   sub="All warehouses"         riIcon="ri-store-line"         color="green" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Below Reorder Level"  value="4 items"  sub="Immediate action"       riIcon="ri-alert-line"         color="red" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Expiring (7 days)"    value="3 batches" sub="VEG-001, VEG-004, EGG" riIcon="ri-timer-flash-line"   color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Warehouses"    value="2"         sub="Main + Cold Storage"   riIcon="ri-building-line"      color="teal" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Lost/Damaged (Month)" value="₦12,400"  sub="4 incidents"            riIcon="ri-delete-bin-line"   color="red" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Stock Value by Category</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Current value in warehouse</p>
              <div ref={stockRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-alert-line text-danger me-2"></i>Low Stock Items</h6>
              <Link to="/inventory/alerts" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              {LOW_STOCK.map((item, i) => (
                <div key={item.sku} className={`p-4 d-flex align-items-start gap-3 ${i < LOW_STOCK.length-1 ? 'border-bottom' : ''}`}>
                  <div className="avatar size-9 rounded bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ri-archive-stack-line"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <p className="fw-medium fs-sm mb-0">{item.name}</p>
                      <Badge label="Low Stock" color="red" />
                    </div>
                    <p className="text-muted fs-xs mb-0">{item.sku}</p>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="fs-xs"><span className="text-danger fw-semibold">{item.qty}</span><span className="text-muted"> · reorder at {item.reorder}</span></span>
                      <span className="fs-xs text-warning fw-medium">Exp. {item.expires}</span>
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
              {INVENTORY_ITEMS.map((item) => (
                <Tr key={item.sku}>
                  <Td><p className="fw-medium fs-sm mb-0">{item.name}</p></Td>
                  <Td><span className="badge bg-light text-dark fs-xs">{item.sku}</span></Td>
                  <Td className="text-muted fs-sm">{item.category}</Td>
                  <Td className="fw-semibold fs-sm">{item.qty}</Td>
                  <Td className="fs-sm">{item.value}</Td>
                  <Td><Badge label={item.status.replace('-',' ')} color={item.status==='low'?'red':'green'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </>
  )
}

function OperationsTab() {
  const deliveryRef = useRef(null)

  useApexChart(deliveryRef, () => ({
    chart:   { type: 'donut', height: 200 },
    series:  [4, 2, 1, 3],
    labels:  ['En Route', 'Picked Up', 'Assigned', 'Pending'],
    colors:  ['#0ab39c', '#405189', '#f7b84b', '#f06548'],
    legend:  { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [])

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Active Deliveries" value="4"         sub="2 en route"           riIcon="ri-bike-line"            color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Drivers On Duty"   value="3"         sub="1 available"          riIcon="ri-steering-2-line"      color="teal" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Avg Delivery Time" value="38 min"    sub="vs target 30 min"     riIcon="ri-time-line"            color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Staff on Duty"     value="8"         sub="2 absent"             riIcon="ri-team-line"           color="green" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Purchase Orders"   value="4 active"  sub="1 overdue"            riIcon="ri-shopping-bag-3-line" color="red" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Payroll Due"       value="₦320K"     sub="End of month"         riIcon="ri-money-cny-circle-line" color="purple" />
        </div>
      </div>

      {/* Deliveries + Donut */}
      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-bike-line text-info me-2"></i>Active Deliveries</h6>
              <Link to="/deliveries/active" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>ID</Th><Th>Customer</Th><Th>Driver</Th><Th>Zone</Th><Th>ETA</Th><Th>Status</Th></Thead>
                <Tbody>
                  {ACTIVE_DELIVERIES.map((d) => (
                    <Tr key={d.id}>
                      <Td><span className="fw-medium fs-sm">{d.id}</span></Td>
                      <Td>{d.customer}</Td>
                      <Td className="fs-sm">{d.driver}</Td>
                      <Td className="text-muted fs-sm">{d.zone}</Td>
                      <Td className="fw-medium fs-sm">{d.eta}</Td>
                      <Td><Badge label={d.status.replace('-',' ')} color={d.status==='en-route'?'green':d.status==='picked-up'?'blue':d.status==='assigned'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card mb-0 h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Delivery Status Breakdown</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Today</p>
              <div ref={deliveryRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff + Purchase Orders */}
      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-team-line text-primary me-2"></i>Staff Attendance Today</h6>
              <Link to="/staff/attendance" className="link link-custom fs-sm">Full roster →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>Name</Th><Th>Role</Th><Th>Shift</Th><Th>Clock In</Th><Th>Status</Th></Thead>
                <Tbody>
                  {STAFF_LIST.map((s) => (
                    <Tr key={s.name}>
                      <Td><p className="fw-medium fs-sm mb-0">{s.name}</p></Td>
                      <Td className="text-muted fs-sm">{s.role}</Td>
                      <Td><span className="badge bg-light text-dark fs-xs">{s.shift}</span></Td>
                      <Td className="fs-sm">{s.clockIn}</Td>
                      <Td><Badge label={s.status.replace('-',' ')} color={s.status==='on-duty'?'green':s.status==='absent'?'red':'amber'} /></Td>
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
              <h6 className="fw-semibold mb-0"><i className="ri-shopping-bag-3-line text-warning me-2"></i>Purchase Orders</h6>
              <Link to="/purchase" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              <Table>
                <Thead><Th>PO #</Th><Th>Supplier</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th></Thead>
                <Tbody>
                  {PURCHASE_ORDERS.map((p) => (
                    <Tr key={p.id}>
                      <Td><span className="fw-medium fs-sm">{p.id}</span></Td>
                      <Td className="fs-sm">{p.supplier}</Td>
                      <Td className="fw-semibold fs-sm">{p.amount}</Td>
                      <Td className="text-muted fs-sm">{p.date}</Td>
                      <Td><Badge label={p.status} color={p.status==='paid'?'green':p.status==='received'?'blue':p.status==='pending'?'amber':'red'} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function CustomersTab() {
  const growthRef = useRef(null)

  useApexChart(growthRef, () => ({
    chart:      { type: 'area', height: 200, toolbar: { show: false } },
    series:     [{ name: 'New Customers', data: [28, 35, 22, 41, 38, 42] }],
    dataLabels: { enabled: false },
    stroke:     { curve: 'smooth', width: 2 },
    fill:       { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors:     ['#405189'],
    xaxis:      { categories: MONTHS_6, axisBorder: { show: false }, axisTicks: { show: false } },
    grid:       { borderColor: '#f1f5f9', strokeDashArray: 4 },
  }), [])

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Total Customers"    value="1,247"    sub="All time"              riIcon="ri-group-line"           color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="New This Month"     value="42"        sub="↑ 22% vs last month"  riIcon="ri-user-add-line"         color="green" trend={22} />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Loyalty Members"   value="1,247"    sub="100% enrolled"         riIcon="ri-vip-crown-line"       color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Points Issued"     value="18,240"   sub="This month"            riIcon="ri-medal-line"           color="teal" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Total Wallets"     value="₦92,000"  sub="Combined balance"       riIcon="ri-wallet-3-line"        color="purple" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Churn Risk"        value="12"        sub="Inactive 30+ days"      riIcon="ri-user-unfollow-line"   color="red" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-5">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">New Customer Growth</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Last 6 months</p>
              <div ref={growthRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-7">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0">Loyalty & Wallet Summary</h6>
              <Link to="/customers/loyalty" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body">
              <div className="row g-3 text-center">
                {[
                  { label: 'Points Issued',    value: '18,240', icon: 'ri-medal-line',         color: 'bg-warning-subtle text-warning'  },
                  { label: 'Points Redeemed',  value: '4,610',  icon: 'ri-gift-line',           color: 'bg-success-subtle text-success'  },
                  { label: 'Points Balance',   value: '13,630', icon: 'ri-coin-line',           color: 'bg-info-subtle text-info'        },
                  { label: 'Wallet Funded',    value: '₦142K',  icon: 'ri-wallet-3-line',       color: 'bg-primary-subtle text-primary'  },
                  { label: 'Wallet Spent',     value: '₦50K',   icon: 'ri-shopping-bag-line',   color: 'bg-danger-subtle text-danger'    },
                  { label: 'Avg Order Value',  value: '₦4,960', icon: 'ri-line-chart-line',     color: 'bg-secondary-subtle text-secondary' },
                ].map(({ label, value, icon, color }) => (
                  <div className="col-4" key={label}>
                    <div className={`rounded p-3 d-flex flex-column align-items-center gap-1 ${color.split(' ')[0]}`}>
                      <i className={`${icon} fs-4 ${color.split(' ')[1]}`}></i>
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
          <h6 className="fw-semibold mb-0">Customer List</h6>
          <Link to="/customers" className="link link-custom fs-sm">View all →</Link>
        </div>
        <div className="card-body p-0">
          <Table>
            <Thead><Th>Name</Th><Th>Phone</Th><Th>Total Orders</Th><Th>Points</Th><Th>Wallet</Th><Th>Status</Th></Thead>
            <Tbody>
              {CUSTOMER_LIST.map((c) => (
                <Tr key={c.name}>
                  <Td><p className="fw-medium fs-sm mb-0">{c.name}</p></Td>
                  <Td className="text-muted fs-sm">{c.phone}</Td>
                  <Td className="fw-semibold">{c.orders}</Td>
                  <Td><span className="badge bg-warning-subtle text-warning">{c.points} pts</span></Td>
                  <Td className="fw-medium">{c.wallet}</Td>
                  <Td><Badge label={c.status} color={c.status==='active'?'green':'red'} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </>
  )
}

function ChefBemsTab() {
  const aiRef = useRef(null)

  useApexChart(aiRef, () => ({
    chart:  { type: 'donut', height: 200 },
    series: [5, 3, 15],
    labels: ['New', 'Pending', 'Resolved'],
    colors: ['#f7b84b', '#405189', '#0ab39c'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
  }), [])

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Conversations Today" value="23"     sub="5 unresolved"          riIcon="ri-robot-line"                color="blue" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Pending Replies"     value="5"      sub="Needs attention"        riIcon="ri-message-3-line"            color="amber" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Recommendations"     value="124"    sub="Served today"           riIcon="ri-lightbulb-line"            color="green" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Dietary Rules"       value="18"     sub="Active constraints"     riIcon="ri-file-list-3-line"          color="teal" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Meal Associations"   value="64"     sub="Product ↔ meal links"  riIcon="ri-links-line"                color="purple" />
        </div>
        <div className="col-6 col-sm-4 col-xl-2">
          <StatsCard title="Satisfaction Rate"   value="98%"    sub="Customer feedback"      riIcon="ri-emotion-happy-line"        color="green" trend={2} />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card mb-0 h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Conversation Status</h6>
              <p className="text-muted fs-xs mb-2 mt-1">Today</p>
              <div ref={aiRef}></div>
              <div className="row text-center mt-3 g-0">
                <div className="col-4 border-end">
                  <h6 className="fw-bold text-warning mb-0">5</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 10 }}>New</p>
                </div>
                <div className="col-4 border-end">
                  <h6 className="fw-bold text-primary mb-0">3</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 10 }}>Pending</p>
                </div>
                <div className="col-4">
                  <h6 className="fw-bold text-success mb-0">15</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 10 }}>Resolved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-robot-line text-primary me-2"></i>Recent AI Conversations</h6>
              <Link to="/chef-bems/conversations" className="link link-custom fs-sm">View all →</Link>
            </div>
            <div className="card-body p-0">
              {AI_CONVERSATIONS.map((c, i) => (
                <div key={i} className={`px-4 py-3 d-flex align-items-start gap-3 ${i < AI_CONVERSATIONS.length-1 ? 'border-bottom' : ''}`}>
                  <div className="avatar size-8 rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ fontSize: 11 }}>
                    {c.customer.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <p className="fw-medium fs-sm mb-1">{c.customer}</p>
                      <Badge label={c.status} color={c.status==='new'?'amber':c.status==='resolved'?'green':'blue'} />
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>"{c.query}"</p>
                    <span className="text-muted" style={{ fontSize: 10 }}>{c.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dietary rules + Meal associations */}
      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-file-list-3-line text-info me-2"></i>Active Dietary Rules</h6>
              <Link to="/chef-bems/dietary-rules" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              {[
                { rule: 'No Pork',         scope: 'All Muslim customers',   status: 'active' },
                { rule: 'Gluten-Free',     scope: '12 flagged customers',   status: 'active' },
                { rule: 'Vegan',           scope: '8 flagged customers',    status: 'active' },
                { rule: 'Nut Allergy',     scope: '5 flagged customers',    status: 'active' },
                { rule: 'Dairy-Free',      scope: '7 flagged customers',    status: 'active' },
                { rule: 'Low-Carb',        scope: '18 flagged customers',   status: 'active' },
              ].map((r, i, arr) => (
                <div key={r.rule} className={`px-4 py-3 d-flex align-items-center justify-content-between ${i < arr.length-1 ? 'border-bottom' : ''}`}>
                  <div>
                    <p className="fw-medium fs-sm mb-0">{r.rule}</p>
                    <span className="text-muted" style={{ fontSize: 11 }}>{r.scope}</span>
                  </div>
                  <Badge label={r.status} color="green" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="fw-semibold mb-0"><i className="ri-links-line text-success me-2"></i>Meal Associations</h6>
              <Link to="/chef-bems/meal-associations" className="link link-custom fs-sm">Manage →</Link>
            </div>
            <div className="card-body p-0">
              {[
                { meal: 'Jollof Rice Box',    tags: ['Vegan-friendly', 'High-carb'],    count: 22 },
                { meal: 'Grilled Tilapia',    tags: ['Gluten-free', 'High-protein'],    count: 18 },
                { meal: 'Egusi Soup + Eba',   tags: ['Traditional', 'High-carb'],       count: 14 },
                { meal: 'Vegetable Stir-Fry', tags: ['Vegan', 'Low-carb', 'Dairy-free'],count: 10 },
                { meal: 'Chicken Suya',       tags: ['High-protein', 'Gluten-free'],    count: 8  },
              ].map((m, i, arr) => (
                <div key={m.meal} className={`px-4 py-3 ${i < arr.length-1 ? 'border-bottom' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <p className="fw-medium fs-sm mb-0">{m.meal}</p>
                    <span className="text-muted fs-xs">{m.count} associations</span>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {m.tags.map(t => (
                      <span key={t} className="badge bg-primary-subtle text-primary" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
// All dashboard tabs with role restrictions (null = all roles)
const ALL_TABS = [
  { key: 'overview',   label: 'Overview',       icon: 'ri-dashboard-2-line',            roles: ['superadmin', 'manager'] },
  { key: 'sales',      label: 'Sales & Orders', icon: 'ri-shopping-cart-2-line',         roles: null },
  { key: 'finance',    label: 'Finance',         icon: 'ri-money-dollar-circle-line',    roles: ['superadmin', 'manager', 'accountant'] },
  { key: 'inventory',  label: 'Inventory',       icon: 'ri-archive-stack-line',          roles: ['superadmin', 'manager', 'kitchen_staff'] },
  { key: 'operations', label: 'Operations',      icon: 'ri-truck-line',                  roles: ['superadmin', 'manager', 'delivery_manager'] },
  { key: 'customers',  label: 'Customers',       icon: 'ri-group-line',                  roles: ['superadmin', 'manager', 'cashier'] },
  { key: 'ai',         label: 'Chef Bems AI',    icon: 'ri-robot-line', badge: 'AI',     roles: ['superadmin', 'manager', 'kitchen_staff'] },
]

// Default landing tab per role
const DEFAULT_TAB = {
  superadmin:       'overview',
  manager:          'overview',
  accountant:       'finance',
  delivery_manager: 'operations',
  cashier:          'sales',
  kitchen_staff:    'sales',
}

export default function Dashboard() {
  const { user, hasRole } = useAuth()

  // Filter tabs to only those the current user can see
  const TABS = ALL_TABS.filter(t => !t.roles || (user && t.roles.includes(user.role)))
  const defaultTab = (user && DEFAULT_TAB[user.role]) ?? 'sales'
  // Ensure the default tab is actually visible for this role
  const firstTab = TABS[0]?.key ?? 'sales'
  const [activeTab, setActiveTab] = useState(
    TABS.find(t => t.key === defaultTab) ? defaultTab : firstTab
  )

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="container-fluid">
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.first_name ?? 'Admin'} 👋`}
        subtitle={today}
        actions={
          <Link to="/orders" className="btn btn-primary btn-sm">
            <i className="ri-add-line me-1"></i>New Order
          </Link>
        }
      />

      {/* ── Tab navigation ── */}
      <div className="card mb-4">
        <div className="card-body py-0 px-0">
          <ul className="nav nav-tabs border-0 flex-nowrap overflow-auto" style={{ whiteSpace: 'nowrap' }}>
            {TABS.map((tab) => (
              <li className="nav-item" key={tab.key}>
                <button
                  className={`nav-link d-flex align-items-center gap-2 border-0 rounded-0 px-4 py-3 ${activeTab === tab.key ? 'active fw-semibold' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ background: 'none', cursor: 'pointer' }}
                >
                  <i className={`${tab.icon} fs-6`}></i>
                  <span style={{ fontSize: 13 }}>{tab.label}</span>
                  {tab.badge && (
                    <span className="badge bg-success-subtle text-success ms-1" style={{ fontSize: 9 }}>{tab.badge}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Tab content ── */}
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
