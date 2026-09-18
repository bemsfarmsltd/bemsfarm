import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ImportModal from '../../components/ImportModal'
import BarcodeSvg from '../../components/ui/BarcodeSvg'
import { generateUniversalGoodsCode } from '../../lib/barcodeGenerator'

// ── Default Reference data (fallbacks if DB has not been seeded yet) ────────
const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Meals' },
  { id: 2, name: 'Seafood' },
  { id: 3, name: 'Meat' },
  { id: 4, name: 'Grains & Carbs' },
  { id: 5, name: 'Vegetables' },
  { id: 6, name: 'Dairy & Eggs' },
  { id: 7, name: 'Beverages' },
  { id: 8, name: 'Fresh Farm' },
]

const FALLBACK_UNITS = [
  { id: 1, name: 'kg', label: 'Kilogram (kg)' },
  { id: 2, name: 'g', label: 'Gram (g)' },
  { id: 3, name: 'litre', label: 'Litre (L)' },
  { id: 4, name: 'ml', label: 'Millilitre (ml)' },
  { id: 5, name: 'pack', label: 'Pack' },
  { id: 6, name: 'piece', label: 'Piece' },
  { id: 7, name: 'bunch', label: 'Bunch' },
  { id: 8, name: 'bag', label: 'Bag' },
  { id: 9, name: 'crate', label: 'Crate' },
  { id: 10, name: 'tuber', label: 'Tuber' },
  { id: 11, name: 'pot', label: 'Pot' },
  { id: 12, name: 'plate', label: 'Plate' },
  { id: 13, name: 'bowl', label: 'Bowl' },
  { id: 14, name: 'bottle', label: 'Bottle' },
  { id: 15, name: 'dozen', label: 'Dozen' },
  { id: 16, name: 'carton', label: 'Carton' },
]

const BRANDS = [
  { id: 1, name: 'Bems Farms (Own Brand)' },
  { id: 2, name: 'Eko Fresh' },
  { id: 3, name: 'Naija Naturals' },
  { id: 4, name: 'Farm Direct' },
  { id: 5, name: 'Green Basket' },
  { id: 6, name: 'Abia Organics' },
  { id: 7, name: 'No Brand / Generic' },
]

