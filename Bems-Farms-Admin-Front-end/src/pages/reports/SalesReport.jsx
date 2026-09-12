import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

const formatNaira = (val) => {
  const num = parseFloat(val) || 0
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SalesReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Filters
  const [dateRange, setDateRange] = useState('month') // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [groupBy, setGroupBy] = useState('day')

  const fetchSalesReport = useCallback(async () => {
    try {
      setLoading(true)
      let from = fromDate
      let to = toDate

      const now = new Date()
      if (dateRange === 'today') {
        from = now.toISOString().slice(0, 10)
        to = now.toISOString().slice(0, 10)
      } else if (dateRange === 'week') {
        const first = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1) // Monday
        from = new Date(now.setDate(first)).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      } else if (dateRange === 'year') {
        from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
        to = new Date().toISOString().slice(0, 10)
      }

      const res = await api.get('/admin/reports/sales', {
        params: { from, to, group_by: groupBy },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to load sales report:', err)
      toast.error('Failed to load sales report data')
    } finally {
      setLoading(false)
    }
  }, [dateRange, fromDate, toDate, groupBy])

  useEffect(() => {
    fetchSalesReport()
  }, [fetchSalesReport])

  const summary = data?.summary || {}
  const timeline = data?.timeline || []
  const topProducts = data?.top_products || []
  const topCategories = data?.by_category || []
  const byStatus = data?.by_status || []
  const topCustomers = data?.top_customers || []

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Sales & Revenue Reports</h6>
          <p className="text-muted fs-sm mb-0">Track store performance, gross margins, customer volume, and item velocity.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
          <li className="breadcrumb-item active">Sales</li>
        </ul>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-md-6 d-flex flex-wrap align-items-center gap-2">
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

            <div className="col-md-3 text-md-end d-flex align-items-center justify-content-md-end gap-2">
              <label className="form-label mb-0 fs-xs text-muted fw-bold">Group By:</label>
              <select
                className="form-select form-select-sm w-auto"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchSalesReport}
                title="Refresh Report"
              >
                <i className="ri-refresh-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-primary border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Gross Revenue</p>
              <h5 className="fw-bold mb-1 text-primary">{formatNaira(summary.gross_revenue)}</h5>
              <p className="text-muted fs-xs mb-0">Total order receipts</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Net Revenue</p>
              <h5 className="fw-bold mb-1 text-success">{formatNaira(summary.net_revenue)}</h5>
              <p className="text-muted fs-xs mb-0">After discounts</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-info border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Total Orders</p>
              <h5 className="fw-bold mb-1 text-info">{summary.total_orders || 0}</h5>
              <p className="text-muted fs-xs mb-0">{summary.valid_orders || 0} fulfilled</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-warning border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Avg Order Value</p>
              <h5 className="fw-bold mb-1 text-warning">{formatNaira(summary.avg_order_value)}</h5>
              <p className="text-muted fs-xs mb-0">Basket size</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-purple border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Unique Buyers</p>
              <h5 className="fw-bold mb-1 text-purple">{summary.unique_customers || 0}</h5>
              <p className="text-muted fs-xs mb-0">Active customers</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-2">
          <div className="card shadow-sm border-0 border-start border-danger border-4 h-100">
            <div className="card-body p-3">
              <p className="text-muted fs-xs mb-1 fw-bold text-uppercase">Discounts Given</p>
              <h5 className="fw-bold mb-1 text-danger">{formatNaira(summary.total_discounts)}</h5>
              <p className="text-muted fs-xs mb-0">Coupons & promo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Row */}
      <div className="row g-3 mb-4">
        {/* Sales Timeline Table */}
        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="ri-line-chart-line me-2 text-primary"></i>Revenue Trend Over Time
              </h5>
              <span className="badge bg-light text-dark border">{timeline.length} periods recorded</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '360px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Period / Date</th>
                      <th className="text-center">Order Count</th>
                      <th className="text-end pe-3">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          <span className="spinner-border spinner-border-sm me-2"></span>Loading timeline data...
                        </td>
                      </tr>
                    ) : timeline.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No revenue records found for this period.
                        </td>
                      </tr>
                    ) : (
                      timeline.map((row, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark">{row.label || row.period}</td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {row.orders} orders
                            </span>
                          </td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(row.revenue)}
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

        {/* Category Revenue Breakdown */}
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-pie-chart-line me-2 text-primary"></i>Revenue by Category
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '360px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Category</th>
                      <th className="text-center">Units</th>
                      <th className="text-end pe-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          Loading categories...
                        </td>
                      </tr>
                    ) : topCategories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No category sales in this period.
                        </td>
                      </tr>
                    ) : (
                      topCategories.map((cat, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark">{cat.category || 'Uncategorized'}</td>
                          <td className="text-center text-muted fs-sm">{cat.units_sold}</td>
                          <td className="text-end pe-3 fw-bold text-primary font-monospace">
                            {formatNaira(cat.revenue)}
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

      {/* Top Selling Products & Customers */}
      <div className="row g-3">
        {/* Top 10 Products */}
        <div className="col-xl-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-fire-line me-2 text-danger"></i>Top Selling Produce & Items
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Product</th>
                      <th className="text-center">Units Sold</th>
                      <th className="text-center">Orders</th>
                      <th className="text-end pe-3">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          Loading products...
                        </td>
                      </tr>
                    ) : topProducts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          No product sales recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge rounded-pill bg-light text-dark border">#{idx + 1}</span>
                              <div>
                                <div className="fw-bold text-dark">{p.name}</div>
                                <div className="text-muted fs-xs font-monospace">{p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center fw-semibold text-dark">{p.units_sold}</td>
                          <td className="text-center text-muted fs-sm">{p.order_count}</td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(p.revenue)}
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

        {/* Top 10 Customers */}
        <div className="col-xl-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-vip-crown-line me-2 text-warning"></i>Top Customers by Spend
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Customer</th>
                      <th className="text-center">Orders</th>
                      <th className="text-end pe-3">Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          Loading top customers...
                        </td>
                      </tr>
                    ) : topCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No customer purchases in this period.
                        </td>
                      </tr>
                    ) : (
                      topCustomers.map((c, idx) => (
                        <tr key={c.id || idx}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{c.name}</div>
                            <div className="text-muted fs-xs">{c.email || c.phone}</div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {c.order_count}
                            </span>
                          </td>
                          <td className="text-end pe-3 fw-bold text-primary font-monospace">
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
      </div>
    </div>
  )
}
