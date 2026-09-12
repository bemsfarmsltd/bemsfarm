import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

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
  const [categories, setCategories] = useState([])
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="container-fluid py-3">
      {/* Page Heading */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold text-dark">Products &amp; Master Catalog</h5>
          <small className="text-muted">Manage store inventory, prices, SKUs, and stock thresholds</small>
        </div>
        <div className="d-flex gap-2">
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
            <div className="col-12 col-md-4">
              <form onSubmit={handleSearchSubmit} className="position-relative">
                <input
                  type="text"
                  className="form-control ps-4"
                  placeholder="Search by name, SKU, or barcode…"
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
            <div className="col-6 col-md-3">
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
                onClick={() => { setSearch(''); setCategory(''); setStatus(''); setStockFilter(''); setPage(1); }}
                title="Reset Filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="table-light text-muted fs-xs text-uppercase">
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Product</th>
                  <th>SKU / Barcode</th>
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
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading products catalog…
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-1 d-block mb-2 text-muted"></i>
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  products.map((p, index) => {
                    const isLowStock = Number(p.stock || p.stock_quantity || 0) <= Number(p.low_stock_threshold || 10) && Number(p.stock || p.stock_quantity || 0) > 0
                    const isOutStock = Number(p.stock || p.stock_quantity || 0) <= 0

                    return (
                      <tr key={p.id}>
                        <td className="text-muted fw-semibold">{(page - 1) * 15 + index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
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
                              <div className="fw-bold text-dark">{p.name}</div>
                              {p.is_featured && (
                                <span className="badge bg-warning-subtle text-warning fs-xs">Featured</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-mono fs-sm text-dark">{p.sku || '—'}</div>
                          {p.barcode && <small className="text-muted fs-xs">BC: {p.barcode}</small>}
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
          <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2">
            <small className="text-muted">
              Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
            </small>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                ← Previous
              </button>
              <button type="button" className="btn btn-outline-secondary active disabled">
                Page {page} of {pages || 1}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => Math.min(p + 1, pages))}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 border-0 p-3 shadow-lg text-center">
              <div
                className="rounded-circle bg-danger-subtle text-danger mx-auto d-flex align-items-center justify-content-center mb-3"
                style={{ width: '54px', height: '54px' }}
              >
                <i className="ri-delete-bin-line fs-3"></i>
              </div>
              <h6 className="fw-bold mb-1">Delete Product</h6>
              <p className="text-muted fs-sm mb-4">
                Are you sure you want to delete <strong>{productToDelete.name}</strong>? This will archive the item from sales.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1"
                  disabled={deleting}
                  onClick={() => setProductToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger flex-grow-1"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

