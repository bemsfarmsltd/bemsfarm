import { useState, useMemo } from 'react'
import PageHeader from '../../components/ui/PageHeader'

const ini = n => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']
const ALL_CUSTOMERS = ['All Customers','Adaeze Nwosu','Seun Adesanya','Chukwuemeka Eze','Funke Oladele','Tolulope Badmus','Ngozi Umeh','Babatunde Ojo','Aminat Suleiman','Emeka Okonkwo','Kemi Adeleke','Chidi Okeke','Bisi Awojobi','Yusuf Abdullahi','Chioma Obi','Lanre Fasanya']

const TYPE_CFG = {
  order:     { label:'Order Placed',     icon:'ri-shopping-bag-line',    color:'#3b82f6', bg:'#eff6ff' },
  delivered: { label:'Order Delivered',  icon:'ri-checkbox-circle-line', color:'#22c55e', bg:'#f0fdf4' },
  cancelled: { label:'Order Cancelled',  icon:'ri-close-circle-line',    color:'#ef4444', bg:'#fef2f2' },
  topup:     { label:'Wallet Top-up',    icon:'ri-wallet-3-line',        color:'#8b5cf6', bg:'#f5f3ff' },
  login:     { label:'Login',            icon:'ri-login-circle-line',    color:'#64748b', bg:'#f8fafc' },
  profile:   { label:'Profile Updated',  icon:'ri-user-settings-line',   color:'#f59e0b', bg:'#fffbeb' },
  points:    { label:'Points Earned',    icon:'ri-medal-line',           color:'#d97706', bg:'#fffbeb' },
  redeem:    { label:'Points Redeemed',  icon:'ri-gift-line',            color:'#7c3aed', bg:'#f5f3ff' },
  refund:    { label:'Refund Issued',    icon:'ri-refund-2-line',        color:'#0ea5e9', bg:'#f0f9ff' },
  signup:    { label:'Account Created',  icon:'ri-user-add-line',        color:'#22c55e', bg:'#f0fdf4' },
  review:    { label:'Review Left',      icon:'ri-star-line',            color:'#f59e0b', bg:'#fffbeb' },
}

