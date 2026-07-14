import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', company: '', email: '', phone: '', address: '', city: '', state: '',
  contact_person: '', category: '', payment_terms: '', credit_limit: '', notes: '', status: 'active',
}

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

function StatusBadge({ status }) {
  if (status === 'active')
    return <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
  return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span>
}

export default function SuppliersList() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [meta, setMeta] = useState({ total: 0, pages: 1 })

  // modals
  const [viewSupplier, setViewSupplier] = useState(null)
  const [viewPayments, setViewPayments] = useState([])
  const [viewPaymentsLoading, setViewPaymentsLoading] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const searchTimer = useRef(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/suppliers', { params: { page, limit: 20, search, status: statusFilter || undefined } })
      setSuppliers(res.data.suppliers)
      setMeta({ total: res.data.total, pages: res.data.pages })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(e.target.value)
      setPage(1)
    }, 400)
  }

  // View supplier + payments
  const openView = async (supplier) => {
    setViewSupplier(supplier)
    setViewPayments([])
    setViewPaymentsLoading(true)
    try {
      const res = await api.get(`/admin/suppliers/${supplier.id}/payments`)
      setViewPayments(res.data.payments || [])
    } catch {
      // non-fatal
    } finally {
      setViewPaymentsLoading(false)
    }
  }

  // Edit
  const openEdit = (supplier) => {
    setEditSupplier(supplier)
    setEditForm({
      name: supplier.name || '',
      company: supplier.company || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      contact_person: supplier.contact_person || '',
      category: supplier.category || '',
      payment_terms: supplier.payment_terms || '',
      credit_limit: supplier.credit_limit || '',
      notes: supplier.notes || '',
      status: supplier.status || 'active',
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/admin/suppliers/${editSupplier.id}`, editForm)
      toast.success('Supplier updated')
      setEditSupplier(null)
      fetchSuppliers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update supplier')
    } finally {
      setSaving(false)
    }
  }

  // Add
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/suppliers', addForm)
      toast.success('Supplier added')
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      setPage(1)
      fetchSuppliers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add supplier')
    } finally {
      setSaving(false)
    }
  }

  // Delete (soft)
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/suppliers/${deleteTarget.id}`)
      toast.success('Supplier deactivated')
      setDeleteTarget(null)
      fetchSuppliers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier')
    } finally {
      setDeleting(false)
    }
  }

  const FormFields = ({ form, setForm }) => (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label">Name <span className="text-danger">*</span></label>
        <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="col-md-6">
        <label className="form-label">Company</label>
        <input className="form-control" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Email</label>
        <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Phone</label>
        <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">City</label>
        <input className="form-control" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">State</label>
        <input className="form-control" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Category</label>
        <input className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Contact Person</label>
        <input className="form-control" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Payment Terms</label>
        <input className="form-control" placeholder="e.g. Net 30" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Credit Limit (₦)</label>
        <input type="number" className="form-control" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Status</label>
        <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label">Address</label>
        <textarea className="form-control" rows="2" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </div>
      <div className="col-12">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>
  )

  const startIdx = (page - 1) * 20 + 1
  const endIdx = Math.min(page * 20, meta.total)

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Suppliers List</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
          <li className="breadcrumb-item active">Suppliers List</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
          <div className="position-relative">
            <input
              type="text"
              className="form-control ps-10"
              placeholder="Search Suppliers..."
              value={searchInput}
              onChange={handleSearchChange}
            />
            <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <select className="form-select w-auto" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM) }}>
              <i data-lucide="plus" className="size-4 me-1"></i>Add Supplier
            </button>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table table-striped-even text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Name</th>
                  <th className="fw-medium text-muted">Company</th>
                  <th className="fw-medium text-muted">Email</th>
                  <th className="fw-medium text-muted">Phone</th>
                  <th className="fw-medium text-muted">City</th>
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Balance Due</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                  </td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-muted py-5">No suppliers found.</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id}>
                    <td className="fw-medium">{s.name}</td>
                    <td>{s.company || '—'}</td>
                    <td>{s.email || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.city || '—'}</td>
                    <td>{s.category || '—'}</td>
                    <td className={Number(s.balance_due) > 0 ? 'text-danger fw-medium' : ''}>{fmt(s.balance_due)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sub-primary size-8 btn-icon" title="View" onClick={() => openView(s)}>
                          <i className="ri-eye-line"></i>
                        </button>
                        <button className="btn btn-sub-secondary size-8 btn-icon" title="Edit" onClick={() => openEdit(s)}>
                          <i className="ri-edit-line"></i>
                        </button>
                        <button className="btn btn-sub-danger size-8 btn-icon" title="Delete" onClick={() => setDeleteTarget(s)}>
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.total > 0 && (
            <div className="row align-items-center g-3 mt-3">
              <div className="col-md-6">
                <p className="text-muted text-center text-md-start mb-0">
                  Showing <b className="me-1">{startIdx}-{endIdx}</b> of <b className="ms-1">{meta.total}</b> Results
                </p>
              </div>
              <div className="col-md-6">
                <nav>
                  <ul className="pagination justify-content-center justify-content-md-end mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                    </li>
                    {Array.from({ length: meta.pages }, (_, i) => i + 1).map(p => (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${page === meta.pages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewSupplier && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Supplier Details — {viewSupplier.name}</h6>
                <button className="btn-close" onClick={() => setViewSupplier(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Company</p><p className="fw-medium">{viewSupplier.company || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Email</p><p className="fw-medium">{viewSupplier.email || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Phone</p><p className="fw-medium">{viewSupplier.phone || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Contact Person</p><p className="fw-medium">{viewSupplier.contact_person || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">City / State</p>
                    <p className="fw-medium">{[viewSupplier.city, viewSupplier.state].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Category</p><p className="fw-medium">{viewSupplier.category || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Payment Terms</p><p className="fw-medium">{viewSupplier.payment_terms || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Credit Limit</p><p className="fw-medium">{fmt(viewSupplier.credit_limit)}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-1 text-muted small">Total Purchased</p><p className="fw-medium">{fmt(viewSupplier.total_purchased)}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-1 text-muted small">Balance Due</p>
                    <p className={`fw-medium ${Number(viewSupplier.balance_due) > 0 ? 'text-danger' : 'text-success'}`}>{fmt(viewSupplier.balance_due)}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-1 text-muted small">Status</p><StatusBadge status={viewSupplier.status} />
                  </div>
                  {viewSupplier.address && (
                    <div className="col-12">
                      <p className="mb-1 text-muted small">Address</p><p className="fw-medium">{viewSupplier.address}</p>
                    </div>
                  )}
                  {viewSupplier.notes && (
                    <div className="col-12">
                      <p className="mb-1 text-muted small">Notes</p><p>{viewSupplier.notes}</p>
                    </div>
                  )}
                </div>

                <h6 className="mb-3">Recent Payments</h6>
                {viewPaymentsLoading ? (
                  <p className="text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading payments...</p>
                ) : viewPayments.length === 0 ? (
                  <p className="text-muted text-center">No payments recorded.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewPayments.map(p => (
                          <tr key={p.id}>
                            <td>{p.date ? new Date(p.date).toLocaleDateString('en-GB') : '—'}</td>
                            <td>{fmt(p.amount)}</td>
                            <td>{p.payment_method || '—'}</td>
                            <td>{p.reference || '—'}</td>
                            <td>{p.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewSupplier(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSupplier && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Edit Supplier</h6>
                <button className="btn-close" onClick={() => setEditSupplier(null)}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <FormFields form={editForm} setForm={setEditForm} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setEditSupplier(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Add Supplier</h6>
                <button className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body">
                  <FormFields form={addForm} setForm={setAddForm} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Adding...</> : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content p-4 text-center">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                  <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                </div>
              </div>
              <h5 className="mb-3 lh-base">Deactivate <strong>{deleteTarget.name}</strong>?</h5>
              <p className="text-muted small mb-4">This will mark the supplier as inactive.</p>
              <div className="d-flex justify-content-center gap-2">
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <span className="spinner-border spinner-border-sm" /> : 'Deactivate'}
                </button>
                <button className="btn btn-link text-reset" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
