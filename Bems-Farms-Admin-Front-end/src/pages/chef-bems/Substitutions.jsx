import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const EMPTY_SUB = {
  original_item: '',
  substitute_item: '',
  reason: '',
  dietary_tags: '',
  confidence: 0.85
}

function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: size === 'sm' ? 400 : 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
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

export default function Substitutions() {
  const [substitutions, setSubstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState(EMPTY_SUB)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/substitutions', { params: { search: search || undefined } })
      .then(res => setSubstitutions(res.data.substitutions || []))
      .catch(() => toast.error('Failed to load substitutions'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const openEdit = (sub) => {
    setForm({
      original_item: sub.original_item,
      substitute_item: sub.substitute_item,
      reason: sub.reason || '',
      dietary_tags: sub.dietary_tags || '',
      confidence: sub.confidence || 0.85
    })
    setEditModal(sub.id)
  }

  async function saveSubstitution() {
    if (!form.original_item.trim() || !form.substitute_item.trim()) {
      return toast.error('Original item and substitute item are required')
    }
    setSaving(true)
    try {
      await api.post('/admin/chef-bems/substitutions', form)
      toast.success('Substitution added')
      setAddModal(false)
      setForm(EMPTY_SUB)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save substitution')
    } finally {
      setSaving(false)
    }
  }

  async function updateSubstitution() {
    setSaving(true)
    try {
      await api.put(`/admin/chef-bems/substitutions/${editModal}`, form)
      toast.success('Substitution updated')
      setEditModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update substitution')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSubstitution() {
    try {
      await api.delete(`/admin/chef-bems/substitutions/${deleteModal}`)
      toast.success('Substitution deleted')
      setDeleteModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete substitution')
    }
  }

  const SubForm = () => (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label fw-medium">Original Ingredient <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Red Palm Oil"
          value={form.original_item}
          onChange={e => setForm(f => ({ ...f, original_item: e.target.value }))}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-medium">Substitute Ingredient <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Groundnut Oil / Sunflower Oil"
          value={form.substitute_item}
          onChange={e => setForm(f => ({ ...f, substitute_item: e.target.value }))}
        />
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Reason &amp; Culinary Guidance</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="e.g. Heart health, low cholesterol, or allergic to palm oil. Suggest when user asks for low-fat cooking."
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
        />
      </div>
      <div className="col-md-8">
        <label className="form-label fw-medium">Dietary / Health Tags</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. heart-health, vegan, low-fat"
          value={form.dietary_tags}
          onChange={e => setForm(f => ({ ...f, dietary_tags: e.target.value }))}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">AI Confidence (0.1 - 1.0)</label>
        <input
          type="number"
          step="0.05"
          min="0.1"
          max="1.0"
          className="form-control"
          value={form.confidence}
          onChange={e => setForm(f => ({ ...f, confidence: parseFloat(e.target.value) || 0.85 }))}
        />
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-repeat-2-line me-2 text-info"></i>Ingredient Substitutions
          </h4>
          <p className="text-muted mb-0">Manage smart ingredient swap alternatives for Chef Bems AI.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_SUB); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Substitution
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: 280 }}
              placeholder="Search ingredient swaps..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{substitutions.length} rules</span>
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-muted py-5">Loading substitutions…</div>}
      {!loading && substitutions.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="ri-repeat-2-line fs-1 d-block mb-2"></i>No substitutions found. Click "Add Substitution" to create one.
        </div>
      )}

      <div className="row g-4">
        {!loading && substitutions.map(sub => (
          <div className="col-md-6 col-xl-4" key={sub.id}>
            <div className="card mb-0 h-100 shadow-sm border">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-danger-subtle text-danger" style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b' }}>
                      {sub.original_item}
                    </span>
                    <i className="ri-arrow-right-line text-muted"></i>
                    <span className="badge bg-success-subtle text-success" style={{ fontSize: 11, background: '#dcfce7', color: '#166534' }}>
                      {sub.substitute_item}
                    </span>
                  </div>
                  <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                    {Math.round((sub.confidence || 0.85) * 100)}% Match
                  </span>
                </div>

                <p className="text-muted mb-3" style={{ fontSize: 12 }}>
                  {sub.reason || 'Smart AI swap for dietary and preference adaptation.'}
                </p>

                {sub.dietary_tags && (
                  <div className="mb-2">
                    <div className="d-flex flex-wrap gap-1">
                      {sub.dietary_tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2 mt-auto pt-2">
                  <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(sub)}>
                    <i className="ri-pencil-line me-1"></i>Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(sub.id)}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Ingredient Substitution">
        <SubForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveSubstitution} disabled={saving}>
            {saving ? 'Saving…' : 'Save Substitution'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Ingredient Substitution">
        <SubForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateSubstitution} disabled={saving}>
            {saving ? 'Saving…' : 'Update Substitution'}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Substitution" size="sm">
        <p className="text-muted mb-4">Are you sure you want to delete this substitution rule?</p>
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={deleteSubstitution}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
