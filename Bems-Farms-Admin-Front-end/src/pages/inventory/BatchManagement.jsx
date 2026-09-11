import { useState, useMemo } from 'react'

const PRODUCTS   = ['Catfish (Smoked)','Fresh Milk','Chicken (Whole)','Fresh Tomatoes','Fresh Pepper','Palm Oil (25L)','Basmati Rice (5kg)','Cassava Flour']
const SUPPLIERS  = ['Local Farmers Market','Eze Farm Supplies','Bems Processing Unit','Agro Kings Ltd','Fresh Direct Nigeria']
const WAREHOUSES = ['Main Store','Cold Room','Dry Store','Farm Store']

const TODAY = new Date('2026-06-26')
function daysToExpiry(expDate) {
  const d = new Date(expDate)
  return Math.ceil((d - TODAY) / 86400000)
}
function getBatchStatus(expDate, qty) {
  if (qty === 0) return 'exhausted'
  const days = daysToExpiry(expDate)
  if (days < 0)  return 'expired'
  if (days <= 7) return 'expiring_soon'
  return 'active'
}

const MOCK_BATCHES = [
  { id:1, batchNo:'BCH-2026-001', product:'Catfish (Smoked)',   supplier:'Bems Processing Unit',  mfgDate:'2026-06-01', expDate:'2026-07-01', qty:40,  warehouse:'Cold Room',  notes:''                },
  { id:2, batchNo:'BCH-2026-002', product:'Fresh Milk',          supplier:'Agro Kings Ltd',         mfgDate:'2026-06-20', expDate:'2026-06-28', qty:18,  warehouse:'Cold Room',  notes:'Low-fat variety' },
  { id:3, batchNo:'BCH-2026-003', product:'Chicken (Whole)',     supplier:'Local Farmers Market',   mfgDate:'2026-06-24', expDate:'2026-06-30', qty:25,  warehouse:'Cold Room',  notes:''                },
  { id:4, batchNo:'BCH-2026-004', product:'Fresh Tomatoes',      supplier:'Fresh Direct Nigeria',   mfgDate:'2026-06-22', expDate:'2026-06-27', qty:10,  warehouse:'Main Store', notes:'Roma variety'    },
  { id:5, batchNo:'BCH-2026-005', product:'Basmati Rice (5kg)',  supplier:'Eze Farm Supplies',      mfgDate:'2026-01-01', expDate:'2026-12-31', qty:120, warehouse:'Dry Store',  notes:''                },
  { id:6, batchNo:'BCH-2026-006', product:'Palm Oil (25L)',       supplier:'Agro Kings Ltd',         mfgDate:'2026-03-01', expDate:'2026-06-20', qty:0,   warehouse:'Main Store', notes:'Exhausted'       },
  { id:7, batchNo:'BCH-2026-007', product:'Cassava Flour',        supplier:'Bems Processing Unit',   mfgDate:'2026-05-15', expDate:'2026-08-15', qty:14,  warehouse:'Dry Store',  notes:''                },
  { id:8, batchNo:'BCH-2026-008', product:'Fresh Pepper',         supplier:'Fresh Direct Nigeria',   mfgDate:'2026-06-25', expDate:'2026-06-30', qty:6,   warehouse:'Farm Store', notes:'Scotch bonnet'   },
]

const STATUS_CFG = {
  active:       { label:'Active',        cls:'bg-success-subtle text-success', icon:'ri-checkbox-circle-line' },
  expiring_soon:{ label:'Expiring Soon', cls:'bg-warning-subtle text-warning', icon:'ri-alarm-warning-line'   },
  expired:      { label:'Expired',       cls:'bg-danger-subtle text-danger',   icon:'ri-close-circle-line'    },
  exhausted:    { label:'Exhausted',     cls:'bg-secondary-subtle text-secondary', icon:'ri-archive-line'     },
}

function nextBatch(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.batchNo.split('-')[2])), 0)
  return `BCH-2026-${String(max + 1).padStart(3,'0')}`
}

export default function BatchManagement() {
  const [records, setRecords] = useState(MOCK_BATCHES)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [form, setForm] = useState({
    batchNo:'', product: PRODUCTS[0], supplier: SUPPLIERS[0], mfgDate:'', expDate:'', qty:0, warehouse:'Cold Room', notes:''
  })

  const enriched = useMemo(() => records.map(r => ({ ...r, status: getBatchStatus(r.expDate, r.qty) })), [records])

  const filtered = useMemo(() => enriched.filter(r => {
    const m = r.batchNo.toLowerCase().includes(search.toLowerCase()) ||
              r.product.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [enriched, search, filterStatus])

  const stats = useMemo(() => ({
    total:    enriched.length,
    active:   enriched.filter(r => r.status === 'active').length,
    expiring: enriched.filter(r => r.status === 'expiring_soon').length,
    expired:  enriched.filter(r => r.status === 'expired' || r.status === 'exhausted').length,
  }), [enriched])

  function openAdd() {
    setEditItem(null)
    setForm({ batchNo: nextBatch(records), product: PRODUCTS[0], supplier: SUPPLIERS[0], mfgDate: new Date().toISOString().slice(0,10), expDate:'', qty:0, warehouse:'Cold Room', notes:'' })
    setActiveModal('form')
  }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  function saveForm(e) {
    e.preventDefault()
    if (editItem) {
      setRecords(prev => prev.map(r => r.id === editItem.id ? { ...r, ...form } : r))
    } else {
      setRecords(prev => [...prev, { id: Math.max(...prev.map(r=>r.id))+1, ...form }])
    }
    closeModal()
  }

  function confirmDelete() {
    setRecords(prev => prev.filter(r => r.id !== editItem.id))
    closeModal()
  }

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Batch Management</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Batch Management</li>
        </ul>
      </div>

      {/* Alert banner for expiring batches */}
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
                  <th className="fw-medium text-muted">Supplier</th>
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
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-archive-stack-line fs-2 d-block mb-2"></i>No batches found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const sc   = STATUS_CFG[r.status]
                  const days = daysToExpiry(r.expDate)
                  const daysColor = days < 0 ? '#f06548' : days <= 7 ? '#f7b84b' : '#0ab39c'
                  return (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-primary">{r.batchNo}</span></td>
                      <td className="fw-medium">{r.product}</td>
                      <td style={{ fontSize:12, color:'#6c757d' }}>{r.supplier}</td>
                      <td>{r.mfgDate}</td>
                      <td>{r.expDate}</td>
                      <td>
                        <span className="fw-bold" style={{ color: daysColor }}>
                          {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                      </td>
                      <td className="fw-medium">{r.qty}</td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse}</span></td>
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
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Batch No</label>
                        <input className="form-control bg-light" readOnly value={form.batchNo} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Mfg Date</label>
                        <input type="date" className="form-control" value={form.mfgDate} onChange={e => setForm(f=>({...f,mfgDate:e.target.value}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Expiry Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={form.expDate} onChange={e => setForm(f=>({...f,expDate:e.target.value}))} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Product <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.product} onChange={e => setForm(f=>({...f,product:e.target.value}))}>
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Supplier</label>
                        <select className="form-select" value={form.supplier} onChange={e => setForm(f=>({...f,supplier:e.target.value}))}>
                          {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Quantity</label>
                        <input type="number" className="form-control" min="0" value={form.qty} onChange={e => setForm(f=>({...f,qty:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Warehouse</label>
                        <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Notes</label>
                        <input className="form-control" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional batch notes…" />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">{editItem ? 'Save Changes' : 'Add Batch'}</button>
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
                <h6 className="mb-1">Delete Batch?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.batchNo} — {editItem?.product}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
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
