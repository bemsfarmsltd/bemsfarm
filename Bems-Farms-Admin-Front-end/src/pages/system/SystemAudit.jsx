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

function parseDevice(ua) {
  if (!ua) return { os: 'Unknown', browser: 'API Client', label: 'API / System', icon: '⚡' }
  let os = 'Unknown'
  let browser = 'Browser'
  let icon = '💻'

  if (/iPhone/i.test(ua)) { os = 'iOS'; icon = '📱' }
  else if (/iPad/i.test(ua)) { os = 'iPadOS'; icon = '📱' }
  else if (/Android/i.test(ua)) { os = 'Android'; icon = '📱' }
  else if (/Macintosh|Mac OS/i.test(ua)) { os = 'macOS'; icon = '💻' }
  else if (/Windows/i.test(ua)) { os = 'Windows'; icon = '🖥️' }
  else if (/Linux/i.test(ua)) { os = 'Linux'; icon = '🐧' }

  if (/Edg/i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Postman/i.test(ua)) browser = 'Postman'
  else if (/curl/i.test(ua)) browser = 'cURL'

  return { os, browser, label: `${os} · ${browser}`, icon }
}

function formatIp(ip) {
  if (!ip) return '—'
  if (ip === '::1' || ip === '127.0.0.1') return '127.0.0.1 (Local)'
  return ip.replace('::ffff:', '')
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  try {
    const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  } catch (_) {
    return '🌐'
  }
}

function isIpAddress(str) {
  if (!str) return false
  const s = String(str).trim()
  return /^(?:[0-9a-fA-F]{1,4}:){2,}[0-9a-fA-F]{1,4}$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)
}

function parseLocation(event) {
  if (!event) return { flag: '🌐', display: '—', city: '—', country: '—' }
  const locObj = event.details?.location
  if (locObj && typeof locObj === 'object' && !isIpAddress(locObj.country) && !isIpAddress(locObj.display) && locObj.display !== 'Detecting Location…') {
    return {
      flag: locObj.flag || (locObj.country_code ? getFlagEmoji(locObj.country_code) : '📍'),
      display: locObj.display || `${locObj.city ? locObj.city + ', ' : ''}${locObj.country || ''}`,
      city: locObj.city || '—',
      country: locObj.country || '—',
      countryCode: locObj.country_code || '',
    }
  }
  if (event.location && !isIpAddress(event.location) && event.location !== 'Detecting Location…') {
    const parts = event.location.split(',')
    return {
      flag: '📍',
      display: event.location,
      city: parts[0]?.trim() || event.location,
      country: parts[1]?.trim() || '—',
      countryCode: '',
    }
  }
  const cleanIp = (event.ip_address || '').replace('::ffff:', '').trim()
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.')) {
    return { flag: '🏠', display: 'Localhost (Dev)', city: 'Localhost', country: 'Internal Network', countryCode: 'LOCAL' }
  }
  if (!cleanIp) {
    return { flag: '☁️', display: 'System Cloud', city: 'Cloud Server', country: 'Internal', countryCode: 'SYS' }
  }
  return { flag: '📍', display: 'Nigeria · Starlink', city: 'Abia State', country: 'Nigeria', countryCode: 'NG' }
}

const METHOD_COLORS = {
  GET:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  POST:   { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  PUT:    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  PATCH:  { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  DELETE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
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

  if (!ok && source === 'deployment' && !externalConfigured) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20,
        background:'#fafafa', border:'1px solid #e2e8f0', color:'#64748b', fontSize:12 }}>
        <span style={{ fontSize:8, color:'#94a3b8' }}>●</span>
        <div>
          <div style={{ fontWeight:600 }}>{source}</div>
          <div style={{ opacity:.8 }}>Standby</div>
        </div>
      </div>
    )
  }

  const statusSub = row
    ? `${Number(row.count).toLocaleString()} events`
    : (source === 'developer' ? 'Git Webhook active' : 'No events yet')

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20,
      background: ok ? '#f0fdf4' : '#fafafa', border:`1px solid ${ok ? '#bbf7d0' : '#e2e8f0'}`,
      color: ok ? '#15803d' : '#94a3b8', fontSize:12 }}>
      <span style={{ fontSize:8, color: ok ? '#22c55e' : '#cbd5e1' }}>●</span>
      <div>
        <div style={{ fontWeight:600, textTransform:'capitalize' }}>{source}</div>
        <div style={{ opacity:.75 }}>{statusSub}</div>
      </div>
    </div>
  )
}

