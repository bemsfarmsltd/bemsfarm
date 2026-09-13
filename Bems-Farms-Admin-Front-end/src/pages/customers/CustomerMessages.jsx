import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

function timeSince(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function Avatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
  const color  = colors[(name || '').charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ─── Embedded chat widget used in CustomerDetail ─────────────────────────────
export function CustomerChat({ customerId }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [error, setError]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/admin/customers/${customerId}/messages`)
      setMessages(r.data.messages || [])
      await api.post(`/admin/customers/${customerId}/messages/read`).catch(() => {})
    } catch { setError('Messages unavailable.') }
  }, [customerId])

  useEffect(() => {
    let active = true
    setMessages([]); setText(''); setError('')
    const poll = async () => {
      try {
        const r = await api.get(`/admin/customers/${customerId}/messages`)
        if (active) { setMessages(r.data.messages || []); setError('') }
        await api.post(`/admin/customers/${customerId}/messages/read`).catch(() => {})
      } catch { if (active) setError('Unable to refresh messages.') }
    }
    poll()
    const t = setInterval(poll, 4000)
    return () => { active = false; clearInterval(t) }
  }, [customerId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async e => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await api.post(`/admin/customers/${customerId}/messages`, { message: text })
      setText(''); await load(); setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent.')
    } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480, borderRadius: 12,
      border: '1px solid #f1f5f9', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>No messages yet.<br/>Send the first message to start the conversation.</div>
          </div>
        )}
        {messages.map(m => {
          const isAdmin = m.sender_type === 'admin'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', gap: 8 }}>
              {!isAdmin && <Avatar name="Customer" size={28} />}
              <div style={{ maxWidth: '70%' }}>
                <div style={{ padding: '10px 14px', borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isAdmin ? '#3b82f6' : '#fff',
                  color: isAdmin ? '#fff' : '#1e293b',
                  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {m.message}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3,
                  textAlign: isAdmin ? 'right' : 'left', paddingLeft: isAdmin ? 0 : 4, paddingRight: isAdmin ? 4 : 0 }}>
                  {isAdmin ? (m.admin_name || 'Staff') : 'Customer'} · {timeSince(m.created_at)}
                </div>
              </div>
              {isAdmin && <Avatar name={m.admin_name || 'Staff'} size={28} />}
            </div>
          )
        })}
        {error && <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)} maxLength={4000} required
          placeholder="Type your reply to the customer…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
            fontSize: 13, resize: 'none', minHeight: 44, maxHeight: 120, outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.5 }}
          rows={1}
        />
        <button type="submit" disabled={sending || !text.trim()}
          style={{ background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff',
            padding: '10px 18px', cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !text.trim() ? .5 : 1, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
          {sending ? '…' : '↑ Send'}
        </button>
      </form>
    </div>
  )
}

// ─── Full Customer Messages Inbox page ───────────────────────────────────────
export default function CustomerMessages() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected]           = useState(null)
  const [selectedName, setSelectedName]   = useState('')
  const [error, setError]                 = useState('')
  const [search, setSearch]               = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const r = await api.get('/admin/customers/conversations/inbox')
        if (active) { setConversations(r.data.conversations || []); setError('') }
      } catch { if (active) setError('Inbox could not be loaded.') }
    }
    load()
    const t = setInterval(load, 5000)
    return () => { active = false; clearInterval(t) }
  }, [])

  const totalUnread = conversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)

  const filtered = conversations.filter(c =>
    !search || (c.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', fontFamily: 'Inter,system-ui,sans-serif', background: '#f8fafc' }}>

      {/* ── Left Pane: Conversation List ── */}
      <div style={{ width: 320, borderRight: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Support Inbox</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Customer conversations</p>
            </div>
            {totalUnread > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {totalUnread}
              </span>
            )}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name…"
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
              fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <div style={{ padding: 16, color: '#ef4444', fontSize: 12 }}>{error}</div>}
          {!filtered.length && !error && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 28 }}>📭</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>No conversations yet</div>
            </div>
          )}
          {filtered.map(c => {
            const isActive = selected === c.customer_id
            const unread   = Number(c.unread_count || 0)
            return (
              <button key={c.customer_id} onClick={() => { setSelected(c.customer_id); setSelectedName(c.customer_name) }}
                style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid #f8fafc',
                  background: isActive ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all .12s' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar name={c.customer_name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: unread > 0 ? 700 : 500, fontSize: 13, color: '#0f172a' }}>
                        {c.customer_name || 'Unknown Customer'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeSince(c.last_message_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                        {c.last_message || 'No messages yet'}
                      </span>
                      {unread > 0 && (
                        <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right Pane: Active Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={selectedName} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{selectedName}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Live support conversation · Auto-refreshing</div>
                </div>
              </div>
              <Link to={`/customers/${selected}`}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 14px',
                  fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
                Open Profile →
              </Link>
            </div>
            {/* Chat body */}
            <div style={{ flex: 1, padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CustomerChat key={selected} customerId={selected} />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Select a conversation</div>
            <div style={{ fontSize: 13 }}>Choose a customer from the list to start replying</div>
          </div>
        )}
      </div>
    </div>
  )
}
