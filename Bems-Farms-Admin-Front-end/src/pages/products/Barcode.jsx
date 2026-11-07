import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import BarcodeSvg from '../../components/ui/BarcodeSvg'
import { generateUniversalGoodsCode, renderBarcodeToElement } from '../../lib/barcodeGenerator'

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
  const [printTarget, setPrintTarget] = useState('piece') // 'piece' | 'carton'
  const [rowTargetOverrides, setRowTargetOverrides] = useState({}) // productId -> 'piece' | 'carton'
  
  // Label Customizer Settings
  const [labelTemplate, setLabelTemplate] = useState('thermal_50x25') // 'thermal_50x25' | 'thermal_50x30' | 'compact_40x20' | 'crate_100x75' | 'sheet_a4'
  const [showBrandHeader, setShowBrandHeader] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [showCategory, setShowCategory] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showHumanCode, setShowHumanCode] = useState(true)
  const [showDates, setShowDates] = useState(false)
  
  // Single preview / manual edit state
  const [editingBarcodeProduct, setEditingBarcodeProduct] = useState(null)
  const [editBarcodeTarget, setEditBarcodeTarget] = useState('piece') // 'piece' | 'carton'
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
        api.get('/admin/products', { params: { limit: 500 } }),
        api.get('/admin/products/form-data').catch(() => ({ data: {} })),
      ])
      
      const prods = prodRes.data?.products || []

      // Clean up legacy unscoped localStorage cache so it does not falsely mark unprinted tiers
      try {
        localStorage.removeItem('bems_barcode_last_printed')
      } catch {}

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

  // Format relative last printed timestamp
  const formatLastPrinted = (dateStr) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`

      const isToday = date.toDateString() === now.toDateString()
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (isToday) return `Today, ${timeStr}`

      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`

      return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${timeStr}`
    } catch {
      return null
    }
  }

  const formatCartonStock = (totalStock, pcsPerCarton, cartonUnit = 'Carton', pieceUnit = 'Pcs') => {
    const stock = parseInt(totalStock) || 0
    const perCarton = parseInt(pcsPerCarton) || 0
    if (perCarton <= 1) {
      return `${stock} ${pieceUnit || 'Pcs'}`
    }
    const cartons = Math.floor(stock / perCarton)
    const loosePcs = stock % perCarton

    if (cartons > 0 && loosePcs > 0) {
      const ctnLabel = cartons === 1 ? (cartonUnit || 'Carton') : `${cartonUnit || 'Carton'}s`
      return `${cartons} ${ctnLabel}, ${loosePcs} ${pieceUnit || 'Pcs'}`
    } else if (cartons > 0 && loosePcs === 0) {
      const ctnLabel = cartons === 1 ? (cartonUnit || 'Carton') : `${cartonUnit || 'Carton'}s`
      return `${cartons} ${ctnLabel}`
    } else {
      return `${loosePcs} ${pieceUnit || 'Pcs'}`
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [targetProductId])

  // Stats calculation - Scoped strictly to active packaging tier
  const packagingScopedProducts = useMemo(() => {
    if (printTarget === 'carton') {
      return products.filter((p) => Number(p.pcs_per_carton) > 1)
    }
    if (printTarget === 'row') {
      return products.filter((p) => Number(p.pcs_per_mid_unit) > 1)
    }
    return products
  }, [products, printTarget])

  const totalProducts = packagingScopedProducts.length

  const productsWithBarcode = useMemo(() => {
    return packagingScopedProducts.filter((p) => {
      const bc = printTarget === 'carton' ? p.carton_barcode : printTarget === 'row' ? p.mid_barcode : p.barcode
      return Boolean(bc && bc.trim())
    })
  }, [packagingScopedProducts, printTarget])

  const productsMissingBarcode = useMemo(() => {
    return packagingScopedProducts.filter((p) => {
      const bc = printTarget === 'carton' ? p.carton_barcode : printTarget === 'row' ? p.mid_barcode : p.barcode
      return !bc || !bc.trim()
    })
  }, [packagingScopedProducts, printTarget])

  const productsUnprinted = useMemo(() => {
    return packagingScopedProducts.filter((p) => {
      const bc = printTarget === 'carton' ? p.carton_barcode : printTarget === 'row' ? p.mid_barcode : p.barcode
      const printedAt = printTarget === 'carton'
        ? p.carton_barcode_last_printed_at
        : printTarget === 'row'
        ? p.mid_barcode_last_printed_at
        : p.barcode_last_printed_at
      return bc && bc.trim() && !printedAt
    })
  }, [packagingScopedProducts, printTarget])

  const barcodeCoveragePct = totalProducts > 0 ? Math.round((productsWithBarcode.length / totalProducts) * 100) : 0

  // Filtered products list
  const filteredProducts = useMemo(() => {
    // If activeTab is 'queue', show all items in printQueue directly
    const baseList = activeTab === 'queue'
      ? products.filter((p) => Boolean(printQueue[p.id]))
      : packagingScopedProducts

    return baseList.filter((p) => {
      // Tab filter
      if (activeTab === 'with_barcode') {
        const hasBc = printTarget === 'carton'
          ? Boolean(p.carton_barcode && p.carton_barcode.trim())
          : printTarget === 'row'
          ? Boolean(p.mid_barcode && p.mid_barcode.trim())
          : Boolean(p.barcode && p.barcode.trim())
        if (!hasBc) return false
      }
      if (activeTab === 'missing_barcode') {
        const hasBc = printTarget === 'carton'
          ? Boolean(p.carton_barcode && p.carton_barcode.trim())
          : printTarget === 'row'
          ? Boolean(p.mid_barcode && p.mid_barcode.trim())
          : Boolean(p.barcode && p.barcode.trim())
        if (hasBc) return false
      }
      if (activeTab === 'unprinted') {
        const hasBc = printTarget === 'carton'
          ? Boolean(p.carton_barcode && p.carton_barcode.trim())
          : printTarget === 'row'
          ? Boolean(p.mid_barcode && p.mid_barcode.trim())
          : Boolean(p.barcode && p.barcode.trim())
        const printedAt = printTarget === 'carton'
          ? p.carton_barcode_last_printed_at
          : printTarget === 'row'
          ? p.mid_barcode_last_printed_at
          : p.barcode_last_printed_at
        if (!hasBc || printedAt) return false
      }
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
        const midBcMatch = p.mid_barcode?.toLowerCase().includes(q)
        const cartonBcMatch = p.carton_barcode?.toLowerCase().includes(q)
        if (!nameMatch && !skuMatch && !bcMatch && !midBcMatch && !cartonBcMatch) return false
      }

      return true
    })
  }, [products, packagingScopedProducts, activeTab, categoryFilter, searchTerm, printQueue, printTarget])

  // Determine whether an individual product row is in Carton mode, Row mode, or Piece mode
  const getRowTarget = (product) => {
    if (!product) return 'piece'
    if (rowTargetOverrides[product.id]) return rowTargetOverrides[product.id]
    if (printTarget === 'carton' && Number(product.pcs_per_carton) > 1) return 'carton'
    if (printTarget === 'row' && Number(product.pcs_per_mid_unit) > 1) return 'row'
    return 'piece'
  }

  // Toggle packaging mode for a specific product row
  const toggleRowTarget = (productId, target) => {
    setRowTargetOverrides((prev) => ({
      ...prev,
      [productId]: target,
    }))
    if (printQueue[productId]) {
      const prod = printQueue[productId].product
      const copies = getProductStockCopies(prod, target)
      setPrintQueue((prev) => ({
        ...prev,
        [productId]: { ...prev[productId], copies },
      }))
    }
  }

  // Queue manipulation - Defaults copies to actual stock quantity (pieces, rows, or cartons depending on target)
  const getProductStockCopies = (p, target = printTarget) => {
    const rawStock = parseInt(p.stock ?? p.stock_quantity ?? p.quantity ?? 1) || 1
    if (target === 'carton' && Number(p.pcs_per_carton) > 1) {
      return Math.max(1, Math.floor(rawStock / (p.pcs_per_carton || 1)))
    }
    if (target === 'row' && Number(p.pcs_per_mid_unit) > 1) {
      return Math.max(1, Math.floor(rawStock / (p.pcs_per_mid_unit || 1)))
    }
    return Math.max(1, rawStock)
  }

  const toggleQueueItem = (product) => {
    const rowTgt = getRowTarget(product)
    setPrintQueue((prev) => {
      const next = { ...prev }
      if (next[product.id]) {
        delete next[product.id]
      } else {
        const stockQty = getProductStockCopies(product, rowTgt)
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
          const rowTgt = getRowTarget(p)
          const stockQty = getProductStockCopies(p, rowTgt)
          next[p.id] = { product: p, copies: stockQty }
        }
      })
      return next
    })
    toast.success(`Added ${items.length} items to print queue (copies auto-filled for ${printTarget === 'carton' ? 'bulk cartons' : 'retail pieces'})`)
  }

  const syncAllToStock = () => {
    setPrintQueue((prev) => {
      const next = {}
      const targetList = Object.keys(prev).length > 0 ? Object.values(prev).map(item => item.product) : filteredProducts
      targetList.forEach((prod) => {
        const rowTgt = getRowTarget(prod)
        const stockQty = getProductStockCopies(prod, rowTgt)
        next[prod.id] = { product: prod, copies: stockQty }
      })
      return next
    })
    toast.success(`Synced print copies to match ${printTarget === 'carton' ? 'carton counts' : printTarget === 'row' ? 'row counts' : 'piece inventory'}`)
  }

  // Set uniform batch copies across all items (e.g. 10, 20, 30, 40 of each item)
  const setBatchCopiesForAll = (count) => {
    const qty = Math.max(1, parseInt(count) || 1)
    setPrintQueue((prev) => {
      const next = {}
      // If queue is empty or has items, apply to all currently active/queued products
      const targetList = Object.keys(prev).length > 0 ? Object.values(prev).map(item => item.product) : filteredProducts
      targetList.forEach((prod) => {
        next[prod.id] = { product: prod, copies: qty }
      })
      return next
    })
    toast.success(`Set ${qty} cop${qty === 1 ? 'y' : 'ies'} each across all items`)
  }

  const handleSwitchPrintTarget = (newTarget) => {
    if (newTarget === printTarget) return
    setPrintTarget(newTarget)
    setRowTargetOverrides({}) // Clear manual row overrides so entire table follows switch
    setPrintQueue((prev) => {
      const next = {}
      Object.entries(prev).forEach(([id, item]) => {
        const stockQty = getProductStockCopies(item.product, newTarget)
        next[id] = { ...item, copies: stockQty }
      })
      return next
    })
    toast.success(
      newTarget === 'carton'
        ? 'Switched table & labels to Bulk Cartons (Carton Barcodes active)'
        : newTarget === 'row'
        ? 'Switched table & labels to Mid Rows/Packs (Row Barcodes active)'
        : 'Switched table & labels to Retail Pieces (Piece Barcodes active)'
    )
  }

  const clearQueue = () => {
    setPrintQueue({})
    toast.success('Print queue cleared')
  }

  const handleCopyBarcode = (code, label = 'Barcode') => {
    if (!code) return
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
      toast.success(`Copied ${label}: ${code}`)
    } else {
      toast.success(`Barcode: ${code}`)
    }
  }

  const totalLabelsInQueue = useMemo(() => {
    return Object.values(printQueue).reduce((sum, item) => sum + (item.copies || 1), 0)
  }, [printQueue])

  // Single Product Barcode Generation / Assignment (Piece, Row, or Carton)
  const handleGenerateSingle = async (product, target = 'piece') => {
    const isCarton = target === 'carton'
    const isRow = target === 'row'
    const newCode = generateUniversalGoodsCode(product, symbology, target)
    try {
      const payload = isCarton
        ? { carton_barcode: newCode }
        : isRow
        ? { mid_barcode: newCode }
        : { barcode: newCode }
      await api.patch(`/admin/products/${product.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, ...payload }
            : p
        )
      )
      // Update queue item if present
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            product: {
              ...prev[product.id].product,
              ...payload,
            },
          },
        }))
      }
      const labelTier = isCarton ? 'Carton' : isRow ? 'Row' : 'Piece'
      toast.success(`Generated ${labelTier} Barcode: ${newCode}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save generated barcode')
    }
  }

  // Regenerate Barcode for Single Product (Piece, Row, or Carton)
  const handleRegenerateSingle = async (product, target = 'piece') => {
    const isCarton = target === 'carton'
    const isRow = target === 'row'
    const newCode = generateUniversalGoodsCode(product, symbology, target)
    try {
      const payload = isCarton
        ? { carton_barcode: newCode }
        : isRow
        ? { mid_barcode: newCode }
        : { barcode: newCode }
      await api.patch(`/admin/products/${product.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, ...payload }
            : p
        )
      )
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            product: {
              ...prev[product.id].product,
              ...payload,
            },
          },
        }))
      }
      const labelTier = isCarton ? 'Carton' : isRow ? 'Row' : 'Piece'
      toast.success(`Regenerated ${labelTier} barcode for "${product.name}": ${newCode}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate barcode')
    }
  }

  // Delete / Clear Barcode for Single Product (Piece, Row, or Carton)
  const handleDeleteSingle = async (product, target = 'piece') => {
    const isCarton = target === 'carton'
    const isRow = target === 'row'
    const label = isCarton ? 'carton barcode' : isRow ? 'row barcode' : 'piece barcode'
    if (!window.confirm(`Are you sure you want to remove the ${label} for "${product.name}"?`)) {
      return
    }
    try {
      const payload = isCarton ? { carton_barcode: '' } : isRow ? { mid_barcode: '' } : { barcode: '' }
      const clearUpdate = isCarton ? { carton_barcode: null } : isRow ? { mid_barcode: null } : { barcode: null }
      await api.patch(`/admin/products/${product.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, ...clearUpdate }
            : p
        )
      )
      if (printQueue[product.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            product: {
              ...prev[product.id].product,
              ...clearUpdate,
            },
          },
        }))
      }
      toast.success(`${isCarton ? 'Carton' : isRow ? 'Row' : 'Piece'} barcode removed for "${product.name}"`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete barcode')
    }
  }

  // Auto-Generate Barcodes for ALL Missing Products
  const handleAutoGenerateAllMissing = async () => {
    const isCartonMode = printTarget === 'carton'
    const isRowMode = printTarget === 'row'
    const missingItems = isCartonMode
      ? products.filter((p) => Number(p.pcs_per_carton) > 1 && (!p.carton_barcode || !p.carton_barcode.trim()))
      : isRowMode
      ? products.filter((p) => Number(p.pcs_per_mid_unit) > 1 && (!p.mid_barcode || !p.mid_barcode.trim()))
      : products.filter((p) => !p.barcode || !p.barcode.trim())

    const targetLabel = isCartonMode ? 'bulk carton' : isRowMode ? 'mid-tier row/pack' : 'retail piece'
    if (missingItems.length === 0) {
      return toast.success(`All ${targetLabel} items already have barcodes assigned!`)
    }

    if (!window.confirm(`Generate Universal Bems Codes for all ${missingItems.length} uncoded ${targetLabel} items?`)) {
      return
    }

    setAutoGeneratingAll(true)
    let successCount = 0
    let failureCount = 0

    const updatedProducts = [...products]

    for (const prod of missingItems) {
      const newCode = generateUniversalGoodsCode(prod, symbology, printTarget)
      try {
        const payload = isCartonMode ? { carton_barcode: newCode } : isRowMode ? { mid_barcode: newCode } : { barcode: newCode }
        await api.patch(`/admin/products/${prod.id}`, payload)
        const idx = updatedProducts.findIndex((p) => p.id === prod.id)
        if (idx !== -1) {
          updatedProducts[idx] = {
            ...updatedProducts[idx],
            ...payload,
          }
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
      toast.success(`Successfully assigned ${targetLabel} barcodes to ${successCount} products!`)
    }
    if (failureCount > 0) {
      toast.error(`Failed to assign barcodes to ${failureCount} products`)
    }
  }

  // Save manual barcode (Piece, Row, or Carton)
  const handleSaveManualBarcode = async () => {
    if (!editingBarcodeProduct) return
    const trimmed = customBarcodeVal.trim()
    if (!trimmed) {
      return toast.error('Barcode cannot be blank')
    }

    const isCarton = editBarcodeTarget === 'carton'
    const isRow = editBarcodeTarget === 'row'
    setSavingBarcode(true)
    try {
      const payload = isCarton ? { carton_barcode: trimmed } : isRow ? { mid_barcode: trimmed } : { barcode: trimmed }
      await api.patch(`/admin/products/${editingBarcodeProduct.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingBarcodeProduct.id
            ? { ...p, ...payload }
            : p
        )
      )
      if (printQueue[editingBarcodeProduct.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [editingBarcodeProduct.id]: {
            ...prev[editingBarcodeProduct.id],
            product: {
              ...prev[editingBarcodeProduct.id].product,
              ...payload,
            },
          },
        }))
      }
      const label = isCarton ? 'Carton' : isRow ? 'Row' : 'Piece'
      toast.success(`${label} barcode updated successfully`)
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
    const isCarton = editBarcodeTarget === 'carton'
    const isRow = editBarcodeTarget === 'row'
    const label = isCarton ? 'carton barcode' : isRow ? 'row barcode' : 'piece barcode'
    if (!window.confirm(`Delete ${label} for "${editingBarcodeProduct.name}"?`)) return

    setSavingBarcode(true)
    try {
      const payload = isCarton ? { carton_barcode: '' } : isRow ? { mid_barcode: '' } : { barcode: '' }
      const clearUpdate = isCarton ? { carton_barcode: null } : isRow ? { mid_barcode: null } : { barcode: null }
      await api.patch(`/admin/products/${editingBarcodeProduct.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingBarcodeProduct.id
            ? { ...p, ...clearUpdate }
            : p
        )
      )
      if (printQueue[editingBarcodeProduct.id]) {
        setPrintQueue((prev) => ({
          ...prev,
          [editingBarcodeProduct.id]: {
            ...prev[editingBarcodeProduct.id],
            product: {
              ...prev[editingBarcodeProduct.id].product,
              ...clearUpdate,
            },
          },
        }))
      }
      toast.success(`${isCarton ? 'Carton' : isRow ? 'Row' : 'Piece'} barcode removed for "${editingBarcodeProduct.name}"`)
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
        p.mid_barcode?.toLowerCase() === val ||
        p.carton_barcode?.toLowerCase() === val ||
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

    // Record last printed timestamp for all target products
    const printedProductIds = [...new Set(targetItems.map((item) => item.id).filter(Boolean))]
    if (printedProductIds.length > 0) {
      const nowIso = new Date().toISOString()

      // Update local React state instantly by packaging tier
      setProducts((prev) =>
        prev.map((p) => {
          if (!printedProductIds.includes(p.id)) return p
          if (printTarget === 'carton') return { ...p, carton_barcode_last_printed_at: nowIso }
          if (printTarget === 'row') return { ...p, mid_barcode_last_printed_at: nowIso }
          return { ...p, barcode_last_printed_at: nowIso }
        })
      )

      // Persist to database with target packaging tier
      api.post('/admin/products/mark-barcodes-printed', { productIds: printedProductIds, target: printTarget }).catch((err) =>
        console.warn('Could not persist barcode_last_printed_at to server:', err)
      )
    }

    let pageSize = '50mm 25mm'
    let w = '50mm'
    let h = '25mm'
    let barcodeW = '40mm' // safe 40mm on 50mm paper with 5mm left/right safe zone
    let barcodeH = showDates ? '9mm' : '11.5mm' // 11.5mm tall optical bars (nearly 50% of the entire sticker height)
    let barModuleWidth = 1.85
    let barHeightPx = 65
    let fontSizeName = '7.5px'
    let fontSizePrice = '9.5px'
    let fontSizeSku = '7.5px'
    let labelPadding = '0.8mm 2.5mm 0.6mm 3.8mm' // 3.8mm left margin prevents mechanical printhead edge cut-off on XP-365B

    if (labelTemplate === 'thermal_50x30') {
      pageSize = '50mm 30mm'
      w = '50mm'
      h = '30mm'
      barcodeW = '43mm'
      barcodeH = showDates ? '11.5mm' : '14mm'
      barModuleWidth = 2.2
      barHeightPx = 80
      fontSizeName = '8px'
      fontSizePrice = '10.5px'
      fontSizeSku = '8px'
      labelPadding = '1mm 2.2mm 0.8mm'
    } else if (labelTemplate === 'compact_40x20') {
      pageSize = '40mm 20mm'
      w = '40mm'
      h = '20mm'
      barcodeW = '34mm'
      barcodeH = '8mm'
      barModuleWidth = 1.6
      barHeightPx = 45
      fontSizeName = '6.8px'
      fontSizePrice = '8.8px'
      fontSizeSku = '6.8px'
      labelPadding = '0.6mm 1.5mm 0.5mm'
    } else if (labelTemplate === 'crate_100x75') {
      pageSize = '100mm 75mm'
      w = '100mm'
      h = '75mm'
      barcodeW = '88mm'
      barcodeH = '35mm'
      barModuleWidth = 3.5
      barHeightPx = 150
      fontSizeName = '16px'
      fontSizePrice = '22px'
      fontSizeSku = '12px'
      labelPadding = '3mm 5mm 2.5mm'
    }

    // Generate crisp, scan-calibrated SVG vector barcode with 100% full-height bars
    const generateBarcodeVector = (val) => {
      if (!val) return ''
      try {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        renderBarcodeToElement(svgEl, val, {
          format: symbology === 'EAN13' && String(val).length === 13 ? 'EAN13' : 'CODE128',
          width: barModuleWidth,
          height: barHeightPx,
          displayValue: false, // Pure bars in SVG so 100% of height is optical scan area
          margin: 0,
          lineColor: '#000000',
        })
        svgEl.setAttribute('preserveAspectRatio', 'none')
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        return svgEl.outerHTML
      } catch (err) {
        console.warn('Barcode print render error:', err)
        return ''
      }
    }

    const labelsHtml = targetItems.map(item => {
      const priceStr = formatNaira(item.price || item.unit_price)
      const svg = generateBarcodeVector(item.barcodeValue)
      
      return `
        <div class="label-page">
          <div class="label-top-section">
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
          </div>

          <div class="barcode-wrap">
            <div class="barcode">${svg}</div>
            ${showHumanCode || showSku ? `<div class="sku">${item.barcodeValue}</div>` : ''}
          </div>

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
          <title>${isSingleTest ? 'XP-365B Test Label (50x25)' : 'Bems Farms Barcode Labels'}</title>
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
              width: 100%;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-page {
              width: ${w};
              height: ${h};
              max-height: ${h};
              padding: ${labelPadding};
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 0.5mm;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: always;
              break-after: page;
              background: #fff;
              box-sizing: border-box;
            }
            .label-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .label-top-section {
              display: flex;
              flex-direction: column;
              gap: 0.4mm;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              font-size: ${labelTemplate==='crate_100x75' ? '12px' : '6.5px'}; 
              font-weight: 800; 
              border-bottom: 0.8px solid #000; 
              padding-bottom: 0.4px; 
              margin-bottom: 0;
              line-height: 1; 
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
              font-size: 6px;
              font-weight: 600;
            }
            .name { 
              font-size: ${fontSizeName}; 
              font-weight: 700; 
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              line-height: 1.15;
              margin: 0;
            }
            .price-row { 
              display: flex; 
              justify-content: space-between; 
              align-items: baseline; 
              line-height: 1.1;
              margin: 0;
            }
            .price { 
              font-size: ${fontSizePrice}; 
              font-weight: 900; 
              color: #000;
            }
            .unit { 
              font-size: ${labelTemplate==='crate_100x75' ? '11px' : '7px'}; 
              font-weight: 600;
              color: #444; 
            }
            .barcode-wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0.3mm 0 0;
              width: 100%;
            }
            .barcode { 
              text-align: center; 
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              line-height: 1;
            }
            .barcode svg { 
              width: ${barcodeW} !important;
              height: ${barcodeH} !important; 
              display: block !important;
              margin: 0 auto !important;
              shape-rendering: crispEdges !important;
            }
            .sku { 
              text-align: center; 
              font-size: ${fontSizeSku}; 
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
              font-weight: 700;
              letter-spacing: 0.8px;
              line-height: 1;
              margin-top: 0.3mm;
              color: #000;
            }
            .dates { 
              display: flex; 
              justify-content: space-between; 
              font-size: ${labelTemplate==='crate_100x75' ? '9px' : '5.5px'}; 
              color: #444; 
              border-top: 0.5px solid #666; 
              padding-top: 0.4px; 
              margin-top: 0.3mm; 
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

  // Flattened array of all labels in queue based on copies (supports Retail Piece vs Mid Row vs Bulk Carton modes)
  const printableLabelArray = useMemo(() => {
    const list = []
    Object.values(printQueue).forEach(({ product, copies }) => {
      const rowTarget = rowTargetOverrides[product.id] || printTarget
      const isCarton = rowTarget === 'carton' && Number(product.pcs_per_carton) > 1
      const isRow = rowTarget === 'row' && Number(product.pcs_per_mid_unit) > 1

      const code = isCarton
        ? (product.carton_barcode || `BF-CTN-${product.id}`)
        : isRow
        ? (product.mid_barcode || `BF-ROW-${product.id}`)
        : (product.barcode || product.sku || `BF-${product.id}`)

      const priceVal = isCarton
        ? (product.carton_price && Number(product.carton_price) > 0
            ? product.carton_price
            : Number(product.unit_price || product.price || 0) * (product.pcs_per_carton || 1))
        : isRow
        ? (product.mid_price && Number(product.mid_price) > 0
            ? product.mid_price
            : Number(product.unit_price || product.price || 0) * (product.pcs_per_mid_unit || 1))
        : (product.unit_price || product.price)

      const unitLabel = isCarton
        ? (product.carton_unit_name ? `${product.carton_unit_name} (${product.pcs_per_carton} ${product.piece_unit_name || 'pcs'})` : 'Carton')
        : isRow
        ? (product.mid_unit_name ? `${product.mid_unit_name} (${product.pcs_per_mid_unit} ${product.piece_unit_name || 'pcs'})` : 'Row')
        : (product.piece_unit_name || product.unit || 'Piece')

      const displayName = isCarton
        ? `${product.name} [${product.carton_unit_name || 'Carton'}]`
        : isRow
        ? `${product.name} [${product.mid_unit_name || 'Row'}]`
        : product.name

      for (let i = 0; i < copies; i++) {
        list.push({
          ...product,
          name: displayName,
          price: priceVal,
          unit: unitLabel,
          barcodeValue: code,
          isCartonLabel: isCarton,
          isRowLabel: isRow,
          tierTarget: rowTarget,
          copyIndex: i + 1,
          totalCopies: copies,
        })
      }
    })
    return list
  }, [printQueue, printTarget, rowTargetOverrides])

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
          min-height: 165px;
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
            title="Print 1 sample 50x25mm label to test Xprinter XP-365B alignment"
          >
            <i className="ri-printer-line"></i> Test 1 Label (50×25)
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
                  {printTarget === 'carton' ? 'Carton Packaging Catalog' : printTarget === 'row' ? 'Row/Pack Catalog' : 'Retail Piece Catalog'}
                </span>
                <span className="kpi-icon-pill" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                  <i className={printTarget === 'carton' ? 'ri-archive-line fs-18' : printTarget === 'row' ? 'ri-stack-line fs-18' : 'ri-box-3-line fs-18'}></i>
                </span>
              </div>
              <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                {totalProducts}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>{printTarget === 'carton' ? 'Bulk Cartons' : printTarget === 'row' ? 'Mid-Tier Rows' : 'Master Catalog'}</span>
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
                  {printTarget === 'carton' ? 'Carton Codes' : printTarget === 'row' ? 'Row Codes' : 'Universal Codes'} Assigned
                </span>
                <span className="kpi-icon-pill" style={{ background: '#ECFDF5', color: '#059669' }}>
                  <i className="ri-checkbox-circle-line fs-18"></i>
                </span>
              </div>
              <div className="fs-24 fw-bolder text-emerald mb-1 font-display">
                {productsWithBarcode.length}
              </div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                <span>Scope Coverage</span>
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
                  Missing {printTarget === 'carton' ? 'Carton' : printTarget === 'row' ? 'Row' : 'Piece'} Barcodes
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
        <div
          className="col-12 col-sm-6 col-xl-3"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab(activeTab === 'queue' ? 'all' : 'queue')}
          title={activeTab === 'queue' ? 'Click to show all catalog products' : 'Click to filter table to selected items only'}
        >
          <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${activeTab === 'queue' ? 'border border-primary border-2 shadow' : 'bg-card-glow-blue'}`}>
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
                <span className={`badge ${activeTab === 'queue' ? 'bg-primary text-white' : 'bg-primary-subtle text-primary'} font-monospace text-xs px-2`}>
                  {Object.keys(printQueue).length} SKUs {activeTab === 'queue' ? '(Viewing Selected)' : '• Click to view'}
                </span>
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
                    className={`btn btn-sm ${activeTab === 'all' ? 'btn-dark fw-bold' : 'btn-light'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All {printTarget === 'carton' ? 'Cartons' : printTarget === 'row' ? 'Rows' : 'Goods'} ({totalProducts})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'with_barcode' ? 'btn-success text-white fw-bold' : 'btn-light'}`}
                    onClick={() => setActiveTab('with_barcode')}
                  >
                    <i className="ri-check-line me-1"></i> Assigned ({productsWithBarcode.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'unprinted' ? 'btn-info text-white fw-bold' : 'btn-light'}`}
                    onClick={() => setActiveTab('unprinted')}
                    title="Products with a barcode that have not been printed yet"
                  >
                    <i className="ri-time-line me-1"></i> Not Printed ({productsUnprinted.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'missing_barcode' ? 'btn-warning text-dark fw-bold' : 'btn-light'}`}
                    onClick={() => setActiveTab('missing_barcode')}
                  >
                    <i className="ri-error-warning-line me-1"></i> Needs Barcode ({productsMissingBarcode.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary text-white fw-bold shadow-sm' : 'btn-light'}`}
                    onClick={() => setActiveTab('queue')}
                    title="Show only the items currently queued for printing"
                  >
                    <i className="ri-checkbox-circle-fill me-1"></i> In Queue ({Object.keys(printQueue).length})
                  </button>
                </div>

                {/* Batch add / selection toolbar */}
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {/* Dedicated "Show Selected Only" Quick Filter */}
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary text-white fw-bold shadow-sm' : 'btn-outline-primary bg-white'}`}
                    onClick={() => setActiveTab(activeTab === 'queue' ? 'all' : 'queue')}
                    title="Toggle to only view products selected in print queue"
                  >
                    <i className={activeTab === 'queue' ? 'ri-checkbox-circle-fill me-1' : 'ri-list-check-2 me-1'}></i>
                    {activeTab === 'queue' ? `Showing Selected (${Object.keys(printQueue).length})` : `Show Selected Only (${Object.keys(printQueue).length})`}
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      if (filteredProducts.length > 0 && filteredProducts.every((p) => Boolean(printQueue[p.id]))) {
                        // Deselect visible
                        setPrintQueue((prev) => {
                          const next = { ...prev }
                          filteredProducts.forEach((p) => delete next[p.id])
                          return next
                        })
                        toast.info(`Deselected ${filteredProducts.length} items`)
                      } else {
                        addAllToQueue(filteredProducts)
                      }
                    }}
                    title="Select or deselect all items matching current filter"
                  >
                    <i className={filteredProducts.length > 0 && filteredProducts.every((p) => Boolean(printQueue[p.id])) ? 'ri-checkbox-blank-line me-1' : 'ri-checkbox-line me-1'}></i>
                    {filteredProducts.length > 0 && filteredProducts.every((p) => Boolean(printQueue[p.id]))
                      ? `Deselect All (${filteredProducts.length})`
                      : `Select All (${filteredProducts.length})`}
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => addAllToQueue(productsUnprinted)}
                    disabled={productsUnprinted.length === 0}
                    title="Add all products that have never been printed to queue"
                  >
                    <i className="ri-add-circle-line me-1"></i> Queue Unprinted ({productsUnprinted.length})
                  </button>

                  {Object.keys(printQueue).length > 0 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={syncAllToStock}
                        title="Set copies of all queued items to match their live stock quantity"
                      >
                        <i className="ri-refresh-line me-1"></i> Match Stock
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearQueue}
                        title="Clear print queue"
                      >
                        Clear
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

            {/* Packaging Level Table Switcher */}
            <div className="d-flex align-items-center justify-content-between p-2.5 mb-2 rounded-3 bg-light border flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-xs fw-bold text-muted text-uppercase">Packaging Level Switch:</span>
                <div className="btn-group btn-group-sm shadow-sm" role="group">
                  <button
                    type="button"
                    className={`btn px-3 fw-bold ${printTarget === 'piece' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => handleSwitchPrintTarget('piece')}
                    title="Switch table to Retail Pieces"
                  >
                    <i className="ri-price-tag-3-line me-1"></i> Retail Pieces (Pcs Barcode)
                  </button>
                  <button
                    type="button"
                    className={`btn px-3 fw-bold ${printTarget === 'row' ? 'btn-info text-white' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => handleSwitchPrintTarget('row')}
                    title="Switch table to Mid-Tier Rows / Packs"
                  >
                    <i className="ri-stack-line me-1"></i> Rows / Packs (Row Barcode)
                  </button>
                  <button
                    type="button"
                    className={`btn px-3 fw-bold ${printTarget === 'carton' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => handleSwitchPrintTarget('carton')}
                    title="Switch table to Bulk Outer Cartons"
                  >
                    <i className="ri-archive-line me-1"></i> Bulk Cartons (Carton Barcode)
                  </button>
                </div>
              </div>
              <div className="fs-xs">
                {printTarget === 'carton' ? (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1.5 fw-semibold">
                    <i className="ri-box-3-line me-1"></i> Showing Distinct Carton Barcodes (6159... or BF-CTN-...) &amp; Carton Stock
                  </span>
                ) : printTarget === 'row' ? (
                  <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1.5 fw-semibold">
                    <i className="ri-stack-line me-1"></i> Showing Mid-Tier Row/Pack Barcodes (6155... or BF-ROW-...) &amp; Row Stock
                  </span>
                ) : (
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1.5 fw-semibold">
                    <i className="ri-price-tag-3-line me-1"></i> Showing Retail Piece Barcodes (6150... or BF-...) &amp; Loose Pieces
                  </span>
                )}
              </div>
            </div>

            {/* Batch Copies Per Item Quick Bar (10, 20, 30, 40... of each item) */}
            <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-white border flex-wrap gap-2 mb-2 shadow-xs">
              <div className="d-flex align-items-center gap-1.5 flex-wrap">
                <span className="fs-xs fw-bold text-dark text-uppercase d-flex align-items-center gap-1 me-1">
                  <i className="ri-file-copy-2-line text-primary"></i> Copies Each:
                </span>
                <div className="btn-group btn-group-sm shadow-xs" role="group">
                  {[1, 5, 10, 20, 30, 40, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className="btn btn-outline-secondary fw-semibold py-1 px-2.5 bg-white"
                      onClick={() => setBatchCopiesForAll(num)}
                      title={`Set exactly ${num} copies for every item in the table`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="input-group input-group-sm" style={{ width: '135px' }}>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    className="form-control text-center py-1 font-monospace fw-bold"
                    placeholder="Custom"
                    id="batchCustomCopiesInput"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(e.target.value)
                        if (val > 0) setBatchCopiesForAll(val)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary px-2.5 fw-bold"
                    onClick={() => {
                      const el = document.getElementById('batchCustomCopiesInput')
                      const val = parseInt(el?.value)
                      if (val > 0) setBatchCopiesForAll(val)
                    }}
                    title="Apply custom copies to all items"
                  >
                    Set
                  </button>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success py-1"
                  onClick={syncAllToStock}
                  title="Reset copies of each item to match its actual live inventory count"
                >
                  <i className="ri-database-2-line me-1"></i> Match Stock Qty
                </button>
                <span className="text-muted fs-xs">
                  Batch Total: <strong className="text-primary font-monospace fs-sm">{totalLabelsInQueue}</strong> labels
                </span>
              </div>
            </div>

            {/* Active Queue Status Banner */}
            {activeTab === 'queue' && (
              <div className="alert alert-primary d-flex align-items-center justify-content-between py-2 px-3 mb-2 rounded-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-checkbox-circle-fill fs-5 text-primary"></i>
                  <span className="fw-semibold">
                    Viewing {filteredProducts.length} Selected Item{filteredProducts.length !== 1 ? 's' : ''} in Print Queue
                  </span>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-primary bg-white fw-semibold"
                    onClick={() => setActiveTab('all')}
                  >
                    <i className="ri-list-check me-1"></i> View All Catalog Products
                  </button>
                  {Object.keys(printQueue).length > 0 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-danger bg-white"
                      onClick={clearQueue}
                    >
                      Clear Queue
                    </button>
                  )}
                </div>
              </div>
            )}

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
                        ref={(el) => {
                          if (el) {
                            const someSelected = filteredProducts.some((p) => Boolean(printQueue[p.id]))
                            const allSelected = filteredProducts.length > 0 && filteredProducts.every((p) => Boolean(printQueue[p.id]))
                            el.indeterminate = someSelected && !allSelected
                          }
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            addAllToQueue(filteredProducts)
                          } else {
                            setPrintQueue((prev) => {
                              const next = { ...prev }
                              filteredProducts.forEach((p) => {
                                delete next[p.id]
                              })
                              return next
                            })
                            toast.info(`Deselected ${filteredProducts.length} items`)
                          }
                        }}
                        title="Select or deselect all visible items"
                      />
                    </th>
                    <th>Product</th>
                    <th>Price &amp; Stock</th>
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span>Universal Barcode</span>
                        <div className="btn-group btn-group-xs" role="group" style={{ textTransform: 'none' }}>
                          <button
                            type="button"
                            className={`btn btn-xs py-0 px-2 fw-bold ${printTarget === 'piece' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'}`}
                            onClick={() => handleSwitchPrintTarget('piece')}
                            title="Switch whole table to Retail Piece Barcodes"
                          >
                            🏷️ Pcs
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs py-0 px-2 fw-bold ${printTarget === 'row' ? 'btn-info text-white' : 'btn-outline-secondary bg-white'}`}
                            onClick={() => handleSwitchPrintTarget('row')}
                            title="Switch whole table to Mid-Tier Row Barcodes"
                          >
                            📦 Row
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs py-0 px-2 fw-bold ${printTarget === 'carton' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white'}`}
                            onClick={() => handleSwitchPrintTarget('carton')}
                            title="Switch whole table to Bulk Carton Barcodes"
                          >
                            🚚 Carton
                          </button>
                        </div>
                      </div>
                    </th>
                    <th>Last Printed</th>
                    <th>Copies to Print</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Loading barcode catalog…
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <i className="ri-barcode-line fs-1 d-block mb-2 text-muted opacity-50"></i>
                        No products found matching your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const rowTarget = getRowTarget(p)
                      const isCartonRow = rowTarget === 'carton' && Number(p.pcs_per_carton) > 1
                      const isMidRow = rowTarget === 'row' && Number(p.pcs_per_mid_unit) > 1
                      const activeBarcode = isCartonRow ? p.carton_barcode : isMidRow ? p.mid_barcode : p.barcode
                      const hasActiveBarcode = Boolean(activeBarcode && activeBarcode.trim())
                      const stockQtyForTarget = getProductStockCopies(p, rowTarget)
                      const isQueued = Boolean(printQueue[p.id])
                      const copies = printQueue[p.id]?.copies || stockQtyForTarget

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
                                <div className="fw-bold text-dark fs-sm">
                                  {p.name}
                                  {isCartonRow && (
                                    <span className="badge bg-primary-subtle text-primary ms-1.5 fs-xs py-0">
                                      {p.carton_unit_name || 'Carton'}
                                    </span>
                                  )}
                                  {isMidRow && (
                                    <span className="badge bg-info-subtle text-info ms-1.5 fs-xs py-0">
                                      {p.mid_unit_name || 'Row'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted fs-xs">
                                  SKU: <span className="font-monospace text-dark">{p.sku || '—'}</span> &bull;{' '}
                                  {p.category || 'General'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {isCartonRow ? (
                              <div>
                                <div className="fw-bold text-primary fs-sm">
                                  {formatNaira(
                                    p.carton_price && Number(p.carton_price) > 0
                                      ? p.carton_price
                                      : Number(p.unit_price || p.price || 0) * (p.pcs_per_carton || 1)
                                  )}
                                  <small className="text-muted fs-xs"> / {p.carton_unit_name || 'ctn'}</small>
                                </div>
                                <div className="text-muted fs-xs">
                                  {formatNaira(p.price || p.unit_price)} / {p.piece_unit_name || 'piece'}
                                </div>
                              </div>
                            ) : isMidRow ? (
                              <div>
                                <div className="fw-bold text-info fs-sm">
                                  {formatNaira(
                                    p.mid_price && Number(p.mid_price) > 0
                                      ? p.mid_price
                                      : Number(p.unit_price || p.price || 0) * (p.pcs_per_mid_unit || 1)
                                  )}
                                  <small className="text-muted fs-xs"> / {p.mid_unit_name || 'row'}</small>
                                </div>
                                <div className="text-muted fs-xs">
                                  {formatNaira(p.price || p.unit_price)} / {p.piece_unit_name || 'piece'}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="fw-bold text-dark fs-sm">
                                  {formatNaira(p.price || p.unit_price)}
                                  <small className="text-muted fs-xs"> / {p.piece_unit_name || p.unit || 'pc'}</small>
                                </div>
                                {Number(p.pcs_per_mid_unit) > 1 && (
                                  <div className="text-info fw-semibold fs-xs">
                                    {formatNaira(p.mid_price || Number(p.price || 0) * p.pcs_per_mid_unit)} / {p.mid_unit_name || 'row'}
                                  </div>
                                )}
                                {Number(p.pcs_per_carton) > 1 && (
                                  <div className="text-primary fw-semibold fs-xs">
                                    {formatNaira(p.carton_price || Number(p.price || 0) * p.pcs_per_carton)} / {p.carton_unit_name || 'ctn'}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="d-flex align-items-center gap-1 mt-1">
                              <span
                                className={`badge ${
                                  Number(p.stock ?? p.stock_quantity ?? 0) > 0
                                    ? isCartonRow
                                      ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                      : isMidRow
                                      ? 'bg-info-subtle text-info border border-info-subtle'
                                      : 'bg-success-subtle text-success border border-success-subtle'
                                    : 'bg-danger-subtle text-danger border border-danger-subtle'
                                } fs-xs py-0`}
                              >
                                {isCartonRow
                                  ? `${Math.floor((p.stock ?? p.stock_quantity ?? 0) / (p.pcs_per_carton || 1))} ${p.carton_unit_name || 'Carton'}s (${p.pcs_per_carton} ${p.piece_unit_name || 'pcs'}/ctn)`
                                  : isMidRow
                                  ? `${Math.floor((p.stock ?? p.stock_quantity ?? 0) / (p.pcs_per_mid_unit || 1))} ${p.mid_unit_name || 'Row'}s (${p.pcs_per_mid_unit} ${p.piece_unit_name || 'pcs'}/row)`
                                  : Number(p.pcs_per_carton) > 1
                                  ? formatCartonStock(p.stock ?? p.stock_quantity ?? 0, p.pcs_per_carton, p.carton_unit_name, p.piece_unit_name)
                                  : `Stock: ${p.stock ?? p.stock_quantity ?? 0} ${p.unit || 'units'}`}
                              </span>
                            </div>
                          </td>
                          <td>
                            {/* Row Switch Buttons for Packaging Tiers */}
                            {(Number(p.pcs_per_carton) > 1 || Number(p.pcs_per_mid_unit) > 1) && (
                              <div className="d-flex align-items-center gap-1.5 mb-1.5">
                                <div className="btn-group btn-group-xs shadow-xs" role="group">
                                  <button
                                    type="button"
                                    className={`btn btn-xs py-0.5 px-2 fw-bold ${rowTarget === 'piece' ? 'btn-success text-white' : 'btn-outline-secondary bg-white'}`}
                                    onClick={() => toggleRowTarget(p.id, 'piece')}
                                    title="Switch this row to Retail Piece Barcode"
                                  >
                                    🏷️ Pcs
                                  </button>
                                  {Number(p.pcs_per_mid_unit) > 1 && (
                                    <button
                                      type="button"
                                      className={`btn btn-xs py-0.5 px-2 fw-bold ${rowTarget === 'row' ? 'btn-info text-white' : 'btn-outline-secondary bg-white'}`}
                                      onClick={() => toggleRowTarget(p.id, 'row')}
                                      title="Switch this row to Mid Row/Pack Barcode"
                                    >
                                      📦 Row
                                    </button>
                                  )}
                                  {Number(p.pcs_per_carton) > 1 && (
                                    <button
                                      type="button"
                                      className={`btn btn-xs py-0.5 px-2 fw-bold ${rowTarget === 'carton' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white'}`}
                                      onClick={() => toggleRowTarget(p.id, 'carton')}
                                      title="Switch this row to Bulk Carton Barcode"
                                    >
                                      🚚 Ctn
                                    </button>
                                  )}
                                </div>
                                <span className={`badge ${rowTarget === 'carton' ? 'bg-primary-subtle text-primary border border-primary-subtle' : rowTarget === 'row' ? 'bg-info-subtle text-info border border-info-subtle' : 'bg-success-subtle text-success border border-success-subtle'} fs-xs py-0.5`}>
                                  {rowTarget === 'carton' ? (p.carton_unit_name || 'Carton') : rowTarget === 'row' ? (p.mid_unit_name || 'Row') : (p.piece_unit_name || 'Piece')}
                                </span>
                              </div>
                            )}

                            {hasActiveBarcode ? (
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <div className={`p-1 rounded border ${isCartonRow ? 'bg-primary-subtle border-primary-subtle' : isMidRow ? 'bg-info-subtle border-info-subtle' : 'bg-light'}`}>
                                    <BarcodeSvg
                                      value={activeBarcode}
                                      format={symbology}
                                      width={1.2}
                                      height={24}
                                      displayValue={false}
                                    />
                                  </div>
                                  <div>
                                    <div className="d-flex align-items-center gap-1">
                                      <span className={`font-monospace fs-xs fw-bold ${isCartonRow ? 'text-primary' : isMidRow ? 'text-info' : 'text-dark'} d-block`}>
                                        {activeBarcode}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-link text-muted p-0 ms-1"
                                        onClick={() => handleCopyBarcode(activeBarcode, isCartonRow ? 'Carton Barcode' : isMidRow ? 'Row Barcode' : 'Piece Barcode')}
                                        title="Copy Barcode to clipboard"
                                      >
                                        <i className="ri-file-copy-line"></i>
                                      </button>
                                    </div>
                                    <span className={`badge ${isCartonRow ? 'bg-primary text-white' : isMidRow ? 'bg-info text-white' : 'bg-success text-white'} fs-xs py-0`}>
                                      {isCartonRow ? 'Carton Ready' : isMidRow ? 'Row Ready' : 'Piece Ready'}
                                    </span>
                                  </div>
                                </div>

                                {/* Alternate Barcode previews with quick toggle */}
                                {rowTarget !== 'piece' && p.barcode && (
                                  <div
                                    className="fs-xs text-muted mt-1 cursor-pointer"
                                    onClick={() => toggleRowTarget(p.id, 'piece')}
                                    title="Click to view Piece Barcode"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="ri-arrow-left-right-line me-1 text-success"></i>
                                    Piece Barcode: <span className="font-monospace text-dark fw-semibold">{p.barcode}</span>
                                  </div>
                                )}
                                {rowTarget !== 'row' && p.mid_barcode && (
                                  <div
                                    className="fs-xs text-muted mt-1 cursor-pointer"
                                    onClick={() => toggleRowTarget(p.id, 'row')}
                                    title="Click to view Mid Row Barcode"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="ri-arrow-left-right-line me-1 text-info"></i>
                                    Row Barcode: <span className="font-monospace text-info fw-semibold">{p.mid_barcode}</span>
                                  </div>
                                )}
                                {rowTarget !== 'carton' && p.carton_barcode && (
                                  <div
                                    className="fs-xs text-muted mt-1 cursor-pointer"
                                    onClick={() => toggleRowTarget(p.id, 'carton')}
                                    title="Click to view Carton Barcode"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="ri-arrow-left-right-line me-1 text-primary"></i>
                                    Carton Barcode: <span className="font-monospace text-primary fw-semibold">{p.carton_barcode}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-warning-subtle text-warning fs-xs">
                                  Missing {isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'}
                                </span>
                                <button
                                  type="button"
                                  className={`btn btn-xs py-0 px-2 ${isCartonRow ? 'btn-outline-primary' : isMidRow ? 'btn-outline-info' : 'btn-outline-success'}`}
                                  onClick={() => handleGenerateSingle(p, rowTarget)}
                                  title={`Auto-generate and save ${rowTarget} barcode`}
                                >
                                  <i className="ri-magic-line me-1"></i> Generate {isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'}
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            {(() => {
                              const tierPrintedAt = isCartonRow
                                ? p.carton_barcode_last_printed_at
                                : isMidRow
                                ? p.mid_barcode_last_printed_at
                                : p.barcode_last_printed_at
                              return tierPrintedAt ? (
                                <div>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 fs-xs py-0.5">
                                    <i className="ri-check-double-line"></i> Printed
                                  </span>
                                  <div
                                    className="text-muted fs-xs mt-0.5 fw-medium"
                                    style={{ fontSize: '11px' }}
                                    title={new Date(tierPrintedAt).toLocaleString()}
                                  >
                                    {formatLastPrinted(tierPrintedAt)}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1 fs-xs py-0.5">
                                    <i className="ri-time-line"></i> Never
                                  </span>
                                </div>
                              )
                            })()}
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
                                  title={`Match stock count (${stockQtyForTarget})`}
                                  onClick={() => setQueueCopiesDirect(p.id, stockQtyForTarget)}
                                >
                                  <i className="ri-magic-line"></i>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="text-end pe-3">
                            <div className="btn-group btn-group-sm">
                              {hasActiveBarcode ? (
                                <button
                                  type="button"
                                  className={`btn ${isCartonRow ? 'btn-outline-primary' : isMidRow ? 'btn-outline-info' : 'btn-outline-success'}`}
                                  onClick={() => handleRegenerateSingle(p, rowTarget)}
                                  title={`Regenerate New ${isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'} Barcode`}
                                >
                                  <i className="ri-refresh-line"></i>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={`btn ${isCartonRow ? 'btn-outline-primary' : isMidRow ? 'btn-outline-info' : 'btn-outline-success'}`}
                                  onClick={() => handleGenerateSingle(p, rowTarget)}
                                  title={`Generate ${isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'} Barcode`}
                                >
                                  <i className="ri-magic-line"></i>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setEditingBarcodeProduct(p)
                                  setEditBarcodeTarget(rowTarget)
                                  setCustomBarcodeVal(activeBarcode || generateUniversalGoodsCode(p, symbology, rowTarget))
                                }}
                                title="Custom Edit Barcode"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              {hasActiveBarcode && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteSingle(p, rowTarget)}
                                  title={`Delete ${isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'} Barcode`}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              )}
                              <button
                                type="button"
                                className={`btn ${isQueued ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => {
                                  if (!printQueue[p.id]) {
                                    setPrintQueue((prev) => ({ ...prev, [p.id]: { product: p, copies: stockQtyForTarget } }))
                                  }
                                  const tierName = isCartonRow ? 'Carton' : isMidRow ? 'Row' : 'Piece'
                                  toast.success(`Queued "${p.name}" (${tierName} label)`)
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
              {/* Packaging Unit Level: Retail Pieces vs Rows vs Bulk Cartons */}
              <div className="mb-3 p-2 rounded-3 border bg-light">
                <label className="form-label fw-bold fs-xs text-uppercase text-muted d-flex justify-content-between align-items-center mb-1">
                  <span>Packaging Label Mode</span>
                  <span className={`badge ${printTarget === 'carton' ? 'bg-primary' : printTarget === 'row' ? 'bg-info' : 'bg-success'}`}>
                    {printTarget === 'carton' ? 'Bulk Cartons' : printTarget === 'row' ? 'Rows / Packs' : 'Retail Pieces'}
                  </span>
                </label>
                <div className="btn-group btn-group-sm w-100">
                  <button
                    type="button"
                    className={`btn ${printTarget === 'piece' ? 'btn-success fw-bold text-white' : 'btn-outline-secondary'}`}
                    onClick={() => handleSwitchPrintTarget('piece')}
                  >
                    🏷️ Pieces
                  </button>
                  <button
                    type="button"
                    className={`btn ${printTarget === 'row' ? 'btn-info fw-bold text-white' : 'btn-outline-secondary'}`}
                    onClick={() => handleSwitchPrintTarget('row')}
                  >
                    📦 Rows
                  </button>
                  <button
                    type="button"
                    className={`btn ${printTarget === 'carton' ? 'btn-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                    onClick={() => handleSwitchPrintTarget('carton')}
                  >
                    🚚 Cartons
                  </button>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '10.5px', lineHeight: 1.3 }}>
                  {printTarget === 'carton'
                    ? 'Prints outer carton barcodes, whole carton prices, and copies matching carton stock.'
                    : printTarget === 'row'
                    ? 'Prints mid-tier pack barcodes, row prices, and copies matching row stock.'
                    : 'Prints individual piece barcodes, retail shelf prices, and copies matching loose piece stock.'}
                </div>
              </div>

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
                  <option value="thermal_50x25">Standard Produce / Shelf (50mm × 25mm) — Recommended</option>
                  <option value="thermal_50x30">Tall Item / Shelf (50mm × 30mm)</option>
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
                          width={labelTemplate === 'compact_40x20' ? 1.4 : 1.9}
                          height={labelTemplate === 'compact_40x20' ? 38 : labelTemplate === 'crate_100x75' ? 95 : 58}
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
                  width={labelTemplate === 'compact_40x20' ? 1.4 : 1.8}
                  height={labelTemplate === 'compact_40x20' ? 36 : labelTemplate === 'crate_100x75' ? 95 : 56}
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
                {(Number(editingBarcodeProduct.pcs_per_carton) > 1 || Number(editingBarcodeProduct.pcs_per_mid_unit) > 1) && (
                  <div className="btn-group w-100 mb-3 shadow-xs" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${editBarcodeTarget === 'piece' ? 'btn-success fw-bold text-white' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        setEditBarcodeTarget('piece')
                        setCustomBarcodeVal(editingBarcodeProduct.barcode || '')
                      }}
                    >
                      🏷️ Retail Piece Barcode
                    </button>
                    {Number(editingBarcodeProduct.pcs_per_mid_unit) > 1 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${editBarcodeTarget === 'row' ? 'btn-info fw-bold text-white' : 'btn-outline-secondary'}`}
                        onClick={() => {
                          setEditBarcodeTarget('row')
                          setCustomBarcodeVal(editingBarcodeProduct.mid_barcode || '')
                        }}
                      >
                        📦 Mid Row / Pack Barcode
                      </button>
                    )}
                    {Number(editingBarcodeProduct.pcs_per_carton) > 1 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${editBarcodeTarget === 'carton' ? 'btn-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                        onClick={() => {
                          setEditBarcodeTarget('carton')
                          setCustomBarcodeVal(editingBarcodeProduct.carton_barcode || '')
                        }}
                      >
                        🚚 Outer Carton Barcode
                      </button>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold fs-sm d-flex justify-content-between align-items-center">
                    <span>
                      {editBarcodeTarget === 'carton'
                        ? 'Outer Carton Barcode Value'
                        : editBarcodeTarget === 'row'
                        ? 'Mid Row / Pack Barcode Value'
                        : 'Retail Piece Barcode Value'}
                    </span>
                    <span className={`badge ${editBarcodeTarget === 'carton' ? 'bg-primary' : editBarcodeTarget === 'row' ? 'bg-info' : 'bg-success'}`}>
                      {editBarcodeTarget === 'carton' ? 'Carton Packaging' : editBarcodeTarget === 'row' ? 'Row Packaging' : 'Piece Unit'}
                    </span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={customBarcodeVal}
                      onChange={(e) => setCustomBarcodeVal(e.target.value)}
                      placeholder={
                        editBarcodeTarget === 'carton'
                          ? 'e.g. 6159002123456 or BF-CTN-VEG-8492'
                          : editBarcodeTarget === 'row'
                          ? 'e.g. 6155002123456 or BF-ROW-VEG-8492'
                          : 'e.g. 6150012849201 or BF-VEG-84920'
                      }
                    />
                    <button
                      type="button"
                      className={`btn ${editBarcodeTarget === 'carton' ? 'btn-outline-primary' : editBarcodeTarget === 'row' ? 'btn-outline-info' : 'btn-outline-success'}`}
                      onClick={() =>
                        setCustomBarcodeVal(
                          generateUniversalGoodsCode(editingBarcodeProduct, symbology, editBarcodeTarget)
                        )
                      }
                      title={`Generate new unique ${editBarcodeTarget === 'carton' ? 'Carton (6159...)' : editBarcodeTarget === 'row' ? 'Row (6155...)' : 'Piece (6150...)'} Code`}
                    >
                      <i className="ri-magic-line me-1"></i> Auto
                    </button>
                  </div>
                  <small className="text-muted">
                    {editBarcodeTarget === 'carton'
                      ? 'Outer carton barcodes use prefix 6159... or BF-CTN-... to uniquely identify whole carton packaging.'
                      : editBarcodeTarget === 'row'
                      ? 'Mid row/pack barcodes use prefix 6155... or BF-ROW-... to identify bundled rows/packs.'
                      : 'Retail piece barcodes use prefix 6150... or BF-... for individual shelf items.'}
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
                  {((editBarcodeTarget === 'carton' && editingBarcodeProduct.carton_barcode) ||
                    (editBarcodeTarget === 'row' && editingBarcodeProduct.mid_barcode) ||
                    (editBarcodeTarget === 'piece' && editingBarcodeProduct.barcode)) && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={handleDeleteManualBarcode}
                      disabled={savingBarcode}
                    >
                      <i className="ri-delete-bin-line me-1"></i> Delete {editBarcodeTarget === 'carton' ? 'Carton' : editBarcodeTarget === 'row' ? 'Row' : 'Piece'} Barcode
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
                    className={`btn ${editBarcodeTarget === 'carton' ? 'btn-primary' : editBarcodeTarget === 'row' ? 'btn-info text-white' : 'btn-success'}`}
                    onClick={handleSaveManualBarcode}
                    disabled={savingBarcode}
                  >
                    {savingBarcode ? 'Saving…' : `Save ${editBarcodeTarget === 'carton' ? 'Carton' : editBarcodeTarget === 'row' ? 'Row' : 'Piece'} Barcode`}
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
