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

          <a
            href="/admin/deliveries/drivers?tab=chat"
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#F1F5F9',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.12s',
            }}
            title="Open central general chat for all drivers in Driver Accounts"
          >
            <span>💬 All Drivers Chat ↗</span>
          </a>
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

// ─── Order / Task Reference Picker Dropdown (General Chat) ────────────────────
function OrderReferencePicker({ isOpen, onClose, onSelect, initialItems = [] }) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSearchResults([])
      return
    }
  }, [isOpen])

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get(`/admin/orders?search=${encodeURIComponent(search.trim())}&limit=8`)
        const orders = res.data?.orders || []
        setSearchResults(orders)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [search])

  if (!isOpen) return null

  const displayItems = search.trim() ? searchResults : initialItems

  return (
    <div style={{
      margin: '0 0 10px 0',
      background: '#FFFFFF',
      border: '1px solid #BFDBFE',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 280,
      zIndex: 50,
    }}>
      <div style={{
        padding: '10px 14px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
          <span>📦</span>
          <span>Attach Order or Delivery Instruction</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, customer name, phone, or address…"
          autoFocus
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: 12,
            border: '1px solid #CBD5E1',
            borderRadius: 6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, padding: '6px 8px' }}>
        {searching && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>
            <span>Searching orders…</span>
          </div>
        )}

        {!searching && displayItems.length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No orders found.</div>
            <div style={{ fontSize: 11, marginTop: 4, color: '#94A3B8' }}>
              Type an order number or customer name above to search.
            </div>
          </div>
        )}

        {!searching && displayItems.map((item, idx) => {
          const ordId = item.order_ref || item.order_id || item.id
          const taskRef = item.delivery_ref || (item.delivery_id ? `DEL-${item.delivery_id}` : null)
          const totalVal = item.total ? `₦${Number(item.total).toLocaleString()}` : null
          const status = item.delivery_status || item.status || 'pending'

          return (
            <button
              key={`${ordId}-${taskRef || idx}`}
              type="button"
              onClick={() => onSelect(item)}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: '1px solid #F1F5F9',
                background: '#FFFFFF',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 4,
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ECFDF5'
                e.currentTarget.style.borderColor = '#A7F3D0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
                e.currentTarget.style.borderColor = '#F1F5F9'
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>
                    Order #{ordId}
                  </span>
                  {taskRef && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>
                      Task #{taskRef}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#ECFDF5',
                    color: '#065F46',
                    textTransform: 'uppercase',
                  }}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.customer_name ? <span>Customer: <strong>{item.customer_name}</strong></span> : (item.address || 'Produce Order')}
                  {item.address && <span style={{ marginLeft: 6, color: '#94A3B8' }}>· {item.address}</span>}
                </div>
              </div>
              {totalVal && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#16A34A' }}>
                    {totalVal}
                  </div>
                  <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
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

// ─── Individual Driver Dispatch Chat Pane (General Console) ───────────────────
export function DriverDispatchChat({ driverId, driverName, driverPhone, vehicleType, orderRef = null }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeDeliveries, setActiveDeliveries] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    if (!driverId) return
    try {
      const r = await api.get(`/admin/customers/drivers/${driverId}/messages`)
      setMessages(r.data?.messages || [])
      setError('')
      await api.post(`/admin/customers/drivers/${driverId}/messages/read`).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.message || 'Driver messages unavailable.')
    }
  }, [driverId])

  const fetchDeliveryOptions = useCallback(async () => {
    if (!driverId) return
    try {
      const r = await api.get(`/admin/customers/drivers/${driverId}/reference-options`)
      if (r.data?.deliveries?.length) {
        setActiveDeliveries(r.data.deliveries)
        return
      }
    } catch {}
    try {
      const r2 = await api.get(`/admin/deliveries/active?driver_id=${driverId}`)
      if (r2.data?.deliveries?.length) {
        setActiveDeliveries(r2.data.deliveries)
        return
      }
    } catch {}
    try {
      const r3 = await api.get(`/admin/orders?limit=10`)
      setActiveDeliveries(r3.data?.orders || [])
    } catch {}
  }, [driverId])

  useEffect(() => {
    fetchDeliveryOptions()
  }, [fetchDeliveryOptions])

  useEffect(() => {
    let active = true
    setMessages([])
    setText('')
    setError('')
    setSelectedDelivery(null)

    const poll = async () => {
      try {
        const r = await api.get(`/admin/customers/drivers/${driverId}/messages`)
        if (active) { setMessages(r.data?.messages || []); setError('') }
        await api.post(`/admin/customers/drivers/${driverId}/messages/read`).catch(() => {})
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to refresh driver messages.')
      }
    }
    poll()
    const t = setInterval(poll, 4000)
    return () => { active = false; clearInterval(t) }
  }, [driverId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e) => {
    if (e) e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await api.post(`/admin/customers/drivers/${driverId}/messages`, {
        message: text,
        order_id: selectedDelivery?.order_ref || selectedDelivery?.order_id || selectedDelivery?.id || orderRef,
        delivery_id: selectedDelivery?.delivery_id || selectedDelivery?.id,
      })
      setText('')
      setSelectedDelivery(null)
      setShowMentionMenu(false)
      await load()
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent to courier.')
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setText(val)
    if (val.endsWith('@') || val.endsWith('/')) {
      setShowMentionMenu(true)
    }
  }

  const handleSelectDeliveryReference = (del) => {
    setSelectedDelivery(del)
    setShowMentionMenu(false)
    const refNum = del.order_ref || del.order_id || del.delivery_ref || del.id
    setText((prev) => {
      const cleaned = prev.replace(/[@/][a-zA-Z0-9_-]*$/, '').trim()
      return cleaned ? `${cleaned} #${refNum} ` : `#${refNum} `
    })
  }

  // Quick Dispatch Action Prompts
  const quickActions = [
    '📍 Please confirm your current ETA',
    '📦 Has the produce order been collected?',
    '⚠️ Customer is waiting at gate; please call upon arrival',
    '✅ Delivery verified. Safe travels on next route!',
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
    }}>
      {/* Top Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DriverAvatar name={driverName} size={42} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>
                Courier {driverName}
              </span>
              <span style={{
                fontSize: 11,
                background: '#ECFDF5',
                color: '#065F46',
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 700,
              }}>
                {vehicleType || 'Courier'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Direct dispatch channel · Live telemetry connected
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {driverPhone && (
            <a
              href={`tel:${driverPhone}`}
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: '#059669',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📞 Call ({driverPhone})</span>
            </a>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {!messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 40 }}>🛵</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginTop: 8 }}>
              No dispatch messages yet with {driverName}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, maxWidth: 360 }}>
              Send route details, order attachments, or dropoff instructions to this courier.
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isAdmin = m.sender_type === 'admin'
          const isBot = m.sender_type === 'bot'
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                gap: 8,
              }}
            >
              {!isAdmin && <DriverAvatar name={isBot ? 'Dispatch AI' : (driverName || 'Courier')} size={28} />}
              <div style={{ maxWidth: '75%' }}>
                {m.order_id && (
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
                    <span>📦 Order #{m.order_id}</span>
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
                  {isAdmin ? (m.admin_name || 'Fleet Dispatcher') : (isBot ? '🤖 Dispatch AI' : (driverName || 'Courier'))} · {timeSince(m.created_at)}
                </div>
              </div>
              {isAdmin && <StaffAvatar name={m.admin_name || 'Fleet Dispatch'} size={28} />}
            </div>
          )
        })}
        {error && <div style={{ textAlign: 'center', color: '#EF4444', fontSize: 12 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Quick Action Dispatch Chips */}
      <div style={{
        padding: '8px 16px',
        background: '#FFFFFF',
        borderTop: '1px solid #F1F5F9',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}>
        <button
          type="button"
          onClick={() => setShowMentionMenu(!showMentionMenu)}
          style={{
            background: showMentionMenu ? '#059669' : '#ECFDF5',
            color: showMentionMenu ? '#FFFFFF' : '#059669',
            border: '1px solid #A7F3D0',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>📦 Attach Order</span>
        </button>

        {quickActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setText((prev) => (prev ? `${prev} ${action}` : action))}
            style={{
              background: '#F8FAFC',
              color: '#475569',
              border: '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Mention / Order Picker Menu */}
      <OrderReferencePicker
        isOpen={showMentionMenu}
        onClose={() => setShowMentionMenu(false)}
        onSelect={handleSelectDeliveryReference}
        initialItems={activeDeliveries}
      />

      {/* Composer */}
      <form
        onSubmit={send}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {selectedDelivery && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: '#065F46',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            padding: '6px 10px',
            borderRadius: 8,
            alignSelf: 'flex-start',
          }}>
            <span>
              📦 Referencing: <strong>Order #{selectedDelivery.order_ref || selectedDelivery.delivery_ref || selectedDelivery.order_id || selectedDelivery.id}</strong> {selectedDelivery.total ? `(₦${Number(selectedDelivery.total).toLocaleString()})` : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDelivery(null)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#EF4444',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={handleInputChange}
            maxLength={4000}
            required
            placeholder={`Type dispatch instruction to Courier ${driverName}… (Press Enter to send, Shift+Enter for newline)`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e)
              }
            }}
            style={{
              flex: 1,
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              resize: 'none',
              minHeight: 46,
              maxHeight: 120,
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              background: '#FFFFFF',
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              background: '#059669',
              border: 'none',
              borderRadius: 10,
              color: '#FFFFFF',
              padding: '11px 22px',
              cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !text.trim() ? 0.5 : 1,
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: 'nowrap',
              height: 46,
            }}
          >
            {sending ? 'Sending…' : '↑ Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Global Multi-Driver Dispatch Console (Under Driver Accounts) ─────────────
export function GlobalDriverDispatchConsole({ initialDriverId = null }) {
  const [driverConversations, setDriverConversations] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDriverInbox = useCallback(async () => {
    try {
      const [inboxRes, driversRes] = await Promise.all([
        api.get('/admin/customers/conversations/driver-inbox').catch(() => ({ data: { conversations: [] } })),
        api.get('/admin/deliveries/drivers').catch(() => ({ data: { drivers: [] } })),
      ])

      const conversations = inboxRes.data?.conversations || []
      const allDrivers = driversRes.data?.drivers || []

      // Merge: Start with conversations, then add any registered drivers who don't have conversations yet
      const merged = [...conversations]
      const existingDriverIds = new Set(conversations.map(c => String(c.driver_id)))

      allDrivers.forEach(d => {
        if (!existingDriverIds.has(String(d.id))) {
          merged.push({
            conversation_id: `new_${d.id}`,
            driver_id: d.id,
            driver_name: d.name,
            driver_phone: d.phone,
            driver_email: d.email,
            driver_status: d.status || 'active',
            vehicle_type: d.vehicle_type || 'motorcycle',
            vehicle_plate: d.vehicle_plate || '',
            last_message: 'Ready for dispatch (No chat yet)',
            last_message_at: d.created_at,
            unread_count: 0,
          })
        }
      })

      setDriverConversations(merged)

      const target = initialDriverId || selectedDriverId
      if (target && merged.length) {
        const found = merged.find((c) => String(c.driver_id) === String(target))
        if (found) {
          setSelectedDriverId(found.driver_id)
          setSelectedDriver(found)
        }
      } else if (!selectedDriverId && merged.length > 0) {
        setSelectedDriverId(merged[0].driver_id)
        setSelectedDriver(merged[0])
      }
    } catch {
      setError('Driver dispatch inbox could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [selectedDriverId, initialDriverId])

  useEffect(() => {
    loadDriverInbox()
    const t = setInterval(loadDriverInbox, 5000)
    return () => clearInterval(t)
  }, [loadDriverInbox])

  useRealtimeEvent('notification:new', loadDriverInbox)
  useRealtimeEvent('support:driver_message', loadDriverInbox)

  // Sync initialDriverId if it changes from props
  useEffect(() => {
    if (initialDriverId && driverConversations.length) {
      const found = driverConversations.find((c) => String(c.driver_id) === String(initialDriverId))
      if (found) {
        setSelectedDriverId(found.driver_id)
        setSelectedDriver(found)
      }
    }
  }, [initialDriverId, driverConversations])

  const filteredDrivers = driverConversations.filter((d) =>
    !search || (d.driver_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.driver_phone || '').includes(search) ||
    (d.vehicle_type || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalDriverUnread = driverConversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      minHeight: 620,
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    }}>
      {/* ── Left Sidebar: Couriers List ── */}
      <div style={{
        width: 320,
        borderRight: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                Fleet Couriers
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                All registered drivers &amp; live channels
              </p>
            </div>
            {totalDriverUnread > 0 && (
              <span style={{
                background: '#059669',
                color: '#FFFFFF',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}>
                {totalDriverUnread} new
              </span>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by courier, phone, vehicle…"
            style={{
              width: '100%',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              outline: 'none',
              background: '#F8FAFC',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Couriers List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <div style={{ padding: 16, color: '#EF4444', fontSize: 12 }}>{error}</div>}

          {!filteredDrivers.length && !loading && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 32 }}>🛵</div>
              <div style={{ fontSize: 13, marginTop: 8, fontWeight: 600 }}>No couriers found</div>
            </div>
          )}

          {filteredDrivers.map((d) => {
            const isActive = String(selectedDriverId) === String(d.driver_id)
            const unread = Number(d.unread_count || 0)
            const isOnline = d.driver_status === 'active' || d.driver_status === 'on_delivery'

            return (
              <button
                key={d.driver_id}
                onClick={() => {
                  setSelectedDriverId(d.driver_id)
                  setSelectedDriver(d)
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid #059669' : '3px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' }}>
                    <DriverAvatar name={d.driver_name} size={38} />
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isOnline ? '#16A34A' : '#94A3B8',
                      border: '2px solid #FFFFFF',
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: unread > 0 ? 800 : 700,
                        fontSize: 13,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {d.driver_name || 'Courier'}
                      </span>
                      <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>
                        {timeSince(d.last_message_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{
                        fontSize: 11,
                        color: unread > 0 ? '#0F172A' : '#64748B',
                        fontWeight: unread > 0 ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 160,
                      }}>
                        {d.last_message || 'Ready for dispatch'}
                      </span>
                      {unread > 0 && (
                        <span style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          borderRadius: 20,
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}>
                          {unread}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 10, color: '#94A3B8', textTransform: 'capitalize' }}>
                      {d.vehicle_type || 'Motorcycle'} · {d.driver_phone || 'No phone'}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right Content: Active Driver Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedDriverId ? (
          <DriverDispatchChat
            key={selectedDriverId}
            driverId={selectedDriverId}
            driverName={selectedDriver?.driver_name}
            driverPhone={selectedDriver?.driver_phone}
            vehicleType={selectedDriver?.vehicle_type}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: '#94A3B8',
            background: '#F8FAFC',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛵</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
              Select a courier conversation
            </div>
            <div style={{ fontSize: 12, maxWidth: 360, textAlign: 'center' }}>
              Choose a courier from the left list to send delivery instructions, route updates, or attach orders.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Exported DriverDispatchConsole (Smartly switches mode based on orderId) ──
export default function DriverDispatchConsole({ initialDriverId = null, orderId = null }) {
  // If orderId is provided, render strictly the Single Order Dispatch Chat
  if (orderId) {
    return <SingleOrderDispatchChat orderId={orderId} initialDriver={null} />
  }

  // When orderId is not provided, render the full multi-driver dispatch console
  return <GlobalDriverDispatchConsole initialDriverId={initialDriverId} />
}
