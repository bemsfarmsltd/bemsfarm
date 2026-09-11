import { useState, useMemo } from 'react'

// ── Config ───────────────────────────────────────────────────────────────────
const PRODUCTS   = ['Basmati Rice (5kg)','Fresh Tomatoes','Palm Oil (25L)','Catfish (Smoked)','Fresh Pepper','Chicken (Whole)','Fresh Yam','Cassava Flour','Fresh Milk (1L)','Plantain (Bunch)','Fresh Eggs (Crate)','Goat Meat (1kg)']
const CUSTOMERS  = ['Mrs. Adaeze Okafor','Chioma Eze','Bayo Farms Ltd','Eko Catering Services','Mama Cee Restaurant','Sunshine Bakery','Mr. Emeka Nwosu','Funke Abiodun','Chidi Catering Ltd','Walk-in Customer']
const STAFF      = ['Admin','Emeka Adeola','Ngozi Bello','Tunde Okafor','Chike Nwosu']

const RETURN_REASONS = [
  'Damaged on delivery','Wrong item sent','Quality below standard',
  'Spoiled / Already expired','Item missing from order',
  'Customer changed mind','Incorrect quantity','Packaging damaged',
]

const REFUND_METHODS = ['Cash','Wallet Credit','Bank Transfer']

const CONDITION_CFG = {
  resalable:  { label:'Resalable',       cls:'bg-success-subtle text-success', dot:'#0ab39c', action:'Return to stock'   },
  damaged:    { label:'Damaged / Spoiled',cls:'bg-danger-subtle text-danger',  dot:'#f06548', action:'Write off to Lost & Damaged' },
  partial:    { label:'Partially Good',  cls:'bg-warning-subtle text-warning', dot:'#f7b84b', action:'Split — partial stock return'  },
  pending_check:{ label:'Awaiting Inspection', cls:'bg-secondary-subtle text-secondary', dot:'#adb5bd', action:'' },
}

const STATUS_CFG = {
  pending:    { label:'Pending',         cls:'bg-warning-subtle text-warning'  },
  inspecting: { label:'Inspecting',      cls:'bg-info-subtle text-info'        },
  approved:   { label:'Approved',        cls:'bg-primary-subtle text-primary'  },
  refunded:   { label:'Refunded',        cls:'bg-success-subtle text-success'  },
  rejected:   { label:'Rejected',        cls:'bg-danger-subtle text-danger'    },
}