const ACTIVITIES = [
  { id:'ACT-001', customer:'Funke Oladele',   custId:'CUS-004', type:'order',     desc:'Placed order ORD-2026-0142 — Corporate bundle 10kg veg',             ref:'ORD-2026-0142', date:'2026-06-27', time:'09:15', device:'Mobile App'       },
  { id:'ACT-002', customer:'Bisi Awojobi',    custId:'CUS-012', type:'delivered', desc:'Order ORD-2026-0143 delivered — Platinum weekly box',                 ref:'ORD-2026-0143', date:'2026-06-27', time:'11:30', device:'System'            },
  { id:'ACT-003', customer:'Seun Adesanya',   custId:'CUS-002', type:'topup',     desc:'Wallet topped up with ₦20,000 via Bank Transfer',                    ref:'WLT-0234',      date:'2026-06-27', time:'09:21', device:'Mobile App'       },
  { id:'ACT-004', customer:'Funke Oladele',   custId:'CUS-004', type:'login',     desc:'Logged in from Lagos, NG — iPhone 14 Pro',                            ref:null,            date:'2026-06-27', time:'09:10', device:'Mobile App'       },
  { id:'ACT-005', customer:'Bisi Awojobi',    custId:'CUS-012', type:'points',    desc:'Earned 500 pts — Platinum weekly order bonus',                        ref:'ORD-2026-0143', date:'2026-06-27', time:'11:35', device:'System'            },
  { id:'ACT-006', customer:'Babatunde Ojo',   custId:'CUS-007', type:'order',     desc:'Placed order ORD-2026-0139 — Bulk 20kg assorted veg',                 ref:'ORD-2026-0139', date:'2026-06-26', time:'10:15', device:'WhatsApp Bot'     },
  { id:'ACT-007', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'delivered', desc:'Order ORD-2026-0141 delivered — Tomatoes, Pepper, Spinach',           ref:'ORD-2026-0141', date:'2026-06-25', time:'14:45', device:'System'            },
  { id:'ACT-008', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'review',    desc:'Left 5★ review: "Always fresh produce, fast delivery!"',              ref:'REV-0091',      date:'2026-06-25', time:'15:20', device:'Mobile App'       },
  { id:'ACT-009', customer:'Emeka Okonkwo',   custId:'CUS-009', type:'redeem',    desc:'Redeemed 500 pts for ₦2,000 wallet credit',                          ref:'LYL-0043',      date:'2026-06-23', time:'12:00', device:'Mobile App'       },
  { id:'ACT-010', customer:'Ngozi Umeh',      custId:'CUS-006', type:'order',     desc:'Placed order ORD-2026-0135 — Fresh herbs, Spinach x5',                ref:'ORD-2026-0135', date:'2026-06-24', time:'11:30', device:'Website'          },
  { id:'ACT-011', customer:'Chukwuemeka Eze', custId:'CUS-003', type:'refund',    desc:'Refund of ₦14,200 issued for cancelled order ORD-2026-0112',         ref:'RFC-0048',      date:'2026-06-22', time:'16:00', device:'System'            },
  { id:'ACT-012', customer:'Chukwuemeka Eze', custId:'CUS-003', type:'cancelled', desc:'Order ORD-2026-0112 cancelled — customer unavailable for delivery',   ref:'ORD-2026-0112', date:'2026-06-22', time:'13:00', device:'System'            },
  { id:'ACT-013', customer:'Chioma Obi',      custId:'CUS-014', type:'points',    desc:'Earned 200 pts — referral bonus (brought Kemi Adeleke)',              ref:'LYL-0042',      date:'2026-06-21', time:'09:00', device:'System'            },
  { id:'ACT-014', customer:'Seun Adesanya',   custId:'CUS-002', type:'login',     desc:'Logged in from Lagos, NG — Samsung Galaxy S24',                      ref:null,            date:'2026-06-27', time:'08:55', device:'Mobile App'       },
  { id:'ACT-015', customer:'Babatunde Ojo',   custId:'CUS-007', type:'topup',     desc:'Wallet topped up with ₦50,000 via Bank Transfer',                    ref:'WLT-0228',      date:'2026-06-20', time:'09:00', device:'System (Bank)'    },
  { id:'ACT-016', customer:'Chidi Okeke',     custId:'CUS-011', type:'redeem',    desc:'Redeemed 300 pts for free delivery on next order',                   ref:'LYL-0044',      date:'2026-06-20', time:'14:00', device:'Mobile App'       },
  { id:'ACT-017', customer:'Adaeze Nwosu',    custId:'CUS-001', type:'topup',     desc:'Wallet topped up with ₦10,000 via Bank Transfer',                    ref:'WLT-0229',      date:'2026-06-20', time:'16:10', device:'System (Bank)'    },
  { id:'ACT-018', customer:'Kemi Adeleke',    custId:'CUS-010', type:'profile',   desc:'Updated delivery address — Maryland Estate, Block 3',                ref:null,            date:'2026-06-18', time:'11:00', device:'Website'          },
  { id:'ACT-019', customer:'Tolulope Badmus', custId:'CUS-005', type:'order',     desc:'Placed order ORD-2026-0121 — Carrots x4, Cucumber x2',              ref:'ORD-2026-0121', date:'2026-06-18', time:'10:20', device:'WhatsApp Bot'     },
  { id:'ACT-020', customer:'Lanre Fasanya',   custId:'CUS-015', type:'login',     desc:'Logged in from Lagos, NG — MacBook (Web)',                           ref:null,            date:'2026-06-17', time:'09:30', device:'Website'          },
  { id:'ACT-021', customer:'Yusuf Abdullahi', custId:'CUS-013', type:'order',     desc:'Placed order ORD-2026-0118 — Tomatoes x2, Onions x3',               ref:'ORD-2026-0118', date:'2026-06-15', time:'12:45', device:'Mobile App'       },
  { id:'ACT-022', customer:'Ngozi Umeh',      custId:'CUS-006', type:'topup',     desc:'Wallet topped up with ₦5,400 via Paystack — first top-up',           ref:'WLT-0227',      date:'2026-06-15', time:'13:15', device:'Website'          },
  { id:'ACT-023', customer:'Aminat Suleiman', custId:'CUS-008', type:'signup',    desc:'Account created — referred by friend, Ikorodu zone',                 ref:'CUS-008',       date:'2025-05-11', time:'14:00', device:'Mobile App'       },
  { id:'ACT-024', customer:'Emeka Okonkwo',   custId:'CUS-009', type:'review',    desc:'Left 4★ review: "Great quality, packaging could be improved"',       ref:'REV-0088',      date:'2026-06-24', time:'18:00', device:'Mobile App'       },
  { id:'ACT-025', customer:'Funke Oladele',   custId:'CUS-004', type:'profile',   desc:'Updated phone number and billing preference',                         ref:null,            date:'2026-06-14', time:'10:00', device:'Mobile App'       },
]

const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }

function formatDate(d) {
  if (d==='2026-06-27') return 'Today — 27 June 2026'
  if (d==='2026-06-26') return 'Yesterday — 26 June 2026'
  return new Date(d+'T12:00').toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
}

