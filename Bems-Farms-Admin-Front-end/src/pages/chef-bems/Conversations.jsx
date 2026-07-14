import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const AVATAR_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4']
const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_CFG = {
  resolved:  { bg:'#dcfce7', color:'#15803d', label:'Resolved',   icon:'ri-checkbox-circle-line' },
  pending:   { bg:'#fef3c7', color:'#b45309', label:'Pending',    icon:'ri-time-line' },
  escalated: { bg:'#fee2e2', color:'#dc2626', label:'Escalated',  icon:'ri-alarm-warning-line' },
}
const AI_STATUS_CFG = {
  success:          { bg:'#dcfce7', color:'#15803d', label:'AI Responded',    icon:'ri-robot-line' },
  failed:           { bg:'#fee2e2', color:'#dc2626', label:'AI Failed',       icon:'ri-close-circle-line' },
  escalated:        { bg:'#fef3c7', color:'#b45309', label:'AI Escalated',    icon:'ri-alarm-warning-line' },
  'low-confidence': { bg:'#fce7f3', color:'#9d174d', label:'Low Confidence',  icon:'ri-error-warning-line' },
}
const TAG_COLORS = {
  'lactose-intolerant':['#ede9fe','#5b21b6'],'diabetic':['#fce7f3','#9d174d'],'low-carb':['#ecfdf5','#065f46'],
  'vegetarian':['#d1fae5','#065f46'],'nut-allergy':['#fee2e2','#991b1b'],'halal':['#dbeafe','#1e40af'],
  'vegan':['#dcfce7','#14532d'],'gluten-free':['#fef9c3','#713f12'],'pregnancy':['#fce7f3','#9d174d'],
  'high-protein':['#ede9fe','#4c1d95'],'hypertension':['#fee2e2','#991b1b'],'allergy':['#fee2e2','#991b1b'],
  'child':['#dbeafe','#1e40af'],'complaint':['#fee2e2','#991b1b'],
}

const pill = (bg, color, text, icon) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:bg, color, whiteSpace:'nowrap' }}>
    {icon && <i className={icon} />}{text}
  </span>
)

const btnStyle = (bg, color, border) => ({
  display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
  borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
  background: bg, color, border: border ?? 'none',
  fontFamily:'Nunito, sans-serif',
})

