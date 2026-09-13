import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

// Must match expenses_category_check in schema.sql / accountsAdminSchemas.js
const CATEGORIES = [
  { value: 'produce_purchase', label: 'Produce Purchase' },
  { value: 'staff_salary',     label: 'Staff Salary' },
  { value: 'fuel_transport',   label: 'Fuel & Transport' },
  { value: 'packaging',        label: 'Packaging' },
  { value: 'utilities_rent',   label: 'Utilities & Rent' },
  { value: 'maintenance',      label: 'Maintenance' },
  { value: 'marketing',        label: 'Marketing' },
  { value: 'other',            label: 'Other' },
]
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))
const PAY_METHODS = ['Bank Transfer', 'Cash', 'POS Terminal', 'Online']

const STATUS_CFG = {
  paid:     { label:'Paid',     cls:'bg-success-subtle text-success border-success-subtle' },
  pending:  { label:'Pending',  cls:'bg-warning-subtle text-warning border-warning-subtle' },
  approved: { label:'Approved', cls:'bg-info-subtle text-info border-info-subtle' },
  rejected: { label:'Rejected', cls:'bg-danger-subtle text-danger border-danger-subtle' },
}

const CAT_COLORS = {
  produce_purchase:'#22c55e', staff_salary:'#3b82f6', fuel_transport:'#f59e0b', packaging:'#8b5cf6',
  utilities_rent:'#0ea5e9', maintenance:'#f97316', marketing:'#ec4899', other:'#94a3b8',
}

