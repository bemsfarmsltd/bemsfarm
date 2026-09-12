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
  { id: 6, name: 'Lagos Organics' },
  { id: 7, name: 'No Brand / Generic' },
]

// ── Full product import schema ──────────────────────────────────────────────
const PRODUCT_IMPORT_FIELDS = [
  { key: 'name', label: 'Product Name', required: true, section: 'Product Info' },
  { key: 'description', label: 'Description', required: false, section: 'Product Info' },
  { key: 'category', label: 'Category', required: true, section: 'Product Info' },
  { key: 'sub_category', label: 'Sub-Category', required: false, section: 'Product Info' },
  { key: 'brand', label: 'Brand', required: false, section: 'Product Info' },
  { key: 'unit', label: 'Unit of Measure', required: true, section: 'Product Info' },
  { key: 'model', label: 'Model / Variant', required: false, section: 'Product Info' },
  { key: 'tags', label: 'Tags', required: false, section: 'Product Info' },
  { key: 'unit_price', label: 'Unit Price (₦)', required: true, section: 'Pricing & Stock' },
  { key: 'cost_price', label: 'Cost Price (₦)', required: true, section: 'Pricing & Stock' },
  { key: 'available_for_sale', label: 'Available for Sale', required: false, section: 'Pricing & Stock', hint: 'yes | no' },
  { key: 'stock_qty', label: 'Stock Quantity', required: false, section: 'Pricing & Stock' },
  { key: 'low_stock_alert', label: 'Low Stock Alert', required: false, section: 'Pricing & Stock' },
  { key: 'sku', label: 'SKU', required: true, section: 'Advanced Settings' },
  { key: 'barcode', label: 'Barcode', required: false, section: 'Advanced Settings' },
  { key: 'tax', label: 'Tax (%)', required: false, section: 'Advanced Settings' },
  { key: 'track_inventory', label: 'Track Inventory', required: false, section: 'Advanced Settings', hint: 'yes | no' },
  { key: 'expiry_date', label: 'Expiry Date', required: false, section: 'Advanced Settings', hint: 'YYYY-MM-DD' },
  { key: 'status', label: 'Product Status', required: false, section: 'Advanced Settings', hint: 'active | inactive | draft' },
  { key: 'hsn_code', label: 'HSN Code', required: false, section: 'Advanced Settings' },
  { key: 'return_policy', label: 'Return Policy', required: false, section: 'Advanced Settings', hint: 'no_return | 7days | 14days | 30days' },
  { key: 'main_image_url', label: 'Main Image URL', required: true, section: 'Images & Media' },
  { key: 'image_2_url', label: 'Image 2 URL', required: false, section: 'Images & Media' },
  { key: 'image_3_url', label: 'Image 3 URL', required: false, section: 'Images & Media' },
  { key: 'image_4_url', label: 'Image 4 URL', required: false, section: 'Images & Media' },
  { key: 'image_title', label: 'Image Title', required: false, section: 'Images & Media' },
  { key: 'image_tags', label: 'Image Tags', required: false, section: 'Images & Media' },
  { key: 'video_url', label: 'Product Video URL', required: false, section: 'Images & Media' },
]

export default function AddProduct() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') || searchParams.get('id')

  const [mode, setMode] = useState('single')
  const [importDone, setImportDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)

  // Dynamic lookup options from API
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [subCategories, setSubCategories] = useState([])
  const [units, setUnits] = useState(FALLBACK_UNITS)

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

  function handleImport(rows) {
    setImportedCount(rows.length)
    setImportDone(true)
    setMode('single')
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
                          <code style={{ fontSize: 11, color: '#405189' }}>{f.label}</code>
                          {f.required && <span className="text-danger fw-bold" style={{ fontSize: 13 }}>*</span>}
                        </div>
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
                      <label htmlFor="subCategorySelect" className="form-label fw-semibold">Sub-Category</label>
                      <select
                        id="subCategorySelect"
                        className="form-select"
                        value={formData.sub_category_id}
                        onChange={(e) => handleChange('sub_category_id', e.target.value)}
                        disabled={!formData.category_id || filteredSubs.length === 0}>
                        <option value="">{formData.category_id ? (filteredSubs.length ? '— Select Sub-Category —' : '— None Available —') : '— Pick Category First —'}</option>
                        {filteredSubs.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
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
                        onChange={(e) => handleChange('unit', e.target.value)}
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
