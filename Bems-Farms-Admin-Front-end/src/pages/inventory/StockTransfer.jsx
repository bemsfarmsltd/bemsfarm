import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const WAREHOUSES = ['Main Store', 'Cold Room', 'Dry Store', 'Farm Store']
const PRODUCTS   = ['Basmati Rice (5kg)','Fresh Tomatoes','Palm Oil (25L)','Catfish (Smoked)','Fresh Pepper','Chicken (Whole)','Fresh Yam','Cassava Flour','Fresh Milk','Plantain (Bunch)']

const MOCK_TRANSFERS = [
  { id:1, ref:'TRF-2026-001', date:'2026-06-18', from:'Main Store', to:'Cold Room',  products:'Chicken, Fresh Milk', qty:30, status:'completed', notes:'Weekly cold storage restock'        },
  { id:2, ref:'TRF-2026-002', date:'2026-06-19', from:'Farm Store', to:'Main Store', products:'Yam, Plantain',       qty:80, status:'completed', notes:'Farm harvest moved to main'         },
  { id:3, ref:'TRF-2026-003', date:'2026-06-21', from:'Main Store', to:'Dry Store',  products:'Rice, Cassava Flour', qty:50, status:'completed', notes:'Bulk dry goods transfer'            },
  { id:4, ref:'TRF-2026-004', date:'2026-06-24', from:'Cold Room',  to:'Main Store', products:'Catfish (Smoked)',    qty:15, status:'in_transit', notes:'POS restock from cold storage'     },
  { id:5, ref:'TRF-2026-005', date:'2026-06-26', from:'Farm Store', to:'Cold Room',  products:'Fresh Pepper, Tomatoes', qty:40, status:'pending', notes:'Perishable items to cold chain' },
]

const STATUS_CFG = {
  completed:  { label:'Completed',  cls:'bg-success-subtle text-success' },
  in_transit: { label:'In Transit', cls:'bg-info-subtle text-info'       },
  pending:    { label:'Pending',    cls:'bg-warning-subtle text-warning'  },
  cancelled:  { label:'Cancelled',  cls:'bg-danger-subtle text-danger'   },
}

function nextRef(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.ref.split('-')[2])), 0)
  return `TRF-2026-${String(max + 1).padStart(3,'0')}`
}

export default function StockTransfer() {
  const [records, setRecords] = useState(MOCK_TRANSFERS)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [form, setForm] = useState({
    ref:'', date:'', from:'Main Store', to:'Cold Room', products:'', qty:1, status:'pending', notes:''
  })

  const filtered = useMemo(() => records.filter(r => {
    const m = r.ref.toLowerCase().includes(search.toLowerCase()) ||
              r.products.toLowerCase().includes(search.toLowerCase()) ||
              r.from.toLowerCase().includes(search.toLowerCase()) ||
              r.to.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [records, search, filterStatus])

  const stats = useMemo(() => ({
    total:     records.length,
    inTransit: records.filter(r => r.status === 'in_transit').length,
    completed: records.filter(r => r.status === 'completed').length,
    pending:   records.filter(r => r.status === 'pending').length,
  }), [records])

  function openAdd() {
    setEditItem(null)
    setForm({ ref: nextRef(records), date: new Date().toISOString().slice(0,10), from:'Main Store', to:'Cold Room', products:'', qty:1, status:'pending', notes:'' })
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
        <h6 className="flex-grow-1 mb-0">Stock Transfer</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/inventory/stock">Inventory</Link></li>
          <li className="breadcrumb-item active">Stock Transfer</li>
        </ul>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label:'Total Transfers', value: stats.total,     icon:'ri-swap-box-line',      color:'#405189' },
          { label:'In Transit',      value: stats.inTransit, icon:'ri-truck-line',          color:'#299cdb' },
          { label:'Completed',       value: stats.completed, icon:'ri-checkbox-circle-line',color:'#0ab39c' },
          { label:'Pending',         value: stats.pending,   icon:'ri-time-line',           color:'#f7b84b' },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0" style={{ borderLeft:`3px solid ${c.color}` }}>
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
            <input className="form-control ps-9" placeholder="Search reference, product, warehouse…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:240 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> New Transfer
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Ref No</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">From</th>
                  <th className="fw-medium text-muted">To</th>
                  <th className="fw-medium text-muted">Products</th>
                  <th className="fw-medium text-muted">Total Qty</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Notes</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">
                    <i className="ri-swap-box-line fs-2 d-block mb-2"></i>No transfers found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const sc = STATUS_CFG[r.status]
                  return (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-primary">{r.ref}</span></td>
                      <td>{r.date}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="ri-store-2-line me-1"></i>{r.from}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border">
                          <i className="ri-store-3-line me-1"></i>{r.to}
                        </span>
                      </td>
                      <td style={{ maxWidth:160, whiteSpace:'normal', fontSize:12 }}>{r.products}</td>
                      <td className="fw-medium">{r.qty}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td style={{ maxWidth:180, whiteSpace:'normal', fontSize:12, color:'#6c757d' }}>{r.notes}</td>
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
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} transfers</div>
        </div>
      </div>

      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Transfer' : 'New Stock Transfer'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Reference No</label>
                        <input className="form-control bg-light" readOnly value={form.ref} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                          <option value="pending">Pending</option>
                          <option value="in_transit">In Transit</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">From Warehouse <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.from} onChange={e => setForm(f=>({...f,from:e.target.value}))}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">To Warehouse <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.to} onChange={e => setForm(f=>({...f,to:e.target.value}))}>
                          {WAREHOUSES.filter(w => w !== form.from).map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Products <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.products} onChange={e => setForm(f=>({...f,products:e.target.value}))} placeholder="e.g., Chicken, Fresh Milk" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Total Qty</label>
                        <input type="number" className="form-control" min="1" value={form.qty} onChange={e => setForm(f=>({...f,qty:Number(e.target.value)}))} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Notes</label>
                        <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional transfer notes…" />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">{editItem ? 'Save Changes' : 'Create Transfer'}</button>
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
                <h6 className="mb-1">Delete Transfer?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.ref}</p>
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
