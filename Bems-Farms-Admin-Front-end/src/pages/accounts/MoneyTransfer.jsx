import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const ini  = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const ACC_COLORS = ['#f97316', '#e11d48', '#1d4ed8', '#7c3aed', '#059669', '#0891b2']
const colorFor = (id) => ACC_COLORS[Number(id) % ACC_COLORS.length]

const REASONS = ['Payroll Funding','Tax Reserve Top-up','Supplier Payment','Operational Expenses',
  'POS Settlement Reconciliation','Driver Allowance','Emergency Fund','Other']

// Real transfers (POST /admin/accounts/transfers) are processed atomically and
// stored with status='completed' at creation — there is no pending/failed/
// cancelled state on the backend, and no cancel endpoint. A transfer either
// succeeds immediately or is rejected outright (e.g. insufficient balance).
const STATUS_CFG = {
  completed: { label:'Completed', cls:'bg-success-subtle text-success border-success-subtle', icon:'ri-check-double-line' },
}

function mapTransfer(t) {
  return {
    id: t.id,
    reference: t.reference,
    date: t.date,
    fromId: t.from_account_id,
    toId: t.to_account_id,
    fromLabel: t.from_bank ? `${t.from_bank} — ${t.from_account}` : '—',
    toLabel: t.to_bank ? `${t.to_bank} — ${t.to_account}` : '—',
    amount: Number(t.amount || 0),
    fee: Number(t.fee || 0),
    reason: t.description || '',
    status: t.status || 'completed',
    initiatedBy: t.created_by_name || '—',
  }
}

const BLANK_FORM = { from: '', to: '', amount: '', reason: 'Payroll Funding', note: '' }

