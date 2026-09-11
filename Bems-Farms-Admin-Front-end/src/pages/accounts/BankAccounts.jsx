import { useState } from 'react'

const fmt = n => `₦${Number(n).toLocaleString()}`
const ini = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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

const INITIAL_ACCOUNTS = [
  {
    id: 'ACC-001',
    bank: 'GTBank',
    accountName: 'Bems Farms Nigeria Ltd',
    accountNo: '0123456789',
    type: 'Current Account',
    currency: 'NGN',
    balance: 4_850_000,
    status: 'active',
    lastTxn: '27 Jun, 2026',
    description: 'Main operational account — daily sales, supplier payments, logistics.',
    recentTxns: [
      { ref: 'TXN-8821', desc: 'Paystack settlement — online orders', amount: 312_000, type: 'credit', date: '27 Jun, 2026' },
      { ref: 'TXN-8818', desc: 'Supplier payment — Ogun farm produce', amount: -185_000, type: 'debit', date: '26 Jun, 2026' },
      { ref: 'TXN-8805', desc: 'Paystack settlement', amount: 276_500, type: 'credit', date: '25 Jun, 2026' },
      { ref: 'TXN-8799', desc: 'Delivery driver fuel allowance', amount: -48_000, type: 'debit', date: '25 Jun, 2026' },
      { ref: 'TXN-8791', desc: 'Packaging materials — Lafiaji market', amount: -62_000, type: 'debit', date: '24 Jun, 2026' },
    ],
  },
  {
    id: 'ACC-002',
    bank: 'Access Bank',
    accountName: 'Bems Farms Payroll',
    accountNo: '0987654321',
    type: 'Current Account',
    currency: 'NGN',
    balance: 1_320_000,
    status: 'active',
    lastTxn: '25 Jun, 2026',
    description: 'Dedicated payroll account — staff and driver salary disbursements.',
    recentTxns: [
      { ref: 'TXN-8800', desc: 'Staff salary transfer — June 2026', amount: -920_000, type: 'debit', date: '25 Jun, 2026' },
      { ref: 'TXN-8782', desc: 'Top-up from GTBank ops account', amount: 1_200_000, type: 'credit', date: '24 Jun, 2026' },
      { ref: 'TXN-8760', desc: 'Driver bonus payment — May 2026', amount: -125_000, type: 'debit', date: '01 Jun, 2026' },
    ],
  },
  {
    id: 'ACC-003',
    bank: 'First Bank',
    accountName: 'Bems Farms Tax Reserve',
    accountNo: '3011223344',
    type: 'Savings Account',
    currency: 'NGN',
    balance: 2_100_000,
    status: 'active',
    lastTxn: '20 Jun, 2026',
    description: 'Tax and compliance reserve — VAT, corporate income tax, FIRS payments.',
    recentTxns: [
      { ref: 'TXN-8750', desc: 'Monthly tax reserve deposit', amount: 350_000, type: 'credit', date: '20 Jun, 2026' },
      { ref: 'TXN-8690', desc: 'FIRS VAT payment — May 2026', amount: -280_000, type: 'debit', date: '15 Jun, 2026' },
      { ref: 'TXN-8650', desc: 'Monthly tax reserve deposit', amount: 350_000, type: 'credit', date: '20 May, 2026' },
    ],
  },
  {
    id: 'ACC-004',
    bank: 'Zenith Bank',
    accountName: 'Bems Farms POS Settlement',
    accountNo: '2081234567',
    type: 'Current Account',
    currency: 'NGN',
    balance: 680_000,
    status: 'active',
    lastTxn: '27 Jun, 2026',
    description: 'POS & Paystack settlement receiving account. Reconciled weekly to GTBank ops.',
    recentTxns: [
      { ref: 'TXN-8822', desc: 'POS settlement — Lagos Island store', amount: 198_000, type: 'credit', date: '27 Jun, 2026' },
      { ref: 'TXN-8819', desc: 'Transfer to GTBank ops account', amount: -500_000, type: 'debit', date: '26 Jun, 2026' },
      { ref: 'TXN-8810', desc: 'POS settlement — Victoria Island POS', amount: 312_000, type: 'credit', date: '25 Jun, 2026' },
    ],
  },
  {
    id: 'ACC-005',
    bank: 'UBA',
    accountName: 'Bems Farms USD Reserve',
    accountNo: '1000234567',
    type: 'Domiciliary Account',
    currency: 'USD',
    balance: 12_400,
    status: 'inactive',
    lastTxn: '10 Jun, 2026',
    description: 'USD domiciliary account for imported equipment, packaging, and FX reserve.',
    recentTxns: [
      { ref: 'TXN-8700', desc: 'USD purchase — packaging import', amount: -2_800, type: 'debit', date: '10 Jun, 2026' },
      { ref: 'TXN-8650', desc: 'USD deposit', amount: 5_000, type: 'credit', date: '01 Jun, 2026' },
    ],
  },
]

