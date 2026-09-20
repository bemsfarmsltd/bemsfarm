import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

function daysToExpiry(expDate) {
  if (!expDate) return null
  const d = new Date(expDate)
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.ceil((d - today) / 86400000)
}

function getBatchStatus(status, expDate, qty) {
  if (status === 'recalled') return 'recalled'
  if (qty === 0) return 'exhausted'
  const days = daysToExpiry(expDate)
  if (days !== null && days < 0)  return 'expired'
  if (days !== null && days <= 7) return 'expiring_soon'
  return 'active'
}

const STATUS_CFG = {
  active:        { label:'Active Fresh',   cls:'bg-success-subtle text-success', icon:'ri-checkbox-circle-line' },
  expiring_soon: { label:'Expiring Soon',  cls:'bg-warning-subtle text-warning', icon:'ri-alarm-warning-line'   },
  expired:       { label:'Expired',        cls:'bg-danger-subtle text-danger',   icon:'ri-close-circle-line'    },
  exhausted:     { label:'Exhausted',      cls:'bg-secondary-subtle text-secondary', icon:'ri-archive-line'     },
  recalled:      { label:'Recalled',       cls:'bg-danger-subtle text-danger',   icon:'ri-forbid-line'          },
}

export default function BatchManagement() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [saving, setSaving] = useState(false)

  // Consignment action states
  const [actionQuantity, setActionQuantity] = useState(1)
  const [actionTargetWarehouse, setActionTargetWarehouse] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [editForm, setEditForm] = useState({ expiry_date: '', quantity: 0, notes: '' })

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const whRes = await api.get('/admin/inventory/warehouses').catch(() => ({ data: { warehouses: [] } }))
        if (whRes.data?.warehouses) setWarehouses(whRes.data.warehouses)
      } catch (err) {
        console.error('Error loading warehouses:', err)
      }
    }
    loadWarehouses()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/batches', { params: { limit: 250 } })
      setRecords(res.data.batches || [])
    } catch {
      toast.error('Failed to load batches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const enriched = useMemo(() => records.map(r => ({ ...r, computedStatus: getBatchStatus(r.status, r.expiry_date, r.quantity) })), [records])

  const filtered = useMemo(() => enriched.filter(r => {
    const q = search.toLowerCase()
    const m = (r.batch_no || '').toLowerCase().includes(q) || (r.product_name || '').toLowerCase().includes(q) || (r.warehouse_name || '').toLowerCase().includes(q)
    return m && (filterStatus === 'all' || r.computedStatus === filterStatus)
  }), [enriched, search, filterStatus])

  const stats = useMemo(() => ({
    total:    enriched.length,
    active:   enriched.filter(r => r.computedStatus === 'active').length,
    expiring: enriched.filter(r => r.computedStatus === 'expiring_soon').length,
    expired:  enriched.filter(r => r.computedStatus === 'expired' || r.computedStatus === 'exhausted').length,
  }), [enriched])

  function openInspect(r) {
    setSelectedBatch(r)
    setActionQuantity(r.quantity > 0 ? Math.min(r.quantity, 10) : 0)
    setActionTargetWarehouse(warehouses.find(w => w.id !== r.warehouse_id)?.id || '')
    setActionReason('Damaged / spoiled produce write-off')
    setActionNotes('')
    setEditForm({
      expiry_date: r.expiry_date ? r.expiry_date.slice(0, 10) : '',
      quantity: r.quantity,
      notes: r.notes || '',
    })
    setActiveModal('inspect')
  }

  function closeModal() {
    setActiveModal(null)
    setSelectedBatch(null)
    setSaving(false)
  }

  async function handleRouteKitchen() {
    if (!selectedBatch) return
    if (actionQuantity <= 0 || actionQuantity > selectedBatch.quantity) {
      toast.error(`Please select a valid quantity (1 to ${selectedBatch.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedBatch.id}/route-kitchen`, {
        quantity: actionQuantity,
        notes: actionNotes || 'Routed to Chef Bems Kitchen',
      })
      toast.success(res.data.message || 'Dispatched to Chef Bems Kitchen')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch to kitchen')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransferWarehouse() {
    if (!selectedBatch) return
    if (!actionTargetWarehouse) {
      toast.error('Please select destination warehouse')
      return
    }
    if (actionQuantity <= 0 || actionQuantity > selectedBatch.quantity) {
      toast.error(`Please select a valid transfer quantity (1 to ${selectedBatch.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedBatch.id}/transfer`, {
        target_warehouse_id: parseInt(actionTargetWarehouse),
        quantity: actionQuantity,
        notes: actionNotes,
      })
      toast.success(res.data.message || 'Batch stock transferred')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer batch stock')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogDamage() {
    if (!selectedBatch) return
    if (actionQuantity <= 0 || actionQuantity > selectedBatch.quantity) {
      toast.error(`Please select a valid quantity (1 to ${selectedBatch.quantity})`)
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/admin/inventory/batches/${selectedBatch.id}/log-damage`, {
        quantity: actionQuantity,
        reason: actionReason || 'Damaged / expired produce',
        notes: actionNotes,
      })
      toast.success(res.data.message || 'Batch stock written-off to loss registry')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log damage')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!selectedBatch) return
    setSaving(true)
    try {
      await api.patch(`/admin/inventory/batches/${selectedBatch.id}`, {
        quantity: parseInt(editForm.quantity) || 0,
        expiry_date: editForm.expiry_date || undefined,
        notes: editForm.notes,
      })
      toast.success('Batch updated')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update batch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <i className="ri-archive-stack-line text-success"></i>
            Batches &amp; Expiry Tracker
          </h4>
          <p className="text-muted mb-0 fs-13">
            All uploaded items and restocked farm harvests are automatically recorded here with intake dates, remaining shelf-life, and direct kitchen dispatch.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/inventory/stock-in" className="btn btn-outline-success btn-sm rounded-pill px-3">
            <i className="ri-add-circle-line me-1"></i> Restock Products
          </Link>
          <button 
            className="btn btn-light btn-sm rounded-pill px-3 border shadow-sm"
            onClick={load}
            title="Refresh batches list"
          >
            <i className="ri-refresh-line me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Near-Expiry Urgency Alert */}
      {stats.expiring > 0 && (
        <div className="alert border-0 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm" style={{ background:'#fff8ec', color:'#8a5a00', borderLeft:'5px solid #f7b84b' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="ri-alarm-warning-fill fs-22 text-warning"></i>
            <div>
              <strong className="fs-14">{stats.expiring} Batch{stats.expiring > 1 ? 'es' : ''} Expiring Within 7 Days!</strong>
              <div className="fs-12 text-muted">Prioritize dispatching these lots to <strong>Chef Bems Kitchen</strong> or mark down prices to avoid farm produce spoilage.</div>
            </div>
          </div>
          <button 
            className="btn btn-sm btn-warning text-dark fw-bold px-3 rounded-pill"
            onClick={() => setFilterStatus('expiring_soon')}
          >
            Inspect Expiring Lots
          </button>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Batches',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-archive-stack-line',
            filter: 'all',
            subLeft: 'Lot Registry',
            subRight: `${stats.total} Batches`
          },
          {
            label: 'Active Fresh Lots',
            value: stats.active,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            filter: 'active',
            subLeft: 'Usable & In-Stock',
            subRight: `${stats.active} Valid`
          },
          {
            label: 'Expiring Soon (≤ 7d)',
            value: stats.expiring,
            glow: stats.expiring > 0 ? 'bg-card-glow-amber' : 'bg-card-glow-teal',
            iconBg: stats.expiring > 0 ? '#FEF3C7' : '#F0FDFA',
            iconColor: stats.expiring > 0 ? '#D97706' : '#0D9488',
            icon: 'ri-alarm-warning-line',
            filter: 'expiring_soon',
            subLeft: 'FIFO Priority',
            subRight: stats.expiring > 0 ? `${stats.expiring} Near Expiry` : 'Fresh Produce'
          },
          {
            label: 'Exhausted Lots',
            value: stats.expired,
            glow: stats.expired > 0 ? 'bg-card-glow-red' : 'bg-card-glow-slate',
            iconBg: stats.expired > 0 ? '#FFF1F2' : '#F8FAFC',
            iconColor: stats.expired > 0 ? '#E11D48' : '#64748B',
            icon: 'ri-archive-line',
            filter: 'expired',
            subLeft: 'Archived Batches',
            subRight: `${stats.expired} Closed`
          },
        ].map(c => (
          <div className="col-12 col-sm-6 col-xl-3" key={c.label}>
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow} cursor-pointer transition-all ${filterStatus === c.filter ? 'border-primary border-2' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilterStatus(c.filter)}
            >
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill p-2 rounded-circle" style={{ background: c.iconBg, color: c.iconColor }}>
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

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input 
              className="form-control ps-5 rounded-pill" 
              placeholder="Search batch no, produce name, warehouse…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ minWidth: 280, fontSize: 13 }} 
            />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap align-items-center">
            <select 
              className="form-select rounded-pill fs-13" 
              style={{ width:'auto' }} 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Batches ({enriched.length})</option>
              <option value="active">Active Fresh ({stats.active})</option>
              <option value="expiring_soon">Expiring Soon ({stats.expiring})</option>
              <option value="expired">Exhausted ({stats.expired})</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0 table-hover">
              <thead className="bg-light">
                <tr className="text-uppercase fs-11 text-muted border-bottom">
                  <th className="ps-4">Batch / Lot No</th>
                  <th>Produce &amp; Product</th>
                  <th>Intake / Mfg Date</th>
                  <th>Expiry Date</th>
                  <th>Shelf Life</th>
                  <th>Lot Quantity</th>
                  <th>Warehouse / Store</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                      Loading farm batch records…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="py-4">
                        <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                          <i className="ri-archive-stack-line fs-1 text-muted"></i>
                        </div>
                        <h6 className="fw-bold mb-1">No Batches Found</h6>
                        <p className="text-muted mx-auto mb-4" style={{ maxWidth: 520, fontSize: 13 }}>
                          Whenever you add or restock items, they are automatically tracked as batches.
                        </p>
                        <div className="d-flex justify-content-center gap-2">
                          <Link to="/inventory/stock-in" className="btn btn-success btn-sm rounded-pill px-3">
                            <i className="ri-add-circle-line me-1"></i> Restock Products
                          </Link>
                          <Link to="/products" className="btn btn-outline-primary btn-sm rounded-pill px-3">
                            <i className="ri-store-2-line me-1"></i> View Catalog
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.map(r => {
                  const sc   = STATUS_CFG[r.computedStatus] || STATUS_CFG.active
                  const days = daysToExpiry(r.expiry_date)
                  const daysColor = days === null ? '#adb5bd' : days < 0 ? '#f06548' : days <= 7 ? '#f7b84b' : '#0ab39c'
                  
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => openInspect(r)}>
                      <td className="ps-4">
                        <span className="badge bg-light text-primary font-monospace fs-12 border px-2 py-1">
                          {r.batch_no}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {r.product_image ? (
                            <img src={r.product_image} alt="" className="rounded-circle object-fit-cover" style={{ width: 32, height: 32 }} />
                          ) : (
                            <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                              <i className="ri-plant-line"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-dark fs-13">{r.product_name || `Product #${r.product_id}`}</div>
                            <div className="text-muted fs-11">{r.sku || `ID: ${r.product_id}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted fs-12">{r.manufactured_date ? r.manufactured_date.slice(0,10) : '—'}</td>
                      <td className="fs-12 fw-medium text-dark">{r.expiry_date ? r.expiry_date.slice(0,10) : '—'}</td>
                      <td>
                        <span className="fw-bold fs-12 px-2 py-0.5 rounded" style={{ color: daysColor, background: `${daysColor}15` }}>
                          {days === null ? '—' : days < 0 ? `${Math.abs(days)}d expired` : days === 0 ? 'Expires Today!' : `${days} days left`}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="fw-bold fs-13 text-dark">{r.quantity}</span>
                          <span className="text-muted fs-11">units</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border px-2.5 py-1 fs-12">
                          <i className="ri-store-2-line text-muted me-1"></i>
                          {r.warehouse_name || 'Central Store'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sc.cls} px-2.5 py-1 fs-12`}>
                          <i className={`${sc.icon} me-1`}></i>{sc.label}
                        </span>
                      </td>
                      <td className="text-end pe-4" onClick={e => e.stopPropagation()}>
                        <button 
                          className="btn btn-sm btn-soft-success d-flex align-items-center gap-1 px-2.5 py-1 rounded-pill fs-12 ms-auto"
                          onClick={() => openInspect(r)}
                          title="Inspect consignment and execute kitchen dispatch or transfer"
                        >
                          <i className="ri-flashlight-line"></i> Actions
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center text-muted fs-13">
            <span>Showing <strong>{filtered.length}</strong> of <strong>{records.length}</strong> batches</span>
            <span>Click any batch to inspect produce consignment &amp; execute operations</span>
          </div>
        </div>
      </div>

      {/* ── BATCH INSPECT & RAPID OPERATIONS MODAL ───────────────────────── */}
      {activeModal === 'inspect' && selectedBatch && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                {/* Header */}
                <div className="modal-header bg-dark text-white p-3.5">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                      <i className="ri-archive-stack-fill fs-20"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        Batch {selectedBatch.batch_no}
                      </h5>
                      <span className="text-white-50 fs-12">
                        {selectedBatch.product_name} • Storage: {selectedBatch.warehouse_name || 'Central Store'}
                      </span>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white" onClick={closeModal}></button>
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4">
                  {/* Produce Overview Card */}
                  <div className="card bg-light border-0 rounded-3 p-3 mb-4">
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Produce Item</div>
                        <div className="fw-bold fs-14 text-dark text-truncate">{selectedBatch.product_name}</div>
                        <div className="text-muted fs-12 font-monospace">{selectedBatch.sku}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Available in Lot</div>
                        <div className="fw-bold fs-15 text-success">{selectedBatch.quantity} Units</div>
                        <div className="text-muted fs-12">Total Stock: {selectedBatch.current_stock ?? selectedBatch.quantity}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Intake Date</div>
                        <div className="fw-bold fs-13 text-dark">{selectedBatch.manufactured_date ? selectedBatch.manufactured_date.slice(0,10) : '—'}</div>
                        <div className="text-muted fs-12">Received at Hub</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted fs-11 text-uppercase fw-semibold">Expiry Date</div>
                        <div className="fw-bold fs-13 text-danger">{selectedBatch.expiry_date ? selectedBatch.expiry_date.slice(0,10) : '—'}</div>
                        <div className="fs-12 fw-semibold text-warning">
                          {daysToExpiry(selectedBatch.expiry_date) !== null ? `${daysToExpiry(selectedBatch.expiry_date)} days remaining` : 'Fresh produce'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Consignment Operations */}
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="ri-flashlight-fill text-warning"></i> Produce Consignment Actions
                  </h6>

                  <div className="row g-3">
                    {/* Action 1: Route to Chef Bems Kitchen */}
                    <div className="col-md-6">
                      <div className="card h-100 border border-success-subtle rounded-3 p-3 bg-success-subtle bg-opacity-25">
                        <div className="d-flex align-items-center gap-2 mb-2 text-success fw-bold">
                          <i className="ri-restaurant-2-line fs-18"></i>
                          <span>Route to Chef Bems Kitchen</span>
                        </div>
                        <p className="text-muted fs-12 mb-3">
                          Dispatch farm produce to the kitchen for meal prep or processing before expiration.
                        </p>
                        <div className="mb-2">
                          <label className="form-label fs-12 fw-semibold mb-1">Quantity to Kitchen (Max {selectedBatch.quantity})</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            min="1" 
                            max={selectedBatch.quantity} 
                            value={actionQuantity} 
                            onChange={e => setActionQuantity(Math.max(1, Math.min(selectedBatch.quantity, parseInt(e.target.value) || 1)))} 
                          />
                        </div>
                        <div className="mb-3">
                          <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Optional prep note (e.g. Lunch soup batch)" 
                            value={actionNotes} 
                            onChange={e => setActionNotes(e.target.value)} 
                          />
                        </div>
                        <button 
                          className="btn btn-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-pill"
                          onClick={handleRouteKitchen}
                          disabled={saving || selectedBatch.quantity <= 0}
                        >
                          <i className="ri-send-plane-fill"></i> Dispatch {actionQuantity} to Kitchen
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Inter-Warehouse Transfer */}
                    <div className="col-md-6">
                      <div className="card h-100 border border-primary-subtle rounded-3 p-3 bg-primary-subtle bg-opacity-25">
                        <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                          <i className="ri-exchange-line fs-18"></i>
                          <span>Inter-Warehouse Transfer</span>
                        </div>
                        <p className="text-muted fs-12 mb-3">
                          Relocate this consignment lot to another cold storage or distribution depot.
                        </p>
                        <div className="mb-2">
                          <label className="form-label fs-12 fw-semibold mb-1">Destination Warehouse</label>
                          <select 
                            className="form-select form-select-sm" 
                            value={actionTargetWarehouse} 
                            onChange={e => setActionTargetWarehouse(e.target.value)}
                          >
                            <option value="">— Select Warehouse —</option>
                            {warehouses.filter(w => w.id !== selectedBatch.warehouse_id).map(w => (
                              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fs-12 fw-semibold mb-1">Transfer Units</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            min="1" 
                            max={selectedBatch.quantity} 
                            value={actionQuantity} 
                            onChange={e => setActionQuantity(Math.max(1, Math.min(selectedBatch.quantity, parseInt(e.target.value) || 1)))} 
                          />
                        </div>
                        <button 
                          className="btn btn-primary btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-pill"
                          onClick={handleTransferWarehouse}
                          disabled={saving || selectedBatch.quantity <= 0 || !actionTargetWarehouse}
                        >
                          <i className="ri-truck-line"></i> Transfer Stock
                        </button>
                      </div>
                    </div>

                    {/* Action 3: Write-Off Damaged / Expired */}
                    <div className="col-12">
                      <div className="card border border-danger-subtle rounded-3 p-3 bg-danger-subtle bg-opacity-20">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2 text-danger fw-bold">
                            <i className="ri-close-circle-line fs-18"></i>
                            <span>Write-Off Damaged or Expired Produce</span>
                          </div>
                          <span className="fs-12 text-muted">Transfers directly to Lost &amp; Damaged Ledger</span>
                        </div>
                        <div className="row g-2 align-items-center">
                          <div className="col-md-5">
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              placeholder="Reason (e.g. Transit bruise, overripe)" 
                              value={actionReason} 
                              onChange={e => setActionReason(e.target.value)} 
                            />
                          </div>
                          <div className="col-md-3">
                            <input 
                              type="number" 
                              className="form-control form-control-sm" 
                              placeholder="Write-off Qty" 
                              min="1" 
                              max={selectedBatch.quantity} 
                              value={actionQuantity} 
                              onChange={e => setActionQuantity(Math.max(1, Math.min(selectedBatch.quantity, parseInt(e.target.value) || 1)))} 
                            />
                          </div>
                          <div className="col-md-4">
                            <button 
                              className="btn btn-danger btn-sm w-100 fw-semibold rounded-pill"
                              onClick={handleLogDamage}
                              disabled={saving || selectedBatch.quantity <= 0}
                            >
                              <i className="ri-delete-bin-7-line me-1"></i> Write-Off {actionQuantity} Units
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action 4: Edit Lot Details */}
                    <div className="col-12">
                      <div className="card border rounded-3 p-3 bg-white">
                        <div className="fw-bold text-dark fs-13 mb-2">
                          <i className="ri-edit-line me-1 text-primary"></i> Adjust Lot Expiry &amp; Notes
                        </div>
                        <form onSubmit={handleSaveEdit} className="row g-2 align-items-end">
                          <div className="col-md-4">
                            <label className="form-label fs-11 text-muted mb-0">Expiry Date</label>
                            <input 
                              type="date" 
                              className="form-control form-control-sm" 
                              value={editForm.expiry_date} 
                              onChange={e => setEditForm(f => ({ ...f, expiry_date: e.target.value }))} 
                            />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label fs-11 text-muted mb-0">Lot Notes</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={editForm.notes} 
                              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} 
                              placeholder="Harvest notes, quality notes…"
                            />
                          </div>
                          <div className="col-md-3">
                            <button type="submit" className="btn btn-dark btn-sm w-100 rounded-pill" disabled={saving}>
                              Save Lot Info
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}
    </div>
  )
}