function Spinner({ size = 32 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div style={{ width:size, height:size, border:'3px solid #e5e7eb', borderTopColor:'#1B4332', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Parse messages from ai_conversations row
// The DB stores user_message / ai_response as top-level columns, and optionally a messages JSON column
function parseMessages(row) {
  if (row.messages && Array.isArray(row.messages)) return row.messages
  if (row.messages && typeof row.messages === 'string') {
    try { return JSON.parse(row.messages) } catch {}
  }
  const msgs = []
  if (row.user_message) msgs.push({ role:'customer', text: row.user_message, time: row.created_at ? new Date(row.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '' })
  if (row.ai_response)  msgs.push({ role:'ai',       text: row.ai_response,  time: row.updated_at ? new Date(row.updated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '' })
  return msgs
}

export default function Conversations() {
  const { user } = useAuth()
  const [convos, setConvos]         = useState([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [actionLoading, setAction]  = useState(false)

  const fetchConvos = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (statusFilter !== 'all') params.status = statusFilter
      const { data } = await api.get('/admin/chef-bems/conversations', { params })
      setConvos(data.conversations || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      if (data.conversations?.length && !selected) setSelected(data.conversations[0])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchConvos() }, [fetchConvos])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const changeStatus = async (id, status) => {
    setAction(true)
    try {
      const { data } = await api.patch(`/admin/chef-bems/conversations/${id}/status`, { status })
      setConvos(prev => prev.map(c => c.id === id ? { ...c, ...data.conversation } : c))
      if (selected?.id === id) setSelected(prev => ({ ...prev, ...data.conversation }))
      toast.success(`Conversation marked as ${status}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setAction(false)
    }
  }

  const deleteConvo = async (id) => {
    if (!window.confirm('Delete this conversation permanently?')) return
    setAction(true)
    try {
      await api.delete(`/admin/chef-bems/conversations/${id}`)
      setConvos(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(convos.find(c => c.id !== id) || null)
      toast.success('Conversation deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally {
      setAction(false)
    }
  }

  const kpi = {
    total,
    aiSuccess: convos.filter(c => c.ai_status === 'success').length,
    failed:    convos.filter(c => c.ai_status === 'failed').length,
    lowConf:   convos.filter(c => c.ai_status === 'low-confidence').length,
    escalated: convos.filter(c => c.status === 'escalated').length,
  }
  const aiRate = convos.length > 0 ? Math.round((kpi.aiSuccess / convos.length) * 100) : 0

  const KPIS = [
    { label:'Total Conversations', value:total,         icon:'ri-chat-3-line',          bg:'#e0f2fe', color:'#0369a1' },
    { label:'This Page',           value:convos.length, icon:'ri-calendar-check-line',  bg:'#f0f9ff', color:'#0284c7' },
    { label:'AI Success Rate',     value:`${aiRate}%`,  icon:'ri-robot-line',           bg:'#dcfce7', color:'#15803d' },
    { label:'AI Failed',           value:kpi.failed,    icon:'ri-close-circle-line',    bg:'#fee2e2', color:'#dc2626' },
    { label:'Low Confidence',      value:kpi.lowConf,   icon:'ri-error-warning-line',   bg:'#fce7f3', color:'#9d174d' },
    { label:'Escalated',           value:kpi.escalated, icon:'ri-alarm-warning-line',   bg:'#fef3c7', color:'#b45309' },
  ]

  const selConvo = selected ? convos.find(c => c.id === selected.id) || selected : null

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader
        title="Chef Bems AI — Conversations"
        subtitle="Monitor AI-powered dietary conversations. Responses are automated via n8n."
        actions={
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:8, background:'#dcfce7', border:'1px solid #bbf7d0' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a', display:'inline-block', boxShadow:'0 0 0 2px #bbf7d0' }} />
            <span style={{ fontSize:12, color:'#15803d', fontWeight:600 }}>n8n Workflow Active</span>
          </div>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:20 }}>
        {KPIS.map(k => (
          <div key={k.label} style={{ background:k.bg, borderRadius:12, padding:'12px 14px', border:`1px solid ${k.bg}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <i className={k.icon} style={{ fontSize:22, color:k.color }} />
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:k.color, fontFamily:'Syne, sans-serif', lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:10, color:k.color, opacity:0.85, marginTop:2 }}>{k.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attention banners */}
      {kpi.failed > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, marginBottom:12, background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b', fontSize:13 }}>
          <i className="ri-close-circle-line" style={{ fontSize:18, flexShrink:0 }} />
          <span><strong>{kpi.failed} conversation{kpi.failed>1?'s':''}</strong> where the AI failed to respond — a dietary rule may be missing.</span>
        </div>
      )}
      {kpi.lowConf > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, marginBottom:12, background:'#fce7f3', border:'1px solid #f9a8d4', color:'#9d174d', fontSize:13 }}>
          <i className="ri-error-warning-line" style={{ fontSize:18, flexShrink:0 }} />
          <span><strong>{kpi.lowConf} conversation{kpi.lowConf>1?'s':''}</strong> received a low-confidence AI reply. Consider adding a matching dietary rule.</span>
        </div>
      )}

      {/* Chat shell */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', minHeight:580, overflow:'hidden' }}>

        {/* Left panel */}
        <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid #f3f4f6' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ position:'relative', marginBottom:8 }}>
              <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search customer, session, message..."
                style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {[{key:'all',label:`All (${total})`},{key:'pending',label:'Pending'},{key:'resolved',label:'Resolved'},{key:'escalated',label:'Escalated'}].map(f => (
                <button key={f.key} onClick={() => { setStatus(f.key); setPage(1) }} style={{ fontSize:10, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer', fontFamily:'Nunito, sans-serif', background: statusFilter===f.key ? '#1B4332' : '#f1f5f9', color: statusFilter===f.key ? '#fff' : '#475569' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? (
              <Spinner size={24} />
            ) : convos.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 16px', color:'#9ca3af' }}>
                <i className="ri-chat-3-line" style={{ fontSize:32, display:'block', marginBottom:6 }} />
                <div style={{ fontSize:12 }}>No conversations found</div>
              </div>
            ) : convos.map((c, i) => {
              const aiStatusKey = c.ai_status || 'success'
              const aiCfg = AI_STATUS_CFG[aiStatusKey] || AI_STATUS_CFG.success
              const isActive = selConvo?.id === c.id
              const msgs = parseMessages(c)
              const lastMsg = msgs[msgs.length - 1]
              const displayName = c.customer_name || c.session_id || 'Unknown'
              const displayTime = c.created_at ? new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''
              return (
                <button key={c.id} onClick={() => setSelected(c)} style={{ width:'100%', textAlign:'left', border:'none', borderBottom:'1px solid #f9fafb', padding:'12px 14px', cursor:'pointer', background: isActive ? 'rgba(27,67,50,0.07)' : 'transparent', borderLeft:`3px solid ${isActive ? '#1B4332' : 'transparent'}`, display:'block', fontFamily:'Nunito, sans-serif' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, flexShrink:0 }}>
                      {ini(displayName)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                        <span style={{ fontWeight:600, fontSize:12, color:'#111827' }}>{displayName}</span>
                        <span style={{ fontSize:10, color:'#9ca3af' }}>{displayTime}</span>
                      </div>
                      <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {lastMsg ? (
                          lastMsg.role === 'system'
                            ? <span style={{ color:'#dc2626' }}><i className="ri-error-warning-line" style={{ marginRight:4 }} />{lastMsg.text?.slice(0,50)}…</span>
                            : (lastMsg.text || c.user_message || '')?.slice(0,55)
                        ) : (c.user_message || '—')?.slice(0,55)}
                      </p>
                      {pill(aiCfg.bg, aiCfg.color, aiCfg.label, aiCfg.icon)}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px 8px', borderTop:'1px solid #f3f4f6' }}>
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ ...btnStyle('#f1f5f9','#374151'), padding:'4px 8px', opacity:page===1?0.4:1 }}>
                  <i className="ri-arrow-left-s-line" />
                </button>
                <span style={{ fontSize:11, color:'#6b7280' }}>{page}/{pages}</span>
                <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages} style={{ ...btnStyle('#f1f5f9','#374151'), padding:'4px 8px', opacity:page===pages?0.4:1 }}>
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        {selConvo ? (() => {
          const statusKey = selConvo.status || 'pending'
          const aiStatusKey = selConvo.ai_status || 'success'
          const sCfg  = STATUS_CFG[statusKey] || STATUS_CFG.pending
          const aiCfg = AI_STATUS_CFG[aiStatusKey] || AI_STATUS_CFG.success
          const idx   = convos.findIndex(c => c.id === selConvo.id)
          const msgs  = parseMessages(selConvo)
          const displayName = selConvo.customer_name || selConvo.session_id || 'Unknown'
          // Parse tags
          let tags = []
          if (selConvo.dietary_tags) {
            try { tags = typeof selConvo.dietary_tags === 'string' ? JSON.parse(selConvo.dietary_tags) : selConvo.dietary_tags } catch { tags = [selConvo.dietary_tags] }
          }
          return (
            <div style={{ display:'flex', flexDirection:'column' }}>
              {/* Header */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', background:'#f8fafc', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:AVATAR_COLORS[(idx >= 0 ? idx : 0)%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                  {ini(displayName)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>
                    {displayName}
                    <span style={{ fontWeight:400, fontSize:11, color:'#94a3b8', marginLeft:8 }}>#{selConvo.id}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {selConvo.phone && <><span><i className="ri-phone-line" style={{ marginRight:3 }} />{selConvo.phone}</span><span>·</span></>}
                    {selConvo.session_id && <span><i className="ri-fingerprint-line" style={{ marginRight:3 }} />{selConvo.session_id?.slice(0,16)}…</span>}
                    {selConvo.response_time_ms && <><span>·</span><span><i className="ri-timer-line" style={{ marginRight:3 }} />AI in {(selConvo.response_time_ms/1000).toFixed(1)}s</span></>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {tags.map(t => {
                    const [bg,col] = TAG_COLORS[t] || ['#f1f5f9','#475569']
                    return <span key={t} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:50, background:bg, color:col }}>{t}</span>
                  })}
                  {pill(sCfg.bg, sCfg.color, sCfg.label, sCfg.icon)}
                  {pill(aiCfg.bg, aiCfg.color, aiCfg.label, aiCfg.icon)}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14, background:'#f8fafc' }}>
                {msgs.length === 0 ? (
                  <div style={{ textAlign:'center', color:'#9ca3af', padding:'24px 0' }}>
                    {selConvo.user_message ? (
                      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#1e293b', textAlign:'left', maxWidth:'68%' }}>
                        {selConvo.user_message}
                      </div>
                    ) : (
                      <>
                        <i className="ri-chat-3-line" style={{ fontSize:28, display:'block', marginBottom:6 }} />
                        <div style={{ fontSize:12 }}>No message thread available</div>
                      </>
                    )}
                  </div>
                ) : msgs.map((m, mi) => {
                  if (m.role === 'system') return (
                    <div key={mi} style={{ display:'flex', justifyContent:'center' }}>
                      <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'8px 14px', fontSize:11, color:'#92400e', maxWidth:'80%', display:'flex', alignItems:'flex-start', gap:8 }}>
                        <i className="ri-settings-3-line" style={{ flexShrink:0, marginTop:2 }} />
                        <span><strong>System:</strong> {m.text}</span>
                      </div>
                    </div>
                  )
                  const isAI = m.role === 'ai'
                  return (
                    <div key={mi} style={{ display:'flex', gap:10, flexDirection: isAI ? 'row-reverse' : 'row' }}>
                      {isAI
                        ? <div style={{ width:30, height:30, borderRadius:'50%', background:'#10b981', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, alignSelf:'flex-end' }}><i className="ri-robot-line" /></div>
                        : <div style={{ width:30, height:30, borderRadius:'50%', background:AVATAR_COLORS[(idx >= 0 ? idx : 0)%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:10, flexShrink:0, alignSelf:'flex-end' }}>{ini(displayName)}</div>
                      }
                      <div style={{ maxWidth:'68%', background: isAI ? '#d1fae5' : '#fff', border:`1px solid ${isAI ? '#6ee7b7' : '#e2e8f0'}`, borderRadius: isAI ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding:'10px 14px', fontSize:13, color:'#1e293b', whiteSpace:'pre-line' }}>
                        {isAI && (
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                            <i className="ri-robot-line" style={{ color:'#10b981', fontSize:10 }} />
                            <span style={{ fontSize:10, color:'#10b981', fontWeight:600 }}>Chef Bems AI · via n8n</span>
                          </div>
                        )}
                        {m.text}
                        {m.time && <div style={{ fontSize:10, color:'#94a3b8', marginTop:4, textAlign:'right' }}>{m.time}</div>}
                      </div>
                    </div>
                  )
                })}

                {/* Show standalone user_message + ai_response if no messages array */}
                {msgs.length === 0 && selConvo.ai_response && (
                  <div style={{ display:'flex', gap:10, flexDirection:'row-reverse' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#10b981', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, alignSelf:'flex-end' }}><i className="ri-robot-line" /></div>
                    <div style={{ maxWidth:'68%', background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:'12px 12px 2px 12px', padding:'10px 14px', fontSize:13, color:'#1e293b', whiteSpace:'pre-line' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                        <i className="ri-robot-line" style={{ color:'#10b981', fontSize:10 }} />
                        <span style={{ fontSize:10, color:'#10b981', fontWeight:600 }}>Chef Bems AI · via n8n</span>
                      </div>
                      {selConvo.ai_response}
                    </div>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid #f3f4f6', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>
                  <i className="ri-information-line" style={{ marginRight:4 }} />
                  Replies are handled automatically by Chef Bems AI via n8n.
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  {selConvo.status === 'escalated' && (
                    <button onClick={() => changeStatus(selConvo.id, 'resolved')} disabled={actionLoading} style={btnStyle('#fff','#b45309','1.5px solid #b45309')}>
                      <i className="ri-check-line" />Dismiss Escalation
                    </button>
                  )}
                  {selConvo.status !== 'resolved' && (
                    <button onClick={() => changeStatus(selConvo.id, 'resolved')} disabled={actionLoading} style={btnStyle('#1B4332','#fff')}>
                      <i className="ri-checkbox-circle-line" />Mark Resolved
                    </button>
                  )}
                  {selConvo.status !== 'escalated' && selConvo.status !== 'resolved' && (
                    <button onClick={() => changeStatus(selConvo.id, 'escalated')} disabled={actionLoading} style={btnStyle('#fff7ed','#b45309','1.5px solid #fed7aa')}>
                      <i className="ri-alarm-warning-line" />Escalate
                    </button>
                  )}
                  {selConvo.status === 'resolved' && (
                    <button onClick={() => changeStatus(selConvo.id, 'pending')} disabled={actionLoading} style={btnStyle('#f1f5f9','#374151','1.5px solid #e5e7eb')}>
                      <i className="ri-refresh-line" />Reopen
                    </button>
                  )}
                  {user?.role === 'superadmin' && (
                    <button onClick={() => deleteConvo(selConvo.id)} disabled={actionLoading} style={btnStyle('transparent','#dc2626','1.5px solid #fca5a5')}>
                      <i className="ri-delete-bin-line" />Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })() : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'#9ca3af' }}>
            <div style={{ textAlign:'center' }}>
              <i className="ri-chat-3-line" style={{ fontSize:40, display:'block', marginBottom:8 }} />
              <div style={{ fontSize:13 }}>{loading ? 'Loading conversations…' : 'Select a conversation to view'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