const BLANK = {
  bank: 'GTBank', accountName: '', accountNo: '', type: 'Current Account',
  currency: 'NGN', balance: '', status: 'active', description: '',
}

export default function BankAccounts() {
  const [accounts, setAccounts]   = useState(INITIAL_ACCOUNTS)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [activeModal, setModal]   = useState(null) // 'add'|'edit'|'view'|'delete'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(BLANK)

  const closeModal = () => { setModal(null); setSelected(null); setForm(BLANK) }

  const openView   = acc => { setSelected(acc); setModal('view') }
  const openEdit   = acc => { setSelected(acc); setForm({ ...acc }); setModal('edit') }
  const openDelete = acc => { setSelected(acc); setModal('delete') }
  const openAdd    = ()  => { setForm(BLANK); setModal('add') }

  const saveAccount = () => {
    if (!form.accountName || !form.accountNo) return
    if (activeModal === 'add') {
      const newAcc = {
        ...form,
        id: `ACC-00${accounts.length + 1}`,
        balance: Number(form.balance) || 0,
        lastTxn: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
        recentTxns: [],
      }
      setAccounts(prev => [newAcc, ...prev])
    } else {
      setAccounts(prev => prev.map(a => a.id === selected.id ? { ...a, ...form, balance: Number(form.balance) } : a))
    }
    closeModal()
  }

  const deleteAccount = () => {
    setAccounts(prev => prev.filter(a => a.id !== selected.id))
    closeModal()
  }

  const toggleStatus = acc => {
    setAccounts(prev => prev.map(a => a.id === acc.id
      ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
      : a))
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
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Bank Accounts</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Accounts', val:total, icon:'ri-bank-line', color:'#3b82f6', bg:'#eff6ff' },
          { label:'Active Accounts', val:active, icon:'ri-checkbox-circle-line', color:'#22c55e', bg:'#f0fdf4' },
          { label:'Inactive Accounts', val:inactive, icon:'ri-pause-circle-line', color:'#f59e0b', bg:'#fffbeb' },
          { label:'Total NGN Balance', val:fmt(totalNGN), icon:'ri-money-naira-circle-line', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'USD Reserve', val:`$${Number(totalUSD).toLocaleString()}`, icon:'ri-exchange-dollar-line', color:'#0ea5e9', bg:'#f0f9ff' },
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
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-5">No accounts found.</td></tr>
                )}
                {filtered.map(acc => (
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
                          onClick={() => openDelete(acc)} title="Delete">
                          <i className="ri-delete-bin-line" style={{ fontSize:12 }}/>
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
                {(selected.recentTxns || []).length === 0
                  ? <p className="text-muted small">No transactions recorded yet.</p>
                  : (
                  <div className="border rounded overflow-hidden">
                    {selected.recentTxns.map((t, i) => (
                      <div key={i} className={`d-flex align-items-center justify-content-between px-3 py-2 ${i < selected.recentTxns.length - 1 ? 'border-bottom' : ''}`}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:500 }}>{t.desc}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{t.ref} · {t.date}</div>
                        </div>
                        <div className={`fw-bold`} style={{ fontSize:13, color: t.type === 'credit' ? '#22c55e' : '#ef4444' }}>
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
                    <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-medium">Opening / Current Balance</label>
                    <div className="input-group">
                      <span className="input-group-text">{form.currency === 'NGN' ? '₦' : form.currency === 'USD' ? '$' : form.currency}</span>
                      <input className="form-control" type="number" placeholder="0.00"
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

                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveAccount}
                    disabled={!form.accountName || !form.accountNo}>
                    <i className="ri-save-line me-1"/>
                    {activeModal === 'add' ? 'Add Account' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE */}
          {activeModal === 'delete' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold fs-15"><i className="ri-delete-bin-line me-2"/>Delete Account</div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="mb-3">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width:56, height:56, background:'#fee2e2' }}>
                    <i className="ri-bank-line fs-24 text-danger"/>
                  </div>
                  <h5>Delete this account?</h5>
                  <p className="text-muted small">
                    <strong>{selected.bank}</strong> — {selected.accountName}<br/>
                    Account ending <strong>**** {selected.accountNo.slice(-4)}</strong> will be permanently removed.
                    All transaction records linked to this account will be lost.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={deleteAccount}>
                    <i className="ri-delete-bin-line me-1"/>Delete Account
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
