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
  }, [fetchStatement])

  // Real-time Socket.IO updates
  useRealtimeEvent('customer:wallet_credited', () => fetchStatement(true))
  useRealtimeEvent('order:updated', () => fetchStatement(true))

  // Silent background polling every 20s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatement(true)
    }, 20000)
    return () => clearInterval(timer)
  }, [fetchStatement])

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.customers || []
    return (data.customers || []).filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.email || '').toLowerCase().includes(q) ||
        String(c.phone || '').toLowerCase().includes(q) ||
        String(c.accountNumber || '').toLowerCase().includes(q) ||
        String(c.bankName || '').toLowerCase().includes(q) ||
        String(c.accountReference || '').toLowerCase().includes(q)
    )
  }, [data.customers, search])

  const dedicatedAccounts = useMemo(() => {
    return filteredCustomers.filter((c) => c.hasDedicatedAccount)
  }, [filteredCustomers])

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.ledger || []
    return (data.ledger || []).filter(
      (tx) =>
        String(tx.customerName || '').toLowerCase().includes(q) ||
        String(tx.customerEmail || '').toLowerCase().includes(q) ||
        String(tx.reference || '').toLowerCase().includes(q) ||
        String(tx.description || '').toLowerCase().includes(q) ||
        String(tx.category || '').toLowerCase().includes(q) ||
        String(tx.accountNumber || '').toLowerCase().includes(q)
    )
  }, [data.ledger, search])

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
      headers = [
        'Date',
        'Customer',
        'Email',
        'Type',
        'Category',
        'Amount',
        'Balance After',
        'Reference',
        'Description',
      ]
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
      headers = [
        'Customer',
        'Email',
        'Phone',
        'Account Number',
        'Bank Name',
        'Account Name',
        'Account Reference',
        'Live Balance',
      ]
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
      headers = [
        'Customer',
        'Email',
        'Phone',
        'Monnify Account',
        'Bank',
        'Period Top-ups',
        'Period Spent',
        'Live Balance',
        'Lifetime Top-ups',
        'Lifetime Spent',
      ]
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
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
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
        description:
          adjustReason.trim() ||
          `Admin manual ${adjustType} via Customer Wallet Studio`,
      })
      toast.success(
        `Wallet ${adjustType === 'credit' ? 'credited' : 'debited'} by ${fmt(amt)}`
      )
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
    <div className="space-y-5 p-4 md:p-6 bg-[#f8faf9] min-h-screen">
      {/* Executive Studio Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#15803d]">
              CUSTOMER MONNIFY · WALLET &amp; TREASURY STUDIO
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#14532d] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight text-slate-900">
            Customer Wallet &amp; Monnify Statement
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Live per-customer Monnify reserved accounts, wallet funding, checkout debits, and treasury liability ledger.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fetchStatement(true)}
            disabled={refreshing}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#15803d]' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-semibold text-[#14532d] inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-[#1B4332] hover:bg-[#14532d] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'customers'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            By Customer ({data.customers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'accounts'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Dedicated Accounts ({summary.provisionedAccounts || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'ledger'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Wallet Ledger ({data.ledger?.length || 0})
          </button>
        </div>

        <Link
          to="/customers/wallet"
          className="text-xs font-semibold text-[#15803d] hover:text-[#14532d] inline-flex items-center gap-1"
        >
          Manage Individual Customer Wallets →
        </Link>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Forest Green Hero */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1B4332] to-[#14532d] text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-100/90">
              CUSTOMER TOP-UPS (GROSS)
            </span>
            <svg className="w-4 h-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
            {fmt(summary.totalTopups)}
          </div>
          <div className="mt-1.5 text-[11px] text-emerald-100/80 font-medium">
            {summary.creditTxCount} credit transactions · Lifetime {fmt(summary.totalLifetimeTopups)}
          </div>
        </div>

        {/* Card 2: Wallet Spent */}
        <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              WALLET SPENT (CHECKOUT)
            </span>
            <svg className="w-4 h-4 text-[#15803d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-[#15803d]">
            {fmt(summary.totalSpent)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-medium">
            {summary.debitTxCount} order checkout debits · Lifetime {fmt(summary.totalLifetimeSpent)}
          </div>
        </div>

        {/* Card 3: Active Wallet Balance (Treasury Liability) */}
        <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              ACTIVE WALLET LIABILITY
            </span>
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-amber-600">
            {fmt(summary.totalWalletBalance)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-medium">
            {summary.fundedCustomers} funded wallets across {summary.totalCustomers} customers
          </div>
        </div>

        {/* Card 4: Monnify Account Coverage */}
        <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              MONNIFY ACCOUNT COVERAGE
            </span>
            <svg className="w-4 h-4 text-[#1B4332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            {summary.coverageRate}%
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-medium">
            {summary.provisionedAccounts} / {summary.totalCustomers} customers with dedicated NUBAN
          </div>
        </div>
      </div>

      {/* Main Statement Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Card Subheader */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {activeTab === 'customers'
                ? 'Customer Wallet, Top-Up & Balance Statement'
                : activeTab === 'accounts'
                  ? 'Monnify Dedicated Virtual Accounts Registry'
                  : 'Customer Wallet Transaction Ledger'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Reference: {data.referenceCode} · Period: {data.dateFrom} to {data.dateTo}
            </p>
          </div>

          <div className="flex items-center gap-2.5 print:hidden">
            <div className="relative">
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter customer, account, or ref..."
                className="h-9 pl-8 pr-3 w-56 md:w-64 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
              />
            </div>
            <span className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center">
              {activeRecordsCount} {activeRecordsCount === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading customer wallet statement...
          </div>
        ) : activeTab === 'customers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Monnify NUBAN</th>
                  <th className="py-3 px-4 text-center">Cr / Dr Txs</th>
                  <th className="py-3 px-4 text-right">Period Top-ups</th>
                  <th className="py-3 px-4 text-right">Period Spent</th>
                  <th className="py-3 px-4 text-right">Live Balance</th>
                  <th className="py-3 px-4 text-right">Lifetime Top-ups</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No customer wallets match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-emerald-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.phone || c.email || `Customer #${c.id}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {c.hasDedicatedAccount ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800 inline-flex items-center gap-1.5">
                              {c.accountNumber}
                              <button
                                type="button"
                                onClick={() => handleCopy(c.accountNumber, 'Account copied')}
                                className="text-slate-400 hover:text-[#1B4332] print:hidden"
                                title="Copy NUBAN"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500">{c.bankName}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not provisioned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        <span className="text-[#15803d] font-bold">{c.creditTxCount}</span>
                        {' / '}
                        <span className="text-slate-600">{c.debitTxCount}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#15803d]">
                        {fmt(c.periodTopups)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {fmt(c.periodSpent)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {fmt(c.balance)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {fmt(c.totalToppedUp)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.balance > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#14532d]">
                            Funded
                          </span>
                        ) : c.hasDedicatedAccount ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustModal(c)
                            setAdjustType('credit')
                            setAdjustAmount('')
                            setAdjustReason('')
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-[#1B4332] hover:text-[#1B4332] text-[11px] font-semibold text-slate-700 transition"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'accounts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Account Number</th>
                  <th className="py-3 px-4">Bank Name</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Monnify Reference</th>
                  <th className="py-3 px-4">Provisioned</th>
                  <th className="py-3 px-4 text-right">Live Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dedicatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No Monnify dedicated virtual accounts provisioned yet.
                    </td>
                  </tr>
                ) : (
                  dedicatedAccounts.map((c) => (
                    <tr key={c.id} className="hover:bg-emerald-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.email || c.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          {c.accountNumber}
                          <button
                            type="button"
                            onClick={() => handleCopy(c.accountNumber, 'Account copied')}
                            className="text-slate-400 hover:text-[#1B4332]"
                            title="Copy NUBAN"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{c.bankName}</td>
                      <td className="py-3 px-4 text-slate-600">{c.accountName || c.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {c.accountReference}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {fmtDate(c.walletCreatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#14532d]">
                        {fmt(c.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No wallet transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((tx) => {
                    const isCredit = String(tx.type || '').toLowerCase() === 'credit'
                    return (
                      <tr key={tx.id} className="hover:bg-emerald-50/30 transition">
                        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {fmtDate(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{tx.customerName}</div>
                          <div className="text-[11px] text-slate-500">
                            {tx.accountNumber ? `${tx.accountNumber} · ${tx.bankName}` : tx.customerEmail}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isCredit
                                ? 'bg-emerald-100 text-[#14532d]'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isCredit ? '↓' : '↑'} {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {tx.category}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {tx.reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {tx.description || '—'}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            isCredit ? 'text-[#15803d]' : 'text-rose-700'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {fmt(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          {fmt(tx.balanceAfter)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Adjust Customer Wallet</h3>
                <p className="text-[11px] text-emerald-100">
                  {adjustModal.name} · Current Balance: {fmt(adjustModal.balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdjustWallet} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('credit')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    adjustType === 'credit'
                      ? 'bg-emerald-50 border-[#15803d] text-[#14532d]'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  + Credit Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('debit')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    adjustType === 'debit'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  - Debit Wallet
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Reference Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Refund or manual Monnify reconciliation"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 rounded-lg bg-[#1B4332] hover:bg-[#14532d] text-white text-xs font-bold disabled:opacity-60"
                >
                  {adjusting ? 'Processing...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
