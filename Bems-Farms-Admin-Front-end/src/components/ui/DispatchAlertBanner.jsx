import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

/**
 * DispatchAlertBanner
 * Polls /api/admin/dispatch/alerts every 20 seconds.
 * When a "no driver available" alert exists, shows a modal popup so the
 * admin can choose to KEEP the last assigned driver or UNASSIGN them.
 */
export default function DispatchAlertBanner() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [activeAlert, setActiveAlert] = useState(null)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  // Only show for roles that can manage deliveries
  const canSee = user && ['superadmin', 'admin', 'manager', 'cashier'].includes(user.role)

  const fetchAlerts = useCallback(async () => {
    if (!canSee) return
    try {
      const res = await api.get('/admin/dispatch/alerts')
      const incoming = res.data?.alerts || []
      setAlerts(incoming)
      // Show the oldest unresolved alert if no modal is currently open
      if (incoming.length > 0 && !activeAlert) {
        setActiveAlert(incoming[0])
      }
    } catch (_) {
      // Silently ignore — table may not exist yet on first deploy
    }
  }, [canSee, activeAlert])

  useEffect(() => {
    if (!canSee) return
    fetchAlerts()
    intervalRef.current = setInterval(fetchAlerts, 20000)
    return () => clearInterval(intervalRef.current)
  }, [canSee, fetchAlerts])

  const resolve = async (resolution) => {
    if (!activeAlert) return
    setLoading(true)
    try {
      await api.post(`/admin/dispatch/alerts/${activeAlert.id}/resolve`, { resolution })
      // Remove the resolved alert from local state
      const remaining = alerts.filter(a => a.id !== activeAlert.id)
      setAlerts(remaining)
      setActiveAlert(remaining.length > 0 ? remaining[0] : null)
    } catch (err) {
      alert('Could not resolve alert: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  if (!activeAlert) return null

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 9998, backdropFilter: 'blur(2px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 9999,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        width: 'min(480px, 95vw)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}>
        {/* Header strip */}
        <div style={{
          background: 'linear-gradient(135deg,#f59e0b,#d97706)',
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
              No Driver Available
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              Dispatch alert — admin action required
            </div>
          </div>
          {alerts.length > 1 && (
            <span style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.25)',
              borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              {alerts.length} pending
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
            {activeAlert.message}
          </p>

          {/* Order + driver info */}
          <div style={{
            background: '#f9fafb', borderRadius: 10, padding: '14px 16px',
            marginBottom: 20, fontSize: 13, color: '#4b5563',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
          }}>
            <div><span style={{ color: '#9ca3af' }}>Order</span><br />
              <strong style={{ color: '#111827' }}>#{activeAlert.order_ref || activeAlert.order_id}</strong>
            </div>
            <div><span style={{ color: '#9ca3af' }}>Customer</span><br />
              <strong style={{ color: '#111827' }}>{activeAlert.customer_name || '—'}</strong>
            </div>
            <div><span style={{ color: '#9ca3af' }}>Last Driver</span><br />
              <strong style={{ color: '#111827' }}>{activeAlert.driver_name || activeAlert.last_driver_name || '—'}</strong>
            </div>
            <div><span style={{ color: '#9ca3af' }}>Phone</span><br />
              <strong style={{ color: '#111827' }}>{activeAlert.driver_phone || '—'}</strong>
            </div>
          </div>

          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
            What would you like to do with this order?
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              disabled={loading}
              onClick={() => resolve('keep_driver')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              📞 Keep Driver
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
                Leave order with {activeAlert.driver_name || 'driver'}
              </div>
            </button>

            <button
              disabled={loading}
              onClick={() => resolve('unassign_driver')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              ❌ Unassign Driver
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
                Remove &amp; return to queue
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
