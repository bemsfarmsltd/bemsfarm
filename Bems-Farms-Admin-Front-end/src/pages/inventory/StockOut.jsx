import { useState, useMemo } from 'react'

const WAREHOUSES = ['Main Store', 'Cold Room', 'Dry Store', 'Farm Store']
const REASONS    = ['Sales Order', 'Internal Use', 'Wastage', 'Return to Supplier', 'Transfer', 'Spoilage']

const MOCK_STOCK_OUT = [
  { id:1, ref:'SO-2026-001', date:'2026-06-19', customer:'Walk-in Customer',       warehouse:'Main Store', items:3, qty:15,  status:'completed', value:24500 },
  { id:2, ref:'SO-2026-002', date:'2026-06-20', customer:'Adeola Supermarket',     warehouse:'Main Store', items:5, qty:80,  status:'completed', value:76000 },
  { id:3, ref:'SO-2026-003', date:'2026-06-21', customer:'Internal Kitchen Use',   warehouse:'Cold Room',  items:2, qty:12,  status:'completed', value:18400 },
  { id:4, ref:'SO-2026-004', date:'2026-06-23', customer:'Bems Delivery Order #44',warehouse:'Dry Store',  items:4, qty:30,  status:'completed', value:42000 },
  { id:5, ref:'SO-2026-005', date:'2026-06-25', customer:'Online Order #2201',     warehouse:'Main Store', items:6, qty:50,  status:'pending',   value:67500 },
  { id:6, ref:'SO-2026-006', date:'2026-06-26', customer:'Corporate Client - GTB', warehouse:'Cold Room',  items:3, qty:25,  status:'pending',   value:38000 },
]

const STATUS_CFG = {
  completed: { label:'Completed', cls:'bg-success-subtle text-success' },
  pending:   { label:'Pending',   cls:'bg-warning-subtle text-warning' },
  cancelled: { label:'Cancelled', cls:'bg-danger-subtle text-danger'   },
}

function nextRef(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.ref.split('-')[2])), 0)
  return `SO-2026-${String(max + 1).padStart(3,'0')}`
}

export default function StockOut() {
  const [records, setRecords]   = useState(MOCK_STOCK_OUT)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [form, setForm] = useState({ ref:'', date:'', customer:'', warehouse:'Main Store', items:1, qty:1, status:'pending', value:0 })

  const filtered = useMemo(() => records.filter(r => {
    const m = r.ref.toLowerCase().includes(search.toLowerCase()) ||
              r.customer.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [records, search, filterStatus])

  const stats = useMemo(() => ({
    total:   records.length,
    month:   records.filter(r => r.date.startsWith('2026-06')).length,
    pending: records.filter(r => r.status === 'pending').length,
    value:   records.filter(r => r.status === 'completed').reduce((s,r) => s + r.value, 0),
  }), [records])

  function openAdd() {
    setEditItem(null)
    setForm({ ref: nextRef(records), date: new Date().toISOString().slice(0,10), customer:'', warehouse:'Main Store', items:1, qty:1, status:'pending', value:0 })
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
        <h6 className="flex-grow-1 mb-0">Stock Out</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Stock Out</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Dispatches',   value: stats.total,                     icon:'ri-send-plane-line',          color:'#405189' },
          { label:'This Month',         value: stats.month,                     icon:'ri-calendar-line',            color:'#0ab39c' },
          { label:'Pending Dispatch',   value: stats.pending,                   icon:'ri-loader-4-line',            color:'#f7b84b' },
          { label:'Dispatched Value',   value:`₦${stats.value.toLocaleString()}`,icon:'ri-secure-payment-line',     color:'#f06548' },
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

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search reference, customer…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Add Stock Out
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th><input type="checkbox" className="form-check-input" /></th>
                  <th className="fw-medium text-muted">Reference No</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Customer / Reason</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Items</th>
                  <th className="fw-medium text-muted">Total Qty</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Total Value</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-send-plane-line fs-2 d-block mb-2"></i>No stock-out records found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const sc = STATUS_CFG[r.status]
                  return (
                    <tr key={r.id}>
                      <td><input type="checkbox" className="form-check-input" /></td>
                      <td><span className="fw-medium text-primary">{r.ref}</span></td>
                      <td>{r.date}</td>
                      <td>{r.customer}</td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse}</span></td>
                      <td>{r.items}</td>
                      <td>{r.qty}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td className="fw-medium">₦{Number(r.value).toLocaleString()}</td>
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
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} records</div>
        </div>
      </div>

      {/* Form Modal */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Stock Out' : 'Record Stock Out'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Reference No</label>
                        <input className="form-control bg-light" readOnly value={form.ref} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Customer / Reason <span className="text-danger">*</span></label>
                        <input className="form-control" required value={form.customer} onChange={e => setForm(f=>({...f,customer:e.target.value}))} placeholder="e.g., Walk-in Customer or Internal Use" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Warehouse</label>
                        <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">No. of Items</label>
                        <input type="number" className="form-control" min="1" value={form.items} onChange={e => setForm(f=>({...f,items:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Total Qty</label>
                        <input type="number" className="form-control" min="1" value={form.qty} onChange={e => setForm(f=>({...f,qty:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Total Value (₦)</label>
                        <input type="number" className="form-control" min="0" value={form.value} onChange={e => setForm(f=>({...f,value:Number(e.target.value)}))} />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">{editItem ? 'Save Changes' : 'Record Stock Out'}</button>
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
                <h6 className="mb-1">Delete Record?</h6>
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
