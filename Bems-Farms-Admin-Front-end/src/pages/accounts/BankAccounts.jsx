import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt = n => `₦${Number(n || 0).toLocaleString()}`
const ini = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const BANK_COLORS = {
  'GTBank':       { bg: '#f97316', text: '#fff' },
  'Access Bank':  { bg: '#e11d48', text: '#fff' },
  'First Bank':   { bg: '#1d4ed8', text: '#fff' },
  'Zenith Bank':  { bg: '#7c3aed', text: '#fff' },
  'UBA':          { bg: '#0369a1', text: '#fff' },
  'Stanbic IBTC': { bg: '#059669', text: '#fff' },
}

const ACCOUNT_TYPES = ['Current Account', 'Savings Account', 'Domiciliary Account']
const BANKS = ['GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 'UBA', 'Stanbic IBTC']

// Maps the real bank_accounts row (server/src/repositories/accountsRepository.js)
// to the shape this page's UI already expects.
function mapAccount(a) {
  return {
    id: a.id,
    bank: a.bank_name,
    accountName: a.account_name,
    accountNo: a.account_number || '',
    type: a.account_type || 'Current Account',
    currency: a.currency || 'NGN',
    balance: Number(a.balance || 0),
    status: a.status || 'active',
    lastTxn: a.last_transaction_at
      ? new Date(a.last_transaction_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
    description: a.notes || '',
    isPrimary: Boolean(a.is_primary),
  }
}

const BLANK = {
  bank: 'GTBank', accountName: '', accountNo: '', type: 'Current Account',
  currency: 'NGN', balance: '', status: 'active', description: '',
}

export default function BankAccounts() {
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [activeModal, setModal]   = useState(null) // 'add'|'edit'|'view'|'delete'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(BLANK)
  const [recentTxns, setRecentTxns] = useState([])
  const [txnsLoading, setTxnsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/bank-accounts')
      setAccounts((res.data?.bank_accounts || []).map(mapAccount))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK); setRecentTxns([]) }

  const openView = async acc => {
    setSelected(acc); setModal('view'); setTxnsLoading(true)
    try {
      const res = await api.get('/admin/accounts/transactions', { params: { bank_account_id: acc.id, limit: 5 } })
      setRecentTxns(res.data?.transactions || [])
    } catch {
      setRecentTxns([])
    } finally {
      setTxnsLoading(false)
    }
  }
  const openEdit   = acc => { setSelected(acc); setForm({ ...acc }); setModal('edit') }
  const openDelete = acc => { setSelected(acc); setModal('delete') }
  const openAdd    = ()  => { setForm(BLANK); setModal('add') }

  const saveAccount = async () => {
    if (!form.accountName || !form.accountNo) return
    setSaving(true)
    try {
      if (activeModal === 'add') {
        await api.post('/admin/accounts/bank-accounts', {
          account_name: form.accountName,
          bank_name: form.bank,
          account_number: form.accountNo,
          account_type: form.type,
          currency: form.currency,
          opening_balance: Number(form.balance) || 0,
          notes: form.description || null,
        })
      } else {
        await api.patch(`/admin/accounts/bank-accounts/${selected.id}`, {
          account_name: form.accountName,
          bank_name: form.bank,
          account_number: form.accountNo,
          account_type: form.type,
          status: form.status,
          notes: form.description || null,
        })
      }
      await load()
      closeModal()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not save this account.')
    } finally {
      setSaving(false)
    }
  }

  const deactivateAccount = async () => {
    try {
      await api.delete(`/admin/accounts/bank-accounts/${selected.id}`)
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not deactivate this account.')
    } finally {
      closeModal()
    }
  }

  const toggleStatus = async acc => {
    try {
      await api.patch(`/admin/accounts/bank-accounts/${acc.id}`, {
        status: acc.status === 'active' ? 'inactive' : 'active',
      })
      await load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not update status.')
    }
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.bank.toLowerCase().includes(q)
      || a.accountName.toLowerCase().includes(q) || a.accountNo.includes(q)
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  // Stats
  const total    = accounts.length
  const active   = accounts.filter(a => a.status === 'active').length
  const inactive = accounts.filter(a => a.status === 'inactive').length
  const totalNGN = accounts.filter(a => a.currency === 'NGN').reduce((s, a) => s + a.balance, 0)
  const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0)

  const STATUS_CFG = {
    active:   { label:'Active',   cls:'bg-success-subtle text-success border-success-subtle' },
    inactive: { label:'Inactive', cls:'bg-warning-subtle text-warning border-warning-subtle' },
  }

  const BankIcon = ({ bank, size = 36 }) => {
    const cfg = BANK_COLORS[bank] || { bg:'#6b7280', text:'#fff' }
    return (
      <div style={{ width:size, height:size, borderRadius:8, background:cfg.bg, color:cfg.text,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.32, fontWeight:700, flexShrink:0 }}>
        {ini(bank)}
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="mb-0">Bank Accounts</h6>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Finance</Link></li>
          <li className="breadcrumb-item active">Bank Accounts</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Accounts',
            val: total,
            icon: 'ri-bank-line',
            glow: 'bg-card-glow-blue',
            iconBg: 'rgba(59, 130, 246, 0.12)',
            iconColor: '#2563eb',
            subLeft: 'Connected vaults',
            subRight: 'Configured',
          },
          {
            label: 'Active Accounts',
            val: active,
            icon: 'ri-checkbox-circle-line',
            glow: 'bg-card-glow-green',
            iconBg: 'rgba(34, 197, 94, 0.14)',
            iconColor: '#16a34a',
            valColor: 'text-success',
            subLeft: 'Ready for payout',
            subRight: 'Operational',
          },
          {
            label: 'Inactive Accounts',
            val: inactive,
            icon: 'ri-pause-circle-line',
            glow: 'bg-card-glow-amber',
            iconBg: 'rgba(245, 158, 11, 0.14)',
            iconColor: '#d97706',
            valColor: inactive > 0 ? 'text-warning-emphasis' : 'text-dark',
            subLeft: 'Suspended / Closed',
            subRight: 'Off-ledger',
          },
          {
            label: 'Total NGN Balance',
            val: fmt(totalNGN),
            icon: 'ri-money-naira-circle-line',
            glow: 'bg-card-glow-purple',
            iconBg: 'rgba(139, 92, 246, 0.14)',
            iconColor: '#7c3aed',
            valColor: 'text-purple',
            subLeft: 'Domestic liquidity',
            subRight: 'Cash & Banks',
          },
          {
            label: 'USD Reserve',
            val: `$${Number(totalUSD).toLocaleString()}`,
            icon: 'ri-exchange-dollar-line',
            glow: 'bg-card-glow-cyan',
            iconBg: 'rgba(14, 165, 233, 0.14)',
            iconColor: '#0284c7',
            subLeft: 'FX liquidity',
            subRight: 'Dollar vaults',
          },
        ].map((s, i) => (
          <div key={i} className="col-12 col-sm-6 col-md-4 col-xl">
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${s.glow}`}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={s.label}>
                    {s.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: s.iconBg, color: s.iconColor }}>
                    <i className={`${s.icon} fs-18`}></i>
                  </span>
                </div>
                <div className={`fs-20 fw-bolder mb-1 font-display text-truncate ${s.valColor || 'text-dark'}`}>
                  {s.val}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-1.5 pt-1.5 border-top">
                  <span className="text-truncate me-2">{s.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{s.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load bank accounts.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="position-relative">
                <input className="form-control ps-9" style={{ width:240 }}
                  placeholder="Search bank, name, account…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
                <i className="ri-search-line position-absolute top-50 translate-middle-y ms-3" style={{ fontSize:14, color:'#94a3b8' }}/>
              </div>
              <select className="form-select" style={{ width:140 }}
                value={filterStatus} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <i className="ri-add-line me-1"/>Add Account
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth:780 }}>
              <thead className="bg-light">
                <tr>
                  <th className="fw-medium text-muted ps-4" style={{ fontSize:12 }}>Bank</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Account Number</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Type</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Balance</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Status</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Last Transaction</th>
                  <th className="fw-medium text-muted" style={{ fontSize:12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    Loading bank accounts…
                  </td></tr>
                ) : filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-5">No accounts found.</td></tr>
                )}
                {!loading && filtered.map(acc => (
                  <tr key={acc.id} className="border-bottom">
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-3">
                        <BankIcon bank={acc.bank}/>
                        <div>
                          <div className="fw-medium" style={{ fontSize:13 }}>{acc.bank}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{acc.accountName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="fw-medium font-monospace" style={{ fontSize:13 }}>
                        **** **** {acc.accountNo.slice(-4)}
                      </span>
                    </td>
                    <td><span className="text-muted" style={{ fontSize:12 }}>{acc.type}</span></td>
                    <td>
                      <span className="fw-bold" style={{ fontSize:14 }}>
                        {acc.currency === 'USD' ? `$${Number(acc.balance).toLocaleString()}` : fmt(acc.balance)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge border ${STATUS_CFG[acc.status].cls}`} style={{ fontSize:11 }}>
                        {STATUS_CFG[acc.status].label}
                      </span>
                    </td>
                    <td><span className="text-muted" style={{ fontSize:12 }}>{acc.lastTxn}</span></td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" style={{ padding:'3px 8px' }}
                          onClick={() => openView(acc)} title="View Details">
                          <i className="ri-eye-line" style={{ fontSize:12 }}/>
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" style={{ padding:'3px 8px' }}
                          onClick={() => openEdit(acc)} title="Edit">
                          <i className="ri-edit-line" style={{ fontSize:12 }}/>
                        </button>
                        <button className={`btn btn-sm ${acc.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          style={{ padding:'3px 8px' }} onClick={() => toggleStatus(acc)}
                          title={acc.status === 'active' ? 'Deactivate' : 'Activate'}>
                          <i className={`${acc.status === 'active' ? 'ri-pause-line' : 'ri-play-line'}`} style={{ fontSize:12 }}/>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" style={{ padding:'3px 8px' }}
                          onClick={() => openDelete(acc)} title="Deactivate">
                          <i className="ri-pause-circle-line" style={{ fontSize:12 }}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────────── */}
      {activeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>

          {/* VIEW */}
          {activeModal === 'view' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ width:40, height:40, borderRadius:8,
                      background: BANK_COLORS[selected.bank]?.bg || '#6b7280',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:700, color:'#fff' }}>
                      {ini(selected.bank)}
                    </div>
                    <div>
                      <div className="fw-bold fs-15">{selected.bank}</div>
                      <div style={{ fontSize:12, opacity:0.7 }}>{selected.accountName}</div>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>

              <div className="p-4">
                {/* KPI tiles */}
                <div className="row g-3 mb-4">
                  {[
                    { label:'Balance', val: selected.currency === 'USD' ? `$${Number(selected.balance).toLocaleString()}` : fmt(selected.balance), color:'#3b82f6' },
                    { label:'Account No.', val:`**** ${selected.accountNo.slice(-4)}`, color:'#8b5cf6' },
                    { label:'Account Type', val:selected.type, color:'#22c55e' },
                    { label:'Currency', val:selected.currency, color:'#f59e0b' },
                  ].map((k, i) => (
                    <div key={i} className="col-6">
                      <div className="border rounded p-3">
                        <div className="text-muted" style={{ fontSize:11 }}>{k.label}</div>
                        <div className="fw-bold mt-1" style={{ fontSize:15, color:k.color }}>{k.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {selected.description && (
                  <div className="alert alert-light border mb-4" style={{ fontSize:12 }}>
                    <i className="ri-information-line me-1"/>
                    {selected.description}
                  </div>
                )}

                {/* Recent transactions */}
                <div className="fw-medium mb-2" style={{ fontSize:13 }}>Recent Transactions</div>
                {txnsLoading ? (
                  <p className="text-muted small"><span className="spinner-border spinner-border-sm me-2" />Loading…</p>
                ) : recentTxns.length === 0
                  ? <p className="text-muted small">No transactions recorded yet.</p>
                  : (
                  <div className="border rounded overflow-hidden">
                    {recentTxns.map((t, i) => (
                      <div key={t.id ?? i} className={`d-flex align-items-center justify-content-between px-3 py-2 ${i < recentTxns.length - 1 ? 'border-bottom' : ''}`}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{t.description || t.sub_type || 'Transaction'}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{t.reference} · {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''}</div>
                        </div>
                        <div className="fw-bold" style={{ fontSize:13, color: t.type === 'credit' ? '#22c55e' : '#ef4444' }}>
                          {t.type === 'credit' ? '+' : '−'}
                          {selected.currency === 'USD' ? `$${Math.abs(t.amount).toLocaleString()}` : fmt(Math.abs(t.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Close</button>
                  <button className="btn btn-primary flex-fill" onClick={() => { closeModal(); openEdit(selected) }}>
                    <i className="ri-edit-line me-1"/>Edit Account
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
                    {activeModal === 'add' ? 'Add Bank Account' : 'Edit Bank Account'}
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>

              <div className="p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Bank Name <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}>
                      {BANKS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Account Type <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Account Name <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="e.g. Bems Farms Nigeria Ltd"
                      value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}/>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-medium">Account Number <span className="text-danger">*</span></label>
                    <input className="form-control font-monospace" placeholder="10-digit NUBAN"
                      value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))}/>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label small fw-medium">Currency</label>
                    <select className="form-select" value={form.currency} disabled={activeModal === 'edit'}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-medium">{activeModal === 'edit' ? 'Current Balance' : 'Opening Balance'}</label>
                    <div className="input-group">
                      <span className="input-group-text">{form.currency === 'NGN' ? '₦' : form.currency === 'USD' ? '$' : form.currency}</span>
                      <input className="form-control" type="number" placeholder="0.00" disabled={activeModal === 'edit'}
                        value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}/>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label small fw-medium">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-medium">Description / Purpose</label>
                    <textarea className="form-control" rows={2}
                      placeholder="What is this account used for?"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
                  </div>
                </div>

                {activeModal === 'edit' && (
                  <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
                    <i className="ri-information-line me-1" />
                    Balance and currency can't be edited directly — balance only changes through recorded transactions/transfers.
                  </p>
                )}

                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveAccount}
                    disabled={saving || !form.accountName || !form.accountNo}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ri-save-line me-1"/>}
                    {activeModal === 'add' ? 'Add Account' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEACTIVATE (the API has no hard delete — this sets status to inactive) */}
          {activeModal === 'delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-pause-circle-line me-2"/>Deactivate Account</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="mb-3">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width:56, height:56, background:'#fee2e2' }}>
                    <i className="ri-bank-line fs-24 text-danger"/>
                  </div>
                  <h5>Deactivate this account?</h5>
                  <p className="text-muted small">
                    <strong>{selected.bank}</strong> — {selected.accountName}<br/>
                    Account ending <strong>**** {selected.accountNo.slice(-4)}</strong> will be marked inactive.
                    Its transaction history is kept and it can be reactivated later.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={deactivateAccount}>
                    <i className="ri-pause-circle-line me-1"/>Deactivate Account
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
