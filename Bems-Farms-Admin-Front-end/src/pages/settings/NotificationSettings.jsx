import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

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
  const [testing, setTesting] = useState(false)
  const [testType, setTestType] = useState('order_placed')

  useEffect(() => {
    api.get('/admin/settings/notifications')
      .then(res => setSettings(res.data.settings || {}))
      .catch(() => toast.error('Failed to load notification settings'))
      .finally(() => setLoading(false))
  }, [])

  const isChecked = (key) => settings[key] !== 'false'
  const toggleKey = (key) => setSettings(s => ({ ...s, [key]: isChecked(key) ? 'false' : 'true' }))

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/notifications', settings)
      setSettings(res.data.settings || {})
      toast.success('Notification preferences saved successfully!')
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
    <div className="container-fluid">
      <SettingsTabs />

      {/* Header & Save Action */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Notification &amp; Alert Preferences</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure real-time in-app push banners, topbar bell alerts, and email notifications for every event on Bems Farms.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
            <i className="ri-save-line"></i>
            {saving ? 'Saving…' : 'Save Preferences'}
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
                  <h6 className="mb-1 fw-bold text-white">Global Dispatch Channels</h6>
                  <p className="text-white text-opacity-75 fs-12 mb-0">Master switches to enable or pause alert delivery across the entire system.</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-3 gap-md-4">
                {/* Push Master */}
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="notif_push_enabled"
                      checked={isChecked('notif_push_enabled')}
                      onChange={() => toggleKey('notif_push_enabled')}
                    />
                  </div>
                  <label htmlFor="notif_push_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0">
                    <i className="ri-notification-3-line text-warning me-1"></i> In-App / Push
                  </label>
                </div>

                {/* Email Master */}
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="notif_email_enabled"
                      checked={isChecked('notif_email_enabled')}
                      onChange={() => toggleKey('notif_email_enabled')}
                    />
                  </div>
                  <label htmlFor="notif_email_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0">
                    <i className="ri-mail-line text-info me-1"></i> Email Alerts
                  </label>
                </div>

                {/* Sound Chime */}
                <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-2 rounded-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="notif_sound_enabled"
                      checked={isChecked('notif_sound_enabled')}
                      onChange={() => toggleKey('notif_sound_enabled')}
                    />
                  </div>
                  <label htmlFor="notif_sound_enabled" className="cursor-pointer text-white fw-semibold fs-12 mb-0">
                    <i className="ri-volume-up-line text-success me-1"></i> Audio Chime
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
                        <th style={{ width: '58%', padding: '10px 16px' }}>Event Action</th>
                        <th className="text-center" style={{ width: '21%', padding: '10px 12px' }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-notification-3-line text-primary"></i> In-App / Push
                          </span>
                        </th>
                        <th className="text-center" style={{ width: '21%', padding: '10px 12px' }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-mail-line text-info"></i> Email Alert
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
                                    onChange={() => toggleKey(pushKey)}
                                  />
                                </div>
                                <span className={`fs-11 fw-semibold ${pushOn ? 'text-success' : 'text-muted'}`}>
                                  {pushOn ? 'Active' : 'Off'}
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
                                    onChange={() => toggleKey(emailKey)}
                                  />
                                </div>
                                <span className={`fs-11 fw-semibold ${emailOn ? 'text-info' : 'text-muted'}`}>
                                  {emailOn ? 'Active' : 'Off'}
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
                className="btn btn-outline-dark w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold"
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
