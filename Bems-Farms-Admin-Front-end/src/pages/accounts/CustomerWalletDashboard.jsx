import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useRealtimeEvent } from '../../context/RealtimeContext'

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'this_week', label: 'This Week' },
  { value: 'today', label: 'Today' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
]

const fmt = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CustomerWalletDashboard() {
  const [period, setPeriod] = useState('this_month')
  const [activeTab, setActiveTab] = useState('customers')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({
    period: 'this_month',
    dateFrom: '',
    dateTo: '',
    referenceCode: 'BEMS-CWAL-THIS_MONTH-ALL-CUSTOMERS',
    summary: {
      totalTopups: 0,
      totalSpent: 0,
      totalWalletBalance: 0,
      totalLifetimeTopups: 0,
      totalLifetimeSpent: 0,
      creditTxCount: 0,
      debitTxCount: 0,
      totalTxCount: 0,
      totalCustomers: 0,
      provisionedAccounts: 0,
      fundedCustomers: 0,
      coverageRate: 0,
    },
    customers: [],
    ledger: [],
  })

  // Quick wallet adjustment modal
  const [adjustModal, setAdjustModal] = useState(null)
  const [adjustType, setAdjustType] = useState('credit')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const fetchStatement = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true)
        else setRefreshing(true)

        const res = await api.get('/admin/wallets/customer-statement', {
          params: { period },
        })
        if (res.data) {
          setData(res.data)
        }
      } catch (err) {
        if (!silent) {
          toast.error(err?.response?.data?.error || 'Failed to load customer wallet statement')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [period]
  )

  useEffect(() => {
    fetchStatement(false)
    const timer = setInterval(() => {
      fetchStatement(true)
    }, 20000)
    return () => clearInterval(timer)
  }, [fetchStatement])

  useRealtimeEvent('customer:wallet_credited', () => fetchStatement(true))
  useRealtimeEvent('order:updated', () => fetchStatement(true))

  const q = search.trim().toLowerCase()

  const filteredCustomers = useMemo(() => {
    if (!q) return data.customers || []
    return (data.customers || []).filter((c) =>
      [c.name, c.email, c.phone, c.accountNumber, c.bankName, c.accountReference]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.customers, q])

  const dedicatedAccounts = useMemo(
    () => filteredCustomers.filter((c) => c.hasDedicatedAccount),
    [filteredCustomers]
  )

  const filteredLedger = useMemo(() => {
    if (!q) return data.ledger || []
    return (data.ledger || []).filter((tx) =>
      [tx.customerName, tx.customerEmail, tx.reference, tx.description, tx.category, tx.accountNumber]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [data.ledger, q])

  const activeRecordsCount =
    activeTab === 'customers'
      ? filteredCustomers.length
      : activeTab === 'accounts'
        ? dedicatedAccounts.length
        : filteredLedger.length

  const handleCopy = (text, label = 'Copied') => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    toast.success(`${label}: ${text}`)
  }

  const handleExportCsv = () => {
    let headers = []
    let rows = []
    let filename = `bemsfarms-customer-wallets-${period}.csv`

    if (activeTab === 'ledger') {
      filename = `bemsfarms-customer-wallet-ledger-${period}.csv`
      headers = ['Date', 'Customer', 'Email', 'Type', 'Category', 'Amount', 'Balance After', 'Reference', 'Description']
      rows = filteredLedger.map((tx) => [
        tx.createdAt || '',
        tx.customerName,
        tx.customerEmail,
        tx.type,
        tx.category,
        tx.amount,
        tx.balanceAfter,
        tx.reference,
        tx.description,
      ])
    } else if (activeTab === 'accounts') {
      filename = `bemsfarms-customer-monnify-accounts-${period}.csv`
      headers = ['Customer', 'Email', 'Phone', 'Account Number', 'Bank Name', 'Account Name', 'Account Reference', 'Live Balance']
      rows = dedicatedAccounts.map((c) => [
        c.name,
        c.email,
        c.phone,
        c.accountNumber,
        c.bankName,
        c.accountName,
        c.accountReference,
        c.balance,
      ])
    } else {
      headers = ['Customer', 'Email', 'Phone', 'Monnify Account', 'Bank', 'Period Top-ups', 'Period Spent', 'Live Balance', 'Lifetime Top-ups', 'Lifetime Spent']
      rows = filteredCustomers.map((c) => [
        c.name,
        c.email,
        c.phone,
        c.accountNumber || 'Not Provisioned',
        c.bankName || '—',
        c.periodTopups,
        c.periodSpent,
        c.balance,
        c.totalToppedUp,
        c.totalSpent,
      ])
    }

    const csvContent = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const handleAdjustWallet = async (e) => {
    e.preventDefault()
    if (!adjustModal) return
    const amt = Number(adjustAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount greater than 0')
      return
    }
    try {
      setAdjusting(true)
      await api.post(`/admin/customers/${adjustModal.id}/wallet`, {
        type: adjustType,
        amount: amt,
        description: adjustReason.trim() || `Admin manual ${adjustType} via Customer Wallet Studio`,
      })
      toast.success(`Wallet ${adjustType === 'credit' ? 'credited' : 'debited'} by ${fmt(amt)}`)
      setAdjustModal(null)
      setAdjustAmount('')
      setAdjustReason('')
      fetchStatement(true)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Wallet adjustment failed')
    } finally {
      setAdjusting(false)
    }
  }

  const { summary } = data

  return (
    <div className="container-fluid py-3">
      {/* Executive Studio Header */}
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span
              className="fw-bold text-uppercase"
              style={{ fontSize: 11, letterSpacing: '0.1em', color: '#15803d' }}
            >
              CUSTOMER MONNIFY · WALLET &amp; TREASURY STUDIO
            </span>
            <span
              className="badge d-inline-flex align-items-center gap-1"
              style={{ background: '#dcfce7', color: '#14532d', fontSize: 10 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'inline-block',
                }}
              />
              LIVE
            </span>
          </div>
          <h3 className="fw-bold mb-1 text-dark mt-1">Customer Wallet &amp; Monnify Statement</h3>
          <div className="text-muted small">
            Live per-customer Monnify reserved accounts, wallet funding, checkout debits, and treasury liability ledger.
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <select
            className="form-select form-select-sm bg-white fw-medium"
            style={{ width: 145 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm btn-white bg-white border fw-medium"
            onClick={() => fetchStatement(true)}
            disabled={loading || refreshing}
          >
            <i className={`ri-refresh-line me-1 ${refreshing ? 'ri-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm bg-white border fw-medium"
            onClick={handleExportCsv}
          >
            <i className="ri-download-2-line me-1" /> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold"
            style={{ background: '#1B4332', borderColor: '#1B4332' }}
            onClick={() => window.print()}
          >
            <i className="ri-printer-line me-1" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Studio Tab Pills */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {[
            { id: 'customers', label: `By Customer (${data.customers?.length || 0})` },
            { id: 'accounts', label: `Dedicated Accounts (${summary.provisionedAccounts || 0})` },
            { id: 'ledger', label: `Wallet Ledger (${data.ledger?.length || 0})` },
          ].map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="btn btn-sm fw-semibold px-3 py-1.5"
                style={{
                  borderRadius: 10,
                  background: active ? '#1B4332' : '#ffffff',
                  color: active ? '#ffffff' : '#334155',
                  border: active ? '1px solid #1B4332' : '1px solid #e2e8f0',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <Link
          to="/customers/wallet"
          className="small fw-semibold text-decoration-none"
          style={{ color: '#15803d' }}
        >
          Manage Individual Customer Wallets <i className="ri-arrow-right-line ms-1" />
        </Link>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="card border-0 shadow-sm h-100 text-white"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1B4332 0%, #14532d 100%)',
            }}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center opacity-90 small fw-bold text-uppercase">
                <span>CUSTOMER TOP-UPS (GROSS)</span>
                <i className="ri-wallet-3-line fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2">{fmt(summary.totalTopups)}</div>
              <div className="small opacity-90 mt-1">
                {summary.creditTxCount} credits · Lifetime {fmt(summary.totalLifetimeTopups)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>WALLET SPENT (CHECKOUT)</span>
                <i className="ri-checkbox-circle-line text-success fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2" style={{ color: '#15803d' }}>
                {fmt(summary.totalSpent)}
              </div>
              <div className="small text-muted mt-1">
                {summary.debitTxCount} order debits · Lifetime {fmt(summary.totalLifetimeSpent)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>ACTIVE WALLET LIABILITY</span>
                <i className="ri-bank-line text-warning fs-5" />
              </div>
              <div className="fs-3 fw-bold mt-2" style={{ color: '#d97706' }}>
                {fmt(summary.totalWalletBalance)}
              </div>
              <div className="small text-muted mt-1">
                {summary.fundedCustomers} funded across {summary.totalCustomers} customers
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small fw-bold text-uppercase">
                <span>MONNIFY ACCOUNT COVERAGE</span>
                <i className="ri-shield-check-line fs-5" style={{ color: '#1B4332' }} />
              </div>
              <div className="fs-3 fw-bold mt-2 text-dark">{summary.coverageRate}%</div>
              <div className="small text-muted mt-1">
                {summary.provisionedAccounts} / {summary.totalCustomers} dedicated NUBANs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Statement Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div>
              <h5 className="fw-bold mb-1 text-dark">
                {activeTab === 'customers'
                  ? 'Customer Wallet, Top-Up & Balance Statement'
                  : activeTab === 'accounts'
                    ? 'Monnify Dedicated Virtual Accounts Registry'
                    : 'Customer Wallet Transaction Ledger'}
              </h5>
              <div className="text-muted small font-monospace">
                Reference: {data.referenceCode} · Period: {data.dateFrom || 'ALL'} to {data.dateTo || 'NOW'}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: 250 }}>
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="ri-search-line" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Filter customer, account, or ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="badge bg-light text-dark border px-3 py-2 fw-semibold">
                {activeRecordsCount} {activeRecordsCount === 1 ? 'Record' : 'Records'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-success me-2" />
              Loading customer wallet statement...
            </div>
          ) : activeTab === 'customers' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light text-uppercase text-muted" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Customer</th>
                    <th>Monnify NUBAN</th>
                    <th className="text-center">Cr / Dr Txs</th>
                    <th className="text-end">Period Top-ups</th>
                    <th className="text-end">Period Spent</th>
                    <th className="text-end">Live Balance</th>
                    <th className="text-end">Lifetime Top-ups</th>
                    <th className="text-center">Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        No customer wallets match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-semibold text-dark">{c.name}</div>
                          <div className="text-muted small">{c.phone || c.email || `Customer #${c.id}`}</div>
                        </td>
                        <td>
                          {c.hasDedicatedAccount ? (
                            <div>
                              <span className="font-monospace fw-bold text-dark">{c.accountNumber}</span>
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 ms-1 text-muted"
                                onClick={() => handleCopy(c.accountNumber, 'Account copied')}
                                title="Copy NUBAN"
                              >
                                <i className="ri-file-copy-line" />
                              </button>
                              <div className="text-muted small">{c.bankName}</div>
                            </div>
                          ) : (
                            <span className="text-muted fst-italic small">Not provisioned</span>
                          )}
                        </td>
                        <td className="text-center font-monospace">
                          <span className="text-success fw-bold">{c.creditTxCount}</span> /{' '}
                          <span className="text-secondary">{c.debitTxCount}</span>
                        </td>
                        <td className="text-end fw-semibold" style={{ color: '#15803d' }}>
                          {fmt(c.periodTopups)}
                        </td>
                        <td className="text-end fw-semibold text-secondary">{fmt(c.periodSpent)}</td>
                        <td className="text-end fw-bold text-dark">{fmt(c.balance)}</td>
                        <td className="text-end text-muted">{fmt(c.totalToppedUp)}</td>
                        <td className="text-center">
                          {c.balance > 0 ? (
                            <span className="badge rounded-pill" style={{ background: '#dcfce7', color: '#14532d' }}>
                              Funded
                            </span>
                          ) : c.hasDedicatedAccount ? (
                            <span className="badge rounded-pill bg-light text-secondary border">Ready</span>
                          ) : (
                            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">Pending</span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setAdjustModal(c)
                              setAdjustType('credit')
                              setAdjustAmount('')
                              setAdjustReason('')
                            }}
                          >
                            <i className="ri-equalizer-line me-1" /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'accounts' ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light text-uppercase text-muted" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Customer</th>
                    <th>Account Number</th>
                    <th>Bank Name</th>
                    <th>Account Name</th>
                    <th>Monnify Reference</th>
                    <th>Provisioned</th>
                    <th className="text-end">Live Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {dedicatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        No Monnify dedicated virtual accounts provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    dedicatedAccounts.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-semibold text-dark">{c.name}</div>
                          <div className="text-muted small">{c.email || c.phone}</div>
                        </td>
                        <td className="font-monospace fw-bold text-dark">
                          {c.accountNumber}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 ms-1 text-muted"
                            onClick={() => handleCopy(c.accountNumber, 'Account copied')}
                            title="Copy NUBAN"
                          >
                            <i className="ri-file-copy-line" />
                          </button>
                        </td>
                        <td className="fw-semibold text-secondary">{c.bankName}</td>
                        <td className="text-muted">{c.accountName || c.name}</td>
                        <td className="font-monospace small text-muted">{c.accountReference}</td>
                        <td className="small text-muted">{fmtDate(c.walletCreatedAt)}</td>
                        <td className="text-end fw-bold" style={{ color: '#14532d' }}>
                          {fmt(c.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light text-uppercase text-muted" style={{ fontSize: 11 }}>
                  <tr>
                    <th>Timestamp</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                    <th className="text-end">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-muted">
                        No wallet transactions found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx) => {
                      const isCredit = String(tx.type || '').toLowerCase() === 'credit'
                      return (
                        <tr key={tx.id}>
                          <td className="small text-muted text-nowrap">{fmtDate(tx.createdAt)}</td>
                          <td>
                            <div className="fw-semibold text-dark">{tx.customerName}</div>
                            <div className="text-muted small">
                              {tx.accountNumber ? `${tx.accountNumber} · ${tx.bankName}` : tx.customerEmail}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge rounded-pill text-uppercase ${
                                isCredit ? '' : 'bg-danger-subtle text-danger'
                              }`}
                              style={isCredit ? { background: '#dcfce7', color: '#14532d' } : undefined}
                            >
                              {isCredit ? '↓ Credit' : '↑ Debit'}
                            </span>
                          </td>
                          <td className="font-monospace small text-muted">{tx.category}</td>
                          <td className="font-monospace small text-muted">{tx.reference || '—'}</td>
                          <td className="text-secondary text-truncate" style={{ maxWidth: 260 }}>
                            {tx.description || '—'}
                          </td>
                          <td
                            className={`text-end fw-bold ${isCredit ? '' : 'text-danger'}`}
                            style={isCredit ? { color: '#15803d' } : undefined}
                          >
                            {isCredit ? '+' : '-'}
                            {fmt(tx.amount)}
                          </td>
                          <td className="text-end fw-semibold text-dark">{fmt(tx.balanceAfter)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Adjust Modal */}
      {adjustModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: 'rgba(15, 23, 42, 0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div
                className="modal-header text-white border-0"
                style={{ background: '#1B4332' }}
              >
                <div>
                  <h6 className="modal-title fw-bold mb-0">Adjust Customer Wallet</h6>
                  <small className="opacity-75">
                    {adjustModal.name} · Current Balance: {fmt(adjustModal.balance)}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setAdjustModal(null)}
                />
              </div>
              <form onSubmit={handleAdjustWallet}>
                <div className="modal-body p-4">
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <button
                        type="button"
                        onClick={() => setAdjustType('credit')}
                        className={`btn btn-sm w-100 fw-bold ${
                          adjustType === 'credit' ? 'btn-success' : 'btn-outline-secondary'
                        }`}
                      >
                        + Credit Wallet
                      </button>
                    </div>
                    <div className="col-6">
                      <button
                        type="button"
                        onClick={() => setAdjustType('debit')}
                        className={`btn btn-sm w-100 fw-bold ${
                          adjustType === 'debit' ? 'btn-danger' : 'btn-outline-secondary'
                        }`}
                      >
                        - Debit Wallet
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Amount (₦)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      className="form-control"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <div>
                    <label className="form-label small fw-semibold">Reason / Reference Note</label>
                    <input
                      type="text"
                      className="form-control"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Refund or manual Monnify reconciliation"
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0 px-4 pb-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setAdjustModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting}
                    className="btn btn-sm text-white fw-semibold"
                    style={{ background: '#1B4332' }}
                  >
                    {adjusting ? 'Processing...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
