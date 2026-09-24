import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSocket } from '../lib/socket'

const RealtimeContext = createContext(null)

// ── Synthesized Web Audio Chimes ─────────────────────────────
// Synthesized in-browser with zero external audio assets needed
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

      // Second bell resonance
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
    // Audio autoplay might be blocked before first user interaction
  }
}

export function RealtimeProvider({ children }) {
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('bems_admin_sound_enabled') !== 'false'
  })
  const subscribersRef = useRef(new Map())

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
    // Notify exact matches
    const set = subscribersRef.current.get(event)
    if (set) {
      set.forEach((cb) => {
        try { cb(payload) } catch (err) { console.error('Realtime subscriber error:', err) }
      })
    }
    // Notify wildcard '*' subscribers
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

    // ── Real-Time Event Handlers ──────────────────────────────

    const handleOrderCreated = (data) => {
      notifySubscribers('order:created', data)
      if (soundEnabled) playWebAudioChime('order')

      const orderRef = data.order_ref || data.order_id || 'New'
      const totalStr = data.total ? `₦${Number(data.total).toLocaleString()}` : ''
      const customer = data.customer_name || 'Customer'

      toast(
        (t) => (
          <div className="d-flex align-items-center gap-2.5 py-0.5">
            <span className="fs-18">🛍️</span>
            <div className="flex-grow-1">
              <div className="fw-bold fs-13 text-dark">
                New Order #{orderRef} {totalStr && `(${totalStr})`}
              </div>
              <div className="text-muted fs-11">
                Placed by {customer} · {data.channel || 'Online Store'}
              </div>
            </div>
            <button
              className="btn btn-sm btn-emerald py-1 px-2.5 fs-11 fw-bold rounded-pill text-white"
              onClick={() => {
                toast.dismiss(t.id)
                navigate(`/orders?order=${data.order_id || orderRef}`)
              }}
            >
              View
            </button>
          </div>
        ),
        {
          duration: 7000,
          id: `order-created-${data.order_id || Date.now()}`,
          style: {
            borderLeft: '4px solid #10b981',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          },
        }
      )
    }

    const handleOrderUpdated = (data) => {
      notifySubscribers('order:updated', data)
    }

    const handleDeliveryUpdated = (data) => {
      notifySubscribers('delivery:updated', data)
    }

    const handleDriverTelemetry = (data) => {
      notifySubscribers('driver:telemetry', data)
    }

    const handleDriverLocation = (data) => {
      notifySubscribers('driver:location', data)
    }

    const handleStockUpdated = (data) => {
      notifySubscribers('stock:updated', data)
    }

    const handleNotificationNew = (data) => {
      notifySubscribers('notification:new', data)
      if (soundEnabled) playWebAudioChime('alert')
    }

    const handleDispatchAlert = (data) => {
      notifySubscribers('dispatch:alert', data)
      if (soundEnabled) playWebAudioChime('alert')
      toast.error(
        `🚨 Dispatch Action Needed: Order #${data.order_ref || data.order_id} has no available courier assigned.`,
        { id: `dispatch-alert-${data.order_id}`, duration: 8000 }
      )
    }

    const handleEmergencySos = (data) => {
      notifySubscribers('emergency:sos', data)
      if (soundEnabled) playWebAudioChime('emergency')
      toast.error(
        `🚨 CRITICAL SOS ALERT: Courier ${data.driver_name || 'Driver'} activated emergency distress button!`,
        { id: `sos-${data.emergency_ref || Date.now()}`, duration: 15000 }
      )
    }

    const handleDashboardUpdate = (data) => {
      notifySubscribers('dashboard:update', data)
    }

    socket.on('order:created', handleOrderCreated)
    socket.on('order:updated', handleOrderUpdated)
    socket.on('delivery:updated', handleDeliveryUpdated)
    socket.on('driver:telemetry', handleDriverTelemetry)
    socket.on('driver:location', handleDriverLocation)
    socket.on('stock:updated', handleStockUpdated)
    socket.on('notification:new', handleNotificationNew)
    socket.on('dispatch:alert', handleDispatchAlert)
    socket.on('emergency:sos', handleEmergencySos)
    socket.on('dashboard:update', handleDashboardUpdate)

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
      socket.off('order:created', handleOrderCreated)
      socket.off('order:updated', handleOrderUpdated)
      socket.off('delivery:updated', handleDeliveryUpdated)
      socket.off('driver:telemetry', handleDriverTelemetry)
      socket.off('driver:location', handleDriverLocation)
      socket.off('stock:updated', handleStockUpdated)
      socket.off('notification:new', handleNotificationNew)
      socket.off('dispatch:alert', handleDispatchAlert)
      socket.off('emergency:sos', handleEmergencySos)
      socket.off('dashboard:update', handleDashboardUpdate)
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
