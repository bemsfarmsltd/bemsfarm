import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['all', 'auth', 'customer', 'admin', 'financial', 'security', 'system', 'developer', 'ai', 'comms']
const SOURCES    = ['api', 'database', 'developer', 'deployment', 'system']
const SEVERITIES = ['info', 'warning', 'critical']

const CAT_COLORS = {
  auth:      { bg: '#dbeafe', color: '#1d4ed8', icon: '🔐' },
  customer:  { bg: '#dcfce7', color: '#15803d', icon: '👤' },
  admin:     { bg: '#ede9fe', color: '#7c3aed', icon: '⚙️' },
  financial: { bg: '#fef9c3', color: '#a16207', icon: '💰' },
  security:  { bg: '#fee2e2', color: '#dc2626', icon: '🛡️' },
  system:    { bg: '#f0f9ff', color: '#0369a1', icon: '🖥️' },
  developer: { bg: '#fdf4ff', color: '#86198f', icon: '👨‍💻' },
  ai:        { bg: '#ecfdf5', color: '#065f46', icon: '🤖' },
  comms:     { bg: '#fff7ed', color: '#c2410c', icon: '💬' },
  all:       { bg: '#f1f5f9', color: '#475569', icon: '🌐' },
}

const SEV_COLORS = {
  critical: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626', label: '🔴 Critical' },
  warning:  { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: '🟡 Warning'  },
  info:     { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: '🟢 Info'     },
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000)  return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Mini Timeline Bar Chart ────────────────────────────────────────────────
function TimelineChart({ timeline }) {
  if (!timeline?.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:80, color:'#94a3b8', fontSize:13 }}>
      No timeline data yet — events will appear here as they come in.
    </div>
  )

  // Group by hour + severity
  const hours = {}
  for (const r of timeline) {
    const h = new Date(r.hour).getHours()
    if (!hours[h]) hours[h] = { info: 0, warning: 0, critical: 0, total: 0 }
    hours[h][r.severity] = (hours[h][r.severity] || 0) + Number(r.count)
    hours[h].total += Number(r.count)
  }

  const keys     = Array.from({ length: 24 }, (_, i) => i)
  const maxTotal = Math.max(...keys.map(k => hours[k]?.total || 0), 1)

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:70, padding:'0 4px' }}>
      {keys.map(h => {
        const data    = hours[h] || {}
        const total   = data.total || 0
        const height  = Math.max((total / maxTotal) * 70, total > 0 ? 4 : 0)
        const critPct = total ? (data.critical || 0) / total : 0
        const warnPct = total ? (data.warning  || 0) / total : 0
        const infoPct = 1 - critPct - warnPct

        return (
          <div key={h} title={`${h}:00 — ${total} events`}
            style={{ flex:1, height, borderRadius:3, overflow:'hidden', cursor:'default',
              background: total === 0 ? '#f1f5f9' :
                `linear-gradient(to top, #dc2626 0%, #dc2626 ${critPct*100}%, #f59e0b ${critPct*100}%, #f59e0b ${(critPct+warnPct)*100}%, #22c55e ${(critPct+warnPct)*100}%, #22c55e 100%)`,
              minHeight: total > 0 ? 4 : 2 }} />
        )
      })}
    </div>
  )
}

// ─── Coverage Pill ───────────────────────────────────────────────────────────
function CoveragePill({ source, rows, externalConfigured }) {
  const hasData = rows?.some(r => r.source === source)
  const row     = rows?.find(r => r.source === source)
  const ok      = hasData || (source === 'api' && rows?.length > 0)

  if (!ok && (source === 'developer' || source === 'deployment') && !externalConfigured) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20,
        background:'#fff7ed', border:'1px solid #fed7aa', color:'#c2410c', fontSize:12 }}>
        <span>⚠️</span>
        <div>
          <div style={{ fontWeight:600 }}>{source}</div>
          <div style={{ opacity:.8 }}>Webhook not configured</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20,
      background: ok ? '#f0fdf4' : '#fafafa', border:`1px solid ${ok ? '#bbf7d0' : '#e2e8f0'}`,
      color: ok ? '#15803d' : '#94a3b8', fontSize:12 }}>
      <span style={{ fontSize:8, color: ok ? '#22c55e' : '#cbd5e1' }}>●</span>
      <div>
        <div style={{ fontWeight:600, textTransform:'capitalize' }}>{source}</div>
        <div style={{ opacity:.75 }}>{row ? `${Number(row.count).toLocaleString()} events` : 'No events yet'}</div>
      </div>
    </div>
  )
}

