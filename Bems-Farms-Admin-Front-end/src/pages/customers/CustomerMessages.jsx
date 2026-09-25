// Bems-Farms-Admin-Front-end/src/pages/customers/CustomerMessages.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { useRealtimeEvent } from '../../context/RealtimeContext'

function timeSince(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function Avatar({ name, size = 38, isDriver = false }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = isDriver 
    ? ['#059669', '#0d9488', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed']
    : ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
  const color = colors[(name || '').charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0
    }}>
      {initials}
    </div>
  )
}

// ─── Order / Delivery Reference Card (Action Center) ─────────────────────────
function ReferencedOrderCard({ metadata, orderId, isDriver = false }) {
  const [showItems, setShowItems] = useState(false);
  if (!metadata && !orderId) return null;

  const data = metadata || { order_id: orderId, order_ref: orderId };
  const totalStr = data.total ? `₦${Number(data.total).toLocaleString()}` : null;
  const status = data.status || data.order_status || data.delivery_status || 'active';

  const statusColor = {
    delivered: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    in_transit: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    out_for_delivery: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    awaiting_pickup: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    assigned: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    confirmed: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    cancelled: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  }[status] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };

  return (
    <div style={{
      margin: '0 0 12px 0',
      padding: '12px 14px',
      background: '#FFFFFF',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{isDriver ? '🛵' : '📦'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                Order #{data.order_ref || data.order_id || orderId}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 6,
                backgroundColor: statusColor.bg,
                color: statusColor.text,
                border: `1px solid ${statusColor.border}`,
                textTransform: 'uppercase',
              }}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            {totalStr && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                {totalStr} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>({data.payment_method?.toUpperCase() || 'Payment'})</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link
            to={`/orders?search=${data.order_ref || data.order_id || orderId}`}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🔍 View Order</span>
          </Link>
          <Link
            to={`/deliveries/map`}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🗺️ Track Live</span>
          </Link>
        </div>
      </div>

      {/* Details Row */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: '#475569' }}>
        {data.customer_name && (
          <div>
            <span style={{ color: '#94a3b8' }}>Customer:</span> <strong>{data.customer_name}</strong> {data.customer_phone ? `(${data.customer_phone})` : ''}
          </div>
        )}
        {data.driver_name && (
          <div>
            <span style={{ color: '#94a3b8' }}>Courier:</span> <strong>{data.driver_name}</strong> {data.driver_phone ? `(${data.driver_phone})` : ''}
          </div>
        )}
        {data.address && (
          <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#94a3b8' }}>Address:</span> {data.address}
          </div>
        )}
      </div>

      {/* Items Toggle if available */}
      {Array.isArray(data.items) && data.items.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setShowItems(!showItems)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{showItems ? '▼ Hide Items' : `▶ View Items (${data.items.length})`}</span>
          </button>
          {showItems && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 11 }}>
              {data.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{it.quantity}x {it.product_name}</span>
                  {it.total_price && <span>₦{Number(it.total_price).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Customer Chat Pane ───────────────────────────────────────────────────────
export function CustomerChat({ customerId, customerStatus, customerName }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [recentOrders, setRecentOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const bottomRef = useRef(null)

  const isClosed = customerStatus === 'deleted' || customerName === 'Deleted Customer'

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/admin/customers/${customerId}/messages`)
      setMessages(r.data.messages || [])
      setError('')
      await api.post(`/admin/customers/${customerId}/messages/read`).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.message || 'Messages unavailable.')
    }
  }, [customerId])

  // Fetch recent customer orders for @ / / quick picker
  useEffect(() => {
    api.get(`/orders?customer_id=${customerId}&limit=10`)
      .then((res) => {
        setRecentOrders(res.data.orders || [])
      })
      .catch(() => {})
  }, [customerId])

  useEffect(() => {
    let active = true
    setMessages([]); setText(''); setError(''); setSelectedOrder(null)
    const poll = async () => {
      try {
        const r = await api.get(`/admin/customers/${customerId}/messages`)
        if (active) { setMessages(r.data.messages || []); setError('') }
        await api.post(`/admin/customers/${customerId}/messages/read`).catch(() => {})
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to refresh messages.')
      }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => { active = false; clearInterval(t) }
  }, [customerId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Find latest referenced order from messages
  const latestReferencedOrder = messages
    .slice()
    .reverse()
    .find(m => m.metadata || m.order_id);

  const send = async e => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await api.post(`/admin/customers/${customerId}/messages`, {
        message: text,
        order_id: selectedOrder?.id || selectedOrder?.order_ref,
      })
      setText('')
      setSelectedOrder(null)
      setShowMentionMenu(false)
      await load()
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent.')
    } finally { setSending(false) }
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.endsWith('@') || val.endsWith('/')) {
      setShowMentionMenu(true);
    } else if (val === '' || !val.includes('@') && !val.includes('/')) {
      setShowMentionMenu(false);
    }
  };

  const handleSelectOrderReference = (ord) => {
    setSelectedOrder(ord);
    setShowMentionMenu(false);
    setText((prev) => prev.replace(/[@/][a-zA-Z0-9_-]*$/, '') + ` #${ord.order_ref || ord.id} `);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 12,
      border: '1px solid #f1f5f9', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif', background: '#f8fafc' }}>
      
      {/* Top Referenced Order Quick-Card if active in conversation */}
      {latestReferencedOrder && (
        <div style={{ padding: '12px 16px 0', background: '#f8fafc' }}>
          <ReferencedOrderCard
            metadata={latestReferencedOrder.metadata}
            orderId={latestReferencedOrder.order_id}
            isDriver={false}
          />
        </div>
      )}

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isClosed && (
          <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, color: '#92400e', fontSize: 12, textAlign: 'center', lineHeight: 1.4, marginBottom: 8 }}>
            ⚠️ <strong>Customer Account Closed / Deleted:</strong> This user account was removed. Prior chat messages are preserved below for audit and record-keeping.
          </div>
        )}
        {!messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>No messages yet.<br/>Send the first message or wait for customer inquiry.</div>
          </div>
        )}
        {messages.map(m => {
          const isAdmin = m.sender_type === 'admin'
          const isBot = m.sender_type === 'bot'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', gap: 8 }}>
              {!isAdmin && <Avatar name={isBot ? 'Bems AI' : (customerName || 'Customer')} size={28} />}
              <div style={{ maxWidth: '75%' }}>
                {/* Inline Referenced Order Pill */}
                {m.order_id && !latestReferencedOrder && (
                  <div style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                    <span>📦 Order #{m.order_id}</span>
                  </div>
                )}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isAdmin ? '#3b82f6' : (isBot ? '#f0fdf4' : '#fff'),
                  color: isAdmin ? '#fff' : (isBot ? '#166534' : '#1e293b'),
                  border: isBot ? '1px solid #bbf7d0' : 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap'
                }}>
                  {m.message}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3,
                  textAlign: isAdmin ? 'right' : 'left', paddingLeft: isAdmin ? 0 : 4, paddingRight: isAdmin ? 4 : 0 }}>
                  {isAdmin ? (m.admin_name || 'Staff') : (isBot ? '🤖 Bems AI Assistant' : (customerName || 'Customer'))} · {timeSince(m.created_at)}
                </div>
              </div>
              {isAdmin && <Avatar name={m.admin_name || 'Staff'} size={28} />}
            </div>
          )
        })}
        {error && <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Mention / Order Picker Menu */}
      {showMentionMenu && recentOrders.length > 0 && (
        <div style={{
          maxHeight: 180,
          overflowY: 'auto',
          background: '#FFFFFF',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '6px 8px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '4px 8px' }}>
            SELECT AN ORDER TO REFERENCE (@ or /):
          </div>
          {recentOrders.map(ord => (
            <button
              key={ord.id}
              type="button"
              onClick={() => handleSelectOrderReference(ord)}
              style={{
                width: '100%',
                padding: '6px 8px',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div>
                <strong>#{ord.order_ref || ord.id}</strong> · {ord.status}
              </div>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                ₦{Number(ord.total).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selectedOrder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: 6, alignSelf: 'flex-start' }}>
            <span>📦 Referencing: <strong>#{selectedOrder.order_ref || selectedOrder.id}</strong> (₦{Number(selectedOrder.total).toLocaleString()})</span>
            <button type="button" onClick={() => setSelectedOrder(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={handleInputChange}
            maxLength={4000}
            required
            placeholder={isClosed ? "Type an internal staff note on this archived thread…" : "Type your reply… Use @ or / to reference an order"}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
              fontSize: 13, resize: 'none', minHeight: 44, maxHeight: 120, outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5 }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => setShowMentionMenu(!showMentionMenu)}
            title="Reference an Order"
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
            }}
          >
            📦 @
          </button>
          <button type="submit" disabled={sending || !text.trim()}
            style={{ background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff',
              padding: '10px 18px', cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !text.trim() ? .5 : 1, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            {sending ? '…' : '↑ Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Driver Dispatch Chat Pane ────────────────────────────────────────────────
export function DriverDispatchChat({ driverId, driverName, driverPhone, vehicleType }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeDeliveries, setActiveDeliveries] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/admin/customers/drivers/${driverId}/messages`)
      setMessages(r.data.messages || [])
      setError('')
      await api.post(`/admin/customers/drivers/${driverId}/messages/read`).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.message || 'Driver messages unavailable.')
    }
  }, [driverId])

  // Fetch active driver tasks for @ / / quick picker
  useEffect(() => {
    api.get(`/admin/deliveries/active?driver_id=${driverId}`)
      .then((res) => {
        setActiveDeliveries(res.data.deliveries || [])
      })
      .catch(() => {})
  }, [driverId])

  useEffect(() => {
    let active = true
    setMessages([]); setText(''); setError(''); setSelectedDelivery(null)
    const poll = async () => {
      try {
        const r = await api.get(`/admin/customers/drivers/${driverId}/messages`)
        if (active) { setMessages(r.data.messages || []); setError('') }
        await api.post(`/admin/customers/drivers/${driverId}/messages/read`).catch(() => {})
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to refresh driver messages.')
      }
    }
    poll()
    const t = setInterval(poll, 4000)
    return () => { active = false; clearInterval(t) }
  }, [driverId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const latestReferencedTask = messages
    .slice()
    .reverse()
    .find(m => m.metadata || m.order_id || m.delivery_id);

  const send = async e => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await api.post(`/admin/customers/drivers/${driverId}/messages`, {
        message: text,
        order_id: selectedDelivery?.order_id,
        delivery_id: selectedDelivery?.id || selectedDelivery?.delivery_id,
      })
      setText('')
      setSelectedDelivery(null)
      setShowMentionMenu(false)
      await load()
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent to courier.')
    } finally { setSending(false) }
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.endsWith('@') || val.endsWith('/')) {
      setShowMentionMenu(true);
    } else if (val === '' || !val.includes('@') && !val.includes('/')) {
      setShowMentionMenu(false);
    }
  };

  const handleSelectDeliveryReference = (del) => {
    setSelectedDelivery(del);
    setShowMentionMenu(false);
    setText((prev) => prev.replace(/[@/][a-zA-Z0-9_-]*$/, '') + ` #Task-${del.delivery_ref || del.order_id} `);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 12,
      border: '1px solid #f1f5f9', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif', background: '#f8fafc' }}>
      
      {/* Top Referenced Delivery Quick-Card if active in conversation */}
      {latestReferencedTask && (
        <div style={{ padding: '12px 16px 0', background: '#f8fafc' }}>
          <ReferencedOrderCard
            metadata={latestReferencedTask.metadata}
            orderId={latestReferencedTask.order_id}
            isDriver={true}
          />
        </div>
      )}

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32 }}>🛵</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>No dispatch messages yet.<br/>Send a message or delivery instruction to Rider {driverName}.</div>
          </div>
        )}
        {messages.map(m => {
          const isAdmin = m.sender_type === 'admin'
          const isBot = m.sender_type === 'bot'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', gap: 8 }}>
              {!isAdmin && <Avatar name={isBot ? 'Dispatch AI' : (driverName || 'Rider')} size={28} isDriver={!isBot} />}
              <div style={{ maxWidth: '75%' }}>
                {m.order_id && !latestReferencedTask && (
                  <div style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                    <span>🛵 Task #{m.order_id}</span>
                  </div>
                )}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isAdmin ? '#059669' : (isBot ? '#f0fdf4' : '#fff'),
                  color: isAdmin ? '#fff' : (isBot ? '#166534' : '#1e293b'),
                  border: isBot ? '1px solid #bbf7d0' : 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap'
                }}>
                  {m.message}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3,
                  textAlign: isAdmin ? 'right' : 'left', paddingLeft: isAdmin ? 0 : 4, paddingRight: isAdmin ? 4 : 0 }}>
                  {isAdmin ? (m.admin_name || 'Dispatch Staff') : (isBot ? '🤖 Dispatch AI Assistant' : (driverName || 'Courier'))} · {timeSince(m.created_at)}
                </div>
              </div>
              {isAdmin && <Avatar name={m.admin_name || 'Staff'} size={28} />}
            </div>
          )
        })}
        {error && <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Mention / Delivery Picker Menu */}
      {showMentionMenu && activeDeliveries.length > 0 && (
        <div style={{
          maxHeight: 180,
          overflowY: 'auto',
          background: '#FFFFFF',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '6px 8px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '4px 8px' }}>
            SELECT ACTIVE DELIVERY TASK TO REFERENCE (@ or /):
          </div>
          {activeDeliveries.map(del => (
            <button
              key={del.id}
              type="button"
              onClick={() => handleSelectDeliveryReference(del)}
              style={{
                width: '100%',
                padding: '6px 8px',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div>
                <strong>#{del.delivery_ref || del.order_id}</strong> · {del.status}
              </div>
              <span style={{ color: '#059669', fontWeight: 700 }}>
                {del.customer_name || 'Customer'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selectedDelivery && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6, alignSelf: 'flex-start' }}>
            <span>🛵 Referencing Task: <strong>#{selectedDelivery.delivery_ref || selectedDelivery.order_id}</strong></span>
            <button type="button" onClick={() => setSelectedDelivery(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={handleInputChange}
            maxLength={4000}
            required
            placeholder="Type dispatch instruction to rider… Use @ or / to attach task"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
              fontSize: 13, resize: 'none', minHeight: 44, maxHeight: 120, outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5 }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => setShowMentionMenu(!showMentionMenu)}
            title="Reference a Delivery Task"
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: '#059669',
            }}
          >
            🛵 @
          </button>
          <button type="submit" disabled={sending || !text.trim()}
            style={{ background: '#059669', border: 'none', borderRadius: 10, color: '#fff',
              padding: '10px 18px', cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !text.trim() ? .5 : 1, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            {sending ? '…' : '↑ Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Full Unified Support Inbox (Customers & Drivers Tabs) ────────────────────
export default function CustomerMessages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qTab = searchParams.get('tab') || 'customers'
  const qCustomer = searchParams.get('customer') || searchParams.get('id')
  const qDriver = searchParams.get('driver')

  const [activeTab, setActiveTab] = useState(qTab) // 'customers' | 'drivers'
  const [customerConversations, setCustomerConversations] = useState([])
  const [driverConversations, setDriverConversations] = useState([])

  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [selectedDriverId, setSelectedDriverId] = useState(null)
  const [selectedDriver, setSelectedDriver] = useState(null)

  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadCustomerInbox = useCallback(async () => {
    try {
      const r = await api.get('/admin/customers/conversations/inbox')
      const convs = r.data.conversations || []
      setCustomerConversations(convs)
      const target = qCustomer || selectedCustomerId
      if (target && convs.length) {
        const found = convs.find(c => String(c.customer_id) === String(target))
        if (found) {
          setSelectedCustomerId(found.customer_id)
          setSelectedCustomer(found)
        }
      }
    } catch { setError('Customer inbox could not be loaded.') }
  }, [selectedCustomerId, qCustomer])

  const loadDriverInbox = useCallback(async () => {
    try {
      const r = await api.get('/admin/customers/conversations/driver-inbox')
      const convs = r.data.conversations || []
      setDriverConversations(convs)
      const target = qDriver || selectedDriverId
      if (target && convs.length) {
        const found = convs.find(c => String(c.driver_id) === String(target))
        if (found) {
          setSelectedDriverId(found.driver_id)
          setSelectedDriver(found)
        }
      }
    } catch { setError('Driver inbox could not be loaded.') }
  }, [selectedDriverId, qDriver])

  useEffect(() => {
    loadCustomerInbox()
    loadDriverInbox()
    const t = setInterval(() => {
      loadCustomerInbox()
      loadDriverInbox()
    }, 5000)
    return () => clearInterval(t)
  }, [loadCustomerInbox, loadDriverInbox])

  useRealtimeEvent('notification:new', () => { loadCustomerInbox(); loadDriverInbox(); })
  useRealtimeEvent('support:message', loadCustomerInbox)
  useRealtimeEvent('support:driver_message', loadDriverInbox)

  const totalCustomerUnread = customerConversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)
  const totalDriverUnread = driverConversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)

  const filteredCustomers = customerConversations.filter(c =>
    !search || (c.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredDrivers = driverConversations.filter(d =>
    !search || (d.driver_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', fontFamily: 'Inter,system-ui,sans-serif', background: '#f8fafc' }}>

      {/* ── Left Pane: Conversation List ── */}
      <div style={{ width: 340, borderRight: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header & Tabs */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Support Console</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Live Customer & Courier Dispatch</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => { setActiveTab('customers'); setSearchParams({ tab: 'customers' }) }}
              style={{
                flex: 1,
                padding: '7px 10px',
                border: 'none',
                borderRadius: 8,
                background: activeTab === 'customers' ? '#fff' : 'transparent',
                color: activeTab === 'customers' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: activeTab === 'customers' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>👥 Customers</span>
              {totalCustomerUnread > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10 }}>
                  {totalCustomerUnread}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('drivers'); setSearchParams({ tab: 'drivers' }) }}
              style={{
                flex: 1,
                padding: '7px 10px',
                border: 'none',
                borderRadius: 8,
                background: activeTab === 'drivers' ? '#fff' : 'transparent',
                color: activeTab === 'drivers' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: activeTab === 'drivers' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>🛵 Drivers</span>
              {totalDriverUnread > 0 && (
                <span style={{ background: '#059669', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10 }}>
                  {totalDriverUnread}
                </span>
              )}
            </button>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'customers' ? "Search customers…" : "Search couriers…"}
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
              fontSize: 12, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>

        {/* List Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <div style={{ padding: 16, color: '#ef4444', fontSize: 12 }}>{error}</div>}

          {/* CUSTOMERS LIST */}
          {activeTab === 'customers' && (
            <>
              {!filteredCustomers.length && !error && (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 28 }}>📭</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>No customer conversations</div>
                </div>
              )}
              {filteredCustomers.map(c => {
                const isActive = selectedCustomerId === c.customer_id
                const unread = Number(c.unread_count || 0)
                const isClosed = c.customer_status === 'deleted' || (c.customer_name || '').toLowerCase().includes('deleted')
                return (
                  <button key={c.customer_id} onClick={() => { setSelectedCustomerId(c.customer_id); setSelectedCustomer(c) }}
                    style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid #f8fafc',
                      background: isActive ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left',
                      borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all .12s' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Avatar name={c.customer_name} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.customer_name || 'Customer'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{timeSince(c.last_message_at)}</span>
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
            </>
          )}

          {/* DRIVERS LIST */}
          {activeTab === 'drivers' && (
            <>
              {!filteredDrivers.length && !error && (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 28 }}>🛵</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>No driver messages yet</div>
                </div>
              )}
              {filteredDrivers.map(d => {
                const isActive = selectedDriverId === d.driver_id
                const unread = Number(d.unread_count || 0)
                return (
                  <button key={d.driver_id} onClick={() => { setSelectedDriverId(d.driver_id); setSelectedDriver(d) }}
                    style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid #f8fafc',
                      background: isActive ? '#ecfdf5' : '#fff', cursor: 'pointer', textAlign: 'left',
                      borderLeft: isActive ? '3px solid #059669' : '3px solid transparent', transition: 'all .12s' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Avatar name={d.driver_name} size={38} isDriver={true} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.driver_name || 'Courier'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{timeSince(d.last_message_at)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                          <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                            {d.last_message || 'No messages yet'}
                          </span>
                          {unread > 0 && (
                            <span style={{ background: '#059669', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Right Pane: Active Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'customers' && selectedCustomerId ? (
          <>
            {/* Header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={selectedCustomer?.customer_name} size={40} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{selectedCustomer?.customer_name}</span>
                    <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#475569' }}>
                      {selectedCustomer?.customer_phone || selectedCustomer?.customer_email || 'Verified Customer'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Live customer support · Order action center connected</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedCustomer?.customer_phone && (
                  <a
                    href={`tel:${selectedCustomer.customer_phone}`}
                    style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '7px 12px',
                      fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>📞 Call</span>
                  </a>
                )}
                <Link to={`/customers/${selectedCustomerId}`}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 14px',
                    fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
                  Open Profile →
                </Link>
              </div>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, padding: '16px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CustomerChat
                key={selectedCustomerId}
                customerId={selectedCustomerId}
                customerStatus={selectedCustomer?.customer_status}
                customerName={selectedCustomer?.customer_name}
              />
            </div>
          </>
        ) : activeTab === 'drivers' && selectedDriverId ? (
          <>
            {/* Driver Chat Header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={selectedDriver?.driver_name} size={40} isDriver={true} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Rider {selectedDriver?.driver_name}</span>
                    <span style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {selectedDriver?.vehicle_type || 'Courier'} ({selectedDriver?.vehicle_plate || 'Active'})
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Live courier dispatch channel · Connected to GPS tracking</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedDriver?.driver_phone && (
                  <a
                    href={`tel:${selectedDriver.driver_phone}`}
                    style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '7px 12px',
                      fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>📞 Call Rider</span>
                  </a>
                )}
                <Link to={`/deliveries/map`}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 14px',
                    fontSize: 12, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                  Track Courier →
                </Link>
              </div>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, padding: '16px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <DriverDispatchChat
                key={selectedDriverId}
                driverId={selectedDriverId}
                driverName={selectedDriver?.driver_name}
                driverPhone={selectedDriver?.driver_phone}
                vehicleType={selectedDriver?.vehicle_type}
              />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{activeTab === 'customers' ? '💬' : '🛵'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              {activeTab === 'customers' ? 'Select a customer conversation' : 'Select a courier conversation'}
            </div>
            <div style={{ fontSize: 13 }}>Choose an inquiry from the left pane to view order context and reply</div>
          </div>
        )}
      </div>
    </div>
  )
}
