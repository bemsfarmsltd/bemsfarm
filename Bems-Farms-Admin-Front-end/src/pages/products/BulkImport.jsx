import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// ── Sample CSV Template Data ──────────────────────────────────────────────────
const PRODUCTS_SAMPLE_CSV = `name,sku,barcode,category,unit_price,cost_price,stock_qty,unit,low_stock_alert,tax_percent,description,status
Ofada Rice (5kg Bag),RICE-OFA-05KG,950110001001,Rice & Grains,12500,9800,150,5 kg bag,15,7.5,"Stone-free premium aromatic brown ofada rice.",active
Pure Red Palm Oil (1L),OIL-PLM-01LT,950110001002,Cooking Oils,3200,2400,200,1 litre bottle,20,7.5,"First-press unrefined red palm oil from Imo State groves.",active
Fresh Farm Eggs (Crate),EGG-FRM-01CR,950110001003,Poultry & Dairy,4500,3600,85,1 crate (30 eggs),10,0.0,"Clean grade-A brown eggs freshly collected daily.",active
Smoked Catfish (Pack of 4),FISH-CAT-04PK,950110001004,Fish & Seafood,6000,4500,45,Pack of 4,8,7.5,"Oven-dried hygienic catfish with long shelf life.",active
Ijebu Garri (5kg Bag),GAR-IJB-05KG,950110001005,Tubers & Grains,5500,4200,110,5 kg bag,12,7.5,"Crispy, sour, dry-fried authentic Ijebu cassava flakes.",active
Ugu Pumpkin Leaves (Large Bunch),VEG-UGU-01BN,950110001006,Fresh Vegetables,800,500,60,Large bunch,15,0.0,"Farm-fresh cut fluted pumpkin leaves rich in iron.",active`

const PRODUCTS_BLANK_CSV = `name,sku,barcode,category,unit_price,cost_price,stock_qty,unit,low_stock_alert,tax_percent,description,status`

const CATEGORIES_SAMPLE_CSV = `name,code,description,status
Rice & Grains,GRAINS,"Local and imported grains, flours, and cereals",active
Cooking Oils,OILS,"Red palm oil, vegetable oil, groundnut oil",active
Poultry & Dairy,POULTRY,"Farm fresh eggs, chicken, and dairy items",active
Fish & Seafood,SEAFOOD,"Fresh and smoked fish, crayfish, and prawns",active
Tubers & Root Crops,TUBERS,"Yams, cassava, potatoes, and plantains",active`

const CATEGORIES_BLANK_CSV = `name,code,description,status`

// ── System fields per import type ─────────────────────────────────────────────
const IMPORT_TYPES = {
  products: {
    label: 'Products',
    icon: 'ri-box-3-line',
    color: '#0ab39c',
    fields: [
      { key: 'name',             label: 'Product Name',      required: true,  example: 'Ofada Rice (5kg Bag)', desc: 'Official commercial name of product' },
      { key: 'sku',              label: 'SKU (Stock Code)',  required: true,  example: 'RICE-OFA-05KG',         desc: 'Unique product tracking code' },
      { key: 'barcode',          label: 'Barcode / UPC',     required: false, example: '950110001001',         desc: 'Universal barcode or EAN number' },
      { key: 'category_id',      label: 'Category Name/ID',  required: true,  example: 'Rice & Grains',         desc: 'Category name or numeric ID' },
      { key: 'unit_price',       label: 'Selling Price (₦)', required: true,  example: '12500',                 desc: 'Retail or sales price per unit' },
      { key: 'cost_price',       label: 'Cost Price (₦)',    required: false, example: '9800',                  desc: 'Purchase or production cost' },
      { key: 'stock_qty',        label: 'Initial Stock Qty', required: true,  example: '150',                   desc: 'Units in warehouse / store stock' },
      { key: 'unit',             label: 'Packaging Unit',    required: false, example: '5 kg bag',              desc: 'e.g. 1 kg, crate, litre bottle' },
      { key: 'low_stock_alert',  label: 'Low Stock Alert',   required: false, example: '15',                    desc: 'Threshold triggering replenishment' },
      { key: 'tax_percent',      label: 'Tax Rate (%)',      required: false, example: '7.5',                   desc: 'VAT rate applied to sales' },
      { key: 'description',      label: 'Description',       required: false, example: 'Premium stone-free...', desc: 'Customer and store details' },
      { key: 'status',           label: 'Status',            required: false, example: 'active',                desc: 'active or inactive' },
    ],
    sampleCSV: PRODUCTS_SAMPLE_CSV,
    blankCSV: PRODUCTS_BLANK_CSV,
  },
  categories: {
    label: 'Categories',
    icon: 'ri-folder-line',
    color: '#405189',
    fields: [
      { key: 'name',        label: 'Category Name', required: true,  example: 'Rice & Grains',         desc: 'Department or category title' },
      { key: 'code',        label: 'Category Code', required: false, example: 'GRAINS',                desc: 'Short uppercase classification code' },
      { key: 'description', label: 'Description',   required: false, example: 'Grains, flours & rice', desc: 'Department details' },
      { key: 'status',      label: 'Status',        required: false, example: 'active',                desc: 'active or inactive' },
    ],
    sampleCSV: CATEGORIES_SAMPLE_CSV,
    blankCSV: CATEGORIES_BLANK_CSV,
  },
}

