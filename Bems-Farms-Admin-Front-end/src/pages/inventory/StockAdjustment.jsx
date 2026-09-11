import { useState, useMemo } from 'react'

const PRODUCTS   = ['Basmati Rice (5kg)','Fresh Tomatoes','Palm Oil (25L)','Catfish (Smoked)','Fresh Pepper','Chicken (Whole)','Fresh Yam','Cassava Flour','Fresh Milk','Plantain (Bunch)']
const WAREHOUSES = ['Main Store','Cold Room','Dry Store','Farm Store']
const REASONS    = ['Physical Count Correction','Spoilage/Damage','Expiry Write-off','Theft/Loss','System Error Correction','Quality Rejection','Production Use','Promotional Giveaway']

const MOCK_ADJ = [
  { id:1, ref:'ADJ-2026-001', product:'Fresh Tomatoes',     type:'subtract', date:'2026-06-15', warehouse:'Main Store', before:25, adjust:8,  after:17, reason:'Spoilage/Damage',           staff:'Emeka A.', status:'approved' },
  { id:2, ref:'ADJ-2026-002', product:'Basmati Rice (5kg)', type:'add',      date:'2026-06-16', warehouse:'Dry Store',  before:80, adjust:40, after:120,reason:'Physical Count Correction',  staff:'Admin',    status:'approved' },
  { id:3, ref:'ADJ-2026-003', product:'Palm Oil (25L)',      type:'subtract', date:'2026-06-18', warehouse:'Main Store', before:6,  adjust:6,  after:0,  reason:'Expiry Write-off',          staff:'Ngozi B.', status:'approved' },
  { id:4, ref:'ADJ-2026-004', product:'Fresh Milk',          type:'subtract', date:'2026-06-20', warehouse:'Cold Room',  before:15, adjust:3,  after:12, reason:'Spoilage/Damage',           staff:'Emeka A.', status:'approved' },
  { id:5, ref:'ADJ-2026-005', product:'Cassava Flour',       type:'add',      date:'2026-06-22', warehouse:'Dry Store',  before:10, adjust:5,  after:15, reason:'Physical Count Correction',  staff:'Admin',    status:'pending'  },
  { id:6, ref:'ADJ-2026-006', product:'Fresh Pepper',        type:'subtract', date:'2026-06-24', warehouse:'Main Store', before:14, adjust:6,  after:8,  reason:'Quality Rejection',         staff:'Ngozi B.', status:'approved' },
  { id:7, ref:'ADJ-2026-007', product:'Chicken (Whole)',     type:'add',      date:'2026-06-25', warehouse:'Cold Room',  before:45, adjust:10, after:55, reason:'Physical Count Correction',  staff:'Admin',    status:'pending'  },
  { id:8, ref:'ADJ-2026-008', product:'Plantain (Bunch)',    type:'subtract', date:'2026-06-26', warehouse:'Farm Store', before:30, adjust:5,  after:25, reason:'Promotional Giveaway',      staff:'Emeka A.', status:'approved' },
]

const TYPE_CFG   = { add:{ label:'+Addition', cls:'bg-success-subtle text-success' }, subtract:{ label:'-Deduction', cls:'bg-danger-subtle text-danger' } }
const STATUS_CFG = { approved:{ label:'Approved', cls:'bg-success-subtle text-success' }, pending:{ label:'Pending', cls:'bg-warning-subtle text-warning' } }

function nextRef(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.ref.split('-')[2])), 0)
  return `ADJ-2026-${String(max + 1).padStart(3,'0')}`
}

