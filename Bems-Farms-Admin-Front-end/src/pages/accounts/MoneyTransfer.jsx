import { useState } from 'react'

const fmt  = n => `₦${Number(n).toLocaleString()}`
const fmtD = s => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

const ACCOUNTS = [
  { id:'ACC-001', bank:'GTBank',       name:'Bems Farms Ops',         no:'**** 6789', balance:4_850_000, color:'#f97316' },
  { id:'ACC-002', bank:'Access Bank',  name:'Bems Farms Payroll',     no:'**** 4321', balance:1_320_000, color:'#e11d48' },
  { id:'ACC-003', bank:'First Bank',   name:'Bems Farms Tax Reserve', no:'**** 3344', balance:2_100_000, color:'#1d4ed8' },
  { id:'ACC-004', bank:'Zenith Bank',  name:'Bems Farms POS Settle',  no:'**** 4567', balance:680_000,   color:'#7c3aed' },
]

const REASONS = ['Payroll Funding','Tax Reserve Top-up','Supplier Payment','Operational Expenses',
  'POS Settlement Reconciliation','Driver Allowance','Emergency Fund','Other']

const STATUS_CFG = {
  completed: { label:'Completed', cls:'bg-success-subtle text-success border-success-subtle', icon:'ri-check-double-line' },
  pending:   { label:'Pending',   cls:'bg-warning-subtle text-warning border-warning-subtle', icon:'ri-time-line' },
  failed:    { label:'Failed',    cls:'bg-danger-subtle text-danger border-danger-subtle',     icon:'ri-close-circle-line' },
  cancelled: { label:'Cancelled', cls:'bg-secondary-subtle text-secondary border-secondary-subtle', icon:'ri-forbid-2-line' },
}

const INITIAL_TRANSFERS = [
  { id:'TXF-0031', date:'2026-06-25', from:'ACC-001', to:'ACC-002', amount:1_200_000, reason:'Payroll Funding',              note:'June 2026 staff salary transfer',               status:'completed', initiatedBy:'Admin (Seun)' },
  { id:'TXF-0030', date:'2026-06-20', from:'ACC-001', to:'ACC-003', amount:350_000,  reason:'Tax Reserve Top-up',            note:'Monthly VAT + income tax reserve',             status:'completed', initiatedBy:'Admin (Seun)' },
  { id:'TXF-0029', date:'2026-06-19', from:'ACC-004', to:'ACC-001', amount:500_000,  reason:'POS Settlement Reconciliation', note:'Weekly POS settlement sweep to ops',           status:'completed', initiatedBy:'Finance Manager' },
  { id:'TXF-0028', date:'2026-06-17', from:'ACC-001', to:'ACC-002', amount:125_000,  reason:'Driver Allowance',              note:'May 2026 driver bonus + allowance',            status:'completed', initiatedBy:'Operations Manager' },
  { id:'TXF-0027', date:'2026-06-15', from:'ACC-001', to:'ACC-003', amount:280_000,  reason:'Tax Reserve Top-up',            note:'FIRS VAT provision — June',                   status:'completed', initiatedBy:'Admin (Seun)' },
  { id:'TXF-0026', date:'2026-06-10', from:'ACC-004', to:'ACC-001', amount:700_000,  reason:'POS Settlement Reconciliation', note:'POS settlement — Victoria Island & LI store', status:'completed', initiatedBy:'Finance Manager' },
  { id:'TXF-0025', date:'2026-06-27', from:'ACC-001', to:'ACC-002', amount:85_000,   reason:'Operational Expenses',          note:'Packaging materials procurement funds',        status:'pending',   initiatedBy:'Admin (Seun)' },
  { id:'TXF-0024', date:'2026-06-26', from:'ACC-001', to:'ACC-004', amount:200_000,  reason:'POS Settlement Reconciliation', note:'Advance to POS account — weekend trade',      status:'pending',   initiatedBy:'Finance Manager' },
  { id:'TXF-0023', date:'2026-06-20', from:'ACC-001', to:'ACC-003', amount:500_000,  reason:'Emergency Fund',                note:'Blocked — insufficient ops balance',           status:'failed',    initiatedBy:'Admin (Seun)' },
  { id:'TXF-0022', date:'2026-06-18', from:'ACC-002', to:'ACC-001', amount:60_000,   reason:'Other',                         note:'Cancelled — duplicate entry',                  status:'cancelled', initiatedBy:'Admin (Seun)' },
]