const FIELD_ALIASES = {
  name: ['name', 'product_name', 'product', 'item_name', 'item', 'title', 'goods_name'],
  sku: ['sku', 'item_code', 'product_code', 'code', 'product_sku', 'reference', 'ref'],
  barcode: ['barcode', 'upc', 'ean', 'gtin', 'isbn', 'barcode_number', 'upc_ean'],
  category_id: ['category', 'category_name', 'category_id', 'department', 'cat', 'dept', 'product_category'],
  sub_category_id: ['sub_category', 'sub_category_name', 'sub_category_id', 'subcategory', 'subcat'],
  unit_price: ['unit_price', 'price', 'selling_price', 'retail_price', 'sales_price', 'rate', 'amount', 'selling_rate'],
  cost_price: ['cost_price', 'cost', 'buying_price', 'purchase_price', 'wholesale_price', 'unit_cost'],
  stock_qty: ['stock_qty', 'stock', 'quantity', 'qty', 'stock_quantity', 'count', 'units', 'inventory', 'on_hand'],
  unit: ['unit', 'uom', 'measurement', 'package', 'package_size', 'size', 'packaging', 'unit_of_measure'],
  low_stock_alert: ['low_stock_alert', 'low_stock', 'min_stock', 'reorder_level', 'threshold', 'alert_threshold'],
  tax_percent: ['tax_percent', 'tax', 'vat', 'tax_rate', 'vat_percent'],
  description: ['description', 'desc', 'details', 'notes', 'product_description', 'summary', 'about'],
  status: ['status', 'active', 'state', 'visibility'],
  code: ['code', 'category_code', 'slug', 'cat_code'],
}

// ── Robust RFC-4180 Compliant CSV Parser ──────────────────────────────────────
function parseCSV(text) {
  const lines = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      row.push(cell.trim())
      if (row.some(c => c !== '')) {
        lines.push(row)
      }
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim())
    if (row.some(c => c !== '')) {
      lines.push(row)
    }
  }

  if (!lines.length) return { headers: [], rows: [] }
  const headers = lines[0].map(h => h.replace(/^["']|["']$/g, '').trim())
  const rows = lines.slice(1).map(r => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx] : ''
    })
    return obj
  })

  return { headers, rows }
}

function autoMapHeaders(headers, fields) {
  const map = {}
  fields.forEach(f => {
    // 1. Exact key match
    const exact = headers.find(h => h.toLowerCase() === f.key.toLowerCase())
    if (exact) {
      map[f.key] = exact
      return
    }
    // 2. Exact label match
    const labelMatch = headers.find(h => h.toLowerCase() === f.label.toLowerCase())
    if (labelMatch) {
      map[f.key] = labelMatch
      return
    }
    // 3. Known aliases match
    const aliases = FIELD_ALIASES[f.key] || []
    const aliasMatch = headers.find(h => {
      const normalized = h.toLowerCase().replace(/[\s_-]+/g, '_')
      return aliases.some(a => normalized === a || normalized.includes(a))
    })
    if (aliasMatch) {
      map[f.key] = aliasMatch
    }
  })
  return map
}

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