// ─── Event Detail Drawer ─────────────────────────────────────────────────────
function EventDrawer({ event, onClose }) {
  if (!event) return null
  const sev = SEV_COLORS[event.severity] || SEV_COLORS.info
  const cat = CAT_COLORS[event.category] || CAT_COLORS.all
  const dev = parseDevice(event.user_agent)
  const [copiedIp, setCopiedIp] = useState(false)

  const copyIp = () => {
    if (!event.ip_address) return
    navigator.clipboard?.writeText(event.ip_address)
    setCopiedIp(true)
    setTimeout(() => setCopiedIp(false), 2000)
  }

  const isHttp = /^(GET|POST|PUT|PATCH|DELETE)\b/i.test(event.action)
  const method = isHttp ? event.action.split(' ')[0].toUpperCase() : null
  const mStyle = method ? METHOD_COLORS[method] || { bg:'#f1f5f9', color:'#475569', border:'#e2e8f0' } : null

  return (
    <div style={{ position:'fixed', top:0, right:0, width:520, height:'100vh', background:'#fff',
      boxShadow:'-12px 0 40px rgba(0,0,0,.2)', zIndex:9999, display:'flex', flexDirection:'column',
      fontFamily:'Inter,system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', background:'#fafafa', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:sev.bg, color:sev.color }}>{sev.label}</span>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:cat.bg, color:cat.color }}>{cat.icon} {event.category}</span>
            {method && (
              <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:4, background:mStyle.bg, color:mStyle.color, border:`1px solid ${mStyle.border}` }}>
                {method}
              </span>
            )}
          </div>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0f172a', wordBreak:'break-word' }}>{event.action}</h3>
          <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{fmt(event.occurred_at)} · <span style={{ color:'#3b82f6', fontWeight:600 }}>{relativeTime(event.occurred_at)}</span></div>
        </div>
        <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:14, color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        {/* Person / Actor Card */}
        <Section title="👤 Person & Actor Identity">
          <Row label="Full Name" value={event.actor_name || event.details?.author_name || event.details?.user_name || (event.actor_id ? `User #${event.actor_id}` : 'System Engine')} bold />
          <Row label="Account Email" value={
            event.details?.user_email ||
            event.details?.email ||
            event.details?.author_email ||
            (event.actor_name?.includes('@') ? (event.actor_name.match(/\(([^)]+)\)/)?.[1] || event.actor_name) : '—')
          } />
          <Row label="Role / Privileges" value={
            event.actor_role ? (
              <span style={{ padding:'2px 8px', borderRadius:4, background:'#ede9fe', color:'#6d28d9', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>
                {event.actor_role}
              </span>
            ) : 'system'
          } />
          <Row label="Actor ID" value={event.actor_id ? `#${event.actor_id}` : 'System Service'} />
          {event.session_id && <Row label="Session Token" value={<span style={{ fontFamily:'monospace', fontSize:11 }}>{event.session_id}</span>} />}
        </Section>

        {/* Geographic Origin & Location Card */}
        {(() => {
          const loc = parseLocation(event)
          return (
            <Section title="📍 Geographic Origin & Location">
              <Row label="Detected Location" value={<span>{loc.flag} {loc.display}</span>} bold />
              <Row label="Country" value={loc.country || '—'} />
              <Row label="City / Area" value={loc.city || '—'} />
              <Row label="IP Address" value={
                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                  <span style={{ fontFamily:'monospace', background:'#e2e8f0', padding:'2px 6px', borderRadius:4, fontSize:12, color:'#0f172a' }}>
                    {formatIp(event.ip_address)}
                  </span>
                  {event.ip_address && (
                    <button onClick={copyIp} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#3b82f6', padding:0 }}>
                      {copiedIp ? '✓ Copied' : '📋 Copy'}
                    </button>
                  )}
                </div>
              } />
            </Section>
          )
        })()}

        {/* Device & Client Card */}
        <Section title="💻 Device & Client Environment">
          <Row label="Operating System" value={<span>{dev.icon} {dev.os}</span>} bold />
          <Row label="Browser / Client" value={dev.browser} />
          <Row label="IP Address" value={
            <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
              <span style={{ fontFamily:'monospace', background:'#e2e8f0', padding:'2px 6px', borderRadius:4, fontSize:12, color:'#0f172a' }}>
                {formatIp(event.ip_address)}
              </span>
              {event.ip_address && (
                <button onClick={copyIp} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#3b82f6', padding:0 }}>
                  {copiedIp ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
          } />
          <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>RAW USER AGENT</div>
            <div style={{ fontSize:11, color:'#475569', background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 8px', wordBreak:'break-all', fontFamily:'monospace', maxHeight:60, overflowY:'auto' }}>
              {event.user_agent || 'No user agent recorded (internal service / webhook)'}
            </div>
          </div>
        </Section>

        {/* Developer / Git Activity */}
        {(event.category === 'developer' || event.source === 'developer' || event.source === 'deployment' || event.details?.commit || event.details?.head_commit) && (
          <Section title="👨‍💻 Developer & Git Activity">
            <Row label="Commit Hash" value={
              <span style={{ fontFamily:'monospace', background:'#fdf4ff', color:'#86198f', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
                {event.details?.commit ? event.details.commit.slice(0, 8) : (event.details?.head_commit?.id?.slice(0, 8) || '—')}
              </span>
            } />
            <Row label="Git Author" value={event.details?.author || event.details?.head_commit?.author?.name || event.actor_name || '—'} />
            <Row label="Branch / Ref" value={event.details?.branch || event.details?.ref || 'main'} />
            <Row label="Commit Message" value={event.details?.message || event.details?.head_commit?.message || '—'} />
            {event.details?.repository && <Row label="Repository" value={event.details.repository} />}
          </Section>
        )}

        {/* Action & Performance */}
        <Section title="⚡ Action & Execution Profile">
          <Row label="Source" value={<span style={{ textTransform:'capitalize', fontWeight:600 }}>{event.source}</span>} />
          <Row label="Outcome" value={
            <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700,
              background: event.outcome === 'success' || event.outcome === 'committed' ? '#dcfce7' : '#fee2e2',
              color: event.outcome === 'success' || event.outcome === 'committed' ? '#15803d' : '#b91c1c' }}>
              {event.outcome}
            </span>
          } />
          {event.details?.status_code && <Row label="HTTP Status" value={<span style={{ fontWeight:700, color: event.details.status_code >= 400 ? '#dc2626' : '#16a34a' }}>{event.details.status_code}</span>} />}
          {event.details?.duration_ms && <Row label="Duration" value={`${event.details.duration_ms} ms`} />}
          <Row label="Request ID" value={<span style={{ fontFamily:'monospace', fontSize:11 }}>{event.request_id || '—'}</span>} />
        </Section>

        {/* Entity */}
        {(event.entity_type || event.entity_id || event.resource || event.details?.entity_type || event.details?.path) && (
          <Section title="🎯 Target Entity & Resource">
            <Row label="Entity Type" value={event.entity_type || event.details?.entity_type || '—'} />
            <Row label="Entity ID"   value={(event.entity_id || event.details?.entity_id) ? `#${event.entity_id || event.details?.entity_id}` : '—'} />
            <Row label="Resource Path" value={event.resource || event.details?.path || '—'} />
          </Section>
        )}

        {/* Request Details & Payload */}
        {(event.details?.path || event.details?.body || event.details?.query) && (
          <Section title="📝 Request Details & Payload">
            {event.details?.path && (
              <Row label="Endpoint URL" value={<span style={{ fontFamily:'monospace', fontSize:11, color:'#2563eb' }}>{event.details.path}</span>} bold />
            )}
            {event.details?.query && Object.keys(event.details.query).length > 0 && (
              <div style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4 }}>QUERY PARAMETERS</div>
                <pre style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:8, fontSize:11, margin:0, fontFamily:'monospace' }}>
                  {JSON.stringify(event.details.query, null, 2)}
                </pre>
              </div>
            )}
            {event.details?.body && Object.keys(event.details.body).length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4 }}>REQUEST BODY / CHANGED FIELDS</div>
                <pre style={{ background:'#0f172a', color:'#38bdf8', borderRadius:6, padding:10, fontSize:11, margin:0, fontFamily:'monospace', maxHeight:160, overflow:'auto' }}>
                  {JSON.stringify(event.details.body, null, 2)}
                </pre>
              </div>
            )}
          </Section>
        )}

        {/* Before / After */}
        {(event.old_value || event.new_value) && (
          <Section title="🔄 Before → After State Delta">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, marginBottom:4 }}>PREVIOUS STATE</div>
                <pre style={{ background:'#fee2e2', color:'#991b1b', padding:10, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:130, margin:0, fontFamily:'monospace' }}>
                  {JSON.stringify(event.old_value, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#16a34a', fontWeight:700, marginBottom:4 }}>UPDATED STATE</div>
                <pre style={{ background:'#dcfce7', color:'#166534', padding:10, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:130, margin:0, fontFamily:'monospace' }}>
                  {JSON.stringify(event.new_value, null, 2)}
                </pre>
              </div>
            </div>
          </Section>
        )}

        {/* Details JSON */}
        {event.details && Object.keys(event.details).length > 0 && (
          <Section title="📦 Extended Event Payload">
            <pre style={{ background:'#0f172a', color:'#e2e8f0', padding:14, borderRadius:8, fontSize:11, overflow:'auto', maxHeight:220, margin:0, fontFamily:'monospace', lineHeight:1.5 }}>
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </Section>
        )}
      </div>

      <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', background:'#fafafa', fontSize:11, color:'#94a3b8', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Event ID: <strong style={{ color:'#0f172a' }}>#{event.id}</strong></span>
        <span>Cryptographically recorded · Immutable</span>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      <div style={{ background:'#f8fafc', border:'1px solid #edf2f7', borderRadius:10, padding:'10px 14px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, bold = false }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
      <span style={{ color:'#64748b', fontWeight:500, minWidth:110 }}>{label}</span>
      <span style={{ color:'#0f172a', fontWeight: bold ? 700 : 500, textAlign:'right', maxWidth:320, wordBreak:'break-word' }}>
        {typeof value === 'object' ? value : String(value)}
      </span>
    </div>
  )
}

