import { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt  = n => `₦${Number(n || 0).toLocaleString()}`
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—'

// Must match expenses_category_check — same lookup used on Expenses.jsx
const CATEGORY_LABEL = {
  produce_purchase: 'Produce Purchase', staff_salary: 'Staff Salary', fuel_transport: 'Fuel & Transport',
  packaging: 'Packaging', utilities_rent: 'Utilities & Rent', maintenance: 'Maintenance',
  marketing: 'Marketing', other: 'Other',
}
const EXPENSE_COLORS = {
  produce_purchase:'#22c55e', staff_salary:'#3b82f6', fuel_transport:'#f59e0b', packaging:'#8b5cf6',
  utilities_rent:'#0ea5e9', maintenance:'#f97316', marketing:'#ec4899', other:'#94a3b8',
}

const TXN_TYPE_META = {
  income:     { icon:'ri-arrow-up-circle-line',   color:'#22c55e', bg:'#f0fdf4' },
  expense:    { icon:'ri-arrow-down-circle-line', color:'#ef4444', bg:'#fef2f2' },
  commission: { icon:'ri-user-star-line',         color:'#8b5cf6', bg:'#f5f3ff' },
  transfer:   { icon:'ri-exchange-funds-line',    color:'#3b82f6', bg:'#eff6ff' },
  refund:     { icon:'ri-refund-2-line',          color:'#f59e0b', bg:'#fffbeb' },
}
const TYPE_LABELS = { income:'Income', expense:'Expense', commission:'Commission', transfer:'Transfer', refund:'Refund' }

const DONUT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#64748b']

// ── chart helper (same pattern as Dashboard.jsx) ─────────────────────────────
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
  { to:'/accounts/transactions',  icon:'ri-exchange-line',        label:'All Transactions',     color:'#3b82f6' },
  { to:'/accounts/income',        icon:'ri-arrow-up-circle-line', label:'Income',               color:'#22c55e' },
  { to:'/accounts/commissions',   icon:'ri-user-star-line',       label:'Driver Commissions',   color:'#8b5cf6' },
]

