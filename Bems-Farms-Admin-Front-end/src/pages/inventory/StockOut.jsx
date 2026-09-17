import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

const REASONS = ['Sales Order', 'Internal Use', 'Wastage', 'Return to Supplier', 'Spoilage', 'Other']

export default function StockOut() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    product_id: '', warehouse_id: '', quantity: 1, reason: 'Sales Order', reference: '', notes: '',
  })

  useEffect(() => {
    async function loadMeta() {
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get('/admin/products', { params: { limit: 150 } }),
          api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
        ])
        if (prodRes.data?.products) setProducts(prodRes.data.products)
        if (whRes.data?.warehouses) setWarehouses(whRes.data.warehouses)
      } catch (err) {
        console.error('Error loading metadata for Stock Out:', err)
      }
    }
    loadMeta()
  }, [])

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/movements', {
        params: { type: 'stock_out', page, limit: 15, search: search.trim() || undefined },
      })
      if (res.data) {
        setMovements(res.data.movements || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.pages || 1)
      }
    } catch (err) {
      toast.error('Failed to load stock out history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const stats = {
    total,
    completedQty: movements.reduce((s, m) => s + (m.quantity || 0), 0),
  }

  function openAdd() {
    const defaultProdId = products[0]?.id ? String(products[0].id) : ''
    const defaultWh = warehouses[0]?.id ? String(warehouses[0].id) : ''
    setForm({
      product_id: defaultProdId, warehouse_id: defaultWh, quantity: 1,
      reason: 'Sales Order', reference: '', notes: '',
    })
    setModalOpen(true)
  }

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product_id) return toast.error('Please select a product')
    const qty = parseInt(form.quantity)
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity greater than 0')
    if (selectedProduct && qty > selectedProduct.stock) {
      return toast.error(`Only ${selectedProduct.stock} units of ${selectedProduct.name} in stock`)
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/stock-out', {
        product_id: parseInt(form.product_id),
        warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : null,
        quantity: qty,
        reason: form.reason,
        reference: form.reference?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      })
      toast.success(res.data?.message || 'Stock dispatched successfully!')
      setModalOpen(false)
      fetchMovements()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record stock out')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Stock Out</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Stock Out</li>
          </ul>
        </div>
        <button type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={openAdd}>
          <i className="ri-add-circle-line"></i> + Record Stock Out
        </button>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Dispatches', value: stats.total, icon: 'ri-send-plane-line', color: '#405189' },
          { label: 'Units Dispatched (this page)', value: stats.completedQty, icon: 'ri-archive-drawer-line', color: '#f06548' },
        ].map((c) => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0" style={{ borderLeft: `3px solid ${c.color}` }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
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

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box" style={{ minWidth: 260 }}>
              <div className="position-relative">
                <input
                  type="text" className="form-control form-control-sm ps-4"
                  placeholder="Search reference, product, reason…"
                  value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total dispatches recorded: <strong>{total}</strong></span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Reference</th>
                  <th>Date & Time</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th className="text-end">Qty Dispatched</th>
                  <th className="text-end">Before → After</th>
                  <th>Reason</th>
                  <th>Dispatched By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading stock-out records…</span>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ri-send-plane-line fs-32 text-secondary mb-2 d-block"></i>
                      No stock-out records found. Click <strong>"+ Record Stock Out"</strong> to add one.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td><code className="text-primary fw-bold">{m.reference || `SO-REC-${m.id}`}</code></td>
                      <td className="text-muted fs-13">
                        {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="fw-semibold text-dark">{m.product_name || 'Product'}</td>
                      <td><code className="text-muted">{m.sku || '—'}</code></td>
                      <td><span className="badge bg-light text-dark border">{m.warehouse_name || 'Main Warehouse'}</span></td>
                      <td className="text-end fw-bold text-danger">-{m.quantity}</td>
                      <td className="text-end text-muted fs-13">
                        {m.before_qty !== undefined ? `${m.before_qty} → ${m.after_qty}` : '—'}
                      </td>
                      <td>
                        <span className="badge bg-danger-subtle text-danger">{m.reason || 'Dispatch'}</span>
                        {m.notes && <div className="text-muted fs-11 mt-1">{m.notes}</div>}
                      </td>
                      <td><small className="text-muted">{m.created_by_name || 'Staff'}</small></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
              <span className="text-muted fs-13">Showing page {page} of {totalPages}</span>
              <div className="btn-group btn-group-sm">
                <button type="button" className="btn btn-outline-secondary" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                <button type="button" className="btn btn-outline-secondary" disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="ri-send-plane-line me-2 text-primary"></i>Record Stock Out / Dispatch
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Select Product <span className="text-danger">*</span></label>
                      <ProductSelect
                        products={products}
                        value={form.product_id}
                        onChange={(selectedId) => setForm({ ...form, product_id: selectedId })}
                        placeholder="Type name, scan barcode, or select..."
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Warehouse</label>
                      <select className="form-select" value={form.warehouse_id}
                        onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                        <option value="">— Main Warehouse Store —</option>
                        {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Quantity <span className="text-danger">*</span></label>
                      <input type="number" className="form-control" min="1" max={selectedProduct?.stock || undefined}
                        value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                      {selectedProduct && <div className="form-text">Available: {selectedProduct.stock}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Reason</label>
                      <select className="form-select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                        {REASONS.map((r) => (<option key={r}>{r}</option>))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Reference #</label>
                      <input type="text" className="form-control" placeholder="Auto generated or order ref"
                        value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea className="form-control" rows="2" placeholder="e.g. Dispatched to walk-in customer at counter"
                        value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitting}>
                    {submitting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                    <i className="ri-check-line"></i> Confirm Dispatch
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
