import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const fmt    = n => `₦${Number(n).toLocaleString()}`
const ini    = name => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n).toLocaleString()+' pts'

const CUSTOMERS = {
  'CUS-001':{ id:'CUS-001', name:'Adaeze Nwosu',    phone:'08031234567', email:'adaeze.nwosu@gmail.com',    zone:'Lekki Phase 1',   address:'14B Admiralty Way, Lekki Phase 1, Lagos', joined:'2024-03-14', orders:24, totalSpent:412_000, points:4120,  tier:'Gold',     status:'active',   lastOrder:'2026-06-25', device:'iOS App',     referral:'Instagram', notes:'Prefers organic produce. Morning deliveries preferred. Allergic to peanuts.', avatarColor:'#3b82f6' },
  'CUS-002':{ id:'CUS-002', name:'Seun Adesanya',   phone:'07056789012', email:'seun.adesanya@yahoo.com',   zone:'Ikeja GRA',       address:'5 Opebi Road, Ikeja GRA, Lagos',          joined:'2024-07-02', orders:18, totalSpent:284_500, points:2845,  tier:'Silver',   status:'active',   lastOrder:'2026-06-27', device:'Android App', referral:'Friend',    notes:'Bulk orders for family household. Usually orders on weekends.', avatarColor:'#22c55e' },
  'CUS-004':{ id:'CUS-004', name:'Funke Oladele',   phone:'08023456789', email:'funke.oladele@gmail.com',   zone:'Victoria Island', address:'5 Adeola Odeku St, Victoria Island, Lagos', joined:'2023-11-05', orders:41, totalSpent:820_000, points:9840, tier:'Platinum', status:'active',   lastOrder:'2026-06-27', device:'iOS App',     referral:'Google',    notes:'Corporate buyer — needs invoice for every order. Office deliveries only.', avatarColor:'#8b5cf6' },
  'CUS-007':{ id:'CUS-007', name:'Babatunde Ojo',   phone:'08067890123', email:'tunde.ojo@company.ng',      zone:'Gbagada',         address:'Plot 21, Gbagada Express Way, Lagos',      joined:'2024-05-30', orders:29, totalSpent:524_000, points:5240,  tier:'Gold',     status:'active',   lastOrder:'2026-06-26', device:'Website',     referral:'TV Ad',     notes:'Bulk orders every Friday. Prefers afternoon delivery window.', avatarColor:'#f97316' },
  'CUS-012':{ id:'CUS-012', name:'Bisi Awojobi',    phone:'08178901234', email:'bisi.awojobi@gmail.com',    zone:'Ogba',            address:'12 Aina Street, Ogba, Lagos',              joined:'2023-09-22', orders:52, totalSpent:1_040_000,points:11200,tier:'Platinum', status:'active',   lastOrder:'2026-06-27', device:'Android App', referral:'Word of mouth', notes:'Top customer. Always on time for pick-ups. Very engaged.', avatarColor:'#ef4444' },
}

