import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function Variants() {
  const [variants, setVariants] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [activeModal, setActiveModal] = useState(null) // 'form' | 'delete'
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    product_id: '',
    name: '',
    sku: '',
    price_adjustment: 0,
    stock_count: 0,
    is_active: true,
  })

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/admin/products', { params: { limit: 200 } })
      setProducts(res.data?.products || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchVariants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products/variants')
      setVariants(res.data?.variants || [])
    } catch (err) {
      toast.error('Failed to load variants')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchVariants()
  }, [fetchProducts, fetchVariants])

  function openAdd() {
    setEditItem(null)
    setForm({
      product_id: products[0]?.id || '',
      name: '',
      sku: '',
      price_adjustment: 0,
      stock_count: 0,
      is_active: true,
    })
    setActiveModal('form')
  }

  function openEdit(v) {
    setEditItem(v)
    setForm({
      product_id: v.product_id || '',
      name: v.name || '',
      sku: v.sku || '',
      price_adjustment: v.price_adjustment ?? 0,
      stock_count: v.stock_count ?? 0,
      is_active: v.is_active !== false,
    })
    setActiveModal('form')
  }

  function openDelete(v) {
    setDeleteItem(v)
    setActiveModal('delete')
  }

  function closeModal() {
    setActiveModal(null)
    setEditItem(null)
    setDeleteItem(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.product_id) return toast.error('Please select a product')
    if (!form.name.trim()) return toast.error('Variant name is required')

    setSaving(true)
    try {
      const payload = {
        product_id: parseInt(form.product_id),
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        price_adjustment: parseFloat(form.price_adjustment) || 0,
        stock_count: parseInt(form.stock_count) || 0,
        is_active: !!form.is_active,
      }

      if (editItem) {
        await api.put(`/admin/products/variants/${editItem.id}`, payload)
        toast.success(`Variant "${form.name}" updated!`)
      } else {
        await api.post('/admin/products/variants', payload)
        toast.success(`Variant "${form.name}" created!`)
      }

      closeModal()
      fetchVariants()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save variant')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    setSaving(true)
    try {
      await api.delete(`/admin/products/variants/${deleteItem.id}`)
      toast.success(`Variant "${deleteItem.name}" deleted!`)
      closeModal()
      fetchVariants()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete variant')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return variants.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q) ||
        v.product_name?.toLowerCase().includes(q),
    )
  }, [variants, search])

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Variants</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
            <li className="breadcrumb-item active">Variants</li>
          </ul>
        </div>
        <button type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={openAdd}>
          <i className="ri-add-line"></i> Add Variant
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box flex-grow-1" style={{ maxWidth: 300 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search variants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total variants: <strong>{variants.length}</strong></span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price Adjustment</th>
                  <th>Stock</th>
                  <th className="text-center">Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading variants...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ri-stack-line fs-32 text-secondary mb-2 d-block"></i>
                      No variants found. Click <strong>"Add Variant"</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="fw-semibold text-dark">{v.product_name}</div>
                        <small className="text-muted">{v.product_sku}</small>
                      </td>
                      <td className="fw-semibold text-dark">{v.name}</td>
                      <td><code className="text-primary fw-bold">{v.sku || '—'}</code></td>
                      <td className="text-muted">
                        {parseFloat(v.price_adjustment) > 0 ? '+' : ''}
                        {v.price_adjustment ? Number(v.price_adjustment).toLocaleString() : '0'}
                      </td>
                      <td className="text-muted">{v.stock_count ?? 0}</td>
                      <td className="text-center">
                        <span className={`badge ${v.is_active !== false ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {v.is_active !== false ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                          onClick={() => openEdit(v)}
                          title="Edit">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          onClick={() => openDelete(v)}
                          title="Delete">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {activeModal === 'form' && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editItem ? `Edit Variant: ${editItem.name}` : 'Add New Variant'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Product <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={form.product_id}
                      onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                      required
                    >
                      <option value="">— Select Product —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Variant Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Black / Small, 5kg Bag"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">SKU</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. TSH-BLK-S"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Price Adjustment (₦)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0.00"
                        value={form.price_adjustment}
                        onChange={(e) => setForm({ ...form, price_adjustment: e.target.value })}
                      />
                      <div className="form-text">Added to the base product price for this variant. Can be negative.</div>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Stock Count</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="0"
                        value={form.stock_count}
                        onChange={(e) => setForm({ ...form, stock_count: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="variantActive"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="variantActive">Available for Sale</label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editItem ? 'Update Variant' : 'Save Variant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && deleteItem && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Delete Variant</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete variant <strong>"{deleteItem.name}"</strong>?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
