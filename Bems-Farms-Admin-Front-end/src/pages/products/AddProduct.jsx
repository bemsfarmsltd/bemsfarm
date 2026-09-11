import { useState } from 'react'
import ImportModal from '../../components/ImportModal'

// ── Reference data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 1, name: 'Meals' },
  { id: 2, name: 'Seafood' },
  { id: 3, name: 'Meat' },
  { id: 4, name: 'Grains & Carbs' },
  { id: 5, name: 'Vegetables' },
  { id: 6, name: 'Dairy & Eggs' },
  { id: 7, name: 'Beverages' },
  { id: 8, name: 'Fresh Farm' },
]

const SUB_CATEGORIES = [
  { id: 1,  name: 'Jollof & Rice Dishes',   categoryId: 1 },
  { id: 2,  name: 'Soups & Stews',          categoryId: 1 },
  { id: 3,  name: 'Swallow Dishes',         categoryId: 1 },
  { id: 4,  name: 'Pepper Soup',            categoryId: 1 },
  { id: 5,  name: 'Fresh Fish',             categoryId: 2 },
  { id: 6,  name: 'Smoked Fish',            categoryId: 2 },
  { id: 7,  name: 'Dried Fish & Crayfish',  categoryId: 2 },
  { id: 8,  name: 'Shellfish & Prawns',     categoryId: 2 },
  { id: 9,  name: 'Poultry',               categoryId: 3 },
  { id: 10, name: 'Red Meat',              categoryId: 3 },
  { id: 11, name: 'Offal & Extras',        categoryId: 3 },
  { id: 12, name: 'Rice & Beans',          categoryId: 4 },
  { id: 13, name: 'Tubers & Plantain',     categoryId: 4 },
  { id: 14, name: 'Flour & Semolina',      categoryId: 4 },
  { id: 15, name: 'Leafy Vegetables',      categoryId: 5 },
  { id: 16, name: 'Tomatoes & Peppers',    categoryId: 5 },
  { id: 17, name: 'Onions & Bulbs',        categoryId: 5 },
  { id: 18, name: 'Eggs',                  categoryId: 6 },
  { id: 19, name: 'Milk & Yogurt',         categoryId: 6 },
  { id: 20, name: 'Butter & Cheese',       categoryId: 6 },
  { id: 21, name: 'Zobo & Local Drinks',   categoryId: 7 },
  { id: 22, name: 'Water & Juices',        categoryId: 7 },
  { id: 23, name: 'Smoothies & Kunu',      categoryId: 7 },
  { id: 24, name: 'Root Vegetables',       categoryId: 8 },
  { id: 25, name: 'Herbs & Spices',        categoryId: 8 },
  { id: 26, name: 'Farm Produce',          categoryId: 8 },
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

const UNITS = [
  { id: 1,  name: 'kg',     label: 'Kilogram (kg)'   },
  { id: 2,  name: 'g',      label: 'Gram (g)'        },
  { id: 3,  name: 'litre',  label: 'Litre (L)'       },
  { id: 4,  name: 'ml',     label: 'Millilitre (ml)' },
  { id: 5,  name: 'pack',   label: 'Pack'            },
  { id: 6,  name: 'piece',  label: 'Piece'           },
  { id: 7,  name: 'bunch',  label: 'Bunch'           },
  { id: 8,  name: 'bag',    label: 'Bag'             },
  { id: 9,  name: 'crate',  label: 'Crate'           },
  { id: 10, name: 'tuber',  label: 'Tuber'           },
  { id: 11, name: 'pot',    label: 'Pot'             },
  { id: 12, name: 'plate',  label: 'Plate'           },
  { id: 13, name: 'bowl',   label: 'Bowl'            },
  { id: 14, name: 'bottle', label: 'Bottle'          },
  { id: 15, name: 'dozen',  label: 'Dozen'           },
  { id: 16, name: 'carton', label: 'Carton'          },
]

// ── Full product import schema (mirrors every Add Product field) ──────────────
// Columns grouped by form section for clarity in the template / mapping UI
const PRODUCT_IMPORT_FIELDS = [
  // ── Product Information ──────────────────────────────
  {
    key: 'name', label: 'Product Name', required: true, section: 'Product Info',
  },
  {
    key: 'description', label: 'Description', required: false, section: 'Product Info',
  },
  {
    key: 'category', label: 'Category', required: true, section: 'Product Info',
    hint: CATEGORIES.map(c => c.name).join(' | '),
  },
  {
    key: 'sub_category', label: 'Sub-Category', required: false, section: 'Product Info',
  },
  {
    key: 'brand', label: 'Brand', required: false, section: 'Product Info',
    hint: BRANDS.map(b => b.name).join(' | '),
  },
  {
    key: 'unit', label: 'Unit of Measure', required: true, section: 'Product Info',
    hint: UNITS.map(u => u.name).join(' | '),
  },
  {
    key: 'model', label: 'Model / Variant', required: false, section: 'Product Info',
  },
  {
    key: 'tags', label: 'Tags', required: false, section: 'Product Info',
  },

  // ── Pricing & Stock ──────────────────────────────────
  {
    key: 'unit_price', label: 'Unit Price (₦)', required: true, section: 'Pricing & Stock',
    validate: v => v && isNaN(Number(v.replace(/,/g, ''))) ? 'Must be a number' : null,
  },
  {
    key: 'cost_price', label: 'Cost Price (₦)', required: true, section: 'Pricing & Stock',
    validate: v => v && isNaN(Number(v.replace(/,/g, ''))) ? 'Must be a number' : null,
  },
  {
    key: 'available_for_sale', label: 'Available for Sale', required: false, section: 'Pricing & Stock',
    hint: 'yes | no',
  },
  {
    key: 'stock_qty', label: 'Stock Quantity', required: false, section: 'Pricing & Stock',
    validate: v => v && isNaN(Number(v)) ? 'Must be a number' : null,
  },
  {
    key: 'low_stock_alert', label: 'Low Stock Alert', required: false, section: 'Pricing & Stock',
    validate: v => v && isNaN(Number(v)) ? 'Must be a number' : null,
  },

  // ── Advanced Settings ────────────────────────────────
  {
    key: 'sku', label: 'SKU', required: true, section: 'Advanced Settings',
  },
  {
    key: 'tax', label: 'Tax (%)', required: false, section: 'Advanced Settings',
    validate: v => v && isNaN(Number(v)) ? 'Must be a number' : null,
  },
  {
    key: 'track_inventory', label: 'Track Inventory', required: false, section: 'Advanced Settings',
    hint: 'yes | no',
  },
  {
    key: 'expiry_date', label: 'Expiry Date', required: false, section: 'Advanced Settings',
    hint: 'YYYY-MM-DD',
  },
  {
    key: 'status', label: 'Product Status', required: false, section: 'Advanced Settings',
    hint: 'active | inactive | draft',
  },
  {
    key: 'hsn_code', label: 'HSN Code', required: false, section: 'Advanced Settings',
  },
  {
    key: 'return_policy', label: 'Return Policy', required: false, section: 'Advanced Settings',
    hint: 'no_return | 7days | 14days | 30days',
  },

  // ── Images & Media ───────────────────────────────────
  {
    key: 'main_image_url', label: 'Main Image URL', required: false, section: 'Images & Media',
    hint: 'https://… — direct link to main product image',
  },
  {
    key: 'image_2_url', label: 'Image 2 URL', required: false, section: 'Images & Media',
    hint: 'https://… — additional product image',
  },
  {
    key: 'image_3_url', label: 'Image 3 URL', required: false, section: 'Images & Media',
    hint: 'https://… — additional product image',
  },
  {
    key: 'image_4_url', label: 'Image 4 URL', required: false, section: 'Images & Media',
    hint: 'https://… — additional product image',
  },
  {
    key: 'image_title', label: 'Image Title', required: false, section: 'Images & Media',
    hint: 'Alt text / title for the main image',
  },
  {
    key: 'image_tags', label: 'Image Tags', required: false, section: 'Images & Media',
    hint: 'e.g. packaging, front-view, label',
  },
  {
    key: 'video_url', label: 'Product Video URL', required: false, section: 'Images & Media',
    hint: 'YouTube / Vimeo / MP4 link',
  },
]

// ── Sample row values for the CSV template ────────────────────────────────────
const SAMPLE_ROW = {
  name:               'Basmati Rice (5kg)',
  description:        'Premium long-grain basmati rice from the farm',
  category:           'Grains & Carbs',
  sub_category:       'Rice & Beans',
  brand:              'Bems Farms (Own Brand)',
  unit:               'bag',
  model:              '5kg bag',
  tags:               'Best Seller, Organic',
  unit_price:         '6500',
  cost_price:         '4800',
  available_for_sale: 'yes',
  stock_qty:          '120',
  low_stock_alert:    '10',
  sku:                'GRN-RIC-001',
  tax:                '0',
  track_inventory:    'yes',
  expiry_date:        '2027-12-31',
  status:             'active',
  hsn_code:           '1006.30',
  return_policy:      'no_return',
  main_image_url:     'https://example.com/images/basmati-main.jpg',
  image_2_url:        'https://example.com/images/basmati-pack.jpg',
  image_3_url:        '',
  image_4_url:        '',
  image_title:        'Bems Farms Basmati Rice 5kg',
  image_tags:         'packaging, front-view',
  video_url:          'https://youtube.com/watch?v=example',
}

function downloadTemplate() {
  const headers = PRODUCT_IMPORT_FIELDS.map(f => `"${f.label}"`)
  const sample  = PRODUCT_IMPORT_FIELDS.map(f => `"${SAMPLE_ROW[f.key] ?? ''}"`)
  const csv     = [headers.join(','), sample.join(',')].join('\n')
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = 'bems-farms-product-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AddProduct() {
  const [mode, setMode]                     = useState('single')  // 'single' | 'import'
  const [importDone, setImportDone]         = useState(false)
  const [importedCount, setImportedCount]   = useState(0)

  // Single-add form state
  const [categoryId, setCategoryId]         = useState('')
  const [subCategoryId, setSubCategoryId]   = useState('')
  const [brandId, setBrandId]               = useState('')
  const [unitId, setUnitId]                 = useState('')

  const filteredSubs = categoryId
    ? SUB_CATEGORIES.filter(s => s.categoryId === Number(categoryId))
    : []

  function handleCategoryChange(e) {
    setCategoryId(e.target.value)
    setSubCategoryId('')
  }

  function handleImport(rows) {
    setImportedCount(rows.length)
    setImportDone(true)
    setMode('single')  // close ImportModal, return to page
  }

  return (
    <div className="container-fluid">
      {/* Page heading + mode toggle */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Add Products</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Products</a></li>
          <li className="breadcrumb-item active">Add Products</li>
        </ul>
      </div>

      {/* Mode switcher */}
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <div className="d-flex gap-1 p-1 rounded" style={{ background:'#f0f3f9', border:'1px solid #dee2e6' }}>
          <button
            className={`btn btn-sm px-4 d-flex align-items-center gap-2 ${mode === 'single' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
            onClick={() => setMode('single')}>
            <i className="ri-file-add-line"></i> Add Single Product
          </button>
          <button
            className={`btn btn-sm px-4 d-flex align-items-center gap-2 ${mode === 'import' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
            onClick={() => setMode('import')}>
            <i className="ri-upload-cloud-2-line"></i> Bulk Import
          </button>
        </div>
        {importDone && (
          <div className="alert alert-success mb-0 py-2 px-3 d-flex align-items-center gap-2" style={{ fontSize:13 }}>
            <i className="ri-checkbox-circle-line fs-16"></i>
            <strong>{importedCount} products</strong> imported successfully.
          </div>
        )}
      </div>

      {/* ── BULK IMPORT MODE ─────────────────────────────────────────────── */}
      {mode === 'import' && (
        <div className="row">
          <div className="col-12">

            {/* Schema reference card */}
            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <i className="ri-table-line text-primary fs-16"></i>
                <h6 className="mb-0 fw-semibold">CSV Column Reference</h6>
                <span className="badge bg-primary-subtle text-primary ms-auto">{PRODUCT_IMPORT_FIELDS.length} columns</span>
              </div>
              <div className="card-body pt-0">
                <p className="text-muted mb-3" style={{ fontSize:13 }}>
                  Your CSV file must have column headers matching the fields below. Required fields <span className="text-danger fw-bold">*</span> must not be empty.
                  Columns can be in any order — you will map them in the next step.
                </p>

                {/* Group fields by section */}
                {['Product Info', 'Pricing & Stock', 'Advanced Settings', 'Images & Media'].map(section => (
                  <div key={section} className="mb-4">
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-2" style={{ fontSize:13, color:'#405189' }}>
                      <div style={{ width:3, height:14, background:'#405189', borderRadius:2 }}></div>
                      {section}
                    </div>
                    <div className="row g-2">
                      {PRODUCT_IMPORT_FIELDS.filter(f => f.section === section).map(f => (
                        <div className="col-md-6 col-xl-4" key={f.key}>
                          <div className="p-2 rounded d-flex flex-column gap-1"
                            style={{ background: f.required ? '#fef3f3' : '#f8f9fa', border:`1px solid ${f.required ? '#fecaca' : '#e9ecef'}` }}>
                            <div className="d-flex align-items-center gap-1">
                              <code style={{ fontSize:11, color:'#405189' }}>{f.label}</code>
                              {f.required && <span className="text-danger fw-bold" style={{ fontSize:13 }}>*</span>}
                            </div>
                            {f.hint && (
                              <div className="text-muted" style={{ fontSize:10 }}>
                                <i className="ri-information-line me-1"></i>{f.hint}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded d-flex align-items-center gap-3 mt-2 flex-wrap"
                  style={{ background:'#f0f9ff', border:'1px solid #bae6fd' }}>
                  <div className="flex-grow-1" style={{ fontSize:12 }}>
                    <div className="fw-medium mb-1">CSV Template</div>
                    <div className="text-muted">
                      Pre-filled with a sample Bems Farms product row — {PRODUCT_IMPORT_FIELDS.length} columns, ready to fill in.
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm d-flex align-items-center gap-1 flex-shrink-0"
                    onClick={downloadTemplate}>
                    <i className="ri-download-2-line"></i> Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* Import wizard trigger */}
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width:64, height:64, background:'#405189' + '1a' }}>
                    <i className="ri-upload-cloud-2-line fs-1" style={{ color:'#405189' }}></i>
                  </div>
                </div>
                <h6 className="fw-bold mb-1">Ready to Import?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13, maxWidth:440, margin:'0 auto 1.5rem' }}>
                  Upload a CSV or Excel file, paste data, or pull from a URL.
                  You'll map your columns to the fields above and review each row for errors before anything is saved.
                </p>
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
      {mode === 'import-wizard' && (
        <ImportModal
          entityName="Products"
          fields={PRODUCT_IMPORT_FIELDS}
          onImport={handleImport}
          onClose={() => setMode('import')}
        />
      )}

      {/* ── SINGLE PRODUCT FORM ──────────────────────────────────────────── */}
      {mode === 'single' && (
        <div className="row">
          <div className="col-xl-7 col-xxl-8">
            <form action="#">

              {/* ── Product Information ─────────────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Product Information</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">

                    <div className="col-12">
                      <label htmlFor="productName" className="form-label fw-medium">Product Name <span className="text-danger">*</span></label>
                      <input type="text" id="productName" className="form-control" placeholder="Enter product name" required />
                    </div>

                    <div className="col-12">
                      <label htmlFor="productDescription" className="form-label fw-medium">Description</label>
                      <textarea id="productDescription" className="form-control" rows="3" placeholder="Enter product description"></textarea>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="categorySelect" className="form-label fw-medium">Category <span className="text-danger">*</span></label>
                      <select id="categorySelect" className="form-select" value={categoryId} onChange={handleCategoryChange} required>
                        <option value="">— Select category —</option>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="subCategorySelect" className="form-label fw-medium">Sub-Category</label>
                      <select id="subCategorySelect" className="form-select" value={subCategoryId}
                        onChange={e => setSubCategoryId(e.target.value)} disabled={!categoryId}>
                        <option value="">{categoryId ? '— Select sub-category —' : '— Pick a category first —'}</option>
                        {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="brandSelect" className="form-label fw-medium">Brand</label>
                      <select id="brandSelect" className="form-select" value={brandId}
                        onChange={e => setBrandId(e.target.value)}>
                        <option value="">— Select brand —</option>
                        {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label htmlFor="unitSelect" className="form-label fw-medium">Unit of Measure <span className="text-danger">*</span></label>
                      <select id="unitSelect" className="form-select" value={unitId}
                        onChange={e => setUnitId(e.target.value)} required>
                        <option value="">— Select unit —</option>
                        {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label htmlFor="modelName" className="form-label fw-medium">Model / Variant</label>
                      <input type="text" id="modelName" className="form-control" placeholder="e.g. 1kg, 500ml" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Tags <span className="text-muted fw-normal">(optional)</span></label>
                      <input className="form-control" placeholder="e.g. Best Seller, Organic, New Arrival" />
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Pricing & Stock ─────────────────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Pricing & Stock</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="unitPrice" className="form-label fw-medium">Unit Price <span className="text-danger">*</span></label>
                      <input type="number" id="unitPrice" className="form-control" placeholder="₦0.00" required />
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="costPrice" className="form-label fw-medium">Cost Price <span className="text-danger">*</span></label>
                      <input type="number" id="costPrice" className="form-control" placeholder="₦0.00" required />
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="marginPercent" className="form-label fw-medium">Margin (%) — Auto</label>
                      <input type="number" id="marginPercent" className="form-control" placeholder="%" readOnly />
                    </div>
                    <div className="col-md-6 col-xxl-4 d-flex align-items-center gap-2">
                      <div className="form-switch switch-light-primary mt-2">
                        <input className="form-check-input" type="checkbox" id="availableSale" defaultChecked />
                        <label className="form-check-label d-none" htmlFor="availableSale"></label>
                      </div>
                      <p className="mb-0">Available for Sale</p>
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="stockQty" className="form-label fw-medium">Stock Quantity</label>
                      <div className="input-spin-group input-spin-primary">
                        <button type="button" className="input-spin-minus"><i data-lucide="minus" className="size-4"></i></button>
                        <input type="text" className="input-spin form-control" readOnly defaultValue="1" />
                        <button type="button" className="input-spin-plus"><i data-lucide="plus" className="size-4"></i></button>
                      </div>
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="lowStockAlert" className="form-label fw-medium">Low Stock Alert</label>
                      <div className="input-spin-group input-spin-primary">
                        <button type="button" className="input-spin-minus"><i data-lucide="minus" className="size-4"></i></button>
                        <input type="text" id="lowStockAlert" className="input-spin form-control" readOnly defaultValue="1" />
                        <button type="button" className="input-spin-plus"><i data-lucide="plus" className="size-4"></i></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Advanced Product Settings ────────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Advanced Product Settings</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-6 col-xxl-3">
                      <label htmlFor="sku" className="form-label fw-medium">SKU <span className="text-danger">*</span></label>
                      <input type="text" id="sku" className="form-control" placeholder="SKU" required />
                    </div>
                    <div className="col-md-6 col-xxl-3">
                      <label htmlFor="tax" className="form-label fw-medium">Tax (%)</label>
                      <input type="number" id="tax" className="form-control" placeholder="7.5" />
                    </div>
                    <div className="col-md-6 col-xxl-3">
                      <label htmlFor="lowStockalert" className="form-label fw-medium">Low Stock Alert</label>
                      <input type="number" id="lowStockalert" className="form-control" placeholder="e.g. 5" />
                    </div>
                    <div className="col-md-6 col-xxl-3">
                      <label htmlFor="trackInventory" className="form-label fw-medium">Track Inventory</label>
                      <select id="trackInventory" className="form-select">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="expiryDate" className="form-label fw-medium">Expiry Date</label>
                      <input type="date" id="expiryDate" className="form-control" />
                    </div>
                    <div className="col-md-6 col-xxl-4">
                      <label htmlFor="productStatus" className="form-label fw-medium">Product Status</label>
                      <select id="productStatus" className="form-select">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hsnCode" className="form-label fw-medium">HSN Code</label>
                      <input type="text" id="hsnCode" className="form-control" placeholder="Enter HSN code" />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="returnPolicy" className="form-label fw-medium">Return Policy</label>
                      <select id="returnPolicy" className="form-select">
                        <option value="">— Select policy —</option>
                        <option value="no_return">No Returns</option>
                        <option value="7days">7-Day Return</option>
                        <option value="14days">14-Day Return</option>
                        <option value="30days">30-Day Return</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-5 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light">
                      <i className="ri-close-line me-1 align-middle"></i>Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Save Product</button>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* ── Product Images & Media ─────────────────────────────────── */}
          <div className="col-xl-5 col-xxl-4">
            <div className="card position-sticky top-20">
              <div className="card-header">
                <h5 className="card-title mb-0">Product Images & Media</h5>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  <div className="col-12">
                    <label htmlFor="mainProductImage" className="avatar h-52 p-5 text-center bg-light rounded cursor-pointer">
                      <div>
                        <i data-lucide="upload-cloud"></i><br />
                        <div className="mt-3"><strong>Drag & Drop</strong> images here or click to upload</div>
                      </div>
                    </label>
                    <input type="file" id="mainProductImage" className="d-none" />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="subImage1" className="avatar h-28 p-4 text-center bg-light rounded cursor-pointer">
                      <div>
                        <i data-lucide="upload-cloud" className="size-5"></i>
                        <div className="mt-1 fs-sm">Image 2</div>
                      </div>
                    </label>
                    <input type="file" id="subImage1" className="d-none" />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="subImage2" className="avatar h-28 p-4 text-center bg-light rounded cursor-pointer">
                      <div>
                        <i data-lucide="upload-cloud" className="size-5"></i>
                        <div className="mt-1 fs-sm">Image 3</div>
                      </div>
                    </label>
                    <input type="file" id="subImage2" className="d-none" />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="subImage3" className="avatar h-28 p-4 text-center bg-light rounded cursor-pointer">
                      <div>
                        <i data-lucide="upload-cloud" className="size-5"></i>
                        <div className="mt-1 fs-sm">Image 4</div>
                      </div>
                    </label>
                    <input type="file" id="subImage3" className="d-none" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="imageTitle" className="form-label fw-medium">Image Title</label>
                    <input type="text" id="imageTitle" className="form-control" placeholder="title" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="imageTags" className="form-label fw-medium">Image Tags</label>
                    <input type="text" id="imageTags" className="form-control" placeholder="e.g. packaging" />
                  </div>
                  <div className="col-12">
                    <label htmlFor="productVideoUrl" className="form-label fw-medium">Product Video URL</label>
                    <input type="text" id="productVideoUrl" className="form-control" placeholder="YouTube / Vimeo / MP4 link" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
