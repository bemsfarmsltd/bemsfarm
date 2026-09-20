import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import ProductSelect from '../../components/ui/ProductSelect'

const REASONS = ['Spoilage / Rotting', 'Expiry Date Passed', 'Physical Damage', 'Theft', 'Flood / Water Damage', 'Rodent / Pest Damage', 'Incorrect Handling', 'Quality Rejection', 'Miscounted', 'Other']

const REASON_ICON = {
  'Spoilage / Rotting':   'ri-leaf-line',
  'Expiry Date Passed':   'ri-time-line',
  'Physical Damage':      'ri-hammer-line',
  'Theft':                'ri-spy-line',
  'Flood / Water Damage': 'ri-drop-line',
  'Rodent / Pest Damage': 'ri-bug-line',
  'Incorrect Handling':   'ri-error-warning-line',
  'Quality Rejection':    'ri-close-circle-line',
  'Miscounted':           'ri-calculator-line',
}

const STATUS_CFG = {
  pending:  { label: 'Pending',  cls: 'bg-secondary-subtle text-secondary', dot: '#adb5bd' },
  approved: { label: 'Approved', cls: 'bg-danger-subtle text-danger',       dot: '#f06548' },
  rejected: { label: 'Rejected', cls: 'bg-success-subtle text-success',     dot: '#0ab39c' },
}

const MOVE_CFG = {
  stock_in:     { icon: 'ri-arrow-down-circle-line', color: '#0ab39c', label: 'Restock (Inflow)' },
  stock_out:    { icon: 'ri-arrow-up-circle-line',   color: '#f06548', label: 'Stock Out' },
  transfer_in:  { icon: 'ri-exchange-line',          color: '#299cdb', label: 'Transfer In' },
  transfer_out: { icon: 'ri-exchange-line',          color: '#299cdb', label: 'Transfer Out' },
  adjustment:   { icon: 'ri-equalizer-line',         color: '#f7b84b', label: 'Adjustment' },
  lost:         { icon: 'ri-error-warning-line',     color: '#f06548', label: 'Loss Reported' },
}

