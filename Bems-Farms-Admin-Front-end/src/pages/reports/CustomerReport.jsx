import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

const formatNaira = (val) => {
  const num = parseFloat(val) || 0
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CustomerReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Filters
  const [dateRange, setDateRange] = useState('year')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [searchQuery, setSearchQuery] = useState('')

  const fetchCustomerReport = useCallback(async () => {
    try {
      setLoading(true)
      let from = fromDate
      let to = toDate

      const now = new Date()
      if (dateRange === 'today') {
        from = now.toISOString().slice(0, 10)
        to = now.toISOString().slice(0, 10)
      } else if (dateRange === 'week') {
        const first = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
        from = new Date(now.setDate(first)).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'year') {
        from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      }

      const res = await api.get('/admin/reports/customers', {
        params: { from, to },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to load customer report:', err)
      toast.error('Failed to load customer analytics')
    } finally {
      setLoading(false)
    }
  }, [dateRange, fromDate, toDate])

  useEffect(() => {
    fetchCustomerReport()
  }, [fetchCustomerReport])

  const kpis = data?.kpis || {}
  const topSpenders = data?.top_spenders || []
  const timeline = data?.timeline || []

  const filteredSpenders = topSpenders.filter(c => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
  })

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Customer Growth &amp; Purchasing Report</h6>
          <p className="text-muted fs-sm mb-0">Live customer retention, lifetime spending value, repeat buyer frequency, and acquisition analytics.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
          <li className="breadcrumb-item active">Customers</li>
        </ul>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-md-7 d-flex flex-wrap align-items-center gap-2">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${dateRange === 'today' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('week')}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('month')}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'year' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('year')}
                >
                  This Year
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'custom' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDateRange('custom')}
                >
                  Custom Range
                </button>
              </div>

              {dateRange === 'custom' && (
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="col-md-5 text-md-end d-flex align-items-center justify-content-md-end gap-2">
              <input
                type="text"
                placeholder="Search customers..."
                className="form-control form-control-sm w-auto"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchCustomerReport}
                title="Refresh Customer Report"
              >
                <i className="ri-refresh-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Registered Customers',
            value: kpis.total_customers || 0,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-user-3-line',
            subLeft: 'Customer Accounts',
            subRight: `${kpis.new_customers || 0} New in Range`
          },
          {
            label: 'Active Purchasing Buyers',
            value: kpis.active_buyers || 0,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-user-heart-line',
            subLeft: 'Active in Period',
            subRight: 'Verified Buyers'
          },
          {
            label: 'Repeat Buyers Base',
            value: kpis.repeat_buyers || 0,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-repeat-line',
            subLeft: 'Loyal Customers',
            subRight: '> 1 Order'
          },
          {
            label: 'Average Customer LTV',
            value: formatNaira(kpis.avg_customer_ltv),
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-money-dollar-circle-line',
            subLeft: 'Lifetime Value',
            subRight: 'Per Customer'
          },
        ].map(c => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-3">
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
                <div className="fs-22 fw-bolder text-dark mb-1 font-display text-truncate">
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

      {/* Main Breakdown Row */}
      <div className="row g-3 mb-4">
        {/* Top Customers Table */}
        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="ri-vip-crown-line me-2 text-warning"></i>Top Customers by Total Volume
              </h5>
              <span className="badge bg-light text-dark border">{filteredSpenders.length} customers</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '400px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Customer</th>
                      <th className="text-center">Orders</th>
                      <th className="text-end pe-3">Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          <span className="spinner-border spinner-border-sm me-2"></span>Loading customer profiles...
                        </td>
                      </tr>
                    ) : filteredSpenders.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No customer purchase records found.
                        </td>
                      </tr>
                    ) : (
                      filteredSpenders.map((c, idx) => (
                        <tr key={c.id || idx}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge rounded-pill bg-light text-dark border">#{idx + 1}</span>
                              <div>
                                <div className="fw-bold text-dark">{c.name || 'Customer'}</div>
                                <div className="text-muted fs-xs">{c.email || c.phone || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {c.order_count || 0} orders
                            </span>
                          </td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(c.total_spend)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Sign-Up Cadence */}
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-user-add-line me-2 text-primary"></i>Customer Acquisition Timeline
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '400px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Month / Period</th>
                      <th className="text-end pe-3">New Sign-ups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-muted">Loading timeline...</td>
                      </tr>
                    ) : timeline.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-muted">No registration records in this period.</td>
                      </tr>
                    ) : (
                      timeline.map((t, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark">{t.period || t.label}</td>
                          <td className="text-end pe-3">
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-bold">
                              +{t.new_customers} users
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
