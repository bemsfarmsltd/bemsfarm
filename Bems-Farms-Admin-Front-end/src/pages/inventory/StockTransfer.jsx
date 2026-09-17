import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

export default function StockTransfer() {
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
    product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 1, notes: '',
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
        console.error('Error loading metadata for Stock Transfer:', err)
      }
    }
    loadMeta()
  }, [])

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      // Only the "out" leg of each transfer, so each real transfer shows as one row
      const res = await api.get('/admin/inventory/movements', {
        params: { type: 'transfer_out', page, limit: 15, search: search.trim() || undefined },
      })
      if (res.data) {
        setMovements(res.data.movements || [])
        setTotal(res.data.total || 0)
        setTotalPages(res.data.pages || 1)
      }
    } catch (err) {
      toast.error('Failed to load transfer history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id))

  function openAdd() {
    setForm({
      product_id: products[0]?.id ? String(products[0].id) : '',
      from_warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
      to_warehouse_id: warehouses[1]?.id ? String(warehouses[1].id) : '',
      quantity: 1, notes: '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product_id) return toast.error('Please select a product')
    if (!form.from_warehouse_id || !form.to_warehouse_id) return toast.error('Select both source and destination warehouses')
    if (form.from_warehouse_id === form.to_warehouse_id) return toast.error('Source and destination warehouses must be different')
    const qty = parseInt(form.quantity)
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity greater than 0')
    if (selectedProduct && qty > selectedProduct.stock) {
      return toast.error(`Only ${selectedProduct.stock} units of ${selectedProduct.name} in stock`)
    }

    setSubmitting(true)
    try {
      await api.post('/admin/inventory/transfer', {
        product_id: parseInt(form.product_id),
        from_warehouse_id: parseInt(form.from_warehouse_id),
        to_warehouse_id: parseInt(form.to_warehouse_id),
        quantity: qty,
        notes: form.notes?.trim() || undefined,
      })
      toast.success('Transfer completed successfully')
      setModalOpen(false)
      fetchMovements()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transfer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Stock Transfer</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
            <li className="breadcrumb-item active">Stock Transfer</li>
          </ul>
        </div>
        <button type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={openAdd}>
          <i className="ri-swap-box-line"></i> + New Transfer
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box" style={{ minWidth: 260 }}>
              <div className="position-relative">
                <input
                  type="text" className="form-control form-control-sm ps-4"
                  placeholder="Search reference, product, warehouse…"
                  value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total transfers recorded: <strong>{total}</strong></span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Reference</th>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>From Warehouse</th>
                  <th className="text-end">Qty</th>
                  <th>Notes</th>
                  <th>Transferred By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading transfer records…</span>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="ri-swap-box-line fs-32 text-secondary mb-2 d-block"></i>
                      No transfers found. Click <strong>"+ New Transfer"</strong> to move stock between warehouses.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td><span className="fw-medium text-primary">{m.reference || `TRF-${m.id}`}</span></td>
                      <td className="text-muted fs-13">
                        {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="fw-semibold text-dark">{m.product_name || 'Product'}</td>
                      <td><code className="text-muted">{m.sku || '—'}</code></td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="ri-store-2-line me-1"></i>{m.warehouse_name || '—'}
                        </span>
                      </td>
                      <td className="text-end fw-medium">{m.quantity}</td>
                      <td style={{ maxWidth: 200, whiteSpace: 'normal', fontSize: 12, color: '#6c757d' }}>{m.notes || '—'}</td>
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
                  <i className="ri-swap-box-line me-2 text-primary"></i>New Stock Transfer
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Select Product <span className="text-danger">*</span></label>
                      <ProductSelect
                        products={products}
                        value={form.product_id}
                        onChange={(selectedId) => setForm({ ...form, product_id: selectedId })}
                        placeholder="Type name, scan barcode, or select..."
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Quantity <span className="text-danger">*</span></label>
                      <input type="number" className="form-control" min="1" max={selectedProduct?.stock || undefined}
                        value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                      {selectedProduct && <div className="form-text">Available: {selectedProduct.stock}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">From Warehouse <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.from_warehouse_id}
                        onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })}>
                        <option value="">— Select —</option>
                        {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">To Warehouse <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.to_warehouse_id}
                        onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })}>
                        <option value="">— Select —</option>
                        {warehouses.filter((w) => String(w.id) !== String(form.from_warehouse_id)).map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Notes</label>
                      <textarea className="form-control" rows="2" value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional transfer notes…" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitting}>
                    {submitting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                    <i className="ri-check-line"></i> Complete Transfer
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
