import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const fmt = n => `₦${Number(n).toLocaleString()}`

function useApexChart(ref, optionsFn, deps = []) {
  useEffect(() => {
    if (!ref.current || !window.ApexCharts) return
    ref.current.innerHTML = ''
    const chart = new window.ApexCharts(ref.current, optionsFn())
    chart.render()
    return () => chart.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

const QUICK_LINKS = [
  { to: '/accounts/transactions', icon: 'ri-exchange-line', label: 'All Transactions', color: '#3b82f6' },
  { to: '/accounts/income', icon: 'ri-arrow-up-circle-line', label: 'Income', color: '#22c55e' },
  { to: '/accounts/expenses', icon: 'ri-arrow-down-circle-line', label: 'Expenses', color: '#ef4444' },
  { to: '/accounts/commissions', icon: 'ri-user-star-line', label: 'Driver Commissions', color: '#8b5cf6' },
  { to: '/accounts/bank', icon: 'ri-bank-line', label: 'Bank Accounts', color: '#f59e0b' },
  { to: '/accounts/transfer', icon: 'ri-send-plane-line', label: 'Money Transfer', color: '#0ea5e9' },
]

const INCOME_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9']

export default function FinancialOverview() {
  const revExpRef = useRef(null)
  const incomeDonut = useRef(null)

  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accounts/overview')
      setOverview(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load financial overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const kpis = overview?.kpis || {}
  const incomeByMonth = overview?.charts?.income_by_month || []
  const expensesByMonth = overview?.charts?.expenses_by_month || []
  const bankAccounts = overview?.bank_accounts || []

  const months = incomeByMonth.map(d => d.month)
  const incomeVals = incomeByMonth.map(d => Math.round(Number(d.amount) / 1000))
  const expenseVals = expensesByMonth.map(d => Math.round(Number(d.amount) / 1000))
  const profitVals = incomeVals.map((v, i) => v - (expenseVals[i] || 0))

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const textPrimary = isDark ? '#f1f5f9' : '#111827'
  const textMuted = isDark ? '#94a3b8' : '#6b7280'
  const gridBorder = isDark ? '#334155' : '#f1f5f9'

  // Revenue vs Expenses vs Profit
  useApexChart(revExpRef, () => ({
    chart: { type: 'bar', height: 260, toolbar: { show: false }, background: 'transparent' },
    series: [
      { name: 'Revenue', data: incomeVals },
      { name: 'Expenses', data: expenseVals },
      { name: 'Profit', data: profitVals },
    ],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%', grouped: true } },
    dataLabels: { enabled: false },
    colors: ['#3b82f6', '#ef4444', '#22c55e'],
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: textMuted, fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        formatter: v => `₦${v}k`,
        style: { colors: textMuted, fontSize: '10px' }
      }
    },
    grid: { borderColor: gridBorder, strokeDashArray: 4 },
    legend: { position: 'top', fontSize: '11px', offsetY: 0, labels: { colors: textPrimary } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => `₦${(v * 1000).toLocaleString()}` } },
  }), [incomeByMonth.length, expensesByMonth.length, isDark])

  // Income donut
  const donutSeries = bankAccounts.map(a => Number(a.balance || 0))
  const donutLabels = bankAccounts.map(a => a.bank_name)
  const donutTotal = donutSeries.reduce((s, v) => s + v, 0)

  useApexChart(incomeDonut, () => ({
    chart: { type: 'donut', height: 230, background: 'transparent' },
    series: donutSeries,
    labels: donutLabels,
    colors: INCOME_COLORS,
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: textPrimary,
              formatter: () => donutTotal >= 1_000_000 ? `₦${(donutTotal / 1_000_000).toFixed(1)}M` : fmt(donutTotal)
            },
            value: { color: textPrimary },
            name: { color: textMuted }
          }
        }
      }
    },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => fmt(v) } },
  }), [bankAccounts.length, isDark])

  const revenue = Number(kpis.total_income || 0)
  const expenses = Number(kpis.total_expenses || 0)
  const profit = Number(kpis.net_profit || revenue - expenses)
  const margin = revenue ? ((profit / revenue) * 100).toFixed(1) : '0.0'
  const cashInBank = Number(kpis.bank_balance || 0)
  const pendingTxf = Number(kpis.pending_transfers || 0)

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-card)',
    padding: '24px',
    height: '100%',
  }

  if (loading && !overview) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary mb-2" style={{ width: '2rem', height: '2rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading financial overview...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <PageHeader title="Financial Overview" breadcrumbs={['Accounts', 'Overview']} />

      {/* KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Income', val: fmt(revenue), sub: 'Confirmed receipts', subColor: '#22c55e', icon: 'ri-arrow-up-circle-line', color: '#3b82f6', bg: 'var(--bg-blue-faint)' },
          { label: 'Total Expenses', val: fmt(expenses), sub: 'All outflows', subColor: '#ef4444', icon: 'ri-arrow-down-circle-line', color: '#ef4444', bg: 'var(--bg-red-faint)' },
          { label: 'Net Profit', val: fmt(profit), sub: `${margin}% margin`, subColor: '#22c55e', icon: 'ri-line-chart-line', color: '#22c55e', bg: 'var(--bg-green-faint)' },
          { label: 'Cash in All Banks', val: fmt(cashInBank), sub: `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''}`, subColor: 'var(--text-muted)', icon: 'ri-bank-line', color: '#8b5cf6', bg: 'var(--bg-muted)' },
          { label: 'Pending Transfers', val: fmt(pendingTxf), sub: 'In transit', subColor: '#f59e0b', icon: 'ri-time-line', color: '#0ea5e9', bg: 'var(--bg-yellow-faint)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.val}</div>
              <div style={{ fontSize: '11px', color: k.subColor, fontWeight: 600, marginTop: '4px' }}>{k.sub}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: k.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className={k.icon} style={{ fontSize: '22px', color: k.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Row: Revenue vs Expenses chart + Bank accounts donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>Revenue vs Expenses vs Profit</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly breakdown (in thousands ₦)</div>
              </div>
            </div>
            {incomeByMonth.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>No chart data available.</div>
            ) : (
              <div ref={revExpRef} />
            )}
          </div>
        </div>

        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: '4px' }}>Bank Balance Breakdown</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>All operational accounts</div>
            {bankAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>No bank account data.</div>
            ) : (
              <>
                <div ref={incomeDonut} />
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bankAccounts.map((acc, i) => {
                    const pct = donutTotal ? ((Number(acc.balance) / donutTotal) * 100).toFixed(0) : 0
                    return (
                      <div key={acc.bank_name || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: INCOME_COLORS[i % INCOME_COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{acc.bank_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{fmt(acc.balance)}</span>
                          <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row: Quick links + Monthly summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div style={cardStyle}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Finance Quick Links
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {QUICK_LINKS.map(l => (
                <Link key={l.to} to={l.to} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '20px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-page)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = l.color
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <i className={l.icon} style={{ color: l.color, fontSize: '24px', display: 'block', marginBottom: '8px' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{l.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Monthly Income Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incomeByMonth.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>No monthly data.</div>
              ) : (
                incomeByMonth.map((m, i) => {
                  const rev = Number(m.amount)
                  const exp = Number(expensesByMonth[i]?.amount || 0)
                  const prof = rev - exp
                  const isProfit = prof >= 0
                  return (
                    <div key={m.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>{m.month}</span>
                      <div style={{ textAlign: 'end' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(rev)}</div>
                        <div style={{ fontSize: '11px', color: isProfit ? '#22c55e' : '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                          {isProfit ? '+' : '−'}{fmt(Math.abs(prof))} net
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
