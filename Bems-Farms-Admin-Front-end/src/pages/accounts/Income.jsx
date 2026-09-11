import { useState } from 'react'

const fmt  = n => `₦${Number(n).toLocaleString()}`
const fmtD = s => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

const CATEGORIES  = ['Sales', 'Wallet Top-up', 'Delivery Fee', 'Corporate Supply', 'POS Sale', 'Refund Recovery', 'Other']
const PAY_METHODS = ['Paystack', 'Bank Transfer', 'Cash', 'POS Terminal', 'Wallet', 'USSD']
const INCOME_TYPES = ['Online Order', 'Walk-in Sale', 'Corporate', 'Wallet Credit', 'Delivery', 'Manual Entry']

const INITIAL_INCOME = [
  { id:'INC-0041', date:'2026-06-27', ref:'ORD-2026-0141', customer:'Adaeze Nwosu',      category:'Sales',           method:'Paystack',      status:'paid',    amount:18_400, type:'Online Order',   note:'' },
  { id:'INC-0040', date:'2026-06-27', ref:'ORD-2026-0140', customer:'Kemi Balogun',       category:'Sales',           method:'Paystack',      status:'paid',    amount:16_100, type:'Online Order',   note:'' },
  { id:'INC-0039', date:'2026-06-26', ref:'WLT-0234',       customer:'Seun Adesanya',      category:'Wallet Top-up',   method:'Paystack',      status:'paid',    amount:20_000, type:'Wallet Credit',  note:'Wallet top-up via app' },
  { id:'INC-0038', date:'2026-06-26', ref:'ORD-2026-0138', customer:'Tobi Adekunle',       category:'Sales',           method:'POS Terminal',  status:'paid',    amount:12_400, type:'Walk-in Sale',   note:'' },
  { id:'INC-0037', date:'2026-06-25', ref:'DEL-0882',       customer:'Akin Okafor',        category:'Delivery Fee',    method:'Paystack',      status:'paid',    amount:3_500,  type:'Delivery',       note:'Express delivery — Lekki' },
  { id:'INC-0036', date:'2026-06-25', ref:'CORP-0019',      customer:'EatWell Catering Ltd',category:'Corporate Supply',method:'Bank Transfer',  status:'paid',    amount:185_000,type:'Corporate',      note:'June standing order — vegetables & fruits' },
  { id:'INC-0035', date:'2026-06-24', ref:'ORD-2026-0135', customer:'Ngozi Okonkwo',       category:'Sales',           method:'Paystack',      status:'pending', amount:9_200,  type:'Online Order',   note:'' },
  { id:'INC-0034', date:'2026-06-24', ref:'WLT-0228',       customer:'Bola Akinwale',      category:'Wallet Top-up',   method:'Paystack',      status:'paid',    amount:10_000, type:'Wallet Credit',  note:'' },
  { id:'INC-0033', date:'2026-06-23', ref:'ORD-2026-0133', customer:'Chukwuemeka Eze',     category:'Sales',           method:'Paystack',      status:'paid',    amount:22_700, type:'Online Order',   note:'' },
  { id:'INC-0032', date:'2026-06-23', ref:'DEL-0877',       customer:'Fatima Al-Hassan',   category:'Delivery Fee',    method:'Paystack',      status:'paid',    amount:2_800,  type:'Delivery',       note:'' },
  { id:'INC-0031', date:'2026-06-22', ref:'ORD-2026-0131', customer:'Taiwo Adeleke',       category:'Sales',           method:'Cash',          status:'paid',    amount:7_500,  type:'Walk-in Sale',   note:'' },
  { id:'INC-0030', date:'2026-06-22', ref:'CORP-0018',      customer:'Mama Cass Restaurants',category:'Corporate Supply',method:'Bank Transfer', status:'pending',amount:240_000,type:'Corporate',      note:'Weekly supply — tomatoes, pepper, leafy veg' },
  { id:'INC-0029', date:'2026-06-21', ref:'ORD-2026-0129', customer:'Yemi Osinbajo Jr',    category:'Sales',           method:'Paystack',      status:'paid',    amount:15_600, type:'Online Order',   note:'' },
  { id:'INC-0028', date:'2026-06-20', ref:'RFC-0045',       customer:'Emeka Okafor',       category:'Refund Recovery', method:'Bank Transfer',  status:'paid',    amount:8_400,  type:'Manual Entry',   note:'Supplier refund — spoilt tomatoes batch' },
]

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0],
  ref: '', customer: '', category: 'Sales', method: 'Paystack',
  status: 'paid', amount: '', type: 'Online Order', note: '',
}

