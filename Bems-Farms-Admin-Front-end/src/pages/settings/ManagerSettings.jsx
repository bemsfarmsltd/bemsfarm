import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import SettingsTabs from './SettingsTabs'

const CREATE_ROLES = ['admin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'storekeeper', 'kitchen_staff']
const EDIT_ROLES = ['superadmin', ...CREATE_ROLES]
const ROLE_LABEL = {
  superadmin: 'Super Admin', admin: 'Admin', manager: 'Manager', accountant: 'Accountant',
  delivery_manager: 'Delivery Manager', cashier: 'Cashier', storekeeper: 'Storekeeper', kitchen_staff: 'Kitchen Staff',
}

const BLANK = { name: '', email: '', password: '', role: 'cashier', store_id: '' }

export default function ManagerSettings() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(BLANK)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/settings/manager', { params: { limit: 100 } }),
      api.get('/admin/stores', { params: { limit: 100 } }).catch(() => ({ data: { stores: [] } })),
    ])
      .then(([usersRes, storesRes]) => {
        setUsers(usersRes.data.users || [])
        setStores(storesRes.data.stores || [])
      })
      .catch(() => toast.error('Failed to load admin users'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  function openAdd() { setEditing(null); setForm(BLANK); setModalOpen(true) }
  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, store_id: u.store_id || '' })
    setModalOpen(true)
  }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/admin/settings/manager/${editing.id}`, { name: form.name, role: form.role, store_id: form.store_id || null })
        toast.success('User updated')
      } else {
        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
          toast.error('Name, email, and password are required')
          setSaving(false)
          return
        }
        await api.post('/admin/settings/manager', { ...form, store_id: form.store_id || undefined })
        toast.success('Admin user created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDeactivate() {
    try {
      await api.delete(`/admin/settings/manager/${deleteTarget.id}`)
      toast.success(`"${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate user')
    }
  }

  return (
    <div className="container-fluid">
      <SettingsTabs />

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-4 align-items-center justify-content-between">
          <div>
            <h5 className="card-title mb-1">Admin & Staff Accounts</h5>
            <p className="text-muted mb-0" style={{ fontSize: 12 }}>Manage who can sign in to this admin panel and what they can do.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdd}><i className="ri-add-line me-1"></i>Add User</button>
        </div>
        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Name</th>
                  <th className="fw-medium text-muted">Email</th>
                  <th className="fw-medium text-muted">Role</th>
                  <th className="fw-medium text-muted">Store</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Last Login</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">Loading users…</td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">No admin users found.</td></tr>
                )}
                {!loading && users.map(u => (
                  <tr key={u.id}>
                    <td className="fw-medium">{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge bg-primary-subtle text-primary">{ROLE_LABEL[u.role] || u.role}</span></td>
                    <td>{u.store_name || '—'}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sub-secondary size-8 btn-icon" onClick={() => openEdit(u)}><i className="ri-edit-line"></i></button>
                        {u.id !== currentUser?.id && u.status === 'active' && (
                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" onClick={() => setDeleteTarget(u)}><i className="ri-delete-bin-line"></i></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <h6 className="mb-0">{editing ? 'Edit User' : 'Add Admin User'}</h6>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-12">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" value={form.name} onChange={e => fld('name', e.target.value)} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email} disabled={!!editing}
                      onChange={e => fld('email', e.target.value)} required />
                  </div>
                  {!editing && (
                    <div className="col-12">
                      <label className="form-label">Password</label>
                      <input type="password" className="form-control" value={form.password} onChange={e => fld('password', e.target.value)} required minLength={6} />
                    </div>
                  )}
                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => fld('role', e.target.value)}>
                      {(editing ? EDIT_ROLES : CREATE_ROLES).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Store</label>
                    <select className="form-select" value={form.store_id} onChange={e => fld('store_id', e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 p-4 pt-0">
                <button type="button" className="btn btn-light w-100" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create User')}</button>
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
              <h5 className="mb-1">Deactivate {deleteTarget.name}?</h5>
              <p className="text-muted mb-4" style={{ fontSize: 13 }}>They will no longer be able to sign in to the admin panel.</p>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light w-100" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger w-100" onClick={confirmDeactivate}>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
