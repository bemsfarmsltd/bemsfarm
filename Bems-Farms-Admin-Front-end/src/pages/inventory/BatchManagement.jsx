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
  active:        { label:'Active',        cls:'bg-success-subtle text-success', icon:'ri-checkbox-circle-line' },
  expiring_soon: { label:'Expiring Soon', cls:'bg-warning-subtle text-warning', icon:'ri-alarm-warning-line'   },
  expired:       { label:'Expired',       cls:'bg-danger-subtle text-danger',   icon:'ri-close-circle-line'    },
  exhausted:     { label:'Exhausted',     cls:'bg-secondary-subtle text-secondary', icon:'ri-archive-line'     },
  recalled:      { label:'Recalled',      cls:'bg-danger-subtle text-danger',   icon:'ri-forbid-line'          },
}

export default function BatchManagement() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    product_id: '', warehouse_id: '', batch_no: '', manufactured_date: '', expiry_date: '', quantity: 0, cost_price: '', notes: '',
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
        console.error('Error loading metadata for Batch Management:', err)
      }
    }
    loadMeta()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/inventory/batches', { params: { limit: 100 } })
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
    const m = (r.batch_no || '').toLowerCase().includes(q) || (r.product_name || '').toLowerCase().includes(q)
    return m && (filterStatus === 'all' || r.computedStatus === filterStatus)
  }), [enriched, search, filterStatus])

  const stats = useMemo(() => ({
    total:    enriched.length,
    active:   enriched.filter(r => r.computedStatus === 'active').length,
    expiring: enriched.filter(r => r.computedStatus === 'expiring_soon').length,
    expired:  enriched.filter(r => r.computedStatus === 'expired' || r.computedStatus === 'exhausted').length,
  }), [enriched])

  function openAdd() {
    setEditItem(null)
    setForm({
      product_id: products[0]?.id ? String(products[0].id) : '', warehouse_id: '',
      batch_no: `BCH-${Date.now().toString().slice(-6)}`, manufactured_date: new Date().toISOString().slice(0,10),
      expiry_date: '', quantity: 0, cost_price: '', notes: '',
    })
    setActiveModal('form')
  }
  function openEdit(r) {
    setEditItem(r)
    setForm({ quantity: r.quantity, expiry_date: r.expiry_date ? r.expiry_date.slice(0,10) : '', notes: r.notes || '' })
    setActiveModal('form')
  }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  async function saveForm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await api.patch(`/admin/inventory/batches/${editItem.id}`, {
          quantity: form.quantity, expiry_date: form.expiry_date || undefined, notes: form.notes,
        })
        toast.success('Batch updated')
      } else {
        if (!form.product_id) { toast.error('Select a product'); setSaving(false); return }
        if (!form.batch_no.trim()) { toast.error('Batch number required'); setSaving(false); return }
        await api.post('/admin/inventory/batches', {
          product_id: parseInt(form.product_id),
          warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : undefined,
          batch_no: form.batch_no.trim(),
          quantity: parseInt(form.quantity) || 0,
          cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
          expiry_date: form.expiry_date || undefined,
          manufactured_date: form.manufactured_date || undefined,
          notes: form.notes || undefined,
        })
        toast.success('Batch added')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save batch')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/admin/inventory/batches/${editItem.id}`)
      toast.success('Batch recalled')
      closeModal()
      load()
    } catch {
      toast.error('Failed to recall batch')
    }
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Batch Management</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
          <li className="breadcrumb-item active">Batch Management</li>
        </ul>
      </div>

      {stats.expiring > 0 && (
        <div className="alert border-0 mb-4 d-flex align-items-center gap-2" style={{ background:'#fff8ec', color:'#8a5a00', borderLeft:'4px solid #f7b84b !important' }}>
          <i className="ri-alarm-warning-line fs-20 text-warning"></i>
          <span><strong>{stats.expiring} batch{stats.expiring > 1 ? 'es' : ''}</strong> expiring within 7 days — review and use or dispose.</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        {[
          { label:'Total Batches',   value: stats.total,    icon:'ri-archive-stack-line', color:'#405189', filter:'all'          },
          { label:'Active',          value: stats.active,   icon:'ri-checkbox-circle-line',color:'#0ab39c', filter:'active'       },
          { label:'Expiring Soon',   value: stats.expiring, icon:'ri-alarm-warning-line',  color:'#f7b84b', filter:'expiring_soon' },
          { label:'Expired/Done',    value: stats.expired,  icon:'ri-close-circle-line',   color:'#f06548', filter:'expired'      },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }} onClick={() => setFilterStatus(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-20 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search batch no, product…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Batches</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Exhausted</option>
              <option value="recalled">Recalled</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Add Batch
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Batch No</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Mfg Date</th>
                  <th className="fw-medium text-muted">Expiry Date</th>
                  <th className="fw-medium text-muted">Days Left</th>
                  <th className="fw-medium text-muted">Qty</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">Loading batches…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">
                    <i className="ri-archive-stack-line fs-2 d-block mb-2"></i>No batches found
                  </td></tr>
                )}
                {!loading && filtered.map(r => {
                  const sc   = STATUS_CFG[r.computedStatus]
                  const days = daysToExpiry(r.expiry_date)
                  const daysColor = days === null ? '#adb5bd' : days < 0 ? '#f06548' : days <= 7 ? '#f7b84b' : '#0ab39c'
                  return (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-primary">{r.batch_no}</span></td>
                      <td className="fw-medium">{r.product_name}</td>
                      <td>{r.manufactured_date ? r.manufactured_date.slice(0,10) : '—'}</td>
                      <td>{r.expiry_date ? r.expiry_date.slice(0,10) : '—'}</td>
                      <td>
                        <span className="fw-bold" style={{ color: daysColor }}>
                          {days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                      </td>
                      <td className="fw-medium">{r.quantity}</td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse_name || '—'}</span></td>
                      <td><span className={`badge ${sc.cls}`}><i className={`${sc.icon} me-1`}></i>{sc.label}</span></td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openEdit(r)}><i className="ri-pencil-line"></i></button>
                          <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => openDelete(r)}><i className="ri-delete-bin-line"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} batches</div>
        </div>
      </div>

      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Batch' : 'Add New Batch'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      {!editItem && (
                        <>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">Product <span className="text-danger">*</span></label>
                            <select className="form-select" required value={form.product_id} onChange={e => setForm(f=>({...f,product_id:e.target.value}))}>
                              <option value="">— Select Product —</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>)}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">Warehouse</label>
                            <select className="form-select" value={form.warehouse_id} onChange={e => setForm(f=>({...f,warehouse_id:e.target.value}))}>
                              <option value="">— Select —</option>
                              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-medium">Batch No <span className="text-danger">*</span></label>
                            <input className="form-control" required value={form.batch_no} onChange={e => setForm(f=>({...f,batch_no:e.target.value}))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-medium">Mfg Date</label>
                            <input type="date" className="form-control" value={form.manufactured_date} onChange={e => setForm(f=>({...f,manufactured_date:e.target.value}))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-medium">Cost Price (₦)</label>
                            <input type="number" className="form-control" min="0" step="0.01" value={form.cost_price} onChange={e => setForm(f=>({...f,cost_price:e.target.value}))} />
                          </div>
                        </>
                      )}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Expiry Date</label>
                        <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm(f=>({...f,expiry_date:e.target.value}))} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Quantity</label>
                        <input type="number" className="form-control" min="0" value={form.quantity} onChange={e => setForm(f=>({...f,quantity:Number(e.target.value)}))} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Notes</label>
                        <input className="form-control" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional batch notes…" />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? 'Saving…' : (editItem ? 'Save Changes' : 'Add Batch')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width:56, height:56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"></i>
                  </div>
                </div>
                <h6 className="mb-1">Recall Batch?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.batch_no} — {editItem?.product_name}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Recall</button>
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
