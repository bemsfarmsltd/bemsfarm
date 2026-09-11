import { useState, useMemo } from 'react'

const MOCK_ALERTS = [
  { id:1, product:'Fresh Tomatoes',     sku:'VEG-TOM-001', category:'Vegetables',    unit:'kg',    stock:8,   reorder:15, severity:'critical', warehouse:'Main Store', lastUpdated:'2026-06-26' },
  { id:2, product:'Palm Oil (25L)',      sku:'OIL-PLM-001', category:'Grains & Carbs',unit:'crate', stock:0,   reorder:5,  severity:'out_of_stock', warehouse:'Main Store', lastUpdated:'2026-06-20' },
  { id:3, product:'Fresh Pepper',        sku:'VEG-PEP-001', category:'Vegetables',    unit:'kg',    stock:6,   reorder:10, severity:'critical', warehouse:'Main Store', lastUpdated:'2026-06-26' },
  { id:4, product:'Cassava Flour (2kg)', sku:'GRN-CAS-001', category:'Grains & Carbs',unit:'pack',  stock:14,  reorder:15, severity:'low',      warehouse:'Dry Store',  lastUpdated:'2026-06-22' },
  { id:5, product:'Fresh Milk (1L)',      sku:'DAI-MLK-001', category:'Dairy & Eggs',  unit:'bottle',stock:10,  reorder:12, severity:'low',      warehouse:'Cold Room',  lastUpdated:'2026-06-26' },
  { id:6, product:'Catfish (Smoked)',    sku:'SEA-CAT-001', category:'Seafood',        unit:'kg',    stock:9,   reorder:10, severity:'low',      warehouse:'Cold Room',  lastUpdated:'2026-06-24' },
]

const SEVERITY_CFG = {
  out_of_stock: { label:'Out of Stock', cls:'bg-danger text-white',         icon:'ri-close-circle-fill',       border:'#f06548' },
  critical:     { label:'Critical',     cls:'bg-danger-subtle text-danger',  icon:'ri-error-warning-fill',      border:'#f06548' },
  low:          { label:'Low Stock',    cls:'bg-warning-subtle text-warning',icon:'ri-alert-fill',              border:'#f7b84b' },
}

export default function StockAlerts() {
  const [alerts, setAlerts]             = useState(MOCK_ALERTS)
  const [search, setSearch]             = useState('')
  const [filterSeverity, setFilterSev]  = useState('all')
  const [dismissed, setDismissed]       = useState([])

  const visible = useMemo(() => alerts.filter(a => {
    if (dismissed.includes(a.id)) return false
    const m = a.product.toLowerCase().includes(search.toLowerCase()) ||
              a.sku.toLowerCase().includes(search.toLowerCase())
    return m && (filterSeverity === 'all' || a.severity === filterSeverity)
  }), [alerts, search, filterSeverity, dismissed])

  const stats = useMemo(() => ({
    total:    alerts.length,
    out:      alerts.filter(a => a.severity === 'out_of_stock').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    low:      alerts.filter(a => a.severity === 'low').length,
  }), [alerts])

  function dismiss(id) { setDismissed(prev => [...prev, id]) }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Low Stock Alerts</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Low Stock Alerts</li>
        </ul>
      </div>

      {/* Critical banner */}
      {stats.out > 0 && (
        <div className="alert border-0 mb-4 d-flex align-items-center gap-2" style={{ background:'#fef0ed', color:'#8a1a00' }}>
          <i className="ri-close-circle-fill fs-20 text-danger"></i>
          <span><strong>{stats.out} product{stats.out > 1 ? 's' : ''} are completely out of stock</strong> — create a Stock In order immediately.</span>
          <a href="/inventory/stock-in" className="btn btn-sm btn-danger ms-auto">+ Stock In</a>
        </div>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Alerts',    value: stats.total,    icon:'ri-alert-line',         color:'#405189', filter:'all'          },
          { label:'Out of Stock',    value: stats.out,      icon:'ri-close-circle-line',   color:'#f06548', filter:'out_of_stock' },
          { label:'Critical',        value: stats.critical, icon:'ri-error-warning-line',  color:'#ef4444', filter:'critical'     },
          { label:'Low Stock',       value: stats.low,      icon:'ri-subtract-line',       color:'#f7b84b', filter:'low'          },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }} onClick={() => setFilterSev(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto">
            <select className="form-select" style={{ width:'auto' }} value={filterSeverity} onChange={e => setFilterSev(e.target.value)}>
              <option value="all">All Alerts</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="critical">Critical</option>
              <option value="low">Low Stock</option>
            </select>
            <a href="/inventory/stock-in" className="btn btn-primary d-flex align-items-center gap-1">
              <i className="ri-add-line"></i> Create Reorder
            </a>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">SKU</th>
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Current Stock</th>
                  <th className="fw-medium text-muted">Reorder Level</th>
                  <th className="fw-medium text-muted">Shortage</th>
                  <th className="fw-medium text-muted">Severity</th>
                  <th className="fw-medium text-muted">Updated</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-checkbox-circle-line fs-2 d-block mb-2 text-success"></i>
                    {dismissed.length > 0 ? 'All remaining alerts dismissed.' : 'No alerts — all products well stocked!'}
                  </td></tr>
                )}
                {visible.map(a => {
                  const sc       = SEVERITY_CFG[a.severity]
                  const shortage = Math.max(0, a.reorder - a.stock)
                  return (
                    <tr key={a.id} style={{ borderLeft:`3px solid ${sc.border}` }}>
                      <td>
                        <div className="fw-medium">{a.product}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{a.unit}</div>
                      </td>
                      <td><code style={{ fontSize:12 }}>{a.sku}</code></td>
                      <td><span className="badge bg-light text-dark border">{a.category}</span></td>
                      <td>{a.warehouse}</td>
                      <td>
                        <span className="fw-bold" style={{ color: a.stock === 0 ? '#f06548' : '#f7b84b' }}>
                          {a.stock} {a.unit}
                        </span>
                      </td>
                      <td className="text-muted">{a.reorder} {a.unit}</td>
                      <td className="fw-bold text-danger">{shortage > 0 ? `-${shortage}` : '—'}</td>
                      <td><span className={`badge ${sc.cls}`}><i className={`${sc.icon} me-1`}></i>{sc.label}</span></td>
                      <td className="text-muted">{a.lastUpdated}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <a href="/inventory/stock-in" className="btn btn-sm btn-soft-primary px-2" title="Reorder">
                            <i className="ri-shopping-cart-add-line"></i>
                          </a>
                          <button className="btn btn-sm btn-soft-secondary px-2" title="Dismiss" onClick={() => dismiss(a.id)}>
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>
            Showing {visible.length} of {stats.total} alerts
            {dismissed.length > 0 && <span className="ms-2 text-secondary">({dismissed.length} dismissed this session)</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