// Maps the real `expenses` row (server/src/routes/accounts_admin.js) to this page's UI shape.
// approved_by / paid_by are set automatically server-side on status transitions — never client-supplied.
function mapExpense(e) {
  return {
    id: e.id,
    reference: e.reference,
    date: e.date,
    dueDate: e.due_date || '',
    payee: e.description || '',
    supplier: e.supplier_name || '',
    category: e.category,
    method: e.payment_method || '',
    approvedBy: e.approved_by_name || '',
    paidBy: e.paid_by_name || '',
    status: e.status,
    amount: Number(e.amount || 0),
    note: e.notes || '',
    receiptUrl: e.receipt_url || '',
    bankAccountId: e.bank_account_id || '',
    bankAccountLabel: e.bank_name ? `${e.bank_name} — ${e.bank_account}` : '',
  }
}

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0], dueDate: '',
  payee: '', supplier: '', category: 'produce_purchase', method: 'Bank Transfer',
  status: 'pending', amount: '', note: '', bankAccountId: '',
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [stats, setStats]       = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [filterCat, setFiltCat] = useState('all')
  const [filterSt,  setFiltSt]  = useState('all')
  const [activeModal, setModal] = useState(null) // 'add'|'edit'|'view'|'approve'|'reject'|'delete'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(BLANK_FORM)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/expenses', { params: { limit: 200 } })
      setExpenses((res.data?.expenses || []).map(mapExpense))
      setStats(res.data?.stats || null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/admin/accounts/bank-accounts').then(res => {
      setBankAccounts((res.data?.bank_accounts || []).filter(a => a.status === 'active'))
    }).catch(() => {})
  }, [])

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM); setRejectReason('') }

  const openView    = e => { setSelected(e); setModal('view') }
  const openEdit    = e => { setSelected(e); setForm({ ...e }); setModal('edit') }
  const openDelete  = e => { setSelected(e); setModal('delete') }
  const openApprove = e => { setSelected(e); setModal('approve') }
  const openReject  = e => { setSelected(e); setModal('reject') }
  const openAdd     = () => { setForm(BLANK_FORM); setModal('add') }

  const saveExpense = async () => {
    if (!form.payee || !form.amount) return
    setSaving(true)
    try {
      if (activeModal === 'add') {
        await api.post('/admin/accounts/expenses', {
          category: form.category,
          description: form.payee,
          supplier_name: form.supplier || undefined,
          amount: Number(form.amount),
          date: form.date,
          due_date: form.dueDate || undefined,
          payment_method: form.method || undefined,
          bank_account_id: form.bankAccountId ? Number(form.bankAccountId) : undefined,
          notes: form.note || undefined,
        })
      } else {
        await api.patch(`/admin/accounts/expenses/${selected.id}`, {
          description: form.payee,
          category: form.category,
          supplier_name: form.supplier || undefined,
          amount: Number(form.amount),
          due_date: form.dueDate || undefined,
          notes: form.note || undefined,
          status: form.status,
          bank_account_id: form.bankAccountId ? Number(form.bankAccountId) : undefined,
        })
      }
      await load()
      closeModal()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not save this expense.')
    } finally {
      setSaving(false)
    }
  }

  const patchStatus = async (id, payload) => {
    try {
      await api.patch(`/admin/accounts/expenses/${id}`, payload)
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not update this expense.')
    }
  }

  const approveExpense = async () => { await patchStatus(selected.id, { status: 'approved' }); closeModal() }
  const rejectExpense  = async () => {
    if (!rejectReason) return
    await patchStatus(selected.id, { status: 'rejected', notes: `Rejected: ${rejectReason}` })
    closeModal()
  }
  const markPaid = e => patchStatus(e.id, { status: 'paid' })

  const voidExpense = async () => {
    try {
      await api.delete(`/admin/accounts/expenses/${selected.id}`)
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not void this expense.')
    } finally {
      closeModal()
    }
  }

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase()
    const ms = !q || e.payee.toLowerCase().includes(q) || e.reference.toLowerCase().includes(q) || (CATEGORY_LABEL[e.category] || '').toLowerCase().includes(q)
    const mc = filterCat === 'all' || e.category === filterCat
    const mst = filterSt === 'all' || e.status === filterSt
    return ms && mc && mst
  })

  // Stats
  const totalPaid    = stats ? Number(stats.total_paid || 0) : expenses.filter(e => ['approved','paid'].includes(e.status)).reduce((s, e) => s + e.amount, 0)
  const totalPending = stats ? Number(stats.total_pending || 0) : expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const pendingCount = stats ? Number(stats.pending_count || 0) : expenses.filter(e => e.status === 'pending').length
  const totalApproved= expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const today        = new Date().toISOString().split('T')[0]
  const todaySpend   = expenses.filter(e => e.date === today && e.status === 'paid').reduce((s, e) => s + e.amount, 0)
  const totalVouchers= stats ? undefined : expenses.length

  // Category totals (best-effort over the loaded page)
  const catTotals = expenses.reduce((acc, e) => {
    if (e.status === 'paid') acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Expenses</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Accounts</Link></li>
          <li className="breadcrumb-item active">Expenses</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load expenses.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Paid/Approved', val:fmt(totalPaid),    icon:'ri-arrow-down-circle-line', color:'#ef4444', bg:'#fef2f2' },
          { label:"Today's Expenses", val:fmt(todaySpend),   icon:'ri-calendar-line',          color:'#f59e0b', bg:'#fffbeb' },
          { label:'Pending Approval', val:fmt(totalPending), icon:'ri-time-line',              color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Approved (Unpaid)',val:fmt(totalApproved),icon:'ri-checkbox-circle-line',   color:'#0ea5e9', bg:'#f0f9ff' },
          { label:'Vouchers Loaded',   val:totalVouchers ?? expenses.length,     icon:'ri-file-list-3-line',       color:'#6366f1', bg:'#eef2ff' },
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

      {/* Pending approvals banner */}
      {pendingCount > 0 && (
        <div className="alert border d-flex align-items-center gap-3 mb-4"
          style={{ background:'#fffbeb', borderColor:'#fbbf24' }}>
          <i className="ri-alarm-warning-line fs-20 text-warning flex-shrink-0"/>
          <div>
            <div className="fw-medium" style={{ fontSize:13 }}>
              {pendingCount} expenses awaiting approval
              — totalling <strong>{fmt(totalPending)}</strong>
            </div>
            <div className="text-muted" style={{ fontSize:11 }}>
              Review and approve or reject pending expense vouchers below.
            </div>
          </div>
          <button className="btn btn-sm btn-warning ms-auto" onClick={() => setFiltSt('pending')}>
            Review Pending
          </button>
        </div>
      )}

      {/* Category breakdown */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="fw-medium mb-3" style={{ fontSize:13 }}>Spending by Category (Paid)</div>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(catTotals).length === 0 ? (
              <span className="text-muted fs-sm">No paid expenses yet.</span>
            ) : Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => (
              <div key={cat} className="d-flex align-items-center gap-2 border rounded px-3 py-2">
                <div style={{ width:10, height:10, borderRadius:'50%', background: CAT_COLORS[cat] || '#94a3b8' }}/>
                <span style={{ fontSize:12 }} className="text-muted">{CATEGORY_LABEL[cat] || cat}:</span>
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
                  placeholder="Search payee, ref, category…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                <i className="ri-search-line position-absolute top-50 translate-middle-y ms-3" style={{ fontSize:14, color:'#94a3b8' }}/>
              </div>
              <select className="form-select" style={{ width:170 }} value={filterCat} onChange={e => setFiltCat(e.target.value)}>
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select className="form-select" style={{ width:140 }} value={filterSt} onChange={e => setFiltSt(e.target.value)}>
                <option value="all">All Status</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <i className="ri-add-line me-1"/>Add Expense
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth:950 }}>
              <thead className="bg-light">
                <tr>
                  <th className="fw-medium text-muted ps-4" style={{ fontSize:12 }}>Voucher / Date</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Payee</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Category</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Method</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Approved By</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Status</th>
                  <th className="fw-medium text-muted text-end pe-3" style={{ fontSize:12 }}>Amount</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    Loading expenses…
                  </td></tr>
                ) : filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No expense records found.</td></tr>
                )}
                {!loading && filtered.map(e => (
                  <tr key={e.id} className="border-bottom">
                    <td className="ps-4">
                      <div className="fw-medium" style={{ fontSize:12 }}>{e.reference}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{fmtD(e.date)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize:13 }}>{e.payee}</div>
                      {e.note && <div className="text-muted" style={{ fontSize:11, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.note}</div>}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <div style={{ width:7, height:7, borderRadius:'50%', background: CAT_COLORS[e.category] || '#94a3b8' }}/>
                        <span style={{ fontSize:12 }}>{CATEGORY_LABEL[e.category] || e.category}</span>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border" style={{ fontSize:11 }}>{e.method || '—'}</span></td>
                    <td><span className="text-muted" style={{ fontSize:12 }}>{e.approvedBy || '—'}</span></td>
                    <td>
                      <span className={`badge border ${STATUS_CFG[e.status]?.cls}`} style={{ fontSize:11 }}>
                        {STATUS_CFG[e.status]?.label}
                      </span>
                    </td>
                    <td className="text-end pe-3">
                      <span className="fw-bold text-danger" style={{ fontSize:14 }}>−{fmt(e.amount)}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                          onClick={() => openView(e)}><i className="ri-eye-line" style={{ fontSize:12 }}/></button>
                        {e.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-outline-success" style={{ padding:'3px 8px' }}
                              onClick={() => openApprove(e)} title="Approve">
                              <i className="ri-check-line" style={{ fontSize:12 }}/>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px' }}
                              onClick={() => openReject(e)} title="Reject">
                              <i className="ri-close-line" style={{ fontSize:12 }}/>
                            </button>
                          </>
                        )}
                        {e.status === 'approved' && (
                          <button className="btn btn-sm btn-outline-success" style={{ padding:'3px 8px', fontSize:11 }}
                            onClick={() => markPaid(e)}>Mark Paid</button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary" style={{ padding:'3px 8px' }}
                          onClick={() => openEdit(e)}><i className="ri-edit-line" style={{ fontSize:12 }}/></button>
                        {e.status !== 'rejected' && (
                          <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px' }}
                            onClick={() => openDelete(e)} title="Void"><i className="ri-delete-bin-line" style={{ fontSize:12 }}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot className="bg-light">
                  <tr>
                    <td colSpan={6} className="ps-4 fw-medium text-muted" style={{ fontSize:12 }}>
                      Showing {filtered.length} of {expenses.length} loaded records
                    </td>
                    <td className="text-end pe-3 fw-bold text-danger" style={{ fontSize:13 }}>
                      −{fmt(filtered.reduce((s,e)=>s+e.amount,0))}
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
                    <div className="fw-bold fs-15"><i className="ri-arrow-down-circle-line me-2 text-danger"/>Expense Voucher</div>
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.reference} · {fmtD(selected.date)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="fw-bold text-danger" style={{ fontSize:28 }}>−{fmt(selected.amount)}</div>
                  <span className={`badge border ${STATUS_CFG[selected.status]?.cls} mt-1`} style={{ fontSize:12 }}>
                    {STATUS_CFG[selected.status]?.label}
                  </span>
                </div>
                {[
                  ['Voucher Ref', selected.reference],
                  ['Payee', selected.payee],
                  ['Supplier', selected.supplier || '—'],
                  ['Category', CATEGORY_LABEL[selected.category] || selected.category],
                  ['Payment Method', selected.method || '—'],
                  ['Approved By', selected.approvedBy || '—'],
                  ['Paid By', selected.paidBy || '—'],
                  ['Bank Account', selected.bankAccountLabel || '—'],
                  ['Date', fmtD(selected.date)],
                  ['Due Date', fmtD(selected.dueDate)],
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
                    <>
                      <button className="btn btn-success flex-fill" onClick={() => { closeModal(); openApprove(selected) }}>
                        <i className="ri-check-line me-1"/>Approve
                      </button>
                      <button className="btn btn-danger flex-fill" onClick={() => { closeModal(); openReject(selected) }}>
                        <i className="ri-close-line me-1"/>Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15">
                    <i className={`${activeModal === 'add' ? 'ri-add-circle-line' : 'ri-edit-line'} me-2`}/>
                    {activeModal === 'add' ? 'Add Expense' : 'Edit Expense'}
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Date {activeModal === 'add' && <span className="text-danger">*</span>}</label>
                    <input type="date" className="form-control" value={form.date} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Payee / Description <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="Who or what is this payment for?"
                      value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Supplier (optional)</label>
                    <input className="form-control" placeholder="Supplier / vendor name"
                      value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select className="form-select" value={form.method} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}/>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-medium">Amount (₦) <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">₦</span>
                      <input className="form-control" type="number" placeholder="0.00"
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label small fw-medium">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Bank Account {activeModal === 'add' ? '(debited when marked Paid)' : ''}</label>
                    <select className="form-select" value={form.bankAccountId}
                      onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                      <option value="">— Not linked to a bank account —</option>
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Additional details…"
                      value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}/>
                  </div>
                </div>
                {activeModal === 'add' && (
                  <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
                    <i className="ri-information-line me-1" />
                    Approver and payer are recorded automatically from whoever approves/marks this paid — they aren't set here.
                  </p>
                )}
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveExpense}
                    disabled={saving || !form.payee || !form.amount}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-save-line me-1"/>}
                    {activeModal === 'add' ? 'Add Expense' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPROVE */}
          {activeModal === 'approve' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#14532d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-check-double-line me-2"/>Approve Expense</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#dcfce7' }}>
                  <i className="ri-check-double-line fs-24 text-success"/>
                </div>
                <h5>Approve this expense?</h5>
                <p className="text-muted small mb-4">
                  <strong>{selected.payee}</strong><br/>
                  <strong>{fmt(selected.amount)}</strong> · {CATEGORY_LABEL[selected.category] || selected.category}
                  <br/><span className="text-muted">{fmtD(selected.date)}</span>
                </p>
                <div className="alert alert-success small text-start">
                  <i className="ri-information-line me-1"/>
                  Approving will mark this expense as <strong>Approved</strong>, recorded under your account. Payment can then be processed and marked Paid.
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={approveExpense}>
                    <i className="ri-check-line me-1"/>Confirm Approval
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REJECT */}
          {activeModal === 'reject' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-close-circle-line me-2"/>Reject Expense</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-muted small mb-3">
                  Rejecting: <strong>{selected.payee}</strong> — <strong>{fmt(selected.amount)}</strong>
                </p>
                <label className="form-label small fw-medium">Reason for Rejection <span className="text-danger">*</span></label>
                <textarea className="form-control mb-3" rows={3}
                  placeholder="Explain why this expense is being rejected…"
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={rejectExpense} disabled={!rejectReason}>
                    <i className="ri-close-line me-1"/>Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VOID (the API has no hard delete — this sets status to 'rejected') */}
          {activeModal === 'delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:400 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-delete-bin-line me-2"/>Void Expense</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#fee2e2' }}>
                  <i className="ri-delete-bin-line fs-24 text-danger"/>
                </div>
                <h5>Void this expense voucher?</h5>
                <p className="text-muted small mb-4">
                  <strong>{selected.reference}</strong> — {selected.payee}<br/>
                  <strong>{fmt(selected.amount)}</strong> · This marks it Rejected — the record is kept, not deleted.
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={voidExpense}>
                    <i className="ri-delete-bin-line me-1"/>Void
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
