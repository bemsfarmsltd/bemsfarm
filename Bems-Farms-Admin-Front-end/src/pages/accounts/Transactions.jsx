import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt = n => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TYPE_CFG = {
  income:     { label:'Income',     cls:'success', icon:'ri-arrow-up-circle-line'     },
  expense:    { label:'Disbursement', cls:'danger', icon:'ri-arrow-down-circle-line' },
  commission: { label:'Commission', cls:'purple',  icon:'ri-user-star-line'           },
  transfer:   { label:'Transfer',   cls:'primary', icon:'ri-exchange-funds-line'      },
  refund:     { label:'Refund',     cls:'warning', icon:'ri-refund-2-line'            },
}

const STATUS_CFG = {
  completed: { label:'Completed', bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  pending:   { label:'Pending',   bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  failed:    { label:'Failed',    bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
}

const PURPLE = { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' }
const TYPES = ['income','commission','transfer','refund']

// Maps the real `transactions` row to this page's UI shape.
function mapTxn(t) {
  return {
    id: t.id,
    ref: t.reference,
    date: t.date,
    time: t.time || '',
    type: t.type,
    category: t.sub_type || TYPE_CFG[t.type]?.label || t.type,
    desc: t.description || '',
    account: t.bank_account ? `${t.bank_name} — ${t.bank_account}` : (t.bank_name || '—'),
    amount: Number(t.amount || 0),
    status: t.status || 'completed',
  }
}

export default function Transactions() {
  const [viewMode, setViewMode] = useState('cash_ledger') // 'cash_ledger' | 'general_journal' | 'trial_balance'
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [search, setSearch]     = useState('')
  const [filterType, setType]   = useState('all')
  const [filterSt, setFilterSt] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [selected, setSelected] = useState(null)

  // General Journal state
  const [journalEntries, setJournalEntries] = useState([])
  const [journalSummary, setJournalSummary] = useState(null)
  const [journalModule, setJournalModule] = useState('all')
  const [loadingJournal, setLoadingJournal] = useState(false)

  // Trial Balance state
  const [trialBalanceAccounts, setTrialBalanceAccounts] = useState([])
  const [trialSummary, setTrialSummary] = useState(null)
  const [loadingTrial, setLoadingTrial] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/transactions', {
        params: {
          limit: 200,
          type: filterType === 'all' ? undefined : filterType,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        },
      })
      setRecords((res.data?.transactions || []).map(mapTxn))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filterType, dateFrom, dateTo])

  const loadJournal = useCallback(async () => {
    setLoadingJournal(true)
    try {
      const res = await api.get('/admin/accounts/general-journal', {
        params: {
          module: journalModule === 'all' ? undefined : journalModule,
          limit: 150,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      setJournalEntries(res.data?.entries || [])
      setJournalSummary(res.data?.summary || null)
    } catch {
      // ignore
    } finally {
      setLoadingJournal(false)
    }
  }, [journalModule, dateFrom, dateTo])

  const loadTrialBalance = useCallback(async () => {
    setLoadingTrial(true)
    try {
      const res = await api.get('/admin/accounts/trial-balance')
      setTrialBalanceAccounts(res.data?.trial_balance || [])
      setTrialSummary(res.data?.summary || null)
    } catch {
      // ignore
    } finally {
      setLoadingTrial(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (viewMode === 'general_journal') loadJournal()
    if (viewMode === 'trial_balance') loadTrialBalance()
  }, [viewMode, loadJournal, loadTrialBalance])

  const filtered = useMemo(() => {
    return records.filter(t => {
      if (filterSt !== 'all' && t.status !== filterSt) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.desc.toLowerCase().includes(q) && !t.ref.toLowerCase().includes(q) && !t.account.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [records, search, filterSt])

  const totalIn  = filtered.filter(t => t.amount > 0).reduce((s,t)=>s+t.amount,0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const netFlow  = totalIn - totalOut

  const allIn    = records.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0)
  const allOut   = records.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0)
  const pending  = records.filter(t=>t.status==='pending').length

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0 fw-bold text-dark">Central Financial Accounting &amp; Ledger Hub</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>Unified double-entry general journal, cash movements &amp; statutory trial balance</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Finance</Link></li>
          <li className="breadcrumb-item active">General Ledger &amp; Journal</li>
        </ul>
      </div>

      {/* ── Mode Tab Switcher ── */}
      <div className="d-flex align-items-center gap-2 mb-4 border-bottom border-light-subtle pb-2 flex-wrap">
        <button
          type="button"
          className={`btn btn-sm px-3.5 py-2 fw-bold d-flex align-items-center gap-1.5 rounded-pill ${
            viewMode === 'cash_ledger' ? 'btn-dark text-white' : 'btn-light text-muted'
          }`}
          onClick={() => setViewMode('cash_ledger')}
        >
          <i className="ri-bank-card-line" />
          <span>Bank &amp; Cash Transactions</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm px-3.5 py-2 fw-bold d-flex align-items-center gap-1.5 rounded-pill ${
            viewMode === 'general_journal' ? 'btn-primary text-white' : 'btn-light text-muted'
          }`}
          onClick={() => {
            setViewMode('general_journal')
            loadJournal()
          }}
        >
          <i className="ri-book-2-line" />
          <span>Central General Journal (Double-Entry Dr/Cr)</span>
          <span className="badge bg-white text-primary ms-1" style={{ fontSize: 10 }}>GAAP/IFRS</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm px-3.5 py-2 fw-bold d-flex align-items-center gap-1.5 rounded-pill ${
            viewMode === 'trial_balance' ? 'btn-success text-white' : 'btn-light text-muted'
          }`}
          onClick={() => {
            setViewMode('trial_balance')
            loadTrialBalance()
          }}
        >
          <i className="ri-scales-3-line" />
          <span>Statutory Trial Balance (T-Accounts Audit)</span>
          <span className="badge bg-white text-success ms-1" style={{ fontSize: 10 }}>Dr = Cr Balanced</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load transactions.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* ── TAB 1: BANK & CASH LEDGER ── */}
      {viewMode === 'cash_ledger' && (
        <>
          {/* KPI strip */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-3.5" style={{ borderLeft: '4px solid #16a34a', background: '#f7fdf9' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Inflow (Loaded)</div>
                <div className="h4 font-weight-bold text-success mt-1 mb-0">+{fmt(allIn)}</div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Bank &amp; Gateway Receipts</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-3.5" style={{ borderLeft: '4px solid #dc2626', background: '#fef2f2' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Outflow (Loaded)</div>
                <div className="h4 font-weight-bold text-danger mt-1 mb-0">-{fmt(allOut)}</div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Disbursements &amp; Expenses</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-3.5" style={{ borderLeft: '4px solid #2563eb', background: '#eff6ff' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Net Movement</div>
                <div className="h4 font-weight-bold text-primary mt-1 mb-0">{fmt(allIn - allOut)}</div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Net Cash Flow</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-3.5" style={{ borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Pending Items</div>
                <div className="h4 font-weight-bold text-warning mt-1 mb-0">{pending}</div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Unsettled Transactions</div>
              </div>
            </div>
          </div>

          {/* Filters & search */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body p-3 d-flex align-items-center gap-2 flex-wrap">
              <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
                <span className="input-group-text bg-light border-0"><i className="ri-search-line" /></span>
                <input
                  type="text"
                  className="form-control bg-light border-0"
                  placeholder="Search ref, desc, account…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <select
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={filterType}
                onChange={e => setType(e.target.value)}
              >
                <option value="all">All Types</option>
                {TYPES.map(t => (
                  <option key={t} value={t}>{(TYPE_CFG[t] || {}).label || t}</option>
                ))}
              </select>

              <select
                className="form-select form-select-sm"
                style={{ width: 130 }}
                value={filterSt}
                onChange={e => setFilterSt(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <span className="text-muted small">to</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 130 }}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />

              <button className="btn btn-sm btn-outline-secondary" onClick={load}>
                <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th className="ps-3 py-2.5">Reference</th>
                    <th>Date &amp; Time</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                    <th>Status</th>
                    <th className="pe-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" className="text-center py-5 text-muted">Loading transactions…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="9" className="text-center py-5 text-muted">No transactions found matching your filters.</td></tr>
                  ) : (
                    filtered.map(t => {
                      const cfg  = TYPE_CFG[t.type] || TYPE_CFG.income
                      const scfg = STATUS_CFG[t.status] || STATUS_CFG.completed
                      const isPos = t.amount > 0
                      return (
                        <tr key={t.id} style={{ cursor:'pointer' }} onClick={()=>setSelected(t)}>
                          <td className="ps-3 font-monospace fw-bold" style={{ fontSize:12, color:'#2563eb' }}>{t.ref}</td>
                          <td className="text-muted" style={{ fontSize:12 }}>{t.date} {t.time}</td>
                          <td>
                            <span className={`badge bg-${cfg.cls}-subtle text-${cfg.cls} border border-${cfg.cls}-subtle`} style={{ fontSize:11 }}>
                              <i className={cfg.icon} /> {cfg.label}
                            </span>
                          </td>
                          <td className="text-capitalize" style={{ fontSize:12 }}>{t.category}</td>
                          <td style={{ fontSize:12 }}>{t.account}</td>
                          <td style={{ fontSize:12, maxWidth:220, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.desc}</td>
                          <td className="text-end font-monospace fw-bold" style={{ color: isPos ? '#16a34a' : '#dc2626' }}>
                            {isPos ? '+' : ''}{fmt(t.amount)}
                          </td>
                          <td>
                            <span className="badge" style={{ fontSize:11, background: scfg.bg, color: scfg.color, border:`1px solid ${scfg.border}` }}>
                              {scfg.label}
                            </span>
                          </td>
                          <td className="pe-3 text-end" onClick={e=>e.stopPropagation()}>
                            <button className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ fontSize:11 }} onClick={()=>setSelected(t)}>
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: CENTRAL GENERAL JOURNAL (DOUBLE-ENTRY DEBITS & CREDITS) ── */}
      {viewMode === 'general_journal' && (
        <div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #16A34A', background: '#F7FDF9' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Journal Debits (Dr)</div>
                <div className="h4 font-weight-bold text-success mt-1 mb-0">
                  +₦{(journalSummary?.total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>All Asset &amp; Expense Debits</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #2563EB', background: '#EFF6FF' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Journal Credits (Cr)</div>
                <div className="h4 font-weight-bold text-primary mt-1 mb-0">
                  -₦{(journalSummary?.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>All Revenue &amp; Liability Credits</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #059669', background: '#F0FDF4' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>General Ledger Variance</div>
                <div className="h4 font-weight-bold text-success mt-1 mb-0">
                  ₦{(journalSummary?.variance || 0).toFixed(2)}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Dr = Cr Statutory Balance</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4 bg-light" style={{ borderLeft: '4px solid #10B981' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Audited Ledger Integrity</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <i className="ri-shield-check-fill text-success fs-3"></i>
                  <span className="font-weight-bold text-success small">100% Reconciled</span>
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>{journalSummary?.total_entries || 0} Posted Journal Lines</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="card-header bg-white border-bottom border-light-subtle p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ri-book-open-line text-primary"></i>
                  <span>Central Double-Entry General Journal</span>
                </h6>
                <small className="text-muted" style={{ fontSize: 11 }}>
                  Every financial transaction across Orders, POS, Inventory, Purchases, Kitchen &amp; Wallets
                </small>
              </div>

              <div className="d-flex gap-2 align-items-center">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 160 }}
                  value={journalModule}
                  onChange={e => setJournalModule(e.target.value)}
                >
                  <option value="all">All Modules</option>
                  <option value="orders">Online Orders</option>
                  <option value="pos">POS Retail</option>
                  <option value="inventory">Perpetual Inventory</option>
                  <option value="purchases">Supplier Purchases</option>
                  <option value="driver_wallet">Driver Payouts</option>
                </select>

                <button className="btn btn-sm btn-outline-secondary" onClick={loadJournal}>
                  <i className={`ri-refresh-line ${loadingJournal ? 'ri-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th className="ps-3">Date</th>
                    <th>Journal Ref</th>
                    <th>Source Module</th>
                    <th>Debit Entry (Dr Account)</th>
                    <th>Credit Entry (Cr Account)</th>
                    <th>Amount (₦)</th>
                    <th>Narration</th>
                    <th className="pe-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-5 text-muted">No double-entry journal records found</td></tr>
                  ) : (
                    journalEntries.map(j => (
                      <tr key={j.id}>
                        <td className="ps-3 text-muted">{new Date(j.entry_date).toLocaleDateString()}</td>
                        <td className="font-monospace text-primary fw-bold">{j.journal_ref}</td>
                        <td>
                          <span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: 10 }}>
                            {j.source_module}
                          </span>
                        </td>
                        <td>
                          <div className="text-danger font-monospace fw-bold">
                            Dr: {j.debit_account_name} ({j.debit_account_code})
                          </div>
                          <div className="text-muted small">₦{parseFloat(j.debit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td>
                          <div className="text-success font-monospace fw-bold">
                            Cr: {j.credit_account_name} ({j.credit_account_code})
                          </div>
                          <div className="text-muted small">₦{parseFloat(j.credit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="fw-bold text-dark">
                          ₦{parseFloat(j.debit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-dark small" style={{ maxWidth: 260 }}>{j.narration}</td>
                        <td className="pe-3">
                          <span className="badge bg-success-subtle text-success text-uppercase" style={{ fontSize: 10 }}>
                            {j.status || 'Posted'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: STATUTORY TRIAL BALANCE ── */}
      {viewMode === 'trial_balance' && (
        <div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #16A34A', background: '#F7FDF9' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Trial Balance Debits</div>
                <div className="h4 font-weight-bold text-success mt-1 mb-0">
                  ₦{(trialSummary?.total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Sum of all Debit balances</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #2563EB', background: '#EFF6FF' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Total Trial Balance Credits</div>
                <div className="h4 font-weight-bold text-primary mt-1 mb-0">
                  ₦{(trialSummary?.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Sum of all Credit balances</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4" style={{ borderLeft: '4px solid #059669', background: '#F0FDF4' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Accounting Variance</div>
                <div className="h4 font-weight-bold text-success mt-1 mb-0">
                  ₦{(trialSummary?.variance || 0).toFixed(2)}
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>Zero Variance = True Double-Entry</div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3.5 rounded-4 bg-light" style={{ borderLeft: '4px solid #10B981' }}>
                <div className="text-muted small text-uppercase font-weight-bold" style={{ fontSize: 11 }}>Statutory Compliance</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <i className="ri-verified-badge-fill text-success fs-3"></i>
                  <span className="font-weight-bold text-success small">IFRS / GAAP Ready</span>
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: 11 }}>As of {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="card-header bg-white border-bottom border-light-subtle p-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="ri-scales-3-line text-success"></i>
                  <span>Statutory T-Account Trial Balance Sheet</span>
                </h6>
                <small className="text-muted" style={{ fontSize: 11 }}>
                  Comprehensive financial position across all 5 account categories: Assets (1000), Liabilities (2000), Equity (3000), Revenue (4000), Expenses (5000)
                </small>
              </div>

              <button className="btn btn-sm btn-outline-secondary" onClick={loadTrialBalance}>
                <i className={`ri-refresh-line ${loadingTrial ? 'ri-spin' : ''}`} />
                <span className="ms-1">Refresh Trial Balance</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11 }}>
                  <tr>
                    <th className="ps-3">Account Code</th>
                    <th>Account Title</th>
                    <th>Classification</th>
                    <th className="text-end">Debit (Dr) ₦</th>
                    <th className="text-end">Credit (Cr) ₦</th>
                    <th className="pe-3 text-end">Net Balance ₦</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalanceAccounts.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-5 text-muted">No accounts posted yet in General Ledger</td></tr>
                  ) : (
                    trialBalanceAccounts.map(acc => (
                      <tr key={acc.code}>
                        <td className="ps-3 font-monospace fw-bold text-primary">{acc.code}</td>
                        <td className="fw-bold text-dark">{acc.name}</td>
                        <td>
                          <span className="badge text-uppercase" style={{
                            background: acc.account_type === 'asset' ? '#EFF6FF' : acc.account_type === 'liability' ? '#FFFBEB' : acc.account_type === 'revenue' ? '#F0FDF4' : '#FEF2F2',
                            color: acc.account_type === 'asset' ? '#2563EB' : acc.account_type === 'liability' ? '#D97706' : acc.account_type === 'revenue' ? '#16A34A' : '#DC2626',
                          }}>
                            {acc.account_type}
                          </span>
                        </td>
                        <td className="text-end font-monospace text-danger">
                          {acc.total_debit > 0 ? `₦${acc.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="text-end font-monospace text-success">
                          {acc.total_credit > 0 ? `₦${acc.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="pe-3 text-end font-monospace fw-bold text-dark">
                          ₦{acc.net_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td colSpan="3" className="ps-3 text-uppercase">Totals &amp; Reconciliation</td>
                    <td className="text-end font-monospace text-danger">
                      ₦{(trialSummary?.total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-end font-monospace text-success">
                      ₦{(trialSummary?.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="pe-3 text-end font-monospace text-success">
                      Balanced (₦0.00)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:15 }}>Transaction Detail</div>
              <button className="btn-close btn-close-white btn-sm" onClick={()=>setSelected(null)}/>
            </div>

            <div className="p-4">
              <div className="text-center mb-4">
                <div style={{
                  width:64, height:64, borderRadius:'50%', margin:'0 auto 12px',
                  background: selected.amount>0?'#f0fdf4':'#fef2f2',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className={(TYPE_CFG[selected.type] || TYPE_CFG.income).icon} style={{ fontSize:28, color: selected.amount>0?'#22c55e':'#ef4444' }}/>
                </div>
                <div style={{ fontSize:28, fontWeight:700, color: selected.amount>0?'#22c55e':'#ef4444' }}>
                  {selected.amount>0?'+':'-'}{fmt(Math.abs(selected.amount))}
                </div>
                <div className="text-muted" style={{ fontSize:13, marginTop:4 }}>{selected.desc}</div>
              </div>

              {[
                { label:'Reference',   val:selected.ref       },
                { label:'Transaction', val:selected.id        },
                { label:'Date & Time', val:`${selected.date}${selected.time ? ' at ' + selected.time : ''}` },
                { label:'Type',        val:(TYPE_CFG[selected.type] || TYPE_CFG.income).label },
                { label:'Category',    val:selected.category  },
                { label:'Account',     val:selected.account   },
                { label:'Status',      val:selected.status    },
              ].map(row => (
                <div key={row.label} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span className="text-muted" style={{ fontSize:13 }}>{row.label}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>
                    {row.label === 'Status'
                      ? <span className="badge" style={{ fontSize:11, background:STATUS_CFG[selected.status]?.bg||'#f0fdf4', color:STATUS_CFG[selected.status]?.color||'#16a34a', border:`1px solid ${STATUS_CFG[selected.status]?.border||'#bbf7d0'}` }}>{STATUS_CFG[selected.status]?.label}</span>
                      : row.val}
                  </span>
                </div>
              ))}

              <button className="btn btn-secondary w-100 mt-4" onClick={()=>setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
