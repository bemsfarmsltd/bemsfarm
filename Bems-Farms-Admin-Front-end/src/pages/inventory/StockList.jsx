import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STATUS_CONFIG = {
  in_stock: { label: 'In Stock', cls: 'bg-success-subtle text-success' },
  low: { label: 'Low Stock', cls: 'bg-warning-subtle text-warning' },
  low_stock: { label: 'Low Stock', cls: 'bg-warning-subtle text-warning' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-danger-subtle text-danger' },
}

function formatNaira(amount) {
  const n = parseFloat(amount) || 0
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_skus: 0,
    out_of_stock: 0,
    low_stock: 0,
    total_value: 0,
  })

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Adjust modal state
  const [adjustModal, setAdjustModal] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ new_quantity: '', reason: 'Physical Count Correction', notes: '' })
  const [adjustLoading, setAdjustLoading] = useState(false)

  const fetchStock = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        stock_status: filterStatus === 'all' ? undefined : filterStatus,
      }
      const res = await api.get('/admin/inventory', { params })
      if (res.data) {
        setProducts(res.data.products || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.pages || 1)
        if (res.data.stats) {
          setStats(res.data.stats)
        }
      }
    } catch (err) {
      toast.error('Failed to load inventory stock')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  function handleOpenAdjust(prod) {
    setAdjustModal(prod)
    setAdjustForm({
      new_quantity: prod.stock !== undefined ? String(prod.stock) : '0',
      reason: 'Physical Count Correction',
      notes: '',
    })
  }

  async function handleSaveAdjust(e) {
    e.preventDefault()
    if (!adjustModal) return

    setAdjustLoading(true)
    try {
      await api.post('/admin/inventory/adjust', {
        product_id: adjustModal.id,
        new_quantity: parseInt(adjustForm.new_quantity) || 0,
        reason: adjustForm.reason,
        notes: adjustForm.notes || undefined,
      })
      toast.success(`Stock adjusted for "${adjustModal.name}"`)
      setAdjustModal(null)
      fetchStock()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock')
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <div className="container-fluid">
      {/* Breadcrumb */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Stock List & Valuation</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Stock List</li>
          </ul>
        </div>
        <div className="d-flex gap-2">
          <Link to="/inventory/stock-in" className="btn btn-sm btn-primary d-flex align-items-center gap-1">
            <i className="ri-inbox-archive-line"></i> Receive Stock In
          </Link>
          <Link to="/inventory/alerts" className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1">
            <i className="ri-alert-line"></i> Low Stock Alerts
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total SKUs', value: stats.total_skus, icon: 'ri-box-3-line', color: '#405189', filter: 'all' },
          { label: 'In Stock', value: Math.max(0, (stats.total_skus || 0) - (stats.out_of_stock || 0) - (stats.low_stock || 0)), icon: 'ri-checkbox-circle-line', color: '#0ab39c', filter: 'ok' },
          { label: 'Low Stock Items', value: stats.low_stock, icon: 'ri-alert-line', color: '#f7b84b', filter: 'low' },
          { label: 'Out of Stock', value: stats.out_of_stock, icon: 'ri-close-circle-line', color: '#f06548', filter: 'out' },
        ].map((c) => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div
              className={`card mb-0 cursor-pointer ${filterStatus === c.filter ? 'ring-2' : ''}`}
              style={{
                borderLeft: `3px solid ${c.color}`,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onClick={() => { setFilterStatus(c.filter); setPage(1) }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: `${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color: c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          {/* Filters Bar */}
          <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
            <div className="search-box flex-grow-1" style={{ minWidth: 220 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search by product name, SKU..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              {['all', 'ok', 'low', 'out'].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => { setFilterStatus(s); setPage(1) }}>
                  {s === 'all' ? 'All Stock' : s === 'ok' ? 'Adequate' : s === 'low' ? 'Low Stock' : 'Out of Stock'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-end">Current Stock</th>
                  <th className="text-end">Reorder Level</th>
                  <th className="text-end">Cost Price</th>
                  <th className="text-end">Selling Price</th>
                  <th className="text-end">Stock Value</th>
                  <th className="text-center">Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading live inventory stock...</span>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-32 text-secondary mb-2 d-block"></i>
                      No stock records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const statusKey = p.stock_status || (p.stock === 0 ? 'out_of_stock' : p.stock <= (p.low_stock_threshold || 5) ? 'low' : 'in_stock')
                    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.in_stock

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={p.image_url || 'https://placehold.co/80x80?text=Produce'}
                              alt=""
                              className="rounded border flex-shrink-0"
                              style={{ width: 36, height: 36, objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'https://placehold.co/80x80?text=Produce'
                              }}
                            />
                            <div>
                              <div className="fw-semibold text-dark">{p.name}</div>
                              <small className="text-muted">{p.unit || 'unit'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-primary d-block">{p.sku || '—'}</code>
                          {p.barcode && <small className="text-muted font-monospace" style={{ fontSize: '11px' }}>BC: {p.barcode}</small>}
                        </td>
                        <td><span className="badge bg-light text-dark">{p.category || 'General'}</span></td>
                        <td className="text-end fw-bold">
                          <span className={p.stock === 0 ? 'text-danger' : p.stock <= (p.low_stock_threshold || 5) ? 'text-warning' : 'text-success'}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="text-end text-muted">{p.low_stock_threshold || 5}</td>
                        <td className="text-end">{formatNaira(p.cost_price)}</td>
                        <td className="text-end">{formatNaira(p.unit_price)}</td>
                        <td className="text-end fw-semibold">{formatNaira((p.stock || 0) * (p.unit_price || 0))}</td>
                        <td className="text-center">
                          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleOpenAdjust(p)}
                            title="Adjust Stock">
                            <i className="ri-scales-3-line me-1"></i> Adjust
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
              <span className="text-muted fs-13">Showing page {page} of {totalPages} ({total} total SKUs)</span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Adjust Stock: {adjustModal.name}</h5>
                <button type="button" className="btn-close" onClick={() => setAdjustModal(null)}></button>
              </div>
              <form onSubmit={handleSaveAdjust}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted fs-13">Current Warehouse Stock</label>
                    <div className="fs-18 fw-bold text-primary">{adjustModal.stock} {adjustModal.unit || 'units'}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Accurate Stock Quantity <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={adjustForm.new_quantity}
                      onChange={(e) => setAdjustForm({ ...adjustForm, new_quantity: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reason for Adjustment <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      required>
                      <option value="Physical Count Correction">Physical Count Correction</option>
                      <option value="Spoilage/Damage">Spoilage / Breakage</option>
                      <option value="Expiry Write-off">Expiry Write-off</option>
                      <option value="Theft/Loss">Theft / Unexplained Loss</option>
                      <option value="Harvest Intake Correction">Harvest Intake Correction</option>
                      <option value="Quality Rejection">Quality Rejection</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Audit Notes (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Recounted warehouse shelf B2 during morning audit"
                      value={adjustForm.notes}
                      onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setAdjustModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={adjustLoading}>
                    {adjustLoading ? 'Saving...' : 'Apply Stock Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