// ─── Event Detail Drawer ─────────────────────────────────────────────────────
function EventDrawer({ event, onClose }) {
  if (!event) return null
  const sev  = SEV_COLORS[event.severity] || SEV_COLORS.info
  const cat  = CAT_COLORS[event.category] || CAT_COLORS.all

  return (
    <div style={{ position:'fixed', top:0, right:0, width:480, height:'100vh', background:'#fff',
      boxShadow:'-8px 0 32px rgba(0,0,0,.15)', zIndex:9999, display:'flex', flexDirection:'column',
      fontFamily:'Inter,system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              background:sev.bg, color:sev.color }}>{sev.label}</span>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
              background:cat.bg, color:cat.color }}>{cat.icon} {event.category}</span>
          </div>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#0f172a' }}>{event.action}</h3>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{fmt(event.occurred_at)} · {relativeTime(event.occurred_at)}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#94a3b8', padding:4 }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:24 }}>
        {/* Actor */}
        <Section title="Actor">
          <Row label="ID"       value={event.actor_id   || '—'} />
          <Row label="Name"     value={event.actor_name  || '—'} />
          <Row label="Role"     value={event.actor_role  || '—'} />
          <Row label="IP"       value={event.ip_address  || '—'} />
          <Row label="Session"  value={event.session_id  || '—'} />
        </Section>

        {/* Entity */}
        {(event.entity_type || event.entity_id) && (
          <Section title="Affected Entity">
            <Row label="Type"     value={event.entity_type || '—'} />
            <Row label="ID"       value={event.entity_id   || '—'} />
            <Row label="Resource" value={event.resource    || '—'} />
          </Section>
        )}

        {/* Before / After */}
        {(event.old_value || event.new_value) && (
          <Section title="Before → After Snapshot">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>BEFORE</div>
                <pre style={{ background:'#fee2e2', padding:10, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:120, margin:0 }}>
                  {JSON.stringify(event.old_value, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>AFTER</div>
                <pre style={{ background:'#dcfce7', padding:10, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:120, margin:0 }}>
                  {JSON.stringify(event.new_value, null, 2)}
                </pre>
              </div>
            </div>
          </Section>
        )}

        {/* Request */}
        <Section title="Request Metadata">
          <Row label="Request ID"  value={event.request_id  || '—'} />
          <Row label="Source"      value={event.source      || '—'} />
          <Row label="Outcome"     value={event.outcome     || '—'} />
          <Row label="User Agent"  value={event.user_agent  ? event.user_agent.slice(0,60)+'…' : '—'} />
        </Section>

        {/* Details JSON */}
        {event.details && Object.keys(event.details).length > 0 && (
          <Section title="Raw Details">
            <pre style={{ background:'#f8fafc', padding:12, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:200, margin:0 }}>
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </Section>
        )}
      </div>

      <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', fontSize:11, color:'#cbd5e1', textAlign:'center' }}>
        Event #{event.id} · Immutable audit record
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>{title}</div>
      <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'5px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
      <span style={{ color:'#64748b', fontWeight:500, minWidth:90 }}>{label}</span>
      <span style={{ color:'#0f172a', textAlign:'right', maxWidth:280, wordBreak:'break-all' }}>{String(value)}</span>
    </div>
  )
}

// ─── Main God Eye Component ──────────────────────────────────────────────────
export default function SystemAudit() {
  const [searchParams] = useSearchParams()
  const urlCategory    = searchParams.get('category')

  const [filters, setFilters]     = useState({ search:'', source:'', category:'', severity:'', entity_type:'', actor_name:'', from:'', to:'' })
  const [activeTab, setActiveTab] = useState(CATEGORIES.includes(urlCategory) ? urlCategory : 'all')
  const [page, setPage]           = useState(1)
  const [data, setData]           = useState(null)
  const [stats, setStats]         = useState(null)
  const [timeline, setTimeline]   = useState([])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [refresh, setRefresh]     = useState(0)
  const debounceRef = useRef(null)

  // Load stats and timeline on mount / refresh
  useEffect(() => {
    api.get('/audit/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/audit/timeline').then(r => setTimeline(r.data.timeline || [])).catch(() => {})
  }, [refresh])

  // Load events with debounce on filter change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = { page, ...filters }
      if (activeTab !== 'all') params.category = activeTab
      setLoading(true)
      api.get('/audit', { params })
        .then(r => { setData(r.data); setError('') })
        .catch(() => setError('God Eye could not load audit records. Check your access permissions.'))
        .finally(() => setLoading(false))
    }, 300)
  }, [filters, page, activeTab, refresh])

  const setFilter = useCallback(e => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }))
    setPage(1)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ ...filters })
      if (activeTab !== 'all') params.set('category', activeTab)
      const res = await api.get('/audit/export', { params: Object.fromEntries(params), responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href = url
      a.download = `bems-god-eye-${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch { alert('Export failed. Superadmin access required.') }
    setExporting(false)
  }

  const tabCount = (cat) => {
    if (!stats?.by_category) return null
    if (cat === 'all') return stats.by_category.reduce((s,r) => s + Number(r.count), 0)
    return stats.by_category.find(r => r.category === cat)?.count || 0
  }

  const critCount = stats?.by_severity?.find(r => r.severity === 'critical')?.count || 0
  const warnCount = stats?.by_severity?.find(r => r.severity === 'warning')?.count || 0
  const infoCount = stats?.by_severity?.find(r => r.severity === 'info')?.count || 0

  return (
    <div style={{ fontFamily:'Inter,system-ui,sans-serif', background:'#f8fafc', minHeight:'100vh', padding:0 }}>
      {/* Overlay for drawer */}
      {selectedEvent && (
        <div onClick={() => setSelectedEvent(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:9998 }} />
      )}
      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* ── Page Header ── */}
      <div style={{ background:'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding:'28px 32px 0', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:28 }}>👁️</span>
              <div>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#f1f5f9', letterSpacing:'-.02em' }}>
                  God Eye — System Audit
                </h1>
                <p style={{ margin:'4px 0 0', fontSize:13, color:'#94a3b8' }}>
                  Omniscient audit log · Every action, every actor, every change
                </p>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={() => setRefresh(v => v+1)}
              style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', borderRadius:8,
                color:'#e2e8f0', padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
              🔄 Refresh
            </button>
            <button onClick={handleExport} disabled={exporting}
              style={{ background:'#3b82f6', border:'none', borderRadius:8, color:'#fff',
                padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              {exporting ? '⏳ Exporting…' : '⬇️ Export CSV'}
            </button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:16, paddingBottom:20 }}>
          <StatCard label="Today"     value={stats?.today || 0}           color="#3b82f6" icon="📅" />
          <StatCard label="This Week" value={stats?.week || 0}            color="#8b5cf6" icon="📊" />
          <StatCard label="This Month" value={stats?.month || 0}          color="#06b6d4" icon="🗓️" />
          <StatCard label="🔴 Critical" value={critCount}                 color="#dc2626" icon="" />
          <StatCard label="🟡 Warning"  value={warnCount}                 color="#d97706" icon="" />
          <StatCard label="Active Now" value={stats?.active_actors || 0}  color="#22c55e" icon="🟢" />
        </div>

        {/* ── Category Tabs ── */}
        <div style={{ display:'flex', gap:2, overflowX:'auto', paddingBottom:0 }}>
          {CATEGORIES.map(cat => {
            const c     = CAT_COLORS[cat]
            const count = tabCount(cat)
            const isActive = activeTab === cat
            return (
              <button key={cat} onClick={() => { setActiveTab(cat); setPage(1) }}
                style={{ background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                  border:'none', borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  color: isActive ? '#f1f5f9' : '#94a3b8', padding:'10px 14px', cursor:'pointer',
                  fontSize:12, fontWeight:isActive ? 700 : 500, whiteSpace:'nowrap',
                  borderRadius:'6px 6px 0 0', display:'flex', alignItems:'center', gap:6,
                  transition:'all .15s' }}>
                <span>{c.icon}</span>
                <span style={{ textTransform:'capitalize' }}>{cat}</span>
                {count > 0 && (
                  <span style={{ background: isActive ? '#3b82f6' : 'rgba(255,255,255,.15)',
                    color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>
                    {Number(count).toLocaleString()}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Timeline Chart ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f1f5f9', padding:'16px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>24h Event Timeline</div>
          <div style={{ display:'flex', gap:12, fontSize:11, color:'#94a3b8' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#22c55e' }}/>Info</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#f59e0b' }}/>Warning</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#dc2626' }}/>Critical</span>
          </div>
        </div>
        <TimelineChart timeline={timeline} />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#cbd5e1', marginTop:4 }}>
          <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>

      <div style={{ padding:'20px 32px' }}>
        {/* ── Filters ── */}
        <div style={{ background:'#fff', borderRadius:12, padding:20, marginBottom:20,
          boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748b', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>
            🔍 Filter Events
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <FilterInput name="search"      label="Search (action, actor, resource)" value={filters.search}      onChange={setFilter} />
            <FilterInput name="actor_name"  label="Actor Name / Email"               value={filters.actor_name}  onChange={setFilter} />
            <FilterInput name="entity_type" label="Entity Type (e.g. customer)"      value={filters.entity_type} onChange={setFilter} />
            <FilterInput name="from"        label="From Date"    value={filters.from} onChange={setFilter} type="date" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:12 }}>
            <FilterSelect name="source"   label="Source"   value={filters.source}   onChange={setFilter} options={SOURCES}    />
            <FilterSelect name="severity" label="Severity" value={filters.severity} onChange={setFilter} options={SEVERITIES} />
            <FilterInput  name="to"       label="To Date"  value={filters.to}       onChange={setFilter} type="date" />
            <button onClick={() => { setFilters({ search:'', source:'', category:'', severity:'', entity_type:'', actor_name:'', from:'', to:'' }); setActiveTab('all'); setPage(1) }}
              style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, color:'#64748b',
                cursor:'pointer', fontSize:13, fontWeight:500, alignSelf:'flex-end', padding:'8px 0' }}>
              ✕ Clear Filters
            </button>
          </div>
        </div>

        {/* ── Coverage ── */}
        <div style={{ background:'#fff', borderRadius:12, padding:'14px 20px', marginBottom:20,
          boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>
            Capture Coverage
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {['api','database','developer','deployment','system'].map(s => (
              <CoveragePill key={s} source={s} rows={data?.coverage} externalConfigured={data?.external_configured} />
            ))}
          </div>
          {data && !data.external_configured && (
            <div style={{ marginTop:10, padding:'8px 12px', background:'#fff7ed', borderRadius:8, fontSize:12, color:'#c2410c', border:'1px solid #fed7aa' }}>
              ⚠️ Developer/deployment webhook not configured. Activity outside the app (Git pushes, CI/CD, Render deployments) is not captured. Set <code>AUDIT_INGEST_SECRET</code> and <code>AUDIT_REPOSITORY</code> to enable.
            </div>
          )}
          {data?.last_write_failure && (
            <div style={{ marginTop:8, padding:'8px 12px', background:'#fef2f2', borderRadius:8, fontSize:12, color:'#dc2626', border:'1px solid #fecaca' }}>
              🔴 Audit persistence failure at {data.last_write_failure}. Coverage may have a gap.
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:16, marginBottom:20, color:'#dc2626', fontSize:13 }}>
            {error}
          </div>
        )}

        {/* ── Events Table ── */}
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
          boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
                  {['Time','Severity','Category','Source / Action','Actor','Entity','Outcome','Details'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:600,
                      fontSize:11, color:'#64748b', letterSpacing:'.04em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
                    Loading God Eye records…
                  </td></tr>
                )}
                {data?.events.map(e => {
                  const sev = SEV_COLORS[e.severity] || SEV_COLORS.info
                  const cat = CAT_COLORS[e.category] || CAT_COLORS.all
                  return (
                    <tr key={e.id} style={{ borderBottom:'1px solid #f8fafc', transition:'background .1s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{fmt(e.occurred_at)}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{relativeTime(e.occurred_at)}</div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
                          borderRadius:20, fontSize:11, fontWeight:700, background:sev.bg, color:sev.color }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:sev.dot, display:'inline-block' }}/>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600,
                          background:cat.bg, color:cat.color }}>
                          {cat.icon} {e.category}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:600, color:'#1e293b', fontSize:12 }}>{e.action}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{e.source}</div>
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:160 }}>
                        {e.actor_id ? (
                          <>
                            <div style={{ fontWeight:500, fontSize:12, color:'#1e293b' }}>
                              {e.actor_name || `#${e.actor_id}`}
                            </div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{e.actor_role}</div>
                          </>
                        ) : (
                          <span style={{ color:'#cbd5e1', fontSize:12 }}>System</span>
                        )}
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:140 }}>
                        {e.entity_type ? (
                          <>
                            <div style={{ fontSize:12, color:'#475569', fontWeight:500, textTransform:'capitalize' }}>{e.entity_type}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>#{e.entity_id}</div>
                          </>
                        ) : (
                          <div style={{ fontSize:11, color:'#cbd5e1', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {e.resource || '—'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600,
                          background: e.outcome === 'success' || e.outcome === 'committed' ? '#f0fdf4' : '#fef2f2',
                          color:      e.outcome === 'success' || e.outcome === 'committed' ? '#16a34a' : '#dc2626' }}>
                          {e.outcome}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={() => setSelectedEvent(e)}
                          style={{ background:'#f1f5f9', border:'none', borderRadius:6, padding:'5px 10px',
                            cursor:'pointer', fontSize:11, fontWeight:600, color:'#475569' }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {data && !data.events.length && (
                  <tr><td colSpan={8} style={{ padding:48, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                    <div>No events match the current filters.</div>
                    <div style={{ fontSize:12, marginTop:4 }}>Try adjusting or clearing the filters above.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px 20px', borderTop:'1px solid #f8fafc', background:'#fafafa' }}>
              <span style={{ fontSize:12, color:'#64748b' }}>
                {loading ? 'Loading…' : `${Number(data.total).toLocaleString()} total events · Page ${page}`}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:7, padding:'6px 14px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:500,
                    color: page === 1 ? '#cbd5e1' : '#475569' }}>
                  ← Previous
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={!data || page * 50 >= data.total}
                  style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:7, padding:'6px 14px',
                    cursor: !data || page * 50 >= data.total ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:500,
                    color: !data || page * 50 >= data.total ? '#cbd5e1' : '#475569' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:10, padding:'14px 16px',
      border:'1px solid rgba(255,255,255,.08)', cursor:'default' }}>
      <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
        {icon && <span>{icon}</span>} {label}
      </div>
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'monospace' }}>
        {Number(value).toLocaleString()}
      </div>
    </div>
  )
}

function FilterInput({ name, label, value, onChange, type = 'text' }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>{label}</span>
      <input type={type} name={name} value={value} onChange={onChange}
        style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13,
          color:'#1e293b', background:'#f8fafc', outline:'none' }}
        placeholder={type === 'text' ? label : undefined} />
    </label>
  )
}

function FilterSelect({ name, label, value, onChange, options }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>{label}</span>
      <select name={name} value={value} onChange={onChange}
        style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13,
          color:'#1e293b', background:'#f8fafc', outline:'none' }}>
        <option value="">All {label}s</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
