import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STATUS_CFG = {
  open:     { label: 'Open',     cls: 'bg-success-subtle text-success border border-success-subtle' },
  closed:   { label: 'Closed',   cls: 'bg-warning-subtle text-warning border border-warning-subtle' },
  inactive: { label: 'Inactive', cls: 'bg-danger-subtle text-danger border border-danger-subtle' },
}
const TYPE_LABEL = {
  retail: 'Retail', franchise: 'Franchise', warehouse: 'Warehouse', farm_outlet: 'Farm Outlet',
}

export default function StoreList() {
  const navigate = useNavigate()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/stores', { params: { search: search || undefined, limit: 100 } })
      setStores(res.data.stores || [])
    } catch {
      toast.error('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const totals = {
    total: stores.length,
    active: stores.filter(s => s.status === 'open').length,
    inactive: stores.filter(s => s.status !== 'open').length,
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/stores/${deleteTarget.id}`)
      toast.success(`"${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate store')
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Store List</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/stores">Stores</Link></li>
          <li className="breadcrumb-item active">Store List</li>
        </ul>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Total Stores',    value: totals.total,    icon: 'ri-store-2-line',          color: '#405189' },
          { label: 'Active Stores',   value: totals.active,   icon: 'ri-checkbox-circle-line',  color: '#0ab39c' },
          { label: 'Inactive Stores', value: totals.inactive, icon: 'ri-close-circle-line',     color: '#f06548' },
        ].map(c => (
          <div className="col-6 col-md-4" key={c.label}>
            <div className="card mb-0" style={{ borderLeft: `3px solid ${c.color}` }}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: `${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color: c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
          <h5 className="card-title mb-1">Store List</h5>
          <div className="d-flex flex-wrap gap-2 align-items-center gap-2">
            <div className="position-relative">
              <input type="text" className="form-control ps-10" placeholder="Search store..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
            </div>
            <Link to="/stores/add" className="btn btn-primary"><i className="ri-add-line me-1"></i>Add Store</Link>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Store Code</th>
                  <th className="fw-medium text-muted">Store Name</th>
                  <th className="fw-medium text-muted">Location</th>
                  <th className="fw-medium text-muted">Manager</th>
                  <th className="fw-medium text-muted">Email</th>
                  <th className="fw-medium text-muted">Phone</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Store Type</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">Loading stores…</td></tr>
                )}
                {!loading && stores.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">
                    <i className="ri-store-2-line fs-2 d-block mb-2"></i>No stores yet. Click "Add Store" to create one.
                  </td></tr>
                )}
                {!loading && stores.map(s => {
                  const sc = STATUS_CFG[s.status] || STATUS_CFG.inactive
                  return (
                    <tr key={s.id}>
                      <td><span className="link link-custom-primary">{s.code}</span></td>
                      <td>{s.name}</td>
                      <td>{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>{s.manager_name || <span className="text-muted">Unassigned</span>}</td>
                      <td>{s.email ? <a href={`mailto:${s.email}`} className="link link-custom-primary">{s.email}</a> : '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td>{TYPE_LABEL[s.store_type] || '—'}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" title="Edit"
                            onClick={() => navigate(`/stores/add?edit=${s.id}`)}>
                            <i className="ri-edit-line"></i>
                          </button>
                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" title="Deactivate"
                            onClick={() => setDeleteTarget(s)}>
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && stores.length > 0 && (
            <div className="text-muted mt-3" style={{ fontSize: 13 }}>Showing {stores.length} store{stores.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>

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
              <h5 className="mb-1">Deactivate Store?</h5>
              <p className="text-muted mb-4" style={{ fontSize: 13 }}>{deleteTarget.name} ({deleteTarget.code}) will be marked inactive.</p>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger flex-fill" onClick={confirmDelete}>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