export default function BulkImport() {
  const [activeType, setActiveType]     = useState('products')
  const [step, setStep]                 = useState(1) // 1 = upload & download, 2 = map, 3 = results
  const [dragOver, setDragOver]         = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileHeaders, setFileHeaders]   = useState([])
  const [parsedRows, setParsedRows]     = useState([])
  const [mapping, setMapping]           = useState({})
  const [updateExisting, setUpdateExisting] = useState(true)
  const [autoCreateCategories, setAutoCreateCategories] = useState(true)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const fileInputRef = useRef(null)

  // Load / persist history in localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('bems_import_history')
      return saved ? JSON.parse(saved) : [
        { file: 'bems_products_sample.csv', type: 'products', by: 'Administrator', status: 'success', imported: 6, failed: 0, date: '12 Sep 2026' },
      ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bems_import_history', JSON.stringify(history))
    } catch {}
  }, [history])

  const typeConfig = IMPORT_TYPES[activeType]

  function handleTypeChange(key) {
    setActiveType(key)
    resetUpload()
  }

  function resetUpload() {
    setStep(1)
    setUploadedFile(null)
    setFileHeaders([])
    setParsedRows([])
    setMapping({})
    setImportResult(null)
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      toast.error('Please upload a valid CSV file (.csv)')
      return
    }

    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target.result
        const { headers, rows } = parseCSV(text)
        if (!headers.length) {
          toast.error('The uploaded file is empty or could not be read.')
          return
        }
        if (!rows.length) {
          toast.error('The uploaded CSV file contains headers but no data rows.')
          return
        }

        setFileHeaders(headers)
        setParsedRows(rows)

        const autoMap = autoMapHeaders(headers, typeConfig.fields)
        setMapping(autoMap)
        setStep(2)
        toast.success(`Loaded ${rows.length} rows and ${headers.length} columns!`)
      } catch (err) {
        console.error('CSV parse error:', err)
        toast.error('Failed to parse CSV file. Please ensure it is UTF-8 encoded.')
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // Check required fields mapping
  const missingRequired = useMemo(() => {
    return typeConfig.fields.filter(f => f.required && !mapping[f.key])
  }, [typeConfig, mapping])

  const isExactSchemaMatch = useMemo(() => {
    return typeConfig.fields.every(f => mapping[f.key] === f.key)
  }, [typeConfig, mapping])

  // Live preview of first 5 mapped rows
  const transformedPreview = useMemo(() => {
    if (!parsedRows.length) return []
    return parsedRows.slice(0, 5).map(row => {
      const transformed = {}
      typeConfig.fields.forEach(f => {
        const mappedHeader = mapping[f.key]
        transformed[f.key] = mappedHeader ? row[mappedHeader] : ''
      })
      return transformed
    })
  }, [parsedRows, mapping, typeConfig])

  async function handleExecuteImport() {
    if (missingRequired.length > 0) {
      toast.error(`Please map all required fields: ${missingRequired.map(f => f.label).join(', ')}`)
      return
    }

    setImporting(true)
    try {
      // Transform all rows according to user's schema mapping
      const mappedRows = parsedRows.map(row => {
        const item = {}
        typeConfig.fields.forEach(f => {
          const mappedHeader = mapping[f.key]
          if (mappedHeader && row[mappedHeader] !== undefined) {
            item[f.key] = row[mappedHeader]
          }
        })
        return item
      })

      const payload = {
        type: activeType,
        rows: mappedRows,
        update_existing: updateExisting,
        auto_create_categories: autoCreateCategories,
      }

      const res = await api.post('/admin/products/bulk-import', payload)
      const data = res.data

      setImportResult({
        success: true,
        imported: data.imported || 0,
        updated: data.updated || 0,
        failed: data.failed || 0,
        total: data.total || mappedRows.length,
        errors: data.errors || [],
        message: data.message,
      })

      // Add to history
      const newEntry = {
        file: uploadedFile?.name || `${activeType}_import.csv`,
        type: activeType,
        by: 'Admin',
        status: data.failed > 0 ? (data.imported > 0 ? 'partial' : 'failed') : 'success',
        imported: data.imported || 0,
        failed: data.failed || 0,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      }
      setHistory(prev => [newEntry, ...prev])

      setStep(3)
      toast.success(data.message || 'Import finished successfully!')
    } catch (err) {
      console.error('Import failed:', err)
      const errMsg = err?.response?.data?.message || err.message || 'Bulk import failed'
      toast.error(errMsg)
      setImportResult({
        success: false,
        imported: err?.response?.data?.imported || 0,
        failed: err?.response?.data?.failed || parsedRows.length,
        total: parsedRows.length,
        errors: err?.response?.data?.errors || [{ row: 'All', message: errMsg }],
        message: errMsg,
      })
      setStep(3)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container-fluid py-2">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex justify-content-between align-items-md-center">
        <div>
          <h6 className="mb-0 fw-bold">Bulk Import & Schema Mapping</h6>
          <p className="text-muted fs-sm mb-0">
            Download standardized CSV templates, map your custom columns, and batch import goods into Bems Farms inventory.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/products" className="btn btn-outline-secondary btn-sm">
            <i className="ri-arrow-left-line me-1"></i>Back to Products
          </Link>
          <Link to="/products/export" className="btn btn-outline-primary btn-sm">
            <i className="ri-download-cloud-line me-1"></i>Bulk Export
          </Link>
        </div>
      </div>

      {/* ── Type Selector ────────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex gap-2">
            {Object.entries(IMPORT_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                className={`btn btn-sm d-flex align-items-center gap-1.5 ${
                  activeType === key ? 'btn-dark text-white fw-bold' : 'btn-light text-dark'
                }`}
              >
                <i className={cfg.icon} style={{ color: activeType === key ? '#10b981' : undefined }}></i>
                <span>Import {cfg.label}</span>
              </button>
            ))}
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowGuidelines(prev => !prev)}
            >
              <i className="ri-information-line me-1"></i>
              {showGuidelines ? 'Hide Schema Guide' : 'View Schema Guide'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Schema Reference Guide (Collapsible) ─────────────────────────── */}
      {showGuidelines && (
        <div className="card shadow-sm border-0 mb-3 bg-light">
          <div className="card-header bg-white py-2 border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 fs-sm text-dark d-flex align-items-center gap-2">
              <i className="ri-file-list-3-line text-primary"></i>
              Official {typeConfig.label} Schema Specification
            </h6>
            <span className="badge bg-primary-subtle text-primary">System Format</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0 fs-xs">
                <thead className="table-light text-muted">
                  <tr>
                    <th className="ps-3">System Column</th>
                    <th>Required?</th>
                    <th>Example Value</th>
                    <th className="pe-3">Description & Accepted Values</th>
                  </tr>
                </thead>
                <tbody>
                  {typeConfig.fields.map(f => (
                    <tr key={f.key}>
                      <td className="ps-3 font-monospace fw-bold text-dark">{f.key}</td>
                      <td>
                        {f.required ? (
                          <span className="badge bg-danger-subtle text-danger">Required</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">Optional</span>
                        )}
                      </td>
                      <td className="font-monospace text-muted">{f.example}</td>
                      <td className="pe-3 text-muted">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Step Progress Indicator ───────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body py-3">
          <div className="row g-2 text-center">
            <div className="col-4">
              <div className={`p-2 rounded-3 ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                <div className="fw-bold fs-xs">STEP 1</div>
                <div className="fs-sm fw-semibold">
                  <i className="ri-download-cloud-line me-1"></i>Download Template & Upload
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className={`p-2 rounded-3 ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                <div className="fw-bold fs-xs">STEP 2</div>
                <div className="fs-sm fw-semibold">
                  <i className="ri-git-merge-line me-1"></i>Schema Mapping & Validation
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className={`p-2 rounded-3 ${step === 3 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                <div className="fw-bold fs-xs">STEP 3</div>
                <div className="fs-sm fw-semibold">
                  <i className="ri-checkbox-circle-line me-1"></i>Review & Results
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: Download Templates & Upload File ──────────────────────── */}
      {step === 1 && (
        <div className="row g-3">
          {/* Direct Download Templates Card */}
          <div className="col-12">
            <div className="card shadow-sm border-0 border-start border-4 border-success">
              <div className="card-body p-4">
                <div className="row align-items-center g-3">
                  <div className="col-lg-8">
                    <div className="d-flex align-items-center gap-3">
                      <div className="size-12 rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center fs-2xl flex-shrink-0">
                        <i className="ri-file-excel-2-line"></i>
                      </div>
                      <div>
                        <h5 className="fw-bold text-dark mb-1">
                          Download Official Bems Farms {typeConfig.label} CSV Template
                        </h5>
                        <p className="text-muted fs-sm mb-0">
                          Use our pre-configured CSV spreadsheet to fill in your inventory directly. Uploading this template guarantees <strong>100% automatic schema mapping</strong> with zero manual adjustments.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                      <button
                        type="button"
                        className="btn btn-outline-success d-flex align-items-center justify-content-center gap-1.5"
                        onClick={() => downloadCSV(`bems_${activeType}_blank_template.csv`, typeConfig.blankCSV)}
                        title="Download blank template with official column headers only"
                      >
                        <i className="ri-download-line"></i>
                        <span>Blank Template</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-success text-white d-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                        onClick={() => downloadCSV(`bems_${activeType}_with_samples.csv`, typeConfig.sampleCSV)}
                        title="Download template prefilled with realistic Nigerian farm produce examples"
                      >
                        <i className="ri-file-download-fill"></i>
                        <span>Sample CSV (with Data)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drag and Drop Upload Zone */}
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-bottom py-3">
                <h6 className="card-title fw-bold mb-0 text-dark">
                  Upload CSV Data File
                </h6>
              </div>
              <div className="card-body p-4">
                <div
                  className={`border rounded-4 p-5 text-center transition-all ${
                    dragOver ? 'border-primary bg-primary bg-opacity-10 scale-up' : 'border-dashed'
                  }`}
                  style={{
                    cursor: 'pointer',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: dragOver ? '#10b981' : '#cbd5e1',
                    backgroundColor: dragOver ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc',
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="size-16 rounded-circle bg-white shadow-sm text-primary d-flex align-items-center justify-content-center mx-auto mb-3 fs-3xl">
                    <i className="ri-upload-cloud-2-line"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">Drag and drop your CSV file here</h5>
                  <p className="text-muted fs-sm mb-3">
                    Supports <code>.csv</code> files exported from Excel, Google Sheets, Odoo, or our official template (up to 10 MB).
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  >
                    <i className="ri-folder-open-line me-1"></i>Browse Computer
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="d-none"
                    onChange={e => handleFile(e.target.files[0])}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Interactive Schema Mapping ────────────────────────────── */}
      {step === 2 && (
        <div className="row g-3">
          {/* File summary & Schema Detection Banner */}
          <div className="col-12">
            <div className={`alert ${isExactSchemaMatch ? 'alert-success' : 'alert-info'} d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm mb-0`}>
              <div className="d-flex align-items-center gap-3">
                <i className={`${isExactSchemaMatch ? 'ri-checkbox-circle-fill fs-2xl text-success' : 'ri-git-merge-line fs-2xl text-info'}`}></i>
                <div>
                  <h6 className="fw-bold mb-0">
                    {isExactSchemaMatch ? '✨ Perfect Match: Official Template Schema Detected!' : 'Custom CSV Detected — Review Schema Mapping'}
                  </h6>
                  <p className="mb-0 fs-xs">
                    File: <strong>{uploadedFile?.name}</strong> ({(uploadedFile?.size / 1024).toFixed(1)} KB) · <strong>{parsedRows.length} data rows</strong> · <strong>{fileHeaders.length} columns detected</strong>
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary bg-white"
                  onClick={resetUpload}
                >
                  <i className="ri-arrow-left-line me-1"></i>Change File
                </button>
              </div>
            </div>
          </div>

          {/* Schema Mapping Table */}
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">
                    Map Source CSV Columns to Bems Farms Fields
                  </h6>
                  <p className="text-muted fs-xs mb-0">
                    Confirm or adjust which column from your file supplies each system attribute.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark border">
                    {Object.values(mapping).filter(Boolean).length} of {typeConfig.fields.length} Fields Mapped
                  </span>
                  {missingRequired.length === 0 ? (
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      <i className="ri-check-line me-1"></i>All Required Fields Ready
                    </span>
                  ) : (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                      <i className="ri-alert-line me-1"></i>{missingRequired.length} Required Field(s) Missing
                    </span>
                  )}
                </div>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table align-middle table-hover mb-0 text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3" style={{ width: '28%' }}>Target System Field</th>
                        <th style={{ width: '36%' }}>Source Column in CSV</th>
                        <th className="pe-3" style={{ width: '36%' }}>Live Preview (from your file)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeConfig.fields.map(field => {
                        const mappedHeader = mapping[field.key] || ''
                        const sampleRow = parsedRows[0] || {}
                        const sampleVal = mappedHeader ? sampleRow[mappedHeader] : ''

                        return (
                          <tr key={field.key} className={!mappedHeader && field.required ? 'table-warning bg-opacity-25' : ''}>
                            <td className="ps-3">
                              <div className="d-flex align-items-center gap-2">
                                <div>
                                  <div className="fw-bold text-dark fs-sm">
                                    {field.label}
                                    {field.required && <span className="text-danger ms-1">*</span>}
                                  </div>
                                  <span className="text-muted fs-xs font-monospace">{field.key}</span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <select
                                  className={`form-select form-select-sm ${
                                    mappedHeader ? 'border-success bg-success-subtle text-success fw-semibold' : field.required ? 'border-danger' : ''
                                  }`}
                                  value={mappedHeader}
                                  onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                >
                                  <option value="">— Do not import (Skip) —</option>
                                  {fileHeaders.map(h => (
                                    <option key={h} value={h}>
                                      {h}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            <td className="pe-3">
                              {mappedHeader ? (
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-light text-dark border font-monospace text-truncate" style={{ maxWidth: 280 }}>
                                    {sampleVal ? String(sampleVal) : <span className="text-muted fst-italic">&lt;empty&gt;</span>}
                                  </span>
                                  <i className="ri-check-line text-success fs-sm" title="Mapped successfully"></i>
                                </div>
                              ) : (
                                <span className="text-muted fs-xs fst-italic">
                                  {field.required ? '⚠️ Needs mapping to proceed' : 'Optional (will use default)'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Transformed Data Preview (First 5 Rows) ────────────────────── */}
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark fs-sm d-flex align-items-center gap-2">
                  <i className="ri-eye-line text-primary"></i>
                  Data Preview — First 5 Records Transformed with Current Schema
                </h6>
                <span className="text-muted fs-xs">
                  Showing 5 of {parsedRows.length} records
                </span>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive" style={{ maxHeight: 250 }}>
                  <table className="table table-sm table-striped align-middle mb-0 fs-xs text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">#</th>
                        {typeConfig.fields.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key}>{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transformedPreview.map((row, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-bold text-muted">{idx + 1}</td>
                          {typeConfig.fields.filter(f => mapping[f.key]).map(f => (
                            <td key={f.key} className="text-dark">
                              {row[f.key] ? String(row[f.key]) : <span className="text-muted fst-italic">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options & Action Bar */}
              <div className="card-footer bg-white border-top py-3">
                <div className="row align-items-center g-3">
                  <div className="col-md-7">
                    <div className="d-flex flex-column flex-sm-row gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="chkUpdateExisting"
                          checked={updateExisting}
                          onChange={e => setUpdateExisting(e.target.checked)}
                        />
                        <label className="form-check-label fs-xs fw-semibold" htmlFor="chkUpdateExisting">
                          Update existing products if SKU already exists
                        </label>
                      </div>

                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="chkAutoCreateCats"
                          checked={autoCreateCategories}
                          onChange={e => setAutoCreateCategories(e.target.checked)}
                        />
                        <label className="form-check-label fs-xs fw-semibold" htmlFor="chkAutoCreateCats">
                          Auto-create missing categories
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-5 d-flex justify-content-md-end gap-2">
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={resetUpload}
                      disabled={importing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-success d-flex align-items-center gap-1.5 px-4 shadow-sm"
                      disabled={missingRequired.length > 0 || importing}
                      onClick={handleExecuteImport}
                    >
                      {importing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          Processing Batch Import...
                        </>
                      ) : (
                        <>
                          <i className="ri-upload-cloud-fill"></i>
                          <span>Execute Import ({parsedRows.length} Rows)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results & Execution Summary ───────────────────────────── */}
      {step === 3 && importResult && (
        <div className="row g-3">
          <div className="col-12">
            <div className="card shadow-sm border-0 text-center p-4">
              <div className="card-body">
                <div className={`size-16 rounded-circle ${importResult.failed === 0 ? 'bg-success' : 'bg-warning'} bg-opacity-10 ${importResult.failed === 0 ? 'text-success' : 'text-warning'} d-flex align-items-center justify-content-center mx-auto mb-3 fs-3xl`}>
                  <i className={importResult.failed === 0 ? 'ri-checkbox-circle-fill' : 'ri-alert-fill'}></i>
                </div>

                <h4 className="fw-bold text-dark mb-1">
                  {importResult.failed === 0 ? 'Bulk Import Completed Successfully!' : 'Import Finished with Some Errors'}
                </h4>
                <p className="text-muted fs-sm mb-4">
                  {importResult.message || `Processed ${importResult.total} records.`}
                </p>

                {/* KPI Result Counters */}
                <div className="row g-3 justify-content-center mb-4">
                  <div className="col-sm-4 col-md-3">
                    <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3">
                      <div className="text-success fs-xs fw-bold text-uppercase">Imported New</div>
                      <h3 className="fw-bold text-success mb-0">{importResult.imported}</h3>
                    </div>
                  </div>
                  {importResult.updated > 0 && (
                    <div className="col-sm-4 col-md-3">
                      <div className="p-3 bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3">
                        <div className="text-info fs-xs fw-bold text-uppercase">Updated Existing</div>
                        <h3 className="fw-bold text-info mb-0">{importResult.updated}</h3>
                      </div>
                    </div>
                  )}
                  <div className="col-sm-4 col-md-3">
                    <div className={`p-3 ${importResult.failed > 0 ? 'bg-danger bg-opacity-10 border border-danger border-opacity-25' : 'bg-light'} rounded-3`}>
                      <div className={`${importResult.failed > 0 ? 'text-danger' : 'text-muted'} fs-xs fw-bold text-uppercase`}>Failed Rows</div>
                      <h3 className={`fw-bold ${importResult.failed > 0 ? 'text-danger' : 'text-dark'} mb-0`}>{importResult.failed}</h3>
                    </div>
                  </div>
                </div>

                {/* Error details if any */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-start mb-4">
                    <h6 className="fw-bold text-danger fs-sm mb-2">
                      <i className="ri-error-warning-line me-1"></i>Error Details by Row:
                    </h6>
                    <div className="border rounded-3 p-3 bg-light" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      <ul className="mb-0 ps-3 fs-xs text-danger">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="mb-1">
                            <strong>Row {err.row}:</strong> {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-center gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={resetUpload}>
                    <i className="ri-upload-line me-1"></i>Import Another CSV
                  </button>
                  <Link to="/products" className="btn btn-primary shadow-sm">
                    <i className="ri-box-3-line me-1"></i>View Product Directory
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import History ────────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="card-title fw-bold mb-0 text-dark">Recent Import History</h6>
            <p className="text-muted fs-xs mb-0">Record of uploaded batches, status, and dates</p>
          </div>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              if (window.confirm('Clear import history log?')) {
                setHistory([])
              }
            }}
          >
            <i className="ri-delete-bin-line me-1"></i>Clear History
          </button>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0 text-nowrap">
              <thead className="table-light fs-xs text-muted">
                <tr>
                  <th className="ps-3">Source File</th>
                  <th>Category</th>
                  <th>Uploaded By</th>
                  <th>Results</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4 fs-sm">
                      No import history recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((row, i) => (
                    <tr key={i}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="ri-file-text-line text-success fs-base"></i>
                          <span className="fw-semibold text-dark fs-sm">{row.file}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary text-capitalize">
                          {row.type}
                        </span>
                      </td>
                      <td className="fs-sm">{row.by || 'Admin'}</td>
                      <td>
                        <span className="text-success fs-xs fw-semibold">+{row.imported || 0} imported</span>
                        {row.failed > 0 && <span className="text-danger fs-xs ms-2">({row.failed} failed)</span>}
                      </td>
                      <td>
                        <span className={`badge ${
                          row.status === 'success'
                            ? 'bg-success-subtle text-success border border-success-subtle'
                            : row.status === 'partial'
                            ? 'bg-warning-subtle text-warning border border-warning-subtle'
                            : 'bg-danger-subtle text-danger border border-danger-subtle'
                        }`}>
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-muted fs-xs">{row.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