export default function StockAdjustment() {
  const [records, setRecords] = useState(MOCK_ADJ)
  const [search, setSearch]   = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm] = useState({
    ref:'', product: PRODUCTS[0], type:'subtract', date:'',
    warehouse:'Main Store', before:0, adjust:0, reason: REASONS[0], staff:'Admin', status:'pending'
  })

  const filtered = useMemo(() => records.filter(r => {
    const m = r.product.toLowerCase().includes(search.toLowerCase()) || r.ref.toLowerCase().includes(search.toLowerCase())
    return m && (filterType === 'all' || r.type === filterType)
  }), [records, search, filterType])

  const stats = useMemo(() => ({
    total:   records.length,
    adds:    records.filter(r => r.type === 'add').reduce((s,r) => s + r.adjust, 0),
    subs:    records.filter(r => r.type === 'subtract').reduce((s,r) => s + r.adjust, 0),
    pending: records.filter(r => r.status === 'pending').length,
  }), [records])

  function openAdd() {
    setEditItem(null)
    setForm({ ref: nextRef(records), product: PRODUCTS[0], type:'subtract', date: new Date().toISOString().slice(0,10), warehouse:'Main Store', before:0, adjust:0, reason: REASONS[0], staff:'Admin', status:'pending' })
    setActiveModal('form')
  }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  const computedAfter = form.type === 'add'
    ? Number(form.before) + Number(form.adjust)
    : Number(form.before) - Number(form.adjust)

  function saveForm(e) {
    e.preventDefault()
    const after = computedAfter
    if (editItem) {
      setRecords(prev => prev.map(r => r.id === editItem.id ? { ...r, ...form, after } : r))
    } else {
      setRecords(prev => [...prev, { id: Math.max(...prev.map(r=>r.id))+1, ...form, after }])
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
        <h6 className="flex-grow-1 mb-0">Stock Adjustments</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Adjustments</li>
        </ul>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label:'Total Adjustments', value: stats.total,      icon:'ri-equalizer-line',             color:'#405189' },
          { label:'Units Added',        value:`+${stats.adds}`,  icon:'ri-add-circle-line',            color:'#0ab39c' },
          { label:'Units Deducted',     value:`-${stats.subs}`,  icon:'ri-indeterminate-circle-line',  color:'#f06548' },
          { label:'Pending Approval',   value: stats.pending,    icon:'ri-time-line',                  color:'#f7b84b' },
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
            <input className="form-control ps-9" placeholder="Search product, ref…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="add">Additions</option>
              <option value="subtract">Deductions</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Add Adjustment
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Ref No</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Type</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Before</th>
                  <th className="fw-medium text-muted">Adjusted</th>
                  <th className="fw-medium text-muted">After</th>
                  <th className="fw-medium text-muted">Reason</th>
                  <th className="fw-medium text-muted">Staff</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-5 text-muted">
                    <i className="ri-equalizer-line fs-2 d-block mb-2"></i>No adjustments found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const tc = TYPE_CFG[r.type]
                  const sc = STATUS_CFG[r.status]
                  return (
                    <tr key={r.id}>
                      <td><span className="fw-medium text-primary">{r.ref}</span></td>
                      <td className="fw-medium">{r.product}</td>
                      <td><span className={`badge ${tc.cls}`}>{tc.label}</span></td>
                      <td>{r.date}</td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse}</span></td>
                      <td>{r.before}</td>
                      <td className="fw-bold" style={{ color: r.type === 'add' ? '#0ab39c' : '#f06548' }}>
                        {r.type === 'add' ? '+' : '-'}{r.adjust}
                      </td>
                      <td className="fw-bold">{r.after}</td>
                      <td style={{ maxWidth:140, whiteSpace:'normal', fontSize:12 }}>{r.reason}</td>
                      <td>{r.staff}</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
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
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} adjustments</div>
        </div>
      </div>

      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Adjustment' : 'New Stock Adjustment'}</h6>
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
                        <label className="form-label fw-medium">Adjustment Type</label>
                        <select className="form-select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                          <option value="add">Addition (+)</option>
                          <option value="subtract">Deduction (-)</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Product <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.product} onChange={e => setForm(f=>({...f,product:e.target.value}))}>
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Warehouse</label>
                        <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Current Qty (Before)</label>
                        <input type="number" className="form-control" min="0" value={form.before} onChange={e => setForm(f=>({...f,before:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Adjust Qty</label>
                        <input type="number" className="form-control" min="0" value={form.adjust} onChange={e => setForm(f=>({...f,adjust:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Qty After Adjustment</label>
                        <input className="form-control bg-light fw-bold" readOnly
                          value={computedAfter < 0 ? '⚠ Negative!' : computedAfter}
                          style={{ color: computedAfter < 0 ? '#f06548' : '#0ab39c' }} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Reason <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}>
                          {REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                        </select>
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100" disabled={computedAfter < 0}>
                        {editItem ? 'Save Changes' : 'Submit Adjustment'}
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
                <h6 className="mb-1">Delete Adjustment?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.ref} — {editItem?.product}</p>
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
