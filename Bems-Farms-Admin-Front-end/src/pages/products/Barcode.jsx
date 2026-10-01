import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import BarcodeSvg from '../../components/ui/BarcodeSvg'
import { generateUniversalGoodsCode } from '../../lib/barcodeGenerator'

export default function Barcode() {
  const [searchParams] = useSearchParams()
  const targetProductId = searchParams.get('productId') || searchParams.get('id')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  
  // Filters & State
  const [activeTab, setActiveTab] = useState(targetProductId ? 'queue' : 'all') // 'all' | 'with_barcode' | 'missing_barcode' | 'queue'
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
  const [showPrinterGuideModal, setShowPrinterGuideModal] = useState(false)

  // Scanner Verification Tool
  const [scannedInput, setScannedInput] = useState('')
  const [scannedMatch, setScannedMatch] = useState(null)
  const scannerInputRef = useRef(null)

  // Load products and categories from API
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const [prodRes, formRes] = await Promise.all([
        api.get('/admin/products', { params: { limit: 300 } }),
        api.get('/admin/products/form-data').catch(() => ({ data: {} })),
      ])
      
      const prods = prodRes.data?.products || []
      setProducts(prods)
      if (formRes.data?.categories) {
        setCategories(formRes.data.categories)
      }

      // If productId URL param is provided, auto-queue it with its stock quantity
      if (targetProductId && prods.length > 0) {
        const found = prods.find((p) => String(p.id) === String(targetProductId))
        if (found) {
          const stockCount = Math.max(1, parseInt(found.stock ?? found.stock_quantity ?? found.quantity ?? 1) || 1)
          setPrintQueue({ [found.id]: { product: found, copies: stockCount } })
          setActiveTab('queue')
          toast.success(`Queued ${found.name} with ${stockCount} copies (matching current stock)`)
        }
      }

    } catch (err) {
      console.error('Failed to load products for barcode studio:', err)
      toast.error('Could not load products catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [targetProductId])

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

  // Queue manipulation - Automatically defaults copies to the product's actual stock quantity
  const toggleQueueItem = (product) => {
    setPrintQueue((prev) => {
      const next = { ...prev }
      if (next[product.id]) {
        delete next[product.id]
      } else {
        const stockQty = Math.max(1, parseInt(product.stock ?? product.stock_quantity ?? product.quantity ?? 1) || 1)
        next[product.id] = { product, copies: stockQty }
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
          const stockQty = Math.max(1, parseInt(p.stock ?? p.stock_quantity ?? p.quantity ?? 1) || 1)
          next[p.id] = { product: p, copies: stockQty }
        }
      })
      return next
    })
    toast.success(`Added ${items.length} items to print queue (copies auto-filled from stock count)`)
  }

  const syncAllToStock = () => {
    setPrintQueue((prev) => {
      const next = {}
      let updatedCount = 0
      Object.entries(prev).forEach(([id, item]) => {
        const stockQty = Math.max(1, parseInt(item.product.stock ?? item.product.stock_quantity ?? item.product.quantity ?? 1) || 1)
        next[id] = { ...item, copies: stockQty }
        updatedCount++
      })
      return next
    })
    toast.success('Synced all print copies to match inventory stock quantities')
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

  // Regenerate Barcode for Single Product
  const handleRegenerateSingle = async (product) => {
    const newCode = generateUniversalGoodsCode(product, symbology)
    try {
      await api.patch(`/admin/products/${product.id}`, { barcode: newCode })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, barcode: newCode } : p)))
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: { ...prev[product.id], product: { ...prev[product.id].product, barcode: newCode } },
        }))
      }
      toast.success(`Regenerated barcode for "${product.name}": ${newCode}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate barcode')
    }
  }

  // Delete / Clear Barcode for Single Product
  const handleDeleteSingle = async (product) => {
    if (!window.confirm(`Are you sure you want to remove the barcode for "${product.name}"?`)) {
      return
    }
    try {
      await api.patch(`/admin/products/${product.id}`, { barcode: '' })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, barcode: null } : p)))
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: { ...prev[product.id], product: { ...prev[product.id].product, barcode: null } },
        }))
      }
      toast.success(`Barcode removed for "${product.name}"`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete barcode')
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

  // Delete manual barcode from modal
  const handleDeleteManualBarcode = async () => {
    if (!editingBarcodeProduct) return
    if (!window.confirm(`Delete barcode for "${editingBarcodeProduct.name}"?`)) return

    setSavingBarcode(true)
    try {
      await api.patch(`/admin/products/${editingBarcodeProduct.id}`, { barcode: '' })
      setProducts((prev) =>
        prev.map((p) => (p.id === editingBarcodeProduct.id ? { ...p, barcode: null } : p))
      )
      if (printQueue[editingBarcodeProduct.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [editingBarcodeProduct.id]: {
            ...prev[editingBarcodeProduct.id],
            product: { ...prev[editingBarcodeProduct.id].product, barcode: null },
          },
        }))
      }
      toast.success(`Barcode removed for "${editingBarcodeProduct.name}"`)
      setEditingBarcodeProduct(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove barcode')
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
  // Print Action
  const handleTriggerPrint = (itemsOverride = null) => {
    const isSingleTest = Array.isArray(itemsOverride)
    const targetItems = isSingleTest ? itemsOverride : printableLabelArray

    if (!isSingleTest && targetItems.length === 0) {
      return toast.error('Please select at least one product to print')
    }
    
    if (labelTemplate === 'sheet_a4' && !isSingleTest) {
      window.print()
      return
    }

    const printWindow = window.open('', '_blank', 'width=650,height=650')
    if (!printWindow) {
      return toast.error('Pop-up window blocked. Please allow pop-ups to print barcode labels.')
    }

    let pageSize = '50mm 30mm'
    let w = '50mm'
    let h = '30mm'
    let innerH = '29.3mm'
    let barcodeH = '8.5mm'
    let fontSizeName = '9.5px'
    let fontSizePrice = '12px'

    if (labelTemplate === 'compact_40x20') {
      pageSize = '40mm 20mm'
      w = '40mm'
      h = '20mm'
      innerH = '19.4mm'
      barcodeH = '6mm'
      fontSizeName = '8px'
      fontSizePrice = '10px'
    } else if (labelTemplate === 'crate_100x75') {
      pageSize = '100mm 75mm'
      w = '100mm'
      h = '75mm'
      innerH = '74mm'
      barcodeH = '28mm'
      fontSizeName = '16px'
      fontSizePrice = '22px'
    }

    // Grab the rendered SVGs from the hidden canvas or queue preview
    const getSvgStr = (val) => {
      const bHtml = document.querySelector(`#printable-barcode-canvas .bc-${val}`)?.innerHTML || ''
      return bHtml
    }

    const labelsHtml = targetItems.map(item => {
      const priceStr = formatNaira(item.price || item.unit_price)
      const svgContainer = document.getElementById(`svg-queue-${item.id}-${item.copyIndex}`)
      const svg = svgContainer?.querySelector('svg')?.outerHTML 
        || svgContainer?.outerHTML 
        || getSvgStr(item.barcodeValue) 
        || ''
      
      return `
        <div class="label-page">
          ${showBrandHeader ? `
            <div class="header">
              <span class="brand-pill">BEMS FARMS</span>
              <span class="brand-tag">Fresh Produce</span>
            </div>
          ` : ''}
          ${showProductName ? `<div class="name" title="${item.name}">${item.name}</div>` : ''}
          ${showPrice ? `
            <div class="price-row">
              <span class="price">${priceStr}</span>
              ${showCategory ? `<span class="unit">${item.unit || 'Per Unit'}</span>` : ''}
            </div>
          ` : ''}
          <div class="barcode">${svg}</div>
          ${showSku ? `<div class="sku">${item.barcodeValue}</div>` : ''}
          ${showDates ? `
            <div class="dates">
              <span>PKD: ${new Date().toLocaleDateString('en-GB')}</span>
              <span>Origin: Nigeria</span>
            </div>
          ` : ''}
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${isSingleTest ? 'XP-365B Test Label (50x30)' : 'Bems Farms Barcode Labels'}</title>
          <style>
            @page { 
              size: ${pageSize}; 
              margin: 0mm; 
            }
            * {
              box-sizing: border-box;
            }
            html, body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              margin: 0 !important; 
              padding: 0 !important;
              background: #fff;
              color: #000;
              width: ${w};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-page {
              width: ${w};
              height: ${innerH};
              max-height: ${innerH};
              padding: 1.5mm 1.8mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #fff;
            }
            .label-page:not(:last-child) {
              page-break-after: always;
              break-after: page;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              font-size: ${labelTemplate==='crate_100x75' ? '12px' : '7px'}; 
              font-weight: 800; 
              border-bottom: 1px solid #000; 
              padding-bottom: 1px; 
              margin-bottom: 1px; 
            }
            .brand-pill { 
              background: #000; 
              color: #fff; 
              padding: 0.5px 3.5px; 
              border-radius: 2px; 
              letter-spacing: 0.5px;
            }
            .brand-tag {
              color: #333;
              font-size: 6.5px;
            }
            .name { 
              font-size: ${fontSizeName}; 
              font-weight: 700; 
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              line-height: 1.15;
            }
            .price-row { 
              display: flex; 
              justify-content: space-between; 
              align-items: baseline; 
              line-height: 1.1;
            }
            .price { 
              font-size: ${fontSizePrice}; 
              font-weight: 900; 
              color: #000;
            }
            .unit { 
              font-size: ${labelTemplate==='crate_100x75' ? '11px' : '7.5px'}; 
              font-weight: 600;
              color: #444; 
            }
            .barcode { 
              text-align: center; 
              display: flex;
              justify-content: center;
              align-items: center;
              margin: auto 0 0;
              line-height: 1;
            }
            .barcode svg { 
              height: ${barcodeH} !important; 
              width: auto !important; 
              max-width: 98% !important; 
              shape-rendering: crispEdges !important;
            }
            .sku { 
              text-align: center; 
              font-size: ${labelTemplate==='crate_100x75' ? '11px' : '7.5px'}; 
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
              font-weight: 700;
              letter-spacing: 0.5px;
              line-height: 1;
              margin-top: 1px;
            }
            .dates { 
              display: flex; 
              justify-content: space-between; 
              font-size: ${labelTemplate==='crate_100x75' ? '9px' : '6px'}; 
              color: #444; 
              border-top: 0.5px solid #666; 
              padding-top: 1px; 
              margin-top: 1px; 
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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

  // Print a single test label (50x30mm) for XP-365B alignment verification
  const handlePrintTestLabel = () => {
    let testItem = null
    if (printableLabelArray.length > 0) {
      testItem = { ...printableLabelArray[0], copyIndex: 1, totalCopies: 1 }
    } else if (products.length > 0) {
      const p = products[0]
      testItem = {
        ...p,
        barcodeValue: p.barcode || p.sku || `BF-${p.id}`,
        copyIndex: 1,
        totalCopies: 1,
      }
    } else {
      testItem = {
        id: 'test-demo-1',
        name: 'Fresh Farm Produce Sample',
        price: 3500,
        unit: 'Per Unit',
        barcodeValue: '61500001001',
        copyIndex: 1,
        totalCopies: 1,
      }
    }
    handleTriggerPrint([testItem])
  }

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
            className="btn btn-outline-secondary d-flex align-items-center gap-1.5 shadow-sm"
            onClick={() => setShowPrinterGuideModal(true)}
            title="Open Xprinter XP-365B setup, calibration & driver guide"
          >
            <i className="ri-settings-5-line"></i> XP-365B Setup Guide
          </button>

          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-1.5 shadow-sm"
            onClick={handlePrintTestLabel}
            title="Print 1 sample 50x30mm label to test Xprinter XP-365B alignment"
          >
            <i className="ri-printer-line"></i> Test 1 Label (50×30)
          </button>

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
            onClick={() => handleTriggerPrint()}
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
          <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-indigo">
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2">
                  Total Catalog Products
                </span>
                <span className="kpi-icon-pill" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                  <i className="ri-box-3-line fs-18"></i>
                </span>
              </div>
              <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                {totalProducts}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>Master Catalog</span>
                <strong className="text-dark font-monospace">{totalProducts} SKUs</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Barcodes */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-green">
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2">
                  Universal Code Assigned
                </span>
                <span className="kpi-icon-pill" style={{ background: '#ECFDF5', color: '#059669' }}>
                  <i className="ri-checkbox-circle-line fs-18"></i>
                </span>
              </div>
              <div className="fs-24 fw-bolder text-emerald mb-1 font-display">
                {productsWithBarcode.length}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>Catalog Coverage</span>
                <span className="badge bg-success-subtle text-success font-monospace text-xs px-2">
                  {barcodeCoveragePct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Missing Barcode Action Alert */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${productsMissingBarcode.length > 0 ? 'bg-card-glow-amber' : 'bg-card-glow-teal'}`}>
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2">
                  Missing Barcodes
                </span>
                <span className="kpi-icon-pill" style={{ background: productsMissingBarcode.length > 0 ? '#FEF3C7' : '#F0FDFA', color: productsMissingBarcode.length > 0 ? '#D97706' : '#0D9488' }}>
                  <i className={productsMissingBarcode.length > 0 ? 'ri-alert-line fs-18' : 'ri-shield-check-line fs-18'}></i>
                </span>
              </div>
              <div className={`fs-24 fw-bolder mb-1 font-display ${productsMissingBarcode.length > 0 ? 'text-amber' : 'text-dark'}`}>
                {productsMissingBarcode.length}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>POS Readiness</span>
                <strong className={productsMissingBarcode.length > 0 ? 'text-amber font-monospace' : 'text-dark font-monospace'}>
                  {productsMissingBarcode.length > 0 ? 'Action Needed' : 'All Encoded'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Print Queue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-blue">
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2">
                  Print Batch Queue
                </span>
                <span className="kpi-icon-pill" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <i className="ri-printer-cloud-line fs-18"></i>
                </span>
              </div>
              <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                {totalLabelsInQueue}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>Batch Queue</span>
                <strong className="text-dark font-monospace">{Object.keys(printQueue).length} SKUs</strong>
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
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => addAllToQueue(filteredProducts)}
                    title="Add all currently filtered items to print queue with copies matching stock count"
                  >
                    <i className="ri-add-circle-line me-1"></i> Queue Filtered
                  </button>
                  {Object.keys(printQueue).length > 0 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={syncAllToStock}
                        title="Set copies of all queued items to match their live stock quantity"
                      >
                        <i className="ri-refresh-line me-1"></i> Match Stock Qty
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearQueue}
                        title="Clear print queue"
                      >
                        Clear Queue
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Search + Filter – sticky so it stays visible while scrolling the table */}
              <div
                className="row g-2"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  background: '#fff',
                  paddingBottom: 8,
                }}
              >
                {/* Search */}
                <div className="col-12 col-md-7">
                  <div className="input-group shadow-sm">
                    <span className="input-group-text bg-white border-end-0 text-success">
                      <i className="ri-search-2-line fw-bold"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="🔍 Search product name, SKU, or barcode…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ borderLeft: 'none' }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-2"
                        onClick={() => setSearchTerm('')}
                        title="Clear search"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Select */}
                <div className="col-12 col-md-5">
                  <select
                    className="form-select"
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

              {/* Result count */}
              {searchTerm && (
                <div className="text-muted fs-xs mb-1 mt-1">
                  <i className="ri-filter-3-line me-1"></i>
                  {filteredProducts.length === 0
                    ? 'No products match your search'
                    : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
                </div>
              )}
            </div>

            {/* Table of Products — plain div for reliable x+y scroll */}
            <div
              style={{
                maxHeight: '65vh',
                overflowY: 'auto',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <table className="table table-hover align-middle mb-0" style={{ whiteSpace: 'nowrap', minWidth: 700 }}>
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
                    <th>Price &amp; Stock</th>
                    <th>Universal Barcode</th>
                    <th>Copies to Print</th>
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
                      const stockCount = Math.max(1, parseInt(p.stock ?? p.stock_quantity ?? p.quantity ?? 1) || 1)
                      const copies = printQueue[p.id]?.copies || stockCount
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
                          <td>
                            <div className="fw-bold text-dark fs-sm">{formatNaira(p.price || p.unit_price)}</div>
                            <div className="d-flex align-items-center gap-1 mt-1">
                              <span
                                className={`badge ${
                                  Number(p.stock ?? p.stock_quantity ?? 0) > 0
                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                    : 'bg-danger-subtle text-danger border border-danger-subtle'
                                } fs-xs py-0`}
                              >
                                Stock: {p.stock ?? p.stock_quantity ?? 0} {p.unit || 'units'}
                              </span>
                            </div>
                          </td>
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
                            <div className="d-flex align-items-center gap-1">
                              <div className="input-group input-group-sm" style={{ width: '92px' }}>
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
                                  className="form-control text-center px-1 font-monospace fw-bold"
                                  min="1"
                                  max="9999"
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
                              {isQueued && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-success py-1 px-1 rounded"
                                  title={`Match stock count (${p.stock ?? p.stock_quantity ?? 0})`}
                                  onClick={() => setQueueCopiesDirect(p.id, p.stock ?? p.stock_quantity ?? 1)}
                                >
                                  <i className="ri-magic-line"></i>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="text-end pe-3">
                            <div className="btn-group btn-group-sm">
                              {hasBarcode ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-success"
                                  onClick={() => handleRegenerateSingle(p)}
                                  title="Regenerate New Barcode"
                                >
                                  <i className="ri-refresh-line"></i>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline-success"
                                  onClick={() => handleGenerateSingle(p)}
                                  title="Generate Barcode"
                                >
                                  <i className="ri-magic-line"></i>
                                </button>
                              )}
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
                              {hasBarcode && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteSingle(p)}
                                  title="Delete Barcode"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              )}
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
                  <option value="thermal_50x30">Standard Item / Shelf (50mm × 30mm) — XP-365B Recommended</option>
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
              <div id={`svg-queue-${item.id}-${item.copyIndex}`} style={{ margin: '3px 0' }}>
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

              <div className="modal-footer border-0 pt-0 d-flex justify-content-between">
                <div>
                  {editingBarcodeProduct.barcode && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={handleDeleteManualBarcode}
                      disabled={savingBarcode}
                    >
                      <i className="ri-delete-bin-line me-1"></i> Delete Barcode
                    </button>
                  )}
                </div>
                <div className="d-flex gap-2">
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
        </div>
      )}

      {/* ── Modal: Xprinter XP-365B Setup & Calibration Guide ────── */}
      {showPrinterGuideModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 shadow-lg border-0 overflow-hidden">
              <div className="modal-header bg-dark text-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="avatar size-9 rounded-2 bg-success text-white d-flex align-items-center justify-content-center">
                    <i className="ri-printer-line fs-4"></i>
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold text-white mb-0">Xprinter XP-365B Configuration Guide</h6>
                    <small className="text-light opacity-75">
                      Standard 50mm × 30mm Barcode &amp; Shelf Label Setup
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowPrinterGuideModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Quick Info Badges */}
                <div className="d-flex gap-2 flex-wrap mb-4">
                  <span className="badge bg-primary-subtle text-primary border px-2.5 py-1.5 font-monospace">
                    <i className="ri-ruler-line me-1"></i> 50mm (W) × 30mm (H)
                  </span>
                  <span className="badge bg-success-subtle text-success border px-2.5 py-1.5">
                    <i className="ri-checkbox-circle-line me-1"></i> Gap Roll (Die-Cut)
                  </span>
                  <span className="badge bg-warning-subtle text-dark border px-2.5 py-1.5">
                    <i className="ri-alert-line me-1"></i> Margins: None (0mm)
                  </span>
                  <span className="badge bg-secondary-subtle text-dark border px-2.5 py-1.5 font-monospace">
                    203 DPI / 8 dots/mm
                  </span>
                </div>

                {/* Step 1: Gap Sensor Calibration */}
                <div className="card border-0 shadow-none bg-light rounded-3 p-3.5 mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-dark rounded-circle size-6 d-inline-flex align-items-center justify-content-center text-white fw-bold">
                      1
                    </span>
                    <h6 className="mb-0 fw-bold text-dark">Hardware Gap Sensor Calibration (Crucial)</h6>
                  </div>
                  <p className="text-muted small mb-2">
                    Prevents the XP-365B from feeding blank labels or stopping midway across labels:
                  </p>
                  <ol className="small text-dark mb-0 ps-3" style={{ lineHeight: '1.7' }}>
                    <li>Ensure the 50×30mm roll is loaded thermal side up, and paper roll guides are snug against the roll.</li>
                    <li>Turn the printer power switch <strong>OFF</strong>.</li>
                    <li>Press and <strong>HOLD the PAUSE / FEED button</strong> on the printer front.</li>
                    <li>While holding the button, flip the power switch <strong>ON</strong>.</li>
                    <li>When you hear <strong>2 quick beeps</strong>, release the button immediately.</li>
                    <li>The printer feeds 2–3 labels and halts precisely on the tear-off gap line.</li>
                    <li>Tap the <strong>FEED button once</strong>: it should feed exactly 1 label and stop on the gap.</li>
                  </ol>
                </div>

                {/* Step 2: Browser Print Dialog Settings */}
                <div className="card border-0 shadow-none bg-light rounded-3 p-3.5 mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-primary rounded-circle size-6 d-inline-flex align-items-center justify-content-center text-white fw-bold">
                      2
                    </span>
                    <h6 className="mb-0 fw-bold text-dark">Browser Print Dialog Settings (Chrome / Edge / Safari)</h6>
                  </div>
                  <p className="text-muted small mb-2">
                    When you click <strong>Print Queue</strong> or <strong>Test 1 Label</strong>, set these in the print pop-up:
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered bg-white small mb-0">
                      <tbody>
                        <tr>
                          <td className="fw-bold bg-light" style={{ width: '35%' }}>Destination</td>
                          <td>Select <code>Xprinter XP-365B</code> (or 2-inch label driver)</td>
                        </tr>
                        <tr>
                          <td className="fw-bold bg-light">Paper Size</td>
                          <td>Select <code>50mm x 30mm</code> (or custom 50×30 defined in driver)</td>
                        </tr>
                        <tr className="table-warning">
                          <td className="fw-bold text-danger">Margins (CRITICAL)</td>
                          <td>
                            <strong>Set to "None" (0mm)</strong><br />
                            <small className="text-muted">Leaving on 'Default' adds 10mm margins, which shrinks and clips the label.</small>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold bg-light">Scale</td>
                          <td><code>100%</code> / Default</td>
                        </tr>
                        <tr>
                          <td className="fw-bold bg-light">Options / Checkboxes</td>
                          <td>
                            <strong>Uncheck "Headers and footers"</strong><br />
                            <small className="text-muted">Prevents the browser URL and date from printing across the top/bottom of stickers.</small>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step 3: Operating System Driver Setup */}
                <div className="card border-0 shadow-none bg-light rounded-3 p-3.5 mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-success rounded-circle size-6 d-inline-flex align-items-center justify-content-center text-white fw-bold">
                      3
                    </span>
                    <h6 className="mb-0 fw-bold text-dark">OS Driver Paper Size Definition</h6>
                  </div>
                  <div className="row g-3 small">
                    <div className="col-12 col-md-6 border-end-md">
                      <div className="fw-bold text-dark mb-1">
                        <i className="ri-windows-line text-primary me-1"></i> Windows Setup:
                      </div>
                      <ol className="ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                        <li>Open <strong>Control Panel → Devices &amp; Printers</strong>.</li>
                        <li>Right-click <code>XP-365B</code> → <strong>Printing Preferences</strong>.</li>
                        <li>Under <strong>Page Setup</strong>, click <strong>New Stock</strong>:
                          <br />&bull; Name: <code>50x30</code>
                          <br />&bull; Width: <code>50.0 mm</code>, Height: <code>30.0 mm</code>
                        </li>
                        <li>Under <strong>Stock / Media Type</strong>:
                          <br />&bull; Type: <code>Labels with Gaps</code>
                          <br />&bull; Gap Height: <code>2.0 mm</code>
                        </li>
                        <li>Under <strong>Options</strong>: Speed <code>2.0 - 3.0 in/s</code>, Darkness: <code>10 - 12</code>.</li>
                      </ol>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="fw-bold text-dark mb-1">
                        <i className="ri-apple-line text-dark me-1"></i> macOS Setup:
                      </div>
                      <ol className="ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                        <li>Open <strong>System Settings → Printers &amp; Scanners</strong>.</li>
                        <li>Select <code>XP-365B</code>.</li>
                        <li>Under <strong>Default Paper Size</strong>, choose <strong>Manage Custom Sizes</strong>.</li>
                        <li>Click <code>+</code>:
                          <br />&bull; Name: <code>50x30mm</code>
                          <br />&bull; Width: <code>50 mm</code>, Height: <code>30 mm</code>
                          <br />&bull; Non-Printable Area (Margins): <code>0 mm</code> on all sides.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Instant Test Label Callout */}
                <div className="border border-success-subtle bg-success-subtle p-3 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h6 className="mb-0 fw-bold text-success-emphasis">Ready to verify your XP-365B?</h6>
                    <small className="text-success-emphasis">
                      Click below to print 1 single test label with sample barcode and verify alignment.
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-success d-inline-flex align-items-center gap-1.5 shadow-sm"
                    onClick={() => {
                      handlePrintTestLabel()
                    }}
                  >
                    <i className="ri-printer-line"></i> Print 1 Test Label (50×30)
                  </button>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light py-2.5 px-4 d-flex justify-content-between">
                <span className="small text-muted">
                  Bems Farms POS &bull; Universal Goods Code (UGC) System
                </span>
                <button
                  type="button"
                  className="btn btn-dark px-4"
                  onClick={() => setShowPrinterGuideModal(false)}
                >
                  Done / Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
