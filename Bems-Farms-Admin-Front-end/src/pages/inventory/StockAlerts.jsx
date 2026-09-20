import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function StockAlerts() {
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState([])
  const [outOfStock, setOutOfStock] = useState([])
  const [expiringSoon, setExpiringSoon] = useState([])
  const [summary, setSummary] = useState({
    low_stock_count: 0,
    out_of_stock_count: 0,
    expiring_product_count: 0,
  })

  const [activeTab, setActiveTab] = useState('out') // 'out' | 'low' | 'expiring'
  const [search, setSearch] = useState('')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/alerts')
      if (res.data) {
        setLowStock(res.data.low_stock || [])
        setOutOfStock(res.data.out_of_stock || [])
        setExpiringSoon(res.data.expiring_soon || [])
        if (res.data.summary) {
          setSummary(res.data.summary)
        }
      }
    } catch (err) {
      toast.error('Failed to load stock alerts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Current list depending on active tab
  const currentList = activeTab === 'out'
    ? outOfStock
    : activeTab === 'low'
    ? lowStock
    : expiringSoon

  const filtered = currentList.filter((item) => {
    const q = search.toLowerCase()
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Low Stock & Inventory Alerts</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Stock Alerts</li>
          </ul>
        </div>
        <div className="d-flex gap-2">
          <Link to="/inventory/stock-in" className="btn btn-sm btn-primary d-flex align-items-center gap-1">
            <i className="ri-inbox-archive-line"></i> Restock Products
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={fetchAlerts}>
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>
      </div>

      {/* Critical Banner if Out of Stock exists */}
      {summary.out_of_stock_count > 0 && (
        <div className="alert border-0 mb-4 d-flex align-items-center gap-2 p-3 rounded shadow-sm"
          style={{ background: '#fef0ed', color: '#8a1a00' }}>
          <i className="ri-close-circle-fill fs-22 text-danger"></i>
          <div>
            <strong>Critical Alert: {summary.out_of_stock_count} product{summary.out_of_stock_count > 1 ? 's are' : ' is'} completely out of stock!</strong>
            <div className="fs-12 text-muted mt-0.5">Online customers cannot purchase these items until stock is replenished.</div>
          </div>
          <Link to="/inventory/stock-in" className="btn btn-sm btn-danger ms-auto px-3">
            + Restock Now
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            key: 'out',
            label: 'Zero Stock / Depleted',
            count: summary.out_of_stock_count,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-close-circle-line',
            subLeft: 'Sales Halted',
            subRight: `${summary.out_of_stock_count} SKUs Out`
          },
          {
            key: 'low',
            label: 'Low Stock Threshold',
            count: summary.low_stock_count,
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-alert-line',
            subLeft: 'Under Reorder Level',
            subRight: `${summary.low_stock_count} Need Restock`
          },
          {
            key: 'expiring',
            label: 'Expiring Soon (≤ 7 Days)',
            count: summary.expiring_product_count,
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-time-line',
            subLeft: 'FIFO Rotation Due',
            subRight: `${summary.expiring_product_count} Batches`
          },
        ].map((c) => (
          <div className="col-12 col-md-4" key={c.key}>
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow} cursor-pointer ${activeTab === c.key ? 'ring-2 ring-primary' : ''}`}
              style={{ cursor: 'pointer', outline: activeTab === c.key ? '2px solid #143C2D' : 'none' }}
              onClick={() => setActiveTab(c.key)}>
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
                  {c.count}
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

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <ul className="nav nav-pills card-header-pills">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm ${activeTab === 'out' ? 'active' : ''}`}
                onClick={() => setActiveTab('out')}>
                Out of Stock ({summary.out_of_stock_count})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm ${activeTab === 'low' ? 'active' : ''}`}
                onClick={() => setActiveTab('low')}>
                Low Stock ({summary.low_stock_count})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm ${activeTab === 'expiring' ? 'active' : ''}`}
                onClick={() => setActiveTab('expiring')}>
                Expiring Soon ({summary.expiring_product_count})
              </button>
            </li>
          </ul>

          <div className="search-box" style={{ minWidth: 220 }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Filter items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-end">Current Stock</th>
                  <th className="text-end">Low Stock Threshold</th>
                  {activeTab === 'expiring' && <th>Expiry Date</th>}
                  <th className="text-center">Severity</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading live alerts...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="ri-checkbox-circle-line fs-32 text-success mb-2 d-block"></i>
                      Great news! No products currently in this alert state.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={item.image_url || 'https://placehold.co/80x80?text=Produce'}
                            alt=""
                            className="rounded border flex-shrink-0"
                            style={{ width: 36, height: 36, objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = 'https://placehold.co/80x80?text=Produce'
                            }}
                          />
                          <span className="fw-semibold text-dark">{item.name}</span>
                        </div>
                      </td>
                      <td><code className="text-primary">{item.sku || '—'}</code></td>
                      <td><span className="badge bg-light text-dark">{item.category || 'General'}</span></td>
                      <td className="text-end fw-bold">
                        <span className={item.stock === 0 ? 'text-danger' : 'text-warning'}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="text-end text-muted">{item.low_stock_threshold || 5}</td>
                      {activeTab === 'expiring' && (
                        <td className="text-danger fw-semibold">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                        </td>
                      )}
                      <td className="text-center">
                        {item.stock === 0 ? (
                          <span className="badge bg-danger">Out of Stock</span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning">Low Stock</span>
                        )}
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/inventory/stock-in`}
                          className="btn btn-sm btn-primary py-1 px-2 me-1">
                          <i className="ri-inbox-archive-line me-1"></i> Restock
                        </Link>
                        <Link
                          to={`/products/add?edit=${item.id}`}
                          className="btn btn-sm btn-outline-secondary py-1 px-2">
                          <i className="ri-edit-line"></i>
                        </Link>
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
  )
}
