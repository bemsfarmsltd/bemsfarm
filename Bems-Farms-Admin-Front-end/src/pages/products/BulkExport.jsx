import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductDetailModal from '../../components/products/ProductDetailModal'

// ── Column Definitions ────────────────────────────────────────────────────────
const AVAILABLE_COLUMNS = [
  {
    id: 'name',
    label: 'Product Name',
    defaultSelected: true,
    getValue: (p) => p.name || 'Unnamed Product',
    getRawValue: (p) => p.name || '',
  },
  {
    id: 'sku',
    label: 'SKU',
    defaultSelected: true,
    getValue: (p) => p.sku || '—',
    getRawValue: (p) => p.sku || '',
  },
  {
    id: 'barcode',
    label: 'Barcode',
    defaultSelected: true,
    getValue: (p) => p.barcode || '—',
    getRawValue: (p) => p.barcode || '',
  },
  {
    id: 'category',
    label: 'Category',
    defaultSelected: true,
    getValue: (p) => p.category || 'General',
    getRawValue: (p) => p.category || '',
  },
  {
    id: 'price',
    label: 'Selling Price (₦)',
    defaultSelected: true,
    isCurrency: true,
    getValue: (p) => `₦${Number(p.unit_price || p.price || 0).toLocaleString()}`,
    getRawValue: (p) => Number(p.unit_price || p.price || 0),
  },
  {
    id: 'cost_price',
    label: 'Cost Price (₦)',
    defaultSelected: false,
    isCurrency: true,
    getValue: (p) => `₦${Number(p.cost_price || 0).toLocaleString()}`,
    getRawValue: (p) => Number(p.cost_price || 0),
  },
  {
    id: 'stock',
    label: 'Stock Qty',
    defaultSelected: true,
    getValue: (p) => String(p.stock ?? p.stock_quantity ?? 0),
    getRawValue: (p) => Number(p.stock ?? p.stock_quantity ?? 0),
  },
  {
    id: 'low_stock_threshold',
    label: 'Low Stock Alert Level',
    defaultSelected: false,
    getValue: (p) => String(p.low_stock_threshold ?? 10),
    getRawValue: (p) => Number(p.low_stock_threshold ?? 10),
  },
  {
    id: 'status',
    label: 'Status',
    defaultSelected: true,
    getValue: (p) => {
      const st = String(p.status || 'active').toLowerCase()
      if (st === 'active') return 'Active'
      if (st === 'inactive') return 'Inactive'
      if (st === 'draft') return 'Draft'
      return p.status || 'Active'
    },
    getRawValue: (p) => p.status || 'active',
  },
  {
    id: 'created_at',
    label: 'Created Date',
    defaultSelected: false,
    getValue: (p) => {
      if (!p.created_at) return '—'
      const d = new Date(p.created_at)
      return isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10)
    },
    getRawValue: (p) => p.created_at || '',
  },
]

