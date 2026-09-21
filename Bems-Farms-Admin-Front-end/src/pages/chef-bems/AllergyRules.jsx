import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const EMPTY_ALLERGY = {
  allergy_name: '',
  excluded_item: '',
  action_type: 'Hard Filter',
  substitution_guidance: '',
  safety_note: ''
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

export default function AllergyRules() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState(EMPTY_ALLERGY)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/allergy-rules', { params: { search: search || undefined } })
      .then(res => setRules(res.data.rules || []))
      .catch(() => toast.error('Failed to load allergy rules'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const openEdit = (rule) => {
    setForm({
      allergy_name: rule.allergy_name,
      excluded_item: rule.excluded_item,
      action_type: rule.action_type || 'Hard Filter',
      substitution_guidance: rule.substitution_guidance || '',
      safety_note: rule.safety_note || ''
    })
    setEditModal(rule.allergy_id)
  }

  async function saveRule() {
    if (!form.allergy_name.trim() || !form.excluded_item.trim()) {
      return toast.error('Allergy name and excluded item are required')
    }
    setSaving(true)
    try {
      await api.post('/admin/chef-bems/allergy-rules', form)
      toast.success('Allergy rule added')
      setAddModal(false)
      setForm(EMPTY_ALLERGY)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save allergy rule')
    } finally {
      setSaving(false)
    }
  }

  async function updateRule() {
    setSaving(true)
    try {
      await api.put(`/admin/chef-bems/allergy-rules/${editModal}`, form)
      toast.success('Allergy rule updated')
      setEditModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update allergy rule')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRule() {
    try {
      await api.delete(`/admin/chef-bems/allergy-rules/${deleteModal}`)
      toast.success('Allergy rule deleted')
      setDeleteModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete allergy rule')
    }
  }

  const AllergyForm = () => (
    <div className="row g-3">
      <div className="col-md-7">
        <label className="form-label fw-medium">Allergy Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Shellfish & Crustacean Allergy"
          value={form.allergy_name}
          onChange={e => setForm(f => ({ ...f, allergy_name: e.target.value }))}
        />
      </div>
      <div className="col-md-5">
        <label className="form-label fw-medium">Action Type</label>
        <select
          className="form-select"
          value={form.action_type}
          onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
        >
          <option value="Hard Filter">Hard Filter (Never Add to Cart)</option>
          <option value="Warning">Warning &amp; Confirm</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Excluded Products / Items <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Crayfish, Prawns, Shrimps, Periwinkles, Crabs"
          value={form.excluded_item}
          onChange={e => setForm(f => ({ ...f, excluded_item: e.target.value }))}
        />
        <div className="form-text">Comma-separated list of keywords to block.</div>
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Safe Substitution Guidance</label>
        <textarea
          className="form-control"
          rows={2}
          placeholder="e.g. Replace with smoked fish powder or fermented locust beans (Iru) + dried mushrooms for umami."
          value={form.substitution_guidance}
          onChange={e => setForm(f => ({ ...f, substitution_guidance: e.target.value }))}
        />
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Safety Note for Chef Bems</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. CRITICAL: Never suggest crayfish if customer flags seafood allergy."
          value={form.safety_note}
          onChange={e => setForm(f => ({ ...f, safety_note: e.target.value }))}
        />
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-alarm-warning-line me-2 text-danger"></i>Allergy &amp; Safety Rules
          </h4>
          <p className="text-muted mb-0">Configure hard allergen exclusions and safety guidance for Chef Bems AI.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_ALLERGY); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Allergy Rule
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: 280 }}
              placeholder="Search allergy rules..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{rules.length} rules</span>
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-muted py-5">Loading allergy rules…</div>}
      {!loading && rules.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="ri-alarm-warning-line fs-1 d-block mb-2"></i>No allergy rules yet. Click "Add Allergy Rule" to create one.
        </div>
      )}

      <div className="row g-4">
        {!loading && rules.map(rule => (
          <div className="col-md-6 col-xl-4" key={rule.allergy_id || rule.id}>
            <div className="card mb-0 h-100 shadow-sm border">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <h6 className="fw-bold mb-0 text-danger" style={{ fontSize: 14 }}>
                    <i className="ri-forbid-2-line me-1"></i>{rule.allergy_name}
                  </h6>
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b' }}>
                    {rule.action_type || 'Hard Filter'}
                  </span>
                </div>

                <div className="p-2 rounded my-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                    Excluded Ingredients:
                  </span>
                  <p className="mb-0 fw-medium text-dark" style={{ fontSize: 12 }}>{rule.excluded_item}</p>
                </div>

                {rule.substitution_guidance && (
                  <p className="text-muted mb-2" style={{ fontSize: 12 }}>
                    <strong>Safe Swap:</strong> {rule.substitution_guidance}
                  </p>
                )}

                {rule.safety_note && (
                  <p className="text-muted mb-3" style={{ fontSize: 11, fontStyle: 'italic' }}>
                    ⚠️ {rule.safety_note}
                  </p>
                )}

                <div className="d-flex gap-2 mt-auto pt-2">
                  <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(rule)}>
                    <i className="ri-pencil-line me-1"></i>Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(rule.allergy_id || rule.id)}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Allergy Safety Rule">
        <AllergyForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveRule} disabled={saving}>
            {saving ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Allergy Safety Rule">
        <AllergyForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateRule} disabled={saving}>
            {saving ? 'Saving…' : 'Update Rule'}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Allergy Rule" size="sm">
        <p className="text-muted mb-4">Are you sure you want to delete this allergy safety rule?</p>
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={deleteRule}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
