import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'

const fmt    = n => `₦${Number(n||0).toLocaleString('en-NG')}`
const ini    = n => (n||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n => Number(n||0).toLocaleString()+' pts'

const TIER_CFG = {
  Platinum: { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill',  next:null,      nextPts:null  },
  Gold:     { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill',       next:'Platinum',nextPts:10000 },
  Silver:   { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill',         next:'Gold',    nextPts:5000  },
  Bronze:   { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill',     next:'Silver',  nextPts:1000  },
}
const ORDER_STATUS = {
  delivered:        { label:'Delivered',       bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  processing:       { label:'Processing',      bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
  out_for_delivery: { label:'Out for Delivery',bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  cancelled:        { label:'Cancelled',       bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
  pending:          { label:'Pending',         bg:'#fafafa', color:'#6b7280', border:'#e5e7eb' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316']

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }

function Spinner() {
  return <span style={{ width:28, height:28, border:'3px solid #d1fae5', borderTopColor:'#1B4332', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
}

export default function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState('orders')

  useEffect(() => {
    api.get(`/admin/customers/${id}`)
      .then(r => setCustomer(r.data))
      .catch(err => setError(err.response?.data?.message || 'Customer not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300, fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner />
    </div>
  )

  if (error) return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', color:'#dc2626', fontSize:13, marginBottom:16 }}>{error}</div>
      <Link to="/customers" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', textDecoration:'none', fontSize:13, fontWeight:600 }}>← Back</Link>
    </div>
  )

  const c = customer
  const tc = TIER_CFG[c.tier] || TIER_CFG.Bronze
  const ptsToNext = tc.next ? tc.nextPts - c.points : 0
  const pctToNext = tc.next ? Math.min(100, (c.points / tc.nextPts) * 100) : 100

  const TABS = [
    { id:'orders', label:'Order History',  icon:'ri-shopping-bag-line', count:(c.orders||[]).length },
    { id:'points', label:'Loyalty Points', icon:'ri-medal-line',        count:null },
    { id:'notes',  label:'Notes & Info',   icon:'ri-sticky-note-line',  count:null },
  ]

  const pill = (text, bg, color, border, icon) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:50, background:bg, color, border:`1px solid ${border}` }}>
      {icon && <i className={icon} />}{text}
    </span>
  )

  const custColor = AVATAR_COLORS[(c.id||0) % AVATAR_COLORS.length] || '#3b82f6'

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Breadcrumb header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#1B4332', fontFamily:'Syne, sans-serif' }}>{c.name}</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>Customer Profile · {c.customer_code}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b' }}>
          <Link to="/customers" style={{ color:'#64748b', textDecoration:'none' }}>Customers</Link>
          <i className="ri-arrow-right-s-line" />
          <span style={{ color:'#1B4332', fontWeight:600 }}>{c.name}</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>
        {/* Left sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Profile card */}
          <div style={{ ...card, padding:'24px 20px', textAlign:'center' }}>
            <div style={{ width:68, height:68, borderRadius:'50%', background:custColor, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:22, margin:'0 auto 12px' }}>{ini(c.name)}</div>
            <div style={{ fontWeight:800, fontSize:17, fontFamily:'Syne, sans-serif', marginBottom:4 }}>{c.name}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12 }}>{c.customer_code}</div>
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {pill(`${c.tier} Member`, tc.bg, tc.color, tc.border, tc.icon)}
              {pill(c.status==='active'?'Active':'Inactive', c.status==='active'?'#f0fdf4':'#fef2f2', c.status==='active'?'#16a34a':'#dc2626', c.status==='active'?'#bbf7d0':'#fecaca')}
            </div>

            {/* Points progress */}
            <div style={{ background:'#f8fafc', borderRadius:10, padding:14, marginBottom:16, textAlign:'left' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, color:'#64748b' }}>{c.tier}</span>
                {tc.next ? <span style={{ fontSize:11, color:tc.color }}>{tc.next}</span> : <span style={{ fontSize:11, color:'#7c3aed' }}>Max Tier ✓</span>}
              </div>
              <div style={{ background:'#e2e8f0', borderRadius:4, height:6, overflow:'hidden' }}>
                <div style={{ width:`${pctToNext}%`, height:'100%', background:tc.color, borderRadius:4, transition:'width 0.5s' }} />
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
                {fmtPts(c.points)}{tc.next && ` · ${fmtPts(ptsToNext)} to ${tc.next}`}
              </div>
            </div>

            {c.phone && (
              <a href={`tel:${c.phone}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:8, border:'1.5px solid #bfdbfe', color:'#2563eb', textDecoration:'none', fontSize:12, fontWeight:600, marginBottom:8 }}>
                <i className="ri-phone-line" />Call Customer
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:8, border:'1.5px solid #e5e7eb', color:'#374151', textDecoration:'none', fontSize:12, fontWeight:600 }}>
                <i className="ri-mail-line" />Send Email
              </a>
            )}
          </div>

          {/* Stats */}
          <div style={{ ...card, padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Total Orders', val:c.total_orders||0, color:'#3b82f6' },
                { label:'Total Spent',  val:fmt(c.total_spent), color:'#22c55e' },
                { label:'Loyalty Pts',  val:fmtPts(c.points),   color:'#8b5cf6' },
                { label:'Wallet',       val:fmt(c.wallet_balance), color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{s.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div style={card}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:13, fontWeight:700, color:'#374151' }}>Contact & Delivery</div>
            <div style={{ padding:'4px 0' }}>
              {[
                { icon:'ri-phone-line',    label:'Phone',  val:c.phone,  href:`tel:${c.phone}` },
                { icon:'ri-mail-line',     label:'Email',  val:c.email,  href:`mailto:${c.email}` },
                { icon:'ri-map-pin-line',  label:'Zone',   val:c.area,   href:null },
                { icon:'ri-calendar-line', label:'Joined', val:c.joined_at ? new Date(c.joined_at).toLocaleDateString('en-NG') : '—', href:null },
              ].filter(r => r.val).map(r => (
                <div key={r.label} style={{ display:'flex', gap:12, padding:'10px 16px', borderBottom:'1px solid #f9fafb' }}>
                  <i className={r.icon} style={{ color:'#94a3b8', fontSize:14, marginTop:2, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{r.label}</div>
                    {r.href
                      ? <a href={r.href} style={{ fontSize:12, color:'#3b82f6', textDecoration:'none' }}>{r.val}</a>
                      : <div style={{ fontSize:12, color:'#374151' }}>{r.val}</div>
                    }
                  </div>
                </div>
              ))}
              {(c.addresses||[]).map((addr,i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 16px', borderBottom:'1px solid #f9fafb' }}>
                  <i className="ri-home-3-line" style={{ color:'#94a3b8', fontSize:14, marginTop:2, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{addr.label||'Address'}{addr.is_default?' (Default)':''}</div>
                    <div style={{ fontSize:12, color:'#374151' }}>{addr.full_address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right content */}
        <div style={card}>
          {/* Tabs */}
          <div style={{ padding:'0 16px', borderBottom:'1px solid #e5e7eb', display:'flex', gap:4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'14px 14px 12px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight: activeTab===t.id ? 700 : 500, color: activeTab===t.id ? '#1B4332' : '#64748b', borderBottom: `2px solid ${activeTab===t.id ? '#1B4332' : 'transparent'}`, marginBottom:-1 }}>
                <i className={t.icon} />
                {t.label}
                {t.count!==null && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:50, background: activeTab===t.id?'#d1fae5':'#f1f5f9', color: activeTab===t.id?'#065f46':'#64748b', fontWeight:700 }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Order History */}
          {activeTab==='orders' && (
            <div>
              {(c.orders||[]).length===0 && <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8', fontSize:13 }}>No orders yet.</div>}
              {(c.orders||[]).map((o,i) => {
                const sc = ORDER_STATUS[o.status] || ORDER_STATUS.pending
                return (
                  <div key={o.id} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 20px', borderBottom: i<(c.orders.length-1)?'1px solid #f3f4f6':'none' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className="ri-shopping-bag-line" style={{ color:'#22c55e', fontSize:16 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:4 }}>
                        <Link to={`/orders/${o.id}`} style={{ fontWeight:700, fontSize:14, color:'#1B4332', textDecoration:'none' }}>{o.id}</Link>
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:50, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{sc.label}</span>
                      </div>
                      {o.items_summary && <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>{o.items_summary}</div>}
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:11, color:'#94a3b8' }}>{new Date(o.created_at).toLocaleDateString('en-NG')}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>{fmt(o.total)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Loyalty Points */}
          {activeTab==='points' && (
            <div>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6', background:'#f8fafc' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                  {[
                    { label:'Current Balance', val:fmtPts(c.points), color:'#8b5cf6', big:true },
                    { label:'Tier',            val:c.tier,            color:tc.color           },
                    { label:'Points to Next',  val:tc.next?fmtPts(ptsToNext):'Max tier ✓', color:tc.next?'#f59e0b':'#22c55e' },
                    { label:'Rate',            val:'100 pts = ₦400',  color:'#64748b'          },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#fff', borderRadius:8, padding:12, border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:s.big?18:14, fontWeight:700, color:s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:'12px 20px', borderBottom:'1px solid #f3f4f6', fontSize:13, fontWeight:700, color:'#374151' }}>Points History</div>
              {(c.loyalty||[]).length===0
                ? <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:13 }}>No loyalty transactions yet</div>
                : (c.loyalty||[]).map((p,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom: i<(c.loyalty.length-1)?'1px solid #f9fafb':'none' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background: p.type==='earned'?'#f0fdf4':p.type==='bonus'?'#f5f3ff':'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={p.type==='earned'?'ri-add-line':p.type==='bonus'?'ri-gift-line':'ri-subtract-line'} style={{ fontSize:14, color:p.type==='earned'?'#22c55e':p.type==='bonus'?'#8b5cf6':'#ef4444' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13 }}>{p.description}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{new Date(p.created_at).toLocaleDateString('en-NG')}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color: p.points>0?'#22c55e':'#ef4444', flexShrink:0 }}>
                      {p.points>0?'+':''}{Number(p.points).toLocaleString()} pts
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Notes & Info */}
          {activeTab==='notes' && (
            <div style={{ padding:20 }}>
              {c.notes && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#92400e', marginBottom:6 }}><i className="ri-sticky-note-line" style={{ marginRight:6 }} />Internal Notes</div>
                  <div style={{ fontSize:13, color:'#78350f', lineHeight:1.6 }}>{c.notes}</div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  { icon:'ri-map-pin-2-line',    label:'Delivery zone',   val:c.area,       color:'#0ea5e9' },
                  { icon:'ri-calendar-check-line',label:'Member since',    val:c.joined_at ? new Date(c.joined_at).toLocaleDateString('en-NG') : '—', color:'#8b5cf6' },
                  { icon:'ri-shopping-bag-line',  label:'Last order',      val:c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-NG') : '—', color:'#f59e0b' },
                  { icon:'ri-shield-check-line',  label:'Account status',  val:c.status==='active'?'Active ✓':'Inactive', color:c.status==='active'?'#22c55e':'#ef4444' },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:10, background:'#f8fafc' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={r.icon} style={{ color:r.color, fontSize:16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2 }}>{r.label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:r.color }}>{r.val||'—'}</div>
                    </div>
                  </div>
                ))}
              </div>
              {(c.activity||[]).length > 0 && (
                <div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'#374151' }}>Recent Activity</div>
                  {c.activity.map((a,i) => (
                    <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i<(c.activity.length-1)?'1px solid #f9fafb':'none' }}>
                      <i className="ri-history-line" style={{ color:'#94a3b8', fontSize:14, marginTop:2 }} />
                      <div>
                        <div style={{ fontSize:12 }}>{a.description}</div>
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{new Date(a.created_at).toLocaleString('en-NG')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