// ── Full product import schema (SKU, Barcode, & Track Inventory are auto-handled) ──────────────
const PRODUCT_IMPORT_FIELDS = [
  { key: 'name', label: 'Product Name', required: true, section: 'Product Info', example: 'Ofada Rice (5kg Bag)' },
  { key: 'category', label: 'Category', required: true, section: 'Product Info', example: 'Rice & Grains' },
  { key: 'quantity', label: 'Quantity / Count', required: true, section: 'Pricing & Stock', example: '30' },
  { key: 'unit_price', label: 'Unit Price (₦)', required: true, section: 'Pricing & Stock', example: '12500' },
  { key: 'cost_price', label: 'Cost Price (₦)', required: false, section: 'Pricing & Stock', example: '9800' },
  { key: 'unit', label: 'Unit of Measure', required: false, section: 'Product Info', hint: 'kg, pcs, bag, crate, etc.', example: 'kg' },
  { key: 'brand', label: 'Brand', required: false, section: 'Product Info', example: 'Bems Farms (Own Brand)' },
  { key: 'model_variant', label: 'Model / Variant', required: false, section: 'Product Info', example: '5kg Bag' },
  { key: 'description', label: 'Description', required: false, section: 'Product Info', example: 'Stone-free premium aromatic brown ofada rice.' },
  { key: 'low_stock_alert', label: 'Low Stock Alert', required: false, section: 'Pricing & Stock', example: '5' },
  { key: 'available_for_sale', label: 'Available for Sale', required: false, section: 'Pricing & Stock', hint: 'yes | no', example: 'yes' },
  { key: 'tax', label: 'Tax (%)', required: false, section: 'Advanced Settings', example: '7.5' },
  { key: 'tags', label: 'Tags', required: false, section: 'Product Info', example: 'Organic, Best Seller' },
  { key: 'main_image_url', label: 'Main Image URL', required: false, section: 'Images & Media', example: 'https://images.unsplash.com/photo-rice.jpg' },
  { key: 'expiry_date', label: 'Expiry Date', required: false, section: 'Advanced Settings', hint: 'YYYY-MM-DD', example: '' },
  { key: 'status', label: 'Product Status', required: false, section: 'Advanced Settings', hint: 'active | inactive | draft', example: 'active' },
  { key: 'return_policy', label: 'Return Policy', required: false, section: 'Advanced Settings', hint: 'no_return | 7days | 14days | 30days', example: 'no_return' },
]

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvEscape(val) {
  const s = String(val ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const SAMPLE_IMPORT_ROWS = [
  {
    name: 'Fresh Brown Farm Eggs (Crate of 30)',
    category: 'Poultry & Livestock',
    quantity: '50',
    unit_price: '3800',
    cost_price: '3000',
    unit: 'crate',
    brand: 'Bems Farms',
    model_variant: 'Crate of 30',
    description: 'Farm fresh organic brown eggs, high quality and carefully sorted.',
    low_stock_alert: '10',
    available_for_sale: 'yes',
    tax: '7.5',
    tags: 'Organic, Best Seller',
    main_image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f',
    expiry_date: '',
    status: 'active',
    return_policy: 'no_return',
  },
  {
    name: 'Premium Stone-Free Ofada Rice (5kg)',
    category: 'Rice & Grains',
    quantity: '30',
    unit_price: '12500',
    cost_price: '9800',
    unit: 'kg',
    brand: 'Bems Farms',
    model_variant: '5kg Bag',
    description: 'Clean stone-free fragrant brown ofada rice directly from farm harvest.',
    low_stock_alert: '5',
    available_for_sale: 'yes',
    tax: '7.5',
    tags: 'Grains, Fast Selling',
    main_image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c',
    expiry_date: '',
    status: 'active',
    return_policy: 'no_return',
  },
  {
    name: 'Fresh White Yam Tubers (Medium)',
    category: 'Roots & Tubers',
    quantity: '100',
    unit_price: '2500',
    cost_price: '1800',
    unit: 'pcs',
    brand: 'Bems Farms',
    model_variant: 'Medium Tuber',
    description: 'Freshly harvested firm sweet white yams.',
    low_stock_alert: '15',
    available_for_sale: 'yes',
    tax: '7.5',
    tags: 'Fresh Harvest',
    main_image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b',
    expiry_date: '',
    status: 'active',
    return_policy: 'no_return',
  },
]

function buildProductTemplateCSV(withSampleData) {
  const headers = PRODUCT_IMPORT_FIELDS.map((f) => f.key)
  const lines = [headers.join(',')]
  if (withSampleData) {
    SAMPLE_IMPORT_ROWS.forEach((row) => {
      lines.push(PRODUCT_IMPORT_FIELDS.map((f) => csvEscape(row[f.key] ?? f.example ?? '')).join(','))
    })
  }
  return lines.join('\n')
}

export default function AddProduct() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') || searchParams.get('id')

  const [mode, setMode] = useState(searchParams.get('mode') === 'import' ? 'import' : 'single')
  const [importDone, setImportDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)

  // Dynamic lookup options from API
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [subCategories, setSubCategories] = useState([])
  const [units, setUnits] = useState(FALLBACK_UNITS)
  const [unitsAreReal, setUnitsAreReal] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    sub_category_id: '',
    brand: 'Bems Farms (Own Brand)',
    unit_of_measure_id: '',
    unit: 'kg',
    model_variant: '',
    tags: '',
    unit_price: '',
    cost_price: '',
    available_for_sale: true,
    stock_quantity: 10,
    low_stock_threshold: 5,
    sku: '',
    barcode: '',
    tax_rate: '0',
    track_inventory: true,
    expiry_date: '',
    status: 'active',
    hsn_code: '',
    return_policy: 'no_return',
    image_url: '',
    image_2_url: '',
    image_3_url: '',
    image_4_url: '',
    image_title: '',
    image_tags: '',
    video_url: '',
    is_featured: false,
  })

  // Packaging & Unit Conversions State (Carton vs Pieces)
  const [packagingUnits, setPackagingUnits] = useState([])

  // Load Form Metadata (Categories, Units, Subcategories)
  useEffect(() => {
    async function loadFormData() {
      try {
        const res = await api.get('/admin/products/form-data')
        if (res.data) {
          if (res.data.categories?.length) setCategories(res.data.categories)
          if (res.data.sub_categories?.length) setSubCategories(res.data.sub_categories)
          if (res.data.units?.length) {
            setUnits(
              res.data.units.map((u) => ({
                id: u.id,
                name: u.abbreviation || u.name,
                label: `${u.name} (${u.abbreviation || u.short || u.name})`,
              }))
            )
            setUnitsAreReal(true)
          }
        }
      } catch (err) {
        console.warn('Could not fetch form-data from API, using fallback options:', err.message)
      }
    }
    loadFormData()
  }, [])

  // If editing an existing product, fetch its details
  useEffect(() => {
    if (!editId) return

    async function fetchProductToEdit() {
      setFetchingData(true)
      try {
        const res = await api.get(`/admin/products/${editId}`)
        const p = res.data
        if (p) {
          const imgs = p.images || []
          setFormData({
            name: p.name || '',
            description: p.description || '',
            category_id: p.category_id ? String(p.category_id) : '',
            sub_category_id: p.sub_category_id ? String(p.sub_category_id) : '',
            brand: p.brand || 'Bems Farms (Own Brand)',
            unit_of_measure_id: p.unit_of_measure_id ? String(p.unit_of_measure_id) : '',
            unit: p.unit || 'kg',
            model_variant: p.model_variant || '',
            tags: p.tags ? (Array.isArray(p.tags) ? p.tags.join(', ') : p.tags) : '',
            unit_price: p.unit_price !== undefined ? String(p.unit_price) : '',
            cost_price: p.cost_price !== undefined ? String(p.cost_price) : '',
            available_for_sale: p.available_for_sale !== false,
            stock_quantity: p.stock !== undefined ? p.stock : (p.stock_quantity || 0),
            low_stock_threshold: p.low_stock_threshold !== undefined ? p.low_stock_threshold : 5,
            sku: p.sku || '',
            barcode: p.barcode || '',
            tax_rate: p.tax_rate !== undefined ? String(p.tax_rate) : '0',
            track_inventory: p.track_inventory !== false,
            expiry_date: p.expiry_date ? p.expiry_date.slice(0, 10) : '',
            status: p.status || 'active',
            hsn_code: p.hsn_code || '',
            return_policy: p.return_policy || 'no_return',
            image_url: p.image_url || imgs[0]?.image_url || '',
            image_2_url: imgs[1]?.image_url || '',
            image_3_url: imgs[2]?.image_url || '',
            image_4_url: imgs[3]?.image_url || '',
            image_title: imgs[0]?.image_title || '',
            image_tags: '',
            video_url: p.video_url || '',
            is_featured: !!p.is_featured,
          })
          if (p.packaging_units && Array.isArray(p.packaging_units)) {
            setPackagingUnits(p.packaging_units)
          }
        }
      } catch (err) {
        toast.error('Failed to load product details for editing')
        console.error(err)
      } finally {
        setFetchingData(false)
      }
    }

    fetchProductToEdit()
  }, [editId])

  // Filter subcategories for the selected category
  const filteredSubs = formData.category_id
    ? subCategories.filter((s) => String(s.category_id) === String(formData.category_id))
    : []

  // Auto-generate SKU
  function handleGenerateSKU() {
    const prefix = (formData.name || 'PROD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'BEMS'
    const catSuffix = String(formData.category_id || '01').padStart(2, '0')
    const rand = Math.floor(100 + Math.random() * 900)
    const newSku = `${prefix}-${catSuffix}-${rand}`
    setFormData((prev) => ({ ...prev, sku: newSku }))
    toast.success(`Generated SKU: ${newSku}`)
  }

  // Auto-generate Universal Barcode
  function handleGenerateBarcode() {
    const categoryObj = categories.find((c) => String(c.id) === String(formData.category_id))
    const code = generateUniversalGoodsCode({
      name: formData.name,
      category: categoryObj?.name || 'GEN',
      id: editId,
    }, 'CODE128')
    setFormData((prev) => ({ ...prev, barcode: code }))
    toast.success(`Generated Universal Barcode: ${code}`)
  }

  // Packaging Tier Helpers
  function handleAddPackagingUnit(preset = null) {
    const unitPrice = parseFloat(formData.unit_price) || 0
    const costPrice = parseFloat(formData.cost_price) || 0
    const skuPrefix = formData.sku || 'PROD'

    let newUnit = {
      id: `temp-${Date.now()}`,
      unit_name: 'Carton of 40',
      multiplier: 40,
      price: unitPrice > 0 ? (unitPrice * 40).toFixed(2) : '',
      cost_price: costPrice > 0 ? (costPrice * 40).toFixed(2) : '',
      barcode: '',
      sku: `${skuPrefix}-CTN40`,
      is_default: false,
    }

    if (preset === 'carton') {
      newUnit = {
        id: `temp-${Date.now()}`,
        unit_name: 'Carton of 40',
        multiplier: 40,
        price: unitPrice > 0 ? (unitPrice * 40).toFixed(2) : '',
        cost_price: costPrice > 0 ? (costPrice * 40).toFixed(2) : '',
        barcode: '',
        sku: `${skuPrefix}-CTN40`,
        is_default: false,
      }
    } else if (preset === 'pack') {
      newUnit = {
        id: `temp-${Date.now()}`,
        unit_name: 'Pack of 10',
        multiplier: 10,
        price: unitPrice > 0 ? (unitPrice * 10).toFixed(2) : '',
        cost_price: costPrice > 0 ? (costPrice * 10).toFixed(2) : '',
        barcode: '',
        sku: `${skuPrefix}-PK10`,
        is_default: false,
      }
    } else if (preset === 'crate') {
      newUnit = {
        id: `temp-${Date.now()}`,
        unit_name: 'Crate of 30',
        multiplier: 30,
        price: unitPrice > 0 ? (unitPrice * 30).toFixed(2) : '',
        cost_price: costPrice > 0 ? (costPrice * 30).toFixed(2) : '',
        barcode: '',
        sku: `${skuPrefix}-CRT30`,
        is_default: false,
      }
    }

    setPackagingUnits((prev) => [...prev, newUnit])
  }

  function handleUpdatePackagingUnit(index, field, value) {
    setPackagingUnits((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function handleRemovePackagingUnit(index) {
    setPackagingUnits((prev) => prev.filter((_, i) => i !== index))
  }

  function handleGenerateUnitBarcode(index) {
    const unit = packagingUnits[index]
    const code = generateUniversalGoodsCode(
      {
        name: `${formData.name || 'Product'} ${unit.unit_name}`,
        category: 'PKG',
        id: index + 1,
      },
      'CODE128'
    )
    handleUpdatePackagingUnit(index, 'barcode', code)
    toast.success(`Generated barcode for ${unit.unit_name}: ${code}`)
  }

  // Margin Calculation
  const unitPriceNum = parseFloat(formData.unit_price) || 0
  const costPriceNum = parseFloat(formData.cost_price) || 0
  const marginPct = unitPriceNum > 0 && costPriceNum > 0
    ? (((unitPriceNum - costPriceNum) / unitPriceNum) * 100).toFixed(1)
    : ''

  function handleChange(field, val) {
    setFormData((prev) => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name?.trim()) {
      return toast.error('Please enter a product name')
    }
    if (!formData.unit_price || isNaN(parseFloat(formData.unit_price)) || parseFloat(formData.unit_price) < 0) {
      return toast.error('Please enter a valid unit price')
    }
    if (!formData.image_url?.trim()) {
      return toast.error('Please provide a Main Product Image URL')
    }

    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        sub_category_id: formData.sub_category_id ? parseInt(formData.sub_category_id) : null,
        unit_of_measure_id: formData.unit_of_measure_id ? parseInt(formData.unit_of_measure_id) : null,
        unit: formData.unit || 'kg',
        model_variant: formData.model_variant?.trim() || null,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        unit_price: parseFloat(formData.unit_price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        available_for_sale: formData.available_for_sale,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        track_inventory: formData.track_inventory,
        expiry_date: formData.expiry_date || null,
        return_policy: formData.return_policy || 'no_return',
        status: formData.status || 'active',
        barcode: formData.barcode?.trim() || null,
        hsn_code: formData.hsn_code?.trim() || null,
        video_url: formData.video_url?.trim() || null,
        image_url: formData.image_url.trim(),
        image_title: formData.image_title?.trim() || null,
        image_tags: formData.image_tags?.trim() || null,
        image_2_url: formData.image_2_url?.trim() || null,
        image_3_url: formData.image_3_url?.trim() || null,
        image_4_url: formData.image_4_url?.trim() || null,
        is_featured: formData.is_featured,
        packaging_units: packagingUnits.filter(u => u.unit_name?.trim() && Number(u.multiplier) > 0),
      }

      if (editId) {
        await api.patch(`/admin/products/${editId}`, payload)
        toast.success(`"${formData.name}" updated successfully!`)
      } else {
        await api.post('/admin/products', payload)
        toast.success(`"${formData.name}" created successfully!`)
      }

      navigate('/products')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save product'
      toast.error(msg)
      console.error('Error saving product:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(rows) {
    const res = await api.post('/admin/products/bulk-import', {
      type: 'products',
      rows,
      update_existing: true,
      auto_create_categories: true,
    }, { timeout: 180000 })
    const data = res.data
    setImportedCount((data.imported || 0) + (data.updated || 0))
    setImportDone(true)
    setMode('single')
    return data
  }

  if (fetchingData) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="text-muted mt-2">Loading product data...</div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Page heading + mode toggle */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">{editId ? 'Edit Product' : 'Add Product'}</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
            <li className="breadcrumb-item active">{editId ? 'Edit Product' : 'Add Product'}</li>
          </ul>
        </div>
        <Link to="/products" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
          <i className="ri-arrow-left-line"></i> Back to Product List
        </Link>
      </div>

      {/* Mode switcher (only when creating) */}
      {!editId && (
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <div className="d-flex gap-1 p-1 rounded" style={{ background: '#f0f3f9', border: '1px solid #dee2e6' }}>
            <button
              type="button"
              className={`btn btn-sm px-4 d-flex align-items-center gap-2 ${mode === 'single' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
              onClick={() => setMode('single')}>
              <i className="ri-file-add-line"></i> Add Single Product
            </button>
            <button
              type="button"
              className={`btn btn-sm px-4 d-flex align-items-center gap-2 ${mode === 'import' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
              onClick={() => setMode('import')}>
              <i className="ri-upload-cloud-2-line"></i> Bulk Import
            </button>
          </div>
          {importDone && (
            <div className="alert alert-success mb-0 py-2 px-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="ri-checkbox-circle-line fs-16"></i>
              <strong>{importedCount} products</strong> imported successfully.
            </div>
          )}
        </div>
      )}

      {/* ── BULK IMPORT MODE ─────────────────────────────────────────────── */}
      {mode === 'import' && !editId && (
        <div className="row">
          <div className="col-12">
            <div className="card mb-4 border-start border-4 border-success">
              <div className="card-body d-flex flex-wrap align-items-center gap-3 justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="size-12 rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center fs-2xl flex-shrink-0">
                    <i className="ri-file-excel-2-line"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">Download the Official Product CSV Template</h6>
                    <p className="text-muted fs-sm mb-0">
                      Fill it in and re-upload — matching column headers guarantee 100% automatic schema mapping.
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-success d-flex align-items-center gap-1.5"
                    onClick={() => downloadCSV('bems_products_blank_template.csv', buildProductTemplateCSV(false))}
                  >
                    <i className="ri-download-line"></i> Blank Template
                  </button>
                  <button
                    type="button"
                    className="btn btn-success text-white d-flex align-items-center gap-1.5 shadow-sm"
                    onClick={() => downloadCSV('bems_products_sample.csv', buildProductTemplateCSV(true))}
                  >
                    <i className="ri-file-download-fill"></i> Sample CSV (with Data)
                  </button>
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <i className="ri-table-line text-primary fs-16"></i>
                <h6 className="mb-0 fw-semibold">CSV Column Reference</h6>
                <span className="badge bg-primary-subtle text-primary ms-auto">{PRODUCT_IMPORT_FIELDS.length} columns</span>
              </div>
              <div className="card-body pt-0">
                <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                  Your CSV file must have column headers matching the fields below. Required fields <span className="text-danger fw-bold">*</span> must not be empty.
                </p>
                <div className="row g-2 mb-4">
                  {PRODUCT_IMPORT_FIELDS.map((f) => (
                    <div className="col-md-6 col-xl-4" key={f.key}>
                      <div className="p-2 rounded d-flex flex-column gap-1"
                        style={{ background: f.required ? '#fef3f3' : '#f8f9fa', border: `1px solid ${f.required ? '#fecaca' : '#e9ecef'}` }}>
                        <div className="d-flex align-items-center gap-1">
                          <code style={{ fontSize: 11, color: '#405189' }}>{f.key}</code>
                          {f.required && <span className="text-danger fw-bold" style={{ fontSize: 13 }}>*</span>}
                        </div>
                        <span className="text-muted" style={{ fontSize: 11 }}>{f.label}{f.hint ? ` — ${f.hint}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg d-inline-flex align-items-center gap-2"
                  onClick={() => setMode('import-wizard')}>
                  <i className="ri-upload-cloud-2-line"></i> Start Import Wizard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT WIZARD MODAL ──────────────────────────────────────────── */}
      {mode === 'import-wizard' && !editId && (
        <ImportModal
          entityName="Products"
          fields={PRODUCT_IMPORT_FIELDS}
          onImport={handleImport}
          onClose={() => setMode('import')}
        />
      )}

      {/* ── SINGLE PRODUCT FORM ──────────────────────────────────────────── */}
      {mode === 'single' && (
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-xl-7 col-xxl-8">

              {/* ── Product Information ─────────────────────────────────── */}
              <div className="card mb-3 shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h6 className="card-title mb-0 fw-bold">Product Information</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label htmlFor="productName" className="form-label fw-semibold">
                        Product Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="productName"
                        className="form-control"
                        placeholder="e.g. Premium Basmati Rice (5kg)"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="productDescription" className="form-label fw-semibold">Description</label>
                      <textarea
                        id="productDescription"
                        className="form-control"
                        rows="3"
                        placeholder="Detailed description of the product, farm origin, taste profile..."
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                      ></textarea>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="categorySelect" className="form-label fw-semibold">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        id="categorySelect"
                        className="form-select"
                        value={formData.category_id}
                        onChange={(e) => {
                          handleChange('category_id', e.target.value)
                          handleChange('sub_category_id', '')
                        }}
                        required>
                        <option value="">— Select Category —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>



                    <div className="col-md-4">
                      <label htmlFor="brandSelect" className="form-label fw-semibold">Brand</label>
                      <select
                        id="brandSelect"
                        className="form-select"
                        value={formData.brand}
                        onChange={(e) => handleChange('brand', e.target.value)}>
                        {BRANDS.map((b) => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="unitSelect" className="form-label fw-semibold">
                        Unit of Measure <span className="text-danger">*</span>
                      </label>
                      <select
                        id="unitSelect"
                        className="form-select"
                        value={formData.unit}
                        onChange={(e) => {
                          handleChange('unit', e.target.value)
                          if (unitsAreReal) {
                            const picked = units.find((u) => u.name === e.target.value)
                            handleChange('unit_of_measure_id', picked?.id ? String(picked.id) : '')
                          }
                        }}
                        required>
                        {units.map((u) => (
                          <option key={u.id} value={u.name}>{u.label || u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="modelName" className="form-label fw-semibold">Model / Variant</label>
                      <input
                        type="text"
                        id="modelName"
                        className="form-control"
                        placeholder="e.g. 5kg Bag, 500ml Bottle"
                        value={formData.model_variant}
                        onChange={(e) => handleChange('model_variant', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Tags</label>
                      <input
                        className="form-control"
                        placeholder="Organic, Best Seller, Fresh"
                        value={formData.tags}
                        onChange={(e) => handleChange('tags', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Pricing & Stock ─────────────────────────────────────── */}
              <div className="card mb-3 shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h6 className="card-title mb-0 fw-bold">Pricing & Stock Management</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="unitPrice" className="form-label fw-semibold">
                        Selling Price (₦) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">₦</span>
                        <input
                          type="number"
                          id="unitPrice"
                          className="form-control"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={formData.unit_price}
                          onChange={(e) => handleChange('unit_price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="costPrice" className="form-label fw-semibold">Cost Price (₦)</label>
                      <div className="input-group">
                        <span className="input-group-text">₦</span>
                        <input
                          type="number"
                          id="costPrice"
                          className="form-control"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => handleChange('cost_price', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Gross Margin (%)</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={marginPct ? `${marginPct}%` : '—'}
                          readOnly
                        />
                        <span className="input-group-text"><i className="ri-percent-line"></i></span>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="stockQty" className="form-label fw-semibold">Stock Quantity</label>
                      <input
                        type="number"
                        id="stockQty"
                        className="form-control"
                        placeholder="0"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => handleChange('stock_quantity', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="lowStockAlert" className="form-label fw-semibold">Low Stock Alert Level</label>
                      <input
                        type="number"
                        id="lowStockAlert"
                        className="form-control"
                        placeholder="e.g. 5"
                        min="0"
                        value={formData.low_stock_threshold}
                        onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4 d-flex align-items-center pt-3">
                      <div className="form-check form-switch fs-14">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="availableSale"
                          checked={formData.available_for_sale}
                          onChange={(e) => handleChange('available_for_sale', e.target.checked)}
                        />
                        <label className="form-check-label fw-medium ms-2" htmlFor="availableSale">
                          Available for Sale
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Advanced Product Settings ────────────────────────────── */}
              <div className="card mb-3 shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h6 className="card-title mb-0 fw-bold">Advanced Settings & Barcode</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="sku" className="form-label fw-semibold">
                        SKU (Stock Keeping Unit) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          id="sku"
                          className="form-control"
                          placeholder="e.g. RICE-01-102"
                          value={formData.sku}
                          onChange={(e) => handleChange('sku', e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleGenerateSKU}
                          title="Generate Unique SKU">
                          <i className="ri-magic-line me-1"></i> Auto
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="barcode" className="form-label fw-semibold">
                        Universal Barcode / Goods Code
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          id="barcode"
                          className="form-control font-monospace"
                          placeholder="e.g. BF-VEG-9402 or scan barcode"
                          value={formData.barcode}
                          onChange={(e) => handleChange('barcode', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          onClick={handleGenerateBarcode}
                          title="Auto-Generate Universal Goods Code"
                        >
                          <i className="ri-magic-line me-1"></i> Auto
                        </button>
                      </div>
                      {formData.barcode && (
                        <div className="mt-2 p-2 bg-light rounded text-center border">
                          <BarcodeSvg value={formData.barcode} format="CODE128" width={1.4} height={32} />
                        </div>
                      )}
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="productStatus" className="form-label fw-semibold">Product Status</label>
                      <select
                        id="productStatus"
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}>
                        <option value="active">Active (Published)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="expiryDate" className="form-label fw-semibold">Expiry Date</label>
                      <input
                        type="date"
                        id="expiryDate"
                        className="form-control"
                        value={formData.expiry_date}
                        onChange={(e) => handleChange('expiry_date', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="returnPolicy" className="form-label fw-semibold">Return Policy</label>
                      <select
                        id="returnPolicy"
                        className="form-select"
                        value={formData.return_policy}
                        onChange={(e) => handleChange('return_policy', e.target.value)}>
                        <option value="no_return">No Returns (Fresh Produce)</option>
                        <option value="7days">7-Day Replacement</option>
                        <option value="14days">14-Day Return</option>
                        <option value="30days">30-Day Return</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="featuredToggle"
                          checked={formData.is_featured}
                          onChange={(e) => handleChange('is_featured', e.target.checked)}
                        />
                        <label className="form-check-label fw-medium ms-2" htmlFor="featuredToggle">
                          Feature this product on homepage & storefront
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Packaging & Multi-Unit Conversions (Carton vs Pieces) ──── */}
              <div className="card mb-3 shadow-sm border-0">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h6 className="card-title mb-0 fw-bold d-flex align-items-center gap-2">
                      <i className="ri-inbox-archive-line text-success fs-5"></i>
                      Packaging &amp; Multi-Unit Conversions (Carton vs Pieces)
                    </h6>
                    <small className="text-muted">
                      Sell simultaneously by Carton, Crate, Pack, or Piece. Each tier has its own barcode and automatically deducts base pieces from stock.
                    </small>
                  </div>
                  <div className="d-flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-success rounded-pill px-2 py-1"
                      onClick={() => handleAddPackagingUnit('carton')}
                    >
                      + Carton (40 pcs)
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-success rounded-pill px-2 py-1"
                      onClick={() => handleAddPackagingUnit('pack')}
                    >
                      + Pack (10 pcs)
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-success rounded-pill px-2 py-1"
                      onClick={() => handleAddPackagingUnit('crate')}
                    >
                      + Crate (30 pcs)
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-primary rounded-pill px-2 py-1"
                      onClick={() => handleAddPackagingUnit()}
                    >
                      + Custom Tier
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  {packagingUnits.length === 0 ? (
                    <div className="text-center py-4 bg-light rounded-3 border border-dashed">
                      <i className="ri-archive-line fs-2 text-muted opacity-50 d-block mb-2"></i>
                      <h6 className="fw-bold text-dark mb-1">No Bulk Packaging Tiers Added</h6>
                      <p className="text-muted fs-xs mb-3" style={{ maxWidth: 460, margin: '0 auto' }}>
                        This product is currently only sold by its base unit (<strong>{formData.unit || 'Piece / Kg'}</strong> @ ₦{formData.unit_price || '0'}).
                        Add a Carton or Pack tier above if you want to sell in cartons with dedicated barcodes!
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={() => handleAddPackagingUnit('carton')}
                      >
                        <i className="ri-add-line me-1"></i> Add Carton Tier (e.g. 40 pcs)
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light text-muted fs-xs text-uppercase">
                          <tr>
                            <th style={{ minWidth: 140 }}>Packaging Name</th>
                            <th style={{ width: 100 }}>Pieces / Multiplier</th>
                            <th style={{ width: 130 }}>Selling Price (₦)</th>
                            <th style={{ width: 130 }}>Cost Price (₦)</th>
                            <th style={{ minWidth: 160 }}>Carton Barcode</th>
                            <th style={{ width: 130 }}>Carton SKU</th>
                            <th style={{ width: 40 }} className="text-end"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {packagingUnits.map((unit, idx) => (
                            <tr key={unit.id || idx}>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm fw-semibold"
                                  placeholder="e.g. Carton of 40"
                                  value={unit.unit_name}
                                  onChange={(e) => handleUpdatePackagingUnit(idx, 'unit_name', e.target.value)}
                                />
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm text-center font-monospace fw-bold"
                                    min="1"
                                    placeholder="40"
                                    value={unit.multiplier}
                                    onChange={(e) => handleUpdatePackagingUnit(idx, 'multiplier', e.target.value)}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text py-0">₦</span>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    placeholder="18000"
                                    min="0"
                                    step="0.01"
                                    value={unit.price}
                                    onChange={(e) => handleUpdatePackagingUnit(idx, 'price', e.target.value)}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text py-0">₦</span>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    placeholder="15000"
                                    min="0"
                                    step="0.01"
                                    value={unit.cost_price || ''}
                                    onChange={(e) => handleUpdatePackagingUnit(idx, 'cost_price', e.target.value)}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm font-monospace"
                                    placeholder="Carton Barcode"
                                    value={unit.barcode || ''}
                                    onChange={(e) => handleUpdatePackagingUnit(idx, 'barcode', e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline-success py-0 px-2"
                                    onClick={() => handleGenerateUnitBarcode(idx)}
                                    title="Auto-Generate Barcode"
                                  >
                                    <i className="ri-magic-line"></i>
                                  </button>
                                </div>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm font-monospace"
                                  placeholder="SKU-CTN"
                                  value={unit.sku || ''}
                                  onChange={(e) => handleUpdatePackagingUnit(idx, 'sku', e.target.value)}
                                />
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-danger"
                                  onClick={() => handleRemovePackagingUnit(idx)}
                                  title="Delete packaging tier"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="alert alert-info bg-info-subtle border-0 py-2 px-3 mt-3 mb-0 fs-xs text-dark rounded-3">
                        <i className="ri-information-line me-1 text-primary"></i>
                        <strong>POS Auto-Deduction:</strong> Scanning any carton/tier barcode at checkout automatically bills at that packaging's price and deducts the multiplier (e.g. 40 pieces) from your master stock.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── Product Images & Media ─────────────────────────────────── */}
            <div className="col-xl-5 col-xxl-4">
              <div className="card position-sticky top-20 shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h6 className="card-title mb-0 fw-bold">Product Media & Images</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Main Product Image URL <span className="text-danger">*</span>
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://images.unsplash.com/..."
                        value={formData.image_url}
                        onChange={(e) => handleChange('image_url', e.target.value)}
                        required
                      />
                    </div>

                    {/* Image Live Preview */}
                    <div className="col-12">
                      <div
                        className="rounded border d-flex align-items-center justify-content-center overflow-hidden"
                        style={{ height: 200, background: '#f8f9fa' }}>
                        {formData.image_url ? (
                          <img
                            src={formData.image_url}
                            alt="Main preview"
                            className="w-100 h-100 object-fit-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = 'https://placehold.co/400x300?text=Invalid+Image+URL'
                            }}
                          />
                        ) : (
                          <div className="text-center text-muted p-4">
                            <i className="ri-image-add-line fs-32 text-secondary mb-2 d-block"></i>
                            <span className="fs-13">Paste an image URL above to see live preview</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Additional Image URL 2</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={formData.image_2_url}
                        onChange={(e) => handleChange('image_2_url', e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Additional Image URL 3</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={formData.image_3_url}
                        onChange={(e) => handleChange('image_3_url', e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="productVideoUrl" className="form-label fw-semibold">Video URL (Optional)</label>
                      <input
                        type="text"
                        id="productVideoUrl"
                        className="form-control"
                        placeholder="YouTube / Vimeo link"
                        value={formData.video_url}
                        onChange={(e) => handleChange('video_url', e.target.value)}
                      />
                    </div>

                    <div className="col-12 pt-3 border-top d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => navigate('/products')}
                        disabled={loading}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary d-flex align-items-center gap-2"
                        disabled={loading}>
                        {loading && <div className="spinner-border spinner-border-sm" role="status"></div>}
                        <i className="ri-save-line"></i>
                        {editId ? 'Update Product' : 'Save Product'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}
    </div>
  )
}
