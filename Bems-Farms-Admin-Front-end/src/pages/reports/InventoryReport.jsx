import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { toast } from 'react-hot-toast'

const formatNaira = (val) => {
  const num = parseFloat(val) || 0
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InventoryReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Filters
  const [lowThreshold, setLowThreshold] = useState(10)
  const [dateRange, setDateRange] = useState('month')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [searchQuery, setSearchQuery] = useState('')

  const fetchInventoryReport = useCallback(async () => {
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

      const res = await api.get('/admin/reports/inventory', {
        params: { from, to, low_stock_threshold: lowThreshold },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to load inventory report:', err)
      toast.error('Failed to load live inventory analytics')
    } finally {
      setLoading(false)
    }
  }, [dateRange, fromDate, toDate, lowThreshold])

  useEffect(() => {
    fetchInventoryReport()
  }, [fetchInventoryReport])

  const summary = data?.summary || {}
  const stockByCategory = data?.stock_by_category || []
  const lowStock = data?.low_stock || []
  const outOfStock = data?.out_of_stock || []
  const topMovers = data?.top_movers || []
  const recentMovements = data?.recent_movements || []

  // Filter low stock by search
  const filteredLowStock = lowStock.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
  })

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Live Inventory & Stock Audit Report</h6>
          <p className="text-muted fs-sm mb-0">Real-time stock valuation, warehouse units, low-stock reorder warnings, and movement audit trail.</p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
          <li className="breadcrumb-item active">Inventory</li>
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
              <label className="form-label mb-0 fs-xs text-muted fw-bold">Low Stock Alert Level:</label>
              <select
                className="form-select form-select-sm w-auto"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(parseInt(e.target.value) || 10)}
              >
                <option value={5}>&le; 5 units</option>
                <option value={10}>&le; 10 units</option>
                <option value={20}>&le; 20 units</option>
                <option value={50}>&le; 50 units</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchInventoryReport}
                title="Refresh Inventory Report"
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
            label: 'Total Catalog Products',
            value: summary.total_products || 0,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-store-2-line',
            subLeft: 'Live Farm Items',
            subRight: `${summary.active_products || 0} Active`
          },
          {
            label: 'Warehouse Stock Units',
            value: Number(summary.total_units || 0).toLocaleString(),
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-archive-line',
            subLeft: 'Physical Inventory',
            subRight: 'Available Units'
          },
          {
            label: 'Stock Cost Valuation',
            value: formatNaira(summary.stock_value),
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-money-cny-box-line',
            subLeft: 'Current Asset Value',
            subRight: 'At Cost/Retail'
          },
          {
            label: 'Low Stock Warnings',
            value: summary.low_stock_count || 0,
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-error-warning-line',
            subLeft: `Below ${summary.low_stock_threshold || lowThreshold} units`,
            subRight: 'Reorder Needed'
          },
          {
            label: 'Out of Stock Items',
            value: summary.out_of_stock_count || 0,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-alert-line',
            subLeft: 'Zero Inventory',
            subRight: 'Action Required'
          },
        ].map(c => (
          <div key={c.label} className="col-12 col-sm-6 col-xl">
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

      {/* Main Stock Tables Row */}
      <div className="row g-3 mb-4">
        {/* Low Stock Reorder List */}
        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title mb-0">
                <i className="ri-alarm-warning-line me-2 text-danger"></i>Low Stock Items &amp; Reorder Thresholds
              </h5>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter low stock..."
                  className="form-control form-control-sm"
                  style={{ width: '180px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="badge bg-danger text-white">{filteredLowStock.length} items</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Produce Item</th>
                      <th className="text-center">Current Stock</th>
                      <th className="text-center">Threshold</th>
                      <th className="text-end">Unit Cost</th>
                      <th className="text-end pe-3">Inventory Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          <span className="spinner-border spinner-border-sm me-2"></span>Loading inventory data...
                        </td>
                      </tr>
                    ) : filteredLowStock.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          ✅ No items are below the {lowThreshold} unit threshold.
                        </td>
                      </tr>
                    ) : (
                      filteredLowStock.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{p.name}</div>
                            <div className="text-muted fs-xs font-monospace">{p.sku}</div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-bold">
                              {p.stock} units
                            </span>
                          </td>
                          <td className="text-center text-muted fs-sm">
                            &le; {p.reorder_level || lowThreshold}
                          </td>
                          <td className="text-end font-monospace text-dark">
                            {formatNaira(p.unit_cost)}
                          </td>
                          <td className="text-end pe-3 fw-bold text-primary font-monospace">
                            {formatNaira(p.stock_value)}
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

        {/* Stock Valuation by Category */}
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-pie-chart-line me-2 text-primary"></i>Valuation by Category
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '380px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">Category</th>
                      <th className="text-center">Units</th>
                      <th className="text-end pe-3">Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading categories...</td>
                      </tr>
                    ) : stockByCategory.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No category inventory records.</td>
                      </tr>
                    ) : (
                      stockByCategory.map((c, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-dark">{c.category || 'Uncategorized'}</td>
                          <td className="text-center text-muted fs-sm">{Number(c.total_units || 0).toLocaleString()}</td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(c.stock_value)}
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

      {/* Top Velocity Movers & Stock Movements Audit Trail */}
      <div className="row g-3 mb-4">
        {/* Top Movers */}
        <div className="col-xl-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="card-title mb-0">
                <i className="ri-speed-up-line me-2 text-success"></i>Fastest Moving Inventory
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Item</th>
                      <th className="text-center">Units Sold</th>
                      <th className="text-end pe-3">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">Loading velocity data...</td>
                      </tr>
                    ) : topMovers.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">No sales movements in this period.</td>
                      </tr>
                    ) : (
                      topMovers.map((m, idx) => (
                        <tr key={m.id || idx}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{m.name}</div>
                            <div className="text-muted fs-xs">Stock left: {m.stock}</div>
                          </td>
                          <td className="text-center fw-bold text-primary">{m.units_sold}</td>
                          <td className="text-end pe-3 fw-bold text-success font-monospace">
                            {formatNaira(m.revenue)}
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

        {/* Stock Movements Audit Log */}
        <div className="col-xl-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="ri-history-line me-2 text-primary"></i>Stock Movement Audit Trail
              </h5>
              <span className="badge bg-light text-dark border">{recentMovements.length} log events</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '360px' }}>
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th className="ps-3">When</th>
                      <th>Product</th>
                      <th className="text-center">Change</th>
                      <th>Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">Loading movements...</td>
                      </tr>
                    ) : recentMovements.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">No stock movements recorded in this period.</td>
                      </tr>
                    ) : (
                      recentMovements.map((sm, idx) => {
                        const qty = Number(sm.quantity || 0)
                        return (
                          <tr key={idx}>
                            <td className="ps-3 text-muted fs-xs">
                              {sm.created_at ? new Date(sm.created_at).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td>
                              <div className="fw-bold text-dark fs-sm">{sm.product_name}</div>
                              <div className="text-muted fs-xs font-monospace">{sm.sku || sm.reference}</div>
                            </td>
                            <td className="text-center">
                              <span className={`badge ${qty >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} font-monospace`}>
                                {qty >= 0 ? `+${qty}` : qty}
                              </span>
                            </td>
                            <td className="text-muted fs-xs">
                              {sm.reason || sm.type || 'Manual adjustment'}
                            </td>
                          </tr>
                        )
                      })
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
