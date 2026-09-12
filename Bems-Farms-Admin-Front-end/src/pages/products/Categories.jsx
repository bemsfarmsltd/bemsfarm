import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ImportModal from '../../components/ImportModal'

const IMPORT_FIELDS = [
  { key: 'name', label: 'Category Name', required: true },
  { key: 'code', label: 'Category Code', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'status', label: 'Status', required: false, hint: 'active | inactive' },
]

function genCode(name) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  const rand = Math.floor(100 + Math.random() * 900)
  return `CAT-${slug}-${rand}`
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [activeModal, setActiveModal] = useState(null) // 'form' | 'delete' | 'import'
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
  })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/config/categories')
      if (res.data?.categories) {
        setCategories(res.data.categories)
      }
    } catch (err) {
      toast.error('Failed to load categories')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', code: genCode('NEW'), description: '', status: 'active' })
    setActiveModal('form')
  }

  function openEdit(c) {
    setEditItem(c)
    setForm({
      name: c.name || '',
      code: c.code || genCode(c.name || 'CAT'),
      description: c.description || '',
      status: c.status || 'active',
    })
    setActiveModal('form')
  }

  function openDelete(c) {
    setDeleteItem(c)
    setActiveModal('delete')
  }

  function closeModal() {
    setActiveModal(null)
    setEditItem(null)
    setDeleteItem(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Category name is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code?.trim() || genCode(form.name),
        description: form.description?.trim() || null,
        status: form.status || 'active',
      }

      if (editItem) {
        await api.put(`/admin/config/categories/${editItem.id}`, payload)
        toast.success(`Category "${form.name}" updated!`)
      } else {
        await api.post('/admin/config/categories', payload)
        toast.success(`Category "${form.name}" created!`)
      }

      closeModal()
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    setSaving(true)
    try {
      await api.delete(`/admin/config/categories/${deleteItem.id}`)
      toast.success(`Category "${deleteItem.name}" deleted!`)
      closeModal()
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete category in use')
    } finally {
      setSaving(false)
    }
  }

  async function handleImport(rows) {
    setSaving(true)
    let count = 0
    for (const r of rows) {
      if (r.name?.trim()) {
        try {
          await api.post('/admin/config/categories', {
            name: r.name.trim(),
            code: r.code?.trim() || genCode(r.name),
            description: r.description?.trim() || null,
            status: r.status?.trim() || 'active',
          })
          count++
        } catch {
          // continue
        }
      }
    }
    toast.success(`Imported ${count} categories!`)
    setActiveModal(null)
    setSaving(false)
    fetchCategories()
  }

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.status === 'active').length,
    inactive: categories.filter((c) => c.status === 'inactive').length,
    products: categories.reduce((sum, c) => sum + (parseInt(c.products) || 0), 0),
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Product Categories</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
            <li className="breadcrumb-item active">Categories</li>
          </ul>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => setActiveModal('import')}>
            <i className="ri-upload-cloud-line"></i> Bulk Import
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={openAdd}>
            <i className="ri-add-line"></i> + Add Category
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Categories', value: stats.total, icon: 'ri-folder-line', color: '#405189' },
          { label: 'Active Categories', value: stats.active, icon: 'ri-checkbox-circle-line', color: '#0ab39c' },
          { label: 'Inactive Categories', value: stats.inactive, icon: 'ri-close-circle-line', color: '#f06548' },
          { label: 'Total Products Assigned', value: stats.products, icon: 'ri-box-3-line', color: '#299cdb' },
        ].map((c) => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 shadow-sm border-0" style={{ borderLeft: `3px solid ${c.color}` }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: `${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color: c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-muted fs-12">{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box flex-grow-1" style={{ maxWidth: 300 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterStatus('all')}>
                All ({categories.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterStatus === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterStatus('active')}>
                Active
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterStatus === 'inactive' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterStatus('inactive')}>
                Inactive
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Category Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th className="text-center">Assigned Products</th>
                  <th className="text-center">Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading categories...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="ri-folder-open-line fs-32 text-secondary mb-2 d-block"></i>
                      No categories found. Click <strong>"+ Add Category"</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold text-dark">
                        <i className="ri-folder-3-fill me-2 text-primary opacity-75"></i>
                        {c.name}
                      </td>
                      <td><code className="text-primary">{c.code || `CAT-${c.id}`}</code></td>
                      <td className="text-muted fs-13">{c.description || '—'}</td>
                      <td className="text-center fw-bold">
                        <span className="badge bg-light text-dark">{c.products || 0} products</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${c.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {c.status || 'active'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                          onClick={() => openEdit(c)}
                          title="Edit">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          onClick={() => openDelete(c)}
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

      {/* Add / Edit Category Modal */}
      {activeModal === 'form' && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editItem ? `Edit Category: ${editItem.name}` : 'Add New Category'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Category Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Fresh Poultry & Eggs"
                      value={form.name}
                      onChange={(e) => {
                        const val = e.target.value
                        setForm((f) => ({
                          ...f,
                          name: val,
                          code: !editItem ? genCode(val) : f.code,
                        }))
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Category Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CAT-PLT-001"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Short description for this category..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editItem ? 'Update Category' : 'Save Category'}
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
                <h5 className="modal-title fw-bold text-danger">Delete Category</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete category <strong>"{deleteItem.name}"</strong>?</p>
                <p className="text-muted fs-13 mb-0">
                  Note: Categories with assigned products cannot be deleted until those products are moved or deleted.
                </p>
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

      {/* Import Wizard */}
      {activeModal === 'import' && (
        <ImportModal
          entityName="Categories"
          fields={IMPORT_FIELDS}
          onImport={handleImport}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
