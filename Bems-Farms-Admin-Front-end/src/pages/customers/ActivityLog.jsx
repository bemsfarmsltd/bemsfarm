import { useState, useMemo } from 'react'

const ini = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

const ALL_CUSTOMERS = ['All Customers','Adaeze Nwosu','Seun Adesanya','Chukwuemeka Eze','Funke Oladele','Tolulope Badmus','Ngozi Umeh','Babatunde Ojo','Aminat Suleiman','Emeka Okonkwo','Kemi Adeleke','Chidi Okeke','Bisi Awojobi','Yusuf Abdullahi','Chioma Obi','Lanre Fasanya']

const TYPE_CFG = {
  order:      { label:'Order Placed',     icon:'ri-shopping-bag-line',   color:'#3b82f6', bg:'#eff6ff'  },
  delivered:  { label:'Order Delivered',  icon:'ri-checkbox-circle-line', color:'#22c55e', bg:'#f0fdf4'  },
  cancelled:  { label:'Order Cancelled',  icon:'ri-close-circle-line',    color:'#ef4444', bg:'#fef2f2'  },
  topup:      { label:'Wallet Top-up',    icon:'ri-wallet-3-line',        color:'#8b5cf6', bg:'#f5f3ff'  },
  login:      { label:'Login',            icon:'ri-login-circle-line',    color:'#64748b', bg:'#f8fafc'  },
  profile:    { label:'Profile Updated',  icon:'ri-user-settings-line',   color:'#f59e0b', bg:'#fffbeb'  },
  points:     { label:'Points Earned',    icon:'ri-medal-line',           color:'#d97706', bg:'#fffbeb'  },
  redeem:     { label:'Points Redeemed',  icon:'ri-gift-line',            color:'#7c3aed', bg:'#f5f3ff'  },
  refund:     { label:'Refund Issued',    icon:'ri-refund-2-line',        color:'#0ea5e9', bg:'#f0f9ff'  },
  signup:     { label:'Account Created',  icon:'ri-user-add-line',        color:'#22c55e', bg:'#f0fdf4'  },
  review:     { label:'Review Left',      icon:'ri-star-line',            color:'#f59e0b', bg:'#fffbeb'  },
}

