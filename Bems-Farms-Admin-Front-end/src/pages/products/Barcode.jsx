import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import BarcodeSvg from '../../components/ui/BarcodeSvg'
import { generateUniversalGoodsCode } from '../../lib/barcodeGenerator'

export default function Barcode() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  
  // Filters & State
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'with_barcode' | 'missing_barcode' | 'queue'
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [symbology, setSymbology] = useState('CODE128') // 'CODE128' | 'EAN13'
  
  // Print Queue: Map of productId -> { product, copies }
  const [printQueue, setPrintQueue] = useState({})
  
  // Label Customizer Settings
  const [labelTemplate, setLabelTemplate] = useState('thermal_50x30') // 'thermal_50x30' | 'compact_40x20' | 'crate_100x75' | 'sheet_a4'
  const [showBrandHeader, setShowBrandHeader] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [showCategory, setShowCategory] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showHumanCode, setShowHumanCode] = useState(true)
  const [showDates, setShowDates] = useState(false)
  
  // Single preview / manual edit state
  const [editingBarcodeProduct, setEditingBarcodeProduct] = useState(null)
  const [customBarcodeVal, setCustomBarcodeVal] = useState('')
  const [savingBarcode, setSavingBarcode] = useState(false)
  const [autoGeneratingAll, setAutoGeneratingAll] = useState(false)

  // Scanner Verification Tool
  const [scannedInput, setScannedInput] = useState('')
  const [scannedMatch, setScannedMatch] = useState(null)
  const scannerInputRef = useRef(null)

  // Load products and categories from API
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const [prodRes, formRes] = await Promise.all([
        api.get('/admin/products', { params: { limit: 200 } }),
        api.get('/admin/products/form-data').catch(() => ({ data: {} })),
      ])
      
      const prods = prodRes.data?.products || []
      setProducts(prods)
      if (formRes.data?.categories) {
        setCategories(formRes.data.categories)
      }

      // Default queue: add first 3 products with 1 copy each for instant preview
      const initialQueue = {}
      prods.slice(0, 3).forEach((p) => {
        initialQueue[p.id] = { product: p, copies: 1 }
      })
      setPrintQueue(initialQueue)
    } catch (err) {
      console.error('Failed to load products for barcode studio:', err)
      toast.error('Could not load products catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Stats calculation
  const totalProducts = products.length
  const productsWithBarcode = useMemo(() => products.filter((p) => p.barcode && p.barcode.trim()), [products])
  const productsMissingBarcode = useMemo(() => products.filter((p) => !p.barcode || !p.barcode.trim()), [products])
  const barcodeCoveragePct = totalProducts > 0 ? Math.round((productsWithBarcode.length / totalProducts) * 100) : 0

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Tab filter
      if (activeTab === 'with_barcode' && (!p.barcode || !p.barcode.trim())) return false
      if (activeTab === 'missing_barcode' && p.barcode && p.barcode.trim()) return false
      if (activeTab === 'queue' && !printQueue[p.id]) return false

      // Category filter
      if (categoryFilter) {
        const catName = p.category || p.category_name || ''
        const catId = String(p.category_id || '')
        if (catId !== String(categoryFilter) && !catName.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const nameMatch = p.name?.toLowerCase().includes(q)
        const skuMatch = p.sku?.toLowerCase().includes(q)
        const bcMatch = p.barcode?.toLowerCase().includes(q)
        if (!nameMatch && !skuMatch && !bcMatch) return false
      }

      return true
    })
  }, [products, activeTab, categoryFilter, searchTerm, printQueue])

  // Queue manipulation
  const toggleQueueItem = (product) => {
    setPrintQueue((prev) => {
      const next = { ...prev }
      if (next[product.id]) {
        delete next[product.id]
      } else {
        next[product.id] = { product, copies: 1 }
      }
      return next
    })
  }

  const updateQueueCopies = (productId, delta) => {
    setPrintQueue((prev) => {
      const item = prev[productId]
      if (!item) return prev
      const newCopies = Math.max(1, item.copies + delta)
      return { ...prev, [productId]: { ...item, copies: newCopies } }
    })
  }

  const setQueueCopiesDirect = (productId, count) => {
    const qty = Math.max(1, parseInt(count) || 1)
    setPrintQueue((prev) => {
      const item = prev[productId]
      if (!item) return prev
      return { ...prev, [productId]: { ...item, copies: qty } }
    })
  }

  const addAllToQueue = (items) => {
    setPrintQueue((prev) => {
      const next = { ...prev }
      items.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = { product: p, copies: 1 }
        }
      })
      return next
    })
    toast.success(`Added ${items.length} items to print queue`)
  }

  const clearQueue = () => {
    setPrintQueue({})
    toast.success('Print queue cleared')
  }

  const totalLabelsInQueue = useMemo(() => {
    return Object.values(printQueue).reduce((sum, item) => sum + (item.copies || 1), 0)
  }, [printQueue])

  // Single Product Barcode Generation / Assignment
  const handleGenerateSingle = async (product) => {
    const newCode = generateUniversalGoodsCode(product, symbology)
    try {
      await api.patch(`/admin/products/${product.id}`, { barcode: newCode })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, barcode: newCode } : p)))
      // Update queue item if present
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: { ...prev[product.id], product: { ...prev[product.id].product, barcode: newCode } },
        }))
      }
      toast.success(`Generated Universal Code: ${newCode}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save generated barcode')
    }
  }

  // Auto-Generate Barcodes for ALL Missing Products
  const handleAutoGenerateAllMissing = async () => {
    if (productsMissingBarcode.length === 0) {
      return toast.success('All products already have barcodes assigned!')
    }

    if (!window.confirm(`Generate Universal Bems Goods Codes for all ${productsMissingBarcode.length} uncoded products?`)) {
      return
    }

    setAutoGeneratingAll(true)
    let successCount = 0
    let failureCount = 0

    const updatedProducts = [...products]

    for (const prod of productsMissingBarcode) {
      const newCode = generateUniversalGoodsCode(prod, symbology)
      try {
        await api.patch(`/admin/products/${prod.id}`, { barcode: newCode })
        const idx = updatedProducts.findIndex((p) => p.id === prod.id)
        if (idx !== -1) {
          updatedProducts[idx] = { ...updatedProducts[idx], barcode: newCode }
        }
        successCount++
      } catch (err) {
        console.error(`Failed to generate barcode for ${prod.name}:`, err)
        failureCount++
      }
    }

    setProducts(updatedProducts)
    setAutoGeneratingAll(false)

    if (successCount > 0) {
      toast.success(`Successfully assigned barcodes to ${successCount} products!`)
    }
    if (failureCount > 0) {
      toast.error(`Failed to assign barcodes to ${failureCount} products`)
    }
  }

  // Save manual barcode
  const handleSaveManualBarcode = async () => {
    if (!editingBarcodeProduct) return
    const trimmed = customBarcodeVal.trim()
    if (!trimmed) {
      return toast.error('Barcode cannot be blank')
    }

    setSavingBarcode(true)
    try {
      await api.patch(`/admin/products/${editingBarcodeProduct.id}`, { barcode: trimmed })
      setProducts((prev) =>
        prev.map((p) => (p.id === editingBarcodeProduct.id ? { ...p, barcode: trimmed } : p))
      )
      if (printQueue[editingBarcodeProduct.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [editingBarcodeProduct.id]: {
            ...prev[editingBarcodeProduct.id],
            product: { ...prev[editingBarcodeProduct.id].product, barcode: trimmed },
          },
        }))
      }
      toast.success('Barcode updated successfully')
      setEditingBarcodeProduct(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update barcode')
    } finally {
      setSavingBarcode(false)
    }
  }

  // Scanner Verification Tool
  const handleScanLookup = (e) => {
    e?.preventDefault()
    const val = scannedInput.trim().toLowerCase()
    if (!val) return

    const match = products.find(
      (p) =>
        p.barcode?.toLowerCase() === val ||
        p.sku?.toLowerCase() === val ||
        String(p.id) === val
    )

    if (match) {
      setScannedMatch(match)
      toast.success(`Found: ${match.name}`)
    } else {
      setScannedMatch(null)
      toast.error(`No product found for code "${scannedInput}"`)
    }
  }

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Print Action
  const handleTriggerPrint = () => {
    if (totalLabelsInQueue === 0) {
      return toast.error('Please select at least one product to print')
    }
    window.print()
  }

  // Flattened array of all labels in queue based on copies
  const printableLabelArray = useMemo(() => {
    const list = []
    Object.values(printQueue).forEach(({ product, copies }) => {
      const code = product.barcode || product.sku || `BF-${product.id}`
      for (let i = 0; i < copies; i++) {
        list.push({ ...product, barcodeValue: code, copyIndex: i + 1, totalCopies: copies })
      }
    })
    return list
  }, [printQueue])

  return (
    <div className="container-fluid py-3 barcode-studio-page">
      {/* ── Print Isolation Stylesheet ────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-barcode-canvas, #printable-barcode-canvas * {
            visibility: visible !important;
          }
          #printable-barcode-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }

        .barcode-label-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          border: 1px dashed #d1d5db;
        }
        .barcode-label-card:hover {
          border-color: #059669;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.08);
        }

        .label-preview-thermal {
          width: 240px;
          min-height: 145px;
          background: #ffffff;
          border: 1.5px solid #1f2937;
          border-radius: 6px;
          padding: 8px 10px;
        }

        .label-preview-compact {
          width: 190px;
          min-height: 110px;
          background: #ffffff;
          border: 1.5px solid #1f2937;
          border-radius: 4px;
          padding: 6px 8px;
        }

        .label-preview-crate {
          width: 320px;
          min-height: 200px;
          background: #ffffff;
          border: 2px solid #1f2937;
          border-radius: 8px;
          padding: 12px 14px;
        }

        .bems-brand-strip {
          background: linear-gradient(135deg, #064e3b 0%, #059669 100%);
          color: #ffffff;
          padding: 3px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
      `}</style>

      {/* ── Page Header (Screen Only) ────────────────────────────── */}
      <div className="no-print d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="avatar size-10 rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center">
              <i className="ri-barcode-box-line fs-3"></i>
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">Universal Barcode &amp; Goods Code Studio</h5>
              <small className="text-muted">
                Generate, manage, verify, and print GS1/Code-128 branded labels across all Bems Farms products
              </small>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button
            type="button"
            className="btn btn-outline-success d-flex align-items-center gap-1 shadow-sm"
            onClick={handleAutoGenerateAllMissing}
            disabled={autoGeneratingAll || productsMissingBarcode.length === 0}
          >
            {autoGeneratingAll ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status"></span>
                Generating Codes…
              </>
            ) : (
              <>
                <i className="ri-magic-line"></i> Auto-Generate All Missing ({productsMissingBarcode.length})
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm px-4"
            onClick={handleTriggerPrint}
            disabled={totalLabelsInQueue === 0}
          >
            <i className="ri-printer-line fs-5"></i>
            <span>Print Queue ({totalLabelsInQueue})</span>
          </button>
        </div>
      </div>

      {/* ── Analytics & Health Stat Cards (Screen Only) ──────────── */}
      <div className="no-print row g-3 mb-4">
        {/* Total Catalog */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted fs-xs fw-semibold text-uppercase">Total Catalog Products</span>
                <h3 className="fw-bold mb-0 text-dark mt-1">{totalProducts}</h3>
                <small className="text-muted">In master catalog</small>
              </div>
              <div className="avatar size-10 rounded-3 bg-light text-primary d-flex align-items-center justify-content-center">
                <i className="ri-box-3-line fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Barcodes */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted fs-xs fw-semibold text-uppercase">Universal Code Assigned</span>
                <h3 className="fw-bold mb-0 text-success mt-1">{productsWithBarcode.length}</h3>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <div className="progress flex-grow-1" style={{ height: 6, width: 80 }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${barcodeCoveragePct}%` }}
                    ></div>
                  </div>
                  <small className="fw-bold text-success">{barcodeCoveragePct}%</small>
                </div>
              </div>
              <div className="avatar size-10 rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center">
                <i className="ri-checkbox-circle-line fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Missing Barcode Action Alert */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className={`card border-0 shadow-sm rounded-4 h-100 p-3 ${productsMissingBarcode.length > 0 ? 'bg-warning bg-opacity-10 border-warning' : 'bg-white'}`}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted fs-xs fw-semibold text-uppercase">Missing Barcodes</span>
                <h3 className={`fw-bold mb-0 mt-1 ${productsMissingBarcode.length > 0 ? 'text-warning' : 'text-dark'}`}>
                  {productsMissingBarcode.length}
                </h3>
                <small className={productsMissingBarcode.length > 0 ? 'text-warning fw-semibold' : 'text-muted'}>
                  {productsMissingBarcode.length > 0 ? 'Action required for POS' : 'All items encoded'}
                </small>
              </div>
              <div className="avatar size-10 rounded-3 bg-warning-subtle text-warning d-flex align-items-center justify-content-center">
                <i className="ri-alert-line fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Print Queue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted fs-xs fw-semibold text-uppercase">Print Batch Queue</span>
                <h3 className="fw-bold mb-0 text-primary mt-1">{totalLabelsInQueue}</h3>
                <small className="text-muted">{Object.keys(printQueue).length} unique items</small>
              </div>
              <div className="avatar size-10 rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
                <i className="ri-printer-cloud-line fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Workspace: Left (Table & Filters) + Right (Live Studio Preview) ── */}
      <div className="no-print row g-4">
        {/* Left Column: Product Selection & Barcode Grid */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            {/* Filter Tabs & Search Bar */}
            <div className="card-body border-bottom p-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                {/* Tabs */}
                <div className="nav nav-pills gap-1">
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'all' ? 'btn-dark' : 'btn-light'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Goods ({totalProducts})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'with_barcode' ? 'btn-success' : 'btn-light'}`}
                    onClick={() => setActiveTab('with_barcode')}
                  >
                    <i className="ri-check-line me-1"></i> Assigned ({productsWithBarcode.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'missing_barcode' ? 'btn-warning text-dark' : 'btn-light'}`}
                    onClick={() => setActiveTab('missing_barcode')}
                  >
                    <i className="ri-error-warning-line me-1"></i> Needs Barcode ({productsMissingBarcode.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-light'}`}
                    onClick={() => setActiveTab('queue')}
                  >
                    <i className="ri-printer-line me-1"></i> In Queue ({Object.keys(printQueue).length})
                  </button>
                </div>

                {/* Batch add to queue */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => addAllToQueue(filteredProducts)}
                    title="Add all currently filtered items to print queue"
                  >
                    <i className="ri-add-circle-line me-1"></i> Queue Filtered
                  </button>
                  {Object.keys(printQueue).length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={clearQueue}
                      title="Clear print queue"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>
              </div>

              <div className="row g-2">
                {/* Search */}
                <div className="col-12 col-md-7">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="ri-search-line"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 bg-light"
                      placeholder="Search by product name, SKU, or barcode…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category Select */}
                <div className="col-12 col-md-5">
                  <select
                    className="form-select bg-light"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table of Products */}
            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0 text-nowrap">
                <thead className="table-light text-muted fs-xs text-uppercase sticky-top">
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every((p) => Boolean(printQueue[p.id]))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            addAllToQueue(filteredProducts)
                          } else {
                            setPrintQueue({})
                          }
                        }}
                      />
                    </th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Universal Barcode</th>
                    <th>Copies</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Loading barcode catalog…
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <i className="ri-barcode-line fs-1 d-block mb-2 text-muted opacity-50"></i>
                        No products found matching your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isQueued = Boolean(printQueue[p.id])
                      const copies = printQueue[p.id]?.copies || 1
                      const hasBarcode = Boolean(p.barcode && p.barcode.trim())

                      return (
                        <tr key={p.id} className={isQueued ? 'table-primary bg-opacity-25' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isQueued}
                              onChange={() => toggleQueueItem(p)}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="rounded-2 object-fit-cover border"
                                  style={{ width: '38px', height: '38px' }}
                                />
                              ) : (
                                <div
                                  className="rounded-2 bg-light d-flex align-items-center justify-content-center text-muted border"
                                  style={{ width: '38px', height: '38px' }}
                                >
                                  <i className="ri-image-line"></i>
                                </div>
                              )}
                              <div>
                                <div className="fw-bold text-dark fs-sm">{p.name}</div>
                                <div className="text-muted fs-xs">
                                  SKU: <span className="font-monospace text-dark">{p.sku || '—'}</span> &bull;{' '}
                                  {p.category || 'General'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="fw-bold text-dark fs-sm">{formatNaira(p.price || p.unit_price)}</td>
                          <td>
                            {hasBarcode ? (
                              <div className="d-flex align-items-center gap-2">
                                <div className="bg-light p-1 rounded border">
                                  <BarcodeSvg
                                    value={p.barcode}
                                    format={symbology}
                                    width={1.2}
                                    height={24}
                                    displayValue={false}
                                  />
                                </div>
                                <div>
                                  <span className="font-monospace fs-xs fw-bold text-dark d-block">
                                    {p.barcode}
                                  </span>
                                  <span className="badge bg-success-subtle text-success fs-xs py-0">Ready</span>
                                </div>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-warning-subtle text-warning fs-xs">Missing</span>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-success py-0 px-2"
                                  onClick={() => handleGenerateSingle(p)}
                                  title="Auto-generate and save barcode"
                                >
                                  <i className="ri-magic-line me-1"></i> Generate
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="input-group input-group-sm" style={{ width: '100px' }}>
                              <button
                                type="button"
                                className="btn btn-outline-secondary px-2"
                                onClick={() => updateQueueCopies(p.id, -1)}
                                disabled={!isQueued}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="form-control text-center px-1 font-monospace"
                                min="1"
                                max="999"
                                value={copies}
                                disabled={!isQueued}
                                onChange={(e) => setQueueCopiesDirect(p.id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary px-2"
                                onClick={() => updateQueueCopies(p.id, 1)}
                                disabled={!isQueued}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-end pe-3">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setEditingBarcodeProduct(p)
                                  setCustomBarcodeVal(p.barcode || generateUniversalGoodsCode(p, symbology))
                                }}
                                title="Custom Edit Barcode"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => {
                                  if (!printQueue[p.id]) {
                                    setPrintQueue((prev) => ({ ...prev, [p.id]: { product: p, copies: 1 } }))
                                  }
                                  toast.success(`Selected "${p.name}" for printing`)
                                }}
                                title="Add to Print Queue"
                              >
                                <i className="ri-printer-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Real-Time Barcode Scanner Verification Tool ────────── */}
          <div className="card border-0 shadow-sm rounded-4 mt-4 bg-white p-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="ri-scan-2-line fs-4 text-primary"></i>
              <div>
                <h6 className="mb-0 fw-bold">Live Barcode Verification &amp; Scanner Tool</h6>
                <small className="text-muted">
                  Test physical handheld barcode guns, cameras, or manual code queries
                </small>
              </div>
            </div>

            <form onSubmit={handleScanLookup} className="d-flex gap-2">
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="ri-barcode-line"></i>
                </span>
                <input
                  ref={scannerInputRef}
                  type="text"
                  className="form-control"
                  placeholder="Scan or type barcode / SKU to verify in system…"
                  value={scannedInput}
                  onChange={(e) => setScannedInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-dark px-4">
                Verify
              </button>
            </form>

            {scannedMatch && (
              <div className="alert alert-success mt-3 mb-0 d-flex align-items-center justify-content-between rounded-3">
                <div className="d-flex align-items-center gap-3">
                  {scannedMatch.image_url && (
                    <img
                      src={scannedMatch.image_url}
                      alt={scannedMatch.name}
                      className="rounded-2 border"
                      style={{ width: 44, height: 44, objectFit: 'cover' }}
                    />
                  )}
                  <div>
                    <h6 className="mb-0 fw-bold text-dark">{scannedMatch.name}</h6>
                    <small className="text-muted">
                      Barcode: <strong className="font-monospace text-dark">{scannedMatch.barcode}</strong> &bull;
                      Price: <strong>{formatNaira(scannedMatch.price || scannedMatch.unit_price)}</strong> &bull;
                      Stock: <strong>{scannedMatch.stock ?? scannedMatch.stock_quantity ?? 0} {scannedMatch.unit || 'units'}</strong>
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={() => {
                    toggleQueueItem(scannedMatch)
                    toast.success('Added scanned item to print queue')
                  }}
                >
                  <i className="ri-add-line me-1"></i> Add to Print Queue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Label Studio & Customizer */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: '1rem' }}>
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-0 fw-bold">Live Label Studio</h6>
                <small className="text-muted">Customise label layout &amp; branding</small>
              </div>
              <span className="badge bg-success-subtle text-success">Bems Branding</span>
            </div>

            <div className="card-body p-3">
              {/* Template Preset Picker */}
              <div className="mb-3">
                <label className="form-label fw-semibold fs-xs text-uppercase text-muted">
                  Label Dimension / Format
                </label>
                <select
                  className="form-select form-select-sm"
                  value={labelTemplate}
                  onChange={(e) => setLabelTemplate(e.target.value)}
                >
                  <option value="thermal_50x30">Standard Shelf / Item (50mm × 30mm)</option>
                  <option value="compact_40x20">Compact Produce Sticker (40mm × 20mm)</option>
                  <option value="crate_100x75">Pallet &amp; Delivery Crate Tag (100mm × 75mm)</option>
                  <option value="sheet_a4">Standard A4 Sticker Sheet (24-up Grid)</option>
                </select>
              </div>

              {/* Barcode Symbology */}
              <div className="mb-3">
                <label className="form-label fw-semibold fs-xs text-uppercase text-muted">Barcode Standard</label>
                <div className="btn-group btn-group-sm w-100">
                  <button
                    type="button"
                    className={`btn ${symbology === 'CODE128' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setSymbology('CODE128')}
                  >
                    Code-128 (Universal Goods)
                  </button>
                  <button
                    type="button"
                    className={`btn ${symbology === 'EAN13' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setSymbology('EAN13')}
                  >
                    EAN-13 (GS1 Retail)
                  </button>
                </div>
              </div>

              {/* Label Elements Toggles — 2-column pill grid */}
              <div className="mb-4">
                <label className="form-label fw-semibold fs-xs text-uppercase text-muted mb-2">
                  Label Design Content
                </label>
                <div className="row g-2">
                  {[
                    { id: 'toggleBrand',  label: 'Brand Header',    icon: 'ri-store-2-line',      val: showBrandHeader,  set: setShowBrandHeader },
                    { id: 'toggleName',   label: 'Product Name',    icon: 'ri-box-3-line',        val: showProductName,  set: setShowProductName },
                    { id: 'togglePrice',  label: 'Selling Price',   icon: 'ri-money-naira-line',  val: showPrice,        set: setShowPrice },
                    { id: 'toggleSku',    label: 'Product Code',    icon: 'ri-hashtag',           val: showSku,          set: setShowSku },
                    { id: 'toggleHuman',  label: 'Barcode Text',    icon: 'ri-eye-line',          val: showHumanCode,    set: setShowHumanCode },
                    { id: 'toggleDates',  label: 'Best Before',     icon: 'ri-calendar-line',     val: showDates,        set: setShowDates },
                  ].map(({ id, label, icon, val, set }) => (
                    <div className="col-6" key={id}>
                      <button
                        type="button"
                        onClick={() => set(!val)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '7px 9px',
                          borderRadius: 10,
                          border: `1.5px solid ${val ? '#059669' : '#e5e7eb'}`,
                          background: val ? 'rgba(5,150,105,0.07)' : '#f9fafb',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none',
                        }}
                      >
                        {/* mini animated toggle pill */}
                        <div style={{
                          flexShrink: 0,
                          width: 28,
                          height: 15,
                          borderRadius: 8,
                          background: val ? '#059669' : '#d1d5db',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: 1.5,
                            left: val ? 13 : 1.5,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                            transition: 'left 0.18s ease',
                          }} />
                        </div>
                        <i className={icon} style={{ fontSize: 13, color: val ? '#059669' : '#9ca3af', flexShrink: 0 }} />
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: val ? '#064e3b' : '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}>
                          {label}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-light rounded-3 text-center border">
                <span className="badge bg-secondary mb-2 fs-xs">Live Label Preview</span>

                <div className="d-flex justify-content-center">
                  {printableLabelArray[0] ? (
                    <div
                      className={`barcode-label-card ${
                        labelTemplate === 'compact_40x20'
                          ? 'label-preview-compact'
                          : labelTemplate === 'crate_100x75'
                          ? 'label-preview-crate'
                          : 'label-preview-thermal'
                      }`}
                    >
                      {showBrandHeader && (
                        <div className="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                          <span className="bems-brand-strip">BEMS FARMS</span>
                          <span className="text-muted" style={{ fontSize: 9 }}>
                            Fresh &bull; Organic
                          </span>
                        </div>
                      )}

                      {showProductName && (
                        <div
                          className="fw-bold text-dark text-truncate text-start"
                          style={{ fontSize: labelTemplate === 'compact_40x20' ? 11 : 13 }}
                        >
                          {printableLabelArray[0].name}
                        </div>
                      )}

                      {showPrice && (
                        <div className="d-flex justify-content-between align-items-baseline my-1">
                          <span className="fw-extrabold text-success" style={{ fontSize: 14 }}>
                            {formatNaira(printableLabelArray[0].price || printableLabelArray[0].unit_price)}
                          </span>
                          {showCategory && (
                            <span className="text-muted" style={{ fontSize: 9 }}>
                              {printableLabelArray[0].unit || 'Per Unit'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Barcode SVG */}
                      <div className="my-1">
                        <BarcodeSvg
                          value={printableLabelArray[0].barcodeValue}
                          format={symbology}
                          width={labelTemplate === 'compact_40x20' ? 1.2 : 1.6}
                          height={labelTemplate === 'compact_40x20' ? 28 : 42}
                          displayValue={showHumanCode}
                          fontSize={10}
                        />
                      </div>

                      {showSku && (
                        <div className="text-muted font-monospace" style={{ fontSize: 9 }}>
                          UGC: {printableLabelArray[0].barcodeValue}
                        </div>
                      )}

                      {showDates && (
                        <div
                          className="d-flex justify-content-between text-muted border-top pt-1 mt-1"
                          style={{ fontSize: 8 }}
                        >
                          <span>Packed: {new Date().toLocaleDateString('en-GB')}</span>
                          <span>Origin: Nigeria</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted py-4">No items in print queue</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-primary btn-lg shadow-sm d-flex align-items-center justify-content-center gap-2"
                  onClick={handleTriggerPrint}
                  disabled={totalLabelsInQueue === 0}
                >
                  <i className="ri-printer-line fs-5"></i>
                  <span>Print {totalLabelsInQueue} Labels</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hidden Print Area (Rendered only on window.print()) ─────── */}
      <div id="printable-barcode-canvas" className="d-none d-print-block">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: labelTemplate === 'sheet_a4' ? '12px' : '8px',
            padding: '10px',
            justifyContent: 'flex-start',
          }}
        >
          {printableLabelArray.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              style={{
                width:
                  labelTemplate === 'compact_40x20'
                    ? '180px'
                    : labelTemplate === 'crate_100x75'
                    ? '340px'
                    : labelTemplate === 'sheet_a4'
                    ? '220px'
                    : '220px',
                border: '1px solid #000',
                borderRadius: '4px',
                padding: '6px 8px',
                marginBottom: '8px',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                backgroundColor: '#ffffff',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              {showBrandHeader && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #333',
                    paddingBottom: '2px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      background: '#064e3b',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      padding: '1px 4px',
                      borderRadius: '2px',
                    }}
                  >
                    BEMS FARMS
                  </span>
                  <span style={{ fontSize: '8px', color: '#555' }}>Fresh Produce</span>
                </div>
              )}

              {showProductName && (
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: labelTemplate === 'compact_40x20' ? '10px' : '12px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </div>
              )}

              {showPrice && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    margin: '2px 0',
                  }}
                >
                  <span style={{ fontWeight: '900', fontSize: '13px' }}>
                    {formatNaira(item.price || item.unit_price)}
                  </span>
                  {showCategory && (
                    <span style={{ fontSize: '9px', color: '#555' }}>
                      {item.unit || item.category || 'Unit'}
                    </span>
                  )}
                </div>
              )}

              {/* Barcode Vector */}
              <div style={{ margin: '3px 0' }}>
                <BarcodeSvg
                  value={item.barcodeValue}
                  format={symbology}
                  width={labelTemplate === 'compact_40x20' ? 1.1 : 1.5}
                  height={labelTemplate === 'compact_40x20' ? 26 : 38}
                  displayValue={showHumanCode}
                  fontSize={9}
                />
              </div>

              {showSku && (
                <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#333' }}>
                  SKU: {item.sku || '—'} &bull; UGC: {item.barcodeValue}
                </div>
              )}

              {showDates && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '8px',
                    borderTop: '1px solid #ccc',
                    marginTop: '3px',
                    paddingTop: '2px',
                    color: '#666',
                  }}
                >
                  <span>Packed: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>Origin: Edo State, NG</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Custom Edit / Generate Barcode ────────────────── */}
      {editingBarcodeProduct && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow border-0">
              <div className="modal-header border-0 pb-0">
                <div>
                  <h6 className="modal-title fw-bold">Customize Barcode / Universal Code</h6>
                  <p className="text-muted fs-xs mb-0">For {editingBarcodeProduct.name}</p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingBarcodeProduct(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold fs-sm">Barcode / Code Value</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={customBarcodeVal}
                      onChange={(e) => setCustomBarcodeVal(e.target.value)}
                      placeholder="e.g. BF-VEG-84920 or 6150012849201"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={() =>
                        setCustomBarcodeVal(generateUniversalGoodsCode(editingBarcodeProduct, symbology))
                      }
                      title="Generate new unique Universal Goods Code"
                    >
                      <i className="ri-magic-line me-1"></i> Auto
                    </button>
                  </div>
                  <small className="text-muted">
                    Must be unique across the entire Bems Farms system.
                  </small>
                </div>

                {customBarcodeVal && (
                  <div className="p-3 bg-light rounded text-center border">
                    <BarcodeSvg value={customBarcodeVal} format={symbology} width={1.6} height={40} />
                  </div>
                )}
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setEditingBarcodeProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={handleSaveManualBarcode}
                  disabled={savingBarcode}
                >
                  {savingBarcode ? 'Saving…' : 'Save & Assign Barcode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
