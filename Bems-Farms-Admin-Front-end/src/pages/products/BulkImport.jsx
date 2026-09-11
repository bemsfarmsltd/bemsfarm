import { useState, useRef } from 'react'

// ── System fields per import type ─────────────────────────────────────────────
const IMPORT_TYPES = {
  products: {
    label: 'Products',
    icon: 'ri-box-3-line',
    color: '#0ab39c',
    fields: [
      { key: 'name',             label: 'Product Name',      required: true  },
      { key: 'sku',              label: 'SKU',               required: true  },
      { key: 'barcode',          label: 'Barcode',           required: false },
      { key: 'category_id',      label: 'Category ID',       required: true  },
      { key: 'sub_category_id',  label: 'Sub-Category ID',   required: false },
      { key: 'brand_id',         label: 'Brand ID',          required: false },
      { key: 'unit_price',       label: 'Unit Price (₦)',    required: true  },
      { key: 'cost_price',       label: 'Cost Price (₦)',    required: false },
      { key: 'stock_qty',        label: 'Stock Quantity',    required: true  },
      { key: 'unit',             label: 'Unit (kg/pack/…)',  required: false },
      { key: 'low_stock_alert',  label: 'Low Stock Alert',   required: false },
      { key: 'tax_percent',      label: 'Tax (%)',           required: false },
      { key: 'description',      label: 'Description',       required: false },
      { key: 'status',           label: 'Status',            required: false },
    ],
    templateHeaders: ['name','sku','barcode','category_id','sub_category_id','brand_id','unit_price','cost_price','stock_qty','unit','low_stock_alert','tax_percent','description','status'],
  },
  categories: {
    label: 'Categories',
    icon: 'ri-folder-line',
    color: '#405189',
    fields: [
      { key: 'name',        label: 'Category Name', required: true  },
      { key: 'code',        label: 'Code',          required: false },
      { key: 'description', label: 'Description',   required: false },
      { key: 'status',      label: 'Status',        required: false },
    ],
    templateHeaders: ['name','code','description','status'],
  },
  sub_categories: {
    label: 'Sub-Categories',
    icon: 'ri-folder-open-line',
    color: '#299cdb',
    fields: [
      { key: 'name',        label: 'Sub-Category Name', required: true  },
      { key: 'category_id', label: 'Parent Category ID', required: true  },
      { key: 'code',        label: 'Code',               required: false },
      { key: 'description', label: 'Description',        required: false },
      { key: 'status',      label: 'Status',             required: false },
    ],
    templateHeaders: ['name','category_id','code','description','status'],
  },
  brands: {
    label: 'Brands',
    icon: 'ri-price-tag-3-line',
    color: '#f7b84b',
    fields: [
      { key: 'name',        label: 'Brand Name',   required: true  },
      { key: 'description', label: 'Description',  required: false },
      { key: 'website',     label: 'Website URL',  required: false },
      { key: 'status',      label: 'Status',       required: false },
    ],
    templateHeaders: ['name','description','website','status'],
  },
}

const HISTORY = [
  { file: 'products_jan.xlsx',     type: 'products',       by: 'Admin',           status: 'success',    date: '12 Jan 2025' },
  { file: 'variants_feb.csv',      type: 'products',       by: 'Store Manager',   status: 'success',    date: '08 Feb 2025' },
  { file: 'price_update.xls',      type: 'products',       by: 'Admin',           status: 'failed',     date: '22 Feb 2025' },
  { file: 'category_import.csv',   type: 'categories',     by: 'Inventory Team',  status: 'processing', date: '01 Mar 2025' },
  { file: 'supplier_products.xlsx','type': 'products',     by: 'Warehouse Admin', status: 'success',    date: '10 Mar 2025' },
]

const STATUS_BADGE = {
  success:    'bg-success-subtle text-success border border-success-subtle',
  failed:     'bg-danger-subtle text-danger border border-danger-subtle',
  processing: 'bg-info-subtle text-info border border-info-subtle',
}

