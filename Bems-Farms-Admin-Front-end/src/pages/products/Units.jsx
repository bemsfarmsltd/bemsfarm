import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function Units() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [activeModal, setActiveModal] = useState(null) // 'form' | 'delete'
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    short: '',
    type: 'Weight',
    step: 1.0,
    status: 'active',
  })

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/config/units')
      if (res.data?.units) {
        setUnits(res.data.units)
      }
    } catch (err) {
      toast.error('Failed to load units of measure')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', short: '', type: 'Weight', step: 1.0, status: 'active' })
    setActiveModal('form')
  }

  function openEdit(u) {
    setEditItem(u)
    setForm({
      name: u.name || '',
      short: u.short || u.abbreviation || '',
      type: u.type || 'Weight',
      step: u.step || 1.0,
      status: u.status || 'active',
    })
    setActiveModal('form')
  }

  function openDelete(u) {
    setDeleteItem(u)
    setActiveModal('delete')
  }

  function closeModal() {
    setActiveModal(null)
    setEditItem(null)
    setDeleteItem(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Unit name is required')
    if (!form.short.trim()) return toast.error('Short abbreviation is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        short: form.short.trim(),
        type: form.type || 'Weight',
        step: parseFloat(form.step) || 1.0,
        status: form.status || 'active',
      }

      if (editItem) {
        await api.put(`/admin/config/units/${editItem.id}`, payload)
        toast.success(`Unit "${form.name}" updated!`)
      } else {
        await api.post('/admin/config/units', payload)
        toast.success(`Unit "${form.name}" created!`)
      }

      closeModal()
      fetchUnits()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save unit')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    setSaving(true)
    try {
      await api.delete(`/admin/config/units/${deleteItem.id}`)
      toast.success(`Unit "${deleteItem.name}" deleted!`)
      closeModal()
      fetchUnits()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete unit')
    } finally {
      setSaving(false)
    }
  }

  const filtered = units.filter((u) => {
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.short?.toLowerCase().includes(q) || u.type?.toLowerCase().includes(q)
  })

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Units of Measure</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
            <li className="breadcrumb-item active">Units</li>
          </ul>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
          onClick={openAdd}>
          <i className="ri-add-line"></i> + Add New Unit
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="search-box flex-grow-1" style={{ maxWidth: 300 }}>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
              </div>
            </div>
            <span className="text-muted fs-13">Total units configured: <strong>{units.length}</strong></span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Unit Name</th>
                  <th>Abbreviation / Code</th>
                  <th>Unit Type</th>
                  <th>Step Increment</th>
                  <th className="text-center">Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading units...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="ri-scales-line fs-32 text-secondary mb-2 d-block"></i>
                      No units of measure found. Click <strong>"+ Add New Unit"</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold text-dark">{u.name}</td>
                      <td><code className="text-primary fw-bold">{u.short || u.abbreviation}</code></td>
                      <td><span className="badge bg-light text-dark">{u.type || 'Standard'}</span></td>
                      <td className="text-muted">{u.step || '1.0'}</td>
                      <td className="text-center">
                        <span className={`badge ${u.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                          onClick={() => openEdit(u)}
                          title="Edit">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-1 px-2"
                          onClick={() => openDelete(u)}
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
                  {editItem ? `Edit Unit: ${editItem.name}` : 'Add New Unit'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Unit Full Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kilogram, Litre, Bunch, Pack"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Abbreviation / Short Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. kg, L, bunch, pk"
                      value={form.short}
                      onChange={(e) => setForm({ ...form, short: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Unit Type</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="Weight">Weight (kg, g, etc.)</option>
                        <option value="Volume">Volume (L, ml, etc.)</option>
                        <option value="Count / Piece">Count / Piece</option>
                        <option value="Packaging">Packaging (Box, Bag, Crate)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Step Increment</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        placeholder="1.0"
                        value={form.step}
                        onChange={(e) => setForm({ ...form, step: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active (Available)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editItem ? 'Update Unit' : 'Save Unit'}
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
                <h5 className="modal-title fw-bold text-danger">Delete Unit</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete unit <strong>"{deleteItem.name}" ({deleteItem.short || deleteItem.abbreviation})</strong>?</p>
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
