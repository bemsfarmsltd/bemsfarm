import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../lib/api'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#a855f7','#ef4444','#10b981','#d97706','#6366f1']

// Real event types written by server/src/utils/aiContext.js's trackActivity()
const TYPE_CFG = {
  login:                    { label:'Login',              icon:'ri-login-circle-line',    color:'#64748b', bg:'#f8fafc' },
  registered:               { label:'Account Created',    icon:'ri-user-add-line',        color:'#22c55e', bg:'#f0fdf4' },
  order_created:            { label:'Order Placed',       icon:'ri-shopping-bag-line',    color:'#3b82f6', bg:'#eff6ff' },
  product_created:          { label:'Product Added',      icon:'ri-add-circle-line',      color:'#8b5cf6', bg:'#f5f3ff' },
  product_updated:          { label:'Product Updated',    icon:'ri-edit-line',            color:'#f59e0b', bg:'#fffbeb' },
  product_deleted:          { label:'Product Deleted',    icon:'ri-delete-bin-line',      color:'#ef4444', bg:'#fef2f2' },
  ai_chat:                  { label:'AI Chat',            icon:'ri-chat-3-line',          color:'#0ea5e9', bg:'#f0f9ff' },
  setting_changed:          { label:'Settings Updated',   icon:'ri-user-settings-line',   color:'#f59e0b', bg:'#fffbeb' },
  onboarding_completed:     { label:'Onboarding Done',    icon:'ri-checkbox-circle-line', color:'#22c55e', bg:'#f0fdf4' },
  onboarding_step:          { label:'Onboarding Step',    icon:'ri-footprint-line',       color:'#64748b', bg:'#f8fafc' },
  data_export_requested:    { label:'Data Export',        icon:'ri-download-2-line',      color:'#3b82f6', bg:'#eff6ff' },
  admin_viewed_user_context:{ label:'Admin Viewed User',  icon:'ri-eye-line',             color:'#64748b', bg:'#f8fafc' },
}
const fallbackCfg = (type) => ({ label: (type||'Event').replace(/_/g,' '), icon:'ri-flashlight-line', color:'#64748b', bg:'#f8fafc' })