function downloadTemplate(typeKey) {
  const type = IMPORT_TYPES[typeKey]
  const csv = type.templateHeaders.join(',') + '\n' +
    type.templateHeaders.map(() => '').join(',')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `bems_${typeKey}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSVHeaders(text) {
  const firstLine = text.split('\n')[0]
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
}

export default function BulkImport() {
  const [activeType, setActiveType]     = useState('products')
  const [step, setStep]                 = useState(1) // 1=upload, 2=map, 3=done
  const [dragOver, setDragOver]         = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileHeaders, setFileHeaders]   = useState([])
  const [mapping, setMapping]           = useState({})
  const [importing, setImporting]       = useState(false)
  const [history, setHistory]           = useState(HISTORY)
  const fileInputRef = useRef(null)

  const typeConfig = IMPORT_TYPES[activeType]

  function handleTypeChange(key) {
    setActiveType(key)
    resetUpload()
  }

  function resetUpload() {
    setStep(1)
    setUploadedFile(null)
    setFileHeaders([])
    setMapping({})
  }

  function handleFile(file) {
    if (!file) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target.result
      const headers = parseCSVHeaders(text)
      setFileHeaders(headers)
      // Auto-map: if a file column exactly matches a system field key or label, pre-select it
      const autoMap = {}
      typeConfig.fields.forEach(f => {
        const match = headers.find(h =>
          h.toLowerCase() === f.key.toLowerCase() ||
          h.toLowerCase() === f.label.toLowerCase()
        )
        if (match) autoMap[f.key] = match
      })
      setMapping(autoMap)
      setStep(2)
    }
    // For XLSX we can only do text read (won't parse properly, but shows the flow)
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      // For xlsx/xls: simulate with template headers as demo
      setFileHeaders(typeConfig.templateHeaders)
      const autoMap = {}
      typeConfig.fields.forEach(f => {
        if (typeConfig.templateHeaders.includes(f.key)) autoMap[f.key] = f.key
      })
      setMapping(autoMap)
      setUploadedFile(file)
      setStep(2)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    setImporting(true)
    setTimeout(() => {
      const newEntry = {
        file: uploadedFile.name,
        type: activeType,
        by: 'Admin',
        status: 'success',
        date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
      }
      setHistory(prev => [newEntry, ...prev])
      setImporting(false)
      setStep(3)
    }, 1800)
  }

  const requiredMapped  = typeConfig.fields.filter(f => f.required).every(f => mapping[f.key])
  const mappedCount     = Object.values(mapping).filter(Boolean).length

  return (
    <div className="container-fluid">
      {/* ── Page heading ──────────────────────────────────────────────────── */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Bulk Import</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Products</a></li>
          <li className="breadcrumb-item active">Bulk Import</li>
        </ul>
      </div>

      {/* ── Import type tabs ──────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex gap-2 flex-wrap">
            {Object.entries(IMPORT_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                className={`btn d-flex align-items-center gap-2 ${activeType === key ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={activeType === key ? { background: cfg.color, borderColor: cfg.color } : {}}
              >
                <i className={cfg.icon}></i> {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">

          {/* ── Step 1: Upload ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">
                  <i className={`${typeConfig.icon} me-2`} style={{ color: typeConfig.color }}></i>
                  Import {typeConfig.label}
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => downloadTemplate(activeType)}
                >
                  <i className="ri-download-line me-1"></i> Download Template
                </button>
              </div>
              <div className="card-body">

                {/* Instructions */}
                <div className="alert alert-secondary mb-4">
                  <h6 className="mb-2">Required columns for {typeConfig.label}</h6>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {typeConfig.fields.map(f => (
                      <span key={f.key} className={`badge ${f.required ? 'bg-primary' : 'bg-secondary bg-opacity-25 text-body'}`}>
                        {f.label}{f.required ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="mb-0 mt-3 small text-muted">
                    * Required fields. Download the template above to get started with the correct column names.
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  className={`border rounded p-5 text-center ${dragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-dashed'}`}
                  style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: 2 }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: 48 }}>📂</div>
                  <h6 className="fw-semibold mt-2 mb-1">Drag & drop your file here</h6>
                  <p className="text-muted small mb-3">or click to browse — CSV, XLS, XLSX accepted (max 10 MB)</p>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  >
                    Browse File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    className="d-none"
                    onChange={e => handleFile(e.target.files[0])}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Column Mapping ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-1">
                    <i className="ri-git-merge-line me-2 text-primary"></i>
                    Map Your Columns
                  </h5>
                  <p className="text-muted mb-0 small">
                    File: <strong>{uploadedFile?.name}</strong> · {fileHeaders.length} column{fileHeaders.length !== 1 ? 's' : ''} detected · {mappedCount} mapped
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetUpload}>
                  <i className="ri-arrow-left-line me-1"></i> Change File
                </button>
              </div>

              <div className="card-body">
                {/* Detected columns preview */}
                <div className="mb-4">
                  <p className="fw-medium mb-2 small text-muted text-uppercase" style={{ letterSpacing: 1 }}>Columns detected in your file</p>
                  <div className="d-flex flex-wrap gap-2">
                    {fileHeaders.map(h => (
                      <span key={h} className="badge bg-light border text-body fw-normal px-3 py-2" style={{ fontSize: 12 }}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <hr />

                {/* Mapping grid */}
                <p className="fw-medium mb-3 small text-muted text-uppercase" style={{ letterSpacing: 1 }}>Match your columns to system fields</p>
                <div className="row g-3">
                  {typeConfig.fields.map(f => (
                    <div className="col-md-6 col-xl-4" key={f.key}>
                      <label className="form-label fw-medium mb-1" style={{ fontSize: 13 }}>
                        {f.label}
                        {f.required && <span className="text-danger ms-1">*</span>}
                      </label>
                      <select
                        className={`form-select form-select-sm ${mapping[f.key] ? 'border-success' : f.required ? 'border-warning' : ''}`}
                        value={mapping[f.key] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                      >
                        <option value="">— not mapped —</option>
                        {fileHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      {mapping[f.key] && (
                        <div className="mt-1 d-flex align-items-center gap-1" style={{ fontSize: 11, color: '#0ab39c' }}>
                          <i className="ri-check-line"></i> mapped from <strong>"{mapping[f.key]}"</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mapping summary + import button */}
                <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div>
                    {!requiredMapped && (
                      <div className="text-warning small">
                        <i className="ri-alert-line me-1"></i>
                        Map all required (*) fields before importing.
                      </div>
                    )}
                    {requiredMapped && (
                      <div className="text-success small">
                        <i className="ri-check-double-line me-1"></i>
                        All required fields mapped. Ready to import.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary px-4"
                    disabled={!requiredMapped || importing}
                    onClick={handleImport}
                  >
                    {importing
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>Importing…</>
                      : <><i className="ri-upload-cloud-line me-1"></i>Import {typeConfig.label}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Success ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="card">
              <div className="card-body text-center py-5">
                <div style={{ fontSize: 56 }}>✅</div>
                <h5 className="mt-3 mb-1">Import Successful</h5>
                <p className="text-muted">{uploadedFile?.name} has been imported as {typeConfig.label}.</p>
                <button type="button" className="btn btn-primary mt-2" onClick={resetUpload}>
                  <i className="ri-upload-line me-1"></i> Import Another File
                </button>
              </div>
            </div>
          )}

          {/* ── Import History ──────────────────────────────────────────────── */}
          <div className="card mt-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Import History</h5>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { resetUpload(); window.scrollTo(0,0) }}
              >
                <i className="ri-upload-line me-1"></i>Upload File
              </button>
            </div>
            <div className="card-body pt-0">
              <div className="table-card table-responsive">
                <table className="table table-borderless align-middle text-nowrap mb-0">
                  <thead className="bg-light border-bottom">
                    <tr>
                      <th className="fw-medium text-muted">File Name</th>
                      <th className="fw-medium text-muted">Import Type</th>
                      <th className="fw-medium text-muted">Uploaded By</th>
                      <th className="fw-medium text-muted">Status</th>
                      <th className="fw-medium text-muted">Date</th>
                      <th className="fw-medium text-muted">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => {
                      const cfg = IMPORT_TYPES[row.type] || IMPORT_TYPES.products
                      return (
                        <tr key={i}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width:28, height:28, borderRadius:6, background: cfg.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <i className={cfg.icon} style={{ color: cfg.color, fontSize:14 }}></i>
                              </div>
                              <a href="#" className="fw-medium text-reset">{row.file}</a>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-10 text-body fw-normal px-2">
                              {cfg.label}
                            </span>
                          </td>
                          <td>{row.by}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[row.status]}`}>
                              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                            </span>
                          </td>
                          <td>{row.date}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sub-danger size-8 btn-icon"
                                onClick={() => setHistory(prev => prev.filter((_, idx) => idx !== i))}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
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
      </div>
    </div>
  )
}
