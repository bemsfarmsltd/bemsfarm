import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

const ADJUSTMENT_CATEGORIES = [
  { value: 'bonus', label: 'Performance / Milestone Bonus (Credit)' },
  { value: 'fuel_stipend', label: 'Fuel & Logistics Stipend (Credit)' },
  { value: 'incentive', label: 'Special Incentive / Reward (Credit)' },
  { value: 'manual_adjustment', label: 'Manual Reconciliation (Credit/Debit)' },
  { value: 'shortage_penalty', label: 'Delivery Shortage Penalty (Debit)' },
  { value: 'damage_deduction', label: 'Produce Damage Deduction (Debit)' },
]

export default function WalletManagement() {
  const [activeTab, setActiveTab] = useState('accounts') // 'accounts' | 'payouts' | 'ledger' | 'settings'
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    total_fleet_liability: 0,
    total_gross_earned: 0,
    total_disbursed: 0,
    total_pending_payouts: 0,
    total_pending_count: 0,
    total_virtual_accounts: 0,
    total_drivers: 0,
  })
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Payouts State
  const [payouts, setPayouts] = useState([])
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all')
  const [payoutSearch, setPayoutSearch] = useState('')
  const [selectedPayoutIds, setSelectedPayoutIds] = useState([])
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Ledger State
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(false)

  // Modals State
  const [modalType, setModalType] = useState(null) // 'adjust' | 'freeze' | 'statement' | 'rate' | 'payout_action'
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [payoutDecision, setPayoutDecision] = useState('paid') // 'paid' | 'rejected'
  const [statementData, setStatementData] = useState(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form States
  const [adjustForm, setAdjustForm] = useState({
    type: 'credit', // 'credit' | 'debit'
    amount: '',
    category: 'bonus',
    description: '',
    reference: '',
  })
  const [freezeReason, setFreezeReason] = useState('')
  const [commissionRate, setCommissionRate] = useState('')
  const [payoutRemarks, setPayoutRemarks] = useState('')

  // ── 1. Fetch Wallets Summary ────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/wallets/summary', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      })
      setMetrics(res.data.metrics || {})
      setDrivers(res.data.drivers || [])
    } catch {
      toast.error('Failed to load wallet accounts data')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  // ── 2. Fetch Payouts ─────────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setPayoutLoading(true)
    try {
      const res = await api.get('/admin/deliveries/payouts', {
        params: {
          status: payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
        },
      })
      setPayouts(res.data.payouts || [])
    } catch {
      toast.error('Failed to load payout requests')
    } finally {
      setPayoutLoading(false)
    }
  }, [payoutStatusFilter])

  // ── 3. Fetch Master Ledger ───────────────────────────────────────────
  const loadLedger = useCallback(async () => {
    setLedgerLoading(true)
    try {
      const res = await api.get('/admin/wallets/ledger')
      setLedger(res.data.ledger || [])
    } catch {
      toast.error('Failed to load audit ledger')
    } finally {
      setLedgerLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(loadSummary, 250)
    return () => clearTimeout(t)
  }, [loadSummary])

  useEffect(() => {
    if (activeTab === 'payouts') loadPayouts()
    if (activeTab === 'ledger') loadLedger()
  }, [activeTab, loadPayouts, loadLedger])

  // ── Modal Open Handlers ──────────────────────────────────────────────
  const openAdjustModal = (driver) => {
    setSelectedDriver(driver)
    setAdjustForm({
      type: 'credit',
      amount: '',
      category: 'bonus',
      description: '',
      reference: '',
    })
    setModalType('adjust')
  }

  const openFreezeModal = (driver) => {
    setSelectedDriver(driver)
    setFreezeReason(driver.wallet_frozen_reason || '')
    setModalType('freeze')
  }

  const openRateModal = (driver) => {
    setSelectedDriver(driver)
    setCommissionRate(driver.commission_per_delivery || 500)
    setModalType('rate')
  }

  const openStatementModal = async (driver) => {
    setSelectedDriver(driver)
    setStatementData(null)
    setStatementLoading(true)
    setModalType('statement')
    try {
      const res = await api.get(`/admin/wallets/drivers/${driver.id}/statement`)
      setStatementData(res.data)
    } catch {
      toast.error('Failed to load driver statement')
    } finally {
      setStatementLoading(false)
    }
  }

  const openPayoutModal = (payout, decision) => {
    setSelectedPayout(payout)
    setPayoutDecision(decision)
    setPayoutRemarks('')
    setModalType('payout_action')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedDriver(null)
    setSelectedPayout(null)
    setStatementData(null)
  }

  // ── Actions ──────────────────────────────────────────────────────────
  const handleSaveAdjustment = async (e) => {
    e.preventDefault()
    if (!adjustForm.amount || Number(adjustForm.amount) <= 0) {
      toast.error('Enter a valid positive amount')
      return
    }
    if (!adjustForm.description.trim()) {
      toast.error('Audit description is required')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/admin/wallets/drivers/${selectedDriver.id}/adjust`, adjustForm)
      toast.success(
        `Driver wallet ${adjustForm.type === 'credit' ? 'credited' : 'debited'} with ₦${Number(
          adjustForm.amount
        ).toLocaleString()}`
      )
      closeModal()
      loadSummary()
      if (activeTab === 'ledger') loadLedger()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFreeze = async () => {
    setSubmitting(true)
    const newFreezeStatus = !selectedDriver.wallet_is_frozen
    try {
      await api.patch(`/admin/wallets/drivers/${selectedDriver.id}/freeze`, {
        is_frozen: newFreezeStatus,
        reason: newFreezeStatus ? freezeReason.trim() : undefined,
      })
      toast.success(
        newFreezeStatus ? '🔒 Driver wallet FROZEN. Withdrawals blocked.' : '🔓 Driver wallet has been UNFROZEN.'
      )
      closeModal()
      loadSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update freeze status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveRate = async (e) => {
    e.preventDefault()
    if (!commissionRate || Number(commissionRate) < 0) {
      toast.error('Enter a valid rate')
      return
    }
    setSubmitting(true)
    try {
      await api.patch(`/admin/wallets/drivers/${selectedDriver.id}/commission-rate`, {
        commission_per_delivery: commissionRate,
      })
      toast.success(`Commission rate updated to ₦${Number(commissionRate).toLocaleString()} / drop`)
      closeModal()
      loadSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission rate')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSinglePayoutAction = async (e) => {
    e.preventDefault()
    if (payoutDecision === 'rejected' && !payoutRemarks.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    setSubmitting(true)
    try {
      await api.patch(`/admin/deliveries/payouts/${selectedPayout.id}`, {
        status: payoutDecision,
        notes: payoutDecision === 'paid' ? payoutRemarks.trim() : undefined,
        rejection_reason: payoutDecision === 'rejected' ? payoutRemarks.trim() : undefined,
      })
      toast.success(
        payoutDecision === 'paid' ? '💰 Payout marked as Disbursed / Paid!' : '⚠️ Payout request rejected.'
      )
      closeModal()
      loadPayouts()
      loadSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payout')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkApprovePayouts = async () => {
    if (selectedPayoutIds.length === 0) return
    setBulkProcessing(true)
    try {
      const res = await api.post('/admin/wallets/payouts/bulk-approve', {
        payout_ids: selectedPayoutIds,
      })
      toast.success(`🎉 Batch of ${res.data.updated_count} payouts marked as Paid!`)
      setSelectedPayoutIds([])
      loadPayouts()
      loadSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process bulk payouts')
    } finally {
      setBulkProcessing(false)
    }
  }

  const filteredPayouts = useMemo(() => {
    if (!payoutSearch.trim()) return payouts
    const q = payoutSearch.toLowerCase().trim()
    return payouts.filter(
      (p) =>
        (p.driver_name || '').toLowerCase().includes(q) ||
        (p.driver_phone || '').includes(q) ||
        (p.payout_ref || '').toLowerCase().includes(q) ||
        (p.bank_name || '').toLowerCase().includes(q) ||
        (p.account_number || '').includes(q)
    )
  }, [payouts, payoutSearch])

  const exportPayoutsCSV = () => {
    if (payouts.length === 0) {
      toast.error('No payouts to export')
      return
    }
    const headers = ['Payout Ref', 'Driver Name', 'Phone', 'Amount (NGN)', 'Bank Name', 'Account Number', 'Account Name', 'Status', 'Requested At']
    const rows = payouts.map((p) => [
      p.payout_ref,
      `"${p.driver_name}"`,
      p.driver_phone,
      p.amount,
      `"${p.bank_name || ''}"`,
      `"${p.account_number || ''}"`,
      `"${p.account_name || ''}"`,
      p.status,
      p.requested_at ? new Date(p.requested_at).toISOString() : '',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `bems_driver_payouts_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('📊 Settlement CSV exported successfully!')
  }

  return (
    <div className="container-fluid pb-5">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h4 className="mb-1 fw-bold text-dark font-display">Wallet Accounts &amp; Settlement Management</h4>
          <p className="text-muted mb-0 fs-13">
            Master liquidity control, dedicated driver virtual accounts, manual balance adjustments, bulk disbursement pipeline, and central audit ledger.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ul className="breadcrumb mb-0 d-none d-md-flex">
            <li className="breadcrumb-item">
              <Link to="/accounts/transactions">Finance</Link>
            </li>
            <li className="breadcrumb-item active">Wallets &amp; Virtual Accounts</li>
          </ul>
          <button
            type="button"
            className="btn btn-outline-primary fw-semibold d-flex align-items-center gap-1.5 px-3 py-2 fs-13 shadow-sm rounded-3"
            onClick={exportPayoutsCSV}
          >
            <i className="ri-file-download-line fs-15" />
            <span>Export Settlement CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Hub ────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-blue" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">System Fleet Liability</span>
                <span className="kpi-icon-pill" style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb18', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ri-wallet-3-line fs-18" />
                </span>
              </div>
              <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(metrics.total_fleet_liability)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                <span>Withdrawable Balance</span>
                <span className="badge bg-primary-subtle text-primary font-monospace">Active Obligation</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-amber" style={{ borderLeft: '4px solid #d97706' }}>
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Pending Withdrawals</span>
                <span className="kpi-icon-pill" style={{ width: 36, height: 36, borderRadius: 10, background: '#d9770618', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ri-time-line fs-18" />
                </span>
              </div>
              <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(metrics.total_pending_payouts)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                <span>{metrics.total_pending_count} Requests in Queue</span>
                <span className="badge bg-warning-subtle text-warning font-monospace">Awaiting Action</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-green" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Total Disbursed (Paid)</span>
                <span className="kpi-icon-pill" style={{ width: 36, height: 36, borderRadius: 10, background: '#16a34a18', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ri-checkbox-circle-line fs-18" />
                </span>
              </div>
              <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(metrics.total_disbursed)}</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                <span>Settled to Bank Accounts</span>
                <span className="badge bg-success-subtle text-success font-monospace">Completed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-teal" style={{ borderLeft: '4px solid #0d9488' }}>
            <div className="card-body p-3.5">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Virtual Accounts Allocated</span>
                <span className="kpi-icon-pill" style={{ width: 36, height: 36, borderRadius: 10, background: '#0d948818', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ri-building-4-line fs-18" />
                </span>
              </div>
              <div className="fs-22 fw-bolder text-dark mb-1 font-display">{metrics.total_virtual_accounts} Accounts</div>
              <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                <span>Monnify / Wema Bank</span>
                <span className="badge bg-info-subtle text-info font-monospace">100% Provisioned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Navigation Tabs ───────────────────────────────────── */}
      <div className="d-flex align-items-center gap-2 mb-4 bg-light p-1.5 rounded-3 border" style={{ maxWidth: 640 }}>
        <button
          type="button"
          className={`btn btn-sm flex-fill py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
            activeTab === 'accounts' ? 'btn-white shadow-sm text-primary' : 'text-muted'
          }`}
          onClick={() => setActiveTab('accounts')}
        >
          <i className="ri-wallet-3-line fs-16" />
          <span>💳 Dedicated Virtual Accounts ({drivers.length})</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm flex-fill py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
            activeTab === 'payouts' ? 'btn-white shadow-sm text-emerald' : 'text-muted'
          }`}
          onClick={() => setActiveTab('payouts')}
        >
          <i className="ri-money-dollar-circle-line fs-16" />
          <span>💸 Withdrawal Pipeline</span>
          {metrics.total_pending_count > 0 && (
            <span className="badge bg-danger rounded-pill px-2 py-0.5 fs-10">{metrics.total_pending_count}</span>
          )}
        </button>

        <button
          type="button"
          className={`btn btn-sm flex-fill py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
            activeTab === 'ledger' ? 'btn-white shadow-sm text-dark' : 'text-muted'
          }`}
          onClick={() => setActiveTab('ledger')}
        >
          <i className="ri-file-list-3-line fs-16" />
          <span>📜 Audit Ledger</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: DEDICATED VIRTUAL ACCOUNTS (DVA LEDGER)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'accounts' && (
        <div className="card border-0 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="input-group" style={{ maxWidth: 320 }}>
              <span className="input-group-text bg-light text-muted">
                <i className="ri-search-line" />
              </span>
              <input
                className="form-control bg-light fs-13"
                placeholder="Search driver, phone, account number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm bg-light fs-12"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Wallets</option>
                <option value="active">Active Wallets</option>
                <option value="frozen">Frozen Wallets</option>
              </select>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={loadSummary}
                disabled={loading}
              >
                <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-muted fs-11 text-uppercase fw-bold">
                  <th className="ps-4">Driver Profile</th>
                  <th>Dedicated Inflow Account (DVA)</th>
                  <th>Total Gross Earned</th>
                  <th>Disbursed (Paid Out)</th>
                  <th>Pending Hold</th>
                  <th>Available Balance</th>
                  <th>Per-Drop Rate</th>
                  <th>Wallet Status</th>
                  <th className="text-end pe-4">Wallet Operations</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading driver wallet accounts &amp; live balances…
                    </td>
                  </tr>
                )}
                {!loading && drivers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-5">
                      <div className="fs-24 mb-1">💳</div>
                      <div className="fw-bold text-dark">No driver wallets found</div>
                      <small>When couriers are onboarded, their virtual accounts will appear here.</small>
                    </td>
                  </tr>
                )}
                {!loading &&
                  drivers.map((d) => {
                    const isFrozen = d.wallet_is_frozen

                    return (
                      <tr key={d.id} className={isFrozen ? 'table-danger' : ''}>
                        {/* Driver Profile */}
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2.5">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold fs-13 flex-shrink-0"
                              style={{ width: 38, height: 38, background: '#eff6ff', border: '1px solid #bfdbfe' }}
                            >
                              {d.name ? d.name.split(' ').map((n) => n[0]).join('') : 'DR'}
                            </div>
                            <div>
                              <div className="fw-bold text-dark fs-13">{d.name}</div>
                              <div className="text-muted font-monospace fs-11">{d.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Dedicated Virtual Account */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="font-monospace fw-bold text-primary fs-13">{d.wallet_account_number}</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-muted"
                              title="Copy Account Number"
                              onClick={() => {
                                navigator.clipboard.writeText(d.wallet_account_number)
                                toast.success(`Copied Account No: ${d.wallet_account_number}`)
                              }}
                            >
                              <i className="ri-file-copy-line fs-12" />
                            </button>
                          </div>
                          <div className="text-muted fs-11">{d.wallet_bank_name}</div>
                          <div className="text-muted fs-10">{d.wallet_account_name}</div>
                        </td>

                        {/* Gross Earned */}
                        <td>
                          <div className="fw-bold text-dark fs-13 font-monospace">{fmt(d.total_earned)}</div>
                          <span className="text-muted fs-11">{d.total_delivered || 0} deliveries</span>
                        </td>

                        {/* Paid Out */}
                        <td>
                          <div className="fw-semibold text-muted fs-13 font-monospace">{fmt(d.total_paid)}</div>
                        </td>

                        {/* Pending Hold */}
                        <td>
                          {d.pending_payouts > 0 ? (
                            <span className="badge bg-warning-subtle text-warning font-monospace fs-12 px-2 py-1">
                              {fmt(d.pending_payouts)}
                            </span>
                          ) : (
                            <span className="text-muted fs-12 font-monospace">₦0</span>
                          )}
                        </td>

                        {/* Available Balance */}
                        <td>
                          <div className="fw-bold text-emerald fs-14 font-monospace">{fmt(d.available_balance)}</div>
                          <span className="badge bg-success-subtle text-success fs-10">Withdrawable</span>
                        </td>

                        {/* Commission Rate */}
                        <td>
                          <div className="d-flex align-items-center gap-1 font-monospace fs-12 text-dark fw-medium">
                            <span>{fmt(d.commission_per_delivery || 500)}</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-muted"
                              title="Edit Commission Rate"
                              onClick={() => openRateModal(d)}
                            >
                              <i className="ri-edit-line fs-12" />
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          {isFrozen ? (
                            <span className="badge bg-danger rounded-pill px-2.5 py-1 text-xs fw-bold">
                              <i className="ri-lock-line me-1" />
                              Frozen
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success rounded-pill px-2.5 py-1 text-xs fw-bold border border-success-subtle">
                              ● Active
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-4">
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            {/* Adjust (Credit / Debit) */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary px-2 py-1 fs-12 fw-semibold d-flex align-items-center gap-1"
                              title="Credit or Debit Balance"
                              onClick={() => openAdjustModal(d)}
                            >
                              <i className="ri-exchange-dollar-line" />
                              <span>Adjust</span>
                            </button>

                            {/* View Statement */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2 py-1 fs-12"
                              title="Itemized Transaction Statement"
                              onClick={() => openStatementModal(d)}
                            >
                              <i className="ri-file-list-line" />
                            </button>

                            {/* Freeze / Unfreeze */}
                            <button
                              type="button"
                              className={`btn btn-sm px-2 py-1 fs-12 ${isFrozen ? 'btn-success' : 'btn-outline-danger'}`}
                              title={isFrozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                              onClick={() => openFreezeModal(d)}
                            >
                              <i className={isFrozen ? 'ri-lock-unlock-line' : 'ri-lock-line'} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: WITHDRAWAL & PAYOUT PIPELINE
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'payouts' && (
        <div className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="input-group" style={{ maxWidth: 280 }}>
                <span className="input-group-text bg-light text-muted">
                  <i className="ri-search-line" />
                </span>
                <input
                  className="form-control bg-light fs-13"
                  placeholder="Search payout ref, driver, bank..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                />
              </div>

              <div className="d-flex gap-1">
                {['all', 'pending', 'approved', 'paid', 'rejected'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm text-capitalize px-2.5 py-1 ${
                      payoutStatusFilter === st ? 'btn-primary shadow-sm fw-bold' : 'btn-light text-muted'
                    }`}
                    onClick={() => setPayoutStatusFilter(st)}
                  >
                    {st === 'all' ? 'All Requests' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {selectedPayoutIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1.5 shadow-sm px-3"
                  onClick={handleBulkApprovePayouts}
                  disabled={bulkProcessing}
                >
                  <i className="ri-check-double-line" />
                  <span>Bulk Disburse ({selectedPayoutIds.length})</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={loadPayouts}
                disabled={payoutLoading}
              >
                <i className={`ri-refresh-line ${payoutLoading ? 'ri-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-muted fs-11 text-uppercase fw-bold">
                  <th style={{ width: 40 }} className="ps-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={
                        filteredPayouts.filter((p) => p.status === 'pending').length > 0 &&
                        selectedPayoutIds.length === filteredPayouts.filter((p) => p.status === 'pending').length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayoutIds(filteredPayouts.filter((p) => p.status === 'pending').map((p) => p.id))
                        } else {
                          setSelectedPayoutIds([])
                        }
                      }}
                    />
                  </th>
                  <th>Payout Ref / Date</th>
                  <th>Driver Details</th>
                  <th>Withdrawal Amount</th>
                  <th>Destination Bank Account</th>
                  <th>Status</th>
                  <th>Audit Logs</th>
                  <th className="text-end pe-4">Settlement Action</th>
                </tr>
              </thead>
              <tbody>
                {payoutLoading && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading withdrawal requests pipeline…
                    </td>
                  </tr>
                )}
                {!payoutLoading && filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-5">
                      <div className="fs-24 mb-1">💸</div>
                      <div className="fw-bold text-dark">No withdrawal requests found</div>
                      <small>Driver withdrawal requests will appear here for one-click approval and disbursement.</small>
                    </td>
                  </tr>
                )}
                {!payoutLoading &&
                  filteredPayouts.map((p) => {
                    const isPending = p.status === 'pending'
                    const isApproved = p.status === 'approved'
                    const isSelected = selectedPayoutIds.includes(p.id)

                    return (
                      <tr key={p.id} className={isSelected ? 'table-primary' : ''}>
                        {/* Checkbox */}
                        <td className="ps-3">
                          {isPending && (
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPayoutIds((prev) => [...prev, p.id])
                                } else {
                                  setSelectedPayoutIds((prev) => prev.filter((id) => id !== p.id))
                                }
                              }}
                            />
                          )}
                        </td>

                        {/* Ref & Date */}
                        <td>
                          <div className="fw-bold text-dark font-monospace fs-13">{p.payout_ref}</div>
                          <div className="text-muted fs-11">
                            {p.requested_at ? new Date(p.requested_at).toLocaleString() : '—'}
                          </div>
                        </td>

                        {/* Driver */}
                        <td>
                          <div className="fw-bold text-dark fs-13">{p.driver_name}</div>
                          <div className="text-muted font-monospace fs-11">{p.driver_phone}</div>
                        </td>

                        {/* Amount */}
                        <td>
                          <div className="fw-bold text-dark fs-14 font-monospace">{fmt(p.amount)}</div>
                          <span className="badge bg-light text-muted border fs-10">Commission Payout</span>
                        </td>

                        {/* Bank Account */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="fw-bold text-dark fs-13">{p.bank_name || 'Bank'}</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-muted"
                              title="Copy Account Number"
                              onClick={() => {
                                navigator.clipboard.writeText(p.account_number)
                                toast.success(`Copied: ${p.account_number}`)
                              }}
                            >
                              <i className="ri-file-copy-line" />
                            </button>
                          </div>
                          <div className="font-monospace text-primary fs-12 fw-semibold">{p.account_number}</div>
                          <div className="text-muted fs-11">{p.account_name || '—'}</div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge rounded-pill px-2.5 py-1 text-xs fw-bold ${
                              p.status === 'paid'
                                ? 'bg-success-subtle text-success'
                                : p.status === 'pending'
                                ? 'bg-warning-subtle text-warning'
                                : p.status === 'approved'
                                ? 'bg-primary-subtle text-primary'
                                : 'bg-danger-subtle text-danger'
                            }`}
                          >
                            {p.status === 'paid' ? '✅ Paid' : p.status === 'pending' ? '⏳ Pending Review' : p.status}
                          </span>
                        </td>

                        {/* Audit Details */}
                        <td>
                          {p.processed_at ? (
                            <div>
                              <div className="text-dark fs-12 fw-medium">
                                By {p.processed_by_name || 'Staff'} on {new Date(p.processed_at).toLocaleDateString()}
                              </div>
                              {p.rejection_reason && <div className="text-danger fs-11">Reason: {p.rejection_reason}</div>}
                              {p.notes && <div className="text-muted fs-11">Note: {p.notes}</div>}
                            </div>
                          ) : (
                            <span className="text-muted fs-12 italic">Awaiting Admin Action</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="text-end pe-4">
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            {(isPending || isApproved) && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success fw-bold px-2.5 py-1 text-xs d-flex align-items-center gap-1 shadow-sm"
                                  onClick={() => openPayoutModal(p, 'paid')}
                                >
                                  <i className="ri-check-line" />
                                  <span>Mark Paid</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger fw-semibold px-2 py-1 text-xs"
                                  onClick={() => openPayoutModal(p, 'rejected')}
                                >
                                  <i className="ri-close-line" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            {!isPending && !isApproved && <span className="text-muted fs-12">Settled</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: GLOBAL CENTRAL SYSTEM AUDIT LEDGER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-0 fw-bold text-dark font-display">System Wallet Operations &amp; Audit Trail</h6>
              <span className="text-muted fs-12">Complete chronological record of all manual credits, debits, adjustments, and disbursements.</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={loadLedger}
              disabled={ledgerLoading}
            >
              <i className={`ri-refresh-line ${ledgerLoading ? 'ri-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-muted fs-11 text-uppercase fw-bold">
                  <th className="ps-4">Date / Time</th>
                  <th>Driver Details</th>
                  <th>Action Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Balance Before / After</th>
                  <th>Audit Reference / Description</th>
                  <th className="text-end pe-4">Operator</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoading && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading audit ledger…
                    </td>
                  </tr>
                )}
                {!ledgerLoading && ledger.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-5">
                      <div className="fs-24 mb-1">📜</div>
                      <div className="fw-bold text-dark">No manual adjustments recorded yet</div>
                      <small>When administrators apply manual wallet credits, debits, or penalties, they will be tracked here.</small>
                    </td>
                  </tr>
                )}
                {!ledgerLoading &&
                  ledger.map((l) => (
                    <tr key={l.id}>
                      <td className="ps-4 font-monospace fs-12 text-muted">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div className="fw-bold text-dark fs-13">{l.driver_name}</div>
                        <div className="text-muted font-monospace fs-11">{l.driver_phone}</div>
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill px-2.5 py-1 text-xs fw-bold ${
                            l.type === 'credit' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                          }`}
                        >
                          {l.type === 'credit' ? '+ Credit' : '- Debit'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace text-uppercase fs-10">
                          {l.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="fw-bold font-monospace fs-13">
                        <span className={l.type === 'credit' ? 'text-success' : 'text-danger'}>
                          {l.type === 'credit' ? '+' : '-'}
                          {fmt(l.amount)}
                        </span>
                      </td>
                      <td className="font-monospace fs-11 text-muted">
                        {fmt(l.balance_before)} &rarr; <strong className="text-dark">{fmt(l.balance_after)}</strong>
                      </td>
                      <td>
                        <div className="font-monospace fs-11 fw-semibold text-primary">{l.reference}</div>
                        <div className="text-dark fs-12">{l.description}</div>
                      </td>
                      <td className="text-end pe-4 text-muted fs-12">{l.performed_by_name || 'System / Admin'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* 1. MANUAL ADJUSTMENT MODAL (CREDIT / DEBIT) */}
      {modalType === 'adjust' && selectedDriver && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-exchange-dollar-line text-primary fs-22" />
                <h5 className="fw-bold mb-0 text-dark font-display">Manual Wallet Adjustment</h5>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Target Courier:</span>
                <strong className="text-dark">{selectedDriver.name} ({selectedDriver.phone})</strong>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Virtual Account:</span>
                <span className="text-primary font-monospace">{selectedDriver.wallet_account_number}</span>
              </div>
              <div className="d-flex justify-content-between small">
                <span className="text-muted">Current Available Balance:</span>
                <strong className="text-emerald font-monospace fs-14">{fmt(selectedDriver.available_balance)}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              {/* Type Switcher */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">Adjustment Action</label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className={`btn flex-fill py-2 fw-bold fs-13 ${
                      adjustForm.type === 'credit' ? 'btn-success text-white shadow-sm' : 'btn-outline-secondary'
                    }`}
                    onClick={() => setAdjustForm((f) => ({ ...f, type: 'credit' }))}
                  >
                    <i className="ri-add-circle-line me-1" />
                    Credit (+ Balance)
                  </button>
                  <button
                    type="button"
                    className={`btn flex-fill py-2 fw-bold fs-13 ${
                      adjustForm.type === 'debit' ? 'btn-danger text-white shadow-sm' : 'btn-outline-secondary'
                    }`}
                    onClick={() => setAdjustForm((f) => ({ ...f, type: 'debit' }))}
                  >
                    <i className="ri-indeterminate-circle-line me-1" />
                    Debit (- Deduction)
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-control font-monospace fs-14 fw-bold"
                  placeholder="e.g. 2500"
                  required
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">Adjustment Reason Category</label>
                <select
                  className="form-select fs-13"
                  value={adjustForm.category}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {ADJUSTMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark fs-12">Mandatory Audit Description / Remarks *</label>
                <textarea
                  className="form-control fs-13"
                  rows={2}
                  required
                  placeholder="e.g. Week 38 top courier incentive bonus approved by GM..."
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-fill fw-bold" disabled={submitting}>
                  {submitting ? 'Applying…' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. FREEZE / UNFREEZE MODAL */}
      {modalType === 'freeze' && selectedDriver && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <h5 className={`fw-bold mb-0 font-display ${selectedDriver.wallet_is_frozen ? 'text-success' : 'text-danger'}`}>
                <i className={`${selectedDriver.wallet_is_frozen ? 'ri-lock-unlock-line' : 'ri-lock-line'} me-1`} />
                {selectedDriver.wallet_is_frozen ? 'Unfreeze Driver Wallet' : 'Freeze Driver Wallet'}
              </h5>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <p className="text-muted small mb-3">
              {selectedDriver.wallet_is_frozen
                ? `Unfreezing will restore withdrawal privileges and active settlement capabilities for ${selectedDriver.name}.`
                : `Freezing will temporarily block ${selectedDriver.name} from requesting bank withdrawals and lock payout requests.`}
            </p>

            {!selectedDriver.wallet_is_frozen && (
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">Reason for Freeze *</label>
                <textarea
                  className="form-control fs-13"
                  rows={2}
                  placeholder="e.g. Investigation of unconfirmed order delivery dispute..."
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                />
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn flex-fill fw-bold text-white ${selectedDriver.wallet_is_frozen ? 'btn-success' : 'btn-danger'}`}
                onClick={handleToggleFreeze}
                disabled={submitting}
              >
                {submitting ? 'Updating…' : selectedDriver.wallet_is_frozen ? 'Confirm Unfreeze' : 'Confirm Freeze'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. COMMISSION RATE MODAL */}
      {modalType === 'rate' && selectedDriver && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <h5 className="fw-bold mb-0 text-dark font-display">Edit Per-Delivery Commission</h5>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handleSaveRate}>
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">Driver: {selectedDriver.name}</label>
                <div className="input-group">
                  <span className="input-group-text">₦</span>
                  <input
                    type="number"
                    className="form-control font-monospace fs-14 fw-bold"
                    placeholder="500"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                  <span className="input-group-text fs-12">/ drop</span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-fill fw-bold" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DRIVER STATEMENT MODAL */}
      {modalType === 'statement' && selectedDriver && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <div>
                <h5 className="fw-bold mb-0 text-dark font-display">Driver Account Statement &amp; Ledger</h5>
                <span className="text-muted fs-12">
                  {selectedDriver.name} · DVA: <strong>{selectedDriver.wallet_account_number}</strong>
                </span>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            {statementLoading && (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                Generating itemized account statement…
              </div>
            )}

            {!statementLoading && statementData && (
              <div>
                <div className="table-responsive border rounded-3 mb-3">
                  <table className="table table-hover align-middle mb-0 fs-12">
                    <thead className="bg-light">
                      <tr className="text-muted text-uppercase fw-bold fs-11">
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th className="text-end pe-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.statement?.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No ledger entries found for this driver yet.
                          </td>
                        </tr>
                      )}
                      {statementData.statement?.map((s, idx) => (
                        <tr key={idx}>
                          <td className="font-monospace text-muted">{new Date(s.date).toLocaleDateString()}</td>
                          <td>
                            <span
                              className={`badge rounded-pill px-2 py-0.5 text-xs fw-bold ${
                                s.type === 'credit' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                              }`}
                            >
                              {s.type === 'credit' ? '+ Credit' : '- Debit'}
                            </span>
                          </td>
                          <td className="font-monospace text-uppercase text-muted fs-10">{s.category}</td>
                          <td className="font-monospace fw-semibold text-primary">{s.reference}</td>
                          <td className="text-dark">{s.description}</td>
                          <td className="text-end pe-3 font-monospace fw-bold">
                            <span className={s.type === 'credit' ? 'text-success' : 'text-danger'}>
                              {s.type === 'credit' ? '+' : '-'}
                              {fmt(s.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-secondary px-4 fw-bold" onClick={closeModal}>
                    Close Statement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PAYOUT APPROVE / REJECT MODAL */}
      {modalType === 'payout_action' && selectedPayout && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <h5 className={`fw-bold mb-0 font-display ${payoutDecision === 'paid' ? 'text-success' : 'text-danger'}`}>
                {payoutDecision === 'paid' ? 'Mark Payout as Disbursed / Paid' : 'Reject Payout Request'}
              </h5>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Driver Name:</span>
                <strong className="text-dark">{selectedPayout.driver_name}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Withdrawal Amount:</span>
                <strong className="text-success font-monospace fs-14">{fmt(selectedPayout.amount)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Destination:</span>
                <span className="text-dark font-monospace">{selectedPayout.bank_name} - {selectedPayout.account_number}</span>
              </div>
            </div>

            <form onSubmit={handleSinglePayoutAction}>
              <div className="mb-3">
                <label className="form-label fw-bold text-dark fs-12">
                  {payoutDecision === 'paid' ? 'Disbursement Reference / Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  className="form-control fs-13"
                  rows={2}
                  required={payoutDecision === 'rejected'}
                  placeholder={payoutDecision === 'paid' ? 'e.g. Monnify Ref: MNFY-TRF-0914 / Bank Transfer Ref' : 'e.g. Invalid bank details, mismatch in delivery records...'}
                  value={payoutRemarks}
                  onChange={(e) => setPayoutRemarks(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn flex-fill fw-bold text-white ${payoutDecision === 'paid' ? 'btn-success' : 'btn-danger'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Processing…' : payoutDecision === 'paid' ? 'Confirm & Mark Paid' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
