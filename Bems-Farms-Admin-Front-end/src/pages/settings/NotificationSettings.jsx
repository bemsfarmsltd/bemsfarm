import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'
import { useRealtime } from '../../context/RealtimeContext'

const EVENT_CATEGORIES = [
  {
    title: 'Customer & Authentication',
    icon: 'ri-user-star-line',
    badge: 'Accounts',
    badgeCls: 'bg-primary-subtle text-primary',
    events: [
      {
        id: 'customer_register',
        name: 'New Customer Registered',
        desc: 'Alert when a new shopper registers with verified delivery coordinates.',
        icon: 'ri-user-add-line',
      },
      {
        id: 'security_event',
        name: 'Password & Security Changes',
        desc: 'Trigger alerts on password resets, credential updates, or suspicious login attempts.',
        icon: 'ri-shield-keyhole-line',
      },
    ]
  },
  {
    title: 'Sales, POS & Orders',
    icon: 'ri-shopping-cart-2-line',
    badge: 'Revenue',
    badgeCls: 'bg-success-subtle text-success',
    events: [
      {
        id: 'order_placed',
        name: 'New Online Orders',
        desc: 'Instant alert whenever a customer checks out an order on web or mobile.',
        icon: 'ri-shopping-bag-3-line',
      },
      {
        id: 'pos_sale',
        name: 'Point-of-Sale Counter Sales',
        desc: 'Alerts when in-store counter checkout is completed by cashiers.',
        icon: 'ri-bank-card-line',
      },
      {
        id: 'refund_request',
        name: 'Refund & Return Requests',
        desc: 'Alert when a return ticket or refund request is submitted for review.',
        icon: 'ri-refund-2-line',
      },
    ]
  },
  {
    title: 'Logistics & Deliveries',
    icon: 'ri-e-bike-2-line',
    badge: 'Dispatch',
    badgeCls: 'bg-info-subtle text-info',
    events: [
      {
        id: 'order_delivery',
        name: 'Delivery Transit & Driver Status',
        desc: 'Alert when drivers accept orders, begin road transit, or mark items delivered.',
        icon: 'ri-road-map-line',
      },
    ]
  },
  {
    title: 'Customer Support & AI Intelligence',
    icon: 'ri-customer-service-2-line',
    badge: 'Conversations',
    badgeCls: 'bg-warning-subtle text-warning',
    events: [
      {
        id: 'support_message',
        name: 'Live Support Messages',
        desc: 'Instant alert when a customer sends a message in live support chat.',
        icon: 'ri-chat-smile-2-line',
      },
      {
        id: 'ai_chat',
        name: 'Chef Bems AI Conversations',
        desc: 'Real-time alert when customers interact with Chef Bems AI for meal planning or recipe advice.',
        icon: 'ri-robot-2-line',
      },
    ]
  },
  {
    title: 'Inventory, Stock & Expiry',
    icon: 'ri-archive-line',
    badge: 'Warehouse',
    badgeCls: 'bg-secondary-subtle text-secondary',
    events: [
      {
        id: 'low_stock',
        name: 'Low Stock & Depletion Thresholds',
        desc: 'Warn store managers when inventory falls below minimum reorder thresholds.',
        icon: 'ri-alert-line',
      },
      {
        id: 'batch_expiry',
        name: 'Batch Expiry Approaching (7-Day)',
        desc: 'Proactive alerts 7 days before produce lots reach their stated expiry date.',
        icon: 'ri-time-line',
      },
    ]
  },
  {
    title: 'System Health & Resilience',
    icon: 'ri-heart-pulse-line',
    badge: 'DevOps',
    badgeCls: 'bg-danger-subtle text-danger',
    events: [
      {
        id: 'system_error',
        name: 'Critical Server Errors & Slowdowns',
        desc: 'Instant alerts on 500 internal errors, database query timeouts, or API slowdowns.',
        icon: 'ri-error-warning-line',
      },
    ]
  }
]

