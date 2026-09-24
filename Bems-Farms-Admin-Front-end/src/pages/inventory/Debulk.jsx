import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

export default function Debulk() {
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)

  // Form State
  const [sourceProductId, setSourceProductId] = useState('')
  const [targetProductId, setTargetProductId] = useState('')
  const [cartonsToBreak, setCartonsToBreak] = useState(1)
  const [piecesPerCarton, setPiecesPerCarton] = useState(40)
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes] = useState('Shelf Restock / Carton De-bulking')

  // Load products and warehouses
  const loadMetadata = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, whRes] = await Promise.all([
        api.get('/admin/products', { params: { limit: 500 } }),
        api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
      ])
      setProducts(prodRes.data?.products || [])
      setWarehouses(whRes.data?.warehouses || [])
    } catch (err) {
      console.error('Failed to load products for debulking:', err)
      toast.error('Failed to load product catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load debulk history movements
  const fetchHistory = useCallback(async () => {
    setLoadingMovements(true)
    try {
      const res = await api.get('/admin/inventory/movements', {
        params: { type: 'debulk_out', limit: 20 },
      })
      setMovements(res.data?.movements || [])
    } catch (err) {
      console.error('Failed to load debulk history:', err)
    } finally {
      setLoadingMovements(false)
    }
  }, [])

  useEffect(() => {
    loadMetadata()
    fetchHistory()
  }, [loadMetadata, fetchHistory])

  // Selected Products
  const sourceProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(sourceProductId)) || null
  }, [products, sourceProductId])

  const targetProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(targetProductId)) || null
  }, [products, targetProductId])

  // Auto-detect pieces multiplier from source product name if available
  useEffect(() => {
    if (sourceProduct) {
      const nameLower = (sourceProduct.name || '').toLowerCase()
      const match = nameLower.match(/(\d+)\s*(pcs|pieces|pack|sachets|units|eggs|bottles|tins)/i)
      if (match && match[1]) {
        const detected = parseInt(match[1])
        if (detected > 0) setPiecesPerCarton(detected)
      }
    }
  }, [sourceProduct])

  // Conversion calculations
  const sourceStock = parseInt(sourceProduct?.stock ?? sourceProduct?.stock_quantity ?? 0) || 0
  const targetStock = parseInt(targetProduct?.stock ?? targetProduct?.stock_quantity ?? 0) || 0
  const countToBreak = Math.max(1, parseInt(cartonsToBreak) || 1)
  const multiplier = Math.max(1, parseFloat(piecesPerCarton) || 1)
  const piecesGained = Math.round(countToBreak * multiplier)
  const newSourceStock = Math.max(0, sourceStock - countToBreak)
  const newTargetStock = targetStock + piecesGained
  const isStockInsufficient = sourceStock < countToBreak

  // Summary Metrics
  const totalCartonsDebulked = useMemo(() => {
    return movements.reduce((acc, m) => acc + (parseInt(m.quantity) || 0), 0)
  }, [movements])

  // Execute Debulking
  const handleExecuteBreakdown = async (e) => {
    e.preventDefault()
    if (!sourceProductId) return toast.error('Please select a source carton product')
    if (!targetProductId) return toast.error('Please select a target pieces product')
    if (sourceProductId === targetProductId) {
      return toast.error('Source carton and target pieces product must be different products')
    }
    if (isStockInsufficient) {
      return toast.error(`Insufficient carton stock. Only ${sourceStock} available in inventory.`)
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/debulk', {
        source_product_id: parseInt(sourceProductId),
        target_product_id: parseInt(targetProductId),
        cartons_to_break: countToBreak,
        pieces_per_carton: multiplier,
        warehouse_id: warehouseId ? parseInt(warehouseId) : null,
        notes: notes.trim(),
      })

      toast.success(res.data?.message || `Successfully unbundled ${countToBreak} carton(s) into ${piecesGained} pieces!`, { duration: 5000 })
      
      // Refresh catalog stock counts & history
      await Promise.all([loadMetadata(), fetchHistory()])
      
      // Reset carton quantity
      setCartonsToBreak(1)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to execute debulking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 shadow-xs"
              style={{ width: 38, height: 38, background: '#FEF3C7', color: '#B45309' }}
            >
              <i className="ri-inbox-unarchive-line fs-20"></i>
            </span>
            Debulk &amp; Unbundle Inventory
          </h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 fs-13">
              <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link to="/products">Inventory</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Debulk &amp; Unbundle</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-xs"
            onClick={() => { loadMetadata(); fetchHistory() }}
            disabled={loading || loadingMovements}
          >
            <i className={`ri-refresh-line ${loading || loadingMovements ? 'ri-spin' : ''}`} /> Refresh Catalog
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fs-13 fw-medium">Debulking Actions</span>
              <span className="badge bg-warning-subtle text-warning rounded-circle p-2">
                <i className="ri-history-line fs-16"></i>
              </span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{movements.length}</h3>
            <span className="text-muted fs-12 mt-1">Logged breakdown operations</span>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fs-13 fw-medium">Cartons Unbundled</span>
              <span className="badge bg-danger-subtle text-danger rounded-circle p-2">
                <i className="ri-archive-line fs-16"></i>
              </span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{totalCartonsDebulked}</h3>
            <span className="text-muted fs-12 mt-1">Total cartons broken down</span>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fs-13 fw-medium">Conversion Mode</span>
              <span className="badge bg-success-subtle text-success rounded-circle p-2">
                <i className="ri-repeat-2-line fs-16"></i>
              </span>
            </div>
            <h3 className="fw-bold mb-0 text-success">Perpetual</h3>
            <span className="text-muted fs-12 mt-1">Instant 1-to-N stock conversion</span>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-xs rounded-3 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fs-13 fw-medium">Audit Compliance</span>
              <span className="badge bg-primary-subtle text-primary rounded-circle p-2">
                <i className="ri-shield-check-line fs-16"></i>
              </span>
            </div>
            <h3 className="fw-bold mb-0 text-primary">Enforced</h3>
            <span className="text-muted fs-12 mt-1">Double-entry stock_movements</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Preview / History */}
      <div className="row g-4">
        {/* Left Form: Unbundling Studio */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-xs rounded-3 bg-white h-100">
            <div className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <i className="ri-tools-line text-warning fs-18"></i>
                Unbundle / Debulk Configuration
              </h6>
              <span className="badge bg-warning-subtle text-warning fw-semibold px-2 py-1">
                Carton &rarr; Loose Pieces
              </span>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleExecuteBreakdown}>
                {/* 1. Source Carton Product */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0 text-dark">
                      1. Source Carton Product <span className="text-danger">*</span>
                    </label>
                    {sourceProduct && (
                      <span className={`badge ${sourceStock > 0 ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'}`}>
                        In Stock: <strong>{sourceStock}</strong> cartons
                      </span>
                    )}
                  </div>
                  <ProductSelect
                    products={products}
                    value={sourceProductId}
                    onChange={(val) => setSourceProductId(val)}
                    placeholder="Search carton product (e.g. Eggs 30-Pack, Crate)..."
                    required
                  />
                  <div className="form-text text-muted fs-11">
                    Select the wholesale package, carton, crate, or bundle to unpack.
                  </div>
                </div>

                {/* 2. Target Pieces Product */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0 text-dark">
                      2. Target Retail (Pieces) Product <span className="text-danger">*</span>
                    </label>
                    {targetProduct && (
                      <span className="badge bg-success-subtle text-success">
                        In Stock: <strong>{targetStock}</strong> pieces
                      </span>
                    )}
                  </div>
                  <ProductSelect
                    products={products}
                    value={targetProductId}
                    onChange={(val) => setTargetProductId(val)}
                    placeholder="Search retail unit product (e.g. Single Egg, 1 Piece)..."
                    required
                  />
                  <div className="form-text text-muted fs-11">
                    Select the single retail item that will receive the loose units.
                  </div>
                </div>

                {/* Multiplier and Quantities */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold text-dark fs-13 mb-1">
                      Cartons to Unpack <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${isStockInsufficient && sourceProductId ? 'is-invalid' : ''}`}
                      min="1"
                      max={sourceStock > 0 ? sourceStock : 9999}
                      value={cartonsToBreak}
                      onChange={(e) => setCartonsToBreak(e.target.value)}
                      required
                    />
                    {isStockInsufficient && sourceProductId && (
                      <div className="invalid-feedback fs-11">
                        Exceeds current stock ({sourceStock} available)
                      </div>
                    )}
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold text-dark fs-13 mb-1">
                      Pieces Per Carton <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      step="any"
                      value={piecesPerCarton}
                      onChange={(e) => setPiecesPerCarton(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Warehouse & Notes */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark fs-13 mb-1">Warehouse Location (Optional)</label>
                  <select
                    className="form-select form-select-sm"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                  >
                    <option value="">Default Farm Store / Main Floor</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark fs-13 mb-1">Audit Notes / Reason</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Broken down for front display retail shelf"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Conversion Preview Box */}
                <div
                  className="rounded-3 p-3 mb-4"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-2">Live Conversion Summary</div>
                  <div className="d-flex align-items-center justify-content-between text-center gap-2">
                    <div className="p-2 rounded bg-white flex-grow-1 border">
                      <div className="text-danger fw-bold fs-16">-{countToBreak}</div>
                      <div className="text-muted fs-11 text-truncate" style={{ maxWidth: 120 }}>
                        {sourceProduct?.name || 'Cartons'}
                      </div>
                      <div className="text-muted fs-10 mt-1">({sourceStock} &rarr; {newSourceStock})</div>
                    </div>

                    <div className="flex-shrink-0 text-warning px-1">
                      <i className="ri-arrow-right-line fs-20" />
                    </div>

                    <div className="p-2 rounded bg-white flex-grow-1 border">
                      <div className="text-success fw-bold fs-16">+{piecesGained}</div>
                      <div className="text-muted fs-11 text-truncate" style={{ maxWidth: 120 }}>
                        {targetProduct?.name || 'Retail Pieces'}
                      </div>
                      <div className="text-muted fs-10 mt-1">({targetStock} &rarr; {newTargetStock})</div>
                    </div>
                  </div>
                </div>

                {/* Execute Button */}
                <button
                  type="submit"
                  disabled={submitting || !sourceProductId || !targetProductId || isStockInsufficient}
                  className="btn btn-warning w-100 py-2 fw-bold text-dark shadow-sm d-flex align-items-center justify-content-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Executing Breakdown...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-double-line fs-18"></i>
                      Execute Debulking ({countToBreak} Ctn &rarr; {piecesGained} Pcs)
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Debulk History & Documentation */}
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-xs rounded-3 bg-white h-100">
            <div className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <i className="ri-file-list-3-line text-primary fs-18"></i>
                Debulking Audit Ledger
              </h6>
              <span className="badge bg-light text-muted border">
                {movements.length} Records
              </span>
            </div>
            <div className="card-body p-0">
              {loadingMovements ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
                  <div className="fs-13">Loading debulking movements...</div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-5 text-muted px-4">
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 54, height: 54, background: '#FEF3C7', color: '#B45309' }}
                  >
                    <i className="ri-inbox-unarchive-line fs-24" />
                  </div>
                  <h6 className="fw-bold text-dark mb-1">No Debulking Records Yet</h6>
                  <p className="fs-12 text-muted mb-0">
                    Use the configuration studio on the left to unbundle cartons into retail pieces. All conversions will be logged here in real-time.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 fs-13">
                    <thead className="table-light fs-12 text-uppercase text-muted">
                      <tr>
                        <th className="ps-3 py-3">Date / Time</th>
                        <th>Reference</th>
                        <th>Source Product</th>
                        <th className="text-center">Unpacked</th>
                        <th>Target / Conversion Details</th>
                        <th className="text-end pe-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id}>
                          <td className="ps-3 text-nowrap text-muted fs-12">
                            {new Date(m.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="fw-semibold text-dark text-nowrap">
                            <span className="badge bg-light text-dark border">
                              {m.reference || `DEBULK-${m.id}`}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{m.product_name}</div>
                            {m.sku && <div className="text-muted fs-11">SKU: {m.sku}</div>}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-danger-subtle text-danger fw-bold">
                              -{m.quantity} {m.unit || 'ctn'}
                            </span>
                          </td>
                          <td>
                            <div className="text-dark fs-12">
                              {m.notes || 'Unbundled into retail units'}
                            </div>
                            <div className="text-muted fs-11">
                              Stock: {m.before_qty ?? '-'} &rarr; {m.after_qty ?? '-'}
                            </div>
                          </td>
                          <td className="text-end pe-3 text-nowrap text-muted fs-12">
                            {m.user_name || 'Staff'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
