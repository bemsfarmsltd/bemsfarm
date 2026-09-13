import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const AVATAR_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4']
const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const STATUS_CFG = {
  active:    { bg: '#dbeafe', color: '#1e40af', label: 'Active',    icon: 'ri-chat-3-line' },
  completed: { bg: '#dcfce7', color: '#15803d', label: 'Completed', icon: 'ri-checkbox-circle-line' },
  escalated: { bg: '#fee2e2', color: '#dc2626', label: 'Escalated', icon: 'ri-alarm-warning-line' },
  abandoned: { bg: '#f1f5f9', color: '#64748b', label: 'Abandoned', icon: 'ri-close-circle-line' },
}

export default function Conversations() {
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/conversations', {
      params: { search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, limit: 50 },
    })
      .then(res => {
        setConvos(res.data.conversations || [])
        setSelected(prev => prev ? (res.data.conversations || []).find(c => c.id === prev.id) || null : null)
      })
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoading(false))
  }, [search, statusFilter])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const kpi = {
    total: convos.length,
    active: convos.filter(c => c.status === 'active').length,
    escalated: convos.filter(c => c.status === 'escalated').length,
    completed: convos.filter(c => c.status === 'completed').length,
  }

  async function setStatus(id, status) {
    setUpdating(true)
    try {
      await api.patch(`/admin/chef-bems/conversations/${id}/status`, { status })
      toast.success(`Marked as ${STATUS_CFG[status]?.label || status}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update conversation')
    } finally {
      setUpdating(false)
    }
  }

  const messages = Array.isArray(selected?.messages) ? selected.messages : []

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-robot-line me-2 text-success"></i>Chef Bems AI — Conversations
          </h4>
          <p className="text-muted mb-0">Monitor AI-powered customer chat sessions.</p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Total Sessions', value: kpi.total,     icon: 'ri-chat-3-line',           bg: '#e0f2fe', color: '#0369a1' },
          { label: 'Active',         value: kpi.active,    icon: 'ri-flashlight-line',       bg: '#dbeafe', color: '#1e40af' },
          { label: 'Escalated',      value: kpi.escalated, icon: 'ri-alarm-warning-line',    bg: '#fee2e2', color: '#dc2626' },
          { label: 'Completed',      value: kpi.completed, icon: 'ri-checkbox-circle-line',  bg: '#dcfce7', color: '#15803d' },
        ].map(k => (
          <div className="col" key={k.label}>
            <div className="card mb-0 border-0" style={{ background: k.bg }}>
              <div className="card-body py-3 px-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`${k.icon} fs-4`} style={{ color: k.color }}></i>
                  <div>
                    <div className="fw-bold fs-5 lh-1" style={{ color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: k.color, opacity: 0.85 }}>{k.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-0" style={{ minHeight: 580 }}>
        <div className="card-body p-0 d-flex" style={{ minHeight: 580 }}>

          <div className="d-flex flex-column border-end" style={{ width: 320, flexShrink: 0 }}>
            <div className="p-3 border-bottom">
              <input type="text" className="form-control form-control-sm mb-2"
                placeholder="Search phone, name, session..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <div className="d-flex gap-1 flex-wrap">
                {['all', 'active', 'escalated', 'completed', 'abandoned'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '2px 8px', background: statusFilter === s ? '#0ea5e9' : '#f1f5f9', color: statusFilter === s ? '#fff' : '#475569', border: 'none' }}>
                    {s === 'all' ? `All (${kpi.total})` : STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto flex-grow-1">
              {loading && <div className="p-4 text-center text-muted small">Loading…</div>}
              {!loading && convos.length === 0 && <div className="p-4 text-center text-muted small">No conversations found.</div>}
              {!loading && convos.map((c, i) => {
                const sCfg = STATUS_CFG[c.status] || STATUS_CFG.active
                const isActive = selected?.id === c.id
                const label = c.customer_name || c.customer_phone || c.session_id
                return (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className="w-100 text-start border-0 border-bottom p-3"
                    style={{ background: isActive ? '#f0f9ff' : 'transparent', borderLeft: `3px solid ${isActive ? '#0ea5e9' : 'transparent'}`, display: 'block' }}>
                    <div className="d-flex align-items-start gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 34, height: 34, background: AVATAR_COLORS[i % AVATAR_COLORS.length], fontSize: 11 }}>
                        {ini(label)}
                      </div>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-semibold text-truncate" style={{ fontSize: 12, maxWidth: 150 }}>{label}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}</span>
                        </div>
                        <p className="text-truncate mb-1" style={{ fontSize: 11, color: '#64748b' }}>
                          {c.current_intent ? `Intent: ${c.current_intent}` : `${c.channel || 'web'} session`}
                        </p>
                        <span className="badge rounded-pill" style={{ background: sCfg.bg, color: sCfg.color, fontSize: 9 }}>
                          <i className={`${sCfg.icon} me-1`}></i>{sCfg.label}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selected ? (() => {
            const sCfg = STATUS_CFG[selected.status] || STATUS_CFG.active
            const idx = convos.findIndex(c => c.id === selected.id)
            const label = selected.customer_name || selected.customer_phone || selected.session_id
            return (
              <div className="d-flex flex-column flex-grow-1">
                <div className="p-3 border-bottom d-flex align-items-center gap-3" style={{ background: '#f8fafc' }}>
                  <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                    style={{ width: 40, height: 40, background: AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: 13 }}>
                    {ini(label)}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold" style={{ fontSize: 14 }}>{label}
                      <span className="text-muted ms-2" style={{ fontSize: 11, fontWeight: 400 }}>{selected.session_id}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {selected.customer_phone && <><i className="ri-phone-line me-1"></i>{selected.customer_phone}<span className="mx-2">·</span></>}
                      <i className="ri-time-line me-1"></i>Started {fmtDateTime(selected.started_at)}
                      {selected.order_id && <><span className="mx-2">·</span><i className="ri-shopping-bag-line me-1"></i>Order #{selected.order_id}</>}
                    </div>
                  </div>
                  <span className="badge rounded-pill" style={{ background: sCfg.bg, color: sCfg.color, fontSize: 11 }}>
                    <i className={`${sCfg.icon} me-1`}></i>{sCfg.label}
                  </span>
                </div>

                <div className="flex-grow-1 overflow-auto p-4" style={{ background: '#f8fafc' }}>
                  {messages.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="ri-chat-off-line fs-1 d-block mb-2"></i>
                      No message log recorded for this session yet.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {messages.map((m, mi) => {
                        const isAI = m.role === 'ai' || m.role === 'assistant'
                        const text = m.text || m.content || JSON.stringify(m)
                        return (
                          <div key={mi} className={`d-flex gap-2 ${isAI ? 'flex-row-reverse' : ''}`}>
                            <div style={{
                              maxWidth: '68%',
                              background: isAI ? '#d1fae5' : '#fff',
                              border: `1px solid ${isAI ? '#6ee7b7' : '#e2e8f0'}`,
                              borderRadius: isAI ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              padding: '10px 14px', fontSize: 13, color: '#1e293b', whiteSpace: 'pre-line',
                            }}>
                              {text}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {selected.cart_snapshot && Array.isArray(selected.cart_snapshot) && selected.cart_snapshot.length > 0 && (
                    <div className="mt-4 p-3 rounded" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                      <div className="fw-semibold mb-2" style={{ fontSize: 12 }}><i className="ri-shopping-cart-2-line me-1"></i>Cart Snapshot</div>
                      <ul className="mb-0" style={{ fontSize: 12 }}>
                        {selected.cart_snapshot.map((item, ii) => (
                          <li key={ii}>{item.name || item.product_name || 'Item'} {item.quantity ? `×${item.quantity}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-3 border-top d-flex align-items-center justify-content-between" style={{ background: '#fff' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <i className="ri-information-line me-1"></i>
                    Chef Bems AI handles replies automatically.
                  </div>
                  <div className="d-flex gap-2">
                    {selected.status === 'escalated' && (
                      <button className="btn btn-sm btn-outline-warning" disabled={updating} onClick={() => setStatus(selected.id, 'active')}>
                        <i className="ri-check-line me-1"></i>Dismiss Escalation
                      </button>
                    )}
                    {selected.status !== 'completed' && (
                      <button className="btn btn-sm btn-success" disabled={updating} onClick={() => setStatus(selected.id, 'completed')}>
                        <i className="ri-checkbox-circle-line me-1"></i>Mark Completed
                      </button>
                    )}
                    {selected.status === 'completed' && (
                      <span style={{ fontSize: 12, color: '#15803d' }}>
                        <i className="ri-checkbox-circle-fill me-1"></i>Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })() : (
            <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
              <div className="text-center">
                <i className="ri-chat-3-line fs-1 d-block mb-2"></i>
                Select a conversation to view
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
