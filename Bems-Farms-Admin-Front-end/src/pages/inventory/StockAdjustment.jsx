import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const REASONS = [
  'Physical Count Correction',
  'Spoilage/Damage',
  'Expiry Write-off',
  'Theft/Loss',
  'Harvest Intake Correction',
  'System Error Correction',
  'Quality Rejection',
  'Promotional Giveaway',
]

export default function StockAdjustment() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Adjustment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    current_qty: 0,
    new_quantity: '',
    reason: REASONS[0],
    notes: '',
  })

  // Load products & warehouses
  useEffect(() => {
    async function loadMeta() {
      try {
        const [pRes, wRes] = await Promise.all([
          api.get('/admin/products', { params: { limit: 150 } }),
          api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
        ])
        if (pRes.data?.products) setProducts(pRes.data.products)
        if (wRes.data?.warehouses) setWarehouses(wRes.data.warehouses)
      } catch (err) {
        console.error('Failed to load products for adjustment:', err)
      }
    }
    loadMeta()
  }, [])

  // Fetch adjustment movements
  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/movements', {
        params: {
          type: 'adjustment',
          page,
          limit: 15,
          search: search.trim() || undefined,
        },
      })
      if (res.data) {
        setMovements(res.data.movements || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.pages || 1)
      }
    } catch (err) {
      toast.error('Failed to load stock adjustment records')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  function openAdjustmentModal() {
    const firstProd = products[0]
    setForm({
      product_id: firstProd?.id ? String(firstProd.id) : '',
      warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
      current_qty: firstProd?.stock !== undefined ? firstProd.stock : 0,
      new_quantity: firstProd?.stock !== undefined ? String(firstProd.stock) : '0',
      reason: REASONS[0],
      notes: '',
    })
    setModalOpen(true)
  }

  function handleProductChange(e) {
    const selectedId = e.target.value
    const found = products.find((p) => String(p.id) === String(selectedId))
    const currentStock = found?.stock !== undefined ? found.stock : 0
    setForm((prev) => ({
      ...prev,
      product_id: selectedId,
      current_qty: currentStock,
      new_quantity: String(currentStock),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product_id) {
      return toast.error('Please select a product')
    }
    if (form.new_quantity === '' || isNaN(parseInt(form.new_quantity)) || parseInt(form.new_quantity) < 0) {
      return toast.error('Please enter a valid stock count (≥ 0)')
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/adjust', {
        product_id: parseInt(form.product_id),
        warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : null,
        new_quantity: parseInt(form.new_quantity),
        reason: form.reason,
        notes: form.notes?.trim() || undefined,
      })

      toast.success(res.data?.message || 'Stock adjusted successfully!')
      setModalOpen(false)
      fetchMovements()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const delta = parseInt(form.new_quantity) - form.current_qty

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Stock Adjustments & Corrections</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Adjustments</li>
          </ul>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
          onClick={openAdjustmentModal}>
          <i className="ri-scales-3-line"></i> + Create Stock Adjustment
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box" style={{ minWidth: 260 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search adjustments by product, reason..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total adjustments logged: <strong>{total}</strong></span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th className="text-end">Before Qty</th>
                  <th className="text-center">Variance (Delta)</th>
                  <th className="text-end">New Qty</th>
                  <th>Adjustment Reason</th>
                  <th>Staff Member</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading stock adjustments...</span>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-32 text-secondary mb-2 d-block"></i>
                      No stock adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const diff = (m.after_qty !== undefined && m.before_qty !== undefined)
                      ? (m.after_qty - m.before_qty)
                      : (m.quantity || 0)

                    return (
                      <tr key={m.id}>
                        <td className="text-muted fs-13">
                          {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="fw-semibold text-dark">{m.product_name || 'Product'}</td>
                        <td><code className="text-muted">{m.sku || '—'}</code></td>
                        <td><span className="badge bg-light text-dark">{m.warehouse_name || 'Main Warehouse'}</span></td>
                        <td className="text-end">{m.before_qty ?? '—'}</td>
                        <td className="text-center">
                          {diff > 0 ? (
                            <span className="badge bg-success-subtle text-success">+{diff} Added</span>
                          ) : diff < 0 ? (
                            <span className="badge bg-danger-subtle text-danger">{diff} Deducted</span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary">0 No Change</span>
                          )}
                        </td>
                        <td className="text-end fw-bold text-dark">{m.after_qty ?? '—'}</td>
                        <td>
                          <span className="fw-medium text-dark">{m.reason || 'Count Correction'}</span>
                          {m.notes && <div className="text-muted fs-11 mt-0.5">{m.notes}</div>}
                        </td>
                        <td><small className="text-muted">{m.created_by_name || 'Admin'}</small></td>
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
              <span className="text-muted fs-13">Showing page {page} of {totalPages}</span>
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

      {/* Stock Adjustment Modal */}
      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="ri-scales-3-line me-2 text-primary"></i>
                  New Stock Adjustment
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Select Product <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={form.product_id}
                      onChange={handleProductChange}
                      required>
                      <option value="">— Select Product —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku || 'No SKU'}) — Current Stock: {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Warehouse Location</label>
                    <select
                      className="form-select"
                      value={form.warehouse_id}
                      onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                      <option value="">— Main Warehouse Store —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-muted fs-12">Recorded Stock</label>
                      <div className="form-control bg-light fw-bold text-secondary">{form.current_qty}</div>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">New Accurate Count <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={form.new_quantity}
                        onChange={(e) => setForm({ ...form, new_quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {!isNaN(delta) && (
                    <div className="alert p-2 mb-3 fs-13 d-flex align-items-center justify-content-between"
                      style={{ background: delta > 0 ? '#e8f5e9' : delta < 0 ? '#ffebee' : '#f5f5f5', color: delta > 0 ? '#2e7d32' : delta < 0 ? '#c62828' : '#616161' }}>
                      <span>Adjustment Variance:</span>
                      <strong>{delta > 0 ? `+${delta} (Stock Increase)` : delta < 0 ? `${delta} (Stock Decrease)` : 'No Difference'}</strong>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reason <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      required>
                      {REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Audit Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Discovered broken jar during morning warehouse audit"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitting}>
                    {submitting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                    <i className="ri-check-line"></i> Apply Stock Adjustment
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
