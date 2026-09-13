import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

// Must match income_source_type_check in schema.sql / accountsAdminSchemas.js
const SOURCE_TYPES = [
  { value: 'online_order',     label: 'Online Order' },
  { value: 'pos_sale',         label: 'POS Sale' },
  { value: 'corporate_supply', label: 'Corporate Supply' },
  { value: 'wallet_topup',     label: 'Wallet Top-up' },
  { value: 'delivery_fee',     label: 'Delivery Fee' },
  { value: 'other',            label: 'Other' },
]
const SOURCE_TYPE_LABEL = Object.fromEntries(SOURCE_TYPES.map(s => [s.value, s.label]))
const PAY_METHODS = ['Paystack', 'Bank Transfer', 'Cash', 'POS Terminal', 'Wallet', 'USSD']
const INCOME_TYPES = ['Online Order', 'Walk-in Sale', 'Corporate', 'Wallet Credit', 'Delivery', 'Manual Entry']

// Maps the real `income` row (server/src/routes/accounts_admin.js) to this page's UI shape.
function mapIncome(r) {
  return {
    id: r.id,
    reference: r.reference,
    orderId: r.order_id || '',
    date: r.date,
    customer: r.source || '',
    sourceType: r.source_type || 'other',
    category: r.category || '',
    method: r.payment_method || '',
    status: r.status || 'completed',
    amount: Number(r.amount || 0),
    note: r.notes || '',
    bankAccountId: r.bank_account_id || '',
    bankAccountLabel: r.bank_name ? `${r.bank_name} — ${r.bank_account}` : '',
  }
}

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0],
  orderId: '', customer: '', sourceType: 'online_order', category: 'Online Order',
  method: 'Paystack', status: 'completed', amount: '', note: '', bankAccountId: '',
}

const STATUS_CFG = {
  completed: { label:'Completed', cls:'bg-success-subtle text-success border-success-subtle' },
  pending:   { label:'Pending',   cls:'bg-warning-subtle text-warning border-warning-subtle' },
  failed:    { label:'Failed',    cls:'bg-danger-subtle text-danger border-danger-subtle' },
  reversed:  { label:'Reversed',  cls:'bg-secondary-subtle text-secondary border-secondary-subtle' },
}