export default function FinancialOverview() {
  const revExpRef    = useRef(null)
  const incomeDonut   = useRef(null)

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get('/admin/accounts/overview')
      setData(res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const kpis        = data?.kpis ?? {}
  const bankAccounts = data?.bank_accounts ?? []
  const recentTxns   = data?.recent_transactions ?? []
  const pendingExpenses = data?.pending_expenses ?? []
  const last6Months  = data?.charts?.last_6_months ?? []
  const incomeBySource = data?.charts?.income_by_source ?? []
  const expenseByCategory = data?.charts?.expense_by_category ?? []

  const months  = last6Months.map(m => m.month)
  const revData = last6Months.map(m => Math.round(Number(m.income || 0) / 1000))
  const expData = last6Months.map(m => Math.round(Number(m.expenses || 0) / 1000))
  const profData= last6Months.map(m => Math.round(Number(m.profit || 0) / 1000))
  const incomeTotal = incomeBySource.reduce((s, r) => s + Number(r.total || 0), 0)
  const expenseTotal = expenseByCategory.reduce((s, r) => s + Number(r.total || 0), 0)

  // Revenue vs Expenses vs Profit — grouped bar
  useApexChart(revExpRef, () => ({
    chart:      { type:'bar', height:260, toolbar:{ show:false }, background:'transparent' },
    series:     [
      { name:'Revenue',  data: revData },
      { name:'Expenses', data: expData },
      { name:'Profit',   data: profData },
    ],
    plotOptions:{ bar:{ borderRadius:4, columnWidth:'60%', grouped:true } },
    dataLabels: { enabled:false },
    colors:     ['#3b82f6','#ef4444','#22c55e'],
    xaxis:      { categories: months.length ? months : ['No data'], axisBorder:{ show:false }, axisTicks:{ show:false },
      labels:{ style:{ fontSize:'11px' } } },
    yaxis:      { labels:{ formatter: v => `₦${v}k`, style:{ fontSize:'10px' } } },
    grid:       { borderColor:'#f1f5f9', strokeDashArray:4 },
    legend:     { position:'top', fontSize:'11px', offsetY:0 },
    tooltip:    { y:{ formatter: v => `₦${(v*1000).toLocaleString()}` } },
  }), [revData.join()])

  // Income breakdown — donut
  useApexChart(incomeDonut, () => ({
    chart:      { type:'donut', height:230 },
    series:     incomeBySource.length ? incomeBySource.map(d => Number(d.total || 0)) : [1],
    labels:     incomeBySource.length ? incomeBySource.map(d => d.source || 'Unspecified') : ['No data'],
    colors:     DONUT_COLORS,
    dataLabels: { enabled:false },
    legend:     { show:false },
    plotOptions:{ pie:{ donut:{ size:'65%',
      labels:{ show:true, total:{ show:true, label:'Total',
        formatter: () => fmt(incomeTotal) } } } } },
    tooltip:    { y:{ formatter: v => fmt(v) } },
  }), [incomeBySource.map(d=>d.total).join()])

  if (loading) return (
    <div className="container-fluid py-5 text-center text-muted">
      <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
      Loading financial overview…
    </div>
  )

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Financial Overview</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>All financial movement across Bems Farms — {new Date().toLocaleString('default',{month:'long',year:'numeric'})}</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/accounts/overview">Finance</Link></li>
          <li className="breadcrumb-item active">Overview</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-3 rounded-3 mb-3">
          <i className="ri-wifi-off-line fs-4" />
          <div className="flex-grow-1">
            <strong>Could not load the financial overview.</strong>
            <span className="text-muted ms-2 fs-sm">Check your connection or server status.</span>
          </div>
          <button className="btn btn-sm btn-outline-warning" onClick={load}>Retry</button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Revenue This Month',  val:fmt(kpis.revenue_month),    sub:`${kpis.income_count ?? 0} income records`,  subColor:'#6b7280', icon:'ri-arrow-up-circle-line',    color:'#3b82f6', bg:'#eff6ff' },
          { label:'Expenses This Month', val:fmt(kpis.expenses_month),   sub:`${kpis.expense_count ?? 0} expense records`,subColor:'#6b7280', icon:'ri-arrow-down-circle-line',  color:'#ef4444', bg:'#fef2f2' },
          { label:'Net Profit',          val:fmt(kpis.net_profit),       sub:'This month',   subColor: (kpis.net_profit ?? 0) >= 0 ? '#22c55e' : '#ef4444', icon:'ri-line-chart-line',         color:'#22c55e', bg:'#f0fdf4' },
          { label:'Profit Margin',       val:`${kpis.profit_margin ?? 0}%`, sub:'This month', subColor:'#0ea5e9', icon:'ri-percent-line',     color:'#0ea5e9', bg:'#f0f9ff' },
          { label:'Cash in All Banks',   val:fmt(kpis.total_bank_balance), sub:`${bankAccounts.length} account${bankAccounts.length===1?'':'s'}`, subColor:'#6b7280', icon:'ri-bank-line',               color:'#8b5cf6', bg:'#f5f3ff' },
        ].map((k, i) => (
          <div key={i} className="col-6 col-md-4 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="text-muted mb-1" style={{ fontSize:11 }}>{k.label}</div>
                    <div className="fw-bold" style={{ fontSize:18 }}>{k.val}</div>
                    <div style={{ fontSize:11, color:k.subColor, marginTop:3 }}>{k.sub}</div>
                  </div>
                  <div className="rounded-2 d-flex align-items-center justify-content-center"
                    style={{ width:40, height:40, background:k.bg, flexShrink:0 }}>
                    <i className={`${k.icon} fs-18`} style={{ color:k.color }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row: Revenue vs Expenses chart + Income donut */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-medium" style={{ fontSize:14 }}>Revenue vs Expenses vs Profit</div>
                  <div className="text-muted" style={{ fontSize:11 }}>Last 6 months</div>
                </div>
                <div className="d-flex gap-2">
                  {[
                    { label:'Rev', color:'#3b82f6' },
                    { label:'Exp', color:'#ef4444' },
                    { label:'Profit', color:'#22c55e' },
                  ].map(l => (
                    <div key={l.label} className="d-flex align-items-center gap-1">
                      <div style={{ width:10, height:10, borderRadius:2, background:l.color }}/>
                      <span style={{ fontSize:11, color:'#64748b' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div ref={revExpRef}/>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="fw-medium mb-1" style={{ fontSize:14 }}>Income Breakdown</div>
              <div className="text-muted mb-3" style={{ fontSize:11 }}>This month, by source</div>
              <div ref={incomeDonut}/>
              <div className="mt-2">
                {incomeBySource.length === 0 ? (
                  <p className="text-muted text-center mb-0" style={{ fontSize:12 }}>No income recorded this month.</p>
                ) : incomeBySource.map((d, i) => {
                  const pct = incomeTotal > 0 ? ((Number(d.total||0) / incomeTotal)*100).toFixed(0) : 0
                  return (
                    <div key={d.source || i} className="d-flex align-items-center justify-content-between py-1">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width:8, height:8, borderRadius:'50%', background:DONUT_COLORS[i % DONUT_COLORS.length], flexShrink:0 }}/>
                        <span style={{ fontSize:11 }}>{d.source || 'Unspecified'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize:11 }} className="fw-medium">{fmt(d.total)}</span>
                        <span className="text-muted" style={{ fontSize:10 }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Pending expenses + Expense breakdown */}
      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-medium" style={{ fontSize:14 }}>Pending Expense Approvals</div>
                  <div className="text-muted" style={{ fontSize:11 }}>Awaiting approval, soonest due first</div>
                </div>
              </div>
              {pendingExpenses.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0" style={{ fontSize:13 }}>Nothing pending — all caught up ✓</p>
              ) : pendingExpenses.map((e, i) => (
                <div key={e.id} className={`d-flex align-items-center justify-content-between py-2 ${i < pendingExpenses.length-1 ? 'border-bottom' : ''}`}>
                  <div>
                    <div style={{ fontSize:13 }}>{e.description}</div>
                    <div className="text-muted" style={{ fontSize:11 }}>{e.reference} · {CATEGORY_LABEL[e.category] || e.category}{e.due_date ? ` · due ${fmtD(e.due_date)}` : ''}</div>
                  </div>
                  <div className="fw-bold text-danger" style={{ fontSize:13 }}>{fmt(e.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="fw-medium mb-1" style={{ fontSize:14 }}>Expense Breakdown</div>
              <div className="text-muted mb-3" style={{ fontSize:11 }}>This month — {fmt(expenseTotal)} total</div>
              {expenseByCategory.length === 0 ? (
                <p className="text-muted text-center mb-0" style={{ fontSize:12 }}>No approved/paid expenses this month.</p>
              ) : expenseByCategory.map(e => {
                const pct = expenseTotal > 0 ? ((Number(e.total||0) / expenseTotal) * 100).toFixed(0) : 0
                return (
                  <div key={e.category} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ fontSize:12 }}>{CATEGORY_LABEL[e.category] || e.category}</span>
                      <span className="fw-medium" style={{ fontSize:12 }}>{fmt(e.total)} <span className="text-muted">({pct}%)</span></span>
                    </div>
                    <div style={{ background:'#f1f5f9', borderRadius:4, height:6, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:EXPENSE_COLORS[e.category] || '#94a3b8', borderRadius:4, transition:'width 0.4s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Recent activity + Quick links */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
              <div className="fw-medium" style={{ fontSize:14 }}>Recent Financial Activity</div>
              <Link to="/accounts/transactions" className="btn btn-sm btn-outline-primary" style={{ fontSize:11 }}>
                View All Transactions
              </Link>
            </div>
            <div className="card-body p-0">
              {recentTxns.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0" style={{ fontSize:13 }}>No transactions recorded yet.</p>
              ) : recentTxns.map((t) => {
                const meta = TXN_TYPE_META[t.type] || TXN_TYPE_META.income
                const amt = Number(t.amount || 0)
                return (
                  <div key={t.id} className="d-flex align-items-start gap-3 px-4 py-3 border-bottom">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width:36, height:36, background:meta.bg }}>
                      <i className={meta.icon} style={{ color:meta.color, fontSize:15 }}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{ fontSize:13 }}>{t.description || '—'}</div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="text-muted" style={{ fontSize:11 }}>{t.reference}</span>
                        <span className="text-muted" style={{ fontSize:10 }}>·</span>
                        <span className="text-muted" style={{ fontSize:11 }}>{fmtD(t.date)}</span>
                        <span className="badge" style={{ fontSize:9, background:meta.bg, color:meta.color, border:`1px solid ${meta.color}40` }}>
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                      </div>
                    </div>
                    <div className="fw-bold" style={{ fontSize:14, color: amt >= 0 ? '#22c55e' : '#ef4444', flexShrink:0 }}>
                      {amt >= 0 ? '+' : '−'}{fmt(Math.abs(amt))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white border-bottom">
              <div className="fw-medium" style={{ fontSize:14 }}>Finance Quick Links</div>
            </div>
            <div className="card-body p-3">
              <div className="row g-2">
                {QUICK_LINKS.map(l => (
                  <div key={l.to} className="col-6">
                    <Link to={l.to} style={{ textDecoration:'none' }}>
                      <div className="border rounded p-3 text-center h-100"
                        style={{ transition:'border-color 0.15s, background 0.15s', cursor:'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = l.color; e.currentTarget.style.background = l.color+'10' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = '' }}>
                        <i className={`${l.icon} d-block mb-1`} style={{ color:l.color, fontSize:20 }}/>
                        <div style={{ fontSize:11, color:'#374151', fontWeight:500 }}>{l.label}</div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly summary card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="fw-medium" style={{ fontSize:14 }}>Monthly Summary</div>
            </div>
            <div className="card-body p-3">
              {last6Months.length === 0 ? (
                <p className="text-muted text-center mb-0" style={{ fontSize:12 }}>No data yet.</p>
              ) : last6Months.map((m) => {
                const prof = Number(m.profit || 0)
                const isProfit = prof >= 0
                return (
                  <div key={m.month} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize:12 }}>{m.month}</span>
                    <div className="text-end">
                      <div style={{ fontSize:12 }}>{fmt(m.income)}</div>
                      <div style={{ fontSize:10, color: isProfit ? '#22c55e' : '#ef4444' }}>
                        {isProfit ? '+' : '−'}{fmt(Math.abs(prof))} net
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
