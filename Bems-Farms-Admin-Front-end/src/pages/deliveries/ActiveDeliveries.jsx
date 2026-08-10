import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

const MOCK_DELIVERIES = [
  {
    id: 42,
    delivery_ref: 'DEL-2026-0042',
    order_id: 'ORD-2026-0138',
    status: 'out_for_delivery',
    customer_name: 'Kemi Balogun',
    customer_phone: '08167891234',
    delivery_address: '18 Surulere, Lagos',
    order_total: 16100,
    driver_name: 'Emeka Okafor',
    driver_phone: '08045678901',
    driver_plate: 'LAG-567-CD',
    dispatched_at_str: '—',
    eta_minutes: 15,
    attempts: 0,
    items: [
      { name: 'Fresh Tomatoes', qty: '3 kg' },
      { name: 'Red Bell Pepper', qty: '2 kg' }
    ]
  },
  {
    id: 41,
    delivery_ref: 'DEL-2026-0041',
    order_id: 'ORD-2026-0139',
    status: 'assigned',
    customer_name: 'Seun Adesanya',
    customer_phone: '09012341234',
    delivery_address: '5 Victoria Island, Lagos',
    order_total: 14200,
    driver_name: 'Tunde Adeyemi',
    driver_phone: '09021234567',
    driver_plate: 'LAG-234-AB',
    dispatched_at_str: '17:20',
    eta_minutes: null,
    attempts: 0,
    status_text: 'Driver notified. Awaiting pickup confirmation.',
    items: [
      { name: 'Ginger', qty: '1 kg' },
      { name: 'Garlic', qty: '1 kg' },
      { name: 'Sweet Corn', qty: '6 cobs' }
    ]
  },
  {
    id: 40,
    delivery_ref: 'DEL-2026-0040',
    order_id: 'ORD-2026-0137',
    status: 'delivery_attempted',
    customer_name: 'Tobi Adekunle',
    customer_phone: '07056781234',
    delivery_address: '3 Ojota Estate, Lagos',
    order_total: 12400,
    driver_name: 'Bola Akinwale',
    driver_phone: '08056789012',
    driver_plate: 'LAG-890-EF',
    dispatched_at_str: '—',
    eta_minutes: null,
    attempts: 1,
    warning_title: 'Admin Action Required',
    warning_text: 'Driver tapped CUSTOMER UNAVAILABLE. Push + SMS sent. 15-min timer expired. Attempt 1 of 2.',
    items: [
      { name: 'Plantain', qty: '4 hands' },
      { name: 'Ugwu', qty: '3 bunches' }
    ]
  },
  {
    id: 39,
    delivery_ref: 'DEL-2026-0039',
    order_id: 'ORD-2026-0141',
    status: 'assigned',
    customer_name: 'Adaeze Nwosu',
    customer_phone: '07098765432',
    delivery_address: '7 Lekki Phase 1, Lagos',
    order_total: 48100,
    driver_name: 'Femi Adeleye',
    driver_phone: '08078901234',
    driver_plate: 'LAG-456-IJ',
    dispatched_at_str: '—',
    eta_minutes: null,
    attempts: 0,
    status_text: 'Order packed. Driver assigned. Awaiting pickup.',
    items: [
      { name: 'Fresh Tomatoes', qty: '8 kg' },
      { name: 'Red Bell Pepper', qty: '4 kg' },
      { name: 'Spinach', qty: '2 bunches' },
      { name: 'Onions', qty: '1 bag' }
    ]
  }
]

