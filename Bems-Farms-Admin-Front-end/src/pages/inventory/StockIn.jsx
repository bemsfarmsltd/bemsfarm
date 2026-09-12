import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

function formatNaira(amount) {
  const n = parseFloat(amount) || 0
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockIn() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Intake modal form state
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: 10,
    unit_cost: '',
    supplier: 'Bems Farms Internal Harvest',
    reference: '',
    batch_no: '',
    expiry_date: '',
    notes: '',
  })

  // Load products and warehouses for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get('/admin/products', { params: { limit: 150 } }),
          api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
        ])
        if (prodRes.data?.products) {
          setProducts(prodRes.data.products)
        }
        if (whRes.data?.warehouses) {
          setWarehouses(whRes.data.warehouses)
        }
      } catch (err) {
        console.error('Error loading metadata for Stock In:', err)
      }
    }
    loadMeta()
  }, [])

  // Load stock_in movements from backend
  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/movements', {
        params: {
          type: 'stock_in',
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
      toast.error('Failed to load stock in history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  function openIntakeModal() {
    const defaultProdId = products[0]?.id ? String(products[0].id) : ''
    const defaultCost = products[0]?.cost_price !== undefined ? String(products[0].cost_price) : ''
    const defaultWh = warehouses[0]?.id ? String(warehouses[0].id) : ''
    const refNum = `SI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    setForm({
      product_id: defaultProdId,
      warehouse_id: defaultWh,
      quantity: 20,
      unit_cost: defaultCost,
      supplier: 'Bems Farms Internal Harvest',
      reference: refNum,
      batch_no: `BATCH-${Date.now().toString().slice(-5)}`,
      expiry_date: '',
      notes: '',
    })
    setModalOpen(true)
  }

  function handleProductChange(e) {
    const selectedId = e.target.value
    const found = products.find((p) => String(p.id) === String(selectedId))
    setForm((prev) => ({
      ...prev,
      product_id: selectedId,
      unit_cost: found?.cost_price !== undefined ? String(found.cost_price) : prev.unit_cost,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product_id) {
      return toast.error('Please select a product to receive')
    }
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      return toast.error('Please enter a valid quantity greater than 0')
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/stock-in', {
        product_id: parseInt(form.product_id),
        warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : null,
        quantity: parseInt(form.quantity),
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : 0,
        supplier: form.supplier?.trim() || 'Direct Intake',
        reference: form.reference?.trim() || undefined,
        batch_no: form.batch_no?.trim() || undefined,
        expiry_date: form.expiry_date || undefined,
        notes: form.notes?.trim() || undefined,
      })

      toast.success(res.data?.message || 'Stock received successfully!')
      setModalOpen(false)
      fetchMovements()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record stock intake')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Stock In & Receiving Intake</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Stock In</li>
          </ul>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
          onClick={openIntakeModal}>
          <i className="ri-add-circle-line"></i> + Receive New Stock Intake
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
                  placeholder="Search reference, product, reason..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total receipts recorded: <strong>{total}</strong></span>
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
                  <th className="text-end">Qty Added</th>
                  <th className="text-end">Before $\rightarrow$ After</th>
                  <th className="text-end">Unit Cost</th>
                  <th>Intake Reason / Source</th>
                  <th>Received By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading stock intake records...</span>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-32 text-secondary mb-2 d-block"></i>
                      No stock-in receipts found. Click <strong>"+ Receive New Stock Intake"</strong> to record one.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td><code className="text-primary fw-bold">{m.reference || `SI-REC-${m.id}`}</code></td>
                      <td className="text-muted fs-13">
                        {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="fw-semibold text-dark">{m.product_name || 'Product'}</td>
                      <td><code className="text-muted">{m.sku || '—'}</code></td>
                      <td><span className="badge bg-light text-dark">{m.warehouse_name || 'Main Warehouse'}</span></td>
                      <td className="text-end fw-bold text-success">+{m.quantity}</td>
                      <td className="text-end text-muted fs-13">
                        {m.before_qty !== undefined ? `${m.before_qty} → ${m.after_qty}` : '—'}
                      </td>
                      <td className="text-end">{formatNaira(m.unit_cost)}</td>
                      <td>
                        <span className="badge bg-success-subtle text-success">{m.reason || 'Farm Intake'}</span>
                        {m.notes && <div className="text-muted fs-11 mt-1">{m.notes}</div>}
                      </td>
                      <td><small className="text-muted">{m.created_by_name || 'Staff'}</small></td>
                    </tr>
                  ))
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

      {/* Intake Receiving Modal */}
      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="ri-inbox-archive-line me-2 text-primary"></i>
                  Receive Stock Intake (Harvest / Supplier)
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
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

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Destination Warehouse</label>
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

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Quantity Received <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        placeholder="e.g. 50"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Unit Cost (₦)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.01"
                        placeholder="Cost per unit"
                        value={form.unit_cost}
                        onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Source / Supplier</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Farm Harvest Epe"
                        value={form.supplier}
                        onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Reference / Receipt #</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Auto generated or PO #"
                        value={form.reference}
                        onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Batch / Lot Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. BATCH-2026-A"
                        value={form.batch_no}
                        onChange={(e) => setForm({ ...form, batch_no: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.expiry_date}
                        onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Receiving Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="e.g. Received fresh batch from farm transport, quality checked and accepted."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitting}>
                    {submitting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                    <i className="ri-check-line"></i> Confirm & Add Stock
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