const ACTIVITIES = [
  { id:'ACT-001', customer:'Funke Oladele',   custId:'CUS-004', type:'order',     desc:'Placed order ORD-2026-0142 — Corporate bundle 10kg veg',              ref:'ORD-2026-0142', date:'2026-06-27', time:'09:15', device:'Mobile App' },
  { id:'ACT-002', customer:'Bisi Awojobi',    custId:'CUS-012', type:'delivered', desc:'Order ORD-2026-0143 delivered — Platinum weekly box',                  ref:'ORD-2026-0143', date:'2026-06-27', time:'11:30', device:'System' },
  { id:'ACT-003', customer:'Seun Adesanya',   custId:'CUS-002', type:'topup',     desc:'Wallet topped up with ₦20,000 via Bank Transfer',                     ref:'WLT-0234',      date:'2026-06-27', time:'09:21', device:'Mobile App' },
  { id:'ACT-004', customer:'Funke Oladele',   custId:'CUS-004', type:'login',     desc:'Logged in from Lagos, NG — iPhone 14 Pro',                             ref:null,            date:'2026-06-27', time:'09:10', device:'Mobile App' },
  { id:'ACT-005', customer:'Bisi Awojobi',    custId:'CUS-012', type:'points',    desc:'Earned 500 pts — Platinum weekly order bonus',                         ref:'ORD-2026-0143', date:'2026-06-27', time:'11:35', device:'System' },
  { id:'ACT-006', customer:'Babatunde Ojo',   custId:'CUS-007', type:'order',     desc:'Placed order ORD-2026-0139 — Bulk 20kg assorted veg',                  ref:'ORD-2026-0139', date:'2026-06-26', time:'10:15', device:'WhatsApp Bot' },
  { id:'ACT-007', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'delivered', desc:'Order ORD-2026-0141 delivered — Tomatoes, Pepper, Spinach',            ref:'ORD-2026-0141', date:'2026-06-25', time:'14:45', device:'System' },
  { id:'ACT-008', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'review',    desc:'Left 5★ review: "Always fresh produce, fast delivery!"',               ref:'REV-0091',      date:'2026-06-25', time:'15:20', device:'Mobile App' },
  { id:'ACT-009', customer:'Emeka Okonkwo',   custId:'CUS-009', type:'redeem',    desc:'Redeemed 500 pts for ₦2,000 wallet credit',                           ref:'LYL-0043',      date:'2026-06-23', time:'12:00', device:'Mobile App' },
  { id:'ACT-010', customer:'Ngozi Umeh',      custId:'CUS-006', type:'order',     desc:'Placed order ORD-2026-0135 — Fresh herbs, Spinach x5',                 ref:'ORD-2026-0135', date:'2026-06-24', time:'11:30', device:'Website' },
  { id:'ACT-011', customer:'Chukwuemeka Eze', custId:'CUS-003', type:'refund',    desc:'Refund of ₦14,200 issued for cancelled order ORD-2026-0112',          ref:'RFC-0048',      date:'2026-06-22', time:'16:00', device:'System' },
  { id:'ACT-012', customer:'Chukwuemeka Eze', custId:'CUS-003', type:'cancelled', desc:'Order ORD-2026-0112 cancelled — customer unavailable for delivery',    ref:'ORD-2026-0112', date:'2026-06-22', time:'13:00', device:'System' },
  { id:'ACT-013', customer:'Chioma Obi',      custId:'CUS-014', type:'points',    desc:'Earned 200 pts — referral bonus (brought Kemi Adeleke)',               ref:'LYL-0042',      date:'2026-06-21', time:'09:00', device:'System' },
  { id:'ACT-014', customer:'Seun Adesanya',   custId:'CUS-002', type:'login',     desc:'Logged in from Lagos, NG — Samsung Galaxy S24',                       ref:null,            date:'2026-06-27', time:'08:55', device:'Mobile App' },
  { id:'ACT-015', customer:'Babatunde Ojo',   custId:'CUS-007', type:'topup',     desc:'Wallet topped up with ₦50,000 via Bank Transfer',                     ref:'WLT-0228',      date:'2026-06-20', time:'09:00', device:'System (Bank)' },
  { id:'ACT-016', customer:'Chidi Okeke',     custId:'CUS-011', type:'redeem',    desc:'Redeemed 300 pts for free delivery on next order',                    ref:'LYL-0044',      date:'2026-06-20', time:'14:00', device:'Mobile App' },
  { id:'ACT-017', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'topup',     desc:'Wallet topped up with ₦10,000 via Bank Transfer',                     ref:'WLT-0229',      date:'2026-06-20', time:'16:10', device:'System (Bank)' },
  { id:'ACT-018', customer:'Kemi Adeleke',    custId:'CUS-010', type:'profile',   desc:'Updated delivery address — Maryland Estate, Block 3',                 ref:null,            date:'2026-06-18', time:'11:00', device:'Website' },
  { id:'ACT-019', customer:'Tolulope Badmus', custId:'CUS-005', type:'order',     desc:'Placed order ORD-2026-0121 — Carrots x4, Cucumber x2',               ref:'ORD-2026-0121', date:'2026-06-18', time:'10:20', device:'WhatsApp Bot' },
  { id:'ACT-020', customer:'Lanre Fasanya',   custId:'CUS-015', type:'login',     desc:'Logged in from Lagos, NG — MacBook (Web)',                            ref:null,            date:'2026-06-17', time:'09:30', device:'Website' },
  { id:'ACT-021', customer:'Yusuf Abdullahi', custId:'CUS-013', type:'order',     desc:'Placed order ORD-2026-0118 — Tomatoes x2, Onions x3',                ref:'ORD-2026-0118', date:'2026-06-15', time:'12:45', device:'Mobile App' },
  { id:'ACT-022', customer:'Ngozi Umeh',      custId:'CUS-006', type:'topup',     desc:'Wallet topped up with ₦5,400 via Paystack — first top-up',            ref:'WLT-0227',      date:'2026-06-15', time:'13:15', device:'Website' },
  { id:'ACT-023', customer:'Aminat Suleiman', custId:'CUS-008', type:'signup',    desc:'Account created — referred by friend, Ikorodu zone',                  ref:'CUS-008',       date:'2025-05-11', time:'14:00', device:'Mobile App' },
  { id:'ACT-024', customer:'Emeka Okonkwo',   custId:'CUS-009', type:'review',    desc:'Left 4★ review: "Great quality, packaging could be improved"',        ref:'REV-0088',      date:'2026-06-24', time:'18:00', device:'Mobile App' },
  { id:'ACT-025', customer:'Funke Oladele',   custId:'CUS-004', type:'profile',   desc:'Updated phone number and billing preference',                          ref:null,            date:'2026-06-14', time:'10:00', device:'Mobile App' },
]