const STATUS_CFG = {
  assigned:           { label:'Awaiting Pickup',     color:'#06b6d4', bg:'#cffafe', icon:'ri-user-location-line' },
  driver_assigned:    { label:'Awaiting Pickup',     color:'#06b6d4', bg:'#cffafe', icon:'ri-user-location-line' },
  out_for_delivery:   { label:'En Route',            color:'#3b82f6', bg:'#dbeafe', icon:'ri-truck-line'         },
  shipped:            { label:'En Route',            color:'#3b82f6', bg:'#dbeafe', icon:'ri-truck-line'         },
  delivery_attempted: { label:'Delivery Attempted',  color:'#f97316', bg:'#ffedd5', icon:'ri-route-line'         },
}
const CONFIDENCE_CFG = {
  High:   { color:'#22c55e', bg:'#dcfce7' }, High:   { color:'#22c55e', bg:'#dcfce7' },
  Medium: { color:'#f59e0b', bg:'#fef3c7' }, medium: { color:'#f59e0b', bg:'#fef3c7' },
  Low:    { color:'#ef4444', bg:'#fee2e2' }, low:    { color:'#ef4444', bg:'#fee2e2' },
  high:   { color:'#22c55e', bg:'#dcfce7' },
}
const LOG_STATUS_CFG = {
  driver_assigned:  { label:'In Progress', color:'#3b82f6', bg:'#dbeafe' },
  out_for_delivery: { label:'In Progress', color:'#3b82f6', bg:'#dbeafe' },
  delivered:        { label:'Delivered',   color:'#22c55e', bg:'#dcfce7' },
  cancelled:        { label:'Cancelled',   color:'var(--text-muted)', bg:'var(--border)' },
  dispute:          { label:'Dispute',     color:'#ef4444', bg:'#fee2e2' },
}