const BLANK_FORM = {
  from: 'ACC-001', to: 'ACC-002', amount: '', reason: 'Payroll Funding', note: '',
}

export default function MoneyTransfer() {
  const [transfers, setTransfers] = useState(INITIAL_TRANSFERS)
  const [activeTab, setTab]       = useState('all')
  const [search, setSearch]       = useState('')
  const [activeModal, setModal]   = useState(null) // 'new'|'view'|'cancel'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(BLANK_FORM)
  const [step, setStep]           = useState(1) // 1=form, 2=confirm

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM); setStep(1) }

  const openView   = t => { setSelected(t); setModal('view') }
  const openCancel = t => { setSelected(t); setModal('cancel') }
  const openNew    = () => { setForm(BLANK_FORM); setStep(1); setModal('new') }

  const getAcc = id => ACCOUNTS.find(a => a.id === id)

  const submitTransfer = () => {
    const newT = {
      ...form,
      id: `TXF-${String(transfers.length + 32).padStart(4,'0')}`,
      date: new Date().toISOString().split('T')[0],
      amount: Number(form.amount),
      status: 'pending',
      initiatedBy: 'Admin (Seun)',
    }
    setTransfers(prev => [newT, ...prev])
    closeModal()
  }

  const cancelTransfer = () => {
    setTransfers(prev => prev.map(t => t.id === selected.id ? { ...t, status:'cancelled' } : t))
    closeModal()
  }

  const tabFilter = {
    all:       () => true,
    pending:   t  => t.status === 'pending',
    completed: t  => t.status === 'completed',
    failed:    t  => ['failed','cancelled'].includes(t.status),
  }

  const filtered = transfers.filter(tabFilter[activeTab]).filter(t => {
    const q = search.toLowerCase()
    const from = getAcc(t.from)
    const to   = getAcc(t.to)
    return !q || t.id.toLowerCase().includes(q)
      || (from?.bank.toLowerCase().includes(q)) || (to?.bank.toLowerCase().includes(q))
      || t.reason.toLowerCase().includes(q)
  })

  // Stats
  const total    = transfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0)
  const pending  = transfers.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const failed   = transfers.filter(t => ['failed','cancelled'].includes(t.status)).length
  const countTxf = transfers.length

  const pendingCount   = transfers.filter(t => t.status === 'pending').length
  const completedCount = transfers.filter(t => t.status === 'completed').length
  const failedCount    = transfers.filter(t => ['failed','cancelled'].includes(t.status)).length

  const AccCard = ({ accId, selected: sel, onClick }) => {
    const acc = getAcc(accId)
    if (!acc) return null
    return (
      <div onClick={onClick} style={{
        border: `2px solid ${sel ? acc.color : '#e2e8f0'}`,
        borderRadius:8, padding:'10px 12px', cursor:'pointer',
        background: sel ? `${acc.color}10` : '#fff', transition:'all 0.15s',
      }}>
        <div className="d-flex align-items-center gap-2">
          <div style={{ width:32, height:32, borderRadius:6, background:acc.color,
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, flexShrink:0 }}>
            {acc.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
          </div>
          <div>
            <div className="fw-medium" style={{ fontSize:12 }}>{acc.bank}</div>
            <div className="text-muted" style={{ fontSize:11 }}>{acc.no}</div>
          </div>
        </div>
        <div className="mt-2 fw-bold" style={{ fontSize:13, color: sel ? acc.color : '#374151' }}>
          {fmt(acc.balance)}
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Money Transfer</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Money Transfer</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Transferred', val:fmt(total),    icon:'ri-send-plane-line',        color:'#3b82f6', bg:'#eff6ff' },
          { label:'Pending Transfers', val:fmt(pending),  icon:'ri-time-line',              color:'#f59e0b', bg:'#fffbeb' },
          { label:'Total Transactions',val:countTxf,      icon:'ri-exchange-funds-line',    color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Completed',         val:completedCount,icon:'ri-check-double-line',      color:'#22c55e', bg:'#f0fdf4' },
          { label:'Failed / Cancelled',val:failedCount,   icon:'ri-close-circle-line',      color:'#ef4444', bg:'#fef2f2' },
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

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="alert border d-flex align-items-center gap-3 mb-4"
          style={{ background:'#fffbeb', borderColor:'#fbbf24' }}>
          <i className="ri-time-line fs-20 text-warning flex-shrink-0"/>
          <div>
            <div className="fw-medium" style={{ fontSize:13 }}>
              {pendingCount} transfer{pendingCount > 1 ? 's' : ''} pending · <strong>{fmt(pending)}</strong> in transit
            </div>
            <div className="text-muted" style={{ fontSize:11 }}>Transfers usually settle within 1 business day.</div>
          </div>
          <button className="btn btn-sm btn-warning ms-auto" onClick={() => setTab('pending')}>View Pending</button>
        </div>
      )}

      {/* Table card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            {/* Tabs */}
            <div className="d-flex gap-1">
              {[
                { key:'all',       label:`All (${transfers.length})` },
                { key:'pending',   label:`Pending (${pendingCount})` },
                { key:'completed', label:`Completed (${completedCount})` },
                { key:'failed',    label:`Failed (${failedCount})` },
              ].map(t => (
                <button key={t.key}
                  className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize:12 }} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="d-flex gap-2">
              <div className="position-relative">
                <input className="form-control ps-9" style={{ width:220 }}
                  placeholder="Search ID, bank, reason…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                <i className="ri-search-line position-absolute top-50 translate-middle-y ms-3" style={{ fontSize:14, color:'#94a3b8' }}/>
              </div>
              <button className="btn btn-primary" onClick={openNew}>
                <i className="ri-send-plane-line me-1"/>New Transfer
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth:820 }}>
              <thead className="bg-light">
                <tr>
                  <th className="fw-medium text-muted ps-4" style={{ fontSize:12 }}>Ref / Date</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>From Account</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}/>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>To Account</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Reason</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Status</th>
                  <th className="fw-medium text-muted text-end pe-3" style={{ fontSize:12 }}>Amount</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No transfers found.</td></tr>
                )}
                {filtered.map(t => {
                  const fromAcc = getAcc(t.from)
                  const toAcc   = getAcc(t.to)
                  const cfg     = STATUS_CFG[t.status] || STATUS_CFG.pending
                  return (
                    <tr key={t.id} className="border-bottom">
                      <td className="ps-4">
                        <div className="fw-medium" style={{ fontSize:12 }}>{t.id}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{fmtD(t.date)}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:28, height:28, borderRadius:6, background: fromAcc?.color || '#94a3b8',
                            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {fromAcc?.bank.split(' ').map(w=>w[0]).join('').slice(0,2) || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize:12 }}>{fromAcc?.bank || '—'}</div>
                            <div className="text-muted" style={{ fontSize:11 }}>{fromAcc?.no || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize:18 }}>→</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:28, height:28, borderRadius:6, background: toAcc?.color || '#94a3b8',
                            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {toAcc?.bank.split(' ').map(w=>w[0]).join('').slice(0,2) || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize:12 }}>{toAcc?.bank || '—'}</div>
                            <div className="text-muted" style={{ fontSize:11 }}>{toAcc?.no || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-muted" style={{ fontSize:12 }}>{t.reason}</span></td>
                      <td>
                        <span className={`badge border ${cfg.cls}`} style={{ fontSize:11 }}>
                          <i className={`${cfg.icon} me-1`}/>{cfg.label}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <span className="fw-bold" style={{ fontSize:14 }}>{fmt(t.amount)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                            onClick={() => openView(t)}><i className="ri-eye-line" style={{ fontSize:12 }}/></button>
                          {t.status === 'pending' && (
                            <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px', fontSize:11 }}
                              onClick={() => openCancel(t)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-light">
                  <tr>
                    <td colSpan={6} className="ps-4 text-muted fw-medium" style={{ fontSize:12 }}>
                      {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td className="text-end pe-3 fw-bold" style={{ fontSize:13 }}>
                      {fmt(filtered.reduce((s,t)=>s+t.amount, 0))}
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
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:480 }}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold fs-15"><i className="ri-exchange-funds-line me-2"/>Transfer Details</div>
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.id} · {fmtD(selected.date)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                {/* Amount + status */}
                <div className="text-center mb-4">
                  <div className="fw-bold" style={{ fontSize:30 }}>{fmt(selected.amount)}</div>
                  <span className={`badge border ${STATUS_CFG[selected.status]?.cls} mt-1`} style={{ fontSize:12 }}>
                    <i className={`${STATUS_CFG[selected.status]?.icon} me-1`}/>{STATUS_CFG[selected.status]?.label}
                  </span>
                </div>

                {/* From → To visual */}
                <div className="d-flex align-items-center gap-3 mb-4 p-3 border rounded" style={{ background:'#f8fafc' }}>
                  {[getAcc(selected.from), getAcc(selected.to)].map((acc, i, arr) => (
                    <>
                      <div key={acc?.id || i} className="text-center flex-fill">
                        <div className="d-inline-flex align-items-center justify-content-center mb-1"
                          style={{ width:36, height:36, borderRadius:8, background:acc?.color || '#94a3b8', color:'#fff', fontSize:12, fontWeight:700 }}>
                          {acc?.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
                        </div>
                        <div className="fw-medium" style={{ fontSize:12 }}>{acc?.bank}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{acc?.no}</div>
                        <div className="text-muted" style={{ fontSize:10 }}>{i === 0 ? 'FROM' : 'TO'}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <div key="arrow" className="text-muted fs-20">→</div>
                      )}
                    </>
                  ))}
                </div>

                {[
                  ['Transfer ID', selected.id],
                  ['Date', fmtD(selected.date)],
                  ['Reason', selected.reason],
                  ['Initiated By', selected.initiatedBy],
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
                  {selected.status === 'pending' && (
                    <button className="btn btn-danger flex-fill" onClick={() => { closeModal(); openCancel(selected) }}>
                      <i className="ri-forbid-2-line me-1"/>Cancel Transfer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NEW TRANSFER */}
          {activeModal === 'new' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15">
                    <i className="ri-send-plane-line me-2"/>
                    {step === 1 ? 'New Transfer — Details' : 'Confirm Transfer'}
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
                <div className="d-flex gap-1 mt-3">
                  {[1, 2].map(n => (
                    <div key={n} style={{
                      flex:1, height:4, borderRadius:2,
                      background: n <= step ? '#3b82f6' : 'rgba(255,255,255,0.25)'
                    }}/>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {step === 1 && (
                  <>
                    <div className="mb-4">
                      <label className="form-label small fw-medium mb-2">From Account <span className="text-danger">*</span></label>
                      <div className="row g-2">
                        {ACCOUNTS.map(acc => (
                          <div key={acc.id} className="col-6">
                            <div onClick={() => form.to !== acc.id && setForm(f => ({ ...f, from: acc.id }))}
                              style={{
                                border: `2px solid ${form.from === acc.id ? acc.color : '#e2e8f0'}`,
                                borderRadius:8, padding:'10px 12px', cursor: form.to === acc.id ? 'not-allowed' : 'pointer',
                                background: form.from === acc.id ? `${acc.color}12` : '#fff',
                                opacity: form.to === acc.id ? 0.4 : 1,
                              }}>
                              <div className="d-flex align-items-center gap-2">
                                <div style={{ width:28, height:28, borderRadius:6, background:acc.color,
                                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:10, fontWeight:700 }}>
                                  {acc.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
                                </div>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:500 }}>{acc.bank}</div>
                                  <div className="text-muted" style={{ fontSize:10 }}>{acc.no}</div>
                                </div>
                              </div>
                              <div className="fw-bold mt-1" style={{ fontSize:12, color: form.from === acc.id ? acc.color : '#374151' }}>
                                {fmt(acc.balance)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-medium mb-2">To Account <span className="text-danger">*</span></label>
                      <div className="row g-2">
                        {ACCOUNTS.map(acc => (
                          <div key={acc.id} className="col-6">
                            <div onClick={() => form.from !== acc.id && setForm(f => ({ ...f, to: acc.id }))}
                              style={{
                                border: `2px solid ${form.to === acc.id ? acc.color : '#e2e8f0'}`,
                                borderRadius:8, padding:'10px 12px', cursor: form.from === acc.id ? 'not-allowed' : 'pointer',
                                background: form.to === acc.id ? `${acc.color}12` : '#fff',
                                opacity: form.from === acc.id ? 0.4 : 1,
                              }}>
                              <div className="d-flex align-items-center gap-2">
                                <div style={{ width:28, height:28, borderRadius:6, background:acc.color,
                                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:10, fontWeight:700 }}>
                                  {acc.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
                                </div>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:500 }}>{acc.bank}</div>
                                  <div className="text-muted" style={{ fontSize:10 }}>{acc.no}</div>
                                </div>
                              </div>
                              <div className="fw-bold mt-1" style={{ fontSize:12, color: form.to === acc.id ? acc.color : '#374151' }}>
                                {fmt(acc.balance)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label small fw-medium">Amount (₦) <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <span className="input-group-text fw-bold">₦</span>
                          <input className="form-control" type="number" placeholder="0.00"
                            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/>
                        </div>
                        {form.from && form.amount && Number(form.amount) > (getAcc(form.from)?.balance || 0) && (
                          <div className="text-danger" style={{ fontSize:11, marginTop:4 }}>
                            <i className="ri-error-warning-line me-1"/>Amount exceeds available balance
                          </div>
                        )}
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-medium">Transfer Reason</label>
                        <select className="form-select" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                          {REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-medium">Notes (optional)</label>
                        <textarea className="form-control" rows={2} placeholder="Add any additional notes…"
                          value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                      <button className="btn btn-primary flex-fill"
                        onClick={() => setStep(2)}
                        disabled={!form.amount || !form.from || !form.to || form.from === form.to
                          || Number(form.amount) > (getAcc(form.from)?.balance || 0)}>
                        Review Transfer →
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="alert alert-warning border mb-4" style={{ fontSize:12 }}>
                      <i className="ri-alarm-warning-line me-1"/>
                      <strong>Please review carefully.</strong> Transfers between internal accounts are processed immediately and cannot be reversed without a new transfer.
                    </div>

                    <div className="border rounded p-3 mb-4" style={{ background:'#f8fafc' }}>
                      <div className="text-center mb-3">
                        <div className="fw-bold" style={{ fontSize:26 }}>{fmt(form.amount)}</div>
                        <div className="text-muted" style={{ fontSize:12 }}>to be transferred</div>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="text-center">
                          <div className="d-inline-flex align-items-center justify-content-center mb-1"
                            style={{ width:40, height:40, borderRadius:8, background:getAcc(form.from)?.color, color:'#fff', fontSize:13, fontWeight:700 }}>
                            {getAcc(form.from)?.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{getAcc(form.from)?.bank}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{getAcc(form.from)?.no}</div>
                        </div>
                        <div style={{ fontSize:22, color:'#94a3b8' }}>→</div>
                        <div className="text-center">
                          <div className="d-inline-flex align-items-center justify-content-center mb-1"
                            style={{ width:40, height:40, borderRadius:8, background:getAcc(form.to)?.color, color:'#fff', fontSize:13, fontWeight:700 }}>
                            {getAcc(form.to)?.bank.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{getAcc(form.to)?.bank}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{getAcc(form.to)?.no}</div>
                        </div>
                      </div>
                    </div>

                    {[
                      ['Reason', form.reason],
                      ['Initiated By', 'Admin (Seun)'],
                      ['Date', new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="d-flex justify-content-between py-2 border-bottom">
                        <span className="text-muted" style={{ fontSize:12 }}>{lbl}</span>
                        <span className="fw-medium" style={{ fontSize:12 }}>{val}</span>
                      </div>
                    ))}
                    {form.note && (
                      <div className="alert alert-light border mt-3" style={{ fontSize:12 }}>
                        <i className="ri-sticky-note-line me-1"/>{form.note}
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-4">
                      <button className="btn btn-outline-secondary flex-fill" onClick={() => setStep(1)}>← Back</button>
                      <button className="btn btn-primary flex-fill" onClick={submitTransfer}>
                        <i className="ri-send-plane-line me-1"/>Confirm Transfer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* CANCEL TRANSFER */}
          {activeModal === 'cancel' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-forbid-2-line me-2"/>Cancel Transfer</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#fee2e2' }}>
                  <i className="ri-forbid-2-line fs-24 text-danger"/>
                </div>
                <h5>Cancel this transfer?</h5>
                <p className="text-muted small mb-4">
                  <strong>{selected.id}</strong> · {fmt(selected.amount)}<br/>
                  <strong>{getAcc(selected.from)?.bank}</strong> → <strong>{getAcc(selected.to)?.bank}</strong><br/>
                  This transfer will be marked as cancelled and no funds will move.
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Keep Transfer</button>
                  <button className="btn btn-danger flex-fill" onClick={cancelTransfer}>
                    <i className="ri-forbid-2-line me-1"/>Cancel Transfer
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
