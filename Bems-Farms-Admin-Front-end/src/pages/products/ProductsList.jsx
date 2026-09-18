import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import BarcodeSvg from '../../components/ui/BarcodeSvg'
import { generateUniversalGoodsCode } from '../../lib/barcodeGenerator'
import ProductDetailModal from '../../components/products/ProductDetailModal'

export default function ProductsList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [barcodeFilter, setBarcodeFilter] = useState('') // '' | 'has' | 'missing'
  const [categories, setCategories] = useState([])
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Quick Barcode Modal State
  const [previewBarcodeProduct, setPreviewBarcodeProduct] = useState(null)
  const [printCopies, setPrintCopies] = useState(1)
  const [generatingBarcodeId, setGeneratingBarcodeId] = useState(null)
  const [selectedProductId, setSelectedProductId] = useState(null)

  const openBarcodeModal = (product) => {
    setPreviewBarcodeProduct(product)
    const stockQty = Math.max(1, parseInt(product.stock ?? product.stock_quantity ?? 1) || 1)
    setPrintCopies(stockQty)
  }

  // Fetch categories for filter dropdown
  useEffect(() => {
    api.get('/admin/products/form-data')
      .then((res) => {
        if (res.data?.categories) setCategories(res.data.categories)
      })
      .catch(() => {})
  }, [])

  // Fetch products with filters
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products', {
        params: {
          page,
          limit: 15,
          search: search.trim() || undefined,
          category: category || undefined,
          status: status || undefined,
          stock: stockFilter || undefined,
        },
      })
      setProducts(res.data.products || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (err) {
      toast.error('Failed to load products. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page, category, status, stockFilter])

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    setPage(1)
    fetchProducts()
  }

  const handleDelete = async () => {
    if (!productToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/admin/products/${productToDelete.id}`)
      toast.success(`Product "${productToDelete.name}" deleted`)
      setProductToDelete(null)
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  // Quick Inline Generate Barcode
  const handleQuickGenerateBarcode = async (product) => {
    setGeneratingBarcodeId(product.id)
    const newCode = generateUniversalGoodsCode(product, 'CODE128')
    try {
      await api.patch(`/admin/products/${product.id}`, { barcode: newCode })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, barcode: newCode } : p)))
      toast.success(`Assigned Barcode: ${newCode}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign barcode')
    } finally {
      setGeneratingBarcodeId(null)
    }
  }

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Filter products by Barcode client-side if selected
  const displayedProducts = useMemo(() => {
    if (!barcodeFilter) return products
    if (barcodeFilter === 'has') return products.filter((p) => p.barcode && p.barcode.trim())
    if (barcodeFilter === 'missing') return products.filter((p) => !p.barcode || !p.barcode.trim())
    return products
  }, [products, barcodeFilter])

  const handlePrintLabel = () => {
    if (!previewBarcodeProduct?.barcode) return
    const copies = Math.max(1, parseInt(printCopies) || 1)
    const printWindow = window.open('', '_blank', 'width=550,height=500')
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print barcode labels.')
      return
    }
    const barcodeSvg = document.getElementById('preview-barcode-svg-element')?.outerHTML || ''
    const priceStr = formatNaira(previewBarcodeProduct.price || previewBarcodeProduct.unit_price)

    const singleLabelHtml = `
      <div class="label-page">
        <div class="header">
          <span>BEMS FARMS</span>
          <span>Fresh Produce</span>
        </div>
        <div class="name">${previewBarcodeProduct.name}</div>
        <div class="price-row">
          <span class="price">${priceStr}</span>
          <span class="unit">${previewBarcodeProduct.unit || 'per unit'}</span>
        </div>
        <div class="barcode">${barcodeSvg}</div>
        <div class="sku">SKU: ${previewBarcodeProduct.sku || 'N/A'}</div>
      </div>
    `

    const pagesHtml = Array.from({ length: copies }, () => singleLabelHtml).join('\n')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels (${copies} copies) - ${previewBarcodeProduct.name}</title>
          <style>
            @page { size: 50mm 25mm; margin: 0; }
            * { box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; 
              margin: 0; 
              padding: 0;
              background: #fff;
              color: #000;
            }
            .label-page {
              width: 50mm; 
              height: 25mm; 
              padding: 1.5mm; 
              display: flex; 
              flex-direction: column; 
              justify-content: space-between;
              overflow: hidden; 
              page-break-after: always;
              page-break-inside: avoid;
            }
            .header { display: flex; justify-content: space-between; font-size: 7px; font-weight: bold; }
            .header span:first-child { background: #000; color: #fff; padding: 1px 4px; border-radius: 2px; }
            .name { font-size: 8.5px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
            .price-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 1px; }
            .price { font-size: 10.5px; font-weight: bold; }
            .unit { font-size: 7px; color: #333; }
            .barcode { text-align: center; margin-top: auto; }
            .barcode svg { height: 8mm !important; width: auto !important; max-width: 100% !important; }
            .sku { text-align: center; font-size: 6px; font-family: monospace; margin-top: 1px; }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="container-fluid py-3">
      {/* Page Heading */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold text-dark">Products &amp; Master Catalog</h5>
          <small className="text-muted">Manage store inventory, prices, SKUs, universal barcodes, and stock thresholds</small>
        </div>
        <div className="d-flex gap-2">
          <Link to="/products/barcode" className="btn btn-outline-success d-flex align-items-center gap-1 shadow-sm">
            <i className="ri-barcode-line"></i> Barcode Studio
          </Link>
          <Link to="/products/add" className="btn btn-primary d-flex align-items-center gap-1 shadow-sm">
            <i className="ri-add-line"></i> Add New Product
          </Link>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        {/* Card Header & Search / Filters */}
        <div className="card-body border-bottom p-3">
          <div className="row g-2 align-items-center">
            {/* Search Box */}
            <div className="col-12 col-md-3">
              <form onSubmit={handleSearchSubmit} className="position-relative">
                <input
                  type="text"
                  className="form-control ps-4"
                  placeholder="Search name, SKU, barcode…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted p-2"
                >
                  <i className="ri-search-line"></i>
                </button>
              </form>
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Barcode Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
              >
                <option value="">All Barcodes</option>
                <option value="has">✓ Has Barcode</option>
                <option value="missing">⚠️ Missing Barcode</option>
              </select>
            </div>

            {/* Stock Level Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={stockFilter}
                onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Stock Levels</option>
                <option value="low">Low Stock Only</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            <div className="col-6 col-md-1">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setCategory(''); setStatus(''); setStockFilter(''); setBarcodeFilter(''); setPage(1); }}
                title="Reset Filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-nowrap">
            <thead className="table-light text-muted fs-xs text-uppercase">
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Universal Barcode</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Cost Price</th>
                <th>Stock QTY</th>
                <th>Status</th>
                <th className="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading products catalog…
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-5 text-muted">
                    <i className="ri-inbox-line fs-1 d-block mb-2 text-muted"></i>
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p, index) => {
                  const isLowStock = Number(p.stock || p.stock_quantity || 0) <= Number(p.low_stock_threshold || 10) && Number(p.stock || p.stock_quantity || 0) > 0
                  const isOutStock = Number(p.stock || p.stock_quantity || 0) <= 0
                  const hasBarcode = Boolean(p.barcode && p.barcode.trim())

                  return (
                    <tr key={p.id}>
                      <td className="text-muted fw-semibold">{(page - 1) * 15 + index + 1}</td>
                      <td>
                        <div
                          className="d-flex align-items-center gap-2"
                          role="button"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedProductId(p.id)}
                          title="Click to view deep product details"
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="rounded-3 object-fit-cover shadow-xs border"
                              style={{ width: '42px', height: '42px' }}
                            />
                          ) : (
                            <div
                              className="rounded-3 bg-light d-flex align-items-center justify-content-center text-muted border"
                              style={{ width: '42px', height: '42px' }}
                            >
                              <i className="ri-image-line"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-dark text-decoration-hover">{p.name}</div>
                            {p.is_featured && (
                              <span className="badge bg-warning-subtle text-warning fs-xs">Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-monospace fs-sm text-dark">{p.sku || '—'}</span>
                      </td>
                      <td>
                        {hasBarcode ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1 py-1 px-2 text-start"
                            onClick={() => openBarcodeModal(p)}
                            title="Click to view & print barcode stickers"
                          >
                            <i className="ri-barcode-line text-success fs-6"></i>
                            <span className="font-monospace fs-xs fw-semibold text-dark">{p.barcode}</span>
                          </button>
                        ) : (
                          <div className="d-inline-flex align-items-center gap-1">
                            <span className="badge bg-warning-subtle text-warning fs-xs">No Barcode</span>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-success py-0 px-2"
                              disabled={generatingBarcodeId === p.id}
                              onClick={() => handleQuickGenerateBarcode(p)}
                              title="Generate Universal Barcode"
                            >
                              {generatingBarcodeId === p.id ? '…' : '+ Generate'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{p.category || 'General'}</span>
                      </td>
                      <td className="fw-bold text-dark">
                        {formatNaira(p.price || p.unit_price)}
                      </td>
                      <td className="text-muted">
                        {p.cost_price ? formatNaira(p.cost_price) : '—'}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold">{p.stock ?? p.stock_quantity ?? 0}</span>
                          {isOutStock ? (
                            <span className="badge bg-danger-subtle text-danger fs-xs">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="badge bg-warning-subtle text-warning fs-xs">Low Stock</span>
                          ) : (
                            <span className="badge bg-success-subtle text-success fs-xs">In Stock</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {p.status === 'active' ? (
                          <span className="badge bg-success text-white">Active</span>
                        ) : p.status === 'draft' ? (
                          <span className="badge bg-secondary text-white">Draft</span>
                        ) : (
                          <span className="badge bg-danger text-white">Inactive</span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={() => setSelectedProductId(p.id)}
                            title="View Deep Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/products/add?edit=${p.id}`)}
                            title="Edit Product"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => setProductToDelete(p)}
                            title="Delete Product"
                          >
                            <i className="ri-delete-bin-line"></i>
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

        {/* Pagination Footer */}
        <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
          <small className="text-muted">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} products
          </small>

          {pages > 1 && (
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  className={`btn ${page === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Barcode Preview Modal ──────────────────────────── */}
      {previewBarcodeProduct && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow border-0">
              <div className="modal-header border-0 pb-0">
                <div>
                  <h6 className="modal-title fw-bold">Bems Farms Barcode Label</h6>
                  <p className="text-muted fs-xs mb-0">{previewBarcodeProduct.name}</p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPreviewBarcodeProduct(null)}
                ></button>
              </div>

              <div className="modal-body text-center py-3">
                {/* Available Stock Banner */}
                <div className="alert alert-success bg-success-subtle border-0 py-2 px-3 mb-3 d-flex justify-content-between align-items-center rounded-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="ri-stack-line text-success fs-5"></i>
                    <div className="text-start">
                      <div className="fs-xs text-muted text-uppercase fw-semibold">Current Inventory Stock</div>
                      <div className="fw-bold text-dark fs-sm">
                        {previewBarcodeProduct.stock ?? previewBarcodeProduct.stock_quantity ?? 0} {previewBarcodeProduct.unit || 'units'} in stock
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-success rounded-pill px-2 py-1 shadow-sm"
                    onClick={() => {
                      const qty = Math.max(1, parseInt(previewBarcodeProduct.stock ?? previewBarcodeProduct.stock_quantity ?? 1) || 1)
                      setPrintCopies(qty)
                      toast.success(`Set to stock quantity (${qty})`)
                    }}
                  >
                    <i className="ri-magic-line me-1"></i> Match Stock ({previewBarcodeProduct.stock ?? previewBarcodeProduct.stock_quantity ?? 0})
                  </button>
                </div>

                {/* Sticker Card Preview */}
                <div
                  className="p-3 bg-white rounded-3 mx-auto shadow-sm border mb-3 text-start"
                  style={{ maxWidth: '280px', border: '1.5px solid #1f2937' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                    <span
                      style={{
                        background: '#064e3b',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '1px 5px',
                        borderRadius: '2px',
                      }}
                    >
                      BEMS FARMS
                    </span>
                    <span className="text-muted" style={{ fontSize: '9px' }}>Fresh Produce</span>
                  </div>

                  <div className="fw-bold text-dark text-start mb-1 fs-sm text-truncate">
                    {previewBarcodeProduct.name}
                  </div>

                  <div className="d-flex justify-content-between align-items-baseline mb-2">
                    <span className="fw-bold text-success fs-5">
                      {formatNaira(previewBarcodeProduct.price || previewBarcodeProduct.unit_price)}
                    </span>
                    <span className="text-muted fs-xs">{previewBarcodeProduct.unit || 'per unit'}</span>
                  </div>

                  <div className="my-2 text-center" id="preview-barcode-svg-element">
                    <BarcodeSvg
                      value={previewBarcodeProduct.barcode}
                      format="CODE128"
                      width={1.6}
                      height={44}
                      fontSize={11}
                    />
                  </div>

                  <div className="text-muted font-monospace fs-xs text-center">
                    SKU: {previewBarcodeProduct.sku || '—'}
                  </div>
                </div>

                {/* Copies Counter Controls */}
                <div className="bg-light p-3 rounded-3 border text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0 fw-bold fs-xs text-uppercase text-muted">
                      Number of Stickers / Copies to Print:
                    </label>
                    <span className="badge bg-primary-subtle text-primary fw-bold">
                      {printCopies} {printCopies === 1 ? 'sticker' : 'stickers'}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2 mb-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3"
                      onClick={() => setPrintCopies((c) => Math.max(1, Number(c || 1) - 1))}
                    >
                      <i className="ri-subtract-line"></i>
                    </button>
                    <input
                      type="number"
                      className="form-control text-center font-monospace fw-bold fs-5"
                      min="1"
                      max="1000"
                      value={printCopies}
                      onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3"
                      onClick={() => setPrintCopies((c) => Number(c || 1) + 1)}
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="d-flex gap-1 flex-wrap align-items-center">
                    <span className="fs-xs text-muted me-1">Quick Select:</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                      onClick={() => setPrintCopies(1)}
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                      onClick={() => setPrintCopies(5)}
                    >
                      5
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                      onClick={() => setPrintCopies(10)}
                    >
                      10
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                      onClick={() => setPrintCopies(25)}
                    >
                      25
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                      onClick={() => setPrintCopies(50)}
                    >
                      50
                    </button>
                    {previewBarcodeProduct.stock > 0 && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-success py-0 px-2 rounded-pill fw-bold"
                        onClick={() => setPrintCopies(parseInt(previewBarcodeProduct.stock) || 1)}
                      >
                        All In Stock ({previewBarcodeProduct.stock})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <Link
                  to={`/products/barcode?productId=${previewBarcodeProduct.id}`}
                  className="btn btn-outline-secondary"
                  onClick={() => setPreviewBarcodeProduct(null)}
                >
                  <i className="ri-layout-grid-line me-1"></i> Barcode Studio
                </Link>
                <button
                  type="button"
                  className="btn btn-primary px-4 shadow-sm"
                  onClick={handlePrintLabel}
                >
                  <i className="ri-printer-line me-1"></i> Print {printCopies} Sticker{printCopies > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      {productToDelete && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-danger fw-bold">Delete Product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setProductToDelete(null)}
                ></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-0">
                  Are you sure you want to delete <strong>{productToDelete.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setProductToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deep Product Detail Modal */}
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onScheduleRestock={(prod) => {
            setSelectedProductId(null)
            navigate(`/inventory/schedule?product_id=${prod.id}&name=${encodeURIComponent(prod.name)}`)
          }}
        />
      )}
    </div>
  )
}
