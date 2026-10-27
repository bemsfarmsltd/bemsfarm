import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

const formatNaira = (val) => {
  const num = parseFloat(val) || 0
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PurchaseReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Filters
  const [dateRange, setDateRange] = useState('year')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  const fetchPurchaseReport = useCallback(async () => {
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

      const res = await api.get('/admin/reports/purchases', {
        params: { from, to },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to load purchase report:', err)
      toast.error('Failed to load purchase procurement data')
    } finally {
      setLoading(false)
    }
  }, [dateRange, fromDate, toDate])

  useEffect(() => {
    fetchPurchaseReport()
  }, [fetchPurchaseReport])

  const kpis = data?.kpis || {}
  const topSuppliers = data?.top_suppliers || []
  const byStatus = data?.by_status || []
  const timeline = data?.timeline || []

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Procurement &amp; Purchase Orders Report</h6>
          <p className="text-muted fs-sm mb-0">Track farm supply procurement, vendor commitments, paid bills, and outstanding payables.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
          <li className="breadcrumb-item active">Purchases</li>
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

            <div className="col-md-5 text-md-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchPurchaseReport}
                title="Refresh Report"
              >
                <i className="ri-refresh-line me-1"></i>Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Procurement Volume',
            value: formatNaira(kpis.total_value),
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-truck-line',
            subLeft: 'Purchase Commitments',
            subRight: `${kpis.active_orders || 0} Orders`
          },
          {
            label: 'Total Amount Disbursed',
            value: formatNaira(kpis.total_paid),
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            subLeft: 'Paid Invoices',
            subRight: 'Settled'
          },
          {
            label: 'Outstanding Payables',
            value: formatNaira(kpis.outstanding),
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-money-cny-box-line',
            subLeft: 'Vendor Liabilities',
            subRight: `${kpis.unpaid_count || 0} Pending`
          },
          {
            label: 'Deliveries Fulfilled',
            value: kpis.fully_received || 0,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-archive-line',
            subLeft: 'Received to Warehouse',
            subRight: 'Inspected'
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
        {/* Top Suppliers Table */}
        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="ri-team-line me-2 text-primary"></i>Top Suppliers by Purchase Volume
              </h5>
              <span className="badge bg-light text-dark border">{topSuppliers.length} vendors</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Supplier</th>
                      <th className="text-center">Orders</th>
                      <th className="text-end">Total Purchased</th>
                      <th className="text-end">Paid Amount</th>
                      <th className="text-end pe-3">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          <span className="spinner-border spinner-border-sm me-2"></span>Loading supplier procurement records...
                        </td>
                      </tr>
                    ) : topSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No purchase orders recorded for suppliers in this period.
                        </td>
                      </tr>
                    ) : (
                      topSuppliers.map((s, idx) => (
                        <tr key={s.id || idx}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{s.supplier_name}</div>
                            <div className="text-muted fs-xs font-monospace">{s.supplier_code}</div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {s.orders}
                            </span>
                          </td>
                          <td className="text-end fw-bold font-monospace text-dark">
                            {formatNaira(s.total_purchased)}
                          </td>
                          <td className="text-end font-monospace text-success">
                            {formatNaira(s.total_paid)}
                          </td>
                          <td className="text-end pe-3 font-monospace fw-bold text-danger">
                            {formatNaira(s.outstanding)}
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

        {/* PO Status Breakdown */}
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-pie-chart-line me-2 text-primary"></i>PO Status Breakdown
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Status</th>
                      <th className="text-center">Count</th>
                      <th className="text-end pe-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading PO status...</td>
                      </tr>
                    ) : byStatus.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No PO records found.</td>
                      </tr>
                    ) : (
                      byStatus.map((st, idx) => (
                        <tr key={idx}>
                          <td className="ps-3">
                            <span className="badge bg-light text-dark border text-uppercase">
                              {st.status}
                            </span>
                          </td>
                          <td className="text-center text-muted fs-sm">{st.count}</td>
                          <td className="text-end pe-3 font-monospace fw-bold text-primary">
                            {formatNaira(st.value)}
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