export default function LostItems() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [investigateItem, setInvestigateItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [trail, setTrail] = useState([])

  const [form, setForm] = useState({
    product_id: '', warehouse_id: '', quantity: 1, reason: REASONS[0], notes: '',
  })

  useEffect(() => {
    async function loadMeta() {
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get('/admin/products', { params: { limit: 150 } }),
          api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
        ])
        if (prodRes.data?.products) setProducts(prodRes.data.products)
        if (whRes.data?.warehouses) setWarehouses(whRes.data.warehouses)
      } catch (err) {
        console.error('Error loading metadata for Lost Items:', err)
      }
    }
    loadMeta()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/lost-items', { params: { limit: 100, search: search.trim() || undefined, status: filterStatus !== 'all' ? filterStatus : undefined } })
      setRecords(res.data.items || [])
    } catch {
      toast.error('Failed to load loss reports')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const stats = useMemo(() => ({
    total:    records.length,
    pending:  records.filter(r => r.status === 'pending').length,
    approved: records.filter(r => r.status === 'approved').length,
    totalVal: records.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.estimated_value || 0), 0),
  }), [records])

  function openAdd() {
    setEditItem(null)
    setForm({ product_id: products[0]?.id ? String(products[0].id) : '', warehouse_id: '', quantity: 1, reason: REASONS[0], notes: '' })
    setActiveModal('form')
  }
  function openEdit(r) {
    setEditItem(r)
    setForm({ product_id: '', warehouse_id: '', quantity: r.quantity, reason: r.reason || REASONS[0], notes: r.notes || '' })
    setActiveModal('form')
  }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  async function openInvestigate(r) {
    setInvestigateItem(r)
    setActiveModal('investigate')
    try {
      const res = await api.get('/admin/inventory/movements', { params: { product_id: r.product_id, limit: 30 } })
      setTrail(res.data.movements || [])
    } catch {
      setTrail([])
    }
  }
  function closeModal() { setActiveModal(null); setEditItem(null); setInvestigateItem(null); setTrail([]) }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await api.patch(`/admin/inventory/lost-items/${editItem.id}`, {
          quantity: form.quantity, reason: form.reason, notes: form.notes,
        })
        toast.success('Report updated')
      } else {
        if (!form.product_id) { toast.error('Select a product'); setSaving(false); return }
        await api.post('/admin/inventory/lost-items', {
          product_id: parseInt(form.product_id),
          warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : undefined,
          quantity: parseInt(form.quantity),
          reason: form.reason,
          notes: form.notes || undefined,
        })
        toast.success('Loss reported — stock deducted')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/inventory/lost-items/${editItem.id}`)
      toast.success('Report deleted')
      closeModal()
      load()
    } catch {
      toast.error('Failed to delete report')
    }
  }

  async function resolveReport(action) {
    try {
      await api.patch(`/admin/inventory/lost-items/${investigateItem.id}/approve`, { action })
      toast.success(action === 'approve' ? 'Loss confirmed' : 'Report rejected')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report')
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Lost &amp; Damaged Items</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
          <li className="breadcrumb-item active">Lost &amp; Damaged</li>
        </ul>
      </div>

      {stats.pending > 0 && (
        <div className="alert border-0 mb-4 d-flex align-items-center gap-2" style={{ background: '#fff8ec', borderLeft: '3px solid #f7b84b' }}>
          <i className="ri-time-line fs-18 text-warning"></i>
          <span><strong>{stats.pending} report{stats.pending > 1 ? 's' : ''}</strong> waiting for review.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Loss Reports',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-file-damage-line',
            filter: 'all',
            subLeft: 'Incident Logs',
            subRight: `${stats.total} Reports`
          },
          {
            label: 'Pending Review',
            value: stats.pending,
            glow: stats.pending > 0 ? 'bg-card-glow-amber' : 'bg-card-glow-teal',
            iconBg: stats.pending > 0 ? '#FEF3C7' : '#F0FDFA',
            iconColor: stats.pending > 0 ? '#D97706' : '#0D9488',
            icon: 'ri-time-line',
            filter: 'pending',
            subLeft: 'Awaiting Sign-off',
            subRight: stats.pending > 0 ? `${stats.pending} Action Needed` : 'All Reviewed'
          },
          {
            label: 'Approved Write-offs',
            value: stats.approved,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-checkbox-circle-line',
            filter: 'approved',
            subLeft: 'Written Off',
            subRight: `${stats.approved} Logged`
          },
          {
            label: 'Confirmed Value Lost',
            value: `₦${stats.totalVal.toLocaleString()}`,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-money-dollar-circle-line',
            filter: 'approved',
            subLeft: 'Wastage Outlay',
            subRight: 'Gross Loss'
          },
        ].map(c => (
          <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow} cursor-pointer`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilterStatus(c.filter)}
            >
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-24 fw-bolder text-dark mb-1 font-display">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search product, reason, ref…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth: 240 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Records</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Report Loss
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">ID</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Qty Lost</th>
                  <th className="fw-medium text-muted">Est. Value</th>
                  <th className="fw-medium text-muted">Reason</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Reported By</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">Loading loss reports…</td></tr>
                )}
                {!loading && records.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-file-damage-line fs-2 d-block mb-2"></i>No loss reports found
                  </td></tr>
                )}
                {!loading && records.map(r => {
                  const sc   = STATUS_CFG[r.status] || STATUS_CFG.pending
                  const icon = REASON_ICON[r.reason] || 'ri-error-warning-line'
                  return (
                    <tr key={r.id} style={{ borderLeft: `3px solid ${sc.dot}` }}>
                      <td>
                        <button className="btn btn-link p-0 fw-medium text-danger text-decoration-none" onClick={() => openInvestigate(r)}>
                          LST-{String(r.id).padStart(4, '0')}
                        </button>
                      </td>
                      <td>{r.created_at ? r.created_at.slice(0, 10) : '—'}</td>
                      <td>
                        <div className="fw-medium">{r.product_name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{r.category_name}</div>
                      </td>
                      <td className="fw-bold text-danger">{r.quantity}</td>
                      <td className="fw-bold text-danger">₦{Number(r.estimated_value || 0).toLocaleString()}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                          <i className={`${icon} text-muted`}></i>
                          <span style={{ maxWidth: 130, whiteSpace: 'normal' }}>{r.reason}</span>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse_name || '—'}</span></td>
                      <td style={{ fontSize: 12, color: '#6c757d' }}>{r.reported_by_name || '—'}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-soft-info p-1 px-2" onClick={() => openInvestigate(r)} title="Review"><i className="ri-search-eye-line"></i></button>
                          {r.status === 'pending' && (
                            <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openEdit(r)} title="Edit"><i className="ri-pencil-line"></i></button>
                          )}
                          <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => openDelete(r)} title="Delete"><i className="ri-delete-bin-line"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize: 13 }}>Showing {records.length} records</div>
        </div>
      </div>

      {/* ── REVIEW MODAL ─────────────────────────────────── */}
      {activeModal === 'investigate' && investigateItem && (() => {
        const r = investigateItem
        const sc = STATUS_CFG[r.status] || STATUS_CFG.pending
        const icon = REASON_ICON[r.reason] || 'ri-error-warning-line'
        return (
          <>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
              <div className="modal-dialog modal-dialog-centered modal-xl">
                <div className="modal-content">
                  <div className="modal-header" style={{ background: '#f8f9fa' }}>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="ri-search-eye-line fs-18 text-info"></i>
                        <h6 className="modal-title mb-0 fw-bold">Loss Report — LST-{String(r.id).padStart(4, '0')}</h6>
                        <span className={`badge ${sc.cls} ms-1`}>{sc.label}</span>
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        Reported {r.created_at ? r.created_at.slice(0, 10) : '—'} by <strong>{r.reported_by_name || '—'}</strong> · {r.warehouse_name || '—'}
                      </div>
                    </div>
                    <button className="btn-close" onClick={closeModal}></button>
                  </div>

                  <div className="modal-body p-0">
                    <div className="row g-0" style={{ minHeight: 420 }}>
                      <div className="col-lg-7 p-4 border-end">
                        <div className="card mb-4" style={{ background: '#fff8ec', border: '1px solid #f7b84b33' }}>
                          <div className="card-body py-3">
                            <div className="d-flex align-items-start gap-3">
                              <div className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 44, height: 44, background: '#f7b84b22' }}>
                                <i className={`${icon} fs-20 text-warning`}></i>
                              </div>
                              <div className="flex-grow-1">
                                <div className="fw-bold fs-15">{r.product_name}</div>
                                <div className="text-muted mb-2" style={{ fontSize: 12 }}>{r.category_name} · {r.warehouse_name || '—'}</div>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <div style={{ fontSize: 11, color: '#adb5bd' }}>QTY LOST</div>
                                    <div className="fw-bold text-danger">{r.quantity}</div>
                                  </div>
                                  <div className="col-6">
                                    <div style={{ fontSize: 11, color: '#adb5bd' }}>ESTIMATED VALUE</div>
                                    <div className="fw-bold text-danger">₦{Number(r.estimated_value || 0).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                              <i className={`${icon} text-warning`}></i>
                              <span className="fw-medium">Reason:</span>
                              <span>{r.reason}</span>
                            </div>
                            {r.notes && (
                              <div className="mt-2 pt-2 border-top" style={{ fontSize: 12, color: '#6c757d' }}>{r.notes}</div>
                            )}
                          </div>
                        </div>

                        {r.status === 'pending' && (
                          <div className="p-3 rounded" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                            <div className="fw-medium mb-2" style={{ fontSize: 13 }}>Resolution</div>
                            <div className="d-flex gap-2 flex-wrap">
                              <button className="btn btn-sm btn-danger d-flex align-items-center gap-1" onClick={() => resolveReport('approve')}>
                                <i className="ri-checkbox-circle-line"></i> Confirm Loss
                              </button>
                              <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={() => resolveReport('reject')}>
                                <i className="ri-close-circle-line"></i> Reject Report
                              </button>
                            </div>
                            <div className="text-muted mt-2" style={{ fontSize: 11 }}>
                              <i className="ri-information-line me-1"></i>Stock was already deducted when this report was filed. Confirming or rejecting only updates the audit status.
                            </div>
                          </div>
                        )}

                        {(r.status === 'approved' || r.status === 'rejected') && (
                          <div className={`p-3 rounded d-flex align-items-center gap-2 ${r.status === 'approved' ? 'bg-danger-subtle' : 'bg-success-subtle'}`}>
                            <i className={`fs-18 ${r.status === 'approved' ? 'ri-checkbox-circle-line text-danger' : 'ri-close-circle-line text-success'}`}></i>
                            <span style={{ fontSize: 13 }}>
                              Case <strong>{r.status === 'approved' ? 'confirmed as a loss' : 'rejected'}</strong>
                              {r.approved_by_name ? ` by ${r.approved_by_name}` : ''}.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── RIGHT: real goods movement trail from stock_movements ── */}
                      <div className="col-lg-5 d-flex flex-column" style={{ background: '#fafbfc' }}>
                        <div className="p-3 border-bottom" style={{ background: '#f0f3f9', fontSize: 12, fontWeight: 600 }}>
                          <i className="ri-route-line me-1"></i> Goods Movement Trail — {r.product_name}
                        </div>
                        <div className="p-4 flex-grow-1 overflow-auto" style={{ maxHeight: 420 }}>
                          {trail.length === 0 && (
                            <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>
                              <i className="ri-route-line fs-2 d-block mb-2"></i>No movement history for this product yet.
                            </div>
                          )}
                          <div className="position-relative">
                            {trail.length > 1 && (
                              <div style={{ position: 'absolute', left: 19, top: 24, bottom: 24, width: 2, background: '#dee2e6', zIndex: 0 }}></div>
                            )}
                            {trail.map((mv) => {
                              const cfg = MOVE_CFG[mv.type] || MOVE_CFG.adjustment
                              return (
                                <div key={mv.id} className="d-flex gap-3 mb-4 position-relative" style={{ zIndex: 1 }}>
                                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{ width: 38, height: 38, background: cfg.color + '22', border: `2px solid ${cfg.color}` }}>
                                    <i className={`${cfg.icon} fs-15`} style={{ color: cfg.color }}></i>
                                  </div>
                                  <div className="flex-grow-1 pt-1">
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                      <div className="fw-medium" style={{ fontSize: 13 }}>{cfg.label}</div>
                                      <span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>
                                        {mv.before_qty} → {mv.after_qty}
                                      </span>
                                    </div>
                                    {mv.reason && <div className="text-muted mt-1" style={{ fontSize: 12 }}>{mv.reason}</div>}
                                    <div className="d-flex flex-wrap gap-1 mt-1" style={{ fontSize: 11, color: '#adb5bd', columnGap: 12 }}>
                                      <span><i className="ri-user-line me-1"></i>{mv.created_by_name || 'Staff'}</span>
                                      <span>·</span>
                                      <span><i className="ri-calendar-line me-1"></i>{mv.created_at ? mv.created_at.slice(0, 10) : '—'}</span>
                                      {mv.warehouse_name && <><span>·</span><span><i className="ri-map-pin-line me-1"></i>{mv.warehouse_name}</span></>}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-light" onClick={closeModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}></div>
          </>
        )
      })()}

      {/* ── REPORT FORM MODAL ─────────────────────────────── */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Loss Report' : 'Report Lost / Damaged Item'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      {!editItem && (
                        <>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">Product <span className="text-danger">*</span></label>
                            <ProductSelect
                              products={products}
                              value={form.product_id}
                              onChange={(selectedId) => setForm(f => ({ ...f, product_id: selectedId }))}
                              placeholder="Type name, scan barcode, or select..."
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">Warehouse</label>
                            <select className="form-select" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                              <option value="">— Select —</option>
                              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Qty Lost <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" min="1" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Reason <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                          {REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Notes</label>
                        <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe what happened…" />
                      </div>
                    </div>
                    {!editItem && (
                      <div className="p-3 rounded mt-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 13 }}>
                        <i className="ri-information-line text-info me-1"></i>
                        Submitting deducts this quantity from stock immediately. Use <strong>Review</strong> afterward to confirm or reject the report.
                      </div>
                    )}
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-danger w-100" disabled={saving}>
                        {saving ? 'Saving…' : (editItem ? 'Save Changes' : 'Submit Report')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────── */}
      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"></i>
                  </div>
                </div>
                <h6 className="mb-1">Delete Report?</h6>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>LST-{String(editItem?.id).padStart(4, '0')} — {editItem?.product_name}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={closeModal}></div>
        </>
      )}
    </div>
  )
}
