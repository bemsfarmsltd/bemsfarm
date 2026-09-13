import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'inactive', label: 'Inactive' },
]
const TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'farm_outlet', label: 'Farm Outlet' },
]

const BLANK = {
  name: '', code: '', address: '', city: '', state: '', country: 'Nigeria',
  phone: '', email: '', manager_id: '', opening_hours: '', notes: '',
  status: 'open', store_type: 'retail',
}

export default function AddStore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditing = !!editId

  const [form, setForm] = useState(BLANK)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/admin/staff', { params: { limit: 100 } })
      .then(res => setStaff(res.data.staff || []))
      .catch(() => setStaff([]))
  }, [])

  useEffect(() => {
    if (!isEditing) return
    api.get(`/admin/stores/${editId}`)
      .then(res => {
        const s = res.data.store
        setForm({
          name: s.name || '', code: s.code || '', address: s.address || '', city: s.city || '',
          state: s.state || '', country: s.country || 'Nigeria', phone: s.phone || '', email: s.email || '',
          manager_id: s.manager_id || '', opening_hours: s.opening_hours || '', notes: s.notes || '',
          status: s.status || 'open', store_type: s.store_type || 'retail',
        })
      })
      .catch(() => toast.error('Failed to load store'))
      .finally(() => setLoading(false))
  }, [isEditing, editId])

  const valid = form.name.trim() && form.code.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    setSaving(true)
    try {
      const payload = { ...form, manager_id: form.manager_id || undefined, email: form.email || undefined }
      if (isEditing) {
        await api.patch(`/admin/stores/${editId}`, payload)
        toast.success('Store updated')
      } else {
        await api.post('/admin/stores', payload)
        toast.success('Store added')
      }
      navigate('/stores')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save store')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container-fluid py-5 text-center text-muted">Loading store…</div>
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">{isEditing ? 'Edit Store' : 'Add Store'}</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/stores">Stores</Link></li>
          <li className="breadcrumb-item active">{isEditing ? 'Edit Store' : 'Add Store'}</li>
        </ul>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Basic Store Information</h5>
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-md-6">
                <label className="form-label">Store Code <span className="text-danger">*</span></label>
                <input className={`form-control ${submitted && !form.code.trim() ? 'is-invalid' : ''}`}
                  placeholder="e.g. STR-001" value={form.code} onChange={e => fld('code', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Store Name <span className="text-danger">*</span></label>
                <input className={`form-control ${submitted && !form.name.trim() ? 'is-invalid' : ''}`}
                  placeholder="e.g. Main City Store" value={form.name} onChange={e => fld('name', e.target.value)} />
              </div>
              <div className="col-lg-4">
                <div className="mb-3">
                  <label className="form-label">Store Type</label>
                  <select className="form-select" value={form.store_type} onChange={e => fld('store_type', e.target.value)}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Store Status</label>
                  <select className="form-select" value={form.status} onChange={e => fld('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-lg-8">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows="5" placeholder="Enter address details here..."
                  value={form.address} onChange={e => fld('address', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">City</label>
                <input className="form-control" placeholder="City" value={form.city} onChange={e => fld('city', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">State</label>
                <input className="form-control" placeholder="State" value={form.state} onChange={e => fld('state', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Country</label>
                <input className="form-control" placeholder="Country" value={form.country} onChange={e => fld('country', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Manager & Contact</h5>
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-md-6">
                <label className="form-label">Store Manager</label>
                <select className="form-select" value={form.manager_id} onChange={e => fld('manager_id', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {staff.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.system_role})</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Store Email</label>
                <input type="email" className="form-control" placeholder="store@bemsfarms.com" value={form.email} onChange={e => fld('email', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Store Phone</label>
                <input className="form-control" placeholder="e.g. 08031234567" value={form.phone} onChange={e => fld('phone', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Opening Hours</label>
                <input className="form-control" placeholder="e.g. 8:00 AM - 8:00 PM" value={form.opening_hours} onChange={e => fld('opening_hours', e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows="3" placeholder="Any notes about this store..."
                  value={form.notes} onChange={e => fld('notes', e.target.value)} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-3 mt-4">
              <Link to="/stores" className="btn btn-outline-secondary"><i className="ri-close-line me-1 align-middle"></i>Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Add Store')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
