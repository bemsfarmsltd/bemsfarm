import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const ASSOCIATION_TYPES = ['pairs_well_with', 'meal_co_occurrence', 'substitute_for', 'complements']
const TYPE_LABEL = {
  pairs_well_with: 'Pairs Well With', meal_co_occurrence: 'Bought Together', substitute_for: 'Substitute For', complements: 'Complements',
}

const EMPTY = { product_a: '', product_b: '', association_type: 'pairs_well_with', association_strength: 3 }

function Modal({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1e293b', color: '#fff', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="fw-semibold">{title}</span>
          <button className="btn-close btn-close-white btn-sm" onClick={onClose}></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export default function MealAssociations() {
  const [associations, setAssociations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/meal-associations', { params: { search: search || undefined } })
      .then(res => setAssociations(res.data.associations || []))
      .catch(() => toast.error('Failed to load meal associations'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const filtered = associations.filter(a => typeFilter === 'all' || a.association_type === typeFilter)

  const openEdit = a => {
    setForm({ product_a: a.product_a, product_b: a.product_b, association_type: a.association_type, association_strength: a.association_strength })
    setEditModal(a.id)
  }

  async function saveAssociation() {
    if (!form.product_a.trim() || !form.product_b.trim()) return toast.error('Both products are required')
    setSaving(true)
    try {
      await api.post('/admin/chef-bems/meal-associations', form)
      toast.success('Association added')
      setAddModal(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save association')
    } finally {
      setSaving(false)
    }
  }

  async function updateAssociation() {
    setSaving(true)
    try {
      await api.put(`/admin/chef-bems/meal-associations/${editModal}`, form)
      toast.success('Association updated')
      setEditModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update association')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAssociation() {
    try {
      await api.delete(`/admin/chef-bems/meal-associations/${deleteModal}`)
      toast.success('Association removed')
      setDeleteModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove association')
    }
  }

  const AssocForm = () => (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label fw-medium">Product A <span className="text-danger">*</span></label>
        <input type="text" className="form-control" placeholder="e.g. garri" value={form.product_a} onChange={e => setForm(f => ({ ...f, product_a: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-medium">Product B <span className="text-danger">*</span></label>
        <input type="text" className="form-control" placeholder="e.g. palm oil" value={form.product_b} onChange={e => setForm(f => ({ ...f, product_b: e.target.value }))} />
      </div>
      <div className="col-md-8">
        <label className="form-label fw-medium">Association Type</label>
        <select className="form-select" value={form.association_type} onChange={e => setForm(f => ({ ...f, association_type: e.target.value }))}>
          {ASSOCIATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Strength (1-5)</label>
        <input type="number" min={1} max={5} className="form-control" value={form.association_strength} onChange={e => setForm(f => ({ ...f, association_strength: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-links-line me-2 text-success"></i>Meal Associations
          </h4>
          <p className="text-muted mb-0">Product pairings Chef Bems AI uses to suggest what goes well together.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Association
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input type="text" className="form-control form-control-sm" style={{ maxWidth: 240 }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {ASSOCIATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{filtered.length} associations</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle text-nowrap mb-0">
            <thead>
              <tr className="bg-light border-bottom">
                <th className="fw-medium text-muted">Product A</th>
                <th className="fw-medium text-muted">Product B</th>
                <th className="fw-medium text-muted">Type</th>
                <th className="fw-medium text-muted">Strength</th>
                <th className="fw-medium text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-5 text-muted">Loading associations…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No meal associations found.</td></tr>
              )}
              {!loading && filtered.map(a => (
                <tr key={a.id}>
                  <td className="fw-medium text-capitalize">{a.product_a}</td>
                  <td className="fw-medium text-capitalize">{a.product_b}</td>
                  <td><span className="badge bg-light text-dark border">{TYPE_LABEL[a.association_type] || a.association_type}</span></td>
                  <td>
                    <div className="d-flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <i key={n} className={n <= a.association_strength ? 'ri-star-fill text-warning' : 'ri-star-line text-muted'} style={{ fontSize: 12 }} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openEdit(a)}><i className="ri-pencil-line"></i></button>
                      <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => setDeleteModal(a.id)}><i className="ri-delete-bin-line"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Association">
        {AssocForm()}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveAssociation} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Association">
        {AssocForm()}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateAssociation} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </Modal>

      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Association">
        <div className="text-center py-2">
          <i className="ri-delete-bin-line fs-1 text-danger d-block mb-3"></i>
          <p className="fw-medium mb-1">Remove this association?</p>
          <p className="text-muted fs-sm mb-4">Chef Bems AI will no longer suggest this pairing.</p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-light px-4" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger px-4" onClick={deleteAssociation}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
