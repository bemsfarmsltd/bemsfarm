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

// ─── Order / Delivery Reference Card (Action Center) ─────────────────────────
function ReferencedOrderCard({ metadata, orderId }) {
  const [showItems, setShowItems] = useState(false)
  if (!metadata && !orderId) return null

  const data = metadata || { order_id: orderId, order_ref: orderId }
  const totalStr = data.total ? `₦${Number(data.total).toLocaleString()}` : null
  const status = data.status || data.order_status || data.delivery_status || 'active'

  const statusColor = {
    delivered: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    in_transit: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    out_for_delivery: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    awaiting_pickup: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    assigned: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    confirmed: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    cancelled: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  }[status] || { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🛵</span>
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
                {totalStr} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>({data.payment_method?.toUpperCase() || 'Produce Order'})</span>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <span style={{ color: '#94a3b8' }}>Destination:</span> {data.address}
          </div>
        )}
      </div>

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
            <span>{showItems ? '▼ Hide Items' : `▶ View Produce Items (${data.items.length})`}</span>
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
  )
}

// ─── Order / Task Reference Picker Dropdown ──────────────────────────────────
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
      border: '1px solid #bfdbfe',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 290,
      zIndex: 50,
    }}>
      <div style={{
        padding: '10px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
          <span>🛵</span>
          <span>Attach Order or Task Instruction</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
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
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, padding: '6px 8px' }}>
        {searching && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            <span>Searching active orders…</span>
          </div>
        )}

        {!searching && displayItems.length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No orders found.</div>
            <div style={{ fontSize: 11, marginTop: 4, color: '#94a3b8' }}>
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
                border: '1px solid #f1f5f9',
                background: '#fff',
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
                e.currentTarget.style.backgroundColor = '#ecfdf5'
                e.currentTarget.style.borderColor = '#a7f3d0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff'
                e.currentTarget.style.borderColor = '#f1f5f9'
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
                    background: '#ecfdf5',
                    color: '#065f46',
                    textTransform: 'uppercase',
                  }}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.customer_name ? <span>Customer: <strong>{item.customer_name}</strong></span> : (item.address || 'Produce Order')}
                  {item.address && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {item.address}</span>}
                </div>
              </div>
              {totalVal && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#16a34a' }}>
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

// ─── Driver Dispatch Chat Pane ────────────────────────────────────────────────
export function DriverDispatchChat({ driverId, driverName, driverPhone, vehicleType, orderRef }) {
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

  const fetchDeliveryOptions = useCallback(async () => {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const latestReferencedTask = messages
    .slice()
    .reverse()
    .find(m => m.metadata || m.order_id || m.delivery_id)

  const send = async (e) => {
    e.preventDefault()
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRadius: 12,
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
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DriverAvatar name={driverName} size={40} />
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
                {vehicleType || 'Active Courier'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Direct dispatch channel · Live telemetry connected
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {driverPhone && (
            <a
              href={`tel:${driverPhone}`}
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
                gap: 4,
              }}
            >
              <span>📞 Call Courier</span>
            </a>
          )}
        </div>
      </div>

      {/* Referenced Order Banner */}
      {latestReferencedTask && (
        <div style={{ padding: '12px 16px 0', background: '#F8FAFC' }}>
          <ReferencedOrderCard
            metadata={latestReferencedTask.metadata}
            orderId={latestReferencedTask.order_id}
          />
        </div>
      )}

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {!messages.length && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 36 }}>🛵</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 8 }}>
              No dispatch messages yet
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Send route details, customer contact info, or dropoff instructions to {driverName}.
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
                {m.order_id && !latestReferencedTask && (
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
                    <span>🛵 Task #{m.order_id}</span>
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

      {/* Mention / Delivery Picker Menu */}
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
              🛵 Referencing: <strong>Task #{selectedDelivery.order_ref || selectedDelivery.delivery_ref || selectedDelivery.order_id || selectedDelivery.id}</strong> {selectedDelivery.total ? `(₦${Number(selectedDelivery.total).toLocaleString()})` : ''}
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
            placeholder="Type dispatch instruction to courier… Click 🛵 @ or use @ to attach order"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e)
              }
            }}
            style={{
              flex: 1,
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              resize: 'none',
              minHeight: 44,
              maxHeight: 120,
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => setShowMentionMenu(!showMentionMenu)}
            title="Reference a Delivery Task / Order"
            style={{
              background: showMentionMenu ? '#DCFCE7' : '#F1F5F9',
              border: `1px solid ${showMentionMenu ? '#86EFAC' : '#CBD5E1'}`,
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: '#059669',
              transition: 'all 0.15s',
            }}
          >
            🛵 @
          </button>
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              background: '#059669',
              border: 'none',
              borderRadius: 10,
              color: '#FFFFFF',
              padding: '10px 18px',
              cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !text.trim() ? 0.5 : 1,
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {sending ? '…' : '↑ Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Driver Dispatch Console (Reusable Fleet Sub-Component) ───────────────────
export default function DriverDispatchConsole({ initialDriverId = null, orderId = null }) {
  const [driverConversations, setDriverConversations] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadDriverInbox = useCallback(async () => {
    try {
      const r = await api.get('/admin/customers/conversations/driver-inbox')
      const convs = r.data.conversations || []
      setDriverConversations(convs)

      const target = initialDriverId || selectedDriverId
      if (target && convs.length) {
        const found = convs.find((c) => String(c.driver_id) === String(target))
        if (found) {
          setSelectedDriverId(found.driver_id)
          setSelectedDriver(found)
        }
      } else if (!selectedDriverId && convs.length > 0) {
        // Auto-select first active courier if none selected
        setSelectedDriverId(convs[0].driver_id)
        setSelectedDriver(convs[0])
      }
    } catch {
      setError('Driver inbox could not be loaded.')
    }
  }, [selectedDriverId, initialDriverId])

  useEffect(() => {
    loadDriverInbox()
    const t = setInterval(loadDriverInbox, 5000)
    return () => clearInterval(t)
  }, [loadDriverInbox])

  useRealtimeEvent('notification:new', loadDriverInbox)
  useRealtimeEvent('support:driver_message', loadDriverInbox)

  const filteredDrivers = driverConversations.filter((d) =>
    !search || (d.driver_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalDriverUnread = driverConversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      minHeight: 560,
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
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
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                Fleet Couriers
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                Direct driver dispatch channels
              </p>
            </div>
            {totalDriverUnread > 0 && (
              <span style={{
                background: '#059669',
                color: '#FFFFFF',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {totalDriverUnread} new
              </span>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search couriers…"
            style={{
              width: '100%',
              border: '1px solid #E2E8F0',
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

          {!filteredDrivers.length && !error && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 28 }}>🛵</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>No courier messages yet</div>
            </div>
          )}

          {filteredDrivers.map((d) => {
            const isActive = String(selectedDriverId) === String(d.driver_id)
            const unread = Number(d.unread_count || 0)
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
                  borderBottom: '1px solid #F8FAFC',
                  background: isActive ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid #059669' : '3px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <DriverAvatar name={d.driver_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: unread > 0 ? 800 : 600,
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{
                        fontSize: 11,
                        color: '#64748B',
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
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
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

      {/* ── Right Content: Active Driver Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedDriverId ? (
          <DriverDispatchChat
            key={selectedDriverId}
            driverId={selectedDriverId}
            driverName={selectedDriver?.driver_name}
            driverPhone={selectedDriver?.driver_phone}
            vehicleType={selectedDriver?.vehicle_type}
            orderRef={orderId}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: '#94A3B8',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛵</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Select a courier conversation
            </div>
            <div style={{ fontSize: 12 }}>
              Choose a courier from the left list to send delivery instructions and route updates
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