function describe(a) {
  const m = a.metadata || {}
  switch (a.type) {
    case 'login': return `Logged in${m.origin ? ` from ${m.origin.replace(/^https?:\/\//,'')}` : ''}`
    case 'registered': return 'Account created'
    case 'order_created': return `Placed order ${a.entity_id || ''} — ₦${Number(m.total||0).toLocaleString()} (${m.item_count||1} item${m.item_count!==1?'s':''})`
    case 'product_created': return `Added product "${m.name||a.entity_id}"`
    case 'product_updated': return `Updated product "${m.name||a.entity_id}"`
    case 'product_deleted': return `Archived product #${a.entity_id}`
    case 'ai_chat': return `Chatted with ${m.bot==='chef'?'Chef Bems':'the assistant'}`
    case 'setting_changed': return `Updated settings: ${(m.fields||[]).join(', ') || '—'}`
    case 'onboarding_completed': return 'Completed onboarding'
    case 'onboarding_step': return `Onboarding step: ${m.step||'—'}`
    case 'data_export_requested': return 'Requested a data export'
    case 'admin_viewed_user_context': return `Viewed user #${a.entity_id}'s profile`
    default: return (a.type||'').replace(/_/g,' ')
  }
}

const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'#111827', background:'#fff' }
const card = { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }

function formatDate(d) {
  const today = new Date().toISOString().slice(0,10)
  const yest = new Date(Date.now()-86400000).toISOString().slice(0,10)
  if (d===today) return `Today — ${new Date(d+'T12:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}`
  if (d===yest) return `Yesterday — ${new Date(d+'T12:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}`
  return new Date(d+'T12:00').toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
}

export default function ActivityLog() {
  const [activity, setActivity]     = useState([])
  const [total, setTotal]           = useState(0)
  const [typeCounts, setTypeCounts] = useState({})
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/customers/site-activity', {
        params: {
          type: filterType==='all' ? '' : filterType,
          search, date_from: dateFrom, date_to: dateTo, limit: 150,
        },
      })
      setActivity(data.activity || [])
      setTotal(data.total || 0)
      setTypeCounts(data.type_counts || {})
    } catch {
      toast.error('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }, [filterType, search, dateFrom, dateTo])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const grouped = (() => {
    const map = {}
    activity.forEach(a => { const d = a.created_at.slice(0,10); if (!map[d]) map[d]=[]; map[d].push(a) })
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]))
  })()

  const todayStr = new Date().toISOString().slice(0,10)
  const todayCount = activity.filter(a => a.created_at.slice(0,10)===todayStr).length
  const loginCount = typeCounts.login || 0
  const orderCount  = typeCounts.order_created || 0
  const allTypes = Object.keys(typeCounts)

  const clearFilters = () => { setSearch(''); setFilterType('all'); setDateFrom(''); setDateTo('') }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader
        title="Activity Log"
        subtitle="Real platform events — logins, orders, admin product edits, AI chats"
      />

      {/* KPI Strip */}
      <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Events',      val:total,      icon:'ri-list-check-3',       color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Activity",  val:todayCount, icon:'ri-calendar-check-line', color:'#22c55e', bg:'#f0fdf4' },
          { label:'Orders Placed',     val:orderCount, icon:'ri-shopping-bag-line',   color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Logins',            val:loginCount, icon:'ri-login-circle-line',   color:'#f59e0b', bg:'#fffbeb' },
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
        <div className="grid-form-cols" style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or reference…" style={{ ...inp, paddingLeft:32 }} />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" style={{ ...inp, width:'auto' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To" style={{ ...inp, width:'auto' }} />
          <button onClick={clearFilters} style={{ padding:'9px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:12, fontFamily:'Nunito, sans-serif', fontWeight:600, color:'#374151', whiteSpace:'nowrap' }}>Clear</button>
        </div>
      </div>

      {/* Type pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        <button onClick={() => setFilterType('all')} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Nunito, sans-serif', background: filterType==='all'?'#1B4332':'#f8fafc', color: filterType==='all'?'#fff':'#64748b' }}>
          All Events ({total})
        </button>
        {allTypes.map(t => {
          const cfg = TYPE_CFG[t] || fallbackCfg(t)
          const isActive = filterType===t
          return (
            <button key={t} onClick={() => setFilterType(t)} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Nunito, sans-serif', background: isActive?cfg.color:'#f8fafc', color: isActive?'#fff':'#64748b' }}>
              <i className={cfg.icon} />{cfg.label} ({typeCounts[t]})
            </button>
          )
        })}
      </div>

      {/* Loading / empty states */}
      {loading && (
        <div style={{ ...card, padding:'48px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
          <i className="ri-loader-4-line" style={{ fontSize:32, display:'block', marginBottom:8 }} />
          Loading…
        </div>
      )}
      {!loading && activity.length===0 && (
        <div style={{ ...card, padding:'48px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
          <i className="ri-search-line" style={{ fontSize:32, display:'block', marginBottom:8 }} />
          No activity matches your filters.
        </div>
      )}

      {/* Activity groups */}
      {!loading && grouped.map(([date, events]) => (
        <div key={date} style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', whiteSpace:'nowrap' }}>{formatDate(date)}</div>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:'#f1f5f9', color:'#64748b', whiteSpace:'nowrap' }}>{events.length} event{events.length!==1?'s':''}</span>
          </div>

          <div style={card}>
            {events.map((a,i) => {
              const tc = TYPE_CFG[a.type] || fallbackCfg(a.type)
              const name = a.user_name || a.user_email || 'Unknown'
              return (
                <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 20px', borderBottom: i<events.length-1?'1px solid #f9fafb':'none' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={tc.icon} style={{ color:tc.color, fontSize:15 }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:AVATAR_COLORS[a.user_id%AVATAR_COLORS.length]||'#64748b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:9, flexShrink:0 }}>{ini(name)}</div>
                          <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{name}</span>
                          <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:50, background:tc.bg, color:tc.color }}>{tc.label}</span>
                        </div>
                        <div style={{ fontSize:13, color:'#374151' }}>{describe(a)}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' }}>
                          {a.entity_id && <span style={{ fontSize:10, color:'#94a3b8' }}>{a.entity_id}</span>}
                          {a.entity_id && <span style={{ fontSize:10, color:'#94a3b8' }}>·</span>}
                          <span style={{ fontSize:10, color:'#94a3b8' }}><i className="ri-time-line" style={{ marginRight:3 }} />{new Date(a.created_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                      </div>
                      <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap', flexShrink:0 }}>#{a.id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!loading && activity.length > 0 && (
        <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:'8px 0' }}>
          Showing {activity.length} of {total} events
        </div>
      )}
    </div>
  )
}