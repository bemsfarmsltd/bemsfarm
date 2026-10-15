import { useState, useEffect, useCallback, useRef } from 'react'
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

function DriverAvatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#059669', '#0d9488', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed']
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

function StaffAvatar({ name, size = 38 }) {
  const initials = (name || 'Staff').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#0F172A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0
    }}>
      {initials}
    </div>
  )
}

// ─── Order Reference Banner ──────────────────────────────────────────────────
function OrderReferenceBanner({ order, delivery, isAssigned = true }) {
  const [showItems, setShowItems] = useState(false)
  if (!order) return null

  const ordRef = order.order_ref || order.id
  const totalStr = order.total ? `₦${Number(order.total).toLocaleString()}` : null
  const status = delivery?.status || order.delivery_status || order.status || 'pending'

  const statusColor = {
    delivered: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    in_transit: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    out_for_delivery: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    awaiting_pickup: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    assigned: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    confirmed: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    cancelled: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    processing: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  }[status] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' }

  return (
    <div style={{
      margin: '0 0 14px 0',
      padding: '12px 16px',
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📦</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 14, color: '#0F172A' }}>
                Order #{ordRef}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
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
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginTop: 2 }}>
                {totalStr} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>({order.payment_method?.toUpperCase() || 'COD / Online'})</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#64748B', textAlign: 'right' }}>
          <div>Customer: <strong style={{ color: '#0F172A' }}>{order.customer_name || 'Customer'}</strong> {order.customer_phone ? `(${order.customer_phone})` : ''}</div>
          {order.delivery_address && (
            <div style={{ marginTop: 2, maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📍 {order.delivery_address}
            </div>
          )}
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #F1F5F9' }}>
          <button
            type="button"
            onClick={() => setShowItems(!showItems)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 11,
              fontWeight: 700,
              color: '#059669',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{showItems ? '▼ Hide Items' : `▶ View Produce Items (${order.items.length})`}</span>
          </button>
          {showItems && (
            <div style={{ marginTop: 6, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 11 }}>
              {order.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>{it.quantity}x {it.name || it.product_name}</span>
                  {it.subtotal && <span>₦{Number(it.subtotal).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Single Order Courier Dispatch Chat ──────────────────────────────────────
function SingleOrderDispatchChat({ orderId, initialDriver = null, onOpenAllHistory = null }) {
  const [loading, setLoading] = useState(true)
  const [orderData, setOrderData] = useState(null)
  const [driver, setDriver] = useState(initialDriver)
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [assigning, setAssigning] = useState(false)

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showAllHistory, setShowAllHistory] = useState(false)

  const messagesFeedRef = useRef(null)

  // 1. Fetch order details & assigned driver
  const loadOrderContext = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/deliveries/order-fleet/${encodeURIComponent(orderId)}`)
      if (res.data?.success) {
        setOrderData(res.data)
        if (res.data.driver) {
          setDriver(res.data.driver)
        }
        if (res.data.availableDrivers) {
          setAvailableDrivers(res.data.availableDrivers)
        }
      }
    } catch (err) {
      console.error('Failed to load order fleet context:', err)
      setError('Could not load order dispatch details.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrderContext()
  }, [loadOrderContext])

  // 2. Poll messages for this driver, optionally filtered strictly by orderId
  const loadMessages = useCallback(async () => {
    if (!driver?.id) return
    try {
      const url = showAllHistory
        ? `/admin/customers/drivers/${driver.id}/messages`
        : `/admin/customers/drivers/${driver.id}/messages?order_id=${encodeURIComponent(orderId)}`
      const r = await api.get(url)
      setMessages(r.data?.messages || [])
      setError('')
      await api.post(`/admin/customers/drivers/${driver.id}/messages/read`).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.message || 'Courier messages unavailable.')
    }
  }, [driver?.id, orderId, showAllHistory])

  useEffect(() => {
    loadMessages()
    const t = setInterval(loadMessages, 4000)
    return () => clearInterval(t)
  }, [loadMessages])

  // Auto-scroll ONLY internal chat box, never the outer modal
  useEffect(() => {
    if (messagesFeedRef.current) {
      messagesFeedRef.current.scrollTop = messagesFeedRef.current.scrollHeight
    }
  }, [messages])

  // 3. Send message for this order
  const sendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending || !driver?.id) return
    setSending(true)
    try {
      await api.post(`/admin/customers/drivers/${driver.id}/messages`, {
        message: text.trim(),
        order_id: orderData?.order?.order_ref || orderData?.order?.id || orderId,
        delivery_id: orderData?.delivery?.id,
      })
      setText('')
      await loadMessages()
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send dispatch message to courier.')
    } finally {
      setSending(false)
    }
  }

  // 4. Quick driver assignment if none assigned
  const handleAssignDriver = async (e) => {
    const newDriverId = e.target.value
    if (!newDriverId) return
    setAssigning(true)
    try {
      const targetOrdId = orderData?.order?.id || orderId
      await api.patch(`/admin/orders/${targetOrdId}/assign-driver`, { driver_id: newDriverId })
      await loadOrderContext()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign driver to order.')
    } finally {
      setAssigning(false)
    }
  }

  if (loading && !orderData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Loading order dispatch channel…</div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 560,
      background: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* ── Top Courier & Dispatch Control Bar ── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {driver ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DriverAvatar name={driver.name} size={42} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: '#0F172A' }}>
                  Courier {driver.name}
                </span>
                <span style={{
                  fontSize: 11,
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                }}>
                  {driver.vehicle_type || 'Motorcycle'} ({driver.vehicle_plate || 'Active'})
                </span>
                <span style={{
                  fontSize: 11,
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                }}>
                  📦 Order #{orderData?.order?.order_ref || orderId}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Live dispatch connection for Order #{orderData?.order?.order_ref || orderId}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
            }}>
              🛵
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#B45309' }}>
                No Courier Assigned Yet for Order #{orderData?.order?.order_ref || orderId}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Assign a driver below to open instant live dispatch communication:
              </div>
            </div>
            <div style={{ marginLeft: 8 }}>
              <select
                disabled={assigning}
                onChange={handleAssignDriver}
                defaultValue=""
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled>Select Courier to Assign…</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehicle_type || 'Vehicle'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Right Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {driver?.phone && (
            <a
              href={`tel:${driver.phone}`}
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#059669',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>📞 Call Courier</span>
            </a>
          )}

          {driver && (
            <button
              type="button"
              onClick={() => setShowAllHistory(!showAllHistory)}
              style={{
                background: showAllHistory ? '#0F172A' : '#F1F5F9',
                color: showAllHistory ? '#FFFFFF' : '#475569',
                border: 'none',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.12s',
              }}
              title="Toggle between this order's chat and all historical driver messages"
            >
              <span>{showAllHistory ? '🔒 Order Only Chat' : '📜 Driver All-Chat History'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Order Reference Banner ── */}
      <div style={{ padding: '12px 20px 0', background: '#F8FAFC' }}>
        <OrderReferenceBanner
          order={orderData?.order}
          delivery={orderData?.delivery}
        />
      </div>

      {/* ── Messages Feed (Strictly For This Order) ── */}
      <div
        ref={messagesFeedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: '#F8FAFC',
        }}
      >
        {!driver && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8', padding: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛵</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#475569' }}>
              Assign a courier to start dispatch communication
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Select a courier from the dropdown above to send route details for this order.
            </div>
          </div>
        )}

        {driver && !messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8', padding: 24 }}>
            <div style={{ fontSize: 36 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>
              Order #{orderData?.order?.order_ref || orderId} Dispatch Channel
            </div>
            <div style={{ fontSize: 12, marginTop: 4, maxWidth: 440 }}>
              No messages have been sent for this order yet. Send delivery directions, gate codes, or customer notes to Courier {driver.name} below.
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isAdmin = m.sender_type === 'admin'
          const isBot = m.sender_type === 'bot'
          const msgOrderRef = m.order_id || m.metadata?.order_ref

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                gap: 8,
              }}
            >
              {!isAdmin && <DriverAvatar name={isBot ? 'Dispatch AI' : (driver.name || 'Courier')} size={28} />}
              <div style={{ maxWidth: '75%' }}>
                {msgOrderRef && showAllHistory && (
                  <div style={{
                    marginBottom: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#DCFCE7',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    <span>🛵 Order #{msgOrderRef}</span>
                  </div>
                )}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isAdmin ? '#059669' : (isBot ? '#F0FDF4' : '#FFFFFF'),
                  color: isAdmin ? '#FFFFFF' : (isBot ? '#166534' : '#0F172A'),
                  border: isBot ? '1px solid #BBF7D0' : (isAdmin ? 'none' : '1px solid #E2E8F0'),
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.message}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#94A3B8',
                  marginTop: 3,
                  textAlign: isAdmin ? 'right' : 'left',
                  paddingLeft: isAdmin ? 0 : 4,
                  paddingRight: isAdmin ? 4 : 0,
                }}>
                  {isAdmin ? (m.admin_name || 'Fleet Dispatcher') : (isBot ? '🤖 Dispatch AI' : (driver.name || 'Courier'))} · {timeSince(m.created_at)}
                </div>
              </div>
              {isAdmin && <StaffAvatar name={m.admin_name || 'Fleet Dispatch'} size={28} />}
            </div>
          )
        })}
        {error && <div style={{ textAlign: 'center', color: '#EF4444', fontSize: 12 }}>{error}</div>}
      </div>

      {/* ── Composer (Dedicated to This Order) ── */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!driver}
          placeholder={driver ? `Send dispatch instruction for Order #${orderData?.order?.order_ref || orderId} to Courier ${driver.name}…` : "Assign a courier above to send messages…"}
          style={{
            flex: 1,
            border: '1px solid #CBD5E1',
            borderRadius: 10,
            padding: '11px 16px',
            fontSize: 13,
            outline: 'none',
            background: driver ? '#FFFFFF' : '#F8FAFC',
          }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || !driver}
          style={{
            background: '#059669',
            border: 'none',
            borderRadius: 10,
            color: '#FFFFFF',
            padding: '11px 22px',
            cursor: sending || !text.trim() || !driver ? 'not-allowed' : 'pointer',
            opacity: sending || !text.trim() || !driver ? 0.5 : 1,
            fontWeight: 800,
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          {sending ? 'Sending…' : '↑ Send'}
        </button>
      </form>
    </div>
  )
}

// ─── Exported DriverDispatchConsole (Smartly switches mode based on orderId) ──
export default function DriverDispatchConsole({ initialDriverId = null, orderId = null }) {
  // If orderId is provided, render strictly the Single Order Dispatch Chat
  if (orderId) {
    return <SingleOrderDispatchChat orderId={orderId} />
  }

  // Fallback for global driver management mode (without a specific order context)
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: 16 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>Fleet Courier Dispatch</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        Open Fleet from any order row in the Orders Table to dispatch courier communications for that order.
      </div>
    </div>
  )
}
