import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const TOGGLES = [
  { key: 'notif_email_enabled', label: 'Email notifications', desc: 'Enable all system emails to staff and admins.' },
  { key: 'notif_sms_enabled', label: 'SMS notifications', desc: 'Enable SMS alerts where a phone number is on file.' },
  { key: 'notif_order_email', label: 'New order emails', desc: 'Email the store when a new order comes in.' },
  { key: 'notif_low_stock', label: 'Low stock alerts', desc: 'Alert the store when products fall below their reorder threshold.' },
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

  async function handleSave() {
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/notifications', settings)
      setSettings(res.data.settings || {})
      toast.success('Notification settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading settings…</div>

  return (
    <div className="container-fluid">
      <SettingsTabs />

      <div className="card mb-5">
        <div className="card-header">
          <h6 className="card-title mb-0">Notifications</h6>
        </div>
        <div className="card-body">
          {TOGGLES.map((t, i) => (
            <div key={t.key} className={`d-flex justify-content-between align-items-center gap-2 ${i > 0 ? 'mt-4' : ''}`}>
              <div>
                <label htmlFor={t.key} className="cursor-pointer mb-0 fw-medium d-block">{t.label}</label>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>{t.desc}</p>
              </div>
              <div className="form-switch switch-outline-primary flex-shrink-0">
                <input type="checkbox" id={t.key} checked={isOn(t.key)} onChange={() => toggle(t.key)} />
                <label className="label" htmlFor={t.key}></label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-end mb-5">
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
