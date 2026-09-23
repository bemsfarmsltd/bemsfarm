import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

/**
 * DispatchAlertBanner
 * Expansive Dispatch Coordination Modal
 * Polls /api/admin/dispatch/alerts every 20 seconds.
 * When a "no driver available" alert exists, displays an expansive, rich
 * dispatch control panel allowing the admin to inspect full customer details,
 * order items, retry proximity auto-dispatch, or manually assign any courier.
 */
export default function DispatchAlertBanner() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loadingAction, setLoadingAction] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [driverSearch, setDriverSearch] = useState('')
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const intervalRef = useRef(null)

  // Only show for roles that can manage deliveries
  const canSee = user && ['superadmin', 'admin', 'manager', 'cashier'].includes(user.role)

  const fetchAlerts = useCallback(async () => {
    if (!canSee) return
    try {
      const res = await api.get('/admin/dispatch/alerts')
      const incoming = res.data?.alerts || []
      setAlerts(incoming)
      if (incoming.length === 0) {
        setActiveIndex(0)
      } else if (activeIndex >= incoming.length) {
        setActiveIndex(0)
      }
    } catch (_) {
      // Silently ignore
    }
  }, [canSee, activeIndex])

  const fetchDrivers = useCallback(async () => {
    if (!canSee) return
    setLoadingDrivers(true)
    try {
      const res = await api.get('/admin/deliveries/drivers')
      setDrivers(res.data?.drivers || [])
    } catch (err) {
      console.warn('Could not load drivers directory:', err.message)
    } finally {
      setLoadingDrivers(false)
    }
  }, [canSee])

  useEffect(() => {
    if (!canSee) return
    fetchAlerts()
    fetchDrivers()
    intervalRef.current = setInterval(fetchAlerts, 20000)
    return () => clearInterval(intervalRef.current)
  }, [canSee, fetchAlerts, fetchDrivers])

  const activeAlert = alerts[activeIndex] || null

  const targetOrderId = useMemo(() => {
    if (!activeAlert) return ''
    return String(activeAlert.actual_order_id || activeAlert.order_id || activeAlert.order_ref || '').replace(/^#/, '')
  }, [activeAlert])

  const cleanPhone = useMemo(() => {
    if (!activeAlert?.customer_phone || activeAlert.customer_phone === '—') return ''
    return String(activeAlert.customer_phone).replace(/[^0-9+]/g, '')
  }, [activeAlert])

  const whatsappLink = useMemo(() => {
    if (!cleanPhone) return ''
    const num = cleanPhone.replace(/^\+/, '')
    const msg = encodeURIComponent(`Hello ${activeAlert?.customer_name || 'Customer'}, this is Bems Farms Dispatch regarding your order #${activeAlert?.order_display_id || targetOrderId}.`)
    return `https://wa.me/${num}?text=${msg}`
  }, [cleanPhone, activeAlert, targetOrderId])

  const resolveAlert = async (resolution) => {
    if (!activeAlert) return
    setLoadingAction(true)
    try {
      await api.post(`/admin/dispatch/alerts/${activeAlert.id}/resolve`, { resolution })
      const remaining = alerts.filter(a => a.id !== activeAlert.id)
      setAlerts(remaining)
      if (activeIndex >= remaining.length) {
        setActiveIndex(Math.max(0, remaining.length - 1))
      }
      toast.success(resolution === 'unassign_driver' ? 'Driver unassigned. Order returned to queue.' : 'Alert dismissed from active feed.')
    } catch (err) {
      toast.error('Could not resolve alert: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoadingAction(false)
    }
  }

  const handleRetryAutoDispatch = async () => {
    if (!targetOrderId) return
    setAutoAssigning(true)
    try {
      toast.loading('Searching closest active driver via GPS Haversine...', { id: 'auto-assign' })
      const res = await api.post(`/orders/${targetOrderId}/auto-assign-driver`)
      if (res.data?.assignment?.success) {
        const assigned = res.data.assignment.driver
        toast.success(`Closest driver ${assigned.name} (${assigned.distanceKm}km away) assigned!`, { id: 'auto-assign' })
        // Resolve this alert automatically
        await resolveAlert('keep_driver')
        fetchAlerts()
      } else {
        toast.error(res.data?.message || 'No available active drivers accepted proximity dispatch.', { id: 'auto-assign' })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-dispatch retry failed', { id: 'auto-assign' })
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleManualAssign = async (driver) => {
    if (!targetOrderId || !driver) return
    setLoadingAction(true)
    try {
      await api.patch(`/admin/orders/${targetOrderId}/assign-driver`, {
        driver_id: driver.id,
      })
      toast.success(`Driver ${driver.name} manually assigned to order #${targetOrderId}!`)
      await resolveAlert('keep_driver')
      fetchAlerts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign driver')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCopyAddress = (text) => {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text)
    setCopiedAddress(true)
    toast.success('Delivery address copied!')
    setTimeout(() => setCopiedAddress(false), 2500)
  }

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.toLowerCase().trim()
    if (!q) return drivers
    return drivers.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.phone || '').toLowerCase().includes(q) ||
      (d.vehicle_plate || '').toLowerCase().includes(q) ||
      (d.zone || '').toLowerCase().includes(q)
    )
  }, [drivers, driverSearch])

  if (!activeAlert) return null

  const itemsList = Array.isArray(activeAlert.items) ? activeAlert.items : []

  return (
    <>
      {/* Backdrop with heavy blur */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9998,
          backdropFilter: 'blur(6px)',
        }}
        onClick={() => resolveAlert('keep_driver')}
      />

      {/* Expansive Modal Container */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 32px 100px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.2)',
          width: 'min(980px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* ── 1. MODAL HEADER ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #b45309 0%, #d97706 45%, #f59e0b 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              🚨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>
                  No Available Driver Detected
                </span>
                <span
                  style={{
                    background: '#ffffff',
                    color: '#92400e',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                  }}
                >
                  #{activeAlert.order_display_id || targetOrderId}
                </span>
                {activeAlert.total && (
                  <span
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    ₦{Number(activeAlert.total).toLocaleString()}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 }}>
                Dispatch Automation Alert — Administrative Action &amp; Manual Coordination Required
              </div>
            </div>
          </div>

          {/* Header Controls: Multi-Alert Switcher & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {alerts.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '3px 8px',
                  borderRadius: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(prev => (prev > 0 ? prev - 1 : alerts.length - 1))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 6px',
                    fontWeight: 700,
                  }}
                  title="Previous Alert"
                >
                  ◀
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fef3c7' }}>
                  {activeIndex + 1} of {alerts.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex(prev => (prev < alerts.length - 1 ? prev + 1 : 0))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 6px',
                    fontWeight: 700,
                  }}
                  title="Next Alert"
                >
                  ▶
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => resolveAlert('keep_driver')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 14,
                transition: 'background 0.2s',
              }}
              title="Close alert (keeps order in queue)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── 2. ALERT SUB-BANNER / CONTEXT ── */}
        <div
          style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            padding: '10px 24px',
            fontSize: 12,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span>
            {activeAlert.message ||
              `No active driver accepted proximity dispatch for order #${targetOrderId}. Review customer and assign a courier below.`}
          </span>
        </div>

        {/* ── 3. MODAL BODY (EXPANSIVE 2-COLUMN GRID) ── */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.25fr)',
            gap: 20,
          }}
        >
          {/* ════════ LEFT COLUMN: CUSTOMER & ORDER DETAILS ════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Customer Details Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ri-user-smile-line text-emerald-600" style={{ fontSize: 14 }} />
                Customer Contact Details
              </div>

              {/* Name & Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  {(activeAlert.customer_name || 'C')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                    {activeAlert.customer_name || 'Valued Customer'}
                  </div>
                  {activeAlert.customer_email && activeAlert.customer_email !== '—' && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {activeAlert.customer_email}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone + Action Buttons */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Customer Phone
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                    {activeAlert.customer_phone || 'None provided'}
                  </div>
                </div>

                {cleanPhone && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={`tel:${cleanPhone}`}
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Direct Phone Call"
                    >
                      <i className="ri-phone-line" /> Call
                    </a>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          padding: '6px 10px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Open WhatsApp Chat"
                      >
                        <i className="ri-whatsapp-line" /> WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Delivery Address
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(activeAlert.address)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedAddress ? '#059669' : '#0284c7',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <i className={copiedAddress ? "ri-check-line" : "ri-file-copy-line"} />
                    {copiedAddress ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.5, fontWeight: 500 }}>
                  <i className="ri-map-pin-2-line text-rose-500 me-1" />
                  {activeAlert.address || 'Standard Store Delivery / Counter'}
                </div>
              </div>
            </div>

            {/* Order Items & Total Summary Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                  }}
                >
                  Order Summary ({itemsList.length || '1'} Items)
                </div>
                <span
                  style={{
                    background: '#ede9fe',
                    color: '#6d28d9',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {activeAlert.order_status || 'Awaiting Courier'}
                </span>
              </div>

              {/* Items List */}
              <div
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: '#ffffff',
                  marginBottom: 10,
                }}
              >
                {itemsList.length > 0 ? (
                  itemsList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        borderBottom: idx < itemsList.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: 10,
                          }}
                        >
                          x{item.quantity || 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {item.product_name || 'Farm Product'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₦{Number(item.price || 0).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                    Standard grocery produce package
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 4px 0',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  Total Order Value
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#047857' }}>
                  ₦{Number(activeAlert.total || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: LIVE DRIVER COORDINATION & ASSIGNMENT ════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Auto-Dispatch Retry Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e40af' }}>
                  Proximity Auto-Dispatch Engine
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>
                  Search and broadcast to closest online courier within range
                </div>
              </div>

              <button
                type="button"
                disabled={autoAssigning || loadingAction}
                onClick={handleRetryAutoDispatch}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 14px',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: autoAssigning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  opacity: autoAssigning ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className={autoAssigning ? "ri-loader-4-line ri-spin" : "ri-radar-line"} />
                {autoAssigning ? 'Pinging couriers...' : 'Retry Auto-Dispatch'}
              </button>
            </div>

            {/* Manual Courier Assignment Directory */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                  }}
                >
                  Manual Courier Assignment ({filteredDrivers.length} Available)
                </div>
                <button
                  type="button"
                  onClick={fetchDrivers}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  title="Refresh Drivers"
                >
                  <i className={loadingDrivers ? "ri-refresh-line ri-spin" : "ri-refresh-line"} />
                  Refresh
                </button>
              </div>

              {/* Driver Search Input */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <i
                  className="ri-search-line"
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter couriers by name, phone, or plate..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 30px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Drivers Scrollable List */}
              <div
                style={{
                  flex: 1,
                  maxHeight: 260,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {filteredDrivers.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 12,
                      background: '#ffffff',
                      borderRadius: 10,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <i className="ri-steering-line" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
                    No couriers found matching search.
                  </div>
                ) : (
                  filteredDrivers.map((driver) => {
                    const isAvailable = driver.is_available && !driver.is_on_delivery
                    return (
                      <div
                        key={driver.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: '#f1f5f9',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 13,
                              }}
                            >
                              {(driver.name || 'D').slice(0, 2).toUpperCase()}
                            </div>
                            <span
                              style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: isAvailable ? '#10b981' : driver.is_on_delivery ? '#f59e0b' : '#94a3b8',
                                border: '2px solid #fff',
                              }}
                              title={isAvailable ? 'Available' : driver.is_on_delivery ? 'On Delivery' : 'Off Duty'}
                            />
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{driver.name}</span>
                              {driver.vehicle_plate && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                    color: '#64748b',
                                    background: '#f1f5f9',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}
                                >
                                  {driver.vehicle_plate}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              {driver.phone || '—'} · {driver.vehicle_type || 'Vehicle'}
                              {driver.zone && ` · ${driver.zone}`}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={loadingAction || autoAssigning}
                          onClick={() => handleManualAssign(driver)}
                          style={{
                            background: isAvailable
                              ? 'linear-gradient(135deg, #059669, #047857)'
                              : '#64748b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 12px',
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <i className="ri-user-add-line" />
                          Assign
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. MODAL FOOTER ── */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Alert ID #{activeAlert.id} · Logged at{' '}
            {activeAlert.created_at ? new Date(activeAlert.created_at).toLocaleTimeString() : 'Recent'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Direct Order Manager Link */}
            <a
              href={`/admin/orders?search=${encodeURIComponent(targetOrderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <i className="ri-external-link-line" />
              Open Order in Manager
            </a>

            {/* Dismiss / Keep in queue */}
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => resolveAlert('keep_driver')}
              style={{
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                opacity: loadingAction ? 0.6 : 1,
              }}
            >
              <i className="ri-time-line" />
              Keep in Queue / Dismiss Alert
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
