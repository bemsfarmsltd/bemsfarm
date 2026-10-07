import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

// Generic stop-words to ignore during title keyword matching
const STOP_WORDS = new Set([
  'pack', 'packs', 'carton', 'cartons', 'piece', 'pieces', 'crate', 'crates',
  'bag', 'bags', 'unit', 'units', 'box', 'boxes', 'pcs', 'kg', 'g', 'ml', 'l',
  'litre', 'litres', 'and', 'the', 'for', 'with', 'bems', 'farms', 'fresh'
])

function extractKeywords(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
}

export default function Debulk() {
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [activeTab, setActiveTab] = useState('studio') // 'studio' | 'ledger'
  const [historySearch, setHistorySearch] = useState('')

  // Form State
  const [sourceProductId, setSourceProductId] = useState('')
  const [targetProductId, setTargetProductId] = useState('')
  const [cartonsToBreak, setCartonsToBreak] = useState(1)
  const [piecesPerCarton, setPiecesPerCarton] = useState(40)
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes] = useState('')
  
  // Barcode quick scan state
  const [barcodeScanInput, setBarcodeScanInput] = useState('')
  const [targetFilterMode, setTargetFilterMode] = useState('recommended') // 'recommended' | 'all'

  // Safety confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [mismatchOverrideChecked, setMismatchOverrideChecked] = useState(false)

  // Load products & warehouses
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
        params: { type: 'debulk_out', limit: 50 },
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

  // Smart Detection & Safeguard Engine
  const compatibility = useMemo(() => {
    if (!sourceProduct || !targetProduct) {
      return { status: 'idle', message: 'Select both source and target products to analyze compatibility' }
    }

    if (String(sourceProduct.id) === String(targetProduct.id)) {
      return {
        status: 'error',
        severity: 'danger',
        isFatal: true,
        title: 'Identical Product Selected',
        message: 'Source carton and target pieces cannot be the exact same product.',
      }
    }

    const sameCategory =
      sourceProduct.category_id &&
      targetProduct.category_id &&
      String(sourceProduct.category_id) === String(targetProduct.category_id)

    const sKeywords = extractKeywords(sourceProduct.name)
    const tKeywords = extractKeywords(targetProduct.name)
    const sharedWords = sKeywords.filter((w) => tKeywords.includes(w))

    const categoryLabelSource = sourceProduct.category || sourceProduct.category_name || 'Category A'
    const categoryLabelTarget = targetProduct.category || targetProduct.category_name || 'Category B'

    // High confidence: Same category and shared core keyword
    if (sameCategory && sharedWords.length > 0) {
      return {
        status: 'perfect',
        severity: 'success',
        isFatal: false,
        title: 'Verified Item Match',
        message: `Both items belong to "${categoryLabelSource}" and match product keyword "${sharedWords.join(', ')}". High confidence match!`,
      }
    }

    // Moderate: Same category but different name stems
    if (sameCategory) {
      return {
        status: 'moderate',
        severity: 'info',
        isFatal: false,
        title: 'Category Matched (Check Titles)',
        message: `Both items belong to "${categoryLabelSource}", but titles differ ("${sourceProduct.name}" vs "${targetProduct.name}").`,
      }
    }

    // Critical Mismatch: Different Categories & Different Names (like Garri into Beans)
    return {
      status: 'mismatch',
      severity: 'warning',
      isFatal: false,
      title: 'Item & Category Mismatch Warning',
      message: `Warning: Source "${sourceProduct.name}" (${categoryLabelSource}) and Target "${targetProduct.name}" (${categoryLabelTarget}) are completely different items across different categories!`,
    }
  }, [sourceProduct, targetProduct])

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

  // Smart Recommended Target Products
  const recommendedTargetProducts = useMemo(() => {
    if (!sourceProduct) return products

    const sourceCatId = String(sourceProduct.category_id || '')
    const sKeywords = extractKeywords(sourceProduct.name)

    const matches = products.filter((p) => {
      if (String(p.id) === String(sourceProduct.id)) return false
      const sameCat = sourceCatId && String(p.category_id) === sourceCatId
      const pKeywords = extractKeywords(p.name)
      const hasSharedWord = sKeywords.some((w) => pKeywords.includes(w))
      return sameCat || hasSharedWord
    })

    return matches.length > 0 ? matches : products
  }, [products, sourceProduct])

  // Active product list presented to Target ProductSelect
  const targetProductsList = targetFilterMode === 'recommended' && sourceProduct ? recommendedTargetProducts : products

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

  // Barcode Scanner Handler
  const handleBarcodeScanSubmit = (e) => {
    e.preventDefault()
    const query = barcodeScanInput.trim().toLowerCase()
    if (!query) return

    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === query ||
        p.carton_barcode?.toLowerCase() === query ||
        p.sku?.toLowerCase() === query ||
        String(p.id) === query
    )

    if (matched) {
      if (!sourceProductId) {
        setSourceProductId(String(matched.id))
        toast.success(`Source carton selected: "${matched.name}"`)
      } else {
        setTargetProductId(String(matched.id))
        toast.success(`Target piece selected: "${matched.name}"`)
      }
      setBarcodeScanInput('')
    } else {
      toast.error(`No product found for barcode/SKU "${barcodeScanInput}"`)
    }
  }

  // Pre-flight check before opening confirmation modal
  const handleRequestExecution = (e) => {
    e.preventDefault()
    if (!sourceProductId) return toast.error('Please select a source carton product')
    if (!targetProductId) return toast.error('Please select a target retail pieces product')
    if (sourceProductId === targetProductId) {
      return toast.error('Source carton and target pieces product must be different products')
    }
    if (isStockInsufficient) {
      return toast.error(`Insufficient carton stock. Only ${sourceStock} available in inventory.`)
    }

    setMismatchOverrideChecked(false)
    setConfirmModalOpen(true)
  }

  // Final Execution
  const handleConfirmAndExecute = async () => {
    if (compatibility.status === 'mismatch' && !mismatchOverrideChecked) {
      return toast.error('Please check the confirmation box to verify this cross-category conversion.')
    }

    setSubmitting(true)
    try {
      const res = await api.post('/admin/inventory/debulk', {
        source_product_id: parseInt(sourceProductId),
        target_product_id: parseInt(targetProductId),
        cartons_to_break: countToBreak,
        pieces_per_carton: multiplier,
        warehouse_id: warehouseId ? parseInt(warehouseId) : null,
        notes: notes.trim() || 'Warehouse Debulk / Shelf Restock',
      })

      toast.success(
        res.data?.message || `Successfully unbundled ${countToBreak} carton(s) into ${piecesGained} pieces!`,
        { duration: 5000 }
      )

      setConfirmModalOpen(false)

      // Refresh catalog stock counts & history
      await Promise.all([loadMetadata(), fetchHistory()])

      // Reset quantities
      setCartonsToBreak(1)
      setNotes('')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to execute debulking')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return movements
    const q = historySearch.toLowerCase()
    return movements.filter(
      (m) =>
        m.product_name?.toLowerCase().includes(q) ||
        m.reference?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q) ||
        m.user_name?.toLowerCase().includes(q)
    )
  }, [movements, historySearch])

  return (
    <div className="container-fluid">
      {/* ── STANDARD BEMS FARMS PAGE HEADING (NO DARK BANNER) ── */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="ri-inbox-unarchive-line text-success fs-18"></i>
            Debulk &amp; Unbundle Inventory
          </h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Inventory</Link></li>
            <li className="breadcrumb-item active">Debulk &amp; Unbundle</li>
          </ul>
        </div>

        {/* Header Action Buttons (Matching other pages) */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${activeTab === 'studio' ? 'btn-success text-white fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('studio')}
            >
              <i className="ri-lock-2-line me-1"></i> Status &amp; Overview
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'ledger' ? 'btn-success text-white fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('ledger')}
            >
              <i className="ri-file-list-3-line me-1"></i> Audit Ledger ({movements.length})
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => { loadMetadata(); fetchHistory() }}
            disabled={loading || loadingMovements}
            title="Refresh Product Stock"
          >
            <i className={`ri-refresh-line ${loading || loadingMovements ? 'ri-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI METRICS STRIP (GREEN THEMED) ── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 h-100 bg-white rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Total Operations</div>
                <h4 className="fw-bold mb-0 text-dark mt-1">{movements.length}</h4>
              </div>
              <div className="rounded-3 p-2 bg-success-subtle text-success">
                <i className="ri-history-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Breakdowns logged</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 h-100 bg-white rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Cartons Unpacked</div>
                <h4 className="fw-bold mb-0 text-danger mt-1">-{totalCartonsDebulked}</h4>
              </div>
              <div className="rounded-3 p-2 bg-danger-subtle text-danger">
                <i className="ri-archive-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Deducted from bulk storage</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 h-100 bg-white rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Mismatch Guard</div>
                <h4 className="fw-bold mb-0 text-success mt-1">Active</h4>
              </div>
              <div className="rounded-3 p-2 bg-success-subtle text-success">
                <i className="ri-shield-check-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Item category verified</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 h-100 bg-white rounded-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">POS Sync</div>
                <h4 className="fw-bold mb-0 text-success mt-1">Real-Time</h4>
              </div>
              <div className="rounded-3 p-2 bg-success-subtle text-success">
                <i className="ri-wireless-charging-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Available for retail sale</div>
          </div>
        </div>
      </div>

      {/* ── TAB 1: CONVERSION STUDIO (LOCKED & AUTOMATED) ── */}
      {activeTab === 'studio' && (
        <div className="card shadow-sm border-0 rounded-4 bg-white p-4 p-md-5 mb-4 text-center">
          <div
            className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 84, height: 84, background: '#fef3c7', color: '#d97706' }}
          >
            <i className="ri-lock-2-line" style={{ fontSize: 40 }}></i>
          </div>

          <div
            className="d-inline-flex align-items-center gap-1.5 badge px-3 py-1.5 rounded-pill fs-12 fw-bold mx-auto mb-3"
            style={{ background: '#fef3c7', color: '#92400e' }}
          >
            <i className="ri-shield-keyhole-line"></i> Feature Locked &amp; Automated
          </div>

          <h4 className="fw-bold text-dark mb-2">Manual Debulking is Locked</h4>

          <p className="text-muted fs-14 mx-auto mb-4" style={{ maxWidth: 660, lineHeight: 1.6 }}>
            Bems Farms runs on <strong>Automated Single-Row Stock Architecture</strong>. Every product stores both carton and piece pricing, barcodes, and pack quantities under one unified record. Whenever full cartons or loose pieces are scanned at the POS counter or sold via customer invoices, inventory balances deduct from the central stock pool in real-time.
          </p>

          <div className="row g-3 justify-content-center mb-4 text-start" style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <div className="fw-bold text-dark fs-13 mb-1 d-flex align-items-center gap-1.5">
                  <i className="ri-checkbox-circle-fill text-success fs-16"></i> Real-Time POS Sync
                </div>
                <div className="text-muted fs-12">
                  Loose pieces and cartons sold at checkout draw from unified stock automatically.
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <div className="fw-bold text-dark fs-13 mb-1 d-flex align-items-center gap-1.5">
                  <i className="ri-checkbox-circle-fill text-success fs-16"></i> Precise Valuation
                </div>
                <div className="text-muted fs-12">
                  Unit costs, retail values, and profit margins reconcile seamlessly without manual entries.
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <div className="fw-bold text-dark fs-13 mb-1 d-flex align-items-center gap-1.5">
                  <i className="ri-checkbox-circle-fill text-success fs-16"></i> Zero Discrepancies
                </div>
                <div className="text-muted fs-12">
                  Locks prevent duplicate row creation and human errors from manual breakdowns.
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <Link to="/inventory/valuation" className="btn btn-success fw-bold px-4 py-2 shadow-sm d-flex align-items-center gap-1.5">
              <i className="ri-funds-line"></i> View Stock Valuation
            </Link>
            <Link to="/products" className="btn btn-outline-secondary fw-semibold px-4 py-2 d-flex align-items-center gap-1.5">
              <i className="ri-shopping-bag-3-line"></i> Products Catalog
            </Link>
            <Link to="/inventory/stock-in" className="btn btn-outline-secondary fw-semibold px-4 py-2 d-flex align-items-center gap-1.5">
              <i className="ri-inbox-archive-line"></i> Restock Products
            </Link>
          </div>
        </div>
      )}

      {/* ── TAB 2: AUDIT LEDGER (FULL SCREEN HISTORY) ── */}
      {activeTab === 'ledger' && (
        <div className="card shadow-sm border-0 rounded-3 bg-white mb-4">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div className="search-box" style={{ minWidth: 260 }}>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm ps-4"
                    placeholder="Filter by product, reference, notes..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                  <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
                </div>
              </div>

              <span className="text-muted fs-13">
                Total operations recorded: <strong>{filteredHistory.length}</strong>
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 fs-13">
                <thead className="table-light fs-12 text-uppercase text-muted">
                  <tr>
                    <th className="ps-3 py-3">Date / Time</th>
                    <th>Reference</th>
                    <th>Source Bulk Product</th>
                    <th className="text-center">Cartons Opened</th>
                    <th>Conversion Notes &amp; Balance</th>
                    <th className="text-end pe-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovements ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                        <span>Loading historical movements...</span>
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <i className="ri-inbox-unarchive-line fs-32 text-secondary mb-2 d-block"></i>
                        No debulking records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((m) => (
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
                          <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1">
                            -{m.quantity} {m.unit || 'ctn'}
                          </span>
                        </td>
                        <td>
                          <div className="text-dark fs-12">
                            {m.notes || 'Unbundled into retail units'}
                          </div>
                          <div className="text-muted fs-11">
                            Carton Stock: {m.before_qty ?? '-'} &rarr; {m.after_qty ?? '-'}
                          </div>
                        </td>
                        <td className="text-end pe-3 text-nowrap text-muted fs-12">
                          <span className="badge bg-secondary-subtle text-secondary">
                            {m.user_name || 'Staff Operator'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SAFETY PRE-FLIGHT VERIFICATION MODAL ── */}
      {confirmModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content border-0 shadow rounded-3 overflow-hidden">
              <div className="modal-header border-bottom py-3 px-4 bg-light">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle p-2 bg-success-subtle text-success">
                    <i className="ri-shield-check-line fs-18"></i>
                  </span>
                  <div>
                    <h6 className="modal-title fw-bold text-dark mb-0">Confirm Debulking Operation</h6>
                    <div className="text-muted fs-11">Double-check items before updating stock</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={submitting}
                />
              </div>

              <div className="modal-body p-4">
                {/* Visual Matching Compare Card */}
                <div className="card border p-3 rounded-3 mb-3 bg-light">
                  <div className="row g-2 align-items-center">
                    <div className="col-5">
                      <div className="text-muted fs-11 text-uppercase fw-bold">1. Opening Bulk Carton</div>
                      <div className="fw-bold text-dark fs-13 mt-1 text-truncate" title={sourceProduct?.name}>
                        {sourceProduct?.name}
                      </div>
                      <div className="text-danger fw-bold fs-14 mt-1">-{countToBreak} Carton(s)</div>
                      <div className="text-muted fs-11 mt-1">Category: {sourceProduct?.category || 'General'}</div>
                    </div>

                    <div className="col-2 text-center text-success fs-20">
                      <i className="ri-arrow-right-line" />
                    </div>

                    <div className="col-5 text-end">
                      <div className="text-muted fs-11 text-uppercase fw-bold">2. Receiving Loose Pieces</div>
                      <div className="fw-bold text-dark fs-13 mt-1 text-truncate" title={targetProduct?.name}>
                        {targetProduct?.name}
                      </div>
                      <div className="text-success fw-bold fs-14 mt-1">+{piecesGained} Piece(s)</div>
                      <div className="text-muted fs-11 mt-1">Category: {targetProduct?.category || 'General'}</div>
                    </div>
                  </div>
                </div>

                {/* Compatibility Warning in Modal */}
                {compatibility.status === 'mismatch' ? (
                  <div className="alert alert-warning p-3 rounded-3 mb-3 border-0">
                    <div className="fw-bold fs-13 d-flex align-items-center gap-2 mb-1 text-dark">
                      <i className="ri-alert-fill text-warning fs-16"></i>
                      Item &amp; Category Mismatch Alert
                    </div>
                    <div className="fs-12 leading-relaxed text-dark">
                      You are about to unbundle <strong>{sourceProduct?.name}</strong> into <strong>{targetProduct?.name}</strong>.
                      These two products have different categories.
                    </div>
                    <div className="form-check mt-3 pt-2 border-top">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="overrideCheck"
                        checked={mismatchOverrideChecked}
                        onChange={(e) => setMismatchOverrideChecked(e.target.checked)}
                      />
                      <label className="form-check-label fs-12 fw-bold text-dark" htmlFor="overrideCheck">
                        I confirm these two items correspond to the same physical goods.
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-success p-3 rounded-3 mb-3 border-0 d-flex align-items-center gap-2 fs-12">
                    <i className="ri-checkbox-circle-fill text-success fs-18 flex-shrink-0"></i>
                    <span>Category &amp; identity confirmed. Ready to update inventory.</span>
                  </div>
                )}

                <div className="text-muted fs-11 leading-relaxed">
                  Clicking "Confirm &amp; Execute" will immediately commit this conversion to PostgreSQL, decrementing cartons and crediting loose pieces in real-time.
                </div>
              </div>

              <div className="modal-footer border-top p-3 bg-light d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-4 fw-bold text-white shadow-sm d-flex align-items-center gap-1"
                  onClick={handleConfirmAndExecute}
                  disabled={submitting || (compatibility.status === 'mismatch' && !mismatchOverrideChecked)}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Committing...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line fs-16" />
                      Confirm &amp; Execute Debulk
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
