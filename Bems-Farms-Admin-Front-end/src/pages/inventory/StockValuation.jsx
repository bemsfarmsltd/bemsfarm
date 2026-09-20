import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const money = (value) =>
  `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const moneyShort = (value) => {
  const num = Number(value || 0)
  if (num >= 1_000_000) return `₦${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `₦${(num / 1_000).toFixed(1)}k`
  return `₦${num.toLocaleString()}`
}

export default function StockValuation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [marginFilter, setMarginFilter] = useState('all') // 'all', 'high', 'moderate', 'low'
  const [sortBy, setSortBy] = useState('retail_desc') // 'retail_desc', 'cost_desc', 'profit_desc', 'margin_desc', 'stock_desc'
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/inventory/valuation')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Stock valuation could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Summary calculations
  const summary = data?.summary || {}
  const totalCost = Number(summary.cost_value || 0)
  const totalRetail = Number(summary.retail_value || 0)
  const totalUnits = Number(summary.total_units || 0)
  const totalSkus = Number(summary.total_skus || 0)
  const profit = totalRetail - totalCost
  const blendedMargin = totalRetail > 0 ? (profit / totalRetail) * 100 : 0

  // Category counts and calculations
  const categoriesList = useMemo(() => {
    const list = data?.by_category || []
    return list.map((c) => {
      const cRetail = Number(c.retail_value || 0)
      const cCost = Number(c.cost_value || 0)
      const cProfit = cRetail - cCost
      const cMargin = cRetail > 0 ? (cProfit / cRetail) * 100 : 0
      const sharePct = totalRetail > 0 ? (cRetail / totalRetail) * 100 : 0
      return {
        ...c,
        profit: cProfit,
        margin: cMargin,
        sharePct,
      }
    })
  }, [data?.by_category, totalRetail])

  // Top stock breakdown
  const inStockCount = useMemo(
    () => (data?.products || []).filter((p) => Number(p.stock) > 0).length,
    [data?.products]
  )
  const outOfStockCount = useMemo(
    () => (data?.products || []).filter((p) => Number(p.stock) <= 0).length,
    [data?.products]
  )

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let prods = data?.products || []

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      prods = prods.filter((p) =>
        [p.name, p.sku, p.barcode, p.category].some((field) =>
          field?.toLowerCase().includes(q)
        )
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      prods = prods.filter((p) => (p.category || 'Uncategorised') === selectedCategory)
    }

    // Stock level filter
    if (stockFilter === 'in_stock') {
      prods = prods.filter((p) => Number(p.stock) > 0)
    } else if (stockFilter === 'low_stock') {
      prods = prods.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.low_stock_threshold || 5))
    } else if (stockFilter === 'out_of_stock') {
      prods = prods.filter((p) => Number(p.stock) <= 0)
    }

    // Margin filter
    if (marginFilter === 'high') {
      prods = prods.filter((p) => Number(p.margin_pct || 0) >= 25)
    } else if (marginFilter === 'moderate') {
      prods = prods.filter((p) => Number(p.margin_pct || 0) >= 15 && Number(p.margin_pct || 0) < 25)
    } else if (marginFilter === 'low') {
      prods = prods.filter((p) => Number(p.margin_pct || 0) < 15)
    }

    // Sorting
    return [...prods].sort((a, b) => {
      if (sortBy === 'retail_desc') return Number(b.retail_value || 0) - Number(a.retail_value || 0)
      if (sortBy === 'retail_asc') return Number(a.retail_value || 0) - Number(b.retail_value || 0)
      if (sortBy === 'cost_desc') return Number(b.cost_value || 0) - Number(a.cost_value || 0)
      if (sortBy === 'profit_desc') return Number(b.potential_profit || 0) - Number(a.potential_profit || 0)
      if (sortBy === 'margin_desc') return Number(b.margin_pct || 0) - Number(a.margin_pct || 0)
      if (sortBy === 'stock_desc') return Number(b.stock || 0) - Number(a.stock || 0)
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      return 0
    })
  }, [data?.products, search, selectedCategory, stockFilter, marginFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredProducts.length) return
    const headers = [
      'Product Name',
      'SKU',
      'Universal Barcode',
      'Category',
      'Stock Qty',
      'Unit',
      'Cost Price (NGN)',
      'Selling Price (NGN)',
      'Total Cost Value (NGN)',
      'Total Retail Value (NGN)',
      'Potential Profit (NGN)',
      'Gross Margin (%)',
    ]

    const csvRows = filteredProducts.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.category || 'Uncategorised'}"`,
      p.stock || 0,
      `"${p.unit || 'units'}"`,
      Number(p.cost_price || 0).toFixed(2),
      Number(p.unit_price || 0).toFixed(2),
      Number(p.cost_value || 0).toFixed(2),
      Number(p.retail_value || 0).toFixed(2),
      Number(p.potential_profit || 0).toFixed(2),
      Number(p.margin_pct || 0).toFixed(2),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Bems_Farms_Inventory_Valuation_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Executive Statement
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="container-fluid pb-5 stock-valuation-page">
      {/* ── Top Header ──────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap page-header-bar">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge rounded-pill bg-emerald-solid px-2.5 py-1 text-white fs-11 fw-bold">
              <i className="ri-shield-check-line me-1"></i> Live Real-Time Audit
            </span>
            <span className="text-muted fs-12">
              As of {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h4 className="mb-0 fw-bolder text-dark font-display">Inventory Asset Valuation</h4>
          <p className="text-muted mb-0 fs-13">
            Financial capital assessment, holding costs, retail realization, and portfolio profitability analysis.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-outline-secondary px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 fs-13"
            onClick={load}
            disabled={loading}
            title="Refresh valuation data"
          >
            <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-outline-primary px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 fs-13"
            onClick={handleExportCSV}
            disabled={loading || !filteredProducts.length}
            title="Download CSV Spreadsheet"
          >
            <i className="ri-file-excel-2-line text-emerald" />
            <span>Export CSV</span>
          </button>

          <button
            className="btn btn-outline-dark px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 fs-13"
            onClick={handlePrint}
            title="Print Executive Statement"
          >
            <i className="ri-printer-line" />
            <span>Print Report</span>
          </button>

          <Link
            to="/inventory/stock-in"
            className="btn btn-emerald-solid px-3 py-2 fw-bold d-flex align-items-center gap-1.5 fs-13 text-white"
          >
            <i className="ri-add-circle-line" />
            <span>Restock Products</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center shadow-sm" role="alert">
          <div>
            <i className="ri-error-warning-line me-2 fs-16 align-middle" />
            <strong>Error:</strong> {error}
          </div>
          <button className="btn btn-sm btn-danger px-3 fw-bold" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="card border-0 shadow-sm p-5 text-center my-4">
          <div className="spinner-border text-emerald mx-auto mb-3" style={{ width: 44, height: 44 }} />
          <h6 className="fw-bold text-dark">Calculating Live Stock Valuation…</h6>
          <p className="text-muted fs-13 mb-0">Computing asset purchase costs and potential retail realization across active SKUs.</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── 1. Hero KPI Cards ────────────────────────────────── */}
          <div className="row g-3 mb-4">
            {/* Card 1: Cost Value */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-blue">
                <div className="card-body p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">
                      Capital Tied in Stock
                    </span>
                    <span className="kpi-icon-pill" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <i className="ri-money-cny-box-line fs-18"></i>
                    </span>
                  </div>
                  <div className="fs-24 fw-bolder text-dark mb-1 font-display">{money(totalCost)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                    <span>Active SKUs</span>
                    <strong className="text-dark font-monospace">{totalSkus.toLocaleString()} Items</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Retail Value */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-green">
                <div className="card-body p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">
                      Projected Retail Value
                    </span>
                    <span className="kpi-icon-pill" style={{ background: '#ECFDF5', color: '#059669' }}>
                      <i className="ri-store-2-line fs-18"></i>
                    </span>
                  </div>
                  <div className="fs-24 fw-bolder text-emerald mb-1 font-display">{money(totalRetail)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                    <span>Total Physical Units</span>
                    <strong className="text-dark font-monospace">{totalUnits.toLocaleString()} Units</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Potential Profit */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-teal">
                <div className="card-body p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">
                      Potential Gross Profit
                    </span>
                    <span className="kpi-icon-pill" style={{ background: '#F0FDFA', color: '#0D9488' }}>
                      <i className="ri-line-chart-line fs-18"></i>
                    </span>
                  </div>
                  <div className="fs-24 fw-bolder text-dark mb-1 font-display">{money(profit)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                    <span>Before Overhead & Tax</span>
                    <span className="badge bg-emerald-solid text-white font-monospace text-xs px-2">
                      +{moneyShort(profit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Blended Margin & Stock Health */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card bg-card-glow-amber">
                <div className="card-body p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">
                      Blended Gross Margin
                    </span>
                    <span className="kpi-icon-pill" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      <i className="ri-pie-chart-2-line fs-18"></i>
                    </span>
                  </div>
                  <div className="fs-24 fw-bolder text-amber mb-1 font-display">
                    {blendedMargin.toFixed(1)}%
                  </div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                    <span>Stock Health Ratio</span>
                    <strong className="text-dark">
                      <span className="text-emerald">{inStockCount} In-Stock</span> · <span className="text-danger">{outOfStockCount} Zero</span>
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Category Distribution & Portfolio Concentration ───── */}
          <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h6 className="mb-0 fw-bold text-dark font-display fs-15">
                  <i className="ri-stack-line text-emerald me-1.5 align-middle"></i>
                  Valuation Breakdown by Produce & Grocery Category
                </h6>
                <small className="text-muted">
                  Click any category to filter the detailed product ledger below.
                </small>
              </div>
              {selectedCategory !== 'all' && (
                <button
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill fw-semibold"
                  onClick={() => setSelectedCategory('all')}
                >
                  <i className="ri-filter-off-line me-1"></i> Clear Filter ({selectedCategory})
                </button>
              )}
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table align-middle mb-0 valuation-category-table">
                  <thead className="bg-light">
                    <tr className="text-muted fs-11 text-uppercase fw-bold">
                      <th className="ps-4">Category Name</th>
                      <th>SKU Count</th>
                      <th>Total Units</th>
                      <th>Portfolio Share</th>
                      <th className="text-end">Cost Value (Capital)</th>
                      <th className="text-end">Retail Value (Realization)</th>
                      <th className="text-end">Projected Profit</th>
                      <th className="text-center pe-4">Est. Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesList.map((cat) => {
                      const isSelected = selectedCategory === cat.category
                      return (
                        <tr
                          key={cat.category}
                          className={`category-row-clickable ${isSelected ? 'table-active-category' : ''}`}
                          onClick={() =>
                            setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="ps-4 fw-bold text-dark">
                            <div className="d-flex align-items-center gap-2">
                              <span
                                className="category-color-dot"
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: isSelected ? '#059669' : '#3B82F6',
                                }}
                              ></span>
                              <span>{cat.category || 'Uncategorised'}</span>
                              {isSelected && (
                                <span className="badge bg-emerald-solid text-white text-xs px-2 py-0.5 rounded-pill">
                                  Active Filter
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-monospace text-muted">{cat.skus} SKUs</td>
                          <td className="font-monospace fw-semibold text-dark">
                            {Number(cat.total_units || 0).toLocaleString()} units
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6, borderRadius: 3 }}>
                                <div
                                  className="progress-bar bg-emerald-solid"
                                  style={{ width: `${Math.min(100, cat.sharePct)}%` }}
                                ></div>
                              </div>
                              <span className="fs-11 font-monospace text-muted" style={{ minWidth: 38 }}>
                                {cat.sharePct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="text-end font-monospace text-muted">{money(cat.cost_value)}</td>
                          <td className="text-end font-monospace fw-bold text-dark">{money(cat.retail_value)}</td>
                          <td className="text-end font-monospace fw-bold text-emerald">
                            +{money(cat.profit)}
                          </td>
                          <td className="text-center pe-4">
                            <span
                              className={`badge rounded-pill px-2.5 py-1 text-xs fw-bold ${
                                cat.margin >= 25
                                  ? 'bg-success-subtle text-success'
                                  : cat.margin >= 15
                                  ? 'bg-primary-subtle text-primary'
                                  : 'bg-warning-subtle text-warning'
                              }`}
                            >
                              {cat.margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── 3. Product Valuation Master Ledger ─────────────────────── */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            {/* Table Control Header */}
            <div className="card-header bg-white border-bottom py-3 px-4">
              <div className="row g-3 align-items-center justify-content-between">
                <div className="col-12 col-md-4">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="ri-search-line fs-14"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0 ps-0 fs-13"
                      placeholder="Search by Product Name, SKU, or Barcode…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                    />
                    {search && (
                      <button
                        className="btn btn-light border-start-0 text-muted"
                        onClick={() => setSearch('')}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-8">
                  <div className="d-flex align-items-center gap-2 justify-content-md-end flex-wrap">
                    {/* Category Filter */}
                    <select
                      className="form-select form-select-sm fs-12 border-light-subtle rounded-3"
                      style={{ maxWidth: 170 }}
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value)
                        setCurrentPage(1)
                      }}
                    >
                      <option value="all">All Categories</option>
                      {categoriesList.map((c) => (
                        <option key={c.category} value={c.category}>
                          {c.category} ({c.skus})
                        </option>
                      ))}
                    </select>

                    {/* Stock Status Filter */}
                    <select
                      className="form-select form-select-sm fs-12 border-light-subtle rounded-3"
                      style={{ maxWidth: 150 }}
                      value={stockFilter}
                      onChange={(e) => {
                        setStockFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                    >
                      <option value="all">All Stock Statuses</option>
                      <option value="in_stock">🟢 In Stock Only</option>
                      <option value="low_stock">🟡 Low Stock</option>
                      <option value="out_of_stock">🔴 Out of Stock</option>
                    </select>

                    {/* Margin Filter */}
                    <select
                      className="form-select form-select-sm fs-12 border-light-subtle rounded-3"
                      style={{ maxWidth: 150 }}
                      value={marginFilter}
                      onChange={(e) => {
                        setMarginFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                    >
                      <option value="all">All Margins</option>
                      <option value="high">High Margin (&ge;25%)</option>
                      <option value="moderate">Moderate (15-25%)</option>
                      <option value="low">Low Margin (&lt;15%)</option>
                    </select>

                    {/* Sort */}
                    <select
                      className="form-select form-select-sm fs-12 border-light-subtle rounded-3"
                      style={{ maxWidth: 160 }}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="retail_desc">Highest Retail Value</option>
                      <option value="retail_asc">Lowest Retail Value</option>
                      <option value="cost_desc">Highest Cost Value</option>
                      <option value="profit_desc">Highest Potential Profit</option>
                      <option value="margin_desc">Highest Margin %</option>
                      <option value="stock_desc">Highest Stock Quantity</option>
                      <option value="name_asc">Product Name (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="table-responsive">
              <table className="table align-middle text-nowrap mb-0 valuation-product-table">
                <thead className="bg-light">
                  <tr className="text-muted fs-11 text-uppercase fw-bold">
                    <th className="ps-4">Product Details</th>
                    <th>Category</th>
                    <th className="text-center">Stock Level</th>
                    <th className="text-end">Cost Price</th>
                    <th className="text-end">Selling Price</th>
                    <th className="text-end">Cost Value</th>
                    <th className="text-end">Retail Value</th>
                    <th className="text-end">Potential Profit</th>
                    <th className="text-center pe-4">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p) => {
                    const isZeroStock = Number(p.stock) <= 0
                    const isLowStock =
                      !isZeroStock && Number(p.stock) <= Number(p.low_stock_threshold || 5)
                    const profitVal = Number(p.potential_profit || 0)
                    const marginVal = Number(p.margin_pct || 0)

                    return (
                      <tr key={p.id} className={isZeroStock ? 'row-zero-stock' : ''}>
                        {/* Product info with image & SKU/Barcode */}
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-3 border overflow-hidden d-flex align-items-center justify-content-center bg-light"
                              style={{ width: 44, height: 44, flexShrink: 0 }}
                            >
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-100 h-100 object-fit-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.parentElement.innerHTML = '📦'
                                  }}
                                />
                              ) : (
                                <span className="fs-20">📦</span>
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-dark fs-13 mb-0.5">{p.name}</div>
                              <div className="d-flex align-items-center gap-1.5 text-muted fs-11">
                                {p.sku && <span className="badge bg-light text-dark font-monospace">{p.sku}</span>}
                                {p.barcode && (
                                  <span className="badge bg-light text-muted font-monospace" title="Barcode">
                                    <i className="ri-barcode-line me-1"></i>
                                    {p.barcode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="badge bg-light text-secondary border px-2 py-1 rounded-pill fs-11">
                            {p.category || 'Uncategorised'}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="text-center">
                          <div className="d-flex flex-column align-items-center">
                            <span
                              className={`badge rounded-pill px-2.5 py-1 text-xs fw-bold mb-0.5 ${
                                isZeroStock
                                  ? 'bg-danger-subtle text-danger'
                                  : isLowStock
                                  ? 'bg-warning-subtle text-warning'
                                  : 'bg-success-subtle text-success'
                              }`}
                            >
                              {isZeroStock ? 'Out of Stock' : `${p.stock} ${p.unit || 'units'}`}
                            </span>
                            {!isZeroStock && (
                              <small className="text-muted fs-10 font-monospace">
                                Reorder: {p.low_stock_threshold || 5}
                              </small>
                            )}
                          </div>
                        </td>

                        {/* Cost Price */}
                        <td className="text-end font-monospace text-muted fs-13">{money(p.cost_price)}</td>

                        {/* Selling Price */}
                        <td className="text-end font-monospace fw-bold text-dark fs-13">{money(p.unit_price)}</td>

                        {/* Cost Value */}
                        <td className="text-end font-monospace text-muted fs-13">{money(p.cost_value)}</td>

                        {/* Retail Value */}
                        <td className="text-end font-monospace fw-bolder text-dark fs-13">{money(p.retail_value)}</td>

                        {/* Potential Profit */}
                        <td
                          className={`text-end font-monospace fw-bold fs-13 ${
                            profitVal < 0 ? 'text-danger' : profitVal > 0 ? 'text-emerald' : 'text-muted'
                          }`}
                        >
                          {profitVal > 0 ? `+${money(profitVal)}` : money(profitVal)}
                        </td>

                        {/* Margin */}
                        <td className="text-center pe-4">
                          <span
                            className={`badge px-2.5 py-1 rounded-pill font-monospace text-xs fw-bold ${
                              marginVal >= 25
                                ? 'bg-success text-white'
                                : marginVal >= 15
                                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                : marginVal > 0
                                ? 'bg-warning-subtle text-warning border border-warning-subtle'
                                : 'bg-danger-subtle text-danger'
                            }`}
                          >
                            {marginVal.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {!paginatedProducts.length && (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-5">
                        <div className="fs-32 mb-2">🔍</div>
                        <h6 className="fw-bold text-dark">No matching inventory items found</h6>
                        <p className="fs-12 mb-0">Try changing your search term or filter criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Footer & Pagination */}
            <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted fs-12">
                Showing{' '}
                <strong>
                  {filteredProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} –{' '}
                  {Math.min(currentPage * pageSize, filteredProducts.length)}
                </strong>{' '}
                of <strong>{filteredProducts.length}</strong> products{' '}
                {selectedCategory !== 'all' && `in ${selectedCategory}`}
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-1.5 fs-12 text-muted">
                  <span>Show</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 70 }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <i className="ri-arrow-left-s-line"></i> Prev
                  </button>
                  <span className="btn btn-light disabled text-dark fw-bold px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Scoped Styling ────────────────────────────────────── */}
      <style>{`
        .bg-emerald-solid {
          background: linear-gradient(135deg, #059669, #10b981) !important;
          color: #fff !important;
        }
        .text-emerald {
          color: #059669 !important;
        }
        .text-amber {
          color: #d97706 !important;
        }
        .valuation-kpi-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .valuation-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.06) !important;
        }
        .kpi-icon-pill {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bg-card-glow-blue {
          background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
          border-left: 4px solid #3b82f6 !important;
        }
        .bg-card-glow-green {
          background: linear-gradient(180deg, #ffffff 0%, #f7fdfa 100%);
          border-left: 4px solid #10b981 !important;
        }
        .bg-card-glow-teal {
          background: linear-gradient(180deg, #ffffff 0%, #f4fdfb 100%);
          border-left: 4px solid #14b8a6 !important;
        }
        .bg-card-glow-amber {
          background: linear-gradient(180deg, #ffffff 0%, #fffdf7 100%);
          border-left: 4px solid #f59e0b !important;
        }
        .category-row-clickable:hover {
          background-color: #f8fafc !important;
        }
        .table-active-category {
          background-color: #f0fdf4 !important;
        }
        .row-zero-stock {
          opacity: 0.75;
          background-color: #fafafa;
        }
        .row-zero-stock:hover {
          opacity: 1;
        }
        @media print {
          .dual-sidebar-container,
          .page-header-bar button,
          .page-header-bar a,
          .card-header select,
          .card-header input,
          .card-footer {
            display: none !important;
          }
          .stock-valuation-page {
            padding: 0 !important;
          }
          .card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
