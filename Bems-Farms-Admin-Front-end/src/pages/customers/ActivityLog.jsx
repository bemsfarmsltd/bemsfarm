import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const ini = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16']

const TYPE_CFG = {
  ai_chat:              { label:'AI Chat',             icon:'ri-robot-line',            color:'#8b5cf6', bg:'#f5f3ff' },
  login:                { label:'Login',                icon:'ri-login-circle-line',     color:'#64748b', bg:'#f8fafc' },
  email_verified_login:  { label:'Email Verified',       icon:'ri-mail-check-line',       color:'#0ea5e9', bg:'#f0f9ff' },
  registered:            { label:'Account Created',      icon:'ri-user-add-line',         color:'#22c55e', bg:'#f0fdf4' },
  onboarding_completed:  { label:'Onboarding Completed', icon:'ri-flag-line',             color:'#14b8a6', bg:'#f0fdfa' },
  order_created:         { label:'Order Placed',         icon:'ri-shopping-bag-line',     color:'#3b82f6', bg:'#eff6ff' },
  product_created:       { label:'Product Created',      icon:'ri-add-circle-line',       color:'#22c55e', bg:'#f0fdf4' },
  product_updated:       { label:'Product Updated',      icon:'ri-edit-line',             color:'#f59e0b', bg:'#fffbeb' },
  product_deleted:       { label:'Product Deleted',      icon:'ri-delete-bin-line',       color:'#ef4444', bg:'#fef2f2' },
}
const DEFAULT_TYPE_CFG = { label:'Activity', icon:'ri-pulse-line', color:'#64748b', bg:'#f8fafc' }

function describe(a) {
  const cfg = TYPE_CFG[a.type] || DEFAULT_TYPE_CFG
  if (a.entity_id) return `${cfg.label} — ${a.entity_type || ''} ${a.entity_id}`.trim()
  return cfg.label
}

export default function ActivityLog() {
  const [activity, setActivity] = useState([])
  const [typeCounts, setTypeCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/customers/site-activity', {
        params: {
          type: filterType !== 'all' ? filterType : undefined,
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          limit: 150,
        },
      })
      setActivity(res.data.activity || [])
      setTypeCounts(res.data.type_counts || {})
    } catch {
      toast.error('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }, [filterType, search, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  // Group by date
  const grouped = useMemo(() => {
    const map = {}
    activity.forEach(a => {
      const day = (a.created_at || '').slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(a)
    })
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]))
  }, [activity])

  const totalEvents = Object.values(typeCounts).reduce((s,n)=>s+n,0)
  const todayStr = new Date().toISOString().slice(0,10)
  const todayCount  = activity.filter(a=>(a.created_at||'').startsWith(todayStr)).length
  const loginCount  = typeCounts.login || 0
  const orderCount  = typeCounts.order_created || 0
  const chatCount   = typeCounts.ai_chat || 0

  function formatDate(d) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10)
    if (d === todayStr) return `Today — ${new Date(d+'T12:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}`
    if (d === yesterday) return `Yesterday — ${new Date(d+'T12:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}`
    return new Date(d+'T12:00').toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Activity Log</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>All platform activity — orders, logins, AI chats, product changes</p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active">Activity Log</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Events',     val:totalEvents,  icon:'ri-list-check-3',         color:'#3b82f6', bg:'#eff6ff' },
          { label:"Today's Activity", val:todayCount,   icon:'ri-calendar-check-line',   color:'#22c55e', bg:'#f0fdf4' },
          { label:'Orders Placed',    val:orderCount,   icon:'ri-shopping-bag-line',     color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Logins',           val:loginCount,   icon:'ri-login-circle-line',     color:'#f59e0b', bg:'#fffbeb' },
          { label:'AI Chats',         val:chatCount,    icon:'ri-robot-line',            color:'#7c3aed', bg:'#f5f3ff' },
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
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
                <input className="form-control border-start-0 bg-light" placeholder="Search by user name, email, or entity ID…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From"/>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To"/>
            </div>
            <div className="col-md-2">
              <button className="btn btn-sm btn-outline-secondary w-100"
                onClick={()=>{ setSearch(''); setFilterType('all'); setDateFrom(''); setDateTo('') }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {['all',...Object.keys(TYPE_CFG)].map(t => {
          const cfg = t!=='all' ? (TYPE_CFG[t] || DEFAULT_TYPE_CFG) : null
          const count = t==='all' ? totalEvents : (typeCounts[t] || 0)
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
      {loading && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">Loading activity…</div>
        </div>
      )}
      {!loading && activity.length===0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">No activity matches your filters.</div>
        </div>
      )}

      {!loading && grouped.map(([date, events]) => (
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
              const tc = TYPE_CFG[a.type] || DEFAULT_TYPE_CFG
              const name = a.user_name || 'Unknown user'
              const time = a.created_at ? new Date(a.created_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}) : ''
              return (
                <div key={a.id} className={`d-flex align-items-start gap-3 px-4 py-3 ${i<events.length-1?'border-bottom':''}`}>
                  <div className="d-flex flex-column align-items-center flex-shrink-0" style={{marginTop:2}}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{width:36,height:36,background:tc.bg}}>
                      <i className={tc.icon} style={{color:tc.color,fontSize:15}}/>
                    </div>
                  </div>

                  <div className="flex-fill">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-1">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                            style={{width:22,height:22,background:AVATAR_COLORS[(a.user_id||0)%AVATAR_COLORS.length],fontSize:9}}>
                            {ini(name)}
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{name}</span>
                          <span className="badge" style={{fontSize:9,background:tc.bg,color:tc.color,border:`1px solid ${tc.bg}`}}>
                            {tc.label}
                          </span>
                        </div>
                        <div style={{fontSize:13,color:'#374151'}}>{describe(a)}</div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {a.user_email && <span className="text-muted" style={{fontSize:10}}>{a.user_email}</span>}
                          {a.user_email && <span className="text-muted" style={{fontSize:10}}>·</span>}
                          <span className="text-muted" style={{fontSize:10}}><i className="ri-time-line me-1"/>{time}</span>
                          {a.ip_address && <span className="text-muted" style={{fontSize:10}}>· {a.ip_address}</span>}
                        </div>
                      </div>
                      <span className="text-muted" style={{fontSize:10,whiteSpace:'nowrap'}}>#{a.id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Footer count */}
      {!loading && activity.length>0 && (
        <div className="text-center text-muted py-2" style={{fontSize:12}}>
          Showing {activity.length} of {totalEvents} events
        </div>
      )}
    </div>
  )
}