const MOCK_RETURNS = [
  {
    id:1, ref:'RTN-2026-001', date:'2026-06-12', ordRef:'ORD-2026-092',
    customer:'Mrs. Adaeze Okafor', phone:'0803 456 7890',
    product:'Fresh Tomatoes', qty:3, unit:'kg', unitPrice:800, totalValue:2400,
    reason:'Spoiled / Already expired',
    notes:'Tomatoes were soft and mouldy when opened at home. Purchased same day.',
    condition:'damaged', goodsAction:'write_off',
    resalableQty:0, writeOffQty:3,
    refundAmount:2400, refundMethod:'Cash', refundRef:'',
    status:'refunded', processedBy:'Ngozi Bello', processedOn:'2026-06-12',
    inspectionNotes:'Confirmed spoilage — all 3kg written off to Lost & Damaged.',
  },
  {
    id:2, ref:'RTN-2026-002', date:'2026-06-15', ordRef:'ORD-2026-105',
    customer:'Bayo Farms Ltd', phone:'0812 345 6789',
    product:'Palm Oil (25L)', qty:1, unit:'can', unitPrice:18000, totalValue:18000,
    reason:'Damaged on delivery',
    notes:'Can arrived dented, lid not properly sealed. Oil may be contaminated.',
    condition:'damaged', goodsAction:'write_off',
    resalableQty:0, writeOffQty:1,
    refundAmount:18000, refundMethod:'Bank Transfer', refundRef:'TRF-BF-0015',
    status:'refunded', processedBy:'Admin', processedOn:'2026-06-15',
    inspectionNotes:'Can seal broken — cannot resell. Written off. Refund transferred to Bayo Farms account.',
  },
  {
    id:3, ref:'RTN-2026-003', date:'2026-06-18', ordRef:'ORD-2026-118',
    customer:'Eko Catering Services', phone:'0901 234 5678',
    product:'Chicken (Whole)', qty:5, unit:'kg', unitPrice:2800, totalValue:14000,
    reason:'Wrong item sent',
    notes:'Ordered boneless chicken breast, received whole chicken instead.',
    condition:'resalable', goodsAction:'back_to_stock',
    resalableQty:5, writeOffQty:0,
    refundAmount:14000, refundMethod:'Wallet Credit', refundRef:'WLT-ECS-003',
    status:'refunded', processedBy:'Emeka Adeola', processedOn:'2026-06-18',
    inspectionNotes:'Goods in perfect condition — unopened. Returned to Cold Room stock.',
  },
  {
    id:4, ref:'RTN-2026-004', date:'2026-06-20', ordRef:'ORD-2026-125',
    customer:'Mama Cee Restaurant', phone:'0705 678 9012',
    product:'Fresh Pepper', qty:4, unit:'kg', unitPrice:700, totalValue:2800,
    reason:'Quality below standard',
    notes:'Pepper was shrivelled and dry, not fresh as expected for today\'s order.',
    condition:'partial', goodsAction:'split',
    resalableQty:1, writeOffQty:3,
    refundAmount:2800, refundMethod:'Cash', refundRef:'',
    status:'approved', processedBy:'Tunde Okafor', processedOn:'2026-06-20',
    inspectionNotes:'1kg still firm and sellable — returned to stock. 3kg shrivelled — written off.',
  },
  {
    id:5, ref:'RTN-2026-005', date:'2026-06-22', ordRef:'ORD-2026-133',
    customer:'Chioma Eze', phone:'0818 901 2345',
    product:'Fresh Milk (1L)', qty:3, unit:'bottle', unitPrice:900, totalValue:2700,
    reason:'Packaging damaged',
    notes:'Two bottles had cracked caps. One bottle was leaking.',
    condition:'pending_check', goodsAction:'',
    resalableQty:0, writeOffQty:0,
    refundAmount:2700, refundMethod:'Cash', refundRef:'',
    status:'inspecting', processedBy:'Ngozi Bello', processedOn:'',
    inspectionNotes:'',
  },
  {
    id:6, ref:'RTN-2026-006', date:'2026-06-24', ordRef:'ORD-2026-138',
    customer:'Sunshine Bakery', phone:'0703 456 7890',
    product:'Cassava Flour', qty:5, unit:'pack', unitPrice:1100, totalValue:5500,
    reason:'Incorrect quantity',
    notes:'Ordered 10 packs, only received 5. Requesting refund for the 5 missing packs.',
    condition:'pending_check', goodsAction:'',
    resalableQty:0, writeOffQty:0,
    refundAmount:5500, refundMethod:'Bank Transfer', refundRef:'',
    status:'pending', processedBy:'', processedOn:'',
    inspectionNotes:'',
  },
  {
    id:7, ref:'RTN-2026-007', date:'2026-06-25', ordRef:'ORD-2026-141',
    customer:'Mr. Emeka Nwosu', phone:'0806 789 0123',
    product:'Basmati Rice (5kg)', qty:2, unit:'bag', unitPrice:4500, totalValue:9000,
    reason:'Customer changed mind',
    notes:'Purchased by mistake. Has not been opened.',
    condition:'resalable', goodsAction:'back_to_stock',
    resalableQty:2, writeOffQty:0,
    refundAmount:0, refundMethod:'', refundRef:'',
    status:'rejected', processedBy:'Admin', processedOn:'2026-06-25',
    inspectionNotes:'Return rejected — "change of mind" is outside Bems Farms return policy (7-day return only covers quality issues and wrong items).',
  },
]