const STATUS_CFG = {
  paid:    { label:'Paid',    cls:'bg-success-subtle text-success border-success-subtle' },
  pending: { label:'Pending', cls:'bg-warning-subtle text-warning border-warning-subtle' },
  failed:  { label:'Failed',  cls:'bg-danger-subtle text-danger border-danger-subtle' },
}

export default function Income() {
  const [records, setRecords]   = useState(INITIAL_INCOME)
  const [search, setSearch]     = useState('')
  const [filterCat, setFiltCat] = useState('all')
  const [filterSt,  setFiltSt]  = useState('all')
  const [activeModal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(BLANK_FORM)

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM) }

  const openView   = r => { setSelected(r); setModal('view') }
  const openEdit   = r => { setSelected(r); setForm({ ...r }); setModal('edit') }
  const openDelete = r => { setSelected(r); setModal('delete') }
  const openAdd    = () => { setForm({ ...BLANK_FORM, ref: `INC-${String(records.length + 42).padStart(4,'0')}` }); setModal('add') }

  const saveRecord = () => {
    if (!form.customer || !form.amount) return
    if (activeModal === 'add') {
      const newR = { ...form, id: `INC-${String(records.length + 42).padStart(4,'0')}`, amount: Number(form.amount) }
      setRecords(prev => [newR, ...prev])
    } else {
      setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, ...form, amount: Number(form.amount) } : r))
    }
    closeModal()
  }

  const deleteRecord = () => {
    setRecords(prev => prev.filter(r => r.id !== selected.id))
    closeModal()
  }

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.customer.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    const mc = filterCat === 'all' || r.category === filterCat
    const mst = filterSt === 'all' || r.status === filterSt
    return ms && mc && mst
  })

  // Stats
  const totalIncome = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending     = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const todayStr    = new Date().toISOString().split('T')[0]
  const todayInc    = records.filter(r => r.date === todayStr && r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const totalRecords= records.length
  const avgPerTxn   = totalRecords ? Math.round(totalIncome / records.filter(r=>r.status==='paid').length) : 0

  // Category breakdown
  const catTotals = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = records.filter(r => r.category === cat && r.status === 'paid').reduce((s, r) => s + r.amount, 0)
    return acc
  }, {})

  const CAT_COLORS = {
    'Sales':'#3b82f6','Wallet Top-up':'#8b5cf6','Delivery Fee':'#f59e0b',
    'Corporate Supply':'#22c55e','POS Sale':'#0ea5e9','Refund Recovery':'#ec4899','Other':'#94a3b8',
  }

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Income</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Income</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Income (Paid)', val:fmt(totalIncome), icon:'ri-arrow-up-circle-line',  color:'#22c55e', bg:'#f0fdf4' },
          { label:"Today's Income",      val:fmt(todayInc),    icon:'ri-calendar-check-line',    color:'#3b82f6', bg:'#eff6ff' },
          { label:'Pending Income',      val:fmt(pending),     icon:'ri-time-line',               color:'#f59e0b', bg:'#fffbeb' },
          { label:'Total Records',       val:totalRecords,     icon:'ri-file-list-3-line',        color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Avg per Transaction', val:fmt(avgPerTxn),  icon:'ri-bar-chart-line',          color:'#0ea5e9', bg:'#f0f9ff' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-md-4 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width:44, height:44, background:s.bg }}>
                    <i className={`${s.icon} fs-20`} style={{ color:s.color }}/>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize:11 }}>{s.label}</div>
                    <div className="fw-bold fs-15">{s.val}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="fw-medium mb-3" style={{ fontSize:13 }}>Income by Category</div>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(catTotals).filter(([,v]) => v > 0).map(([cat, val]) => (
              <div key={cat} className="d-flex align-items-center gap-2 border rounded px-3 py-2">
                <div style={{ width:10, height:10, borderRadius:'50%', background: CAT_COLORS[cat] || '#94a3b8' }}/>
                <span style={{ fontSize:12 }} className="text-muted">{cat}:</span>
                <span className="fw-medium" style={{ fontSize:12 }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="position-relative">
                <input className="form-control ps-9" style={{ width:220 }}
                  placeholder="Search customer, ref, ID…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                <i className="ri-search-line position-absolute top-50 translate-middle-y ms-3" style={{ fontSize:14, color:'#94a3b8' }}/>
              </div>
              <select className="form-select" style={{ width:150 }} value={filterCat} onChange={e => setFiltCat(e.target.value)}>
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="form-select" style={{ width:130 }} value={filterSt} onChange={e => setFiltSt(e.target.value)}>
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <i className="ri-add-line me-1"/>Add Income
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth:900 }}>
              <thead className="bg-light">
                <tr>
                  <th className="fw-medium text-muted ps-4" style={{ fontSize:12 }}>Date / Ref</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Customer</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Category</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Method</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Type</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Status</th>
                  <th className="fw-medium text-muted text-end pe-4" style={{ fontSize:12 }}>Amount</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No income records found.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="border-bottom">
                    <td className="ps-4">
                      <div className="fw-medium" style={{ fontSize:12 }}>{fmtD(r.date)}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{r.ref || r.id}</div>
                    </td>
                    <td style={{ fontSize:13 }}>{r.customer}</td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <div style={{ width:7, height:7, borderRadius:'50%', background: CAT_COLORS[r.category] || '#94a3b8' }}/>
                        <span style={{ fontSize:12 }}>{r.category}</span>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border" style={{ fontSize:11 }}>{r.method}</span></td>
                    <td><span className="text-muted" style={{ fontSize:12 }}>{r.type}</span></td>
                    <td>
                      <span className={`badge border ${STATUS_CFG[r.status]?.cls}`} style={{ fontSize:11 }}>
                        {STATUS_CFG[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <span className="fw-bold text-success" style={{ fontSize:14 }}>+{fmt(r.amount)}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                          onClick={() => openView(r)} title="View"><i className="ri-eye-line" style={{ fontSize:12 }}/></button>
                        <button className="btn btn-sm btn-outline-secondary" style={{ padding:'3px 8px' }}
                          onClick={() => openEdit(r)} title="Edit"><i className="ri-edit-line" style={{ fontSize:12 }}/></button>
                        <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px' }}
                          onClick={() => openDelete(r)} title="Delete"><i className="ri-delete-bin-line" style={{ fontSize:12 }}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-light">
                  <tr>
                    <td colSpan={6} className="ps-4 fw-medium text-muted" style={{ fontSize:12 }}>
                      Showing {filtered.length} of {records.length} records
                    </td>
                    <td className="text-end pe-4 fw-bold" style={{ color:'#22c55e' }}>
                      +{fmt(filtered.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0))}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────── */}
      {activeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>

          {/* VIEW */}
          {activeModal === 'view' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:460 }}>
              <div style={{ background:'#166534', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold fs-15"><i className="ri-arrow-up-circle-line me-2"/>Income Record</div>
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.id} · {fmtD(selected.date)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="fw-bold text-success" style={{ fontSize:28 }}>+{fmt(selected.amount)}</div>
                  <span className={`badge border ${STATUS_CFG[selected.status]?.cls} mt-1`} style={{ fontSize:12 }}>
                    {STATUS_CFG[selected.status]?.label}
                  </span>
                </div>
                {[
                  ['Reference', selected.ref || selected.id],
                  ['Customer', selected.customer],
                  ['Category', selected.category],
                  ['Payment Method', selected.method],
                  ['Income Type', selected.type],
                  ['Date', fmtD(selected.date)],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize:12 }}>{lbl}</span>
                    <span className="fw-medium" style={{ fontSize:12 }}>{val}</span>
                  </div>
                ))}
                {selected.note && (
                  <div className="alert alert-light border mt-3 mb-0" style={{ fontSize:12 }}>
                    <i className="ri-sticky-note-line me-1"/>{selected.note}
                  </div>
                )}
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Close</button>
                  <button className="btn btn-primary flex-fill" onClick={() => { closeModal(); openEdit(selected) }}>
                    <i className="ri-edit-line me-1"/>Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15">
                    <i className={`${activeModal === 'add' ? 'ri-add-circle-line' : 'ri-edit-line'} me-2`}/>
                    {activeModal === 'add' ? 'Add Income Record' : 'Edit Income Record'}
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Date <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Reference / Order ID</label>
                    <input className="form-control" placeholder="e.g. ORD-2026-0141"
                      value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Customer / Source <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="Customer name or income source"
                      value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Income Type</label>
                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Amount (₦) <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">₦</span>
                      <input className="form-control" type="number" placeholder="0.00"
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Optional note…"
                      value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={saveRecord}
                    disabled={!form.customer || !form.amount}>
                    <i className="ri-save-line me-1"/>
                    {activeModal === 'add' ? 'Add Income' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE */}
          {activeModal === 'delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:400 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-delete-bin-line me-2"/>Delete Record</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#fee2e2' }}>
                  <i className="ri-arrow-up-circle-line fs-24 text-danger"/>
                </div>
                <h5>Delete this income record?</h5>
                <p className="text-muted small mb-4">
                  <strong>{selected.id}</strong> — {selected.customer} — <strong>{fmt(selected.amount)}</strong><br/>
                  This action cannot be undone.
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={deleteRecord}>
                    <i className="ri-delete-bin-line me-1"/>Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