export default function ActivityLog() {
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCust, setFilterCust] = useState('All Customers')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const filtered = useMemo(() => ACTIVITIES.filter(a => {
    if (filterType!=='all' && a.type!==filterType) return false
    if (filterCust!=='All Customers' && a.customer!==filterCust) return false
    if (dateFrom && a.date<dateFrom) return false
    if (dateTo && a.date>dateTo) return false
    if (search) { const q=search.toLowerCase(); return a.desc.toLowerCase().includes(q)||a.customer.toLowerCase().includes(q)||(a.ref||'').toLowerCase().includes(q) }
    return true
  }), [search, filterType, filterCust, dateFrom, dateTo])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(a => { if (!map[a.date]) map[a.date]=[]; map[a.date].push(a) })
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const todayCount  = ACTIVITIES.filter(a=>a.date==='2026-06-27').length
  const loginCount  = ACTIVITIES.filter(a=>a.type==='login').length
  const orderCount  = ACTIVITIES.filter(a=>a.type==='order').length
  const redeemCount = ACTIVITIES.filter(a=>a.type==='redeem').length

  const clearFilters = () => { setSearch(''); setFilterType('all'); setFilterCust('All Customers'); setDateFrom(''); setDateTo('') }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader
        title="Activity Log"
        subtitle="All customer actions across the platform — orders, logins, wallet, points"
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Events',      val:ACTIVITIES.length, icon:'ri-list-check-3',       color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Activity",  val:todayCount,        icon:'ri-calendar-check-line', color:'#22c55e', bg:'#f0fdf4' },
          { label:'Orders Placed',     val:orderCount,        icon:'ri-shopping-bag-line',   color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Active Sessions',   val:loginCount,        icon:'ri-login-circle-line',   color:'#f59e0b', bg:'#fffbeb' },
          { label:'Points Redeemed',   val:redeemCount,       icon:'ri-gift-line',           color:'#7c3aed', bg:'#f5f3ff' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
            <div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{k.val}</div>
            </div>
            <div style={{ width:38, height:38, borderRadius:9, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={k.icon} style={{ color:k.color, fontSize:18 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding:'14px 16px', marginBottom:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto auto', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, customers…" style={{ ...inp, paddingLeft:32 }} />
          </div>
          <select value={filterCust} onChange={e => setFilterCust(e.target.value)} style={inp}>
            {ALL_CUSTOMERS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" style={{ ...inp, width:'auto' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To" style={{ ...inp, width:'auto' }} />
          <button onClick={clearFilters} style={{ padding:'9px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:12, fontFamily:'Nunito, sans-serif', fontWeight:600, color:'#374151', whiteSpace:'nowrap' }}>Clear</button>
        </div>
      </div>

      {/* Type pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {['all',...Object.keys(TYPE_CFG)].map(t => {
          const cfg = t!=='all' ? TYPE_CFG[t] : null
          const count = t==='all' ? ACTIVITIES.length : ACTIVITIES.filter(a=>a.type===t).length
          const isActive = filterType===t
          return (
            <button key={t} onClick={() => setFilterType(t)} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Nunito, sans-serif', background: isActive?(cfg?cfg.color:'#1B4332'):'#f8fafc', color: isActive?'#fff':'#64748b' }}>
              {cfg && <i className={cfg.icon} />}
              {t==='all'?'All Events':cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length===0 && (
        <div style={{ ...card, padding:'48px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
          <i className="ri-search-line" style={{ fontSize:32, display:'block', marginBottom:8 }} />
          No activity matches your filters.
        </div>
      )}

      {/* Activity groups */}
      {grouped.map(([date, events]) => (
        <div key={date} style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', whiteSpace:'nowrap' }}>{formatDate(date)}</div>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:'#f1f5f9', color:'#64748b', whiteSpace:'nowrap' }}>{events.length} event{events.length!==1?'s':''}</span>
          </div>

          <div style={card}>
            {events.map((a,i) => {
              const tc      = TYPE_CFG[a.type]
              const custIdx = ALL_CUSTOMERS.indexOf(a.customer) - 1
              return (
                <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 20px', borderBottom: i<events.length-1?'1px solid #f9fafb':'none' }}>
                  {/* Type icon */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={tc.icon} style={{ color:tc.color, fontSize:15 }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:AVATAR_COLORS[Math.max(0,custIdx)%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:9, flexShrink:0 }}>{ini(a.customer)}</div>
                          <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{a.customer}</span>
                          <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:50, background:tc.bg, color:tc.color }}>{tc.label}</span>
                        </div>
                        <div style={{ fontSize:13, color:'#374151' }}>{a.desc}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' }}>
                          {a.ref && <span style={{ fontSize:10, color:'#94a3b8' }}>{a.ref}</span>}
                          {a.ref && <span style={{ fontSize:10, color:'#94a3b8' }}>·</span>}
                          <span style={{ fontSize:10, color:'#94a3b8' }}><i className="ri-time-line" style={{ marginRight:3 }} />{a.time}</span>
                          <span style={{ fontSize:10, color:'#94a3b8' }}>·</span>
                          <span style={{ fontSize:10, color:'#94a3b8' }}><i className="ri-device-line" style={{ marginRight:3 }} />{a.device}</span>
                        </div>
                      </div>
                      <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap', flexShrink:0 }}>{a.id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length > 0 && (
        <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:'8px 0' }}>
          Showing {filtered.length} of {ACTIVITIES.length} events
        </div>
      )}
    </div>
  )
}
