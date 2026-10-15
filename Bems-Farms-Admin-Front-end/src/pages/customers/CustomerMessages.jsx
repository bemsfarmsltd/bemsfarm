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

// ─── Order / Task Reference Picker Dropdown & Search Modal ────────────────────
function OrderReferencePicker({
  isOpen,
  onClose,
  onSelect,
  type = 'driver', // 'driver' | 'customer'
  initialItems = [],
}) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const searchTimeoutRef = useRef(null)

  // Live search against /admin/orders?search=...
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/orders?search=${encodeURIComponent(search.trim())}&limit=12`)
        setSearchResults(res.data?.orders || [])
      } catch (err) {
        console.error('Search orders error:', err)
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [search])

  if (!isOpen) return null

  const isDriver = type === 'driver'
  const displayItems = search.trim() ? searchResults : initialItems

  return (
    <div style={{
      borderTop: `1px solid ${isDriver ? '#a7f3d0' : '#bfdbfe'}`,
      borderBottom: '1px solid #e2e8f0',
      background: '#FFFFFF',
      maxHeight: 300,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -6px 18px rgba(0,0,0,0.08)',
      position: 'relative',
      zIndex: 30,
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: isDriver ? '#f0fdf4' : '#eff6ff',
        borderBottom: `1px solid ${isDriver ? '#bbf7d0' : '#dbeafe'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: isDriver ? '#065f46' : '#1e40af' }}>
          <span>{isDriver ? '🛵 Attach Delivery Task / Order' : '📦 Attach Order Reference'}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: isDriver ? '#047857' : '#2563eb',
            background: isDriver ? '#dcfce7' : '#dbeafe',
            padding: '2px 7px',
            borderRadius: 12,
          }}>
            {displayItems.length} available
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 4,
          }}
          title="Close picker"
        >
          ✕
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, fontSize: 13, color: '#94a3b8' }}>🔍</span>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isDriver ? "Search by order #, task, customer name, or phone..." : "Search customer orders by #ID, recipient, or phone..."}
            style={{
              width: '100%',
              padding: '7px 28px 7px 32px',
              border: `1px solid ${isDriver ? '#86efac' : '#93c5fd'}`,
              borderRadius: 8,
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 210, padding: '6px 8px' }}>
        {searching && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            <span>Searching store orders…</span>
          </div>
        )}

        {!searching && displayItems.length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No orders found in recent list.</div>
            <div style={{ fontSize: 11, marginTop: 4, color: '#94a3b8' }}>
              Type an order number (e.g. 1042 or BF-...) in the search box above to reference any order.
            </div>
          </div>
        )}

        {!searching && displayItems.map((item, idx) => {
          const ordId = item.order_ref || item.order_id || item.id;
          const taskRef = item.delivery_ref || (item.delivery_id ? `DEL-${item.delivery_id}` : null);
          const totalVal = item.total ? `₦${Number(item.total).toLocaleString()}` : null;
          const status = item.delivery_status || item.status || 'pending';

          const statusBadge = {
            delivered: { bg: '#ecfdf5', text: '#065f46' },
            in_transit: { bg: '#eff6ff', text: '#1e40af' },
            out_for_delivery: { bg: '#eff6ff', text: '#1e40af' },
            assigned: { bg: '#f5f3ff', text: '#5b21b6' },
            confirmed: { bg: '#ecfdf5', text: '#065f46' },
            processing: { bg: '#fffbeb', text: '#92400e' },
            packed_ready: { bg: '#f0fdf4', text: '#15803d' },
            cancelled: { bg: '#fef2f2', text: '#991b1b' },
          }[status] || { bg: '#f1f5f9', text: '#475569' };

          return (
            <button
              key={`${ordId}-${taskRef || idx}`}
              type="button"
              onClick={() => onSelect(item)}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: '1px solid #f1f5f9',
                background: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.12s ease',
                marginBottom: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDriver ? '#f0fdf4' : '#eff6ff';
                e.currentTarget.style.borderColor = isDriver ? '#a7f3d0' : '#bfdbfe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#f1f5f9';
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                    Order #{ordId}
                  </span>
                  {taskRef && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                      Task #{taskRef}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: statusBadge.bg,
                    color: statusBadge.text,
                    textTransform: 'uppercase',
                  }}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.customer_name ? <span>Customer: <strong>{item.customer_name}</strong> {item.customer_phone ? `(${item.customer_phone})` : ''}</span> : (item.address || 'Produce Order')}
                  {item.address && item.customer_name && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {item.address}</span>}
                </div>
              </div>
              {totalVal && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#16a34a' }}>
                    {totalVal}
                  </div>
                  <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>
                    Attach ↵
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
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
  const fetchOrderOptions = useCallback(async () => {
    try {
      const r = await api.get(`/admin/customers/${customerId}/reference-options`)
      if (r.data?.orders?.length) {
        setRecentOrders(r.data.orders)
        return
      }
    } catch {}
    try {
      const r2 = await api.get(`/admin/orders?customer_id=${customerId}&limit=12`)
      if (r2.data?.orders?.length) {
        setRecentOrders(r2.data.orders)
        return
      }
    } catch {}
    try {
      const r3 = await api.get(`/admin/orders?limit=10`)
      setRecentOrders(r3.data?.orders || [])
    } catch {}
  }, [customerId])

  useEffect(() => {
    fetchOrderOptions()
  }, [fetchOrderOptions])

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
        order_id: selectedOrder?.order_ref || selectedOrder?.order_id || selectedOrder?.id,
        delivery_id: selectedOrder?.delivery_id,
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
    }
  };

  const handleSelectOrderReference = (ord) => {
    setSelectedOrder(ord);
    setShowMentionMenu(false);
    const ordNum = ord.order_ref || ord.order_id || ord.id;
    setText((prev) => {
      const cleaned = prev.replace(/[@/][a-zA-Z0-9_-]*$/, '').trim();
      return cleaned ? `${cleaned} #${ordNum} ` : `#${ordNum} `;
    });
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

      {/* Mention / Order Picker Menu with Live Search */}
      <OrderReferencePicker
        isOpen={showMentionMenu}
        onClose={() => setShowMentionMenu(false)}
        onSelect={handleSelectOrderReference}
        type="customer"
        initialItems={recentOrders}
      />

      {/* Composer */}
      <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selectedOrder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: 8, alignSelf: 'flex-start' }}>
            <span>📦 Referencing: <strong>Order #{selectedOrder.order_ref || selectedOrder.order_id || selectedOrder.id}</strong> {selectedOrder.total ? `(₦${Number(selectedOrder.total).toLocaleString()})` : ''}</span>
            <button type="button" onClick={() => setSelectedOrder(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={handleInputChange}
            maxLength={4000}
            required
            placeholder={isClosed ? "Type an internal staff note on this archived thread…" : "Type your reply… Click 📦 @ or use @ or / to attach an order"}
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
              background: showMentionMenu ? '#dbeafe' : '#f1f5f9',
              border: `1px solid ${showMentionMenu ? '#93c5fd' : '#cbd5e1'}`,
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: '#2563eb',
              transition: 'all 0.15s',
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

// ─── Full Customer Support Inbox ───────────────────────────────────────────
export default function CustomerMessages() {
  const [searchParams] = useSearchParams()
  const qCustomer = searchParams.get('customer') || searchParams.get('id')

  const [customerConversations, setCustomerConversations] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
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

  useEffect(() => {
    loadCustomerInbox()
    const t = setInterval(loadCustomerInbox, 5000)
    return () => clearInterval(t)
  }, [loadCustomerInbox])

  useRealtimeEvent('notification:new', loadCustomerInbox)
  useRealtimeEvent('support:message', loadCustomerInbox)

  const totalCustomerUnread = customerConversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)

  const filteredCustomers = customerConversations.filter(c =>
    !search || (c.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', fontFamily: 'Inter,system-ui,sans-serif', background: '#f8fafc' }}>

      {/* ── Left Pane: Conversation List ── */}
      <div style={{ width: 340, borderRight: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Customer Messages</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Live Customer Support & Inquiries</p>
            </div>
            {totalCustomerUnread > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {totalCustomerUnread} new
              </span>
            )}
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
              fontSize: 12, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>

        {/* List Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <div style={{ padding: 16, color: '#ef4444', fontSize: 12 }}>{error}</div>}

          {!filteredCustomers.length && !error && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 28 }}>📭</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>No customer conversations</div>
            </div>
          )}
          {filteredCustomers.map(c => {
            const isActive = selectedCustomerId === c.customer_id
            const unread = Number(c.unread_count || 0)
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
        </div>
      </div>

      {/* ── Right Pane: Active Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedCustomerId ? (
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              Select a customer conversation
            </div>
            <div style={{ fontSize: 13 }}>Choose an inquiry from the left pane to view order context and reply</div>
          </div>
        )}
      </div>
    </div>
  )
}
