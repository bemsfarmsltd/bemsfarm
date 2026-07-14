import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import toast from 'react-hot-toast'

const fmt    = n  => `₦${Number(n || 0).toLocaleString('en-NG')}`
const ini    = n  => (n||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmtPts = n  => Number(n||0).toLocaleString()+' pts'

const TIER_CFG = {
  Platinum: { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill'  },
  Gold:     { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill'       },
  Silver:   { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill'         },
  Bronze:   { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill'     },
}
const STATUS_CFG = {
  active:   { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', label:'Active'   },
  inactive: { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'Inactive' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16']

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width:36, height:20, borderRadius:50, cursor:'pointer', flexShrink:0, position:'relative', transition:'background 0.2s', background: checked ? '#1B4332' : '#d1d5db' }}>
      <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:2, left: checked ? 18 : 2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
    </div>
  )
}

const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const TH   = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>{children}</th>
const TD   = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

export default function CustomersList() {
  const [customers, setCustomers] = useState([])
  const [stats, setStats]         = useState({})
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterTier, setTier]     = useState('all')
  const [filterSt, setSt]         = useState('all')
  const [selected, setSelected]   = useState(null)
  const [deleteModal, setDeleteModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/customers', { params:{ page, limit:20, search, tier:filterTier==='all'?'':filterTier, status:filterSt==='all'?'':filterSt } })
      setCustomers(res.data.customers)
      setTotal(res.data.total)
      setStats(res.data.stats || {})
    } catch { toast.error('Failed to load customers') }
    finally { setLoading(false) }
  }, [page, search, filterTier, filterSt])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setTimeout(() => { setPage(1); load() }, 400); return () => clearTimeout(t) }, [search])

  const toggleStatus = async c => {
    try {
      const newStatus = c.status === 'active' ? 'inactive' : 'active'
      await api.patch(`/admin/customers/${c.id}/status`, { status:newStatus })
      setCustomers(prev => prev.map(x => x.id===c.id ? {...x, status:newStatus} : x))
    } catch { toast.error('Failed to update status') }
  }

  const deleteCustomer = async () => {
    try {
      await api.delete(`/admin/customers/${selected.id}`)
      toast.success('Customer removed')
      setDeleteModal(false); setSelected(null); load()
    } catch { toast.error('Failed to remove customer') }
  }

  const tierCounts = ['Platinum','Gold','Silver','Bronze'].reduce((acc,t) => ({ ...acc, [t]:customers.filter(c=>c.tier===t).length }), {})
  const pages = Math.ceil(total / 20)

  const KPIS = [
    { label:'Total Customers',  val:stats.total||0,           icon:'ri-group-line',             color:'#3b82f6', bg:'#eff6ff' },
    { label:'Active',           val:stats.active||0,          icon:'ri-user-follow-line',        color:'#22c55e', bg:'#f0fdf4' },
    { label:'New This Month',   val:stats.new_this_month||0,  icon:'ri-user-add-line',           color:'#0ea5e9', bg:'#f0f9ff' },
    { label:'Platinum Members', val:stats.platinum||0,        icon:'ri-vip-crown-2-line',        color:'#8b5cf6', bg:'#f5f3ff' },
    { label:'Total Revenue',    val:fmt(stats.total_revenue), icon:'ri-money-naira-circle-line', color:'#22c55e', bg:'#f0fdf4' },
    { label:'Avg Spent',        val:fmt(stats.avg_spent),     icon:'ri-shopping-cart-2-line',    color:'#f59e0b', bg:'#fffbeb' },
  ]

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader
        title="Online Customers"
        subtitle="Self-registered customers ordering via the Bems Farms app & website"
        actions={
          <Link to="/customers/add" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, background:'#1B4332', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>
            <i className="ri-user-add-line" />Add Customer
          </Link>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:20 }}>
        {KPIS.map(k => (
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

      {/* Tier + Status filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {['all','Platinum','Gold','Silver','Bronze'].map(t => {
          const cfg = t!=='all' ? TIER_CFG[t] : null
          const count = t==='all' ? total : tierCounts[t]||0
          const isActive = filterTier===t
          return (
            <button key={t} onClick={() => { setTier(t); setPage(1) }} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Nunito, sans-serif', background: isActive ? (cfg?cfg.color:'#1B4332') : '#f8fafc', color: isActive ? '#fff' : '#64748b' }}>
              {cfg && <i className={cfg.icon} />}
              {t==='all' ? 'All Tiers' : t} ({count})
            </button>
          )
        })}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {['active','inactive'].map(s => (
            <button key={s} onClick={() => { setSt(filterSt===s?'all':s); setPage(1) }} style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Nunito, sans-serif', background: filterSt===s ? STATUS_CFG[s].color : '#f8fafc', color: filterSt===s ? '#fff' : '#64748b' }}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, padding:'10px 14px', marginBottom:14 }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <i className="ri-search-line" style={{ position:'absolute', left:10, color:'#9ca3af', fontSize:14 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, phone, email, area or ID…"
            style={{ width:'100%', padding:'8px 36px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', background:'#f9fafb', boxSizing:'border-box' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:0, fontSize:18, display:'flex', alignItems:'center' }}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'#374151' }}>{total} customer{total!==1?'s':''}</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['CUSTOMER','CONTACT','ZONE','TIER','ORDERS','TOTAL SPENT','POINTS','LAST ORDER','STATUS',''].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(6)].map((_,i) => (
                <tr key={i}>{[...Array(10)].map((_,j) => <TD key={j}><div style={{ height:12, background:'#f0f0f0', borderRadius:4 }} /></TD>)}</tr>
              ))}

              {!loading && customers.length===0 && (
                <tr><td colSpan={10} style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af', fontSize:13, borderBottom:'none' }}>
                  <i className="ri-user-search-line" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                  No customers found. <Link to="/customers/add">Add the first one →</Link>
                </td></tr>
              )}

              {!loading && customers.map((c,i) => {
                const tc = TIER_CFG[c.tier] || TIER_CFG.Bronze
                const sc = STATUS_CFG[c.status] || STATUS_CFG.inactive
                return (
                  <tr key={c.id} style={{ background:'#fff' }}>
                    <TD>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>{ini(c.name)}</div>
                        <div>
                          <Link to={`/customers/${c.customer_code||c.id}`} style={{ fontWeight:600, color:'#1e293b', textDecoration:'none', fontSize:13 }}>{c.name}</Link>
                          <div style={{ fontSize:10, color:'#94a3b8' }}>{c.customer_code} · Joined {c.joined_at ? new Date(c.joined_at).toLocaleDateString('en-NG') : '—'}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div style={{ fontSize:12 }}>{c.phone}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{c.email||'—'}</div>
                    </TD>
                    <TD><span style={{ fontSize:12, display:'flex', alignItems:'center', gap:3 }}><i className="ri-map-pin-line" style={{ color:'#94a3b8', fontSize:11 }} />{c.zone||'—'}</span></TD>
                    <TD>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>
                        <i className={tc.icon} />{c.tier}
                      </span>
                    </TD>
                    <TD style={{ fontWeight:600 }}>{c.total_orders||0}</TD>
                    <TD>{fmt(c.total_spent)}</TD>
                    <TD><span style={{ fontSize:12, color:'#8b5cf6', fontWeight:500 }}>{fmtPts(c.points)}</span></TD>
                    <TD style={{ color:'#64748b', fontSize:12 }}>{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-NG') : '—'}</TD>
                    <TD>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Toggle checked={c.status==='active'} onChange={() => toggleStatus(c)} />
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{sc.label}</span>
                      </div>
                    </TD>
                    <TD>
                      <div style={{ display:'flex', gap:5 }}>
                        <Link to={`/customers/${c.customer_code||c.id}`} title="View Profile" style={{ width:30, height:30, borderRadius:'50%', border:'1.5px solid #bfdbfe', background:'#eff6ff', color:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className="ri-eye-line" style={{ fontSize:13 }} />
                        </Link>
                        <button title="Remove" onClick={() => { setSelected(c); setDeleteModal(true) }} style={{ width:30, height:30, borderRadius:'50%', border:'1.5px solid #fecaca', background:'#fef2f2', color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                          <i className="ri-delete-bin-line" style={{ fontSize:13 }} />
                        </button>
                      </div>
                    </TD>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#6b7280' }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
            <div style={{ display:'flex', gap:6 }}>
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid #e5e7eb', background: page===1?'#f9fafb':'#fff', color: page===1?'#9ca3af':'#374151', fontSize:12, cursor: page===1?'default':'pointer', fontFamily:'Nunito, sans-serif' }}>‹ Prev</button>
              <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid #e5e7eb', background: page>=pages?'#f9fafb':'#fff', color: page>=pages?'#9ca3af':'#374151', fontSize:12, cursor: page>=pages?'default':'pointer', fontFamily:'Nunito, sans-serif' }}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => setDeleteModal(false)}>
          <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div style={{ background:'#1B4332', borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>Remove Customer</span>
              <button onClick={() => setDeleteModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
            </div>
            <div style={{ padding:'24px', textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <i className="ri-user-unfollow-line" style={{ color:'#ef4444', fontSize:24 }} />
              </div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Remove {selected.name}?</div>
              <div style={{ color:'#6b7280', fontSize:13, marginBottom:24 }}>Customer data will be anonymised. This cannot be undone.</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setDeleteModal(false)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:600 }}>Cancel</button>
                <button onClick={deleteCustomer} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:700 }}>Yes, Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
