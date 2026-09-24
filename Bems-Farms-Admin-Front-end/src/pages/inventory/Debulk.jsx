import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
        title: 'Identical Product Error',
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

    // High confidence: Same category and shared core product name keyword (e.g. "Eggs" and "Eggs", "Garri" and "Garri")
    if (sameCategory && sharedWords.length > 0) {
      return {
        status: 'perfect',
        severity: 'success',
        isFatal: false,
        title: 'Perfect Product Match',
        message: `Both items belong to "${categoryLabelSource}" and share product keyword "${sharedWords.join(', ')}". High confidence match!`,
      }
    }

    // Moderate: Same category but different name stems
    if (sameCategory) {
      return {
        status: 'moderate',
        severity: 'info',
        isFatal: false,
        title: 'Category Matched (Verify Names)',
        message: `Both items are in "${categoryLabelSource}", but titles differ ("${sourceProduct.name}" vs "${targetProduct.name}"). Ensure this is intentional.`,
      }
    }

    // Critical Mismatch: Different Categories & Different Names (like Garri into Beans)
    return {
      status: 'mismatch',
      severity: 'warning',
      isFatal: false,
      title: 'Cross-Category Mismatch Warning',
      message: `Caution: Source "${sourceProduct.name}" (${categoryLabelSource}) and Target "${targetProduct.name}" (${categoryLabelTarget}) appear to be different items across different categories!`,
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

  // Smart Recommended Target Products (Filters catalog to matching category/name items)
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
        p.sku?.toLowerCase() === query ||
        String(p.id) === query
    )

    if (matched) {
      if (!sourceProductId) {
        setSourceProductId(String(matched.id))
        toast.success(`Source carton set: "${matched.name}"`)
      } else {
        setTargetProductId(String(matched.id))
        toast.success(`Target piece set: "${matched.name}"`)
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
      return toast.error('Please check the safety confirmation box to verify this cross-category conversion.')
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
    <div className="container-fluid py-4 px-md-4">
      {/* ── TOP EXECUTIVE BANNER ── */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="card-body p-4 text-white">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-7">
              <div className="d-flex align-items-center gap-3 mb-2">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-3 shadow-sm"
                  style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' }}
                >
                  <i className="ri-inbox-unarchive-line fs-24"></i>
                </span>
                <div>
                  <h3 className="fw-bold mb-0 text-white tracking-tight">Debulk &amp; Unbundle Studio</h3>
                  <div className="text-white-50 fs-13 d-flex align-items-center gap-2 mt-1">
                    <span>Inventory</span>
                    <span>&bull;</span>
                    <span className="text-warning-emphasis fw-medium">Bulk Cartons &rarr; Loose Retail Pieces</span>
                  </div>
                </div>
              </div>
              <p className="text-white-50 fs-13 mb-0 mt-2" style={{ maxWidth: 580 }}>
                Safely unpack wholesale cartons or crates into individual retail shelf units with real-time perpetual inventory balance, category validation guards, and audit trails.
              </p>
            </div>

            <div className="col-12 col-lg-5 text-lg-end">
              <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 p-2 rounded-3 backdrop-blur">
                <button
                  type="button"
                  className={`btn btn-sm px-3 fw-bold rounded-2 transition-all ${activeTab === 'studio' ? 'btn-warning text-dark shadow-sm' : 'text-white'}`}
                  onClick={() => setActiveTab('studio')}
                >
                  <i className="ri-tools-line me-1"></i> Conversion Studio
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-3 fw-bold rounded-2 transition-all ${activeTab === 'ledger' ? 'btn-warning text-dark shadow-sm' : 'text-white'}`}
                  onClick={() => setActiveTab('ledger')}
                >
                  <i className="ri-file-list-3-line me-1"></i> Audit Ledger ({movements.length})
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-dark text-white-50 border-0 rounded-2"
                  onClick={() => { loadMetadata(); fetchHistory() }}
                  disabled={loading || loadingMovements}
                  title="Refresh Inventory"
                >
                  <i className={`ri-refresh-line ${loading || loadingMovements ? 'ri-spin' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS STRIP ── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-xs rounded-3 bg-white p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Total Operations</div>
                <h3 className="fw-bold mb-0 text-dark mt-1">{movements.length}</h3>
              </div>
              <div className="rounded-3 p-2 bg-warning-subtle text-warning">
                <i className="ri-history-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Unbundling events recorded</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-xs rounded-3 bg-white p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Cartons Unpacked</div>
                <h3 className="fw-bold mb-0 text-danger mt-1">-{totalCartonsDebulked}</h3>
              </div>
              <div className="rounded-3 p-2 bg-danger-subtle text-danger">
                <i className="ri-archive-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Deducted from bulk storage</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-xs rounded-3 bg-white p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">Safeguard Guard</div>
                <h3 className="fw-bold mb-0 text-success mt-1">Active</h3>
              </div>
              <div className="rounded-3 p-2 bg-success-subtle text-success">
                <i className="ri-shield-check-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Category &amp; stem verification</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-xs rounded-3 bg-white p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-12 fw-semibold text-uppercase">POS Sync</div>
                <h3 className="fw-bold mb-0 text-primary mt-1">Instant</h3>
              </div>
              <div className="rounded-3 p-2 bg-primary-subtle text-primary">
                <i className="ri-wireless-charging-line fs-20" />
              </div>
            </div>
            <div className="text-muted fs-11 mt-2">Ready for counter sale</div>
          </div>
        </div>
      </div>

      {/* ── TAB 1: CONVERSION STUDIO ── */}
      {activeTab === 'studio' && (
        <div className="row g-4">
          {/* Left Column: Interactive Form */}
          <div className="col-12 col-xl-7">
            <div className="card border-0 shadow-xs rounded-4 bg-white overflow-hidden">
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <i className="ri-dashboard-3-line text-warning"></i>
                    Debulk Setup &amp; Item Verification
                  </h6>
                  <div className="text-muted fs-12">Pair the wholesale container with its single retail counterpart</div>
                </div>

                {/* Barcode Scanner Gun Quick-Entry */}
                <form onSubmit={handleBarcodeScanSubmit} className="d-none d-md-flex align-items-center gap-1">
                  <div className="input-group input-group-sm" style={{ width: 230 }}>
                    <span className="input-group-text bg-light border-end-0">
                      <i className="ri-barcode-line text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Scan Barcode / SKU..."
                      value={barcodeScanInput}
                      onChange={(e) => setBarcodeScanInput(e.target.value)}
                    />
                  </div>
                </form>
              </div>

              <div className="card-body p-4">
                <form onSubmit={handleRequestExecution}>
                  {/* STEP 1: SOURCE CARTON */}
                  <div className="p-3 rounded-3 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-warning text-dark rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                        <label className="fw-bold text-dark fs-14 mb-0">Select Bulk / Wholesale Item (To Open)</label>
                      </div>
                      {sourceProduct && (
                        <span className={`badge ${sourceStock > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} px-2 py-1`}>
                          Available: <strong>{sourceStock}</strong> cartons
                        </span>
                      )}
                    </div>

                    <ProductSelect
                      products={products}
                      value={sourceProductId}
                      onChange={(val) => {
                        setSourceProductId(val)
                        // Auto-reset target if previously set to same
                        if (String(val) === String(targetProductId)) {
                          setTargetProductId('')
                        }
                      }}
                      placeholder="Search or scan source carton (e.g. Eggs 30-Pack, Crate, Garri 50kg)..."
                      required
                    />

                    {sourceProduct && (
                      <div className="d-flex align-items-center gap-3 mt-2 pt-2 border-top fs-12 text-muted">
                        <span>Category: <strong className="text-dark">{sourceProduct.category || sourceProduct.category_name || 'General'}</strong></span>
                        {sourceProduct.sku && <span>SKU: <code className="text-dark">{sourceProduct.sku}</code></span>}
                        {sourceProduct.barcode && <span>Barcode: <code className="text-dark">{sourceProduct.barcode}</code></span>}
                      </div>
                    )}
                  </div>

                  {/* STEP 2: TARGET RETAIL PIECE */}
                  <div className="p-3 rounded-3 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success text-white rounded-circle" style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                        <label className="fw-bold text-dark fs-14 mb-0">Select Retail Pieces Product (To Receive Units)</label>
                      </div>
                      {targetProduct && (
                        <span className="badge bg-primary-subtle text-primary px-2 py-1">
                          Current Shelf: <strong>{targetStock}</strong> pieces
                        </span>
                      )}
                    </div>

                    {/* Filter Toggle pills for Target Product */}
                    {sourceProduct && (
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fs-11 text-muted">
                          {targetFilterMode === 'recommended' ? (
                            <span className="text-success fw-medium">
                              <i className="ri-magic-line me-1"></i> Showing items related to "{sourceProduct.category || 'Source'}"
                            </span>
                          ) : (
                            <span>Showing all products in catalog</span>
                          )}
                        </span>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className={`btn btn-xs py-0 px-2 ${targetFilterMode === 'recommended' ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => setTargetFilterMode('recommended')}
                          >
                            Suggested Matches
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs py-0 px-2 ${targetFilterMode === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setTargetFilterMode('all')}
                          >
                            Browse All
                          </button>
                        </div>
                      </div>
                    )}

                    <ProductSelect
                      products={targetProductsList}
                      value={targetProductId}
                      onChange={(val) => setTargetProductId(val)}
                      placeholder="Search or scan retail item (e.g. Single Egg, 1kg Garri)..."
                      required
                    />

                    {targetProduct && (
                      <div className="d-flex align-items-center gap-3 mt-2 pt-2 border-top fs-12 text-muted">
                        <span>Category: <strong className="text-dark">{targetProduct.category || targetProduct.category_name || 'General'}</strong></span>
                        {targetProduct.sku && <span>SKU: <code className="text-dark">{targetProduct.sku}</code></span>}
                        {targetProduct.barcode && <span>Barcode: <code className="text-dark">{targetProduct.barcode}</code></span>}
                      </div>
                    )}
                  </div>

                  {/* ── SAFEGUARD COMPATIBILITY STATUS BANNER ── */}
                  {sourceProduct && targetProduct && (
                    <div className={`alert alert-${compatibility.severity} d-flex align-items-start gap-3 p-3 rounded-3 mb-4 shadow-xs border-0`}>
                      <span className="fs-20 flex-shrink-0">
                        {compatibility.status === 'perfect' && <i className="ri-checkbox-circle-fill text-success" />}
                        {compatibility.status === 'moderate' && <i className="ri-information-fill text-info" />}
                        {compatibility.status === 'mismatch' && <i className="ri-alert-fill text-warning" />}
                        {compatibility.status === 'error' && <i className="ri-close-circle-fill text-danger" />}
                      </span>
                      <div>
                        <div className="fw-bold fs-13 mb-1">{compatibility.title}</div>
                        <div className="fs-12 leading-relaxed">{compatibility.message}</div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: QUANTITY & MULTIPLIER CONFIGURATION */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold text-dark fs-13 mb-1 d-flex align-items-center justify-content-between">
                        <span>Cartons to Open</span>
                        <span className="text-muted fs-11">Wholesale Count</span>
                      </label>
                      <div className="input-group">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setCartonsToBreak(Math.max(1, countToBreak - 1))}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className={`form-control text-center fw-bold fs-15 ${isStockInsufficient ? 'is-invalid' : ''}`}
                          min="1"
                          max={sourceStock > 0 ? sourceStock : 9999}
                          value={cartonsToBreak}
                          onChange={(e) => setCartonsToBreak(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setCartonsToBreak(countToBreak + 1)}
                        >
                          +
                        </button>
                      </div>
                      {isStockInsufficient && (
                        <div className="text-danger fs-11 mt-1">
                          Cannot exceed available stock ({sourceStock} available)
                        </div>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold text-dark fs-13 mb-1 d-flex align-items-center justify-content-between">
                        <span>Pieces Inside Each Carton</span>
                        <span className="text-muted fs-11">Pack Multiplier</span>
                      </label>
                      <input
                        type="number"
                        className="form-control text-center fw-bold fs-15"
                        min="1"
                        step="any"
                        value={piecesPerCarton}
                        onChange={(e) => setPiecesPerCarton(e.target.value)}
                        required
                      />
                      <div className="d-flex gap-1 mt-1">
                        {[12, 24, 30, 40, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="btn btn-xs btn-outline-light text-dark border py-0 px-2 fs-10"
                            onClick={() => setPiecesPerCarton(preset)}
                          >
                            {preset}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Warehouse & Notes Row */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-13 mb-1">Target Storage Location</label>
                      <select
                        className="form-select form-select-sm"
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                      >
                        <option value="">Default Farm Store / Retail Floor</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold text-dark fs-13 mb-1">Audit Reason / Note</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Broken down for front display shelf"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={!sourceProductId || !targetProductId || isStockInsufficient || compatibility.status === 'error'}
                    className="btn btn-warning w-100 py-3 fw-bold text-dark rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 fs-15"
                  >
                    <i className="ri-shield-flash-line fs-18"></i>
                    Verify &amp; Execute Debulking ({countToBreak} Ctn &rarr; {piecesGained} Pcs)
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: High-Tech Conversion Pipeline & Activity */}
          <div className="col-12 col-xl-5">
            {/* 1. Live Interactive Pipeline Simulation */}
            <div className="card border-0 shadow-xs rounded-4 bg-white p-4 mb-4">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="ri-pulse-line text-success"></i>
                Stock Balance Simulation
              </h6>

              <div className="p-3 rounded-3 border bg-light mb-3">
                <div className="row g-2 align-items-center text-center">
                  {/* Source Carton Node */}
                  <div className="col-5">
                    <div className="p-3 bg-white rounded-3 shadow-xs border">
                      <div className="text-danger fw-bold fs-20">-{countToBreak}</div>
                      <div className="text-truncate fw-semibold text-dark fs-12 mt-1" title={sourceProduct?.name}>
                        {sourceProduct?.name || 'Bulk Carton'}
                      </div>
                      <div className="badge bg-danger-subtle text-danger fs-11 mt-2">
                        {sourceStock} &rarr; <strong>{newSourceStock}</strong> ctn
                      </div>
                    </div>
                  </div>

                  {/* Conversion Flow Node */}
                  <div className="col-2">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center shadow-xs"
                      style={{ width: 34, height: 34, background: '#FEF3C7', color: '#B45309' }}
                    >
                      <i className="ri-arrow-right-line fs-18"></i>
                    </div>
                    <div className="text-muted fs-10 mt-1 fw-bold">&times;{multiplier}</div>
                  </div>

                  {/* Target Pieces Node */}
                  <div className="col-5">
                    <div className="p-3 bg-white rounded-3 shadow-xs border">
                      <div className="text-success fw-bold fs-20">+{piecesGained}</div>
                      <div className="text-truncate fw-semibold text-dark fs-12 mt-1" title={targetProduct?.name}>
                        {targetProduct?.name || 'Retail Pieces'}
                      </div>
                      <div className="badge bg-success-subtle text-success fs-11 mt-2">
                        {targetStock} &rarr; <strong>{newTargetStock}</strong> pcs
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Rules Reminder */}
              <div className="bg-white p-3 rounded-3 border fs-12 text-muted">
                <div className="fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                  <i className="ri-information-line text-primary"></i>
                  Safeguards Guarantee:
                </div>
                <ul className="mb-0 ps-3 fs-11 leading-relaxed">
                  <li>Wholesale cartons are permanently decremented upon unboxing.</li>
                  <li>Retail piece counts are immediately visible for checkout at the POS.</li>
                  <li>Cost price and accounting general ledger values remain 100% balanced.</li>
                </ul>
              </div>
            </div>

            {/* 2. Recent Debulk Log Preview */}
            <div className="card border-0 shadow-xs rounded-4 bg-white p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-bold text-dark mb-0">Recent Operations</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-warning p-0 fw-bold fs-12 text-decoration-none"
                  onClick={() => setActiveTab('ledger')}
                >
                  View All &rarr;
                </button>
              </div>

              {movements.slice(0, 4).length === 0 ? (
                <div className="text-center py-4 text-muted fs-12">
                  No debulking recorded yet. Conversions will appear here.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {movements.slice(0, 4).map((m) => (
                    <div key={m.id} className="p-2 rounded border bg-light d-flex align-items-center justify-content-between fs-12">
                      <div>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 200 }}>
                          {m.product_name}
                        </div>
                        <div className="text-muted fs-10">
                          {new Date(m.created_at).toLocaleDateString()} &bull; {m.reference || 'DEBULK'}
                        </div>
                      </div>
                      <span className="badge bg-danger-subtle text-danger fw-bold">
                        -{m.quantity} ctn
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AUDIT LEDGER (FULL SCREEN HISTORY) ── */}
      {activeTab === 'ledger' && (
        <div className="card border-0 shadow-xs rounded-4 bg-white overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="ri-history-line text-warning"></i>
                Debulking Audit Ledger
              </h6>
              <div className="text-muted fs-12">Complete chronological record of all carton-to-piece unbundling events</div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: 240 }}>
                <span className="input-group-text bg-light border-end-0">
                  <i className="ri-search-line text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Filter by product, ref..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {loadingMovements ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-warning mb-2" role="status" />
                <div className="fs-13">Loading historical movements...</div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-5 text-muted px-4">
                <i className="ri-file-search-line fs-32 text-muted mb-2 d-block" />
                <h6 className="fw-bold text-dark">No Matching Debulking Records</h6>
                <p className="fs-12 text-muted mb-0">Use the Conversion Studio tab to process carton breakdown operations.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 fs-13">
                  <thead className="table-light fs-12 text-uppercase text-muted">
                    <tr>
                      <th className="ps-4 py-3">Date / Time</th>
                      <th>Reference ID</th>
                      <th>Source Bulk Product</th>
                      <th className="text-center">Cartons Opened</th>
                      <th>Conversion Notes &amp; Balance</th>
                      <th className="text-end pe-4">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((m) => (
                      <tr key={m.id}>
                        <td className="ps-4 text-nowrap text-muted fs-12">
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
                        <td className="text-end pe-4 text-nowrap text-muted fs-12">
                          <span className="badge bg-secondary-subtle text-secondary">
                            {m.user_name || 'Staff Operator'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SAFETY PRE-FLIGHT VERIFICATION MODAL ── */}
      {confirmModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540 }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-bottom py-3 px-4" style={{ background: '#f8fafc' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle p-2 bg-warning-subtle text-warning">
                    <i className="ri-shield-check-line fs-20"></i>
                  </span>
                  <div>
                    <h6 className="modal-title fw-bold text-dark mb-0">Pre-Flight Safety Verification</h6>
                    <div className="text-muted fs-11">Confirm items before updating physical inventory</div>
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

                    <div className="col-2 text-center text-warning fs-20">
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
                    <div className="fw-bold fs-13 d-flex align-items-center gap-2 mb-1">
                      <i className="ri-alert-fill text-warning fs-16"></i>
                      Cross-Category Warning
                    </div>
                    <div className="fs-12 leading-relaxed text-dark">
                      You are unbundling <strong>{sourceProduct?.name}</strong> into <strong>{targetProduct?.name}</strong>.
                      These two items have different categories.
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
                  className="btn btn-warning btn-sm px-4 fw-bold text-dark shadow-sm d-flex align-items-center gap-1"
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
