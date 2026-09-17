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
  const [activeTab, setActiveTab] = useState('conversations') // 'conversations' | 'audit_logs'

  // Conversation state
  const [convos, setConvos] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [selected, setSelected] = useState(null)
  const [searchConvos, setSearchConvos] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState(false)

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [auditStats, setAuditStats] = useState({
    requests_24h: 0,
    tokens_24h: 0,
    unique_ips_24h: 0,
    guest_requests_24h: 0,
    registered_requests_24h: 0,
  })
  const [auditSearch, setAuditSearch] = useState('')
  const [auditRoleFilter, setAuditRoleFilter] = useState('all')
  const [auditStatusFilter, setAuditStatusFilter] = useState('all')
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [selectedAuditLog, setSelectedAuditLog] = useState(null)

  // Load conversations
  const loadConversations = useCallback(() => {
    setLoadingConvos(true)
    api.get('/admin/chef-bems/conversations', {
      params: { search: searchConvos || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, limit: 50 },
    })
      .then(res => {
        setConvos(res.data.conversations || [])
        setSelected(prev => prev ? (res.data.conversations || []).find(c => c.id === prev.id) || null : null)
      })
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoadingConvos(false))
  }, [searchConvos, statusFilter])

  // Load Audit Logs
  const loadAuditLogs = useCallback(() => {
    setLoadingAudit(true)
    api.get('/admin/chef-bems/audit-logs', {
      params: {
        search: auditSearch || undefined,
        role: auditRoleFilter !== 'all' ? auditRoleFilter : undefined,
        status: auditStatusFilter !== 'all' ? auditStatusFilter : undefined,
        page: auditPage,
        limit: 25,
      },
    })
      .then(res => {
        setAuditLogs(res.data.logs || [])
        setAuditTotal(res.data.total || 0)
        setAuditTotalPages(res.data.pages || 1)
        if (res.data.stats) setAuditStats(res.data.stats)
      })
      .catch(() => toast.error('Failed to load AI audit logs'))
      .finally(() => setLoadingAudit(false))
  }, [auditSearch, auditRoleFilter, auditStatusFilter, auditPage])

  useEffect(() => {
    const t = setTimeout(loadConversations, 250)
    return () => clearTimeout(t)
  }, [loadConversations])

  useEffect(() => {
    const t = setTimeout(loadAuditLogs, 250)
    return () => clearTimeout(t)
  }, [loadAuditLogs])

  async function setStatus(id, status) {
    setUpdating(true)
    try {
      await api.patch(`/admin/chef-bems/conversations/${id}/status`, { status })
      toast.success(`Marked as ${STATUS_CFG[status]?.label || status}`)
      loadConversations()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update conversation')
    } finally {
      setUpdating(false)
    }
  }

  const messages = Array.isArray(selected?.messages) ? selected.messages : []

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fs-xl mb-1 fw-bold text-dark font-display">
            <i className="ri-robot-line me-2 text-success"></i>Chef Bems AI — Intelligence &amp; Audit Hub
          </h4>
          <p className="text-muted mb-0 fs-13">Monitor live AI customer chat transcripts, inspect token consumption, and trace visitor identities.</p>
        </div>

        {/* View Switcher Tabs */}
        <div className="btn-group shadow-sm p-1 bg-light rounded-3">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'conversations' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
            onClick={() => setActiveTab('conversations')}
          >
            <i className="ri-chat-3-line me-1"></i> Live Chat Sessions ({convos.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'audit_logs' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
            onClick={() => setActiveTab('audit_logs')}
          >
            <i className="ri-shield-keyhole-line me-1"></i> AI Token &amp; Request Audit Log
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Requests (24h)', value: Number(auditStats.requests_24h || 0).toLocaleString(), icon: 'ri-flashlight-line', bg: '#eff6ff', color: '#1d4ed8' },
          { label: 'Tokens Consumed (24h)', value: Number(auditStats.tokens_24h || 0).toLocaleString(), icon: 'ri-cpu-line', bg: '#fef3c7', color: '#b45309' },
          { label: 'Unique IP Visitors (24h)', value: Number(auditStats.unique_ips_24h || 0).toLocaleString(), icon: 'ri-fingerprint-line', bg: '#f3e8ff', color: '#7e22ce' },
          { label: 'Guests vs Registered', value: `${auditStats.guest_requests_24h || 0} / ${auditStats.registered_requests_24h || 0}`, icon: 'ri-user-shared-line', bg: '#dcfce7', color: '#15803d' },
        ].map(k => (
          <div className="col-12 col-sm-6 col-xl-3" key={k.label}>
            <div className="card mb-0 border-0 shadow-sm rounded-4" style={{ background: k.bg }}>
              <div className="card-body py-3 px-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar size-10 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.7)' }}>
                    <i className={`${k.icon} fs-4`} style={{ color: k.color }}></i>
                  </div>
                  <div>
                    <div className="fw-bold fs-5 lh-1" style={{ color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: k.color, opacity: 0.85, marginTop: 4 }}>{k.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TAB 1: CONVERSATIONS */}
      {activeTab === 'conversations' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-0" style={{ minHeight: 580 }}>
          <div className="card-body p-0 d-flex flex-column flex-md-row" style={{ minHeight: 580 }}>

            {/* Left Column: Sessions List */}
            <div className="d-flex flex-column border-end" style={{ width: '100%', maxWidth: 360, flexShrink: 0 }}>
              <div className="p-3 border-bottom bg-light-subtle">
                <div className="position-relative mb-2">
                  <input
                    type="text"
                    className="form-control form-control-sm ps-4"
                    placeholder="Search name, phone, IP, session..."
                    value={searchConvos}
                    onChange={e => setSearchConvos(e.target.value)}
                  />
                  <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 12 }}></i>
                </div>
                <div className="d-flex gap-1 flex-wrap">
                  {['all', 'active', 'completed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className="btn btn-sm"
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        background: statusFilter === s ? '#0ea5e9' : '#fff',
                        color: statusFilter === s ? '#fff' : '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      {s === 'all' ? `All (${convos.length})` : STATUS_CFG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto flex-grow-1" style={{ maxHeight: 520 }}>
                {loadingConvos && (
                  <div className="p-4 text-center text-muted small">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading sessions…
                  </div>
                )}
                {!loadingConvos && convos.length === 0 && (
                  <div className="p-4 text-center text-muted small">
                    <i className="ri-chat-off-line fs-2 d-block text-secondary mb-1"></i>
                    No conversations found.
                  </div>
                )}
                {!loadingConvos && convos.map((c, i) => {
                  const sCfg = STATUS_CFG[c.status] || STATUS_CFG.active
                  const isActive = selected?.id === c.id
                  const label = c.customer_name || c.guest_identifier || c.customer_phone || c.session_id
                  const isGuest = !c.customer_id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="w-100 text-start border-0 border-bottom p-3"
                      style={{
                        background: isActive ? '#f0f9ff' : 'transparent',
                        borderLeft: `4px solid ${isActive ? '#0ea5e9' : 'transparent'}`,
                        display: 'block',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                          style={{ width: 36, height: 36, background: isGuest ? '#64748b' : AVATAR_COLORS[i % AVATAR_COLORS.length], fontSize: 11 }}
                        >
                          {isGuest ? '👤' : ini(label)}
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-semibold text-truncate text-dark" style={{ fontSize: 12, maxWidth: 160 }}>{label}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                              {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-1.5 mb-1">
                            {isGuest ? (
                              <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 9 }}>Guest Visitor</span>
                            ) : (
                              <span className="badge bg-primary-subtle text-primary" style={{ fontSize: 9 }}>Customer #{c.customer_id}</span>
                            )}
                            {c.ip_address && (
                              <code className="text-muted" style={{ fontSize: 9 }}>{c.ip_address}</code>
                            )}
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-1">
                            <span className="badge rounded-pill" style={{ background: sCfg.bg, color: sCfg.color, fontSize: 9 }}>
                              <i className={`${sCfg.icon} me-1`}></i>{sCfg.label}
                            </span>
                            <span className="text-muted" style={{ fontSize: 10 }}>{c.message_count || c.messages?.length || 0} msgs</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Message Transcript */}
            {selected ? (() => {
              const sCfg = STATUS_CFG[selected.status] || STATUS_CFG.active
              const idx = convos.findIndex(c => c.id === selected.id)
              const label = selected.customer_name || selected.guest_identifier || selected.customer_phone || selected.session_id
              const isGuest = !selected.customer_id
              return (
                <div className="d-flex flex-column flex-grow-1">
                  <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 42, height: 42, background: isGuest ? '#64748b' : AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: 13 }}
                      >
                        {isGuest ? '👤' : ini(label)}
                      </div>
                      <div>
                        <div className="fw-bold text-dark font-display" style={{ fontSize: 14 }}>
                          {label}
                          {isGuest && <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: 10 }}>Guest Session</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {selected.customer_email && <><i className="ri-mail-line me-1"></i>{selected.customer_email}<span className="mx-2">·</span></>}
                          {selected.ip_address && <><i className="ri-map-pin-user-line me-1"></i>IP: {selected.ip_address}<span className="mx-2">·</span></>}
                          <i className="ri-time-line me-1"></i>Started {fmtDateTime(selected.created_at)}
                        </div>
                      </div>
                    </div>
                    <span className="badge rounded-pill px-2 py-1" style={{ background: sCfg.bg, color: sCfg.color, fontSize: 11 }}>
                      <i className={`${sCfg.icon} me-1`}></i>{sCfg.label}
                    </span>
                  </div>

                  <div className="flex-grow-1 overflow-auto p-4" style={{ background: '#f8fafc', maxHeight: 460 }}>
                    {messages.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <i className="ri-chat-off-line fs-1 d-block mb-2 text-secondary"></i>
                        No transcript recorded for this session yet.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {messages.map((m, mi) => {
                          const isAI = m.role === 'ai' || m.role === 'assistant'
                          const text = m.text || m.content || JSON.stringify(m)
                          return (
                            <div key={mi} className={`d-flex gap-2 ${isAI ? 'flex-row-reverse' : ''}`}>
                              <div
                                style={{
                                  maxWidth: '75%',
                                  background: isAI ? '#ecfdf5' : '#ffffff',
                                  border: `1px solid ${isAI ? '#a7f3d0' : '#e2e8f0'}`,
                                  borderRadius: isAI ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                  padding: '12px 16px',
                                  fontSize: 13,
                                  color: '#1e293b',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-between mb-1 text-muted" style={{ fontSize: 10 }}>
                                  <span className="fw-bold">{isAI ? '👨‍🍳 Chef Bems AI' : (isGuest ? 'Visitor' : 'Customer')}</span>
                                  <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                </div>
                                {text}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-top d-flex align-items-center justify-content-between bg-white">
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <i className="ri-information-line me-1 text-primary"></i>
                      Automatic conversation telemetry active.
                    </div>
                    <div className="d-flex gap-2">
                      {selected.status !== 'completed' && (
                        <button className="btn btn-sm btn-success" disabled={updating} onClick={() => setStatus(selected.id, 'completed')}>
                          <i className="ri-checkbox-circle-line me-1"></i>Mark Completed
                        </button>
                      )}
                      {selected.status === 'completed' && (
                        <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                          <i className="ri-checkbox-circle-fill me-1"></i>Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })() : (
              <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted bg-light-subtle">
                <div className="text-center">
                  <i className="ri-chat-3-line fs-1 d-block mb-2 text-secondary"></i>
                  Select a chat session on the left to view full transcript
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI TOKEN & REQUEST AUDIT LOG */}
      {activeTab === 'audit_logs' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-0">
          <div className="card-body p-3 border-bottom bg-light-subtle">
            <div className="row g-2 align-items-center justify-content-between">
              {/* Search */}
              <div className="col-12 col-md-4">
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm ps-4"
                    placeholder="Search prompt, response, user, IP..."
                    value={auditSearch}
                    onChange={e => { setAuditSearch(e.target.value); setAuditPage(1) }}
                  />
                  <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 13 }}></i>
                </div>
              </div>

              {/* Filters */}
              <div className="col-12 col-md-8 d-flex gap-2 justify-content-md-end flex-wrap">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={auditRoleFilter}
                  onChange={e => { setAuditRoleFilter(e.target.value); setAuditPage(1) }}
                >
                  <option value="all">All Visitors (Guests &amp; Users)</option>
                  <option value="guest">Anonymous Guests Only</option>
                  <option value="customer">Registered Customers Only</option>
                  <option value="admin">Admin / Staff</option>
                </select>

                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={auditStatusFilter}
                  onChange={e => { setAuditStatusFilter(e.target.value); setAuditPage(1) }}
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Successful</option>
                  <option value="error">Errors / Fallbacks</option>
                  <option value="rate_limited">Rate Limited</option>
                </select>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={loadAuditLogs}
                >
                  <i className="ri-refresh-line"></i> Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Visitor / User</th>
                  <th>IP Address &amp; Device</th>
                  <th>User Prompt</th>
                  <th>AI Response Preview</th>
                  <th>AI Engine</th>
                  <th className="text-end">Tokens</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading AI audit logs…</span>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ri-shield-check-line fs-32 text-secondary mb-2 d-block"></i>
                      No AI audit logs found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => {
                    const isGuest = log.user_role === 'guest' || !log.user_id
                    return (
                      <tr key={log.id}>
                        <td className="text-muted fs-12 text-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${isGuest ? 'bg-secondary-subtle text-secondary' : 'bg-primary-subtle text-primary'}`}>
                              {isGuest ? 'Guest' : (log.user_role || 'User')}
                            </span>
                            <div>
                              <div className="fw-semibold text-dark fs-13">{log.user_name || 'Anonymous Guest'}</div>
                              {log.user_email && <small className="text-muted fs-11">{log.user_email}</small>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-primary fw-bold fs-12">{log.ip_address || '127.0.0.1'}</code>
                          <div className="text-muted fs-11 text-truncate" style={{ maxWidth: 140 }} title={log.user_agent}>
                            {log.user_agent?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
                          </div>
                        </td>
                        <td>
                          <div className="text-dark fs-13 text-truncate" style={{ maxWidth: 220 }} title={log.prompt}>
                            {log.prompt || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="text-muted fs-12 text-truncate" style={{ maxWidth: 220 }} title={log.response}>
                            {log.response || '—'}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{log.source || 'gemini'}</span>
                        </td>
                        <td className="text-end fw-bold fs-12 text-secondary">
                          ~{log.tokens_used || 0}
                        </td>
                        <td>
                          {log.status === 'success' ? (
                            <span className="badge bg-success-subtle text-success">
                              <i className="ri-check-line me-1"></i>Success
                            </span>
                          ) : log.status === 'rate_limited' ? (
                            <span className="badge bg-warning-subtle text-warning">
                              <i className="ri-time-line me-1"></i>Rate Limited
                            </span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger" title={log.error_message}>
                              <i className="ri-error-warning-line me-1"></i>Error
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border py-1 px-2"
                            onClick={() => setSelectedAuditLog(log)}
                            title="View Full Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loadingAudit && auditTotalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between p-3 border-top bg-light-subtle">
              <span className="text-muted fs-13">Showing page {auditPage} of {auditTotalPages} ({auditTotal} total requests)</span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {selectedAuditLog && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="ri-shield-keyhole-line me-2 text-primary"></i>
                  AI Request Inspection &amp; Diagnostic Details
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedAuditLog(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">Visitor / User</label>
                    <strong>{selectedAuditLog.user_name}</strong> ({selectedAuditLog.user_role})
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">IP Address</label>
                    <code>{selectedAuditLog.ip_address}</code>
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">Timestamp</label>
                    <span>{fmtDateTime(selectedAuditLog.created_at)}</span>
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">AI Engine / Source</label>
                    <span className="badge bg-light text-dark border">{selectedAuditLog.source}</span>
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">Estimated Tokens</label>
                    <strong className="text-primary">{selectedAuditLog.tokens_used} tokens</strong>
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted fs-12 d-block">Execution Status</label>
                    <span className={`badge ${selectedAuditLog.status === 'success' ? 'bg-success' : 'bg-danger'}`}>
                      {selectedAuditLog.status}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="fw-semibold fs-13 mb-1">Full User Prompt:</label>
                  <div className="p-3 bg-light rounded-3 text-dark fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedAuditLog.prompt || 'No prompt content'}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="fw-semibold fs-13 mb-1">Full AI Response:</label>
                  <div className="p-3 bg-light-subtle rounded-3 text-dark fs-13 border" style={{ whiteSpace: 'pre-wrap', maxHeight: 250, overflowY: 'auto' }}>
                    {selectedAuditLog.response || 'No response content'}
                  </div>
                </div>

                {selectedAuditLog.error_message && (
                  <div className="mb-3">
                    <label className="fw-semibold fs-13 mb-1 text-danger">Error Diagnostic:</label>
                    <div className="p-2 bg-danger-subtle text-danger rounded-3 fs-12">
                      {selectedAuditLog.error_message}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-muted fs-12 d-block">User-Agent:</label>
                  <small className="text-muted font-monospace">{selectedAuditLog.user_agent}</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAuditLog(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
