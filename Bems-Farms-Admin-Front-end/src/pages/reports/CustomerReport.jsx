import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

function useApexChart(ref, options, deps = []) {
  useEffect(() => {
    if (!ref.current || !window.ApexCharts) return
    ref.current.innerHTML = ''
    const chart = new window.ApexCharts(ref.current, options)
    chart.render()
    return () => chart.destroy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

const TOP_CUSTOMERS = [
  { rank: 1, name: 'Mrs. Okonkwo',   orders: 34, spent: '₦420,000', tier: 'Platinum', trend: '+12%' },
  { rank: 2, name: 'Amara Obi',      orders: 18, spent: '₦248,000', tier: 'Gold',     trend: '+8%'  },
  { rank: 3, name: 'Tunde Adeyemi',  orders: 15, spent: '₦174,000', tier: 'Silver',   trend: '+5%'  },
  { rank: 4, name: 'Seun Abiodun',   orders: 10, spent: '₦118,000', tier: 'Silver',   trend: '+3%'  },
  { rank: 5, name: 'Kemi Balogun',   orders:  5, spent: '₦62,000',  tier: 'Bronze',   trend: 'New'  },
]

const tierColor = { Platinum: 'primary', Gold: 'warning', Silver: 'secondary', Bronze: 'danger' }

export default function CustomerReport() {
  const growthRef = useRef(null)
  const tierRef   = useRef(null)

  useApexChart(growthRef, {
    chart: { type: 'area', height: 240, toolbar: { show: false } },
    series: [{ name: 'New Customers', data: [12, 18, 14, 22, 19, 28, 31] }],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: ['#405189'],
    xaxis: { categories: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], axisBorder: { show: false } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  }, [])

  useApexChart(tierRef, {
    chart: { type: 'donut', height: 240 },
    series: [1, 1, 2, 1],
    labels: ['Platinum', 'Gold', 'Silver', 'Bronze'],
    colors: ['#405189', '#f7b84b', '#878a99', '#f06548'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
  }, [])

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-5">
        <div>
          <h4 className="fs-xl mb-1">Customer Report</h4>
          <p className="text-muted mb-0">Customer growth, retention, and spending analytics.</p>
        </div>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm">
            <option>Last 7 months</option>
            <option>Last 30 days</option>
            <option>This year</option>
          </select>
          <button className="btn btn-outline-light border btn-sm">
            <i className="ri-download-2-line me-1"></i>Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Customers',
            value: '1,247',
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-user-3-line',
            subLeft: 'Registered Profiles',
            subRight: '+18 This Week'
          },
          {
            label: 'Active (30 Days)',
            value: '892',
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-user-heart-line',
            subLeft: 'Monthly Active Share',
            subRight: '71.5% Base'
          },
          {
            label: 'Avg. Order Value',
            value: '₦14,200',
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-money-dollar-circle-line',
            subLeft: 'Spend Benchmark',
            subRight: '↑ 6% MoM'
          },
          {
            label: 'Retention Rate',
            value: '74%',
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-repeat-line',
            subLeft: 'Cohort Loyalty',
            subRight: 'Above Avg'
          },
        ].map(c => (
          <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Customer Growth</h6>
              <p className="text-muted fs-xs mb-3">New customers per month</p>
              <div ref={growthRef}></div>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card mb-0">
            <div className="card-body">
              <h6 className="fw-semibold mb-0">Tier Distribution</h6>
              <p className="text-muted fs-xs mb-3">Loyalty tier breakdown</p>
              <div ref={tierRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top customers */}
      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="fw-semibold mb-0">Top Customers by Spend</h6>
          <Link to="/customers" className="link link-custom fs-sm">View all →</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-nowrap mb-0">
              <thead className="table-light">
                <tr><th>#</th><th>Customer</th><th>Orders</th><th>Total Spent</th><th>Tier</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {TOP_CUSTOMERS.map(c => (
                  <tr key={c.rank}>
                    <td className="text-muted fw-medium">{c.rank}</td>
                    <td>
                      <Link to="/customers" className="fw-medium link link-custom">{c.name}</Link>
                    </td>
                    <td>{c.orders}</td>
                    <td className="fw-semibold">{c.spent}</td>
                    <td>
                      <span className={`badge bg-${tierColor[c.tier]}-subtle text-${tierColor[c.tier]}`}>{c.tier}</span>
                    </td>
                    <td className={c.trend === 'New' ? 'text-muted' : 'text-success fw-medium'}>{c.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
