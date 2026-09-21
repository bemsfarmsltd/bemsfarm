import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import PremiumModal from '../../components/ui/PremiumModal'
import CartonBreakdownModal from '../../components/inventory/CartonBreakdownModal'
import ProductSelect from '../../components/ui/ProductSelect'

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

  // Quick scan on page header
  const [quickScanQuery, setQuickScanQuery] = useState('')

  // Adjustment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const searchScanInputRef = useRef(null)
  const countInputRef = useRef(null)
  const dropdownRef = useRef(null)

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
          api.get('/admin/products', { params: { limit: 500 } }),
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const selectedProduct = useMemo(() => {
    if (!form.product_id) return null
    return products.find((p) => String(p.id) === String(form.product_id)) || null
  }, [products, form.product_id])

  const filteredModalProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products.slice(0, 35)
    return products
      .filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(q)
        const skuMatch = p.sku?.toLowerCase().includes(q)
        const barcodeMatch = p.barcode?.toLowerCase().includes(q)
        return nameMatch || skuMatch || barcodeMatch
      })
      .slice(0, 40)
  }, [products, productSearch])

  function selectProduct(prod) {
    if (!prod) {
      setForm((prev) => ({
        ...prev,
        product_id: '',
        current_qty: 0,
        new_quantity: '0',
      }))
      return
    }
    const currentStock = prod.stock !== undefined ? prod.stock : 0
    setForm((prev) => ({
      ...prev,
      product_id: String(prod.id),
      current_qty: currentStock,
      new_quantity: String(currentStock),
    }))
    setProductSearch('')
    setShowDropdown(false)
    setTimeout(() => {
      countInputRef.current?.focus()
      countInputRef.current?.select()
    }, 120)
  }

  function handleScanOrSearchKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = productSearch.trim().toLowerCase()
      if (!query) return

      // 1. Exact barcode match
      let match = products.find((p) => p.barcode?.toLowerCase() === query)
      // 2. Exact SKU match
      if (!match) {
        match = products.find((p) => p.sku?.toLowerCase() === query)
      }
      // 3. Exact ID match
      if (!match) {
        match = products.find((p) => String(p.id) === query)
      }
      // 4. First filtered item
      if (!match && filteredModalProducts.length > 0) {
        match = filteredModalProducts[0]
      }

      if (match) {
        selectProduct(match)
        toast.success(`Scanned & selected: "${match.name}"`)
      } else {
        toast.error(`No product found for code/query "${productSearch}"`)
      }
    }
  }

  function handleQuickPageScan(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = quickScanQuery.trim().toLowerCase()
      if (!query) return

      let match = products.find(
        (p) =>
          p.barcode?.toLowerCase() === query ||
          p.sku?.toLowerCase() === query ||
          p.name?.toLowerCase().includes(query)
      )

      if (match) {
        openAdjustmentModal(match)
        setQuickScanQuery('')
        toast.success(`Scanned: "${match.name}"`)
      } else {
        toast.error(`No product found for "${quickScanQuery}"`)
      }
    }
  }

  function openAdjustmentModal(initialProduct = null) {
    const prod = (initialProduct && initialProduct.id) ? initialProduct : null
    setForm({
      product_id: prod?.id ? String(prod.id) : '',
      warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
      current_qty: prod?.stock !== undefined ? prod.stock : 0,
      new_quantity: prod?.stock !== undefined ? String(prod.stock) : '0',
      reason: REASONS[0],
      notes: '',
    })
    setProductSearch('')
    setShowDropdown(false)
    setModalOpen(true)

    setTimeout(() => {
      if (prod?.id) {
        countInputRef.current?.focus()
        countInputRef.current?.select()
      }
    }, 150)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product_id) {
      return toast.error('Please select or scan a product')
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
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="input-group input-group-sm" style={{ width: '280px' }}>
            <span className="input-group-text bg-white text-muted">
              <i className="ri-barcode-line text-success"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Quick scan barcode to adjust…"
              value={quickScanQuery}
              onChange={(e) => setQuickScanQuery(e.target.value)}
              onKeyDown={handleQuickPageScan}
            />
            {quickScanQuery && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setQuickScanQuery('')}
              >
                &times;
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1 shadow-sm text-dark fw-medium"
            onClick={() => setBreakdownModalOpen(true)}>
            <i className="ri-inbox-unarchive-line text-warning"></i> Carton Breakdown / De-bulk
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => openAdjustmentModal()}>
            <i className="ri-scales-3-line"></i> + Create Stock Adjustment
          </button>
        </div>
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

      <PremiumModal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="New stock adjustment"
        description="Reconcile recorded inventory with a verified physical count. Every change is added to the audit trail."
        icon="ri-scales-3-line"
        tone={delta < 0 ? 'danger' : 'brand'}
        closeOnBackdrop={!submitting}
        footer={(
          <>
            <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" form="stock-adjustment-form" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitting}>
              {submitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
              <i className="ri-check-line" aria-hidden="true"></i> Apply adjustment
            </button>
          </>
        )}>
        <form id="stock-adjustment-form" onSubmit={handleSubmit}>
          {/* Product Search & Barcode Scan Section */}
          <div className="mb-3">
            <label className="form-label fw-semibold mb-1">
              Select / Scan Product <span className="text-danger">*</span>
            </label>
            <ProductSelect
              products={products}
              value={form.product_id}
              onChange={(selectedId, prod) => selectProduct(prod)}
              placeholder="Search product name, SKU, or scan barcode..."
              required
            />
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
                ref={countInputRef}
                type="number"
                className="form-control fw-bold"
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
        </form>
      </PremiumModal>

      {/* Carton Breakdown / De-bulking Studio Modal */}
      <CartonBreakdownModal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        onSuccess={fetchMovements}
      />
    </div>
  )
}
