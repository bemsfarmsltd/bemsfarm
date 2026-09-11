import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const fmt = n => `₦${Number(n).toLocaleString()}`

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

// ── mock financial data ────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun']

const MONTHLY_REVENUE  = [1_820_000, 2_140_000, 1_970_000, 2_560_000, 2_830_000, 3_140_000]
const MONTHLY_EXPENSES = [1_210_000, 1_380_000, 1_290_000, 1_620_000, 1_710_000, 1_890_000]
const MONTHLY_PROFIT   = MONTHLY_REVENUE.map((r, i) => r - MONTHLY_EXPENSES[i])

const DAILY_CASHFLOW = [
  { day:'Mon 23', in:480_000, out:310_000 },
  { day:'Tue 24', in:392_000, out:204_000 },
  { day:'Wed 25', in:615_000, out:388_000 },
  { day:'Thu 26', in:520_000, out:295_000 },
  { day:'Fri 27', in:748_000, out:412_000 },
]

const INCOME_BREAKDOWN = [
  { name:'Online Orders',     value:1_840_000 },
  { name:'Corporate Supply',  value:680_000   },
  { name:'POS / Walk-in',     value:380_000   },
  { name:'Wallet Top-ups',    value:140_000   },
  { name:'Delivery Fees',     value:100_000   },
]

const EXPENSE_BREAKDOWN = [
  { name:'Produce Purchase',   value:552_000, color:'#22c55e' },
  { name:'Staff Salary',       value:460_000, color:'#3b82f6' },
  { name:'Fuel & Transport',   value:120_000, color:'#f59e0b' },
  { name:'Packaging',          value:93_000,  color:'#8b5cf6' },
  { name:'Utilities & Rent',   value:117_000, color:'#0ea5e9' },
  { name:'Driver Commissions', value:108_000, color:'#ec4899' },
  { name:'Marketing',          value:80_000,  color:'#f97316' },
  { name:'Other',              value:360_000, color:'#94a3b8' },
]

const RECENT_ACTIVITY = [
  { type:'income',     icon:'ri-arrow-up-circle-line',     color:'#22c55e', bg:'#f0fdf4', desc:'Paystack settlement — online orders',                amount:+312_000,  ref:'ORD-2026-0141', time:'Today 14:32' },
  { type:'expense',    icon:'ri-arrow-down-circle-line',   color:'#ef4444', bg:'#fef2f2', desc:'Staff salary disbursement — June 2026',              amount:-920_000,  ref:'EXP-0041',      time:'Today 10:15' },
  { type:'commission', icon:'ri-user-star-line',           color:'#8b5cf6', bg:'#f5f3ff', desc:'Driver commission — Emeka Okafor (8 deliveries)',    amount:-18_400,   ref:'COM-0089',      time:'Today 09:40' },
  { type:'transfer',   icon:'ri-exchange-funds-line',      color:'#3b82f6', bg:'#eff6ff', desc:'Transfer: GTBank Ops → Access Payroll',              amount:-1_200_000,ref:'TXF-0031',      time:'Yesterday' },
  { type:'income',     icon:'ri-arrow-up-circle-line',     color:'#22c55e', bg:'#f0fdf4', desc:'Corporate supply payment — Mama Cass Restaurants',  amount:+240_000,  ref:'CORP-0018',     time:'Yesterday' },
  { type:'refund',     icon:'ri-refund-2-line',            color:'#f59e0b', bg:'#fffbeb', desc:'Refund issued — Chukwuemeka Eze (order cancelled)',  amount:-14_200,   ref:'RFC-0048',      time:'25 Jun' },
  { type:'income',     icon:'ri-arrow-up-circle-line',     color:'#22c55e', bg:'#f0fdf4', desc:'Wallet top-up — Seun Adesanya',                     amount:+20_000,   ref:'WLT-0234',      time:'25 Jun' },
  { type:'commission', icon:'ri-user-star-line',           color:'#8b5cf6', bg:'#f5f3ff', desc:'Driver commission — Bola Akinwale (5 deliveries)',  amount:-11_500,   ref:'COM-0088',      time:'24 Jun' },
  { type:'expense',    icon:'ri-arrow-down-circle-line',   color:'#ef4444', bg:'#fef2f2', desc:'Fuel allowance — 3 delivery drivers',               amount:-48_000,   ref:'EXP-0040',      time:'23 Jun' },
  { type:'income',     icon:'ri-arrow-up-circle-line',     color:'#22c55e', bg:'#f0fdf4', desc:'Paystack settlement — online orders',                amount:+276_500,  ref:'ORD-2026-0138', time:'23 Jun' },
]