const ORDER_HISTORY = {
  'CUS-001':[
    { id:'ORD-2026-0141', date:'2026-06-25', items:'Tomatoes ×2, Pepper ×1, Spinach ×3', total:18_500, status:'delivered'  },
    { id:'ORD-2026-0128', date:'2026-06-18', items:'Carrots ×4, Cucumber ×2',             total:12_200, status:'delivered'  },
    { id:'ORD-2026-0115', date:'2026-06-11', items:'Yam ×1, Plantain ×2, Pepper ×1',     total:22_000, status:'delivered'  },
    { id:'ORD-2026-0099', date:'2026-06-04', items:'Fresh fish ×3, Tomatoes ×2',          total:35_000, status:'delivered'  },
    { id:'ORD-2026-0082', date:'2026-05-28', items:'Mixed produce box (weekly)',           total:48_000, status:'delivered'  },
  ],
  'CUS-004':[
    { id:'ORD-2026-0142', date:'2026-06-27', items:'Corporate bundle — 10kg vegetables',  total:85_000, status:'processing' },
    { id:'ORD-2026-0130', date:'2026-06-20', items:'Mixed produce box ×3',                total:62_000, status:'delivered'  },
    { id:'ORD-2026-0118', date:'2026-06-13', items:'Fresh herbs, Spinach ×5, Peas ×4',   total:44_000, status:'delivered'  },
  ],
  'CUS-007':[
    { id:'ORD-2026-0139', date:'2026-06-26', items:'Bulk order — 20kg assorted veg',      total:120_000,status:'out_for_delivery' },
    { id:'ORD-2026-0124', date:'2026-06-19', items:'Tomatoes ×6, Pepper ×4, Yam ×2',     total:68_000, status:'delivered'  },
    { id:'ORD-2026-0110', date:'2026-06-12', items:'Weekly box + extra spinach',           total:54_000, status:'delivered'  },
  ],
  'CUS-012':[
    { id:'ORD-2026-0143', date:'2026-06-27', items:'Platinum weekly box — 15kg',          total:95_000, status:'delivered'  },
    { id:'ORD-2026-0131', date:'2026-06-20', items:'Platinum weekly box — 15kg',          total:95_000, status:'delivered'  },
    { id:'ORD-2026-0119', date:'2026-06-13', items:'Platinum weekly box — 15kg',          total:95_000, status:'delivered'  },
  ],
}