export default function ActivityLog() {
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCust, setFilterCust] = useState('All Customers')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const filtered = useMemo(() => ACTIVITIES.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false
    if (filterCust !== 'All Customers' && a.customer !== filterCust) return false
    if (dateFrom && a.date < dateFrom) return false
    if (dateTo && a.date > dateTo) return false
    if (search) {
      const q = search.toLowerCase()
      return a.desc.toLowerCase().includes(q) || a.customer.toLowerCase().includes(q) || (a.ref||'').toLowerCase().includes(q)
    }
    return true
  }), [search, filterType, filterCust, dateFrom, dateTo])

  // Group by date
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(a => {
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    })
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const todayCount   = ACTIVITIES.filter(a=>a.date==='2026-06-27').length
  const loginCount   = ACTIVITIES.filter(a=>a.type==='login').length
  const orderCount   = ACTIVITIES.filter(a=>a.type==='order').length
  const redeemCount  = ACTIVITIES.filter(a=>a.type==='redeem').length

  function formatDate(d) {
    if (d === '2026-06-27') return 'Today — 27 June 2026'
    if (d === '2026-06-26') return 'Yesterday — 26 June 2026'
    return new Date(d+'T12:00').toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Activity Log</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>All customer actions across the platform — orders, logins, wallet, points</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">Customers</li>
          <li className="breadcrumb-item active">Activity Log</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Events',     val:ACTIVITIES.length, icon:'ri-list-check-3',         color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Activity", val:todayCount,        icon:'ri-calendar-check-line',   color:'#22c55e', bg:'#f0fdf4' },
          { label:'Orders Placed',    val:orderCount,        icon:'ri-shopping-bag-line',     color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Active Sessions',  val:loginCount,        icon:'ri-login-circle-line',     color:'#f59e0b', bg:'#fffbeb' },
          { label:'Points Redeemed',  val:redeemCount,       icon:'ri-gift-line',             color:'#7c3aed', bg:'#f5f3ff' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="text-muted mb-1" style={{fontSize:11}}>{k.label}</div>
                    <div className="fw-bold" style={{fontSize:18}}>{k.val}</div>
                  </div>
                  <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{width:38,height:38,background:k.bg}}>
                    <i className={`${k.icon} fs-18`} style={{color:k.color}}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
                <input className="form-control border-start-0 bg-light" placeholder="Search events, customers…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterCust} onChange={e=>setFilterCust(e.target.value)}>
                {ALL_CUSTOMERS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From"/>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To"/>
            </div>
            <div className="col-md-2">
              <button className="btn btn-sm btn-outline-secondary w-100"
                onClick={()=>{ setSearch(''); setFilterType('all'); setFilterCust('All Customers'); setDateFrom(''); setDateTo('') }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {['all',...Object.keys(TYPE_CFG)].map(t => {
          const cfg = t!=='all' ? TYPE_CFG[t] : null
          const count = t==='all' ? ACTIVITIES.length : ACTIVITIES.filter(a=>a.type===t).length
          const isActive = filterType===t
          return (
            <button key={t} onClick={()=>setFilterType(t)} className="btn btn-sm" style={{
              fontSize:11,
              background: isActive ? (cfg ? cfg.color : '#1e293b') : '#f8fafc',
              color: isActive ? '#fff' : '#64748b',
              border:`1px solid ${isActive?'transparent':'#e2e8f0'}`,
            }}>
              {cfg && <i className={`${cfg.icon} me-1`}/>}
              {t==='all'?'All Events':cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Activity Feed — Grouped by date */}
      {filtered.length===0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">No activity matches your filters.</div>
        </div>
      )}

      {grouped.map(([date, events]) => (
        <div key={date} className="mb-4">
          {/* Date heading */}
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="fw-semibold" style={{fontSize:13,color:'#1e293b',whiteSpace:'nowrap'}}>{formatDate(date)}</div>
            <div style={{flex:1,height:1,background:'#e2e8f0'}}/>
            <span className="badge" style={{fontSize:10,background:'#f1f5f9',color:'#64748b',whiteSpace:'nowrap'}}>
              {events.length} event{events.length!==1?'s':''}
            </span>
          </div>

          <div className="card border-0 shadow-sm">
            {events.map((a,i) => {
              const tc = TYPE_CFG[a.type]
              const custIdx = ALL_CUSTOMERS.indexOf(a.customer)-1
              return (
                <div key={a.id} className={`d-flex align-items-start gap-3 px-4 py-3 ${i<events.length-1?'border-bottom':''}`}>
                  {/* Timeline dot + line */}
                  <div className="d-flex flex-column align-items-center flex-shrink-0" style={{marginTop:2}}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:15}}/>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-fill">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-1">
                      <div>
                        {/* Customer avatar + name */}
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                            style={{width:22,height:22,background:AVATAR_COLORS[Math.max(0,custIdx)%AVATAR_COLORS.length],fontSize:9}}>
                            {ini(a.customer)}
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{a.customer}</span>
                          <span className="badge" style={{fontSize:9,background:tc.bg,color:tc.color,border:`1px solid ${tc.bg}`}}>
                            {tc.label}
                          </span>
                        </div>
                        <div style={{fontSize:13,color:'#374151'}}>{a.desc}</div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {a.ref && <span className="text-muted" style={{fontSize:10}}>{a.ref}</span>}
                          {a.ref && <span className="text-muted" style={{fontSize:10}}>·</span>}
                          <span className="text-muted" style={{fontSize:10}}><i className="ri-time-line me-1"/>{a.time}</span>
                          <span className="text-muted" style={{fontSize:10}}>·</span>
                          <span className="text-muted" style={{fontSize:10}}><i className="ri-device-line me-1"/>{a.device}</span>
                        </div>
                      </div>
                      <span className="text-muted" style={{fontSize:10,whiteSpace:'nowrap'}}>{a.id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Footer count */}
      {filtered.length>0 && (
        <div className="text-center text-muted py-2" style={{fontSize:12}}>
          Showing {filtered.length} of {ACTIVITIES.length} events
        </div>
      )}
    </div>
  )
}
