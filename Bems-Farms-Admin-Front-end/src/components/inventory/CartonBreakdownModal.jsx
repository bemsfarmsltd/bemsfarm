import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function CartonBreakdownModal({ isOpen, onClose, onSuccess, initialSourceProduct = null }) {
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [sourceProductId, setSourceProductId] = useState('')
  const [targetProductId, setTargetProductId] = useState('')
  const [cartonsToBreak, setCartonsToBreak] = useState(1)
  const [piecesPerCarton, setPiecesPerCarton] = useState(40)
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes] = useState('Shelf Restock / Carton De-bulking')

  useEffect(() => {
    if (!isOpen) return
    async function loadData() {
      setLoading(true)
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get('/admin/products', { params: { limit: 500 } }),
          api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
        ])
        const prods = prodRes.data?.products || []
        setProducts(prods)
        setWarehouses(whRes.data?.warehouses || [])

        if (initialSourceProduct) {
          setSourceProductId(String(initialSourceProduct.id))
          const nameLower = (initialSourceProduct.name || '').toLowerCase()
          const match = nameLower.match(/(\d+)\s*(pcs|pieces|pack|sachets|units)/i)
          if (match && match[1]) {
            setPiecesPerCarton(parseInt(match[1]) || 40)
          }
        }
      } catch (err) {
        console.error('Failed to load products for carton breakdown:', err)
        toast.error('Failed to load inventory products')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isOpen, initialSourceProduct])

  const sourceProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(sourceProductId)) || null
  }, [products, sourceProductId])

  const targetProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(targetProductId)) || null
  }, [products, targetProductId])

  // Calculation metrics
  const sourceStock = parseInt(sourceProduct?.stock ?? sourceProduct?.stock_quantity ?? 0) || 0
  const targetStock = parseInt(targetProduct?.stock ?? targetProduct?.stock_quantity ?? 0) || 0
  const countToBreak = Math.max(1, parseInt(cartonsToBreak) || 1)
  const multiplier = Math.max(1, parseFloat(piecesPerCarton) || 1)
  const piecesGained = Math.round(countToBreak * multiplier)
  const newSourceStock = Math.max(0, sourceStock - countToBreak)
  const newTargetStock = targetStock + piecesGained

  const isStockInsufficient = sourceStock < countToBreak

  const handleExecuteBreakdown = async (e) => {
    e.preventDefault()
    if (!sourceProductId) return toast.error('Please select a source carton product')
    if (!targetProductId) return toast.error('Please select a target pieces product')
    if (sourceProductId === targetProductId) return toast.error('Source carton and target pieces product must be different')
    if (isStockInsufficient) return toast.error(`Insufficient carton stock (${sourceStock} available)`)

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

      toast.success(res.data?.message || `Successfully unbundled ${countToBreak} carton(s) into ${piecesGained} pieces!`, { duration: 4000 })
      if (onSuccess) onSuccess(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to execute breakdown')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-success text-white py-3 px-4 border-0">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar size-8 bg-white bg-opacity-20 rounded-3 d-flex align-items-center justify-content-center text-white">
                <i className="ri-inbox-unarchive-line fs-4"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white">Carton Breakdown &amp; De-bulking Studio</h5>
                <small className="text-white text-opacity-75">
                  Unbundle bulk cartons into single shelf pieces with real-time stock sync &amp; audit logging
                </small>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={submitting}></button>
          </div>

          <form onSubmit={handleExecuteBreakdown}>
            <div className="modal-body p-4 bg-light">
              {/* Top Workflow Summary */}
              <div className="alert alert-white bg-white border shadow-sm rounded-3 p-3 mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="text-center flex-grow-1">
                    <span className="badge bg-warning-subtle text-dark fs-xs mb-1">Source (Bulk Carton)</span>
                    <div className="fw-bold text-dark fs-sm text-truncate" style={{ maxWidth: 200 }}>
                      {sourceProduct ? sourceProduct.name : 'Select Carton...'}
                    </div>
                    <small className="text-muted">Stock: {sourceStock} cartons</small>
                  </div>

                  <div className="text-center text-muted">
                    <div className="badge bg-success rounded-pill px-3 py-1 shadow-sm">
                      <i className="ri-arrow-right-line me-1"></i>
                      Break {countToBreak}x &times; {multiplier} pcs = +{piecesGained} pcs
                    </div>
                  </div>

                  <div className="text-center flex-grow-1">
                    <span className="badge bg-success-subtle text-success fs-xs mb-1">Target (Shelf Pieces)</span>
                    <div className="fw-bold text-dark fs-sm text-truncate" style={{ maxWidth: 200 }}>
                      {targetProduct ? targetProduct.name : 'Select Single Piece...'}
                    </div>
                    <small className="text-muted">Stock: {targetStock} &rarr; <strong>{newTargetStock} pcs</strong></small>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {/* 1. Source Product Selector */}
                <div className="col-12 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-3 p-3 bg-white">
                    <label className="form-label fw-bold fs-xs text-uppercase text-muted d-flex justify-content-between">
                      <span>1. Select Source Product (Carton)</span>
                      {sourceProduct && (
                        <span className={`fw-bold ${sourceStock > 0 ? 'text-success' : 'text-danger'}`}>
                          {sourceStock} in stock
                        </span>
                      )}
                    </label>
                    <select
                      className="form-select mb-2"
                      value={sourceProductId}
                      onChange={(e) => {
                        setSourceProductId(e.target.value)
                        const picked = products.find((p) => String(p.id) === e.target.value)
                        if (picked) {
                          const m = (picked.name || '').match(/(\d+)\s*(pcs|pieces|pack|sachets|units)/i)
                          if (m && m[1]) setPiecesPerCarton(parseInt(m[1]) || 40)
                        }
                      }}
                      required
                    >
                      <option value="">-- Choose Carton / Bulk Item --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock ?? p.stock_quantity ?? 0} {p.unit || 'cartons'})
                        </option>
                      ))}
                    </select>

                    <label className="form-label fw-semibold fs-xs text-muted mt-2">
                      Number of Cartons to Open / Break Down:
                    </label>
                    <div className="input-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setCartonsToBreak((c) => Math.max(1, parseInt(c || 1) - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="form-control text-center font-monospace fw-bold fs-5"
                        min="1"
                        max={sourceStock || 999}
                        value={cartonsToBreak}
                        onChange={(e) => setCartonsToBreak(Math.max(1, parseInt(e.target.value) || 1))}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setCartonsToBreak((c) => parseInt(c || 1) + 1)}
                      >
                        +
                      </button>
                    </div>
                    {isStockInsufficient && (
                      <small className="text-danger mt-1 d-block">
                        ⚠️ Cannot break {countToBreak} cartons. Only {sourceStock} available.
                      </small>
                    )}
                  </div>
                </div>

                {/* 2. Target Product Selector */}
                <div className="col-12 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-3 p-3 bg-white">
                    <label className="form-label fw-bold fs-xs text-uppercase text-muted d-flex justify-content-between">
                      <span>2. Select Target Product (Single Pieces)</span>
                      {targetProduct && (
                        <span className="text-success fw-bold">{targetStock} in stock</span>
                      )}
                    </label>
                    <select
                      className="form-select mb-2"
                      value={targetProductId}
                      onChange={(e) => setTargetProductId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Single Piece / Unit Item --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current: {p.stock ?? p.stock_quantity ?? 0} {p.unit || 'pcs'})
                        </option>
                      ))}
                    </select>

                    <label className="form-label fw-semibold fs-xs text-muted mt-2">
                      Pieces Inside Each Carton (Multiplier):
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control text-center font-monospace fw-bold fs-5"
                        min="1"
                        value={piecesPerCarton}
                        onChange={(e) => setPiecesPerCarton(Math.max(1, parseFloat(e.target.value) || 1))}
                        required
                      />
                      <span className="input-group-text fs-xs">pieces / carton</span>
                    </div>
                    <div className="d-flex gap-1 mt-1 flex-wrap">
                      <span className="fs-xs text-muted me-1">Presets:</span>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill" onClick={() => setPiecesPerCarton(40)}>40 pcs</button>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill" onClick={() => setPiecesPerCarton(30)}>30 pcs (Crate)</button>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill" onClick={() => setPiecesPerCarton(24)}>24 pcs</button>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill" onClick={() => setPiecesPerCarton(12)}>12 pcs (Dozen)</button>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill" onClick={() => setPiecesPerCarton(10)}>10 pcs</button>
                    </div>
                  </div>
                </div>

                {/* 3. Location & Reason */}
                <div className="col-12">
                  <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                    <div className="row g-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold fs-xs text-muted">Warehouse / Store Location</label>
                        <select
                          className="form-select form-select-sm"
                          value={warehouseId}
                          onChange={(e) => setWarehouseId(e.target.value)}
                        >
                          <option value="">Main Store / Default Warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-8">
                        <label className="form-label fw-semibold fs-xs text-muted">Audit Note / Reason</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Unboxing for supermarket shelf display"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer bg-white border-0 py-3 px-4 d-flex justify-content-between">
              <button type="button" className="btn btn-light" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success px-4 shadow-sm"
                disabled={submitting || isStockInsufficient || !sourceProductId || !targetProductId}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Executing Breakdown…
                  </>
                ) : (
                  <>
                    <i className="ri-check-double-line me-1"></i>
                    Confirm Breakdown &rarr; +{piecesGained} Pieces
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