export default function MoneyTransfer() {
  const [transfers, setTransfers] = useState([])
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch]       = useState('')
  const [activeModal, setModal]   = useState(null) // 'new'|'view'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(BLANK_FORM)
  const [step, setStep]           = useState(1) // 1=form, 2=confirm

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/admin/accounts/transfers', { params: { limit: 200 } }),
        api.get('/admin/accounts/bank-accounts'),
      ])
      setTransfers((tRes.data?.transfers || []).map(mapTransfer))
      setAccounts((aRes.data?.bank_accounts || []).filter(a => a.status === 'active'))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM); setStep(1) }

  const openView = t => { setSelected(t); setModal('view') }
  const openNew  = () => { setForm(BLANK_FORM); setStep(1); setModal('new') }

  const getAcc = id => accounts.find(a => String(a.id) === String(id))

  const submitTransfer = async () => {
    setSubmitting(true)
    try {
      await api.post('/admin/accounts/transfers', {
        from_account_id: Number(form.from),
        to_account_id: Number(form.to),
        amount: Number(form.amount),
        description: form.note ? `${form.reason} — ${form.note}` : form.reason,
      })
      await load()
      closeModal()
    } catch (e) {
      alert(e?.response?.data?.message || 'Transfer failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = transfers.filter(t => {
    const q = search.toLowerCase()
    return !q || t.reference.toLowerCase().includes(q)
      || t.fromLabel.toLowerCase().includes(q) || t.toLabel.toLowerCase().includes(q)
      || t.reason.toLowerCase().includes(q)
  })

  // Stats
  const total    = transfers.reduce((s, t) => s + t.amount, 0)
  const countTxf = transfers.length

  const AccCard = ({ acc, selected: sel, disabled, onClick }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      border: `2px solid ${sel ? colorFor(acc.id) : '#e2e8f0'}`,
      borderRadius:8, padding:'10px 12px', cursor: disabled ? 'not-allowed' : 'pointer',
      background: sel ? `${colorFor(acc.id)}12` : '#fff', opacity: disabled ? 0.4 : 1, transition:'all 0.15s',
    }}>
      <div className="d-flex align-items-center gap-2">
        <div style={{ width:28, height:28, borderRadius:6, background:colorFor(acc.id),
          color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:700, flexShrink:0 }}>
          {ini(acc.bank_name)}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:500 }}>{acc.bank_name}</div>
          <div className="text-muted" style={{ fontSize:10 }}>{acc.account_name}</div>
        </div>
      </div>
      <div className="fw-bold mt-1" style={{ fontSize:12, color: sel ? colorFor(acc.id) : '#374151' }}>
        {fmt(acc.balance)}
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Money Transfer</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Accounts</Link></li>
          <li className="breadcrumb-item active">Money Transfer</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load transfers.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Transferred (loaded)', val:fmt(total),    icon:'ri-send-plane-line',        color:'#3b82f6', bg:'#eff6ff' },
          { label:'Transfers Loaded',val:countTxf,      icon:'ri-exchange-funds-line',    color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Active Accounts', val:accounts.length, icon:'ri-bank-line',            color:'#22c55e', bg:'#f0fdf4' },
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

      <div className="alert alert-light border d-flex align-items-center gap-3 mb-4" style={{ fontSize:12 }}>
        <i className="ri-information-line fs-20 text-muted flex-shrink-0"/>
        Transfers between accounts process immediately — there's no pending queue or cancel step. Double-check before confirming.
      </div>

      {/* Table card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="position-relative">
              <input className="form-control ps-9" style={{ width:240 }}
                placeholder="Search ref, bank, reason…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              <i className="ri-search-line position-absolute top-50 translate-middle-y ms-3" style={{ fontSize:14, color:'#94a3b8' }}/>
            </div>
            <button className="btn btn-primary" onClick={openNew} disabled={accounts.length < 2}>
              <i className="ri-send-plane-line me-1"/>New Transfer
            </button>
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
                {loading ? (
                  <tr><td colSpan={8} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    Loading transfers…
                  </td></tr>
                ) : filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No transfers found.</td></tr>
                )}
                {!loading && filtered.map(t => {
                  const cfg = STATUS_CFG[t.status] || STATUS_CFG.completed
                  return (
                    <tr key={t.id} className="border-bottom">
                      <td className="ps-4">
                        <div className="fw-medium" style={{ fontSize:12 }}>{t.reference}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{fmtD(t.date)}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:28, height:28, borderRadius:6, background: colorFor(t.fromId),
                            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {ini(t.fromLabel)}
                          </div>
                          <div style={{ fontSize:12 }}>{t.fromLabel}</div>
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize:18 }}>→</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:28, height:28, borderRadius:6, background: colorFor(t.toId),
                            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:700, flexShrink:0 }}>
                            {ini(t.toLabel)}
                          </div>
                          <div style={{ fontSize:12 }}>{t.toLabel}</div>
                        </div>
                      </td>
                      <td><span className="text-muted" style={{ fontSize:12 }}>{t.reason || '—'}</span></td>
                      <td>
                        <span className={`badge border ${cfg.cls}`} style={{ fontSize:11 }}>
                          <i className={`${cfg.icon} me-1`}/>{cfg.label}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <span className="fw-bold" style={{ fontSize:14 }}>{fmt(t.amount)}</span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                          onClick={() => openView(t)}><i className="ri-eye-line" style={{ fontSize:12 }}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {!loading && filtered.length > 0 && (
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
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.reference} · {fmtD(selected.date)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="fw-bold" style={{ fontSize:30 }}>{fmt(selected.amount)}</div>
                  <span className={`badge border ${STATUS_CFG[selected.status]?.cls} mt-1`} style={{ fontSize:12 }}>
                    <i className={`${STATUS_CFG[selected.status]?.icon} me-1`}/>{STATUS_CFG[selected.status]?.label}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-3 mb-4 p-3 border rounded" style={{ background:'#f8fafc' }}>
                  <div className="text-center flex-fill">
                    <div className="d-inline-flex align-items-center justify-content-center mb-1"
                      style={{ width:36, height:36, borderRadius:8, background:colorFor(selected.fromId), color:'#fff', fontSize:12, fontWeight:700 }}>
                      {ini(selected.fromLabel)}
                    </div>
                    <div className="fw-medium" style={{ fontSize:12 }}>{selected.fromLabel}</div>
                    <div className="text-muted" style={{ fontSize:10 }}>FROM</div>
                  </div>
                  <div className="text-muted fs-20">→</div>
                  <div className="text-center flex-fill">
                    <div className="d-inline-flex align-items-center justify-content-center mb-1"
                      style={{ width:36, height:36, borderRadius:8, background:colorFor(selected.toId), color:'#fff', fontSize:12, fontWeight:700 }}>
                      {ini(selected.toLabel)}
                    </div>
                    <div className="fw-medium" style={{ fontSize:12 }}>{selected.toLabel}</div>
                    <div className="text-muted" style={{ fontSize:10 }}>TO</div>
                  </div>
                </div>

                {[
                  ['Reference', selected.reference],
                  ['Date', fmtD(selected.date)],
                  ['Reason', selected.reason || '—'],
                  ['Fee', fmt(selected.fee)],
                  ['Initiated By', selected.initiatedBy],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize:12 }}>{lbl}</span>
                    <span className="fw-medium" style={{ fontSize:12 }}>{val}</span>
                  </div>
                ))}
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Close</button>
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
                        {accounts.map(acc => (
                          <div key={acc.id} className="col-6">
                            <AccCard acc={acc} selected={String(form.from) === String(acc.id)}
                              disabled={String(form.to) === String(acc.id)}
                              onClick={() => setForm(f => ({ ...f, from: acc.id }))}/>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-medium mb-2">To Account <span className="text-danger">*</span></label>
                      <div className="row g-2">
                        {accounts.map(acc => (
                          <div key={acc.id} className="col-6">
                            <AccCard acc={acc} selected={String(form.to) === String(acc.id)}
                              disabled={String(form.from) === String(acc.id)}
                              onClick={() => setForm(f => ({ ...f, to: acc.id }))}/>
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
                            style={{ width:40, height:40, borderRadius:8, background:colorFor(form.from), color:'#fff', fontSize:13, fontWeight:700 }}>
                            {ini(getAcc(form.from)?.bank_name)}
                          </div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{getAcc(form.from)?.bank_name}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{getAcc(form.from)?.account_name}</div>
                        </div>
                        <div style={{ fontSize:22, color:'#94a3b8' }}>→</div>
                        <div className="text-center">
                          <div className="d-inline-flex align-items-center justify-content-center mb-1"
                            style={{ width:40, height:40, borderRadius:8, background:colorFor(form.to), color:'#fff', fontSize:13, fontWeight:700 }}>
                            {ini(getAcc(form.to)?.bank_name)}
                          </div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{getAcc(form.to)?.bank_name}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{getAcc(form.to)?.account_name}</div>
                        </div>
                      </div>
                    </div>

                    {[
                      ['Reason', form.reason],
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
                      <button className="btn btn-outline-secondary flex-fill" onClick={() => setStep(1)} disabled={submitting}>← Back</button>
                      <button className="btn btn-primary flex-fill" onClick={submitTransfer} disabled={submitting}>
                        {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-send-plane-line me-1"/>}
                        Confirm Transfer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
