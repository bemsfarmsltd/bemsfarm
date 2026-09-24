import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSocket } from '../lib/socket'

const RealtimeContext = createContext(null)

// ── Notification Visual Badges & Styling ─────────────────────
const NOTIF_META = {
  customer_register: { label: 'Customer Signup', emoji: '👤', color: '#2563eb', bg: '#dbeafe' },
  order_placed:      { label: 'New Order',      emoji: '🛍️', color: '#16a34a', bg: '#dcfce7' },
  pos_sale:          { label: 'POS Checkout',   emoji: '💳', color: '#059669', bg: '#d1fae5' },
  order_delivery:    { label: 'Delivery Update',emoji: '🚚', color: '#0ea5e9', bg: '#e0f2fe' },
  delivery_updated:  { label: 'Delivery Update',emoji: '🚚', color: '#0ea5e9', bg: '#e0f2fe' },
  dispatch_alert:    { label: 'Dispatch Alert', emoji: '⚠️', color: '#d97706', bg: '#fef3c7' },
  support_message:   { label: 'Support Message',emoji: '💬', color: '#8b5cf6', bg: '#ede9fe' },
  ai_chat:           { label: 'Chef Bems AI',   emoji: '🤖', color: '#9333ea', bg: '#f3e8ff' },
  low_stock:         { label: 'Low Stock Alert',emoji: '📦', color: '#ea580c', bg: '#ffedd5' },
  batch_expiry:      { label: 'Expiry Risk',    emoji: '⏳', color: '#dc2626', bg: '#fee2e2' },
  refund_request:    { label: 'Refund Request', emoji: '🔄', color: '#dc2626', bg: '#fee2e2' },
  system_error:      { label: 'System Notice',  emoji: '❌', color: '#dc2626', bg: '#fee2e2' },
  security_event:    { label: 'Emergency SOS',  emoji: '🚨', color: '#dc2626', bg: '#fee2e2' },
  emergency:         { label: 'Emergency SOS',  emoji: '🚨', color: '#dc2626', bg: '#fee2e2' },
  system:            { label: 'System Alert',   emoji: '🔔', color: '#059669', bg: '#dcfce7' },
}

// ── Synthesized Web Audio Chimes ─────────────────────────────
function playWebAudioChime(type = 'order') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    if (type === 'order') {
      // Pleasant dual-tone "Ding-Dong" cash register / order chime
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12) // D6
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.85)

      setTimeout(() => {
        try {
          const now2 = ctx.currentTime
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.type = 'triangle'
          osc2.frequency.setValueAtTime(1760, now2) // A6 harmonic
          gain2.gain.setValueAtTime(0.15, now2)
          gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.6)
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.start(now2)
          osc2.stop(now2 + 0.65)
        } catch (_) {}
      }, 100)
    } else if (type === 'alert') {
      // Warm attention chime
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15) // C5
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.55)
    } else if (type === 'emergency') {
      // Urgent siren ping
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.linearRampToValueAtTime(1200, now + 0.15)
      osc.frequency.linearRampToValueAtTime(880, now + 0.3)
      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.65)
    }
  } catch (_) {
    // Autoplay policy fallback
  }
}

/**
 * Universal popup renderer: renders an interactive pop-up card for ANY notification
 */