const TYPE_LABELS = {
  income:'Income', expense:'Expense', commission:'Commission', transfer:'Transfer', refund:'Refund',
}

export default function FinancialOverview() {
  const revExpRef  = useRef(null)
  const cashflowRef = useRef(null)
  const incomeDonut = useRef(null)

  // Revenue vs Expenses vs Profit — grouped bar
  useApexChart(revExpRef, () => ({
    chart:      { type:'bar', height:260, toolbar:{ show:false }, background:'transparent' },
    series:     [
      { name:'Revenue',  data: MONTHLY_REVENUE.map(v => Math.round(v/1000)) },
      { name:'Expenses', data: MONTHLY_EXPENSES.map(v => Math.round(v/1000)) },
      { name:'Profit',   data: MONTHLY_PROFIT.map(v => Math.round(v/1000)) },
    ],
    plotOptions:{ bar:{ borderRadius:4, columnWidth:'60%', grouped:true } },
    dataLabels: { enabled:false },
    colors:     ['#3b82f6','#ef4444','#22c55e'],
    xaxis:      { categories:MONTHS, axisBorder:{ show:false }, axisTicks:{ show:false },
      labels:{ style:{ fontSize:'11px' } } },
    yaxis:      { labels:{ formatter: v => `₦${v}k`, style:{ fontSize:'10px' } } },
    grid:       { borderColor:'#f1f5f9', strokeDashArray:4 },
    legend:     { position:'top', fontSize:'11px', offsetY:0 },
    tooltip:    { y:{ formatter: v => `₦${(v*1000).toLocaleString()}` } },
  }), [])

  // Daily cash flow — area
  useApexChart(cashflowRef, () => ({
    chart:      { type:'area', height:200, toolbar:{ show:false } },
    series:     [
      { name:'Cash In',  data: DAILY_CASHFLOW.map(d => d.in) },
      { name:'Cash Out', data: DAILY_CASHFLOW.map(d => d.out) },
    ],
    dataLabels: { enabled:false },
    stroke:     { curve:'smooth', width:2 },
    fill:       { type:'gradient', gradient:{ shadeIntensity:1, opacityFrom:0.35, opacityTo:0.04 } },
    colors:     ['#22c55e','#ef4444'],
    xaxis:      { categories: DAILY_CASHFLOW.map(d=>d.day), axisBorder:{ show:false }, axisTicks:{ show:false },
      labels:{ style:{ fontSize:'10px' } } },
    yaxis:      { labels:{ formatter: v => `₦${(v/1000).toFixed(0)}k`, style:{ fontSize:'10px' } } },
    grid:       { borderColor:'#f1f5f9', strokeDashArray:4 },
    tooltip:    { y:{ formatter: v => fmt(v) } },
    legend:     { position:'top', fontSize:'11px' },
  }), [])

  // Income breakdown — donut
  useApexChart(incomeDonut, () => ({
    chart:      { type:'donut', height:230 },
    series:     INCOME_BREAKDOWN.map(d => d.value),
    labels:     INCOME_BREAKDOWN.map(d => d.name),
    colors:     ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9'],
    dataLabels: { enabled:false },
    legend:     { show:false },
    plotOptions:{ pie:{ donut:{ size:'65%',
      labels:{ show:true, total:{ show:true, label:'Total',
        formatter: () => `₦${(3_140_000/1_000_000).toFixed(1)}M` } } } } },
    tooltip:    { y:{ formatter: v => fmt(v) } },
  }), [])

  // Computed KPIs for this month (June)
  const revenue   = 3_140_000
  const expenses  = 1_890_000
  const profit    = revenue - expenses
  const margin    = ((profit / revenue) * 100).toFixed(1)
  const cashInBank= 4_850_000 + 1_320_000 + 2_100_000 + 680_000
  const todayRev  = DAILY_CASHFLOW[DAILY_CASHFLOW.length - 1].in

  const QUICK_LINKS = [
    { to:'/accounts/transactions',  icon:'ri-exchange-line',        label:'All Transactions',     color:'#3b82f6' },
    { to:'/accounts/income',        icon:'ri-arrow-up-circle-line', label:'Income',               color:'#22c55e' },
    { to:'/accounts/expenses',      icon:'ri-arrow-down-circle-line',label:'Expenses',            color:'#ef4444' },
    { to:'/accounts/commissions',   icon:'ri-user-star-line',       label:'Driver Commissions',   color:'#8b5cf6' },
    { to:'/accounts/bank',          icon:'ri-bank-line',            label:'Bank Accounts',        color:'#f59e0b' },
    { to:'/accounts/transfer',      icon:'ri-send-plane-line',      label:'Money Transfer',       color:'#0ea5e9' },
  ]

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Financial Overview</h6>
          <p className="text-muted mb-0" style={{ fontSize:12 }}>All financial movement across Bems Farms — June 2026</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Accounts</li>
          <li className="breadcrumb-item active">Overview</li>
        </ul>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label:'Revenue This Month',  val:fmt(revenue),    sub:'+11% vs last month',  subColor:'#22c55e', icon:'ri-arrow-up-circle-line',    color:'#3b82f6', bg:'#eff6ff' },
          { label:'Expenses This Month', val:fmt(expenses),   sub:'+10.5% vs last month',subColor:'#ef4444', icon:'ri-arrow-down-circle-line',  color:'#ef4444', bg:'#fef2f2' },
          { label:'Net Profit',          val:fmt(profit),     sub:`${margin}% margin`,   subColor:'#22c55e', icon:'ri-line-chart-line',         color:'#22c55e', bg:'#f0fdf4' },
          { label:"Today's Revenue",     val:fmt(todayRev),   sub:'Live — Fri 27 Jun',   subColor:'#0ea5e9', icon:'ri-calendar-check-line',     color:'#0ea5e9', bg:'#f0f9ff' },
          { label:'Cash in All Banks',   val:fmt(cashInBank), sub:'4 accounts',          subColor:'#6b7280', icon:'ri-bank-line',               color:'#8b5cf6', bg:'#f5f3ff' },
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
                  <div className="text-muted" style={{ fontSize:11 }}>January – June 2026</div>
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
              <div className="text-muted mb-3" style={{ fontSize:11 }}>June 2026</div>
              <div ref={incomeDonut}/>
              <div className="mt-2">
                {INCOME_BREAKDOWN.map((d, i) => {
                  const colors = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9']
                  const pct = ((d.value / INCOME_BREAKDOWN.reduce((s,x)=>s+x.value,0))*100).toFixed(0)
                  return (
                    <div key={d.name} className="d-flex align-items-center justify-content-between py-1">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width:8, height:8, borderRadius:'50%', background:colors[i], flexShrink:0 }}/>
                        <span style={{ fontSize:11 }}>{d.name}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize:11 }} className="fw-medium">{fmt(d.value)}</span>
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

      {/* Row: Cash flow chart + Expense breakdown */}
      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-medium" style={{ fontSize:14 }}>Daily Cash Flow</div>
                  <div className="text-muted" style={{ fontSize:11 }}>This week — Mon–Fri</div>
                </div>
                <div className="badge" style={{ background:'#f0fdf4', color:'#22c55e', border:'1px solid #bbf7d0', fontSize:11 }}>
                  Net: {fmt(DAILY_CASHFLOW.reduce((s,d)=>s+(d.in-d.out),0))} ↑
                </div>
              </div>
              <div ref={cashflowRef}/>
              <div className="row g-2 mt-2">
                {DAILY_CASHFLOW.map(d => (
                  <div key={d.day} className="col text-center">
                    <div style={{ fontSize:10, color:'#22c55e' }}>+{fmt(d.in/1000).replace('₦','₦')}k</div>
                    <div style={{ fontSize:10, color:'#ef4444' }}>−{Math.round(d.out/1000)}k</div>
                    <div style={{ fontSize:9 }} className="text-muted">{d.day.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="fw-medium mb-1" style={{ fontSize:14 }}>Expense Breakdown</div>
              <div className="text-muted mb-3" style={{ fontSize:11 }}>June 2026 — {fmt(expenses)} total</div>
              {EXPENSE_BREAKDOWN.map(e => {
                const pct = ((e.value / expenses) * 100).toFixed(0)
                return (
                  <div key={e.name} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ fontSize:12 }}>{e.name}</span>
                      <span className="fw-medium" style={{ fontSize:12 }}>{fmt(e.value)} <span className="text-muted">({pct}%)</span></span>
                    </div>
                    <div style={{ background:'#f1f5f9', borderRadius:4, height:6, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:e.color, borderRadius:4, transition:'width 0.4s' }}/>
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
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} className={`d-flex align-items-start gap-3 px-4 py-3 ${i < RECENT_ACTIVITY.length-1 ? 'border-bottom':''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width:36, height:36, background:a.bg }}>
                    <i className={`${a.icon}`} style={{ color:a.color, fontSize:15 }}/>
                  </div>
                  <div className="flex-fill">
                    <div style={{ fontSize:13 }}>{a.desc}</div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <span className="text-muted" style={{ fontSize:11 }}>{a.ref}</span>
                      <span className="text-muted" style={{ fontSize:10 }}>·</span>
                      <span className="text-muted" style={{ fontSize:11 }}>{a.time}</span>
                      <span className="badge" style={{ fontSize:9,
                        background: a.type==='income'?'#f0fdf4':a.type==='expense'?'#fef2f2':a.type==='commission'?'#f5f3ff':a.type==='transfer'?'#eff6ff':'#fffbeb',
                        color: a.type==='income'?'#16a34a':a.type==='expense'?'#dc2626':a.type==='commission'?'#7c3aed':a.type==='transfer'?'#2563eb':'#d97706',
                        border:`1px solid ${a.type==='income'?'#bbf7d0':a.type==='expense'?'#fecaca':a.type==='commission'?'#ddd6fe':a.type==='transfer'?'#bfdbfe':'#fde68a'}`,
                      }}>
                        {TYPE_LABELS[a.type]}
                      </span>
                    </div>
                  </div>
                  <div className={`fw-bold`} style={{ fontSize:14, color: a.amount > 0 ? '#22c55e' : '#ef4444', flexShrink:0 }}>
                    {a.amount > 0 ? '+' : '−'}{fmt(Math.abs(a.amount))}
                  </div>
                </div>
              ))}
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
              {MONTHS.map((m, i) => {
                const rev  = MONTHLY_REVENUE[i]
                const exp  = MONTHLY_EXPENSES[i]
                const prof = rev - exp
                const isProfit = prof > 0
                return (
                  <div key={m} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize:12 }}>{m} 2026</span>
                    <div className="text-end">
                      <div style={{ fontSize:12 }}>{fmt(rev)}</div>
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
