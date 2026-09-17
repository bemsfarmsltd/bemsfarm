import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const NOTIF_GROUPS = [
  {
    title: 'Order & Sales Notifications',
    icon: 'ri-shopping-cart-2-line',
    items: [
      { key: 'notif_order_email', label: 'New Storefront & POS Order Alerts', desc: 'Receive instant email alerts whenever a customer places an order or completes checkout.' },
      { key: 'notif_refund_alerts', label: 'Refund & Return Notifications', desc: 'Alert administrators when a return or refund request is submitted.' },
    ]
  },
  {
    title: 'Inventory & Stock Thresholds',
    icon: 'ri-archive-line',
    items: [
      { key: 'notif_low_stock', label: 'Low Stock & Depletion Warnings', desc: 'Notify store managers when warehouse or store inventory drops below minimum threshold.' },
      { key: 'notif_batch_expiry', label: 'Batch Expiry Approaching Alerts', desc: 'Receive proactive alerts 7 days before produce lots reach their stated expiry date.' },
    ]
  },
  {
    title: 'Channel Delivery Channels',
    icon: 'ri-broadcast-line',
    items: [
      { key: 'notif_email_enabled', label: 'Primary Email Notification Dispatch', desc: 'Global switch to deliver system emails to configured staff and managers.' },
      { key: 'notif_sms_enabled', label: 'SMS / Text Message Alerts (Nigeria)', desc: 'Deliver critical OTPs and dispatch updates via SMS gateways.' },
    ]
  }
]

export default function NotificationSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/notifications')
      .then(res => setSettings(res.data.settings || {}))
      .catch(() => toast.error('Failed to load notification settings'))
      .finally(() => setLoading(false))
  }, [])

  const isOn = (key) => settings[key] !== 'false'
  const toggle = (key) => setSettings(s => ({ ...s, [key]: isOn(key) ? 'false' : 'true' }))

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/notifications', settings)
      setSettings(res.data.settings || {})
      toast.success('Notification settings saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading notification settings…</div>

  return (
    <div className="container-fluid">
      <SettingsTabs />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Notification &amp; Alert Preferences</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure automatic email and SMS triggers for sales, stock warnings, and store events.
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
          <i className="ri-save-line"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {NOTIF_GROUPS.map(group => (
            <div className="card shadow-sm border mb-4" key={group.title}>
              <div className="card-header bg-light-subtle py-3">
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <i className={`${group.icon} text-primary`}></i>
                  {group.title}
                </h6>
              </div>
              <div className="card-body divide-y">
                {group.items.map((item, idx) => (
                  <div key={item.key} className={`d-flex justify-content-between align-items-center gap-3 ${idx > 0 ? 'pt-3 mt-3 border-top' : ''}`}>
                    <div>
                      <label htmlFor={item.key} className="cursor-pointer mb-0 fw-semibold text-dark d-block" style={{ fontSize: 13.5 }}>
                        {item.label}
                      </label>
                      <p className="text-muted mb-0" style={{ fontSize: 12 }}>{item.desc}</p>
                    </div>
                    <div className="form-check form-switch m-0 flex-shrink-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id={item.key}
                        checked={isOn(item.key)}
                        onChange={() => toggle(item.key)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-mail-send-line text-primary"></i>
                Delivery Destinations
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted fs-13 mb-3">
                System emails are dispatched to the primary business support email:
              </p>
              <div className="p-3 bg-light rounded border text-dark font-monospace fs-12 mb-3">
                support@bemsfarms.com
              </div>
              <div className="alert alert-info py-2 px-3 fs-12 mb-0 d-flex align-items-center gap-2">
                <i className="ri-information-line fs-16"></i>
                You can change the recipient email in <strong>General Settings</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