const fmt = n => `₦${Number(n||0).toLocaleString('en-NG')}`
const card = { background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box', color:'var(--text-primary)', background:'var(--bg-card)' }
const lbl  = { display:'block', fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:5 }

const TH = ({ children }) => <th style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'var(--bg-subtle)', borderBottom:'1px solid var(--border)' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', verticalAlign:'middle', ...style }}>{children}</td>

function ModalShell({ title, onClose, children, maxWidth=460, headerBg='#1B4332' }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, width:'100%', maxWidth, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
      <div style={{ background:headerBg, borderRadius:'12px 12px 0 0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ color:'#fff', fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>{title}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:0, display:'flex', alignItems:'center' }}><i className="ri-close-line" /></button>
      </div>
      {children}
    </div>
  )
}

export default function ActiveDeliveries() {
  const [deliveries, setDeliveries]       = useState([])
  const [autoLog, setAutoLog]             = useState([])
  const [stats, setStats]                 = useState({})
  const [drivers, setDrivers]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [activeTab, setActiveTab]         = useState('live')
  const [activeModal, setActiveModal]     = useState(null)
  const [selected, setSelected]           = useState(null)
  const [submitting, setSubmitting]       = useState(false)
  const [reassignDriverId, setReassignDriverId] = useState('')
  const [attemptNote, setAttemptNote]     = useState('')
  const [retryNote, setRetryNote]         = useState('')
  const [cancelReason, setCancelReason]   = useState('')
  const [cancelStep, setCancelStep]       = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [liveRes, logRes, driversRes] = await Promise.all([
        api.get('/admin/deliveries/active', { params:{ search, status: filterStatus==='all'?'':filterStatus } }),
        api.get('/admin/deliveries/auto-log'),
        api.get('/admin/deliveries/drivers', { params:{ status:'active,on_delivery' } }),
      ])
      
      const dbDeliveries = liveRes.data.deliveries || []
      const dbAutoLog = logRes.data.log || []
      
      if (dbDeliveries.length === 0 && !search && filterStatus === 'all') {
        setDeliveries(MOCK_DELIVERIES)
        setStats({
          total: MOCK_DELIVERIES.length,
          en_route: MOCK_DELIVERIES.filter(d => d.status === 'out_for_delivery').length,
          awaiting: MOCK_DELIVERIES.filter(d => d.status === 'assigned').length,
          attempted: MOCK_DELIVERIES.filter(d => d.status === 'delivery_attempted').length
        })
      } else {
        setDeliveries(dbDeliveries)
        setStats(liveRes.data.stats || {})
      }

      if (dbAutoLog.length === 0) {
        setAutoLog([...Array(9)].map((_, i) => ({
          id: 1009 - i,
          created_at: new Date(Date.now() - i * 60000 * 30),
          order_id: `ORD-2026-01${37 + (i % 5)}`,
          customer_name: ['Adaeze Nwosu', 'Tobi Adekunle', 'Seun Adesanya', 'Kemi Balogun', 'Emeka Okafor'][i % 5],
          zone: 'Surulere',
          driver_name: 'Emeka Okafor',
          driver_plate: 'LAG-567-CD',
          matching_rule: 'Zone match',
          confidence_score: i % 3 === 0 ? 'High' : 'Medium',
          order_status: 'delivered'
        })))
      } else {
        setAutoLog(dbAutoLog)
      }

      setDrivers((driversRes.data.drivers||[]).filter(d => !['suspended','off_duty'].includes(d.status)))
    } catch {
      toast.error('Failed to load deliveries')
      setDeliveries(MOCK_DELIVERIES)
      setStats({
        total: MOCK_DELIVERIES.length,
        en_route: MOCK_DELIVERIES.filter(d => d.status === 'out_for_delivery').length,
        awaiting: MOCK_DELIVERIES.filter(d => d.status === 'assigned').length,
        attempted: MOCK_DELIVERIES.filter(d => d.status === 'delivery_attempted').length
      })
    } finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openModal = (type, del) => {
    setSelected(del); setActiveModal(type)
    setReassignDriverId(''); setAttemptNote(''); setRetryNote(''); setCancelReason(''); setCancelStep(1)
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  const doAction = async fn => {
    setSubmitting(true)
    try { await fn(); toast.success('Updated'); closeModal(); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setSubmitting(false) }
  }

  const reassignDriver   = () => doAction(async () => {
    if (!reassignDriverId) throw new Error('Select a driver')
    await api.patch(`/admin/deliveries/${selected.id}/reassign`, { driver_id: parseInt(reassignDriverId) })
  })
  const markAttempted    = () => doAction(() => api.patch(`/admin/deliveries/${selected.id}/attempt`, { notes:attemptNote }))
  const markDelivered    = () => doAction(() => api.patch(`/admin/deliveries/${selected.id}/status`, { status:'delivered', notes:'Confirmed delivered by admin' }))
  const scheduleRetry    = () => doAction(async () => {
    if (!retryNote) throw new Error('Add re-attempt notes')
    await api.patch(`/admin/deliveries/${selected.id}/status`, { status:'assigned', notes:retryNote })
  })
  const cancelAndReturn  = () => doAction(() => api.patch(`/admin/deliveries/${selected.id}/status`, { status:'cancelled', notes:cancelReason }))

  const filtered = deliveries.filter(d => {
    const norm = s => ['assigned','driver_assigned'].includes(s)?'assigned':['shipped','out_for_delivery'].includes(s)?'out_for_delivery':s
    const okStatus = filterStatus==='all' || norm(d.status)===filterStatus
    const q = search.toLowerCase()
    const okSearch = !q||(d.delivery_ref||'').toLowerCase().includes(q)||(d.order_id||'').toLowerCase().includes(q)||(d.customer_name||'').toLowerCase().includes(q)||(d.driver_name||'').toLowerCase().includes(q)
    return okStatus && okSearch
  })

  const pill = (bg, color, icon, text) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:bg, color, whiteSpace:'nowrap' }}>
      {icon && <i className={icon} />}{text}
    </span>
  )

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <PageHeader title="Active Deliveries" subtitle="Live delivery tracking" actions={
        <button onClick={load} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontSize:13, fontFamily:'Nunito, sans-serif', fontWeight:600, color:'var(--text-secondary)' }}>
          <i className="ri-refresh-line" />Refresh
        </button>
      } />

      {/* Tabs */}
      <div style={{ ...card, padding:'6px', marginBottom:20, display:'flex', gap:6 }}>
        {[
          { key:'live',     label:'Live Deliveries',      icon:'ri-truck-line',  count:deliveries.length },
          { key:'auto_log', label:'Auto Assignment Log',  icon:'ri-cpu-line',    count:autoLog.length },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background: activeTab===t.key?'#1B4332':'transparent', color: activeTab===t.key?'#fff':'#6b7280', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>
            <i className={t.icon} />{t.label}
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:50, background: activeTab===t.key?'rgba(255,255,255,0.25)':'var(--border)', color: activeTab===t.key?'#fff':'#374151' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── AUTO LOG ── */}
      {activeTab==='auto_log' && (
        <div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8', fontSize:12, marginBottom:16 }}>
            <i className="ri-cpu-line" style={{ marginTop:1, flexShrink:0, fontSize:14 }} />
            <div><strong>System Auto Assignment</strong> — Every automatic driver match is logged here. Managers can review and override from the Orders page.</div>
          </div>
          <div style={card}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Log ID','Time','Order / Customer','Zone','Auto Driver','Rule','Confidence','Override?','Outcome'].map(h => <TH key={h}>{h}</TH>)}</tr>
                </thead>
                <tbody>
                  {loading && [...Array(5)].map((_,i) => (
                    <tr key={i}>{[...Array(9)].map((_,j) => <TD key={j}><div style={{ height:14, background:'#f0f0f0', borderRadius:4 }} /></TD>)}</tr>
                  ))}
                  {!loading && autoLog.length===0 && (
                    <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-light)', padding:'32px 0', fontSize:13 }}>No auto-assignment records yet</td></tr>
                  )}
                  {!loading && autoLog.map(log => {
                    const conf = CONFIDENCE_CFG[log.confidence_score] || CONFIDENCE_CFG.Medium
                    const sc   = LOG_STATUS_CFG[log.order_status] || { label:log.order_status, color:'var(--text-muted)', bg:'var(--border)' }
                    return (
                      <tr key={log.id}>
                        <TD><span style={{ fontWeight:600, fontSize:12 }}>{log.id}</span></TD>
                        <TD>
                          <div style={{ fontSize:12 }}>{new Date(log.created_at).toLocaleDateString('en-NG')}</div>
                          <div style={{ fontSize:11, color:'var(--text-light)' }}>{new Date(log.created_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</div>
                        </TD>
                        <TD>
                          <div style={{ fontWeight:600, fontSize:12, color:'#3b82f6' }}>{log.order_id}</div>
                          <div style={{ fontSize:11, color:'var(--text-light)' }}>{log.customer_name}</div>
                        </TD>
                        <TD style={{ fontSize:12 }}><i className="ri-map-pin-line" style={{ color:'var(--text-light)', marginRight:4 }} />{log.zone||'—'}</TD>
                        <TD>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:'50%', background:'#dbeafe', color:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>
                              {(log.driver_name||'?').split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:12 }}>{log.driver_name||'—'}</div>
                              <div style={{ fontSize:10, color:'var(--text-light)' }}>{log.driver_plate}</div>
                            </div>
                          </div>
                        </TD>
                        <TD style={{ color:'var(--text-muted)', fontSize:11, maxWidth:200 }}>{log.matching_rule||'Zone match'}</TD>
                        <TD>{pill(conf.bg, conf.color, null, log.confidence_score||'Medium')}</TD>
                        <TD>
                          {log.overridden_by_name
                            ? <div><span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:'#fef3c7', color:'#d97706' }}><i className="ri-edit-line" />Overridden</span><div style={{ fontSize:10, color:'var(--text-light)', marginTop:2 }}>{log.overridden_by_name}</div></div>
                            : <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:'#dcfce7', color:'#16a34a' }}><i className="ri-checkbox-circle-line" />No override</span>
                          }
                        </TD>
                        <TD>{pill(sc.bg, sc.color, null, sc.label)}</TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE DELIVERIES ── */}
      {activeTab==='live' && (
        <>
          {/* Stat Cards */}
          <div className="grid-stats-auto" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'Total Active',       value:parseInt(stats.total||0),    color:'#6366f1', icon:'ri-route-line',          filter:'all'                },
              { label:'En Route',           value:parseInt(stats.en_route||0), color:'#3b82f6', icon:'ri-truck-line',          filter:'out_for_delivery'   },
              { label:'Awaiting Pickup',    value:parseInt(stats.awaiting||0), color:'#06b6d4', icon:'ri-user-location-line',  filter:'assigned'           },
              { label:'Delivery Attempted', value:parseInt(stats.attempted||0),color:'#f97316', icon:'ri-error-warning-line',  filter:'delivery_attempted' },
            ].map(c => (
              <div key={c.label} onClick={() => setFilterStatus(c.filter)} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderLeft:`3px solid ${c.color}` }}>
                <div style={{ width:40, height:40, borderRadius:9, background:c.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={c.icon} style={{ color:c.color, fontSize:18 }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{c.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ padding:'10px 14px', display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative', maxWidth:280, flex:1 }}>
                <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-light)', fontSize:14 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Delivery ref, order, customer, driver…" style={{ ...inp, paddingLeft:32 }} />
              </div>
              {filterStatus!=='all' && (
                <button onClick={() => setFilterStatus('all')} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'7px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontSize:12, fontFamily:'Nunito, sans-serif', color:'var(--text-secondary)' }}>
                  <i className="ri-close-line" />Clear
                </button>
              )}
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:'#dcfce7', color:'#16a34a' }}>
                  <i className="ri-checkbox-blank-circle-fill" style={{ fontSize:7 }} />Live
                </span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{filtered.length} active</span>
              </div>
            </div>
            <div style={{ borderTop:'1px solid var(--border)', overflowX:'auto' }}>
              <div style={{ display:'flex', whiteSpace:'nowrap' }}>
                {[
                  { key:'all',                label:'All Active'          },
                  { key:'out_for_delivery',   label:'En Route'            },
                  { key:'assigned',           label:'Awaiting Pickup'     },
                  { key:'delivery_attempted', label:'Delivery Attempted'  },
                ].map(t => (
                  <button key={t.key} onClick={() => setFilterStatus(t.key)} style={{ padding:'10px 16px', border:'none', borderBottom: filterStatus===t.key?'2px solid #1B4332':'2px solid transparent', background:'transparent', color: filterStatus===t.key?'#1B4332':'#6b7280', fontWeight: filterStatus===t.key?700:400, fontSize:12, cursor:'pointer', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery Cards */}
          {loading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
              {[...Array(4)].map((_,i) => (
                <div key={i} style={{ ...card, height:280, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
                  {[120,80,60,40].map(w => <div key={w} style={{ height:14, background:'#f0f0f0', borderRadius:4, width:`${w}%` }} />)}
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length===0 && (
            <div style={{ ...card, padding:'48px', textAlign:'center', color:'var(--text-light)' }}>
              <i className="ri-truck-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
              <div style={{ fontSize:13 }}>No active deliveries{filterStatus!=='all'?' matching this filter':''}</div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
            {!loading && filtered.map(del => {
              const cfg = STATUS_CFG[del.status] || STATUS_CFG.assigned
              const items = del.items || []
              const isEnRoute  = ['shipped','out_for_delivery'].includes(del.status)
              const isAssigned = ['assigned','driver_assigned'].includes(del.status)
              const isAttempted = del.status==='delivery_attempted'

              return (
                <div key={del.id} style={{ ...card, borderTop:`3px solid ${cfg.color}`, display:'flex', flexDirection:'column' }}>
                  <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:14, flex:1 }}>
                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{del.delivery_ref}</div>
                        <div style={{ fontSize:11, color:'var(--text-light)' }}><i className="ri-link" style={{ marginRight:3 }} />{del.order_id}</div>
                      </div>
                      {pill(cfg.bg, cfg.color, cfg.icon, cfg.label)}
                    </div>

                    {/* Customer */}
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'#dbeafe', color:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {(del.customer_name||'?').split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{del.customer_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{del.customer_phone}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}><i className="ri-map-pin-line" style={{ marginRight:3 }} />{del.delivery_address||'—'}</div>
                      </div>
                      {del.customer_phone && (
                        <a href={`tel:${del.customer_phone}`} style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)', flexShrink:0 }}>
                          <i className="ri-phone-line" style={{ fontSize:13 }} />
                        </a>
                      )}
                    </div>

                    {/* Items */}
                    <div style={{ borderRadius:8, background:'var(--bg-subtle)', padding:'10px 12px', fontSize:12 }}>
                      {items.slice(0,3).map((item,i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between' }}>
                          <span>{item.name}</span><span style={{ color:'var(--text-muted)' }}>{item.qty}</span>
                        </div>
                      ))}
                      {items.length>3 && <div style={{ color:'var(--text-light)' }}>+{items.length-3} more</div>}
                      <div style={{ borderTop:'1px solid var(--border)', marginTop:6, paddingTop:6, fontWeight:700, display:'flex', justifyContent:'space-between' }}>
                        <span>Total</span><span>{fmt(del.order_total)}</span>
                      </div>
                    </div>

                    {/* Driver */}
                    {del.driver_name && (
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:cfg.bg+'40', border:'1px solid '+cfg.color+'30' }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:cfg.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {del.driver_name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:12 }}>{del.driver_name}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{del.driver_phone} · {del.driver_plate}</div>
                        </div>
                        {del.driver_phone && (
                          <a href={`tel:${del.driver_phone}`} style={{ padding:'4px 9px', borderRadius:7, border:'1.5px solid var(--border)', background:'var(--bg-card)', color:'var(--text-secondary)', fontSize:11, display:'inline-flex', alignItems:'center' }}>
                            <i className="ri-phone-line" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* ETA row */}
                    <div style={{ display:'flex', gap:8 }}>
                      {[
                        { label:'DISPATCHED', val:del.dispatched_at_str || (del.dispatched_at?new Date(del.dispatched_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}):'—'), color:null },
                        { label:'ETA', val:del.eta_minutes?`~${del.eta_minutes} min`:'—', color:cfg.color },
                        ...(del.attempts||0)>0?[{ label:'ATTEMPTS', val:`${del.attempts}/2`, color:'#dc2626' }]:[],
                      ].map(box => (
                        <div key={box.label} style={{ flex:1, border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', textAlign:'center', fontSize:12 }}>
                          <div style={{ fontSize:10, color:'var(--text-light)' }}>{box.label}</div>
                          <div style={{ fontWeight:700, color:box.color||'#111827' }}>{box.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Status info text */}
                    {del.status_text && (
                      <div style={{ padding:'10px 12px', background:'var(--bg-subtle)', borderRadius:8, borderLeft:'3px solid var(--orange-accent)', fontSize:11, color:'#475569', marginTop:8 }}>
                        {del.status_text}
                      </div>
                    )}

                    {/* Attempted warning */}
                    {isAttempted && (
                      <div style={{ borderRadius:8, padding:'10px 12px', background:'#fff7ed', borderLeft:'3px solid #f97316', marginTop:8 }}>
                        <div style={{ fontWeight:700, fontSize:12, color:'#dc2626', display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                          <i className="ri-alarm-warning-line" />
                          {del.warning_title || 'Admin Action Required'}
                        </div>
                        <div style={{ fontSize:11, color:'#92400e' }}>
                          {del.warning_text || `Customer unavailable. Attempt ${del.attempts||1} of 2.`}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, marginTop:'auto', flexWrap:'wrap' }}>
                      <button onClick={() => openModal('view', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:600, color:'var(--text-secondary)' }}>
                        <i className="ri-eye-line" />Details
                      </button>
                      {isEnRoute && <>
                        <button onClick={() => openModal('attempted', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'none', background:'#fef3c7', color:'#d97706', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, flex:1 }}>
                          <i className="ri-route-line" />Mark Attempted
                        </button>
                        <button onClick={() => openModal('delivered', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, flex:1 }}>
                          <i className="ri-checkbox-circle-line" />Delivered
                        </button>
                      </>}
                      {isAssigned && (
                        <button onClick={() => openModal('reassign', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--orange-accent)', background:'var(--bg-card)', color:'var(--orange-accent)', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, flex:1, justifyContent:'center' }}>
                          <i className="ri-user-follow-line" />Reassign Driver
                        </button>
                      )}
                      {isAttempted && (del.attempts||0)<2 && (
                        <button onClick={() => openModal('scheduleRetry', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, flex:1 }}>
                          <i className="ri-refresh-line" />Schedule Retry
                        </button>
                      )}
                      {isAttempted && (
                        <button onClick={() => openModal('cancelReturn', del)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontSize:11, fontFamily:'Nunito, sans-serif', fontWeight:700, flex:1 }}>
                          <i className="ri-close-circle-line" />Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {activeModal && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target===e.currentTarget && closeModal()}>

          {/* VIEW */}
          {activeModal==='view' && (
            <ModalShell title={selected.delivery_ref} onClose={closeModal} maxWidth={520}>
              <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:700, textTransform:'uppercase' }}>Customer</div>
                  <div style={{ fontWeight:600 }}>{selected.customer_name}</div>
                  <div style={{ fontSize:13 }}>{selected.customer_phone}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}><i className="ri-map-pin-line" style={{ marginRight:4 }} />{selected.delivery_address||'—'}</div>
                </div>
                {selected.driver_name && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:700, textTransform:'uppercase' }}>Driver</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'1px solid var(--border)', borderRadius:8 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'#dbeafe', color:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {selected.driver_name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600 }}>{selected.driver_name}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.driver_phone} · {selected.driver_plate}</div>
                      </div>
                      <a href={`tel:${selected.driver_phone}`} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5, textDecoration:'none' }}>
                        <i className="ri-phone-line" />Call
                      </a>
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', gap:10, paddingTop:16, borderTop:'1px solid var(--border)' }}>
                  <button onClick={() => { closeModal(); setTimeout(() => openModal('reassign', selected), 100) }} style={{ flex:1, padding:'9px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <i className="ri-user-add-line" />Reassign Driver
                  </button>
                  <button onClick={closeModal} style={{ padding:'9px 16px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Close</button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* REASSIGN */}
          {activeModal==='reassign' && (
            <ModalShell title="Reassign Driver" onClose={closeModal} maxWidth={460}>
              <div style={{ padding:24, overflowY:'auto' }}>
                <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--bg-subtle)', border:'1px solid var(--border)', fontSize:12, color:'var(--text-secondary)', marginBottom:16 }}>
                  <strong>{selected.delivery_ref}</strong> · {selected.customer_name} · {selected.delivery_address}
                </div>
                {selected.driver_name && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Current: <strong>{selected.driver_name}</strong></div>}
                <label style={lbl}>Select Replacement Driver</label>
                {drivers.filter(d=>d.id!==selected.driver_id).map(driver => (
                  <div key={driver.id} onClick={() => setReassignDriverId(String(driver.id))} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', border:`1.5px solid ${Number(reassignDriverId)===driver.id?'#8b5cf6':'var(--border)'}`, borderRadius:8, marginBottom:8, cursor:'pointer', background:Number(reassignDriverId)===driver.id?'#ede9fe':'#fff' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#dbeafe', color:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {driver.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{driver.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{driver.phone} · {driver.zone}</div>
                    </div>
                    {Number(reassignDriverId)===driver.id && <i className="ri-checkbox-circle-fill" style={{ color:'#8b5cf6', fontSize:18 }} />}
                  </div>
                ))}
                {drivers.length===0 && <div style={{ textAlign:'center', color:'var(--text-light)', padding:'24px 0', fontSize:13 }}>No available drivers</div>}
                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={reassignDriver} disabled={!reassignDriverId||submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:(!reassignDriverId||submitting)?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:(!reassignDriverId||submitting)?0.6:1 }}>
                    {submitting?'Reassigning…':'Reassign & Notify'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* ATTEMPTED */}
          {activeModal==='attempted' && (
            <ModalShell title="Mark Delivery Attempted" onClose={closeModal} maxWidth={440}>
              <div style={{ padding:24 }}>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12, marginBottom:16 }}>
                  <i className="ri-route-line" style={{ marginRight:5 }} />
                  Attempt <strong>{(selected.attempts||0)+1}</strong> of 2.
                  {(selected.attempts||0)>=1 && <><br /><strong style={{ color:'#dc2626' }}>This is the final attempt.</strong></>}
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Notes</label>
                  <textarea rows={3} placeholder="e.g. No response after calling twice." value={attemptNote} onChange={e=>setAttemptNote(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={markAttempted} disabled={submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
                    {submitting?'Saving…':'Confirm Attempted'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* DELIVERED */}
          {activeModal==='delivered' && (
            <ModalShell title="Confirm Delivery" onClose={closeModal} maxWidth={420}>
              <div style={{ padding:24 }}>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', fontSize:12, marginBottom:16 }}>
                  Confirming delivery for <strong>{selected.customer_name}</strong> by <strong>{selected.driver_name||'driver'}</strong>.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={markDelivered} disabled={submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
                    {submitting?'Saving…':'Mark as Delivered'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* SCHEDULE RETRY */}
          {activeModal==='scheduleRetry' && (
            <ModalShell title="Schedule New Delivery Attempt" onClose={closeModal} maxWidth={500}>
              <div style={{ padding:24 }}>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>{selected.order_id} · {selected.customer_name}</div>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8', fontSize:12, marginBottom:16 }}>
                  <i className="ri-information-line" style={{ marginRight:5 }} />
                  Scheduling a retry moves this delivery back to <strong>Awaiting Pickup</strong>. <strong>Max 2 attempts total.</strong>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Re-attempt Notes <span style={{ color:'#dc2626' }}>*</span></label>
                  <textarea rows={3} placeholder="e.g. Customer confirmed available after 5pm. Called and verified." value={retryNote} onChange={e=>setRetryNote(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Cancel</button>
                  <button onClick={scheduleRetry} disabled={!retryNote||submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#f59e0b', color:'#fff', cursor:(!retryNote||submitting)?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:(!retryNote||submitting)?0.6:1 }}>
                    {submitting?'Saving…':'Confirm — Schedule Retry'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )}

          {/* CANCEL & RETURN */}
          {activeModal==='cancelReturn' && (
            <div style={{ background:'var(--bg-card)', borderRadius:12, width:'100%', maxWidth:520 }}>
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, fontFamily:'Syne, sans-serif' }}>
                      <i className="ri-close-circle-line" style={{ marginRight:8 }} />
                      {(selected.attempts||0)>=2?'Cancel Order — 2 Attempts Exhausted':'Cancel Order & Return Goods'}
                    </div>
                    <div style={{ fontSize:12, opacity:0.7 }}>{selected.order_id} · {selected.customer_name}</div>
                  </div>
                  <button onClick={closeModal} style={{ background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'#fff', fontSize:18, padding:'4px 8px', borderRadius:6 }}>
                    <i className="ri-close-line" />
                  </button>
                </div>
              </div>
              <div style={{ padding:24 }}>
                {cancelStep===1 && (
                  <>
                    {(selected.attempts||0)>=2 && (
                      <div style={{ padding:'10px 14px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', fontSize:12, marginBottom:16 }}>
                        <i className="ri-alarm-warning-line" style={{ marginRight:5 }} />
                        <strong>Maximum 2 attempts reached.</strong> Order must be cancelled.
                      </div>
                    )}
                    <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', background:'var(--bg-subtle)', fontSize:12, marginBottom:20 }}>
                      <div style={{ fontWeight:700, fontSize:11, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase' }}>This cancellation will trigger:</div>
                      {['Refund via Monnify to customer','Driver instructed to return goods to store','Admin checks goods back in','Stock quantities restored'].map((s,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
                          <i className="ri-arrow-right-s-line" style={{ color:'var(--text-light)' }} /><span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <label style={lbl}>Cancellation Reason <span style={{ color:'#dc2626' }}>*</span></label>
                      <textarea rows={3} placeholder="Why is this being cancelled?" value={cancelReason} onChange={e=>setCancelReason(e.target.value)} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={closeModal} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Go Back</button>
                      <button disabled={!cancelReason} onClick={() => setCancelStep(2)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:!cancelReason?'not-allowed':'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13, opacity:!cancelReason?0.6:1 }}>
                        Next — Return Goods to Store
                      </button>
                    </div>
                  </>
                )}
                {cancelStep===2 && (
                  <>
                    <div style={{ textAlign:'center', marginBottom:24 }}>
                      <div style={{ width:56, height:56, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                        <i className="ri-store-2-fill" style={{ fontSize:24, color:'#3b82f6' }} />
                      </div>
                      <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Instruct Driver to Return Goods</div>
                      <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                        Call <strong>{selected.driver_name||'the driver'}</strong> ({selected.driver_phone||'—'}) and instruct them to return all goods to store.
                      </div>
                    </div>
                    <div style={{ padding:'10px 14px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12, marginBottom:20 }}>
                      <i className="ri-phone-line" style={{ marginRight:5 }} />
                      Driver returning goods from: <strong>{selected.delivery_address||'—'}</strong>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={() => setCancelStep(1)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Back</button>
                      <button onClick={() => setCancelStep(3)} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#1B4332', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
                        Driver Contacted — Next
                      </button>
                    </div>
                  </>
                )}
                {cancelStep===3 && (
                  <>
                    <div style={{ textAlign:'center', marginBottom:24 }}>
                      <div style={{ width:56, height:56, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                        <i className="ri-database-2-fill" style={{ fontSize:24, color:'#22c55e' }} />
                      </div>
                      <div style={{ fontWeight:700, fontSize:16 }}>Confirm Goods Received & Stock Restored</div>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={() => setCancelStep(2)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:600, fontSize:13 }}>Back</button>
                      <button onClick={cancelAndReturn} disabled={submitting} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:13 }}>
                        {submitting?'Cancelling…':'Confirm — Cancel Order & Restore Stock'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
