import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = {
  code: '', description: '', type: 'percentage', value: '', min_order: '0',
  max_discount: '', usage_limit: '', per_user_limit: '1', applicable_to: 'all',
  start_date: '', end_date: '', is_active: true,
}

function statusOf(c) {
  if (!c.is_active) return { label: 'Inactive', cls: 'bg-secondary-subtle text-secondary' }
  if (c.usage_limit && c.used_count >= c.usage_limit) return { label: 'Exhausted', cls: 'bg-warning-subtle text-warning' }
  if (c.end_date && new Date(c.end_date) < new Date()) return { label: 'Expired', cls: 'bg-danger-subtle text-danger' }
  return { label: 'Active', cls: 'bg-success-subtle text-success' }
}

export default function CouponSettings() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(BLANK)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/coupons', { params: { search: search || undefined, limit: 50 } })
      .then(res => setCoupons(res.data.coupons || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  function openAdd() { setEditing(null); setForm(BLANK); setModalOpen(true) }
  function openEdit(c) {
    setEditing(c)
    setForm({
      code: c.code, description: c.description || '', type: c.type, value: c.value,
      min_order: c.min_order || '0', max_discount: c.max_discount || '', usage_limit: c.usage_limit || '',
      per_user_limit: c.per_user_limit || '1', applicable_to: c.applicable_to || 'all',
      start_date: c.start_date ? c.start_date.slice(0, 10) : '', end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      is_active: c.is_active,
    })
    setModalOpen(true)
  }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.code.trim() || !form.value) return toast.error('Code and discount value are required')
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/admin/coupons/${editing.id}`, form)
        toast.success('Coupon updated')
      } else {
        await api.post('/admin/coupons', form)
        toast.success('Coupon created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c) {
    try {
      await api.patch(`/admin/coupons/${c.id}/toggle`)
      load()
    } catch {
      toast.error('Failed to toggle coupon')
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/coupons/${deleteTarget.id}`)
      toast.success('Coupon deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon')
    }
  }

  return (
    <div className="container-fluid">
      <SettingsTabs />

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-4 align-items-center justify-content-between">
          <h5 className="card-title mb-1">Coupon List</h5>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="position-relative">
              <input type="text" className="form-control ps-10" placeholder="Search coupon..." value={search} onChange={e => setSearch(e.target.value)} />
              <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
            </div>
            <button type="button" className="btn btn-primary" onClick={openAdd}><i className="ri-add-line me-1"></i>Add Coupon</button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Code</th>
                  <th className="fw-medium text-muted">Type</th>
                  <th className="fw-medium text-muted">Discount</th>
                  <th className="fw-medium text-muted">Used</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Start Date</th>
                  <th className="fw-medium text-muted">End Date</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">Loading coupons…</td></tr>
                )}
                {!loading && coupons.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">No coupons yet. Click "Add Coupon" to create one.</td></tr>
                )}
                {!loading && coupons.map(c => {
                  const sc = statusOf(c)
                  return (
                    <tr key={c.id}>
                      <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">{c.code}</span></td>
                      <td>{c.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</td>
                      <td>{c.type === 'percentage' ? `${c.value}%` : `₦${Number(c.value).toLocaleString()}`}</td>
                      <td>{c.used_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                      <td>
                        <button type="button" className={`badge border-0 ${sc.cls}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(c)}>{sc.label}</button>
                      </td>
                      <td>{c.start_date ? c.start_date.slice(0, 10) : '—'}</td>
                      <td>{c.end_date ? c.end_date.slice(0, 10) : '—'}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" onClick={() => openEdit(c)}><i className="ri-edit-line"></i></button>
                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" onClick={() => setDeleteTarget(c)}><i className="ri-delete-bin-line"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <h6 className="mb-0">{editing ? 'Edit Coupon' : 'Add Coupon'}</h6>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label">Coupon Code</label>
                    <input className="form-control text-uppercase" value={form.code} disabled={!!editing}
                      onChange={e => fld('code', e.target.value.toUpperCase())} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e => fld('type', e.target.value)}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Discount Value {form.type === 'percentage' ? '(%)' : '(₦)'}</label>
                    <input type="number" className="form-control" value={form.value} onChange={e => fld('value', e.target.value)} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Minimum Order (₦)</label>
                    <input type="number" className="form-control" value={form.min_order} onChange={e => fld('min_order', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Max Discount Cap (₦, optional)</label>
                    <input type="number" className="form-control" value={form.max_discount} onChange={e => fld('max_discount', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Usage Limit (optional)</label>
                    <input type="number" className="form-control" value={form.usage_limit} onChange={e => fld('usage_limit', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-control" value={form.start_date} onChange={e => fld('start_date', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-control" value={form.end_date} onChange={e => fld('end_date', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <input className="form-control" value={form.description} onChange={e => fld('description', e.target.value)} placeholder="e.g. Weekend Sale — 10% off all orders" />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_active" checked={form.is_active} onChange={e => fld('is_active', e.target.checked)} />
                      <label className="form-check-label" htmlFor="is_active">Active</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 p-4 pt-0">
                <button type="button" className="btn btn-light w-100" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Coupon')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="p-4 text-center">
              <div className="d-flex justify-content-center mb-4">
                <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                  <i className="ri-delete-bin-line text-danger fs-24"></i>
                </div>
              </div>
              <h5 className="mb-4">Delete "{deleteTarget.code}"?</h5>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light w-100" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
