import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const EMPTY_RULE = { condition: '', rule_text: '', tags: '', priority: 5 }

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

export default function DietaryRules() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState(EMPTY_RULE)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/dietary-rules', { params: { search: search || undefined } })
      .then(res => setRules(res.data.rules || []))
      .catch(() => toast.error('Failed to load dietary rules'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const openEdit = rule => {
    setForm({ condition: rule.condition, rule_text: rule.rule_text || '', tags: rule.tags || '', priority: rule.priority ?? 5 })
    setEditModal(rule.id)
  }

  async function saveRule() {
    if (!form.condition.trim() || !form.rule_text.trim()) return toast.error('Condition and rule text are required')
    setSaving(true)
    try {
      await api.post('/admin/chef-bems/dietary-rules', form)
      toast.success('Rule added')
      setAddModal(false)
      setForm(EMPTY_RULE)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  async function updateRule() {
    setSaving(true)
    try {
      await api.put(`/admin/chef-bems/dietary-rules/${editModal}`, form)
      toast.success('Rule updated')
      setEditModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rule')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRule() {
    try {
      await api.delete(`/admin/chef-bems/dietary-rules/${deleteModal}`)
      toast.success('Rule deleted')
      setDeleteModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete rule')
    }
  }

  const RuleForm = () => (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label fw-medium">Condition <span className="text-danger">*</span></label>
        <input type="text" className="form-control" placeholder="e.g. Lactose Intolerance" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} />
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Priority</label>
        <input type="number" className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
        <div className="form-text">Higher number = shown first to Chef Bems AI.</div>
      </div>
      <div className="col-md-8">
        <label className="form-label fw-medium">Tags <span className="text-muted fw-normal">(comma-separated)</span></label>
        <input type="text" className="form-control" placeholder="e.g. dairy, milk, cheese, butter" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Rule Text <span className="text-danger">*</span></label>
        <textarea className="form-control" rows={4} placeholder="What Chef Bems AI should tell the customer / how it should filter recommendations..." value={form.rule_text} onChange={e => setForm(f => ({ ...f, rule_text: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-shield-check-line me-2 text-success"></i>Dietary Rules
          </h4>
          <p className="text-muted mb-0">Configure ingredient exclusion rules for Chef Bems AI recommendations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_RULE); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Rule
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input type="text" className="form-control form-control-sm" style={{ maxWidth: 280 }} placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{rules.length} rules</span>
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-muted py-5">Loading dietary rules…</div>}
      {!loading && rules.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="ri-shield-check-line fs-1 d-block mb-2"></i>No dietary rules yet. Click "Add Rule" to create one.
        </div>
      )}

      <div className="row g-4">
        {!loading && rules.map(rule => (
          <div className="col-md-6 col-xl-4" key={rule.id}>
            <div className="card mb-0 h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <h6 className="fw-semibold mb-0" style={{ fontSize: 14 }}>{rule.condition}</h6>
                  <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>Priority {rule.priority}</span>
                </div>

                <p className="text-muted mb-3" style={{ fontSize: 12 }}>{rule.rule_text}</p>

                {rule.tags && (
                  <div className="mb-2">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tags
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {rule.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2 mt-auto pt-2">
                  <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(rule)}>
                    <i className="ri-pencil-line me-1"></i>Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(rule.id)}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Dietary Rule">
        {RuleForm()}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveRule} disabled={saving || !form.condition.trim()}>{saving ? 'Saving…' : 'Save Rule'}</button>
        </div>
      </Modal>

      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Dietary Rule">
        {RuleForm()}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateRule} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </Modal>

      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Rule" size="sm">
        <div className="text-center py-2">
          <i className="ri-delete-bin-line fs-1 text-danger d-block mb-3"></i>
          <p className="fw-medium mb-1">Delete this dietary rule?</p>
          <p className="text-muted fs-sm mb-4">This will remove it from Chef Bems AI's recommendations.</p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-light px-4" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger px-4" onClick={deleteRule}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