export default function NotificationSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
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

  // Persist a single key immediately for zero-lag instant saving
  const persistSetting = async (key, val, label) => {
    setSavingKey(key)
    const updated = { ...settings, [key]: val }
    setSettings(updated)
    try {
      await api.post('/admin/settings/notifications', { [key]: val })
      setLastSaved(new Date())
      toast.success(label, { id: `notif-${key}`, duration: 2500 })
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
      next === 'true' ? '🔔 In-App & Push Alerts enabled globally' : '🔕 In-App & Push Alerts paused globally'
    )
  }

  const handleToggleEmailMaster = async () => {
    const next = emailMasterOn ? 'false' : 'true'
    await persistSetting(
      'notif_email_enabled',
      next,
      next === 'true' ? '✉️ Email Alerts enabled globally' : '📧 Email Alerts paused globally'
    )
  }

  const handleToggleSoundMaster = async () => {
    if (toggleSound) toggleSound()
    const next = soundMasterOn ? 'false' : 'true'
    await persistSetting(
      'notif_sound_enabled',
      next,
      next === 'true' ? '🔊 Audio Chimes enabled' : '🔇 Audio Chimes muted'
    )
  }

  const handleToggleEvent = async (key, eventName, channelType) => {
    const next = isChecked(key) ? 'false' : 'true'
    const action = next === 'true' ? 'enabled' : 'disabled'
    await persistSetting(key, next, `${eventName}: ${channelType} ${action}`)
  }

  async function handleSaveAll(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/notifications', settings)
      setSettings(res.data.settings || {})
      setLastSaved(new Date())
      toast.success('All notification preferences saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function triggerTest() {
    setTesting(true)
    try {
      const res = await api.post('/admin/notifications/test', { type: testType })
      toast.success(res.data.message || 'Test notification dispatched successfully!')

      // Pop immediate in-app banner for instant visual/audio feedback
      if (showNotificationPopup) {
        const testLabels = {
          order_placed: { title: '🛍️ New Online Order #ORD-8821', msg: 'Order #ORD-8821 placed by Chinedu Okafor totaling ₦28,500 with 4 items.' },
          customer_register: { title: '🎉 New Customer Registered', msg: 'Amara Kalu created a new account in Umuahia with verified GPS coordinates.' },
          pos_sale: { title: '💳 Walk-in POS Sale Completed', msg: 'Walk-in sale of ₦14,200 completed on POS Terminal 1.' },
          order_delivery: { title: '🛵 Driver Dispatched for Order #ORD-8821', msg: 'Courier Emeka has picked up the package and is en route.' },
          support_message: { title: '💬 Live Customer Support Message', msg: 'Ngozi sent a message: "Hello, please is fresh catfish available today?"' },
          ai_chat: { title: '🤖 Chef Bems AI Recommendation', msg: 'Customer requested a 4-person goat meat peppersoup recipe.' },
          low_stock: { title: '⚠️ Low Stock Alert: Fresh Farm Eggs', msg: 'Fresh Farm Eggs inventory has dropped to 4 crates (threshold: 10).' },
          batch_expiry: { title: '⏰ Produce Lot Expiring: Batch #LOT-2026-081', msg: 'Batch #LOT-2026-081 (Organic Bell Peppers) will expire in 4 days.' },
          refund_request: { title: '↩️ Return Request Submitted', msg: 'Refund request of ₦6,500 submitted for Order #ORD-8750.' },
          system_error: { title: '🔴 Critical System Error Captured', msg: 'Payment gateway timeout during webhook verification [HTTP 504]. Auto-recovered.' },
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
      toast.error(err.response?.data?.message || 'Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
        Loading notification matrix…
      </div>
    )
  }

  return (
    <div className="container-fluid py-2">

      {/* Header & Save Action */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Notification &amp; Alert Preferences</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure real-time in-app push banners, topbar bell alerts, and email notifications for every event on Bems Farms.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {lastSaved && (
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-12 fw-medium d-inline-flex align-items-center gap-1.5">
              <i className="ri-check-double-line"></i> Auto-saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSaveAll}>
            <i className="ri-save-line"></i>
            {saving ? 'Saving…' : 'Save All Preferences'}
          </button>
        </div>
      </div>

      {/* Master Channels Bar */}
      <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff' }}>
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-5">
              <div className="d-flex align-items-center gap-3">
                <div className="avatar size-12 rounded-3 bg-white bg-opacity-10 d-flex align-items-center justify-content-center text-warning flex-shrink-0" style={{ fontSize: 24 }}>
                  <i className="ri-broadcast-fill"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h6 className="mb-0 fw-bold text-white">Global Dispatch Channels</h6>
                    <span className="badge bg-success bg-opacity-25 text-success-subtle border border-success border-opacity-25 fs-10 px-2 py-0.5 rounded-pill">
                      Instant Auto-Save
                    </span>
                  </div>
                  <p className="text-white text-opacity-75 fs-12 mb-0">Master switches to enable or pause alert delivery across the entire system.</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-3 gap-md-4">
                {/* Push Master Switch */}
                <div
                  className={`d-flex align-items-center gap-2.5 px-3 py-2 rounded-3 border transition-all cursor-pointer ${
                    pushMasterOn ? 'bg-white bg-opacity-15 border-warning border-opacity-50 shadow-sm' : 'bg-white bg-opacity-5 border-white border-opacity-10'
                  }`}
                  onClick={handleTogglePushMaster}
                  style={{ minWidth: 160 }}
                  title="Click to toggle In-App & Push alerts globally"
                >
                  <div className="form-check form-switch m-0" onClick={e => e.stopPropagation()}>
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      role="switch"
                      id="notif_push_enabled"
                      checked={pushMasterOn}
                      onChange={handleTogglePushMaster}
                      disabled={savingKey === 'notif_push_enabled'}
                    />
                  </div>
                  <label htmlFor="notif_push_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0 d-flex flex-column" onClick={e => e.stopPropagation()}>
                    <span className="d-flex align-items-center gap-1">
                      <i className={`ri-notification-3-line ${pushMasterOn ? 'text-warning' : 'text-white text-opacity-50'}`}></i>
                      <span>In-App / Push</span>
                    </span>
                    <span className={`fs-10 fw-medium ${pushMasterOn ? 'text-warning' : 'text-white text-opacity-50'}`}>
                      {savingKey === 'notif_push_enabled' ? 'Saving…' : pushMasterOn ? 'Active (Live)' : 'Paused'}
                    </span>
                  </label>
                </div>

                {/* Email Master Switch */}
                <div
                  className={`d-flex align-items-center gap-2.5 px-3 py-2 rounded-3 border transition-all cursor-pointer ${
                    emailMasterOn ? 'bg-white bg-opacity-15 border-info border-opacity-50 shadow-sm' : 'bg-white bg-opacity-5 border-white border-opacity-10'
                  }`}
                  onClick={handleToggleEmailMaster}
                  style={{ minWidth: 160 }}
                  title="Click to toggle Email alerts globally"
                >
                  <div className="form-check form-switch m-0" onClick={e => e.stopPropagation()}>
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      role="switch"
                      id="notif_email_enabled"
                      checked={emailMasterOn}
                      onChange={handleToggleEmailMaster}
                      disabled={savingKey === 'notif_email_enabled'}
                    />
                  </div>
                  <label htmlFor="notif_email_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0 d-flex flex-column" onClick={e => e.stopPropagation()}>
                    <span className="d-flex align-items-center gap-1">
                      <i className={`ri-mail-line ${emailMasterOn ? 'text-info' : 'text-white text-opacity-50'}`}></i>
                      <span>Email Alerts</span>
                    </span>
                    <span className={`fs-10 fw-medium ${emailMasterOn ? 'text-info' : 'text-white text-opacity-50'}`}>
                      {savingKey === 'notif_email_enabled' ? 'Saving…' : emailMasterOn ? 'Active (Live)' : 'Paused'}
                    </span>
                  </label>
                </div>

                {/* Sound Chime Switch */}
                <div
                  className={`d-flex align-items-center gap-2.5 px-3 py-2 rounded-3 border transition-all cursor-pointer ${
                    soundMasterOn ? 'bg-white bg-opacity-15 border-success border-opacity-50 shadow-sm' : 'bg-white bg-opacity-5 border-white border-opacity-10'
                  }`}
                  onClick={handleToggleSoundMaster}
                  style={{ minWidth: 160 }}
                  title="Click to toggle Real-time Audio Chimes"
                >
                  <div className="form-check form-switch m-0" onClick={e => e.stopPropagation()}>
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      role="switch"
                      id="notif_sound_enabled"
                      checked={soundMasterOn}
                      onChange={handleToggleSoundMaster}
                      disabled={savingKey === 'notif_sound_enabled'}
                    />
                  </div>
                  <label htmlFor="notif_sound_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0 d-flex flex-column" onClick={e => e.stopPropagation()}>
                    <span className="d-flex align-items-center gap-1">
                      <i className={`ri-volume-up-line ${soundMasterOn ? 'text-success' : 'text-white text-opacity-50'}`}></i>
                      <span>Audio Chime</span>
                    </span>
                    <span className={`fs-10 fw-medium ${soundMasterOn ? 'text-success' : 'text-white text-opacity-50'}`}>
                      {savingKey === 'notif_sound_enabled' ? 'Saving…' : soundMasterOn ? 'Sound On' : 'Muted'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Toggle Matrix + Side Helpers */}
      <div className="row g-4">
        <div className="col-12 col-xl-8">
          {EVENT_CATEGORIES.map(category => (
            <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden" key={category.title}>
              <div className="card-header bg-light py-3 d-flex align-items-center justify-content-between border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <i className={`${category.icon} text-primary fs-18`}></i>
                  <h6 className="mb-0 fw-bold">{category.title}</h6>
                </div>
                <span className={`badge ${category.badgeCls} px-2.5 py-1 rounded-pill fs-11 fw-bold`}>
                  {category.badge}
                </span>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead>
                      <tr className="bg-light-subtle text-muted text-uppercase fs-11 fw-bolder">
                        <th style={{ width: '56%', padding: '10px 16px' }}>Event Action</th>
                        <th className="text-center" style={{ width: '22%', padding: '10px 12px' }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-notification-3-line text-primary"></i> In-App / Push
                            {!pushMasterOn && (
                              <span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-10 px-1 py-0.5 rounded">
                                Muted
                              </span>
                            )}
                          </span>
                        </th>
                        <th className="text-center" style={{ width: '22%', padding: '10px 12px' }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-mail-line text-info"></i> Email Alert
                            {!emailMasterOn && (
                              <span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-10 px-1 py-0.5 rounded">
                                Muted
                              </span>
                            )}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.events.map(ev => {
                        const pushKey  = `push_notif_${ev.id}`
                        const emailKey = `email_notif_${ev.id}`
                        const pushOn  = isChecked(pushKey)
                        const emailOn = isChecked(emailKey)

                        return (
                          <tr key={ev.id} className="border-bottom">
                            <td className="p-3">
                              <div className="d-flex align-items-start gap-3">
                                <div className="avatar size-8 rounded-circle bg-light d-flex align-items-center justify-content-center text-dark flex-shrink-0 mt-0.5">
                                  <i className={`${ev.icon} fs-15 text-primary`}></i>
                                </div>
                                <div>
                                  <div className="fw-bold text-dark mb-0.5">{ev.name}</div>
                                  <div className="text-muted fs-12 leading-relaxed">{ev.desc}</div>
                                </div>
                              </div>
                            </td>

                            {/* Push Switch */}
                            <td className="text-center p-3">
                              <div className="d-flex flex-column align-items-center gap-1">
                                <div className="form-check form-switch m-0">
                                  <input
                                    className="form-check-input cursor-pointer"
                                    type="checkbox"
                                    role="switch"
                                    id={pushKey}
                                    checked={pushOn}
                                    onChange={() => handleToggleEvent(pushKey, ev.name, 'Push')}
                                    disabled={savingKey === pushKey}
                                  />
                                </div>
                                <span className={`fs-11 fw-semibold ${!pushMasterOn ? 'text-muted text-opacity-50 text-decoration-line-through' : pushOn ? 'text-success' : 'text-muted'}`}>
                                  {savingKey === pushKey ? 'Saving…' : pushOn ? (!pushMasterOn ? 'Active (Muted)' : 'Active') : 'Off'}
                                </span>
                              </div>
                            </td>

                            {/* Email Switch */}
                            <td className="text-center p-3">
                              <div className="d-flex flex-column align-items-center gap-1">
                                <div className="form-check form-switch m-0">
                                  <input
                                    className="form-check-input cursor-pointer"
                                    type="checkbox"
                                    role="switch"
                                    id={emailKey}
                                    checked={emailOn}
                                    onChange={() => handleToggleEvent(emailKey, ev.name, 'Email')}
                                    disabled={savingKey === emailKey}
                                  />
                                </div>
                                <span className={`fs-11 fw-semibold ${!emailMasterOn ? 'text-muted text-opacity-50 text-decoration-line-through' : emailOn ? 'text-info' : 'text-muted'}`}>
                                  {savingKey === emailKey ? 'Saving…' : emailOn ? (!emailMasterOn ? 'Active (Muted)' : 'Active') : 'Off'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Cards: Test Trigger & Delivery Info */}
        <div className="col-12 col-xl-4">
          {/* Test Notification Tool */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-header bg-light py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-flashlight-line text-warning"></i>
                Instant Test Notification
              </h6>
            </div>
            <div className="card-body p-3.5">
              <p className="text-muted fs-12 mb-3">
                Send a live test event to verify in-app Topbar bell popup and Resend email dispatch immediately:
              </p>
              <div className="mb-3">
                <label className="form-label fs-11 fw-bold text-uppercase text-muted">Select Event Type to Test</label>
                <select
                  className="form-select form-select-sm"
                  value={testType}
                  onChange={e => setTestType(e.target.value)}
                >
                  <option value="order_placed">🛍️ New Online Order (#ORD-8821)</option>
                  <option value="customer_register">👤 Customer Registration</option>
                  <option value="pos_sale">💳 POS Walk-in Counter Sale</option>
                  <option value="order_delivery">🛵 Courier Dispatch Update</option>
                  <option value="support_message">💬 Live Support Message</option>
                  <option value="ai_chat">🤖 Chef Bems AI Conversation</option>
                  <option value="low_stock">⚠️ Low Stock Warning</option>
                  <option value="batch_expiry">⏰ Batch Expiry Notice</option>
                  <option value="refund_request">↩️ Refund / Return Ticket</option>
                  <option value="system_error">🔴 Server Exception (500)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline-dark w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold shadow-2xs"
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
                    <i className="ri-send-plane-fill text-primary"></i>
                    <span>Send Test Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Destination Recipient */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-header bg-light py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-mail-send-line text-primary"></i>
                Email Delivery Destination
              </h6>
            </div>
            <div className="card-body p-3.5">
              <p className="text-muted fs-12 mb-2">
                All administrative email notifications are delivered to the primary store email:
              </p>
              <div className="p-2.5 bg-light rounded-3 border text-dark font-monospace fs-12 fw-bold mb-3 d-flex align-items-center justify-content-between">
                <span>{settings['store_email'] || 'info@bemsfarms.com'}</span>
                <span className="badge bg-success-subtle text-success">Active</span>
              </div>
              <div className="alert alert-info py-2 px-3 fs-12 mb-0 d-flex align-items-center gap-2 rounded-3 border-0">
                <i className="ri-information-line fs-16 flex-shrink-0"></i>
                <span>You can edit this address anytime under <strong>General Store Info</strong>.</span>
              </div>
            </div>
          </div>

          {/* God Eye Integration Info */}
          <div className="card shadow-sm border-0 rounded-4" style={{ background: '#f8fafc' }}>
            <div className="card-body p-3.5">
              <div className="d-flex align-items-center gap-2 mb-2 text-dark fw-bold fs-13">
                <i className="ri-eye-line text-purple"></i>
                <span>God Eye Synced</span>
              </div>
              <p className="text-muted fs-12 mb-0 leading-relaxed">
                Every dispatched alert is automatically mirrored into <strong>God Eye Audit Hub</strong> with actor attribution, duration telemetry, and full plain-English narrative records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
