import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useRealtime } from '../../context/RealtimeContext'

const EVENT_CATEGORIES = [
  {
    id: 'orders',
    title: 'Orders, Sales & POS',
    icon: 'ri-shopping-bag-3-line',
    badge: 'Revenue',
    color: '#10b981',
    bg: '#ecfdf5',
    events: [
      {
        id: 'order_placed',
        name: 'New Online Order Placed',
        desc: 'Instant chime and popup when a customer completes checkout on web or mobile.',
        icon: 'ri-shopping-cart-2-line',
      },
      {
        id: 'pos_sale',
        name: 'POS Register Sale Completed',
        desc: 'Notification when an in-store walk-in counter sale is tendered by a cashier.',
        icon: 'ri-computer-line',
      },
      {
        id: 'refund_request',
        name: 'Refund & Return Ticket',
        desc: 'Alert when a customer or manager files a return or refund ticket.',
        icon: 'ri-refund-2-line',
      },
    ]
  },
  {
    id: 'logistics',
    title: 'Dispatch & Logistics',
    icon: 'ri-e-bike-2-line',
    badge: 'Fulfillment',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    events: [
      {
        id: 'order_delivery',
        name: 'Driver & Delivery Transit',
        desc: 'Alerts when orders are dispatched, accepted by riders, or delivered.',
        icon: 'ri-map-pin-user-line',
      },
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory & Stock Alerts',
    icon: 'ri-archive-line',
    badge: 'Warehouse',
    color: '#f59e0b',
    bg: '#fffbeb',
    events: [
      {
        id: 'low_stock',
        name: 'Low Stock Depletion Warning',
        desc: 'Alerts when item inventory count drops below the specified reorder threshold.',
        icon: 'ri-alert-line',
      },
      {
        id: 'batch_expiry',
        name: 'Produce Batch Expiry (7-Day Notice)',
        desc: 'Warning sent 7 days before perishable farm produce lots reach expiry.',
        icon: 'ri-time-line',
      },
    ]
  },
  {
    id: 'customers',
    title: 'Customers & Live Chat',
    icon: 'ri-customer-service-2-line',
    badge: 'Engagement',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    events: [
      {
        id: 'customer_register',
        name: 'New Customer Registered',
        desc: 'Alert when a new shopper registers with verified delivery address.',
        icon: 'ri-user-add-line',
      },
      {
        id: 'support_message',
        name: 'Live Customer Support Message',
        desc: 'Instant alert when a shopper initiates or replies in live support chat.',
        icon: 'ri-chat-smile-2-line',
      },
      {
        id: 'ai_chat',
        name: 'Chef Bems AI Conversations',
        desc: 'Activity alert when shoppers interact with Chef Bems AI for meal planning.',
        icon: 'ri-robot-2-line',
      },
    ]
  },
  {
    id: 'security',
    title: 'Security & System Health',
    icon: 'ri-shield-keyhole-line',
    badge: 'Security',
    color: '#ef4444',
    bg: '#fef2f2',
    events: [
      {
        id: 'security_event',
        name: 'Staff Password & Security Changes',
        desc: 'Immediate warning on password resets, profile edits, or unauthorized logins.',
        icon: 'ri-lock-password-line',
      },
      {
        id: 'system_error',
        name: 'System Exceptions & Server Errors',
        desc: 'Instant alert on unhandled 500 API errors, webhook drops, or server issues.',
        icon: 'ri-error-warning-line',
      },
    ]
  }
]

export default function NotificationSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [testing, setTesting] = useState(false)
  const [testType, setTestType] = useState('order_placed')

  const { soundEnabled, toggleSound, showNotificationPopup } = useRealtime()

  useEffect(() => {
    api.get('/admin/settings/notifications')
      .then(res => setSettings(res.data.settings || {}))
      .catch(() => toast.error('Failed to load notification settings'))
      .finally(() => setLoading(false))
  }, [])

  const isChecked = (key) => settings[key] !== 'false'

  // Persist a single key immediately
  const persistSetting = async (key, val, label) => {
    setSavingKey(key)
    const updated = { ...settings, [key]: val }
    setSettings(updated)
    try {
      await api.post('/admin/settings/notifications', { [key]: val })
      toast.success(label, { id: `notif-${key}`, duration: 2000 })
    } catch (err) {
      setSettings(settings)
      toast.error(err.response?.data?.message || `Failed to update ${label}`)
    } finally {
      setSavingKey(null)
    }
  }

  // Master switches state
  const pushMasterOn = isChecked('notif_push_enabled')
  const emailMasterOn = isChecked('notif_email_enabled')
  const soundMasterOn = soundEnabled !== undefined ? soundEnabled : isChecked('notif_sound_enabled')

  const handleTogglePushMaster = async () => {
    const next = pushMasterOn ? 'false' : 'true'
    if (next === 'true' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    await persistSetting(
      'notif_push_enabled',
      next,
      next === 'true' ? 'In-App & Bell Alerts enabled' : 'In-App & Bell Alerts paused'
    )
  }

  const handleToggleEmailMaster = async () => {
    const next = emailMasterOn ? 'false' : 'true'
    await persistSetting(
      'notif_email_enabled',
      next,
      next === 'true' ? 'Email notifications enabled' : 'Email notifications paused'
    )
  }

  const handleToggleSoundMaster = async () => {
    if (toggleSound) toggleSound()
    const next = soundMasterOn ? 'false' : 'true'
    await persistSetting(
      'notif_sound_enabled',
      next,
      next === 'true' ? 'Audio chime sound enabled' : 'Audio chime muted'
    )
  }

  const handleToggleEvent = async (key, eventName, channelType) => {
    const next = isChecked(key) ? 'false' : 'true'
    const action = next === 'true' ? 'enabled' : 'disabled'
    await persistSetting(key, next, `${eventName}: ${channelType} ${action}`)
  }

  async function triggerTest() {
    setTesting(true)
    try {
      const res = await api.post('/admin/notifications/test', { type: testType })
      toast.success(res.data.message || 'Test notification dispatched!')

      if (showNotificationPopup) {
        const testLabels = {
          order_placed: { title: '🛍️ New Online Order #ORD-8821', msg: 'Order placed by Chinedu Okafor totaling ₦28,500 with 4 items.' },
          customer_register: { title: '🎉 New Customer Registered', msg: 'Amara Kalu registered from Umuahia with verified coordinates.' },
          pos_sale: { title: '💳 Walk-in POS Sale Completed', msg: 'Sale of ₦14,200 completed on POS Register 1.' },
          order_delivery: { title: '🛵 Courier Picked Up Order', msg: 'Driver Emeka has picked up the package and is in transit.' },
          support_message: { title: '💬 Live Customer Message', msg: 'Ngozi asks: "Is fresh catfish available for delivery today?"' },
          ai_chat: { title: '🤖 Chef Bems AI Interaction', msg: 'Customer requested recipe ideas for organic palm oil.' },
          low_stock: { title: '⚠️ Low Stock Alert: Fresh Farm Eggs', msg: 'Inventory has dropped to 4 crates (threshold: 10).' },
          batch_expiry: { title: '⏰ Batch Expiry Notice', msg: 'Batch #LOT-2026-081 (Bell Peppers) will expire in 4 days.' },
          refund_request: { title: '↩️ Return Ticket Submitted', msg: 'Refund request of ₦6,500 submitted for Order #ORD-8750.' },
          system_error: { title: '🔴 Critical System Alert', msg: 'Payment gateway connection retry handled [HTTP 504].' },
        }
        const item = testLabels[testType] || testLabels.order_placed
        showNotificationPopup({
          id: `test-${Date.now()}`,
          type: testType,
          title: `[TEST] ${item.title}`,
          message: item.msg,
          link: '/settings/notifications',
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch test notification')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        Loading notification preferences…
      </div>
    )
  }

  const filteredCategories = activeCategory === 'all'
    ? EVENT_CATEGORIES
    : EVENT_CATEGORIES.filter(c => c.id === activeCategory)

  const totalEventsCount = EVENT_CATEGORIES.reduce((acc, c) => acc + c.events.length, 0)

  return (
    <div className="container-fluid py-2">
      {/* Clean Page Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4 pb-2 border-bottom">
        <div>
          <h4 className="mb-1 fw-bold text-dark font-display">Notification &amp; Alert Preferences</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Manage in-app popups, audio chimes, and automatic email notifications across all store operations.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-dark border px-3 py-2 fs-12 fw-medium">
            <span className="badge-dot bg-success me-1.5"></span>
            Instant Auto-Save Active
          </span>
        </div>
      </div>

      {/* Global Master Channels Bar - Executive White Bento Cards */}
      <div className="row g-3 mb-4">
        {/* Channel 1: In-App / Push */}
        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm border transition-all h-100 ${pushMasterOn ? 'border-primary-subtle bg-white' : 'bg-light-subtle'}`}
            style={{ borderRadius: 14 }}
          >
            <div className="card-body p-3.5 d-flex align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: pushMasterOn ? '#eff6ff' : '#f1f5f9', color: pushMasterOn ? '#2563eb' : '#94a3b8' }}
                >
                  <i className="ri-notification-3-line fs-20"></i>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold text-dark fs-14">In-App &amp; Bell Alerts</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>Topbar bell &amp; floating toasts</p>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  style={{ width: 42, height: 22, cursor: 'pointer' }}
                  checked={pushMasterOn}
                  onChange={handleTogglePushMaster}
                  disabled={savingKey === 'notif_push_enabled'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channel 2: Email Alerts */}
        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm border transition-all h-100 ${emailMasterOn ? 'border-info-subtle bg-white' : 'bg-light-subtle'}`}
            style={{ borderRadius: 14 }}
          >
            <div className="card-body p-3.5 d-flex align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: emailMasterOn ? '#f0f9ff' : '#f1f5f9', color: emailMasterOn ? '#0284c7' : '#94a3b8' }}
                >
                  <i className="ri-mail-line fs-20"></i>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold text-dark fs-14">Email Dispatch</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>Sent to corporate mailbox</p>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  style={{ width: 42, height: 22, cursor: 'pointer' }}
                  checked={emailMasterOn}
                  onChange={handleToggleEmailMaster}
                  disabled={savingKey === 'notif_email_enabled'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channel 3: Audio Chimes */}
        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm border transition-all h-100 ${soundMasterOn ? 'border-success-subtle bg-white' : 'bg-light-subtle'}`}
            style={{ borderRadius: 14 }}
          >
            <div className="card-body p-3.5 d-flex align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: soundMasterOn ? '#ecfdf5' : '#f1f5f9', color: soundMasterOn ? '#059669' : '#94a3b8' }}
                >
                  <i className={`fs-20 ${soundMasterOn ? 'ri-volume-up-line' : 'ri-volume-mute-line'}`}></i>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold text-dark fs-14">Audio Chime Sound</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>Plays chime on new events</p>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  style={{ width: 42, height: 22, cursor: 'pointer' }}
                  checked={soundMasterOn}
                  onChange={handleToggleSoundMaster}
                  disabled={savingKey === 'notif_sound_enabled'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Notification Events Matrix */}
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border mb-4" style={{ borderRadius: 14 }}>
            {/* Filter Pills Header */}
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className={`btn btn-sm px-3 py-1.5 rounded-pill fw-semibold transition-all ${activeCategory === 'all' ? 'btn-primary' : 'btn-light border text-muted'}`}
                  style={{ fontSize: 12 }}
                  onClick={() => setActiveCategory('all')}
                >
                  All ({totalEventsCount})
                </button>
                {EVENT_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-sm px-3 py-1.5 rounded-pill fw-semibold transition-all ${activeCategory === c.id ? 'btn-primary' : 'btn-light border text-muted'}`}
                    style={{ fontSize: 12 }}
                    onClick={() => setActiveCategory(c.id)}
                  >
                    <i className={`${c.icon} me-1`}></i>
                    {c.title.split('&')[0].trim()}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="d-flex align-items-center gap-3 d-none d-md-flex">
                <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                  <i className="ri-notification-3-line text-primary"></i> In-App
                </span>
                <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                  <i className="ri-mail-line text-info"></i> Email
                </span>
              </div>
            </div>

            {/* Event List */}
            <div className="card-body p-0">
              {filteredCategories.map((cat, idx) => (
                <div key={cat.id}>
                  {/* Category Subheader */}
                  <div className="px-4 py-2.5 bg-light-subtle border-bottom d-flex align-items-center justify-content-between">
                    <span className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                      <i className={`${cat.icon}`} style={{ color: cat.color }}></i>
                      {cat.title}
                    </span>
                    <span className="badge bg-white text-muted border px-2 py-0.5" style={{ fontSize: 11 }}>
                      {cat.events.length} Events
                    </span>
                  </div>

                  {/* Category Events */}
                  <div className="list-group list-group-flush">
                    {cat.events.map(ev => {
                      const pushKey = `push_notif_${ev.id}`
                      const emailKey = `email_notif_${ev.id}`
                      const pushOn = isChecked(pushKey)
                      const emailOn = isChecked(emailKey)

                      return (
                        <div
                          key={ev.id}
                          className="list-group-item p-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom transition-all hover-bg-light"
                        >
                          {/* Event Title & Description */}
                          <div className="d-flex align-items-start gap-3" style={{ maxWidth: '65%' }}>
                            <div
                              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 mt-0.5"
                              style={{ width: 38, height: 38, background: cat.bg, color: cat.color }}
                            >
                              <i className={`${ev.icon} fs-18`}></i>
                            </div>
                            <div>
                              <h6 className="mb-0.5 fw-bold text-dark fs-13.5">{ev.name}</h6>
                              <p className="text-muted mb-0" style={{ fontSize: 12 }}>{ev.desc}</p>
                            </div>
                          </div>

                          {/* Action Switchers */}
                          <div className="d-flex align-items-center gap-3 ms-auto">
                            {/* In-App Toggle */}
                            <div
                              className={`d-flex align-items-center gap-2 px-2.5 py-1.5 rounded-pill border ${pushOn && pushMasterOn ? 'bg-primary-subtle border-primary-subtle' : 'bg-light border'}`}
                              title={!pushMasterOn ? 'Global In-App alerts are currently paused' : undefined}
                            >
                              <i className={`ri-notification-3-line ${pushOn && pushMasterOn ? 'text-primary' : 'text-muted'}`} style={{ fontSize: 13 }}></i>
                              <span className="fw-semibold" style={{ fontSize: 11, color: pushOn && pushMasterOn ? '#1d4ed8' : '#64748b' }}>
                                App
                              </span>
                              <div className="form-check form-switch m-0 ms-1 p-0">
                                <input
                                  className="form-check-input ms-0"
                                  type="checkbox"
                                  role="switch"
                                  style={{ width: 32, height: 16, cursor: 'pointer' }}
                                  checked={pushOn}
                                  onChange={() => handleToggleEvent(pushKey, ev.name, 'Push')}
                                  disabled={savingKey === pushKey}
                                />
                              </div>
                            </div>

                            {/* Email Toggle */}
                            <div
                              className={`d-flex align-items-center gap-2 px-2.5 py-1.5 rounded-pill border ${emailOn && emailMasterOn ? 'bg-info-subtle border-info-subtle' : 'bg-light border'}`}
                              title={!emailMasterOn ? 'Global email dispatch is currently paused' : undefined}
                            >
                              <i className={`ri-mail-line ${emailOn && emailMasterOn ? 'text-info' : 'text-muted'}`} style={{ fontSize: 13 }}></i>
                              <span className="fw-semibold" style={{ fontSize: 11, color: emailOn && emailMasterOn ? '#0369a1' : '#64748b' }}>
                                Mail
                              </span>
                              <div className="form-check form-switch m-0 ms-1 p-0">
                                <input
                                  className="form-check-input ms-0"
                                  type="checkbox"
                                  role="switch"
                                  style={{ width: 32, height: 16, cursor: 'pointer' }}
                                  checked={emailOn}
                                  onChange={() => handleToggleEvent(emailKey, ev.name, 'Email')}
                                  disabled={savingKey === emailKey}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Testing Studio & Mailbox Destination */}
        <div className="col-12 col-xl-4">
          {/* Card 1: Interactive Test Studio */}
          <div className="card shadow-sm border mb-4" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <div className="avatar-xs rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
                <i className="ri-flashlight-line fs-15"></i>
              </div>
              <h6 className="mb-0 fw-bold text-dark fs-14">Test Alert Dispatcher</h6>
            </div>
            <div className="card-body p-4">
              <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>
                Simulate a live platform event to verify audio chimes, topbar bell notifications, and mailbox delivery.
              </p>

              <div className="mb-3">
                <label className="form-label fw-medium text-dark" style={{ fontSize: 12.5 }}>Event Scenario</label>
                <select
                  className="form-select form-select-sm py-2"
                  value={testType}
                  onChange={e => setTestType(e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="order_placed">🛍️ Online Checkout (#ORD-8821)</option>
                  <option value="pos_sale">💳 In-Store POS Sale Complete</option>
                  <option value="order_delivery">🛵 Driver En Route to Customer</option>
                  <option value="customer_register">👤 New Customer Registered</option>
                  <option value="support_message">💬 Live Chat Inquiry</option>
                  <option value="ai_chat">🤖 Chef Bems AI Suggestion</option>
                  <option value="low_stock">⚠️ Inventory Threshold Reached</option>
                  <option value="batch_expiry">⏰ Batch Expiry in 4 Days</option>
                  <option value="refund_request">↩️ Customer Return Ticket</option>
                  <option value="system_error">🔴 API Error / Warning (500)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2.5 fw-medium shadow-sm"
                style={{ fontSize: 13 }}
                disabled={testing}
                onClick={triggerTest}
              >
                {testing ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    <span>Dispatching…</span>
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-2-line fs-15"></i>
                    <span>Send Test Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Email Destination */}
          <div className="card shadow-sm border mb-4" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 className="mb-0 fw-bold text-dark fs-14 d-flex align-items-center gap-2">
                <i className="ri-mail-send-line text-primary fs-16"></i>
                Delivery Destination
              </h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11">
                Verified
              </span>
            </div>
            <div className="card-body p-4">
              <p className="text-muted mb-2" style={{ fontSize: 12 }}>
                Administrative alert emails are routed to your primary corporate mailbox:
              </p>
              <div className="p-2.5 bg-light rounded-3 border text-dark font-monospace fw-semibold d-flex align-items-center justify-content-between mb-3" style={{ fontSize: 12.5 }}>
                <span>{settings['store_email'] || 'support@bemsfarms.com'}</span>
                <i className="ri-shield-check-line text-success fs-16"></i>
              </div>
              <Link
                to="/settings/general"
                className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1.5"
                style={{ fontSize: 12 }}
              >
                <i className="ri-edit-line"></i> Change Email in Store Profile
              </Link>
            </div>
          </div>

          {/* Card 3: Audit Integration */}
          <div className="card bg-light-subtle border shadow-sm" style={{ borderRadius: 14 }}>
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center gap-2 mb-1.5 text-dark fw-bold" style={{ fontSize: 13 }}>
                <i className="ri-eye-line text-primary fs-16"></i>
                <span>Audit &amp; Telemetry Synced</span>
              </div>
              <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                All generated notifications and alert deliveries are automatically recorded in the central audit hub for compliance and tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
