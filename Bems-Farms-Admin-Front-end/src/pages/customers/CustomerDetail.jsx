import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt    = n => `₦${Number(n || 0).toLocaleString()}`
const ini    = name => (name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n || 0).toLocaleString()+' pts'
const fmtDate = d => d ? new Date(d).toISOString().slice(0,10) : '—'

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill',  next:null,      nextPts:null  },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',       next:'Platinum',nextPts:10000 },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',         next:'Gold',    nextPts:5000  },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',     next:'Silver',  nextPts:1000  },
}
const ORDER_STATUS_CFG = {
  delivered:        { label:'Delivered',        bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  processing:       { label:'Processing',       bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
  confirmed:        { label:'Confirmed',        bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
  pending:          { label:'Pending',          bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  out_for_delivery: { label:'Out for Delivery', bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  cancelled:        { label:'Cancelled',        bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316']

export default function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/admin/customers/${id}`)
      .then(res => { if (!cancelled) setCustomer(res.data) })
      .catch(() => { if (!cancelled) toast.error('Failed to load customer') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="container-fluid py-5 text-center text-muted">Loading customer…</div>
  }
  if (!customer) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Customer not found. <Link to="/customers">Back to customers</Link>
      </div>
    )
  }

  const orders = customer.orders || []
  const loyaltyHistory = customer.loyalty || []
  const avatarColor = AVATAR_COLORS[(customer.id || 0) % AVATAR_COLORS.length]
  const tc = TIER_CFG[customer.tier] || TIER_CFG.Bronze
  const points = Number(customer.points || 0)
  const ptsToNext  = tc.next ? tc.nextPts - points : 0
  const pctToNext  = tc.next ? Math.min(100,(points/tc.nextPts)*100) : 100

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
          <p className="text-muted mb-0" style={{fontSize:12}}>Customer Profile · {customer.customer_code}</p>
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
                style={{width:68,height:68,background:avatarColor,fontSize:22}}>
                {ini(customer.name)}
              </div>
              <div className="fw-bold mb-1" style={{fontSize:17}}>{customer.name}</div>
              <div className="text-muted mb-3" style={{fontSize:12}}>
                <i className="ri-hashtag me-1"/>{customer.customer_code}
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
                  {fmtPts(points)}
                  {tc.next && ` · ${fmtPts(ptsToNext)} to ${tc.next}`}
                </div>
              </div>

              <a href={`tel:${customer.phone}`} className="btn btn-sm btn-outline-primary w-100 mb-2">
                <i className="ri-phone-line me-1"/>Call Customer
              </a>
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="btn btn-sm btn-outline-secondary w-100">
                  <i className="ri-mail-line me-1"/>Send Email
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-3">
              <div className="row g-2">
                {[
                  { label:'Total Orders',  val:customer.total_orders || 0,       color:'#3b82f6' },
                  { label:'Total Spent',   val:fmt(customer.total_spent),        color:'#22c55e' },
                  { label:'Loyalty Pts',   val:fmtPts(points),                   color:'#8b5cf6' },
                  { label:'Wallet Balance',val:fmt(customer.wallet_balance),     color:'#f59e0b' },
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
                { icon:'ri-mail-line',     label:'Email',   val:customer.email || '—',   href:customer.email ? `mailto:${customer.email}` : null },
                { icon:'ri-map-pin-line',  label:'Address', val:customer.address || '—', href:null },
                { icon:'ri-calendar-line', label:'Joined',  val:fmtDate(customer.joined_at),  href:null },
                { icon:'ri-shopping-bag-line', label:'Last Order', val:fmtDate(customer.last_order_at), href:null },
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
                    <Link to={`/orders/${o.id}`} key={o.id} className={`d-flex align-items-start gap-3 p-4 text-decoration-none text-dark ${i<orders.length-1?'border-bottom':''}`}>
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
                        <div className="text-muted" style={{fontSize:12,margin:'4px 0'}}>{o.items_summary || 'No item details'}</div>
                        <div className="d-flex align-items-center gap-3">
                          <span className="text-muted" style={{fontSize:11}}>{fmtDate(o.created_at)}</span>
                          <span className="fw-bold text-success" style={{fontSize:13}}>{fmt(o.total)}</span>
                        </div>
                      </div>
                    </Link>
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
                      { label:'Current Balance', val:fmtPts(points), color:'#8b5cf6', big:true },
                      { label:'Tier',            val:customer.tier,           color:tc.color           },
                      { label:'Points to Next',  val:tc.next?fmtPts(ptsToNext):'Max tier ✓', color:tc.next?'#f59e0b':'#22c55e' },
                      { label:'Lifetime Points', val:fmtPts(customer.lifetime_points), color:'#64748b' },
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
                {loyaltyHistory.length===0 && (
                  <div className="text-center text-muted py-5">No loyalty activity yet.</div>
                )}
                {loyaltyHistory.map((p,i)=>(
                  <div key={i} className={`d-flex align-items-center gap-3 px-4 py-3 ${i<loyaltyHistory.length-1?'border-bottom':''}`}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:36,height:36,background:p.type==='earned'?'#f0fdf4':p.type==='bonus'||p.type==='referral'?'#f5f3ff':'#fef2f2'}}>
                      <i className={p.type==='earned'?'ri-add-line':p.type==='bonus'||p.type==='referral'?'ri-gift-line':'ri-subtract-line'}
                        style={{fontSize:14,color:p.type==='earned'?'#22c55e':p.type==='bonus'||p.type==='referral'?'#8b5cf6':'#ef4444'}}/>
                    </div>
                    <div className="flex-fill">
                      <div style={{fontSize:13}}>{p.description}</div>
                      <div className="text-muted" style={{fontSize:11}}>{fmtDate(p.created_at)}</div>
                    </div>
                    <div className="fw-bold" style={{fontSize:14,color:p.points>0?'#22c55e':'#ef4444'}}>
                      {p.points>0?'+':''}{Number(p.points).toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── NOTES & INFO ── */}
            {activeTab==='notes' && (
              <div className="p-4">
                {customer.notes && (
                  <div className="p-3 rounded mb-4" style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
                    <div className="fw-medium mb-1" style={{fontSize:13,color:'#92400e'}}>
                      <i className="ri-sticky-note-line me-1"/>Internal Notes
                    </div>
                    <div style={{fontSize:13,color:'#78350f',lineHeight:1.6}}>{customer.notes}</div>
                  </div>
                )}
                <div className="row g-3">
                  {[
                    { icon:'ri-calendar-check-line',label:'Member since',     val:fmtDate(customer.joined_at), color:'#8b5cf6' },
                    { icon:'ri-shopping-bag-line',  label:'Last order',       val:fmtDate(customer.last_order_at), color:'#f59e0b' },
                    { icon:'ri-map-pin-2-line',     label:'Address',          val:customer.address || '—',      color:'#0ea5e9' },
                    { icon:'ri-shield-check-line',  label:'Account status',   val:customer.status==='active'?'Active ✓':'Inactive', color:customer.status==='active'?'#22c55e':'#ef4444' },
                    { icon:'ri-wallet-3-line',      label:'Wallet balance',   val:fmt(customer.wallet_balance), color:'#f59e0b' },
                    { icon:'ri-medal-line',         label:'Lifetime points',  val:fmtPts(customer.lifetime_points), color:'#8b5cf6' },
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