export default function Income() {
  const [records, setRecords]   = useState([])
  const [stats, setStats]       = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [filterCat, setFiltCat] = useState('all')
  const [filterSt,  setFiltSt]  = useState('all')
  const [activeModal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(BLANK_FORM)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/income', { params: { limit: 200 } })
      setRecords((res.data?.income || []).map(mapIncome))
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

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK_FORM) }

  const openView   = r => { setSelected(r); setModal('view') }
  const openEdit   = r => { setSelected(r); setForm({ ...r }); setModal('edit') }
  const openDelete = r => { setSelected(r); setModal('delete') }
  const openAdd    = () => { setForm(BLANK_FORM); setModal('add') }

  const saveRecord = async () => {
    if (!form.customer || !form.amount) return
    setSaving(true)
    try {
      if (activeModal === 'add') {
        await api.post('/admin/accounts/income', {
          source: form.customer,
          source_type: form.sourceType,
          category: form.category || undefined,
          description: form.customer,
          amount: Number(form.amount),
          date: form.date,
          payment_method: form.method || undefined,
          bank_account_id: form.bankAccountId ? Number(form.bankAccountId) : undefined,
          order_id: form.orderId || undefined,
          notes: form.note || undefined,
          status: form.status,
        })
      } else {
        // The API only allows amount/status/notes to change after creation —
        // source, category, payment method, date and bank account are fixed at creation time.
        await api.patch(`/admin/accounts/income/${selected.id}`, {
          amount: Number(form.amount),
          status: form.status,
          notes: form.note || undefined,
        })
      }
      await load()
      closeModal()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not save this income record.')
    } finally {
      setSaving(false)
    }
  }

  const reverseRecord = async () => {
    try {
      await api.delete(`/admin/accounts/income/${selected.id}`)
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not reverse this record.')
    } finally {
      closeModal()
    }
  }

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.customer.toLowerCase().includes(q) || (r.orderId || '').toLowerCase().includes(q) || r.reference.toLowerCase().includes(q)
    const mc = filterCat === 'all' || r.sourceType === filterCat
    const mst = filterSt === 'all' || r.status === filterSt
    return ms && mc && mst
  })

  // Stats — prefer the server-computed aggregates (accurate across all records,
  // not just the currently-loaded page) where available.
  const totalIncome = stats ? Number(stats.total_completed || 0) : records.filter(r => r.status === 'completed').reduce((s, r) => s + r.amount, 0)
  const pending     = stats ? Number(stats.total_pending || 0) : records.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const totalRecords= stats ? Number(stats.total_records || 0) : records.length
  const todayStr    = new Date().toISOString().split('T')[0]
  const todayInc     = records.filter(r => r.date === todayStr && r.status === 'completed').reduce((s, r) => s + r.amount, 0)
  const completedCount = records.filter(r => r.status === 'completed').length
  const avgPerTxn   = completedCount ? Math.round(records.filter(r => r.status === 'completed').reduce((s, r) => s + r.amount, 0) / completedCount) : 0

  // Category breakdown (best-effort over the loaded page)
  const catTotals = SOURCE_TYPES.reduce((acc, c) => {
    acc[c.value] = records.filter(r => r.sourceType === c.value && r.status === 'completed').reduce((s, r) => s + r.amount, 0)
    return acc
  }, {})

  const CAT_COLORS = {
    online_order:'#3b82f6', wallet_topup:'#8b5cf6', delivery_fee:'#f59e0b',
    corporate_supply:'#22c55e', pos_sale:'#0ea5e9', other:'#94a3b8',
  }

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Income</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Accounts</Link></li>
          <li className="breadcrumb-item active">Income</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load income records.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Income (Completed)', val:fmt(totalIncome), icon:'ri-arrow-up-circle-line',  color:'#22c55e', bg:'#f0fdf4' },
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
          <div className="fw-medium mb-3" style={{ fontSize:13 }}>Income by Source Type</div>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(catTotals).filter(([,v]) => v > 0).length === 0 ? (
              <span className="text-muted fs-sm">No completed income yet.</span>
            ) : Object.entries(catTotals).filter(([,v]) => v > 0).map(([cat, val]) => (
              <div key={cat} className="d-flex align-items-center gap-2 border rounded px-3 py-2">
                <div style={{ width:10, height:10, borderRadius:'50%', background: CAT_COLORS[cat] || '#94a3b8' }}/>
                <span style={{ fontSize:12 }} className="text-muted">{SOURCE_TYPE_LABEL[cat] || cat}:</span>
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
              <select className="form-select" style={{ width:170 }} value={filterCat} onChange={e => setFiltCat(e.target.value)}>
                <option value="all">All Source Types</option>
                {SOURCE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select className="form-select" style={{ width:130 }} value={filterSt} onChange={e => setFiltSt(e.target.value)}>
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
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
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Customer / Source</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Source Type</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Method</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Type</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Status</th>
                  <th className="fw-medium text-muted text-end pe-4" style={{ fontSize:12 }}>Amount</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    Loading income records…
                  </td></tr>
                ) : filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No income records found.</td></tr>
                )}
                {!loading && filtered.map(r => (
                  <tr key={r.id} className="border-bottom">
                    <td className="ps-4">
                      <div className="fw-medium" style={{ fontSize:12 }}>{fmtD(r.date)}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{r.orderId || r.reference}</div>
                    </td>
                    <td style={{ fontSize:13 }}>{r.customer}</td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <div style={{ width:7, height:7, borderRadius:'50%', background: CAT_COLORS[r.sourceType] || '#94a3b8' }}/>
                        <span style={{ fontSize:12 }}>{SOURCE_TYPE_LABEL[r.sourceType] || r.sourceType}</span>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border" style={{ fontSize:11 }}>{r.method || '—'}</span></td>
                    <td><span className="text-muted" style={{ fontSize:12 }}>{r.category || '—'}</span></td>
                    <td>
                      <span className={`badge border ${STATUS_CFG[r.status]?.cls}`} style={{ fontSize:11 }}>
                        {STATUS_CFG[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <span className={`fw-bold ${r.status === 'reversed' ? 'text-muted text-decoration-line-through' : 'text-success'}`} style={{ fontSize:14 }}>+{fmt(r.amount)}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                          onClick={() => openView(r)} title="View"><i className="ri-eye-line" style={{ fontSize:12 }}/></button>
                        <button className="btn btn-sm btn-outline-secondary" style={{ padding:'3px 8px' }}
                          onClick={() => openEdit(r)} title="Edit"><i className="ri-edit-line" style={{ fontSize:12 }}/></button>
                        {r.status !== 'reversed' && (
                          <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px' }}
                            onClick={() => openDelete(r)} title="Reverse"><i className="ri-arrow-go-back-line" style={{ fontSize:12 }}/></button>
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
                      Showing {filtered.length} of {records.length} loaded records
                    </td>
                    <td className="text-end pe-4 fw-bold" style={{ color:'#22c55e' }}>
                      +{fmt(filtered.filter(r=>r.status==='completed').reduce((s,r)=>s+r.amount,0))}
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
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.reference} · {fmtD(selected.date)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className={`fw-bold ${selected.status === 'reversed' ? 'text-muted' : 'text-success'}`} style={{ fontSize:28 }}>+{fmt(selected.amount)}</div>
                  <span className={`badge border ${STATUS_CFG[selected.status]?.cls} mt-1`} style={{ fontSize:12 }}>
                    {STATUS_CFG[selected.status]?.label}
                  </span>
                </div>
                {[
                  ['Reference', selected.reference],
                  ['Order / Ref ID', selected.orderId || '—'],
                  ['Customer / Source', selected.customer],
                  ['Source Type', SOURCE_TYPE_LABEL[selected.sourceType] || selected.sourceType],
                  ['Payment Method', selected.method || '—'],
                  ['Income Type', selected.category || '—'],
                  ['Bank Account', selected.bankAccountLabel || '—'],
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
                    <label className="form-label small fw-medium">Date {activeModal === 'add' && <span className="text-danger">*</span>}</label>
                    <input type="date" className="form-control" value={form.date} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Reference / Order ID</label>
                    <input className="form-control" placeholder="e.g. ORD-2026-0141" disabled={activeModal === 'edit'}
                      value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}/>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Customer / Source <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="Customer name or income source" disabled={activeModal === 'edit'}
                      value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Source Type</label>
                    <select className="form-select" value={form.sourceType} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, sourceType: e.target.value }))}>
                      {SOURCE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select className="form-select" value={form.method} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Income Type</label>
                    <select className="form-select" value={form.category} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Bank Account {activeModal === 'add' && '(credits it when status is Completed)'}</label>
                    <select className="form-select" value={form.bankAccountId} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                      <option value="">— Not linked to a bank account —</option>
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
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
                {activeModal === 'edit' && (
                  <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
                    <i className="ri-information-line me-1" />
                    Only amount, status and notes can be changed after a record is created.
                  </p>
                )}
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={saving}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={saveRecord}
                    disabled={saving || !form.customer || !form.amount}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-save-line me-1"/>}
                    {activeModal === 'add' ? 'Add Income' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REVERSE (the API has no hard delete on income — this sets status to 'reversed') */}
          {activeModal === 'delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:400 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-arrow-go-back-line me-2"/>Reverse Record</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#fee2e2' }}>
                  <i className="ri-arrow-up-circle-line fs-24 text-danger"/>
                </div>
                <h5>Reverse this income record?</h5>
                <p className="text-muted small mb-4">
                  <strong>{selected.reference}</strong> — {selected.customer} — <strong>{fmt(selected.amount)}</strong><br/>
                  Its status will be set to "Reversed". The record is kept, not deleted.
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={reverseRecord}>
                    <i className="ri-arrow-go-back-line me-1"/>Reverse
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