// ── Export Generators ─────────────────────────────────────────────────────────
function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateCSV(items, cols) {
  const headers = cols.map((c) => c.label)
  const rows = items.map((item) => {
    return cols
      .map((c) => {
        let val = c.getRawValue ? c.getRawValue(item) : c.getValue(item)
        if (val === null || val === undefined) val = ''
        val = String(val).replace(/"/g, '""')
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`
        }
        return val
      })
      .join(',')
  })
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
}

function generateExcelXML(items, cols, sheetName = 'Products Export') {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1e293b"/>
    </Style>
    <Style ss:ID="HeaderStyle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#059669"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
      <Interior ss:Color="#059669" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CurrencyStyle">
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="NumberStyle">
      <NumberFormat ss:Format="#,##0"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>`

  cols.forEach(() => {
    xml += `<Column ss:AutoFitWidth="1" ss:Width="130"/>`
  })

  // Header Row
  xml += `<Row ss:Height="26" ss:StyleID="HeaderStyle">`
  cols.forEach((col) => {
    xml += `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`
  })
  xml += `</Row>`

  // Data Rows
  items.forEach((item) => {
    xml += `<Row ss:Height="20">`
    cols.forEach((col) => {
      const raw = col.getRawValue ? col.getRawValue(item) : col.getValue(item)
      const isNum = typeof raw === 'number' && !isNaN(raw)
      const styleAttr = col.isCurrency ? ' ss:StyleID="CurrencyStyle"' : isNum ? ' ss:StyleID="NumberStyle"' : ''
      const type = isNum ? 'Number' : 'String'
      const val = isNum ? raw : escapeXml(String(raw ?? ''))
      xml += `<Cell${styleAttr}><Data ss:Type="${type}">${val}</Data></Cell>`
    })
    xml += `</Row>`
  })

  xml += `</Table>
  </Worksheet>
</Workbook>`
  return xml
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BulkExport() {
  // Filters State
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockStatus, setStockStatus] = useState('all') // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [priceRange, setPriceRange] = useState('all') // 'all' | 'under_5k' | '5k_20k' | '20k_50k' | 'above_50k'
  const [exportFormat, setExportFormat] = useState('csv') // 'csv' | 'excel'

  // Columns Selection State
  const [selectedColumns, setSelectedColumns] = useState(() => {
    const initial = {}
    AVAILABLE_COLUMNS.forEach((col) => {
      initial[col.id] = col.defaultSelected
    })
    return initial
  })

  // Catalog Data State
  const [categories, setCategories] = useState([])
  const [previewProducts, setPreviewProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedProductId, setSelectedProductId] = useState(null)

  // 1. Fetch Categories
  useEffect(() => {
    api
      .get('/admin/products/form-data')
      .then((res) => {
        if (res.data?.categories) setCategories(res.data.categories)
      })
      .catch(() => {})
  }, [])

  // 2. Fetch Preview Products with active filters
  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true)
    try {
      let backendStock = undefined
      if (stockStatus === 'low_stock') backendStock = 'low'
      if (stockStatus === 'out_of_stock') backendStock = 'out'

      const res = await api.get('/admin/products', {
        params: {
          page,
          limit: 100, // Fetch up to 100 items to enable local price range & in-stock slicing
          search: search.trim() || undefined,
          category: selectedCategory || undefined,
          stock: backendStock,
        },
      })

      let list = res.data?.products || []

      // Client-side Price Range & In-Stock refinement
      if (stockStatus === 'in_stock') {
        list = list.filter((p) => {
          const qty = Number(p.stock ?? p.stock_quantity ?? 0)
          const thresh = Number(p.low_stock_threshold ?? 10)
          return qty > thresh
        })
      }

      if (priceRange !== 'all') {
        list = list.filter((p) => {
          const price = Number(p.unit_price || p.price || 0)
          if (priceRange === 'under_5k') return price < 5000
          if (priceRange === '5k_20k') return price >= 5000 && price <= 20000
          if (priceRange === '20k_50k') return price > 20000 && price <= 50000
          if (priceRange === 'above_50k') return price > 50000
          return true
        })
      }

      setTotalCount(list.length)
      const start = (page - 1) * pageSize
      setPreviewProducts(list.slice(start, start + pageSize))
    } catch (err) {
      toast.error('Failed to load products for preview')
    } finally {
      setLoadingPreview(false)
    }
  }, [page, pageSize, search, selectedCategory, stockStatus, priceRange])

  useEffect(() => {
    fetchPreview()
  }, [fetchPreview])

  // Reset page when search or filters change
  const handleFilterChange = (setter, val) => {
    setter(val)
    setPage(1)
  }

  // Active Columns list
  const activeCols = useMemo(() => {
    return AVAILABLE_COLUMNS.filter((c) => selectedColumns[c.id])
  }, [selectedColumns])

  const toggleColumn = (colId) => {
    setSelectedColumns((prev) => {
      const next = { ...prev, [colId]: !prev[colId] }
      // Ensure at least one column is selected
      const anySelected = Object.values(next).some(Boolean)
      if (!anySelected) {
        toast.error('At least one column must be selected for export')
        return prev
      }
      return next
    })
  }

  const selectAllColumns = () => {
    const next = {}
    AVAILABLE_COLUMNS.forEach((c) => {
      next[c.id] = true
    })
    setSelectedColumns(next)
  }

  const deselectAllColumns = () => {
    const next = {}
    AVAILABLE_COLUMNS.forEach((c, idx) => {
      next[c.id] = idx === 0 // Keep at least the product name
    })
    setSelectedColumns(next)
  }

  // ── Execute Bulk Export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    if (activeCols.length === 0) {
      toast.error('Please select at least one column to export.')
      return
    }

    setExporting(true)
    const toastId = toast.loading('Generating export file…')

    try {
      let backendStock = undefined
      if (stockStatus === 'low_stock') backendStock = 'low'
      if (stockStatus === 'out_of_stock') backendStock = 'out'

      // Fetch all matching products (up to 1000)
      const res = await api.get('/admin/products', {
        params: {
          page: 1,
          limit: 1000,
          search: search.trim() || undefined,
          category: selectedCategory || undefined,
          stock: backendStock,
        },
      })

      let allItems = res.data?.products || []

      // Apply client-side filters
      if (stockStatus === 'in_stock') {
        allItems = allItems.filter((p) => {
          const qty = Number(p.stock ?? p.stock_quantity ?? 0)
          const thresh = Number(p.low_stock_threshold ?? 10)
          return qty > thresh
        })
      }

      if (priceRange !== 'all') {
        allItems = allItems.filter((p) => {
          const price = Number(p.unit_price || p.price || 0)
          if (priceRange === 'under_5k') return price < 5000
          if (priceRange === '5k_20k') return price >= 5000 && price <= 20000
          if (priceRange === '20k_50k') return price > 20000 && price <= 50000
          if (priceRange === 'above_50k') return price > 50000
          return true
        })
      }

      if (allItems.length === 0) {
        toast.error('No products found matching the selected filters.', { id: toastId })
        return
      }

      const dateStr = new Date().toISOString().slice(0, 10)

      if (exportFormat === 'csv') {
        const csvContent = generateCSV(allItems, activeCols)
        downloadFile(csvContent, `bems_farms_products_${dateStr}.csv`, 'text/csv;charset=utf-8;')
        toast.success(`Successfully exported ${allItems.length} products to CSV!`, { id: toastId })
      } else {
        const excelXml = generateExcelXML(allItems, activeCols, 'Bems Farms Products')
        downloadFile(excelXml, `bems_farms_products_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
        toast.success(`Successfully exported ${allItems.length} products to Excel!`, { id: toastId })
      }
    } catch (err) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'), { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  // Quick single product download
  const handleSingleExport = (product) => {
    const cleanName = (product.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10)

    if (exportFormat === 'csv') {
      const content = generateCSV([product], activeCols)
      downloadFile(content, `${cleanName}_${dateStr}.csv`, 'text/csv;charset=utf-8;')
      toast.success(`Exported "${product.name}"`)
    } else {
      const content = generateExcelXML([product], activeCols, product.name || 'Product')
      downloadFile(content, `${cleanName}_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
      toast.success(`Exported "${product.name}"`)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="container-fluid py-2">
      {/* Header & Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: '#1e293b' }}>
            Product Bulk Export
          </h5>
          <p className="text-muted small mb-0">
            Export live farm inventory, pricing, and stock metadata to CSV or Excel with customizable columns.
          </p>
        </div>
        <ul className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/products" className="text-decoration-none text-muted">
              Products
            </Link>
          </li>
          <li className="breadcrumb-item active text-primary fw-medium">Bulk Export</li>
        </ul>
      </div>

      {/* Main Configuration Card */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
        <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              <i className="ri-file-download-line" style={{ fontSize: 16 }} />
            </div>
            <div>
              <span className="fw-bold" style={{ fontSize: 14, color: '#1e293b' }}>
                Export Filters & Configuration
              </span>
              <span className="text-muted ms-2 small">({totalCount} products match current filters)</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => {
              setSearch('')
              setSelectedCategory('')
              setStockStatus('all')
              setPriceRange('all')
              setPage(1)
            }}
          >
            <i className="ri-refresh-line" /> Reset Filters
          </button>
        </div>

        <div className="card-body p-4">
          {/* Filters Row */}
          <div className="row g-3 mb-4">
            {/* Category */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-medium text-muted small mb-1">Category</label>
              <select
                className="form-select form-select-sm"
                style={{ height: 38, borderRadius: 8 }}
                value={selectedCategory}
                onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-medium text-muted small mb-1">Stock Status</label>
              <select
                className="form-select form-select-sm"
                style={{ height: 38, borderRadius: 8 }}
                value={stockStatus}
                onChange={(e) => handleFilterChange(setStockStatus, e.target.value)}
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock (&gt; Threshold)</option>
                <option value="low_stock">Low Stock (1 – 10 items)</option>
                <option value="out_of_stock">Out of Stock (0 items)</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-medium text-muted small mb-1">Price Range (₦)</label>
              <select
                className="form-select form-select-sm"
                style={{ height: 38, borderRadius: 8 }}
                value={priceRange}
                onChange={(e) => handleFilterChange(setPriceRange, e.target.value)}
              >
                <option value="all">All Price Ranges</option>
                <option value="under_5k">Under ₦5,000</option>
                <option value="5k_20k">₦5,000 – ₦20,000</option>
                <option value="20k_50k">₦20,000 – ₦50,000</option>
                <option value="above_50k">Above ₦50,000</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-medium text-muted small mb-1">Search Products</label>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm pe-4"
                  style={{ height: 38, borderRadius: 8 }}
                  placeholder="Product name, SKU or barcode…"
                  value={search}
                  onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted p-0 pe-2"
                    style={{ fontSize: 13, textDecoration: 'none' }}
                    onClick={() => handleFilterChange(setSearch, '')}
                  >
                    <i className="ri-close-circle-fill" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Export Format Selector Cards */}
          <div className="mb-4">
            <label className="form-label fw-medium text-muted small mb-2 d-block">Export File Format</label>
            <div className="row g-3">
              {/* CSV Format */}
              <div className="col-12 col-sm-6">
                <div
                  role="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-3 d-flex align-items-center justify-content-between transition-all ${
                    exportFormat === 'csv' ? 'border-primary shadow-xs' : 'border'
                  }`}
                  style={{
                    borderWidth: exportFormat === 'csv' ? '2px' : '1px',
                    backgroundColor: exportFormat === 'csv' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: '#dcfce7',
                        color: '#16a34a',
                        fontSize: 22,
                      }}
                    >
                      <i className="ri-file-text-line" />
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: 14, color: '#1e293b' }}>
                        CSV Spreadsheet (.csv)
                      </div>
                      <div className="text-muted small">Standard comma-delimited format with UTF-8 support</div>
                    </div>
                  </div>
                  <div className="form-check form-radio">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exportFormatRadio"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              {/* Excel Format */}
              <div className="col-12 col-sm-6">
                <div
                  role="button"
                  onClick={() => setExportFormat('excel')}
                  className={`p-3 rounded-3 d-flex align-items-center justify-content-between transition-all ${
                    exportFormat === 'excel' ? 'border-primary shadow-xs' : 'border'
                  }`}
                  style={{
                    borderWidth: exportFormat === 'excel' ? '2px' : '1px',
                    backgroundColor: exportFormat === 'excel' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: '#dbeafe',
                        color: '#2563eb',
                        fontSize: 22,
                      }}
                    >
                      <i className="ri-file-excel-2-line" />
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: 14, color: '#1e293b' }}>
                        Excel Workbook (.xls / .xlsx)
                      </div>
                      <div className="text-muted small">Formatted spreadsheet with stylized headers and column widths</div>
                    </div>
                  </div>
                  <div className="form-check form-radio">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exportFormatRadio"
                      checked={exportFormat === 'excel'}
                      onChange={() => setExportFormat('excel')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selectable Columns Section */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label fw-medium text-muted small mb-0">Select Columns to Include</label>
                <span className="badge bg-secondary-subtle text-secondary small" style={{ fontSize: 11 }}>
                  {activeCols.length} of {AVAILABLE_COLUMNS.length} selected
                </span>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-decoration-none text-primary small"
                  onClick={selectAllColumns}
                >
                  Select All
                </button>
                <span className="text-muted small">•</span>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-decoration-none text-muted small"
                  onClick={deselectAllColumns}
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded-3 border">
              {AVAILABLE_COLUMNS.map((col) => {
                const isChecked = Boolean(selectedColumns[col.id])
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className={`btn btn-sm d-flex align-items-center gap-2 transition-all ${
                      isChecked
                        ? 'btn-white border shadow-xs text-dark fw-medium'
                        : 'btn-outline-secondary border-dashed text-muted bg-transparent'
                    }`}
                    style={{
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: 12,
                      borderColor: isChecked ? '#cbd5e1' : '#e2e8f0',
                      backgroundColor: isChecked ? '#ffffff' : 'transparent',
                    }}
                  >
                    <i
                      className={isChecked ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line'}
                      style={{ fontSize: 14 }}
                    />
                    {col.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Table Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <span className="fw-bold" style={{ fontSize: 15, color: '#1e293b' }}>
              Data Preview
            </span>
            <span className="text-muted ms-2 small">
              (Showing page {page} of {totalPages} • {totalCount} total results)
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              onClick={fetchPreview}
              disabled={loadingPreview}
              title="Refresh preview data"
            >
              <i className={`ri-refresh-line ${loadingPreview ? 'ri-spin' : ''}`} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-success btn-sm d-flex align-items-center gap-2 px-3 fw-medium shadow-xs"
              onClick={handleExport}
              disabled={exporting || totalCount === 0}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Exporting…
                </>
              ) : (
                <>
                  <i className="ri-download-2-line" style={{ fontSize: 15 }} />
                  Export Now ({totalCount} items)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap" style={{ fontSize: 13 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize: 11, width: 50 }}>
                    #
                  </th>
                  <th className="px-3 py-2 fw-medium text-muted" style={{ fontSize: 11 }}>
                    PRODUCT
                  </th>
                  {activeCols
                    .filter((c) => c.id !== 'name')
                    .map((c) => (
                      <th key={c.id} className="px-3 py-2 fw-medium text-muted" style={{ fontSize: 11 }}>
                        {c.label.toUpperCase()}
                      </th>
                    ))}
                  <th className="px-3 py-2 fw-medium text-muted text-end" style={{ fontSize: 11, width: 90 }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingPreview ? (
                  <tr>
                    <td colSpan={activeCols.length + 2} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                      Loading live catalog preview…
                    </td>
                  </tr>
                ) : previewProducts.length === 0 ? (
                  <tr>
                    <td colSpan={activeCols.length + 2} className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-2 d-block mb-2 text-muted" />
                      No products found matching your active filter criteria.
                    </td>
                  </tr>
                ) : (
                  previewProducts.map((p, idx) => {
                    const stockQty = Number(p.stock ?? p.stock_quantity ?? 0)
                    const threshold = Number(p.low_stock_threshold ?? 10)
                    const isLowStock = stockQty <= threshold && stockQty > 0
                    const isOutStock = stockQty <= 0

                    return (
                      <tr key={p.id || idx}>
                        <td className="px-3 py-2 text-muted" style={{ fontSize: 12 }}>
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="d-flex align-items-center gap-2">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="rounded border object-fit-cover flex-shrink-0"
                                style={{ width: 34, height: 34 }}
                              />
                            ) : (
                              <div
                                className="rounded bg-light d-flex align-items-center justify-content-center text-muted border flex-shrink-0"
                                style={{ width: 34, height: 34, fontSize: 14 }}
                              >
                                <i className="ri-image-line" />
                              </div>
                            )}
                            <div>
                              <div
                                className="fw-semibold text-dark text-truncate"
                                style={{ maxWidth: 220, cursor: 'pointer' }}
                                onClick={() => setSelectedProductId(p.id)}
                                title={p.name}
                              >
                                {p.name}
                              </div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {p.sku || 'No SKU'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Render Active Dynamic Columns */}
                        {activeCols
                          .filter((c) => c.id !== 'name')
                          .map((col) => {
                            if (col.id === 'status') {
                              const st = String(p.status || 'active').toLowerCase()
                              return (
                                <td key={col.id} className="px-3 py-2">
                                  <span
                                    className="badge"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      padding: '3px 7px',
                                      backgroundColor:
                                        st === 'active' ? '#ecfdf5' : st === 'draft' ? '#fef3c7' : '#f1f5f9',
                                      color: st === 'active' ? '#059669' : st === 'draft' ? '#d97706' : '#475569',
                                      border: `1px solid ${
                                        st === 'active' ? '#a7f3d0' : st === 'draft' ? '#fde68a' : '#cbd5e1'
                                      }`,
                                    }}
                                  >
                                    {col.getValue(p)}
                                  </span>
                                </td>
                              )
                            }

                            if (col.id === 'stock') {
                              return (
                                <td key={col.id} className="px-3 py-2">
                                  <span
                                    className="badge d-inline-flex align-items-center gap-1"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '3px 8px',
                                      backgroundColor: isOutStock
                                        ? '#fef2f2'
                                        : isLowStock
                                        ? '#fffbeb'
                                        : '#ecfdf5',
                                      color: isOutStock ? '#ef4444' : isLowStock ? '#d97706' : '#059669',
                                      border: `1px solid ${
                                        isOutStock ? '#fecaca' : isLowStock ? '#fde68a' : '#a7f3d0'
                                      }`,
                                    }}
                                  >
                                    {stockQty} {isOutStock ? '(Out)' : isLowStock ? '(Low)' : ''}
                                  </span>
                                </td>
                              )
                            }

                            if (col.isCurrency) {
                              return (
                                <td key={col.id} className="px-3 py-2 fw-semibold text-dark">
                                  {col.getValue(p)}
                                </td>
                              )
                            }

                            return (
                              <td key={col.id} className="px-3 py-2 text-muted">
                                {col.getValue(p)}
                              </td>
                            )
                          })}

                        {/* Action buttons */}
                        <td className="px-3 py-2 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success p-1"
                              style={{ width: 28, height: 28, borderRadius: 6 }}
                              onClick={() => handleSingleExport(p)}
                              title={`Export ${p.name}`}
                            >
                              <i className="ri-download-line" style={{ fontSize: 13 }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary p-1"
                              style={{ width: 28, height: 28, borderRadius: 6 }}
                              onClick={() => setSelectedProductId(p.id)}
                              title="View details"
                            >
                              <i className="ri-eye-line" style={{ fontSize: 13 }} />
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

          {/* Pagination Controls */}
          <div className="d-flex align-items-center justify-content-between p-3 border-top flex-wrap gap-2">
            <span className="text-muted small">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} products)
            </span>
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="ri-arrow-left-s-line" /> Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pNum = i + 1
                if (totalPages > 5 && page > 3) {
                  pNum = page - 2 + i
                  if (pNum > totalPages) pNum = totalPages - (4 - i)
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    className={`btn btn-sm ${page === pNum ? 'btn-success' : 'btn-outline-secondary'}`}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      background: page === pNum ? '#059669' : 'transparent',
                      borderColor: page === pNum ? '#059669' : '#e2e8f0',
                    }}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </button>
                )
              })}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onEdit={() => {}}
          onScheduleRestock={() => {}}
        />
      )}
    </div>
  )
}