function nextRef(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.ref.split('-')[2])), 0)
  return `RTN-2026-${String(max + 1).padStart(3,'0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Refunds() {
  const [records, setRecords]             = useState(MOCK_RETURNS)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [activeModal, setActiveModal]     = useState(null)   // 'log' | 'process' | 'view' | 'delete'
  const [selected, setSelected]           = useState(null)
  const [processTab, setProcessTab]       = useState('inspect')  // 'inspect' | 'refund'

  // Log Return form
  const [logForm, setLogForm] = useState({
    ref:'', date:'', ordRef:'', customer:CUSTOMERS[0], phone:'',
    product:PRODUCTS[0], qty:1, unit:'kg', unitPrice:0,
    reason:RETURN_REASONS[0], notes:'',
  })

  // Process form (inspection + refund decision)
  const [procForm, setProcForm] = useState({
    condition:'resalable', goodsAction:'back_to_stock',
    resalableQty:0, writeOffQty:0,
    inspectionNotes:'', processedBy:STAFF[0],
    refundAmount:0, refundMethod:REFUND_METHODS[0], refundRef:'',
  })

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase()
    const m = r.ref.toLowerCase().includes(q) ||
              r.customer.toLowerCase().includes(q) ||
              r.product.toLowerCase().includes(q) ||
              r.ordRef.toLowerCase().includes(q)
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [records, search, filterStatus])

  const stats = useMemo(() => ({
    total:    records.length,
    pending:  records.filter(r => r.status === 'pending' || r.status === 'inspecting').length,
    approved: records.filter(r => r.status === 'approved').length,
    refunded: records.filter(r => r.status === 'refunded').reduce((s, r) => s + r.refundAmount, 0),
  }), [records])

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openLog() {
    setLogForm({
      ref: nextRef(records),
      date: new Date().toISOString().slice(0,10),
      ordRef:'', customer:CUSTOMERS[0], phone:'',
      product:PRODUCTS[0], qty:1, unit:'kg', unitPrice:0,
      reason:RETURN_REASONS[0], notes:'',
    })
    setActiveModal('log')
  }

  function openProcess(r) {
    setSelected(r)
    setProcForm({
      condition: r.condition === 'pending_check' ? 'resalable' : r.condition,
      goodsAction: r.goodsAction || 'back_to_stock',
      resalableQty: r.resalableQty,
      writeOffQty: r.writeOffQty,
      inspectionNotes: r.inspectionNotes || '',
      processedBy: r.processedBy || STAFF[0],
      refundAmount: r.refundAmount,
      refundMethod: r.refundMethod || REFUND_METHODS[0],
      refundRef: r.refundRef || '',
    })
    setProcessTab('inspect')
    setActiveModal('process')
  }

  function openView(r) { setSelected(r); setActiveModal('view') }
  function openDelete(r) { setSelected(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setSelected(null) }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function saveLog(e) {
    e.preventDefault()
    const today = new Date().toISOString().slice(0,10)
    setRecords(prev => [...prev, {
      id: Math.max(...prev.map(r=>r.id)) + 1,
      ...logForm,
      totalValue: Number(logForm.qty) * Number(logForm.unitPrice),
      condition: 'pending_check', goodsAction: '',
      resalableQty: 0, writeOffQty: 0,
      refundAmount: Number(logForm.qty) * Number(logForm.unitPrice),
      refundMethod: '', refundRef: '',
      status: 'pending', processedBy: '', processedOn: '', inspectionNotes: '',
    }])
    closeModal()
  }

  function saveInspection() {
    const today = new Date().toISOString().slice(0,10)
    setRecords(prev => prev.map(r => r.id !== selected.id ? r : {
      ...r,
      condition: procForm.condition,
      goodsAction: procForm.goodsAction,
      resalableQty: Number(procForm.resalableQty),
      writeOffQty: Number(procForm.writeOffQty),
      inspectionNotes: procForm.inspectionNotes,
      processedBy: procForm.processedBy,
      processedOn: today,
      status: 'inspecting',
    }))
    setProcessTab('refund')
    setSelected(prev => ({ ...prev, status:'inspecting', condition:procForm.condition, processedBy:procForm.processedBy }))
  }

  function saveRefundDecision(decision) {
    const today = new Date().toISOString().slice(0,10)
    setRecords(prev => prev.map(r => r.id !== selected.id ? r : {
      ...r,
      condition: procForm.condition,
      goodsAction: procForm.goodsAction,
      resalableQty: Number(procForm.resalableQty),
      writeOffQty: Number(procForm.writeOffQty),
      inspectionNotes: procForm.inspectionNotes,
      processedBy: procForm.processedBy,
      processedOn: today,
      refundAmount: decision === 'reject' ? 0 : Number(procForm.refundAmount),
      refundMethod: procForm.refundMethod,
      refundRef: procForm.refundRef,
      status: decision === 'reject' ? 'rejected' : decision === 'approve' ? 'approved' : 'refunded',
    }))
    closeModal()
  }

  function confirmDelete() {
    setRecords(prev => prev.filter(r => r.id !== selected.id))
    closeModal()
  }

  // ── Condition auto-logic ──────────────────────────────────────────────────────
  function handleConditionChange(val) {
    const qty = selected?.qty || 0
    let goodsAction = 'back_to_stock', resalableQty = qty, writeOffQty = 0
    if (val === 'damaged')  { goodsAction = 'write_off';    resalableQty = 0;   writeOffQty = qty }
    if (val === 'partial')  { goodsAction = 'split';        resalableQty = 0;   writeOffQty = 0   }
    setProcForm(f => ({ ...f, condition:val, goodsAction, resalableQty, writeOffQty }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Customer Returns &amp; Refunds</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Orders</a></li>
          <li className="breadcrumb-item active">Returns &amp; Refunds</li>
        </ul>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Returns',       value:stats.total,                        icon:'ri-arrow-go-back-line',         color:'#405189', filter:'all'       },
          { label:'Pending / Inspecting',value:stats.pending,                      icon:'ri-time-line',                  color:'#f7b84b', filter:'pending'    },
          { label:'Awaiting Refund',     value:stats.approved,                     icon:'ri-checkbox-circle-line',       color:'#299cdb', filter:'approved'   },
          { label:'Total Refunded',      value:`₦${stats.refunded.toLocaleString()}`, icon:'ri-refund-2-line',           color:'#0ab39c', filter:'refunded'   },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }} onClick={() => setFilterStatus(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-18 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search by customer, ref, product…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth:260 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="inspecting">Inspecting</option>
              <option value="approved">Approved</option>
              <option value="refunded">Refunded</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openLog}>
              <i className="ri-add-line"></i> Log Return
            </button>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Return Ref</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Customer</th>
                  <th className="fw-medium text-muted">Order Ref</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Qty</th>
                  <th className="fw-medium text-muted">Reason</th>
                  <th className="fw-medium text-muted">Goods Condition</th>
                  <th className="fw-medium text-muted">Refund Amount</th>
                  <th className="fw-medium text-muted">Refund Method</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-5 text-muted">
                    <i className="ri-arrow-go-back-line fs-2 d-block mb-2"></i>No return records found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const sc = STATUS_CFG[r.status]
                  const cc = CONDITION_CFG[r.condition] || CONDITION_CFG.pending_check
                  return (
                    <tr key={r.id}>
                      <td>
                        <button className="btn btn-link p-0 fw-medium text-primary text-decoration-none" onClick={() => openView(r)}>
                          {r.ref}
                        </button>
                      </td>
                      <td>{r.date}</td>
                      <td>
                        <div className="fw-medium">{r.customer}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{r.phone}</div>
                      </td>
                      <td>
                        <span className="text-muted" style={{ fontSize:12 }}>{r.ordRef}</span>
                      </td>
                      <td>{r.product}</td>
                      <td className="fw-medium">{r.qty} {r.unit}</td>
                      <td style={{ maxWidth:160, whiteSpace:'normal', fontSize:12 }}>{r.reason}</td>
                      <td>
                        <span className={`badge ${cc.cls}`} style={{ fontSize:11 }}>{cc.label}</span>
                      </td>
                      <td className="fw-bold" style={{ color: r.refundAmount > 0 ? '#f06548' : '#adb5bd' }}>
                        {r.refundAmount > 0 ? `₦${r.refundAmount.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ fontSize:12 }}>
                        {r.refundMethod
                          ? <span className="badge bg-light text-dark border">{r.refundMethod}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td>
                        <div className="d-flex gap-1">
                          {(r.status === 'pending' || r.status === 'inspecting') && (
                            <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openProcess(r)} title="Process">
                              <i className="ri-check-double-line"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-soft-info p-1 px-2" onClick={() => openView(r)} title="View">
                            <i className="ri-eye-line"></i>
                          </button>
                          <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => openDelete(r)} title="Delete">
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
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} records</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LOG RETURN MODAL
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'log' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h6 className="modal-title mb-0 d-flex align-items-center gap-2">
                      <i className="ri-arrow-go-back-line text-warning"></i> Log Customer Return
                    </h6>
                    <div className="text-muted" style={{ fontSize:12 }}>Record a returned goods request from a customer</div>
                  </div>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveLog}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Return Ref</label>
                        <input className="form-control bg-light" readOnly value={logForm.ref} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={logForm.date}
                          onChange={e => setLogForm(f=>({...f,date:e.target.value}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Original Order Ref</label>
                        <input className="form-control" placeholder="ORD-2026-XXX" value={logForm.ordRef}
                          onChange={e => setLogForm(f=>({...f,ordRef:e.target.value}))} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Customer <span className="text-danger">*</span></label>
                        <select className="form-select" required value={logForm.customer}
                          onChange={e => setLogForm(f=>({...f,customer:e.target.value}))}>
                          {CUSTOMERS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Customer Phone</label>
                        <input className="form-control" placeholder="0800 000 0000" value={logForm.phone}
                          onChange={e => setLogForm(f=>({...f,phone:e.target.value}))} />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label fw-medium">Product Returned <span className="text-danger">*</span></label>
                        <select className="form-select" required value={logForm.product}
                          onChange={e => setLogForm(f=>({...f,product:e.target.value}))}>
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Qty <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" min="1" required value={logForm.qty}
                          onChange={e => setLogForm(f=>({...f,qty:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-medium">Unit</label>
                        <select className="form-select" value={logForm.unit}
                          onChange={e => setLogForm(f=>({...f,unit:e.target.value}))}>
                          {['kg','g','litre','pack','piece','bunch','bag','crate','tuber','bottle','can'].map(u=><option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-medium">Unit Price (₦)</label>
                        <input type="number" className="form-control" min="0" value={logForm.unitPrice}
                          onChange={e => setLogForm(f=>({...f,unitPrice:Number(e.target.value)}))} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Return Reason <span className="text-danger">*</span></label>
                        <select className="form-select" required value={logForm.reason}
                          onChange={e => setLogForm(f=>({...f,reason:e.target.value}))}>
                          {RETURN_REASONS.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Customer Notes</label>
                        <textarea className="form-control" rows="3" placeholder="What did the customer say about the issue?"
                          value={logForm.notes} onChange={e => setLogForm(f=>({...f,notes:e.target.value}))} style={{ fontSize:13 }} />
                      </div>
                    </div>

                    <div className="p-3 rounded mt-3" style={{ background:'#f0f9ff', border:'1px solid #bae6fd', fontSize:12 }}>
                      <i className="ri-information-line text-info me-1"></i>
                      After logging, click <strong>Process</strong> on the record to inspect goods and issue a refund decision.
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary w-100">Log Return</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          PROCESS MODAL (Inspection + Refund Decision)
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'process' && selected && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content">
                <div className="modal-header" style={{ background:'#f8f9fa' }}>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="ri-search-2-line fs-18 text-primary"></i>
                      <h6 className="modal-title mb-0 fw-bold">Process Return — {selected.ref}</h6>
                      <span className={`badge ${STATUS_CFG[selected.status]?.cls}`}>{STATUS_CFG[selected.status]?.label}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize:12 }}>
                      {selected.customer} · {selected.product} · {selected.qty} {selected.unit}
                    </div>
                  </div>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>

                <div className="modal-body p-0">
                  {/* Tab switcher */}
                  <div className="d-flex border-bottom" style={{ background:'#f0f3f9' }}>
                    {[
                      { id:'inspect', icon:'ri-search-2-line',  label:'1 · Inspect Goods'    },
                      { id:'refund',  icon:'ri-refund-2-line',  label:'2 · Refund Decision'  },
                    ].map(t => (
                      <button key={t.id}
                        className={`btn btn-sm flex-grow-1 rounded-0 d-flex align-items-center justify-content-center gap-2 py-3
                          ${processTab===t.id ? 'btn-primary' : 'btn-link text-muted text-decoration-none'}`}
                        style={{ fontSize:13, fontWeight: processTab===t.id ? 600 : 400 }}
                        onClick={() => setProcessTab(t.id)}>
                        <i className={t.icon}></i> {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="row g-0">
                    {/* LEFT: Return summary (always shown) */}
                    <div className="col-lg-4 p-4 border-end" style={{ background:'#fafbfc' }}>
                      <h6 className="fw-semibold mb-3 text-muted" style={{ fontSize:12, letterSpacing:1 }}>RETURN DETAILS</h6>

                      <div className="card mb-3" style={{ background:'#fff8ec', border:'1px solid #f7b84b33' }}>
                        <div className="card-body py-3">
                          <div className="fw-bold mb-1">{selected.product}</div>
                          <div className="text-muted mb-3" style={{ fontSize:12 }}>{selected.customer} · {selected.ordRef}</div>
                          <div className="row g-2">
                            <div className="col-4">
                              <div style={{ fontSize:11, color:'#adb5bd' }}>QTY</div>
                              <div className="fw-bold">{selected.qty} {selected.unit}</div>
                            </div>
                            <div className="col-4">
                              <div style={{ fontSize:11, color:'#adb5bd' }}>UNIT PRICE</div>
                              <div className="fw-bold">₦{selected.unitPrice?.toLocaleString()}</div>
                            </div>
                            <div className="col-4">
                              <div style={{ fontSize:11, color:'#adb5bd' }}>TOTAL</div>
                              <div className="fw-bold text-danger">₦{selected.totalValue?.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 p-3 rounded border" style={{ fontSize:12 }}>
                        <div className="fw-medium mb-2 text-muted" style={{ fontSize:11 }}>CUSTOMER COMPLAINT</div>
                        <div className="fw-medium mb-1">{selected.reason}</div>
                        {selected.notes && <div className="text-muted fst-italic">"{selected.notes}"</div>}
                      </div>

                      <div className="p-3 rounded border" style={{ fontSize:12 }}>
                        <div className="fw-medium mb-2 text-muted" style={{ fontSize:11 }}>RETURN INFO</div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Return Date</span><span>{selected.date}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Phone</span><span>{selected.phone || '—'}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Order Ref</span><span>{selected.ordRef || '—'}</span></div>
                      </div>
                    </div>

                    {/* RIGHT: Inspection / Refund tabs */}
                    <div className="col-lg-8 p-4">

                      {/* ── INSPECTION TAB ── */}
                      {processTab === 'inspect' && (
                        <>
                          <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                            <i className="ri-search-2-line text-primary"></i> Goods Inspection
                          </h6>

                          <div className="mb-3">
                            <label className="form-label fw-medium">Inspected By</label>
                            <select className="form-select form-select-sm" value={procForm.processedBy}
                              onChange={e => setProcForm(f=>({...f,processedBy:e.target.value}))}>
                              {STAFF.map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-medium">Goods Condition <span className="text-danger">*</span></label>
                            <div className="row g-2">
                              {[
                                { val:'resalable', icon:'ri-checkbox-circle-line', color:'#0ab39c', title:'Resalable', desc:'Goods are in good condition, can go back to stock' },
                                { val:'damaged',   icon:'ri-close-circle-line',    color:'#f06548', title:'Damaged / Spoiled', desc:'Goods cannot be resold — write off to Lost & Damaged' },
                                { val:'partial',   icon:'ri-indeterminate-circle-line', color:'#f7b84b', title:'Partially Good', desc:'Split — some back to stock, rest written off' },
                              ].map(opt => (
                                <div className="col-md-4" key={opt.val}>
                                  <div className="p-3 rounded border cursor-pointer text-center"
                                    style={{
                                      borderColor: procForm.condition === opt.val ? opt.color : '#dee2e6',
                                      background: procForm.condition === opt.val ? `${opt.color}12` : '#fff',
                                      cursor:'pointer',
                                    }}
                                    onClick={() => handleConditionChange(opt.val)}>
                                    <i className={`${opt.icon} fs-22 d-block mb-1`} style={{ color:opt.color }}></i>
                                    <div className="fw-medium" style={{ fontSize:13, color:opt.color }}>{opt.title}</div>
                                    <div className="text-muted mt-1" style={{ fontSize:11 }}>{opt.desc}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Qty split for partial */}
                          {procForm.condition === 'partial' && (
                            <div className="row g-3 mb-3 p-3 rounded" style={{ background:'#fff8ec', border:'1px solid #f7b84b44' }}>
                              <div className="col-6">
                                <label className="form-label fw-medium text-success" style={{ fontSize:13 }}>
                                  <i className="ri-arrow-down-circle-line me-1"></i>Back to Stock (qty)
                                </label>
                                <input type="number" className="form-control form-control-sm" min="0" max={selected.qty}
                                  value={procForm.resalableQty}
                                  onChange={e => setProcForm(f=>({...f,resalableQty:Number(e.target.value),writeOffQty:selected.qty-Number(e.target.value)}))} />
                              </div>
                              <div className="col-6">
                                <label className="form-label fw-medium text-danger" style={{ fontSize:13 }}>
                                  <i className="ri-error-warning-line me-1"></i>Write Off (qty)
                                </label>
                                <input type="number" className="form-control form-control-sm bg-light" readOnly
                                  value={selected.qty - Number(procForm.resalableQty)} />
                              </div>
                            </div>
                          )}

                          {procForm.condition !== 'partial' && (
                            <div className="mb-3 p-3 rounded d-flex align-items-center gap-3"
                              style={{ background:'#f8f9fa', border:'1px solid #dee2e6', fontSize:13 }}>
                              <i className={`fs-18 ${procForm.condition==='resalable'?'ri-arrow-down-circle-line text-success':'ri-error-warning-line text-danger'}`}></i>
                              <span>
                                All <strong>{selected.qty} {selected.unit}</strong> will be{' '}
                                {procForm.condition==='resalable' ? <span className="text-success fw-medium">returned to stock</span> : <span className="text-danger fw-medium">written off to Lost &amp; Damaged</span>}.
                              </span>
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="form-label fw-medium">Inspection Notes</label>
                            <textarea className="form-control" rows="4"
                              placeholder="Describe what was found during inspection — condition, evidence, decision rationale…"
                              value={procForm.inspectionNotes}
                              onChange={e => setProcForm(f=>({...f,inspectionNotes:e.target.value}))}
                              style={{ fontSize:13 }} />
                          </div>

                          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={saveInspection} disabled={!procForm.processedBy}>
                            <i className="ri-arrow-right-line"></i> Save Inspection &amp; Proceed to Refund
                          </button>
                        </>
                      )}

                      {/* ── REFUND DECISION TAB ── */}
                      {processTab === 'refund' && (
                        <>
                          <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                            <i className="ri-refund-2-line text-success"></i> Refund Decision
                          </h6>

                          {/* Inspection summary */}
                          <div className="mb-4 p-3 rounded" style={{ background:'#f8f9fa', border:'1px solid #dee2e6', fontSize:13 }}>
                            <div className="fw-medium mb-2 text-muted" style={{ fontSize:11 }}>INSPECTION OUTCOME</div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className={`badge ${CONDITION_CFG[procForm.condition]?.cls}`}>{CONDITION_CFG[procForm.condition]?.label}</span>
                              <span className="text-muted">·</span>
                              {procForm.condition === 'partial'
                                ? <span>{procForm.resalableQty} {selected.unit} back to stock · {selected.qty - procForm.resalableQty} {selected.unit} written off</span>
                                : <span>{CONDITION_CFG[procForm.condition]?.action}</span>}
                            </div>
                            {procForm.inspectionNotes && (
                              <div className="text-muted fst-italic mt-1" style={{ fontSize:12 }}>"{procForm.inspectionNotes}"</div>
                            )}
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-5">
                              <label className="form-label fw-medium">Refund Amount (₦)</label>
                              <input type="number" className="form-control" min="0" value={procForm.refundAmount}
                                onChange={e => setProcForm(f=>({...f,refundAmount:Number(e.target.value)}))} />
                              <div className="form-text">Max: ₦{selected.totalValue?.toLocaleString()}</div>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium">Refund Method</label>
                              <select className="form-select" value={procForm.refundMethod}
                                onChange={e => setProcForm(f=>({...f,refundMethod:e.target.value}))}>
                                {REFUND_METHODS.map(m=><option key={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label fw-medium">
                                {procForm.refundMethod === 'Bank Transfer' ? 'Transfer Ref' : procForm.refundMethod === 'Wallet Credit' ? 'Wallet Ref' : 'Receipt No'}
                              </label>
                              <input className="form-control" placeholder="Optional" value={procForm.refundRef}
                                onChange={e => setProcForm(f=>({...f,refundRef:e.target.value}))} />
                            </div>
                          </div>

                          {/* Decision buttons */}
                          <div className="p-3 rounded mt-2" style={{ background:'#f8f9fa', border:'1px solid #dee2e6' }}>
                            <div className="fw-medium mb-3" style={{ fontSize:13 }}>Final Decision</div>
                            <div className="row g-2">
                              <div className="col-md-4">
                                <button className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2"
                                  onClick={() => saveRefundDecision('approve')}>
                                  <i className="ri-checkbox-circle-line"></i> Approve
                                  <small className="opacity-75">(refund later)</small>
                                </button>
                              </div>
                              <div className="col-md-4">
                                <button className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2"
                                  onClick={() => saveRefundDecision('refunded')}
                                  disabled={!procForm.refundAmount}>
                                  <i className="ri-refund-2-line"></i> Approve &amp; Refund Now
                                </button>
                              </div>
                              <div className="col-md-4">
                                <button className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
                                  onClick={() => saveRefundDecision('reject')}>
                                  <i className="ri-close-circle-line"></i> Reject Return
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-light" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'view' && selected && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="modal-title mb-0 fw-bold">{selected.ref}</h6>
                      <span className={`badge ${STATUS_CFG[selected.status]?.cls}`}>{STATUS_CFG[selected.status]?.label}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize:12 }}>{selected.date} · {selected.customer}</div>
                  </div>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 rounded border h-100" style={{ fontSize:13 }}>
                        <div className="fw-medium mb-3 text-muted" style={{ fontSize:11 }}>RETURN DETAILS</div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Product</span><span className="fw-medium">{selected.product}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Qty Returned</span><span className="fw-medium">{selected.qty} {selected.unit}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Unit Price</span><span>₦{selected.unitPrice?.toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Total Value</span><span className="fw-bold text-danger">₦{selected.totalValue?.toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Order Ref</span><span>{selected.ordRef || '—'}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Reason</span><span style={{ maxWidth:160, textAlign:'right' }}>{selected.reason}</span></div>
                        {selected.notes && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="text-muted mb-1" style={{ fontSize:11 }}>CUSTOMER NOTES</div>
                            <div className="fst-italic">"{selected.notes}"</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 rounded border h-100" style={{ fontSize:13 }}>
                        <div className="fw-medium mb-3 text-muted" style={{ fontSize:11 }}>INSPECTION &amp; REFUND</div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Goods Condition</span>
                          <span className={`badge ${CONDITION_CFG[selected.condition]?.cls}`}>{CONDITION_CFG[selected.condition]?.label}</span>
                        </div>
                        {selected.condition === 'partial' && (
                          <>
                            <div className="d-flex justify-content-between mb-2"><span className="text-muted">Back to Stock</span><span className="text-success fw-medium">{selected.resalableQty} {selected.unit}</span></div>
                            <div className="d-flex justify-content-between mb-2"><span className="text-muted">Written Off</span><span className="text-danger fw-medium">{selected.writeOffQty} {selected.unit}</span></div>
                          </>
                        )}
                        {selected.condition === 'resalable' && selected.resalableQty > 0 && (
                          <div className="d-flex justify-content-between mb-2"><span className="text-muted">Back to Stock</span><span className="text-success fw-medium">{selected.resalableQty} {selected.unit}</span></div>
                        )}
                        {selected.condition === 'damaged' && (
                          <div className="d-flex justify-content-between mb-2"><span className="text-muted">Written Off</span><span className="text-danger fw-medium">{selected.writeOffQty} {selected.unit}</span></div>
                        )}
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Refund Amount</span><span className="fw-bold text-danger">{selected.refundAmount > 0 ? `₦${selected.refundAmount.toLocaleString()}` : '—'}</span></div>
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Refund Method</span><span>{selected.refundMethod || '—'}</span></div>
                        {selected.refundRef && <div className="d-flex justify-content-between mb-2"><span className="text-muted">Ref / Receipt</span><span>{selected.refundRef}</span></div>}
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Processed By</span><span>{selected.processedBy || '—'}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Processed On</span><span>{selected.processedOn || '—'}</span></div>
                        {selected.inspectionNotes && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="text-muted mb-1" style={{ fontSize:11 }}>INSPECTION NOTES</div>
                            <div className="fst-italic text-muted">"{selected.inspectionNotes}"</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer gap-2">
                  {(selected.status === 'pending' || selected.status === 'inspecting') && (
                    <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => { closeModal(); setTimeout(() => openProcess(selected), 50) }}>
                      <i className="ri-check-double-line"></i> Process Return
                    </button>
                  )}
                  <button className="btn btn-light" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────── */}
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
                <h6 className="mb-1">Delete Return?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{selected?.ref} — {selected?.customer}</p>
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
