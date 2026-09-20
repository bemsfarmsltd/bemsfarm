import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../../lib/api'

export default function WalletManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'wallets'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Sync tab with URL search param
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    setSearchParams({ tab: tabKey })
  }

  // ── States ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState({ metrics: {}, drivers: [] })
  const [payoutsData, setPayoutsData] = useState({ payouts: [], counts: {} })
  const [gatewayData, setGatewayData] = useState({ gateway: {}, metrics: {} })
  const [gatewayTxns, setGatewayTxns] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [payoutRules, setPayoutRules] = useState({
    min_payout_amount: 2000,
    max_daily_limit: 100000,
    reserve_escrow_amount: 1000,
    auto_payout_schedule: 'manual',
    fee_bearer: 'company',
  })
  const [ledgerLogs, setLedgerLogs] = useState([])

  // Filters
  const [searchDriver, setSearchDriver] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all')
  const [selectedPayoutIds, setSelectedPayoutIds] = useState([])

  // Modals & Drawers
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [statementDriver, setStatementDriver] = useState(null)
  const [statementData, setStatementData] = useState(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

  const [adjustModalDriver, setAdjustModalDriver] = useState(null)
  const [adjustForm, setAdjustForm] = useState({
    type: 'credit',
    amount: '',
    category: 'bonus',
    description: '',
  })
  const [adjusting, setAdjusting] = useState(false)

  const [rateModalDriver, setRateModalDriver] = useState(null)
  const [newRate, setNewRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  const [disburseModalPayout, setDisburseModalPayout] = useState(null)
  const [disburseForm, setDisburseForm] = useState({
    disbursement_method: 'monnify_transfer',
    manual_reference: '',
    notes: '',
  })
  const [disbursing, setDisbursing] = useState(false)

  const [rejectModalPayout, setRejectModalPayout] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [bulkDisburseModal, setBulkDisburseModal] = useState(false)
  const [bulkDisburseMethod, setBulkDisburseMethod] = useState('monnify_transfer')
  const [bulkDisbursing, setBulkDisbursing] = useState(false)

  const [voucherPayout, setVoucherPayout] = useState(null)

  // Live Bank Resolution tool modal
  const [bankValidatorModal, setBankValidatorModal] = useState(false)
  const [valAccNum, setValAccNum] = useState('')
  const [valBankName, setValBankName] = useState('Wema Bank')
  const [validatingBank, setValidatingBank] = useState(false)
  const [bankValidationResult, setBankValidationResult] = useState(null)

  // Webhook payload viewer modal
  const [activeWebhook, setActiveWebhook] = useState(null)

  // ── Data Fetching ───────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [sumRes, payRes, gwRes, txRes, whRes, rulesRes, ledRes] = await Promise.all([
        api.get(`/admin/wallets/summary?search=${encodeURIComponent(searchDriver)}&status=${statusFilter}`),
        api.get(`/admin/wallets/payouts/all?status=${payoutStatusFilter}`),
        api.get('/admin/wallets/gateway/overview'),
        api.get('/admin/wallets/gateway/transactions'),
        api.get('/admin/wallets/gateway/webhooks'),
        api.get('/admin/wallets/payout-rules'),
        api.get('/admin/wallets/ledger?limit=100'),
      ])

      setSummaryData(sumRes.data || { metrics: {}, drivers: [] })
      setPayoutsData(payRes.data || { payouts: [], counts: {} })
      setGatewayData(gwRes.data || { gateway: {}, metrics: {} })
      setGatewayTxns(txRes.data?.transactions || [])
      setWebhooks(whRes.data?.webhooks || [])
      if (rulesRes.data?.rules) setPayoutRules(rulesRes.data.rules)
      setLedgerLogs(ledRes.data?.ledger || [])
    } catch (err) {
      console.error('Wallet fetch error:', err)
      toast.error('Failed to load wallet and gateway records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [statusFilter, payoutStatusFilter])

  // ── Actions ─────────────────────────────────────────────────────────

  // 1. Manual Adjust (Bonus/Penalty)
  const handleAdjustSubmit = async (e) => {
    e.preventDefault()
    if (!adjustForm.amount || parseFloat(adjustForm.amount) <= 0) {
      return toast.error('Please enter a valid amount')
    }
    if (!adjustForm.description.trim()) {
      return toast.error('Audit description is required')
    }

    setAdjusting(true)
    try {
      const res = await api.post(`/admin/wallets/drivers/${adjustModalDriver.id}/adjust`, adjustForm)
      toast.success(res.data?.message || 'Adjustment applied successfully')
      setAdjustModalDriver(null)
      setAdjustForm({ type: 'credit', amount: '', category: 'bonus', description: '' })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply adjustment')
    } finally {
      setAdjusting(false)
    }
  }

  // 2. Freeze / Unfreeze
  const handleToggleFreeze = async (driver) => {
    const isFreezing = !driver.wallet_is_frozen
    const promptMsg = isFreezing
      ? `Are you sure you want to FREEZE ${driver.name}'s wallet? This will block all payout withdrawals.`
      : `Unfreeze ${driver.name}'s wallet?`

    if (!window.confirm(promptMsg)) return

    let reason = ''
    if (isFreezing) {
      reason = window.prompt('Enter freeze reason / audit note:', 'Security hold / compliance review')
      if (reason === null) return
    }

    try {
      const res = await api.patch(`/admin/wallets/drivers/${driver.id}/freeze`, {
        is_frozen: isFreezing,
        reason,
      })
      toast.success(res.data?.message || 'Wallet status updated')
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update freeze status')
    }
  }

  // 3. Commission Rate update
  const handleRateSubmit = async (e) => {
    e.preventDefault()
    if (!newRate || parseFloat(newRate) < 0) {
      return toast.error('Please enter a valid rate')
    }

    setSavingRate(true)
    try {
      const res = await api.patch(`/admin/wallets/drivers/${rateModalDriver.id}/commission-rate`, {
        commission_per_delivery: parseFloat(newRate),
      })
      toast.success(res.data?.message || 'Commission rate updated')
      setRateModalDriver(null)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission rate')
    } finally {
      setSavingRate(false)
    }
  }

  // 4. View Statement
  const handleOpenStatement = async (driver) => {
    setStatementDriver(driver)
    setLoadingStatement(true)
    try {
      const res = await api.get(`/admin/wallets/drivers/${driver.id}/statement`)
      setStatementData(res.data?.statement || [])
    } catch (err) {
      toast.error('Failed to load driver statement')
    } finally {
      setLoadingStatement(false)
    }
  }

  // 5. Single Payout Disburse
  const handleDisburseSubmit = async (e) => {
    e.preventDefault()
    setDisbursing(true)
    try {
      const res = await api.post(`/admin/wallets/payouts/${disburseModalPayout.id}/disburse`, disburseForm)
      toast.success(res.data?.message || 'Payout disbursed successfully!')
      setDisburseModalPayout(null)
      setDisburseForm({ disbursement_method: 'monnify_transfer', manual_reference: '', notes: '' })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Disbursement failed')
    } finally {
      setDisbursing(false)
    }
  }

  // 6. Single Payout Reject
  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      return toast.error('Please provide a reason for rejecting the payout')
    }

    setRejecting(true)
    try {
      const res = await api.post(`/admin/wallets/payouts/${rejectModalPayout.id}/reject`, {
        rejection_reason: rejectReason.trim(),
      })
      toast.success(res.data?.message || 'Payout rejected and balance restored')
      setRejectModalPayout(null)
      setRejectReason('')
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payout')
    } finally {
      setRejecting(false)
    }
  }

  // 7. Bulk Batch Disburse
  const handleBulkDisburseSubmit = async () => {
    if (selectedPayoutIds.length === 0) return toast.error('No payouts selected')

    setBulkDisbursing(true)
    try {
      const res = await api.post('/admin/wallets/payouts/bulk-disburse', {
        payout_ids: selectedPayoutIds,
        disbursement_method: bulkDisburseMethod,
      })
      toast.success(res.data?.message || 'Bulk disbursement successful!')
      setSelectedPayoutIds([])
      setBulkDisburseModal(false)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk disbursement failed')
    } finally {
      setBulkDisbursing(false)
    }
  }

  // 8. Save Payout Governance Rules
  const handleSaveRules = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/admin/wallets/payout-rules', payoutRules)
      toast.success(res.data?.message || 'Rules saved successfully!')
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rules')
    }
  }

  // 9. Bank Name Validation Lookup
  const handleValidateBank = async (e) => {
    e.preventDefault()
    if (!valAccNum || valAccNum.length !== 10) {
      return toast.error('Please enter a 10-digit account number')
    }

    setValidatingBank(true)
    setBankValidationResult(null)
    try {
      const res = await api.post('/admin/wallets/validate-bank', {
        account_number: valAccNum,
        bank_name: valBankName,
      })
      setBankValidationResult(res.data)
      toast.success(res.data?.message || 'Account resolved!')
    } catch (err) {
      toast.error('Could not resolve account name')
    } finally {
      setValidatingBank(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const rows = summaryData.drivers.map((d) => ({
      ID: d.id,
      Driver: d.name,
      Phone: d.phone,
      'Dedicated DVA (Inflow)': d.wallet_account_number,
      'Bank DVA Name': d.wallet_bank_name,
      'Total Earned': d.total_earned,
      'Total Disbursed': d.total_paid,
      'Pending Payout': d.pending_payouts,
      'Available Balance': d.available_balance,
      'Destination Bank': d.bank_name || 'N/A',
      'Destination NUBAN': d.account_number || 'N/A',
      'Wallet Status': d.wallet_is_frozen ? 'FROZEN' : 'ACTIVE',
    }))

    if (rows.length === 0) return toast.error('No data to export')

    const headers = Object.keys(rows[0]).join(',')
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      headers +
      '\n' +
      rows.map((e) => Object.values(e).map((v) => `"${v}"`).join(',')).join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `bems_farms_wallets_master_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Wallet ledger CSV exported!')
  }

  const { metrics = {} } = summaryData
  const { gateway = {}, metrics: gwMetrics = {} } = gatewayData
  const { counts: payoutCounts = {} } = payoutsData

  return (
    <div className="container-fluid p-4" style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* ── TOP HEADER ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary border-opacity-10">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge px-2 py-1" style={{ background: '#0F766E', color: '#FFFFFF', fontWeight: 600, fontSize: 11, letterSpacing: 0.5 }}>
              FINANCIAL COMMAND CENTER
            </span>
            <span className="badge px-2 py-1" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: 11 }}>
              MONNIFY ENGINE LIVE
            </span>
          </div>
          <h2 className="mb-0 font-weight-bold" style={{ color: '#0F172A', fontSize: 24, letterSpacing: '-0.02em' }}>
            Enterprise Wallet &amp; Payment Gateway Hub
          </h2>
          <p className="text-muted small mb-0 mt-1">
            Institutional liquidity monitoring, driver dedicated virtual accounts (DVA), live Monnify gateway analytics, automated batch disbursements, and governance rules.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3 mt-md-0">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 px-3 shadow-sm bg-white"
            onClick={() => setBankValidatorModal(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            <i className="ri-shield-check-line text-primary"></i> Live NUBAN Validator
          </button>
          <button
            type="button"
            className="btn btn-outline-dark btn-sm d-flex align-items-center gap-2 px-3 shadow-sm bg-white"
            onClick={handleExportCSV}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            <i className="ri-file-excel-2-line text-success"></i> Export Master CSV
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 shadow-sm"
            onClick={fetchAllData}
            style={{ borderRadius: 8, background: '#0F766E', borderColor: '#0F766E', fontWeight: 600 }}
          >
            <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`}></i> Sync All
          </button>
        </div>
      </div>

      {/* ── TOP KPI EXECUTIVE CARDS ── */}
      <div className="row g-3 mb-4">
        {/* Card 1: Merchant Gateway Balance */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF' }}>
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="text-white-50 text-uppercase font-weight-bold" style={{ fontSize: 10, letterSpacing: 0.8 }}>
                    Monnify Merchant Reserve
                  </span>
                  <div className="h4 font-weight-bold text-white mb-0 mt-1">
                    ₦{(gateway.merchant_available_balance || 1200800).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2 rounded-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <i className="ri-bank-card-2-line text-warning fs-5"></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25" style={{ fontSize: 11 }}>
                <span className="text-white-50">Master DVA: <b>{gateway.merchant_account_number || '8558127267'}</b></span>
                <span className="badge" style={{ background: '#10B981', color: '#FFFFFF' }}>Live Sandbox</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Fleet Liability */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14, background: '#FFFFFF', borderLeft: '4px solid #F59E0B' }}>
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: 10, letterSpacing: 0.8 }}>
                    Total Fleet Floating Liability
                  </span>
                  <div className="h4 font-weight-bold mb-0 mt-1" style={{ color: '#0F172A' }}>
                    ₦{(metrics.total_fleet_liability || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2 rounded-3" style={{ background: '#FEF3C7' }}>
                  <i className="ri-wallet-3-line text-warning fs-5"></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-10" style={{ fontSize: 11 }}>
                <span className="text-muted">Unwithdrawn Driver Balances</span>
                <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>Active Obligation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Payout Queue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14, background: '#FFFFFF', borderLeft: '4px solid #EF4444' }}>
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: 10, letterSpacing: 0.8 }}>
                    Pending Payout Queue
                  </span>
                  <div className="h4 font-weight-bold mb-0 mt-1" style={{ color: '#DC2626' }}>
                    ₦{(metrics.total_pending_payouts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2 rounded-3" style={{ background: '#FEE2E2' }}>
                  <i className="ri-time-line text-danger fs-5"></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-10" style={{ fontSize: 11 }}>
                <span className="text-muted">Requests in Queue: <b>{payoutCounts.total_pending || 0}</b></span>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-danger font-weight-bold"
                  style={{ textDecoration: 'none', fontSize: 11 }}
                  onClick={() => handleTabChange('payouts')}
                >
                  Review Pipeline &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Disbursed & DVA Allocation */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14, background: '#FFFFFF', borderLeft: '4px solid #10B981' }}>
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="text-muted text-uppercase font-weight-bold" style={{ fontSize: 10, letterSpacing: 0.8 }}>
                    Total Disbursed (Paid)
                  </span>
                  <div className="h4 font-weight-bold text-success mb-0 mt-1">
                    ₦{(metrics.total_disbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2 rounded-3" style={{ background: '#DCFCE7' }}>
                  <i className="ri-checkbox-circle-line text-success fs-5"></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-10" style={{ fontSize: 11 }}>
                <span className="text-muted">DVA Provisioned: <b>{metrics.total_virtual_accounts || 0} drivers</b></span>
                <span className="badge" style={{ background: '#DCFCE7', color: '#166534' }}>100% Monnify</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION SUB-TABS ── */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12, background: '#FFFFFF' }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills gap-1 flex-wrap" style={{ fontSize: 13, fontWeight: 600 }}>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${activeTab === 'wallets' ? 'active' : ''}`}
                style={activeTab === 'wallets' ? { background: '#0F766E', color: '#FFFFFF', borderRadius: 8 } : { color: '#475569', borderRadius: 8 }}
                onClick={() => handleTabChange('wallets')}
              >
                <i className="ri-wallet-3-line"></i>
                <span>Dedicated DVA Wallets</span>
                <span className="badge ms-1" style={{ background: activeTab === 'wallets' ? 'rgba(255,255,255,0.25)' : '#E2E8F0', color: activeTab === 'wallets' ? '#FFFFFF' : '#334155' }}>
                  {summaryData.drivers.length}
                </span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${activeTab === 'payouts' ? 'active' : ''}`}
                style={activeTab === 'payouts' ? { background: '#0F766E', color: '#FFFFFF', borderRadius: 8 } : { color: '#475569', borderRadius: 8 }}
                onClick={() => handleTabChange('payouts')}
              >
                <i className="ri-hand-coin-line"></i>
                <span>Payout &amp; Disbursement Engine</span>
                {payoutCounts.total_pending > 0 && (
                  <span className="badge ms-1" style={{ background: '#EF4444', color: '#FFFFFF' }}>
                    {payoutCounts.total_pending}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${activeTab === 'gateway' ? 'active' : ''}`}
                style={activeTab === 'gateway' ? { background: '#0F766E', color: '#FFFFFF', borderRadius: 8 } : { color: '#475569', borderRadius: 8 }}
                onClick={() => handleTabChange('gateway')}
              >
                <i className="ri-global-line"></i>
                <span>Payment Gateway &amp; Monnify</span>
                <span className="badge ms-1" style={{ background: '#10B981', color: '#FFFFFF' }}>Live</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${activeTab === 'ledger' ? 'active' : ''}`}
                style={activeTab === 'ledger' ? { background: '#0F766E', color: '#FFFFFF', borderRadius: 8 } : { color: '#475569', borderRadius: 8 }}
                onClick={() => handleTabChange('ledger')}
              >
                <i className="ri-file-list-3-line"></i>
                <span>Central Financial Audit Ledger</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${activeTab === 'rules' ? 'active' : ''}`}
                style={activeTab === 'rules' ? { background: '#0F766E', color: '#FFFFFF', borderRadius: 8 } : { color: '#475569', borderRadius: 8 }}
                onClick={() => handleTabChange('rules')}
              >
                <i className="ri-settings-4-line"></i>
                <span>Payout Governance Rules</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1: DEDICATED DVA WALLETS FLEET
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'wallets' && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
          <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3">
            <div className="row g-2 align-items-center justify-content-between">
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-search-line text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search by driver name, phone, DVA or personal NUBAN..."
                    value={searchDriver}
                    onChange={(e) => setSearchDriver(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAllData()}
                  />
                </div>
              </div>
              <div className="col-12 col-md-4 d-flex justify-content-md-end gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: 160 }}
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
                  onClick={fetchAllData}
                >
                  <i className="ri-refresh-line"></i> Filter
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 0.6 }}>
                <tr>
                  <th className="ps-3 py-3">Driver Profile</th>
                  <th>Dedicated Inflow DVA</th>
                  <th>Total Gross</th>
                  <th>Disbursed</th>
                  <th>Pending Hold</th>
                  <th>Withdrawable Balance</th>
                  <th>Per-Drop Rate</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Wallet Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.drivers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ri-inbox-line fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      No driver wallets found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  summaryData.drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="ps-3 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold"
                            style={{
                              width: 36,
                              height: 36,
                              background: '#E0F2FE',
                              color: '#0369A1',
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {driver.name ? driver.name.slice(0, 2).toUpperCase() : 'DR'}
                          </div>
                          <div>
                            <div className="font-weight-bold text-dark d-flex align-items-center gap-1">
                              {driver.name}
                              {driver.wallet_is_frozen && (
                                <span className="badge bg-danger" style={{ fontSize: 9 }}>FROZEN</span>
                              )}
                            </div>
                            <div className="text-muted small">{driver.phone} &bull; {driver.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div>
                            <span className="font-monospace font-weight-bold text-primary" style={{ fontSize: 13 }}>
                              {driver.wallet_account_number}
                            </span>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {driver.wallet_bank_name}
                            </div>
                            <div className="text-secondary" style={{ fontSize: 10 }}>
                              {driver.wallet_account_name}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-light p-1 text-muted"
                            title="Copy DVA"
                            onClick={() => {
                              navigator.clipboard.writeText(driver.wallet_account_number)
                              toast.success('DVA Account copied!')
                            }}
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </td>
                      <td className="font-weight-bold text-dark">
                        ₦{driver.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <div className="text-muted small font-weight-normal">{driver.total_delivered || 0} deliveries</div>
                      </td>
                      <td className="text-muted">
                        ₦{driver.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        {driver.pending_payouts > 0 ? (
                          <span className="text-danger font-weight-bold">
                            ₦{driver.pending_payouts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted">₦0.00</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge px-2 py-1"
                          style={{
                            background: driver.available_balance > 0 ? '#DCFCE7' : '#F1F5F9',
                            color: driver.available_balance > 0 ? '#166534' : '#64748B',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ₦{driver.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <span className="font-weight-bold">₦{parseFloat(driver.commission_per_delivery || 0).toLocaleString()}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-muted"
                            title="Edit Commission Rate"
                            onClick={() => {
                              setRateModalDriver(driver)
                              setNewRate(driver.commission_per_delivery || '0')
                            }}
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        {driver.wallet_is_frozen ? (
                          <span className="badge bg-danger">Frozen</span>
                        ) : (
                          <span className="badge bg-success bg-opacity-75">Active</span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary px-2"
                            title="Manual Adjustment (Bonus/Penalty)"
                            onClick={() => {
                              setAdjustModalDriver(driver)
                              setAdjustForm({ type: 'credit', amount: '', category: 'bonus', description: '' })
                            }}
                          >
                            <i className="ri-add-circle-line"></i> Adjust
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary px-2"
                            title="View Statement &amp; History"
                            onClick={() => handleOpenStatement(driver)}
                          >
                            <i className="ri-file-list-2-line"></i>
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm px-2 ${driver.wallet_is_frozen ? 'btn-danger' : 'btn-outline-danger'}`}
                            title={driver.wallet_is_frozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                            onClick={() => handleToggleFreeze(driver)}
                          >
                            <i className={driver.wallet_is_frozen ? 'ri-lock-unlock-line' : 'ri-lock-2-line'}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2: PAYOUT & DISBURSEMENT ENGINE
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payouts' && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
          {/* Header & Sub-filters */}
          <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Requests', count: payoutCounts.total_all || 0 },
                  { key: 'pending', label: 'Pending Review', count: payoutCounts.total_pending || 0, badgeColor: '#EF4444' },
                  { key: 'approved', label: 'In Transit / Approved', count: payoutCounts.total_approved || 0, badgeColor: '#F59E0B' },
                  { key: 'paid', label: 'Settled & Paid', count: payoutCounts.total_paid || 0, badgeColor: '#10B981' },
                  { key: 'rejected', label: 'Rejected', count: payoutCounts.total_rejected || 0 },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-1 ${payoutStatusFilter === item.key ? 'btn-dark' : 'btn-light'}`}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                    onClick={() => setPayoutStatusFilter(item.key)}
                  >
                    <span>{item.label}</span>
                    <span
                      className="badge ms-1"
                      style={{
                        background: item.badgeColor || (payoutStatusFilter === item.key ? '#FFFFFF' : '#CBD5E1'),
                        color: item.badgeColor ? '#FFFFFF' : (payoutStatusFilter === item.key ? '#0F172A' : '#334155'),
                      }}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {selectedPayoutIds.length > 0 && (
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">
                    Selected: <b>{selectedPayoutIds.length} payout(s)</b>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-success d-flex align-items-center gap-1"
                    style={{ borderRadius: 8, fontWeight: 600 }}
                    onClick={() => setBulkDisburseModal(true)}
                  >
                    <i className="ri-send-plane-fill"></i> Batch Disburse ({selectedPayoutIds.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 0.6 }}>
                <tr>
                  <th className="ps-3 py-3" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={
                        payoutsData.payouts.filter((p) => ['pending', 'approved'].includes(p.status)).length > 0 &&
                        selectedPayoutIds.length === payoutsData.payouts.filter((p) => ['pending', 'approved'].includes(p.status)).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const eligible = payoutsData.payouts
                            .filter((p) => ['pending', 'approved'].includes(p.status))
                            .map((p) => p.id)
                          setSelectedPayoutIds(eligible)
                        } else {
                          setSelectedPayoutIds([])
                        }
                      }}
                    />
                  </th>
                  <th>Payout Ref</th>
                  <th>Driver Name</th>
                  <th>Requested Amount</th>
                  <th>Destination Bank Account</th>
                  <th>Date Requested</th>
                  <th>Disbursement Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payoutsData.payouts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="ri-hand-coin-line fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      No payout records in this queue.
                    </td>
                  </tr>
                ) : (
                  payoutsData.payouts.map((p) => {
                    const isPending = ['pending', 'approved'].includes(p.status)
                    const isPaid = p.status === 'paid'
                    const isRejected = p.status === 'rejected'

                    return (
                      <tr key={p.id} className={selectedPayoutIds.includes(p.id) ? 'table-primary bg-opacity-25' : ''}>
                        <td className="ps-3">
                          {isPending && (
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedPayoutIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPayoutIds([...selectedPayoutIds, p.id])
                                } else {
                                  setSelectedPayoutIds(selectedPayoutIds.filter((id) => id !== p.id))
                                }
                              }}
                            />
                          )}
                        </td>
                        <td>
                          <span className="font-monospace font-weight-bold text-dark">{p.payout_ref}</span>
                          {p.gateway_reference && (
                            <div className="text-muted" style={{ fontSize: 10 }}>
                              GW Ref: {p.gateway_reference}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="font-weight-bold text-dark">{p.driver_name}</div>
                          <div className="text-muted small">{p.driver_phone}</div>
                          {p.driver_wallet_frozen && (
                            <span className="badge bg-danger" style={{ fontSize: 9 }}>Wallet Frozen</span>
                          )}
                        </td>
                        <td>
                          <div className="h6 mb-0 font-weight-bold text-dark">
                            ₦{parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          {p.gateway_fee > 0 && (
                            <div className="text-muted" style={{ fontSize: 10 }}>
                              Fee: ₦{p.gateway_fee} &bull; Net: ₦{(p.amount - p.gateway_fee).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="font-weight-bold text-dark">{p.bank_name || 'Personal Bank'}</div>
                          <div className="font-monospace text-primary">{p.account_number}</div>
                          <div className="text-muted small">{p.account_name || p.driver_name}</div>
                        </td>
                        <td className="text-muted small">
                          {new Date(p.requested_at).toLocaleString()}
                        </td>
                        <td>
                          {isPaid && (
                            <span className="badge bg-success d-inline-flex align-items-center gap-1">
                              <i className="ri-check-double-line"></i> Settled / Paid
                            </span>
                          )}
                          {p.status === 'pending' && (
                            <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                              <i className="ri-time-line"></i> Awaiting Approval
                            </span>
                          )}
                          {p.status === 'approved' && (
                            <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                              <i className="ri-loader-4-line"></i> In Transit
                            </span>
                          )}
                          {isRejected && (
                            <div>
                              <span className="badge bg-secondary">Rejected</span>
                              {p.rejection_reason && (
                                <div className="text-danger small" style={{ fontSize: 10, maxWidth: 160 }}>
                                  {p.rejection_reason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-inline-flex gap-1">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success px-2 font-weight-bold"
                                  title="Approve &amp; Disburse via Monnify"
                                  onClick={() => {
                                    setDisburseModalPayout(p)
                                    setDisburseForm({
                                      disbursement_method: 'monnify_transfer',
                                      manual_reference: '',
                                      notes: '',
                                    })
                                  }}
                                >
                                  <i className="ri-send-plane-fill"></i> Disburse
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger px-2"
                                  title="Reject Payout"
                                  onClick={() => {
                                    setRejectModalPayout(p)
                                    setRejectReason('')
                                  }}
                                >
                                  <i className="ri-close-circle-line"></i>
                                </button>
                              </>
                            )}

                            {isPaid && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-dark px-2"
                                title="Print Payment Voucher"
                                onClick={() => setVoucherPayout(p)}
                              >
                                <i className="ri-printer-line"></i> Slip
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3: PAYMENT GATEWAY & MONNIFY COMMAND HUB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'gateway' && (
        <div>
          {/* Gateway Status Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: 12, background: '#FFFFFF' }}>
                <span className="text-muted text-uppercase small font-weight-bold">Gross Inflows</span>
                <div className="h4 font-weight-bold text-dark mt-1">
                  ₦{(gwMetrics.gross_volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-auto">Processed across Storefront</div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: 12, background: '#FFFFFF' }}>
                <span className="text-muted text-uppercase small font-weight-bold">Gateway Processing Fees</span>
                <div className="h4 font-weight-bold text-danger mt-1">
                  ₦{(gwMetrics.estimated_gateway_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-auto">Est 1.5% Monnify Fee</div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: 12, background: '#FFFFFF' }}>
                <span className="text-muted text-uppercase small font-weight-bold">Net Settled to Bank</span>
                <div className="h4 font-weight-bold text-success mt-1">
                  ₦{(gwMetrics.net_settled_volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted small mt-auto">Auto-settled T+1</div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: 12, background: '#FFFFFF' }}>
                <span className="text-muted text-uppercase small font-weight-bold">Webhook Service Health</span>
                <div className="h5 font-weight-bold text-success mt-1 d-flex align-items-center gap-1">
                  <i className="ri-shield-check-fill"></i> Active (200 OK)
                </div>
                <div className="text-muted small mt-auto text-truncate" title={gateway.webhook_endpoint}>
                  {gateway.webhook_endpoint || 'https://bemsfarms.com/api/payments/monnify/webhook'}
                </div>
              </div>
            </div>
          </div>

          {/* Gateway Credentials & Config Panel */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14, background: '#FFFFFF' }}>
            <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 font-weight-bold text-dark d-flex align-items-center gap-2">
                  <i className="ri-settings-line text-primary"></i> Monnify Payment Gateway Integration Architecture
                </h6>
                <span className="badge bg-success">Sandbox Ready</span>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10">
                    <div className="text-muted small font-weight-bold">API KEY</div>
                    <div className="font-monospace text-dark mt-1 font-weight-bold">{gateway.api_key || 'MK_TEST_••••••••S6'}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10">
                    <div className="text-muted small font-weight-bold">CONTRACT CODE</div>
                    <div className="font-monospace text-dark mt-1 font-weight-bold">{gateway.contract_code || 'E1T6K8YE0X9G'}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10">
                    <div className="text-muted small font-weight-bold">MASTER MERCHANT ACCOUNT</div>
                    <div className="font-monospace text-dark mt-1 font-weight-bold">
                      {gateway.merchant_account_number || '8558127267'} ({gateway.merchant_bank || 'Wema Bank'})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Transactions vs Webhooks Layout */}
          <div className="row g-4">
            {/* Real Checkout Transactions */}
            <div className="col-12 col-xl-7">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 font-weight-bold text-dark">
                    <i className="ri-shopping-cart-2-line text-primary"></i> Customer Storefront Checkout Transactions
                  </h6>
                  <span className="badge bg-primary bg-opacity-10 text-primary">{gatewayTxns.length} records</span>
                </div>
                <div className="table-responsive" style={{ maxHeight: 420 }}>
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                    <thead className="table-light text-muted text-uppercase" style={{ fontSize: 10 }}>
                      <tr>
                        <th className="ps-3">Order Ref</th>
                        <th>Customer</th>
                        <th>Gross</th>
                        <th>Fee (1.5%)</th>
                        <th>Net Settled</th>
                        <th>Channel</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gatewayTxns.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No gateway transactions found.
                          </td>
                        </tr>
                      ) : (
                        gatewayTxns.map((tx) => (
                          <tr key={tx.id}>
                            <td className="ps-3 font-monospace font-weight-bold text-dark">{tx.order_ref || `#${tx.id}`}</td>
                            <td>
                              <div className="font-weight-bold">{tx.customer_name || 'Customer'}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>{tx.customer_phone}</div>
                            </td>
                            <td className="font-weight-bold">₦{parseFloat(tx.amount).toLocaleString()}</td>
                            <td className="text-danger">₦{parseFloat(tx.gateway_fee).toLocaleString()}</td>
                            <td className="text-success font-weight-bold">₦{parseFloat(tx.net_settlement).toLocaleString()}</td>
                            <td>
                              <span className="badge bg-light text-dark text-uppercase">{tx.payment_method}</span>
                            </td>
                            <td>
                              <span className="badge bg-success bg-opacity-75">{tx.payment_status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Live Webhook Event Logs */}
            <div className="col-12 col-xl-5">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 font-weight-bold text-dark">
                    <i className="ri-radar-line text-warning"></i> Gateway Webhook Events Log
                  </h6>
                  <span className="badge bg-success">Verified SHA512</span>
                </div>
                <div className="table-responsive" style={{ maxHeight: 420 }}>
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                    <thead className="table-light text-muted text-uppercase" style={{ fontSize: 10 }}>
                      <tr>
                        <th className="ps-3">Event Type</th>
                        <th>Reference</th>
                        <th>Amount</th>
                        <th>Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {webhooks.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">
                            No webhook events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        webhooks.map((wh) => (
                          <tr key={wh.id}>
                            <td className="ps-3">
                              <span className="badge bg-dark" style={{ fontSize: 10 }}>{wh.event_type}</span>
                              <div className="text-muted" style={{ fontSize: 10 }}>{new Date(wh.created_at).toLocaleTimeString()}</div>
                            </td>
                            <td className="font-monospace text-primary small">{wh.transaction_reference}</td>
                            <td className="font-weight-bold">₦{parseFloat(wh.amount || 0).toLocaleString()}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border py-0 px-2"
                                style={{ fontSize: 11 }}
                                onClick={() => setActiveWebhook(wh)}
                              >
                                View JSON
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4: CENTRAL FINANCIAL AUDIT LEDGER
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
          <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 font-weight-bold text-dark">
              <i className="ri-shield-check-line text-success"></i> Immutable Driver Financial Audit Ledger
            </h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={fetchAllData}
            >
              <i className="ri-refresh-line"></i> Refresh Ledger
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 0.6 }}>
                <tr>
                  <th className="ps-3 py-3">Timestamp</th>
                  <th>Driver Name</th>
                  <th>Transaction Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Audit Description</th>
                  <th className="pe-3">Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  ledgerLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="ps-3 text-muted small">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="font-weight-bold text-dark">{log.driver_name}</td>
                      <td>
                        <span
                          className="badge text-uppercase"
                          style={{
                            background: log.type === 'credit' ? '#DCFCE7' : '#FEE2E2',
                            color: log.type === 'credit' ? '#166534' : '#DC2626',
                          }}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="text-muted text-capitalize">{log.category?.replace('_', ' ')}</td>
                      <td className="font-weight-bold">
                        <span className={log.type === 'credit' ? 'text-success' : 'text-danger'}>
                          {log.type === 'credit' ? '+' : '-'}₦{parseFloat(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="font-monospace text-primary small">{log.reference}</td>
                      <td className="text-dark small" style={{ maxWidth: 280 }}>{log.description}</td>
                      <td className="pe-3 text-muted small">{log.performed_by_name || 'System Auto'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5: PAYOUT GOVERNANCE & POLICY RULES
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-xl-6">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-header bg-white border-bottom border-secondary border-opacity-10 p-3">
                <h6 className="mb-0 font-weight-bold text-dark d-flex align-items-center gap-2">
                  <i className="ri-shield-flash-line text-warning"></i> Automated Payout Governance &amp; Threshold Rules
                </h6>
              </div>
              <form onSubmit={handleSaveRules} className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label font-weight-bold small text-dark">
                    Minimum Payout Withdrawal Threshold (₦)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={payoutRules.min_payout_amount}
                    onChange={(e) => setPayoutRules({ ...payoutRules, min_payout_amount: e.target.value })}
                    required
                  />
                  <div className="form-text">Drivers cannot request withdrawals below this amount.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label font-weight-bold small text-dark">
                    Maximum Daily Withdrawal Limit per Driver (₦)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={payoutRules.max_daily_limit}
                    onChange={(e) => setPayoutRules({ ...payoutRules, max_daily_limit: e.target.value })}
                    required
                  />
                  <div className="form-text">Fraud prevention limit per 24 hours.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label font-weight-bold small text-dark">
                    Safety Escrow Reserve Holdback (₦)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={payoutRules.reserve_escrow_amount}
                    onChange={(e) => setPayoutRules({ ...payoutRules, reserve_escrow_amount: e.target.value })}
                    required
                  />
                  <div className="form-text">Mandatory buffer retained in driver wallet for shortage or returns.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label font-weight-bold small text-dark">
                    Disbursement Schedule
                  </label>
                  <select
                    className="form-select"
                    value={payoutRules.auto_payout_schedule}
                    onChange={(e) => setPayoutRules({ ...payoutRules, auto_payout_schedule: e.target.value })}
                  >
                    <option value="manual">Manual Admin Review &amp; Approval (Default)</option>
                    <option value="instant">Instant Automatic Monnify API Transfer</option>
                    <option value="daily_midnight">Daily Midnight Automatic Batch Sweep</option>
                    <option value="weekly_friday">Weekly Friday Automated Settlement</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label font-weight-bold small text-dark">
                    Transfer Gateway Fee Allocation
                  </label>
                  <select
                    className="form-select"
                    value={payoutRules.fee_bearer}
                    onChange={(e) => setPayoutRules({ ...payoutRules, fee_bearer: e.target.value })}
                  >
                    <option value="company">Bems Farms Absorbs Gateway Transfer Fee</option>
                    <option value="driver">Deduct ₦50 Transfer Fee from Driver Net Payout</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 font-weight-bold"
                  style={{ background: '#0F766E', borderColor: '#0F766E', borderRadius: 8 }}
                >
                  Save Governance Policies
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS & DRAWERS
      ════════════════════════════════════════════════════════════════════ */}

      {/* 1. Manual Adjust Modal */}
      {adjustModalDriver && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold">
                  Manual Wallet Adjustment &bull; {adjustModalDriver.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setAdjustModalDriver(null)}></button>
              </div>
              <form onSubmit={handleAdjustSubmit}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border mb-3 small">
                    Current Available Balance:{' '}
                    <b>₦{adjustModalDriver.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Adjustment Type</label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn flex-fill ${adjustForm.type === 'credit' ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => setAdjustForm({ ...adjustForm, type: 'credit' })}
                      >
                        <i className="ri-arrow-down-circle-line"></i> Credit (Bonus/Stipend)
                      </button>
                      <button
                        type="button"
                        className={`btn flex-fill ${adjustForm.type === 'debit' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setAdjustForm({ ...adjustForm, type: 'debit' })}
                      >
                        <i className="ri-arrow-up-circle-line"></i> Debit (Penalty/Deduction)
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Amount (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5000"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Category</label>
                    <select
                      className="form-select"
                      value={adjustForm.category}
                      onChange={(e) => setAdjustForm({ ...adjustForm, category: e.target.value })}
                    >
                      {adjustForm.type === 'credit' ? (
                        <>
                          <option value="bonus">Performance Bonus</option>
                          <option value="fuel_allowance">Fuel &amp; Maintenance Stipend</option>
                          <option value="tip_reimbursement">Tip Reimbursement</option>
                          <option value="manual_credit">Other Credit Adjustment</option>
                        </>
                      ) : (
                        <>
                          <option value="penalty">Shortage / Damage Penalty</option>
                          <option value="cash_discrepancy">Cash Collection Discrepancy</option>
                          <option value="administrative_fee">Administrative Fee</option>
                          <option value="manual_debit">Other Debit Deduction</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Mandatory Audit Reason</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Explain the justification for this adjustment..."
                      value={adjustForm.description}
                      onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-10">
                  <button type="button" className="btn btn-light" onClick={() => setAdjustModalDriver(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={adjusting}>
                    {adjusting ? 'Processing...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. Itemized Statement Drawer */}
      {statementDriver && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <div>
                  <h5 className="modal-title font-weight-bold mb-0">Driver Financial Statement</h5>
                  <span className="text-muted small">{statementDriver.name} &bull; DVA: {statementDriver.wallet_account_number}</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setStatementDriver(null)}></button>
              </div>
              <div className="modal-body p-4">
                {loadingStatement ? (
                  <div className="text-center py-5 text-muted">
                    <i className="ri-loader-4-line ri-spin fs-2"></i>
                    <p className="mt-2">Generating itemized statement...</p>
                  </div>
                ) : statementData && statementData.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Reference</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.map((ev, i) => (
                          <tr key={i}>
                            <td className="text-muted">{new Date(ev.date).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge text-uppercase ${ev.type === 'credit' ? 'bg-success' : 'bg-danger'}`}>
                                {ev.type}
                              </span>
                            </td>
                            <td className="text-capitalize">{ev.category?.replace('_', ' ')}</td>
                            <td className={`font-weight-bold ${ev.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                              {ev.type === 'credit' ? '+' : '-'}₦{parseFloat(ev.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="font-monospace small text-primary">{ev.reference}</td>
                            <td className="text-muted small">{ev.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">No transaction records found for this driver.</div>
                )}
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-10">
                <button type="button" className="btn btn-secondary" onClick={() => setStatementDriver(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Single Disburse Modal */}
      {disburseModalPayout && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold text-success d-flex align-items-center gap-2">
                  <i className="ri-send-plane-fill"></i> Execute Payout Disbursement
                </h5>
                <button type="button" className="btn-close" onClick={() => setDisburseModalPayout(null)}></button>
              </div>
              <form onSubmit={handleDisburseSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 mb-3 rounded-3 bg-light border">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted small">Driver:</span>
                      <b>{disburseModalPayout.driver_name}</b>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="text-muted small">Amount:</span>
                      <b className="h5 text-success mb-0">₦{parseFloat(disburseModalPayout.amount).toLocaleString()}</b>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="text-muted small">Destination:</span>
                      <span>{disburseModalPayout.bank_name} &bull; <b>{disburseModalPayout.account_number}</b></span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Disbursement Routing</label>
                    <select
                      className="form-select"
                      value={disburseForm.disbursement_method}
                      onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_method: e.target.value })}
                    >
                      <option value="monnify_transfer">Instant Monnify API Transfer (Recommended)</option>
                      <option value="manual_wire">External Bank Wire / POS Transfer</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Bank Reference / Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional bank trace / session note"
                      value={disburseForm.notes}
                      onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-10">
                  <button type="button" className="btn btn-light" onClick={() => setDisburseModalPayout(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={disbursing}>
                    {disbursing ? 'Transferring...' : 'Confirm & Disburse Funds'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Single Reject Modal */}
      {rejectModalPayout && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold text-danger">Reject Payout Request</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModalPayout(null)}></button>
              </div>
              <form onSubmit={handleRejectSubmit}>
                <div className="modal-body p-4">
                  <p className="text-muted small">
                    Rejecting this payout will cancel the request and release <b>₦{parseFloat(rejectModalPayout.amount).toLocaleString()}</b> back to {rejectModalPayout.driver_name}'s available balance.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Rejection Reason</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Account name mismatch, insufficient deliveries, KYC incomplete..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-10">
                  <button type="button" className="btn btn-light" onClick={() => setRejectModalPayout(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={rejecting}>
                    {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bulk Disburse Modal */}
      {bulkDisburseModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold text-success d-flex align-items-center gap-2">
                  <i className="ri-send-plane-fill"></i> Execute Batch Payouts ({selectedPayoutIds.length})
                </h5>
                <button type="button" className="btn-close" onClick={() => setBulkDisburseModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small">
                  You are about to approve and disburse <b>{selectedPayoutIds.length} payout request(s)</b> simultaneously.
                </p>
                <div className="mb-3">
                  <label className="form-label small font-weight-bold">Disbursement Method</label>
                  <select
                    className="form-select"
                    value={bulkDisburseMethod}
                    onChange={(e) => setBulkDisburseMethod(e.target.value)}
                  >
                    <option value="monnify_transfer">Monnify Instant Batch Transfer API</option>
                    <option value="manual_wire">External Bank Wire Manual Settlement</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-10">
                <button type="button" className="btn btn-light" onClick={() => setBulkDisburseModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleBulkDisburseSubmit}
                  disabled={bulkDisbursing}
                >
                  {bulkDisbursing ? 'Executing Batch...' : 'Confirm & Execute Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Commission Rate Modal */}
      {rateModalDriver && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold">
                  Update Commission Rate &bull; {rateModalDriver.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setRateModalDriver(null)}></button>
              </div>
              <form onSubmit={handleRateSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Per-Delivery Commission (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      required
                    />
                    <div className="form-text">Driver will automatically earn this fixed amount per delivered order.</div>
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-10">
                  <button type="button" className="btn btn-light" onClick={() => setRateModalDriver(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingRate}>
                    {savingRate ? 'Saving...' : 'Update Rate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 7. Live NUBAN Validator Modal */}
      {bankValidatorModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold d-flex align-items-center gap-2">
                  <i className="ri-shield-check-line text-primary"></i> Monnify Live NUBAN Inquiry
                </h5>
                <button type="button" className="btn-close" onClick={() => setBankValidatorModal(false)}></button>
              </div>
              <form onSubmit={handleValidateBank}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">Bank Name</label>
                    <select
                      className="form-select"
                      value={valBankName}
                      onChange={(e) => setValBankName(e.target.value)}
                    >
                      <option value="Wema Bank">Wema Bank (035)</option>
                      <option value="GTBank">Guaranty Trust Bank (058)</option>
                      <option value="Access Bank">Access Bank (044)</option>
                      <option value="Zenith Bank">Zenith Bank (057)</option>
                      <option value="First Bank">First Bank of Nigeria (011)</option>
                      <option value="UBA">United Bank for Africa (033)</option>
                      <option value="Kuda Bank">Kuda Microfinance Bank (50211)</option>
                      <option value="OPay">OPay Digital Services (999992)</option>
                      <option value="PalmPay">PalmPay (999991)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small font-weight-bold">10-Digit NUBAN Account Number</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      maxLength="10"
                      placeholder="e.g. 0123456789"
                      value={valAccNum}
                      onChange={(e) => setValAccNum(e.target.value)}
                      required
                    />
                  </div>

                  {bankValidationResult && (
                    <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-25 mt-3">
                      <div className="text-success font-weight-bold d-flex align-items-center gap-1">
                        <i className="ri-checkbox-circle-fill"></i> Verified Account Details:
                      </div>
                      <div className="h6 font-weight-bold text-dark mb-0 mt-2">
                        {bankValidationResult.account_name}
                      </div>
                      <div className="text-muted small mt-1">
                        {bankValidationResult.bank_name} &bull; {bankValidationResult.account_number}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-10">
                  <button type="button" className="btn btn-light" onClick={() => setBankValidatorModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={validatingBank}>
                    {validatingBank ? 'Verifying...' : 'Resolve Account Name'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 8. Webhook Payload Viewer Modal */}
      {activeWebhook && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold">Webhook Event Payload</h5>
                <button type="button" className="btn-close" onClick={() => setActiveWebhook(null)}></button>
              </div>
              <div className="modal-body p-4">
                <pre className="p-3 bg-dark text-success rounded-3 font-monospace small mb-0" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {JSON.stringify(activeWebhook.payload || activeWebhook, null, 2)}
                </pre>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-10">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveWebhook(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Payment Slip / Voucher Modal */}
      {voucherPayout && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-bottom border-secondary border-opacity-10">
                <h5 className="modal-title font-weight-bold">Disbursement Voucher &amp; Slip</h5>
                <button type="button" className="btn-close" onClick={() => setVoucherPayout(null)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="p-4 border rounded-3 bg-white text-start">
                  <div className="text-center pb-3 border-bottom mb-3">
                    <h5 className="font-weight-bold text-dark mb-0">BEMS FARMS LOGISTICS</h5>
                    <span className="text-muted small">Official Electronic Payment Voucher</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Voucher Ref:</span>
                    <span className="font-monospace font-weight-bold">{voucherPayout.payout_ref}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Beneficiary Driver:</span>
                    <b>{voucherPayout.driver_name}</b>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Destination Bank:</span>
                    <span>{voucherPayout.bank_name} &bull; {voucherPayout.account_number}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Disbursement Gateway:</span>
                    <span className="badge bg-light text-dark">{voucherPayout.disbursement_method || 'Monnify API'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Gateway Ref:</span>
                    <span className="font-monospace small text-primary">{voucherPayout.gateway_reference || 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Session ID:</span>
                    <span className="font-monospace small">{voucherPayout.session_id || '9990582609201530'}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-3 border-top mt-3">
                    <span className="font-weight-bold">Amount Disbursed:</span>
                    <span className="h5 text-success font-weight-bold mb-0">₦{parseFloat(voucherPayout.amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-10">
                <button type="button" className="btn btn-secondary" onClick={() => setVoucherPayout(null)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <i className="ri-printer-line"></i> Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
