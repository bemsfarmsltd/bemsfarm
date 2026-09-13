import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR']

const BLANK = {
  store_name: '', store_phone: '', store_email: '', store_currency: 'NGN',
  store_address: '', store_timezone: 'Africa/Lagos',
}

export default function GeneralSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/general')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/general', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('General settings saved')
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
          <h5 className="card-title mb-0">Store &amp; Business Information</h5>
        </div>
        <div className="card-body">
          <div className="row g-5 g-md-6 align-items-center justify-content-between">
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Store Name</h6>
              <p className="text-muted">Displayed on invoices, receipts, and other customer-facing documents.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <input type="text" className="form-control" placeholder="Bems Farms" value={form.store_name || ''} onChange={e => fld('store_name', e.target.value)} />
            </div>
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Contact Number</h6>
              <p className="text-muted">Used for customer support and store communication.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <input type="text" className="form-control" placeholder="+234 800 000 0000" value={form.store_phone || ''} onChange={e => fld('store_phone', e.target.value)} />
            </div>
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Email Address</h6>
              <p className="text-muted">Receives system alerts and important notifications.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <input type="email" className="form-control" placeholder="store@bemsfarms.com" value={form.store_email || ''} onChange={e => fld('store_email', e.target.value)} />
            </div>
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Default Currency</h6>
              <p className="text-muted">Applied to pricing and billing calculations.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <select className="form-select" value={form.store_currency || 'NGN'} onChange={e => fld('store_currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Store Address</h6>
              <p className="text-muted">Shown on receipts and used as the default dispatch origin.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <textarea className="form-control" rows={2} value={form.store_address || ''} onChange={e => fld('store_address', e.target.value)} />
            </div>
            <div className="col-md-8 col-lg-6">
              <h6 className="mb-1 fw-medium">Timezone</h6>
              <p className="text-muted">Used for scheduling and timestamping records.</p>
            </div>
            <div className="col-md-4 col-lg-3 col-xxl-2">
              <input type="text" className="form-control" value={form.store_timezone || ''} onChange={e => fld('store_timezone', e.target.value)} />
            </div>
          </div>
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