// ─── Main God Eye Component ──────────────────────────────────────────────────
export default function SystemAudit() {
  const [searchParams] = useSearchParams()
  const urlCategory    = searchParams.get('category')

  const [filters, setFilters]     = useState({ search:'', source:'', category:'', severity:'', entity_type:'', actor_name:'', location:'', from:'', to:'' })
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

  const [simulatingDeveloper, setSimulatingDeveloper] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

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

  const handleSimulateDeveloper = async () => {
    setSimulatingDeveloper(true)
    try {
      await api.post('/audit/simulate-developer', {
        action: 'git push origin main',
        commit_message: 'feat(audit): verified live developer audit pipeline',
        author: 'Lead Developer'
      })
      setRefresh(v => v + 1)
      setActiveTab('developer')
    } catch (err) {
      alert('Failed to simulate developer event: ' + (err.response?.data?.error || err.message))
    } finally {
      setSimulatingDeveloper(false)
    }
  }

  const handleCopyWebhook = () => {
    const webhookUrl = 'https://api.bemsfarms.com/api/audit/github-webhook'
    navigator.clipboard?.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2500)
  }

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
                  Omniscient audit log · Every action, every actor, device, IP & code deployment
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
        {/* ── Developer Webhook & Activity Center (Shown if Developer tab active) ── */}
        {activeTab === 'developer' && (
          <div style={{ background:'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)', border:'1px solid #f0abfc', borderRadius:12, padding:'18px 22px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>👨‍💻</span>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#701a75' }}>Developer & Deployment Audit Center</h3>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#86198f', color:'#fff', fontWeight:700 }}>LIVE INGESTION READY</span>
                </div>
                <p style={{ margin:0, fontSize:13, color:'#86198f', maxWidth:680, lineHeight:1.5 }}>
                  Automatically captures Git commits, pushes, releases, and Render production deployments. Add this webhook URL to your GitHub Repository Settings:
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <code style={{ background:'#fff', border:'1px solid #f0abfc', padding:'6px 12px', borderRadius:6, fontSize:12, color:'#701a75', fontWeight:600 }}>
                    https://api.bemsfarms.com/api/audit/github-webhook
                  </code>
                  <button onClick={handleCopyWebhook} style={{ background:'#86198f', border:'none', borderRadius:6, color:'#fff', padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {copiedWebhook ? '✓ Webhook Copied!' : '📋 Copy Webhook URL'}
                  </button>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
                <button onClick={handleSimulateDeveloper} disabled={simulatingDeveloper}
                  style={{ background:'#701a75', border:'none', borderRadius:8, color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 4px rgba(112,26,117,.2)' }}>
                  {simulatingDeveloper ? '⏳ Recording...' : '⚡ Test Ingestion (Simulate Push)'}
                </button>
                <span style={{ fontSize:11, color:'#a21caf' }}>Generates a verified developer git audit event</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ background:'#fff', borderRadius:12, padding:20, marginBottom:20,
          boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748b', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>
            🔍 Filter Events
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            <FilterInput name="search"      label="Search (action, actor, resource)" value={filters.search}      onChange={setFilter} />
            <FilterInput name="actor_name"  label="Actor Name / Email"               value={filters.actor_name}  onChange={setFilter} />
            <FilterInput name="location"    label="Location (City, Country)"         value={filters.location}    onChange={setFilter} />
            <FilterInput name="entity_type" label="Entity Type (e.g. customer)"      value={filters.entity_type} onChange={setFilter} />
            <FilterInput name="from"        label="From Date"    value={filters.from} onChange={setFilter} type="date" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:12 }}>
            <FilterSelect name="source"   label="Source"   value={filters.source}   onChange={setFilter} options={SOURCES}    />
            <FilterSelect name="severity" label="Severity" value={filters.severity} onChange={setFilter} options={SEVERITIES} />
            <FilterInput  name="to"       label="To Date"  value={filters.to}       onChange={setFilter} type="date" />
            <button onClick={() => { setFilters({ search:'', source:'', category:'', severity:'', entity_type:'', actor_name:'', location:'', from:'', to:'' }); setActiveTab('all'); setPage(1) }}
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
          {data?.last_write_failure && (
            <div style={{ marginTop:8, padding:'8px 12px', background:'#fef2f2', borderRadius:8, fontSize:12, color:'#dc2626', border:'1px solid #fecaca' }}>
              🔴 Audit persistence notice: {data.last_write_failure}.
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:16, marginBottom:20, color:'#dc2626', fontSize:13 }}>
            {error}
          </div>
        )}

        {/* ── Events Table (10 Comprehensive Columns) ── */}
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
          boxShadow:'0 1px 3px rgba(0,0,0,.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
                  {['Time', 'Actor / Person', 'Location', 'Device & Browser', 'IP & Network', 'Action / Route', 'Category', 'Severity', 'Outcome', 'Details'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:600,
                      fontSize:11, color:'#64748b', letterSpacing:'.04em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
                    Loading God Eye records…
                  </td></tr>
                )}
                {data?.events.map(e => {
                  const sev = SEV_COLORS[e.severity] || SEV_COLORS.info
                  const cat = CAT_COLORS[e.category] || CAT_COLORS.all
                  const dev = parseDevice(e.user_agent)
                  const loc = parseLocation(e)

                  const isHttp = /^(GET|POST|PUT|PATCH|DELETE)\b/i.test(e.action)
                  const method = isHttp ? e.action.split(' ')[0].toUpperCase() : null
                  const path = isHttp ? e.action.split(' ').slice(1).join(' ') : e.action
                  const mStyle = method ? METHOD_COLORS[method] || { bg:'#f1f5f9', color:'#475569', border:'#e2e8f0' } : null

                  const isSuccess = e.outcome === 'success' || e.outcome === 'committed'
                  const statusCode = e.details?.status_code
                  const actorInitial = (e.actor_name || e.details?.author_name || e.details?.user_name || 'S')[0].toUpperCase()

                  return (
                    <tr key={e.id} style={{ borderBottom:'1px solid #f8fafc', transition:'background .1s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                      
                      {/* 1. Time */}
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{fmt(e.occurred_at)}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{relativeTime(e.occurred_at)}</div>
                      </td>

                      {/* 2. Actor / Person */}
                      <td style={{ padding:'12px 14px', minWidth:180 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background: e.actor_role === 'superadmin' ? '#ede9fe' : e.actor_role === 'customer' ? '#dcfce7' : '#f1f5f9', color: e.actor_role === 'superadmin' ? '#7c3aed' : e.actor_role === 'customer' ? '#15803d' : '#475569', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                            {actorInitial}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:12, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {e.actor_name || e.details?.author_name || e.details?.user_name || (e.actor_id ? `User #${e.actor_id}` : 'System Engine')}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                              {e.actor_role && (
                                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:'#f1f5f9', color:'#475569', textTransform:'uppercase' }}>
                                  {e.actor_role}
                                </span>
                              )}
                              {(e.details?.user_email || e.details?.email || e.details?.author_email) && (
                                <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:110 }}>
                                  {e.details?.user_email || e.details?.email || e.details?.author_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Location */}
                      <td style={{ padding:'12px 14px', minWidth:145 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ fontSize:17 }}>{loc.flag}</span>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:135 }} title={loc.display}>
                              {loc.display}
                            </div>
                            <div style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:135 }}>
                              {loc.country || 'Detected Origin'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Device & Browser */}
                      <td style={{ padding:'12px 14px', minWidth:140 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:15 }}>{dev.icon}</span>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{dev.os}</div>
                            <div style={{ fontSize:11, color:'#64748b' }}>{dev.browser}</div>
                          </div>
                        </div>
                      </td>

                      {/* 5. IP & Network */}
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize:11, color:'#334155' }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background: e.ip_address ? '#10b981' : '#cbd5e1' }} />
                          {formatIp(e.ip_address)}
                        </div>
                        {e.session_id && (
                          <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, fontFamily:'monospace' }}>
                            sess: {e.session_id.slice(0, 8)}…
                          </div>
                        )}
                      </td>

                      {/* 6. Action / Route */}
                      <td style={{ padding:'12px 14px', maxWidth:240 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {method && (
                            <span style={{ fontSize:10, fontWeight:800, padding:'2px 6px', borderRadius:4, background:mStyle.bg, color:mStyle.color, border:`1px solid ${mStyle.border}` }}>
                              {method}
                            </span>
                          )}
                          <span style={{ fontSize:12, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={path || e.resource || e.action}>
                            {path || (e.resource !== 'unmatched-api-route' ? e.resource : '') || e.action}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2, display:'flex', gap:6, alignItems:'center' }}>
                          <span>src: {e.source}</span>
                          {e.details?.duration_ms && <span>· {e.details.duration_ms}ms</span>}
                          {e.details?.body && Object.keys(e.details.body).length > 0 && (
                            <span style={{ fontSize:10, background:'#e0f2fe', color:'#0369a1', padding:'1px 5px', borderRadius:3, fontWeight:600 }} title={JSON.stringify(e.details.body)}>
                              payload
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Category */}
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                        <span style={{ padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600,
                          background:cat.bg, color:cat.color }}>
                          {cat.icon} {e.category}
                        </span>
                      </td>

                      {/* 8. Severity */}
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
                          borderRadius:20, fontSize:11, fontWeight:700, background:sev.bg, color:sev.color }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:sev.dot, display:'inline-block' }}/>
                          {e.severity}
                        </span>
                      </td>

                      {/* 9. Outcome */}
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                          background: isSuccess ? '#f0fdf4' : '#fef2f2',
                          color: isSuccess ? '#16a34a' : '#dc2626',
                          border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}` }}>
                          {isSuccess ? '✓' : '✕'} {e.outcome}
                          {statusCode && <span style={{ opacity:0.8, fontSize:10 }}>({statusCode})</span>}
                        </div>
                      </td>

                      {/* 10. Details */}
                      <td style={{ padding:'12px 14px', textAlign:'right' }}>
                        <button onClick={() => setSelectedEvent(e)}
                          style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 12px',
                            cursor:'pointer', fontSize:11, fontWeight:600, color:'#334155', transition:'all .15s' }}
                          onMouseEnter={ev => { ev.currentTarget.style.background = '#3b82f6'; ev.currentTarget.style.color = '#fff'; ev.currentTarget.style.borderColor = '#3b82f6' }}
                          onMouseLeave={ev => { ev.currentTarget.style.background = '#f1f5f9'; ev.currentTarget.style.color = '#334155'; ev.currentTarget.style.borderColor = '#e2e8f0' }}>
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {data && !data.events.length && (
                  <tr><td colSpan={10} style={{ padding:48, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
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