function showNotificationPopup(notif, { navigate, soundEnabled, playChime }) {
  const notifType = notif.type || 'system'
  const meta = NOTIF_META[notifType] || NOTIF_META.system

  // 1. Play appropriate sound
  if (soundEnabled) {
    if (notif.severity === 'critical' || notifType === 'security_event' || notifType === 'emergency') {
      playChime('emergency')
    } else if (notifType === 'order_placed' || notifType === 'pos_sale' || notifType === 'order:created') {
      playChime('order')
    } else {
      playChime('alert')
    }
  }

  // 2. Desktop notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const desktopNotif = new Notification(notif.title || 'Bems Farms Notification', {
        body: notif.message || notif.body || '',
        icon: '/favicon.ico',
        tag: String(notif.id || notif.order_id || Date.now()),
      })
      desktopNotif.onclick = () => {
        window.focus()
        if (notif.link) navigate(notif.link)
      }
    } catch (_) {}
  }

  // 3. Floating In-App Interactive Pop-up Toast
  toast.custom(
    (t) => (
      <div
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} shadow-xl border rounded-4 p-3 bg-white`}
        style={{
          width: 380,
          maxWidth: '92vw',
          borderLeft: `5px solid ${meta.color}`,
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.16)',
          pointerEvents: 'auto',
          transition: 'all 0.2s ease',
        }}
      >
        <div className="d-flex align-items-start gap-2.5">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 40, height: 40, background: meta.bg, color: meta.color, fontSize: 20 }}
          >
            {meta.emoji}
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
              <span
                className="badge px-1.5 py-0.5 text-uppercase font-monospace"
                style={{ background: meta.bg, color: meta.color, fontSize: 10 }}
              >
                {meta.label}
              </span>
              <span className="text-muted" style={{ fontSize: 10 }}>Just now</span>
            </div>
            <div className="fw-bold fs-13 text-dark text-truncate mb-1" title={notif.title}>
              {notif.title || 'New Notification'}
            </div>
            <div
              className="text-muted fs-11 mb-2.5"
              style={{
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {notif.message || notif.body || 'You have a new update in Bems Farms.'}
            </div>
            <div className="d-flex align-items-center gap-2">
              {notif.link && (
                <button
                  type="button"
                  className="btn btn-sm py-1 px-3 fs-11 fw-bold rounded-pill text-white shadow-xs"
                  style={{ background: meta.color }}
                  onClick={() => {
                    toast.dismiss(t.id)
                    navigate(notif.link)
                  }}
                >
                  View Details
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-light border py-1 px-2.5 fs-11 text-muted rounded-pill ms-auto"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn-close ms-1 text-muted"
            style={{ fontSize: 9 }}
            onClick={() => toast.dismiss(t.id)}
          />
        </div>
      </div>
    ),
    {
      id: `popup-${notif.id || notif.type || Date.now()}`,
      duration: notif.severity === 'critical' ? 12000 : 7000,
      position: 'top-right',
    }
  )
}

export function RealtimeProvider({ children }) {
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('bems_admin_sound_enabled') !== 'false'
  })
  const subscribersRef = useRef(new Map())

  // Request browser native notification permission on startup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('bems_admin_sound_enabled', String(next))
      if (next) playWebAudioChime('order')
      toast.success(next ? '🔊 Real-time audio alerts enabled' : '🔇 Audio alerts muted', { id: 'sound-toggle' })
      return next
    })
  }, [])

  // Subscribe callback helper
  const subscribe = useCallback((event, callback) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set())
    }
    subscribersRef.current.get(event).add(callback)

    return () => {
      const set = subscribersRef.current.get(event)
      if (set) {
        set.delete(callback)
        if (set.size === 0) subscribersRef.current.delete(event)
      }
    }
  }, [])

  const notifySubscribers = useCallback((event, payload) => {
    const set = subscribersRef.current.get(event)
    if (set) {
      set.forEach((cb) => {
        try { cb(payload) } catch (err) { console.error('Realtime subscriber error:', err) }
      })
    }
    const wildcardSet = subscribersRef.current.get('*')
    if (wildcardSet) {
      wildcardSet.forEach((cb) => {
        try { cb(event, payload) } catch (err) { console.error('Realtime wildcard subscriber error:', err) }
      })
    }
  }, [])

  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) setConnected(true)

    // ── Universal Real-Time Event Handlers & Pop-ups ────────────

    // 1. All Server Notifications (Signups, POS, Stock Alerts, Chats, etc.)
    const handleNotificationNew = (data) => {
      notifySubscribers('notification:new', data)
      showNotificationPopup(data, { navigate, soundEnabled, playChime: playWebAudioChime })
    }

    // 2. New Order Placed
    const handleOrderCreated = (data) => {
      notifySubscribers('order:created', data)
      const orderRef = data.order_ref || data.order_id || 'New'
      const totalStr = data.total ? `₦${Number(data.total).toLocaleString()}` : ''
      const customer = data.customer_name || 'Customer'

      showNotificationPopup(
        {
          id: data.order_id,
          type: 'order_placed',
          title: `🛍️ New Order #${orderRef} ${totalStr && `(${totalStr})`}`,
          message: `Placed by ${customer} via ${data.channel || 'Online Store'}. Ready for packaging and fulfillment.`,
          link: `/orders?order=${data.order_id || orderRef}`,
        },
        { navigate, soundEnabled, playChime: playWebAudioChime }
      )
    }

    // 3. Order Status / Delivery Changes
    const handleOrderUpdated = (data) => {
      notifySubscribers('order:updated', data)
      if (data.status) {
        showNotificationPopup(
          {
            id: `order-upd-${data.order_id}-${Date.now()}`,
            type: 'order_delivery',
            title: `📦 Order #${data.order_id} Updated`,
            message: `Status moved to: ${String(data.status).replace(/_/g, ' ').toUpperCase()}`,
            link: `/orders?order=${data.order_id}`,
          },
          { navigate, soundEnabled, playChime: playWebAudioChime }
        )
      }
    }

    // 4. Delivery Status Updated
    const handleDeliveryUpdated = (data) => {
      notifySubscribers('delivery:updated', data)
      if (data.status) {
        showNotificationPopup(
          {
            id: `del-upd-${data.delivery_id || Date.now()}`,
            type: 'order_delivery',
            title: `🚚 Delivery Update #${data.delivery_id || data.order_id}`,
            message: `Courier update: ${String(data.status).replace(/_/g, ' ').toUpperCase()}`,
            link: `/deliveries/active`,
          },
          { navigate, soundEnabled, playChime: playWebAudioChime }
        )
      }
    }

    // 5. Driver Telemetry & GPS
    const handleDriverTelemetry = (data) => {
      notifySubscribers('driver:telemetry', data)
    }

    const handleDriverLocation = (data) => {
      notifySubscribers('driver:location', data)
    }

    // 6. Stock Level Changes
    const handleStockUpdated = (data) => {
      notifySubscribers('stock:updated', data)
      showNotificationPopup(
        {
          id: `stock-${data.product_id}-${Date.now()}`,
          type: 'low_stock',
          title: `📦 Inventory Stock Updated`,
          message: data.reason
            ? `Adjustment: ${data.reason}`
            : `Stock level updated to ${data.new_quantity ?? data.after_qty ?? 'new balance'}.`,
          link: `/inventory/list`,
        },
        { navigate, soundEnabled, playChime: playWebAudioChime }
      )
    }

    // 7. Dispatch Alert (e.g. Courier Needed)
    const handleDispatchAlert = (data) => {
      notifySubscribers('dispatch:alert', data)
      showNotificationPopup(
        {
          id: `alert-${data.order_id || Date.now()}`,
          type: 'dispatch_alert',
          severity: 'warning',
          title: `⚠️ Dispatch Action Needed`,
          message: data.message || `No courier available for Order #${data.order_ref || data.order_id}. Manual assignment required.`,
          link: `/deliveries/active`,
        },
        { navigate, soundEnabled, playChime: playWebAudioChime }
      )
    }

    // 8. Emergency SOS Alert
    const handleEmergencySos = (data) => {
      notifySubscribers('emergency:sos', data)
      showNotificationPopup(
        {
          id: `sos-${data.emergency_ref || Date.now()}`,
          type: 'security_event',
          severity: 'critical',
          title: `🚨 DRIVER SOS DISTRESS ALERT`,
          message: `Courier ${data.driver_name || 'Driver'} activated emergency SOS (${data.emergency_type || 'Accident/Emergency'}).`,
          link: `/deliveries/telemetry`,
        },
        { navigate, soundEnabled, playChime: playWebAudioChime }
      )
    }

    // 9. Dashboard Metric Updates
    const handleDashboardUpdate = (data) => {
      notifySubscribers('dashboard:update', data)
    }

    // 10. Customer Support Chat Message
    const handleSupportMessage = (data) => {
      notifySubscribers('support:message', data)
      showNotificationPopup(
        {
          id: `support-${data.customer_id}-${Date.now()}`,
          type: 'support_message',
          title: `💬 New Message: ${data.customer_name || 'Customer'}`,
          message: data.message ? `"${data.message}"` : 'Customer sent a new support inquiry.',
          link: `/customers/messages?customer=${data.customer_id}`,
        },
        { navigate, soundEnabled, playChime: playWebAudioChime }
      )
    }

    socket.on('notification:new', handleNotificationNew)
    socket.on('order:created', handleOrderCreated)
    socket.on('order:updated', handleOrderUpdated)
    socket.on('delivery:updated', handleDeliveryUpdated)
    socket.on('driver:telemetry', handleDriverTelemetry)
    socket.on('driver:location', handleDriverLocation)
    socket.on('stock:updated', handleStockUpdated)
    socket.on('dispatch:alert', handleDispatchAlert)
    socket.on('emergency:sos', handleEmergencySos)
    socket.on('dashboard:update', handleDashboardUpdate)
    socket.on('support:message', handleSupportMessage)

    // Handle Window Focus: when admin returns to tab, refresh current views
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        notifySubscribers('window:focused', { time: Date.now() })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onVisibilityChange)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('notification:new', handleNotificationNew)
      socket.off('order:created', handleOrderCreated)
      socket.off('order:updated', handleOrderUpdated)
      socket.off('delivery:updated', handleDeliveryUpdated)
      socket.off('driver:telemetry', handleDriverTelemetry)
      socket.off('driver:location', handleDriverLocation)
      socket.off('stock:updated', handleStockUpdated)
      socket.off('dispatch:alert', handleDispatchAlert)
      socket.off('emergency:sos', handleEmergencySos)
      socket.off('dashboard:update', handleDashboardUpdate)
      socket.off('support:message', handleSupportMessage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onVisibilityChange)
    }
  }, [soundEnabled, navigate, notifySubscribers])

  const value = {
    connected,
    soundEnabled,
    toggleSound,
    playChime: playWebAudioChime,
    subscribe,
    notify: notifySubscribers,
    showNotificationPopup: (notif) =>
      showNotificationPopup(notif, { navigate, soundEnabled, playChime: playWebAudioChime }),
  }

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

/**
 * Hook to consume the Realtime context
 */
export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return ctx
}

/**
 * Convenient hook to subscribe to a realtime event and auto-cleanup
 */
export function useRealtimeEvent(event, callback) {
  const { subscribe } = useRealtime()
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const handler = (payload) => {
      if (cbRef.current) cbRef.current(payload)
    }
    const unsubscribe = subscribe(event, handler)
    return unsubscribe
  }, [event, subscribe])
}