const POINTS_HISTORY = {
  'CUS-001':[
    { type:'earn',   desc:'Order ORD-2026-0141 — 1pt per ₦10', pts:+185,  date:'2026-06-25' },
    { type:'earn',   desc:'Order ORD-2026-0128',                pts:+122,  date:'2026-06-18' },
    { type:'earn',   desc:'Order ORD-2026-0115',                pts:+220,  date:'2026-06-11' },
    { type:'redeem', desc:'Redeemed for ₦1,000 discount',       pts:-200,  date:'2026-06-05' },
    { type:'earn',   desc:'Order ORD-2026-0099',                pts:+350,  date:'2026-06-04' },
  ],
  'CUS-004':[
    { type:'earn',   desc:'Order ORD-2026-0142',                pts:+850,  date:'2026-06-27' },
    { type:'bonus',  desc:'Platinum milestone — 2 year reward', pts:+1000, date:'2026-06-01' },
    { type:'earn',   desc:'Order ORD-2026-0130',                pts:+620,  date:'2026-06-20' },
    { type:'redeem', desc:'Redeemed for free delivery ×3',      pts:-500,  date:'2026-06-10' },
  ],
  'CUS-012':[
    { type:'earn',   desc:'Order ORD-2026-0143',                pts:+950,  date:'2026-06-27' },
    { type:'bonus',  desc:'Platinum weekly bonus',              pts:+500,  date:'2026-06-27' },
    { type:'earn',   desc:'Order ORD-2026-0131',                pts:+950,  date:'2026-06-20' },
    { type:'redeem', desc:'Redeemed for ₦5,000 off next order', pts:-1000, date:'2026-06-15' },
  ],
}

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill',  next:null,      nextPts:null  },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',       next:'Platinum',nextPts:10000 },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',         next:'Gold',    nextPts:5000  },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',     next:'Silver',  nextPts:1000  },
}
const ORDER_STATUS_CFG = {
  delivered:        { label:'Delivered',        bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  processing:       { label:'Processing',       bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
  out_for_delivery: { label:'Out for Delivery', bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  cancelled:        { label:'Cancelled',        bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316']
const DEMO_ID = 'CUS-001'

export default function CustomerDetail() {
  const { id } = useParams()
  const customer = CUSTOMERS[id] || CUSTOMERS[DEMO_ID]
  const orders   = ORDER_HISTORY[customer.id]  || ORDER_HISTORY[DEMO_ID]
  const pts      = POINTS_HISTORY[customer.id] || POINTS_HISTORY[DEMO_ID]

  const [activeTab, setActiveTab] = useState('orders')

  const tc = TIER_CFG[customer.tier]
  const ptsToNext  = tc.next ? tc.nextPts - customer.points : 0
  const pctToNext  = tc.next ? Math.min(100,(customer.points/tc.nextPts)*100) : 100

  const TABS = [
    { id:'orders', label:'Order History',  icon:'ri-shopping-bag-line',  count:orders.length },
    { id:'points', label:'Loyalty Points', icon:'ri-medal-line',          count:null          },
    { id:'notes',  label:'Notes & Info',   icon:'ri-sticky-note-line',    count:null          },
  ]

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">{customer.name}</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>Customer Profile · {customer.id}</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item text-muted">
            <Link to="/customers" style={{color:'inherit',textDecoration:'none'}}>Customers</Link>
          </li>
          <li className="breadcrumb-item active">{customer.name}</li>
        </ul>
      </div>

      <div className="row g-4">
        {/* ── Left sidebar ── */}
        <div className="col-lg-4 col-xl-3">

          {/* Profile card */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-4 text-center">
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white mx-auto mb-3"
                style={{width:68,height:68,background:customer.avatarColor||AVATAR_COLORS[0],fontSize:22}}>
                {ini(customer.name)}
              </div>
              <div className="fw-bold mb-1" style={{fontSize:17}}>{customer.name}</div>
              <div className="text-muted mb-3" style={{fontSize:12}}>
                <i className="ri-smartphone-line me-1"/>{customer.device} · {customer.id}
              </div>
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <span className="badge d-flex align-items-center gap-1"
                  style={{fontSize:11,background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`}}>
                  <i className={tc.icon}/>{customer.tier} Member
                </span>
                <span className="badge"
                  style={{fontSize:11,background:customer.status==='active'?'#f0fdf4':'#fef2f2',color:customer.status==='active'?'#16a34a':'#dc2626',border:`1px solid ${customer.status==='active'?'#bbf7d0':'#fecaca'}`}}>
                  {customer.status==='active'?'Active':'Inactive'}
                </span>
              </div>

              {/* Points progress bar */}
              <div className="p-3 rounded mb-3" style={{background:'#f8fafc'}}>
                <div className="d-flex justify-content-between mb-1">
                  <span style={{fontSize:11,color:'#64748b'}}>{customer.tier}</span>
                  {tc.next
                    ? <span style={{fontSize:11,color:tc.color}}>{tc.next}</span>
                    : <span style={{fontSize:11,color:'#7c3aed'}}>Max Tier ✓</span>
                  }
                </div>
                <div style={{background:'#e2e8f0',borderRadius:4,height:6,overflow:'hidden'}}>
                  <div style={{width:`${pctToNext}%`,height:'100%',background:tc.color,borderRadius:4,transition:'width 0.5s'}}/>
                </div>
                <div className="text-muted mt-1" style={{fontSize:11}}>
                  {fmtPts(customer.points)}
                  {tc.next && ` · ${fmtPts(ptsToNext)} to ${tc.next}`}
                </div>
              </div>

              <a href={`tel:${customer.phone}`} className="btn btn-sm btn-outline-primary w-100 mb-2">
                <i className="ri-phone-line me-1"/>Call Customer
              </a>
              <a href={`mailto:${customer.email}`} className="btn btn-sm btn-outline-secondary w-100">
                <i className="ri-mail-line me-1"/>Send Email
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-3">
              <div className="row g-2">
                {[
                  { label:'Total Orders',  val:customer.orders,          color:'#3b82f6' },
                  { label:'Total Spent',   val:fmt(customer.totalSpent),  color:'#22c55e' },
                  { label:'Loyalty Pts',   val:fmtPts(customer.points),  color:'#8b5cf6' },
                  { label:'Last Order',    val:customer.lastOrder,        color:'#f59e0b' },
                ].map(s=>(
                  <div key={s.label} className="col-6">
                    <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px'}}>
                      <div className="text-muted" style={{fontSize:10}}>{s.label}</div>
                      <div className="fw-bold" style={{fontSize:13,color:s.color}}>{s.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <span className="fw-medium" style={{fontSize:13}}>Contact & Delivery</span>
            </div>
            <div className="card-body p-3">
              {[
                { icon:'ri-phone-line',    label:'Phone',   val:customer.phone,   href:`tel:${customer.phone}`       },
                { icon:'ri-mail-line',     label:'Email',   val:customer.email,   href:`mailto:${customer.email}`    },
                { icon:'ri-map-pin-line',  label:'Zone',    val:customer.zone,    href:null                          },
                { icon:'ri-home-3-line',   label:'Address', val:customer.address, href:null                          },
                { icon:'ri-calendar-line', label:'Joined',  val:customer.joined,  href:null                          },
                { icon:'ri-share-line',    label:'Referred',val:customer.referral||'Organic', href:null              },
              ].map(r=>(
                <div key={r.label} className="d-flex gap-3 py-2 border-bottom">
                  <i className={r.icon} style={{color:'#94a3b8',fontSize:14,marginTop:2,flexShrink:0}}/>
                  <div>
                    <div className="text-muted" style={{fontSize:10}}>{r.label}</div>
                    {r.href
                      ? <a href={r.href} style={{fontSize:12,color:'#3b82f6'}}>{r.val}</a>
                      : <div style={{fontSize:12}}>{r.val}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="col-lg-8 col-xl-9">
          <div className="card border-0 shadow-sm">
            {/* Tabs */}
            <div className="card-header bg-white border-bottom">
              <ul className="nav nav-tabs card-header-tabs" style={{borderBottom:'none'}}>
                {TABS.map(t=>(
                  <li key={t.id} className="nav-item">
                    <button
                      onClick={()=>setActiveTab(t.id)}
                      className={`nav-link d-flex align-items-center gap-2 ${activeTab===t.id?'active':''}`}
                      style={{fontSize:13,cursor:'pointer',border:'none',background:'none',
                        color:activeTab===t.id?'#3b82f6':'#64748b',borderBottom:activeTab===t.id?'2px solid #3b82f6':'2px solid transparent',paddingBottom:12}}>
                      <i className={t.icon}/>
                      {t.label}
                      {t.count!==null && (
                        <span className="badge"
                          style={{fontSize:10,background:activeTab===t.id?'#eff6ff':'#f1f5f9',color:activeTab===t.id?'#2563eb':'#64748b'}}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── ORDER HISTORY ── */}
            {activeTab==='orders' && (
              <div>
                {orders.length===0 && (
                  <div className="text-center text-muted py-5">No orders yet.</div>
                )}
                {orders.map((o,i)=>{
                  const sc = ORDER_STATUS_CFG[o.status]||ORDER_STATUS_CFG.delivered
                  return (
                    <div key={o.id} className={`d-flex align-items-start gap-3 p-4 ${i<orders.length-1?'border-bottom':''}`}>
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{width:40,height:40,background:'#f0fdf4'}}>
                        <i className="ri-shopping-bag-line" style={{color:'#22c55e',fontSize:16}}/>
                      </div>
                      <div className="flex-fill">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <span className="fw-semibold" style={{fontSize:14}}>{o.id}</span>
                          <span className="badge" style={{fontSize:11,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="text-muted" style={{fontSize:12,margin:'4px 0'}}>{o.items}</div>
                        <div className="d-flex align-items-center gap-3">
                          <span className="text-muted" style={{fontSize:11}}>{o.date}</span>
                          <span className="fw-bold text-success" style={{fontSize:13}}>{fmt(o.total)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── LOYALTY POINTS ── */}
            {activeTab==='points' && (
              <div>
                {/* Points summary */}
                <div className="p-4 border-bottom" style={{background:'#f8fafc'}}>
                  <div className="row g-3">
                    {[
                      { label:'Current Balance', val:fmtPts(customer.points), color:'#8b5cf6', big:true },
                      { label:'Tier',            val:customer.tier,           color:tc.color           },
                      { label:'Points to Next',  val:tc.next?fmtPts(ptsToNext):'Max tier ✓', color:tc.next?'#f59e0b':'#22c55e' },
                      { label:'Redemption Rate', val:'100 pts = ₦400',       color:'#64748b'          },
                    ].map(s=>(
                      <div key={s.label} className="col-6 col-md-3">
                        <div style={{background:'#fff',borderRadius:8,padding:'12px',border:'1px solid #e2e8f0'}}>
                          <div className="text-muted" style={{fontSize:10}}>{s.label}</div>
                          <div className="fw-bold" style={{fontSize:s.big?18:14,color:s.color}}>{s.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* History */}
                <div className="px-4 py-3 border-bottom">
                  <div className="fw-medium" style={{fontSize:13}}>Points History</div>
                </div>
                {pts.map((p,i)=>(
                  <div key={i} className={`d-flex align-items-center gap-3 px-4 py-3 ${i<pts.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:p.type==='earn'?'#f0fdf4':p.type==='bonus'?'#f5f3ff':'#fef2f2'}}>
                      <i className={p.type==='earn'?'ri-add-line':p.type==='bonus'?'ri-gift-line':'ri-subtract-line'}
                        style={{fontSize:14,color:p.type==='earn'?'#22c55e':p.type==='bonus'?'#8b5cf6':'#ef4444'}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:13}}>{p.desc}</div>
                      <div className="text-muted" style={{fontSize:11}}>{p.date}</div>
                    </div>
                    <div className="fw-bold" style={{fontSize:14,color:p.pts>0?'#22c55e':'#ef4444'}}>
                      {p.pts>0?'+':''}{p.pts.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── NOTES & INFO ── */}
            {activeTab==='notes' && (
              <div className="p-4">
                <div className="p-3 rounded mb-4" style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
                  <div className="fw-medium mb-1" style={{fontSize:13,color:'#92400e'}}>
                    <i className="ri-sticky-note-line me-1"/>Internal Notes
                  </div>
                  <div style={{fontSize:13,color:'#78350f',lineHeight:1.6}}>{customer.notes}</div>
                </div>
                <div className="row g-3">
                  {[
                    { icon:'ri-smartphone-line',   label:'Registered via',   val:customer.device,    color:'#3b82f6' },
                    { icon:'ri-share-line',         label:'Referral source',  val:customer.referral||'Organic', color:'#22c55e' },
                    { icon:'ri-calendar-check-line',label:'Member since',     val:customer.joined,    color:'#8b5cf6' },
                    { icon:'ri-shopping-bag-line',  label:'Last order',       val:customer.lastOrder, color:'#f59e0b' },
                    { icon:'ri-map-pin-2-line',     label:'Delivery zone',    val:customer.zone,      color:'#0ea5e9' },
                    { icon:'ri-shield-check-line',  label:'Account status',   val:customer.status==='active'?'Active ✓':'Inactive', color:customer.status==='active'?'#22c55e':'#ef4444' },
                  ].map(r=>(
                    <div key={r.label} className="col-md-6">
                      <div className="d-flex align-items-center gap-3 p-3 rounded" style={{background:'#f8fafc'}}>
                        <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{width:36,height:36,background:'#fff'}}>
                          <i className={r.icon} style={{color:r.color,fontSize:16}}/>
                        </div>
                        <div>
                          <div className="text-muted" style={{fontSize:11}}>{r.label}</div>
                          <div style={{fontSize:13,fontWeight:600,color:r.color}}>{r.val}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
