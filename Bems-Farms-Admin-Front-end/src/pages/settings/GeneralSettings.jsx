import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const CURRENCIES = [
  { code: 'NGN', label: 'Nigerian Naira (₦)', symbol: '₦' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
]

const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, UTC+1)' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT, UTC+0)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, UTC+2)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
]

const BLANK = {
  store_name: 'Bems Farms Global Ltd',
  store_tagline: 'Fresh farm produce and groceries delivered with trusted quality',
  store_phone: '+234 800 236 7326',
  store_email: 'support@bemsfarms.com',
  store_currency: 'NGN',
  store_address: 'Abia State. Head Office',
  store_city: 'Umuahia / Aba',
  store_country: 'Nigeria',
  store_timezone: 'Africa/Lagos',
  store_tax_id: '',
  store_registration_number: '',
  store_logo_url: '/bemsfarms_logo.png',
  store_opening_hours: 'Mon - Sat: 8:00 AM - 7:00 PM',
  order_auto_confirm: 'true',
  low_stock_default_threshold: '10',
}

export default function GeneralSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/general')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load store settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/general', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Store profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        Loading store settings…
      </div>
    )
  }

  return (
    <div className="container-fluid py-2">
      {/* Sleek Master Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4 pb-2 border-bottom">
        <div>
          <h4 className="mb-1 fw-bold text-dark font-display">Store Profile &amp; Identity</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Manage business credentials, official contacts, currency, and operating hours.
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 shadow-sm fw-medium"
          disabled={saving}
          onClick={handleSave}
        >
          <i className="ri-save-3-line fs-16"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        {/* Left Column: Business & Contact Info */}
        <div className="col-lg-7">
          {/* Card 1: Business Identity & Legal */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-building-line text-primary fs-17"></i>
                Business Identity &amp; Legal
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Store / Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Bems Farms Global Ltd"
                    value={form.store_name || ''}
                    onChange={e => fld('store_name', e.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>RC / Registration No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Optional"
                    value={form.store_registration_number || ''}
                    onChange={e => fld('store_registration_number', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Brand Tagline / Slogan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Fresh farm produce and groceries delivered with trusted quality"
                    value={form.store_tagline || ''}
                    onChange={e => fld('store_tagline', e.target.value)}
                  />
                  <div className="form-text" style={{ fontSize: 11 }}>Printed on receipts, order confirmations, and invoice headers.</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Tax ID / TIN</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 21983021-0001"
                    value={form.store_tax_id || ''}
                    onChange={e => fld('store_tax_id', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Logo Image Path / URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="/bemsfarms_logo.png"
                    value={form.store_logo_url || ''}
                    onChange={e => fld('store_logo_url', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Headquarters Location */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-map-pin-2-line text-primary fs-17"></i>
                Official Contact &amp; Physical Address
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Customer Support Phone</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted"><i className="ri-phone-line"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+234 800 236 7326"
                      value={form.store_phone || ''}
                      onChange={e => fld('store_phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Support Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted"><i className="ri-mail-line"></i></span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="support@bemsfarms.com"
                      value={form.store_email || ''}
                      onChange={e => fld('store_email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Headquarters / Dispatch Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Bems Farms Central Hub, Abia State"
                    value={form.store_address || ''}
                    onChange={e => fld('store_address', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>City / State</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Umuahia / Aba"
                    value={form.store_city || ''}
                    onChange={e => fld('store_city', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Country</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nigeria"
                    value={form.store_country || ''}
                    onChange={e => fld('store_country', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Localization, Currency & Store Rules */}
        <div className="col-lg-5">
          {/* Card 3: Localization & Currency */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-global-line text-primary fs-17"></i>
                Localization &amp; Currency
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Store Base Currency</label>
                  <select
                    className="form-select"
                    value={form.store_currency || 'NGN'}
                    onChange={e => fld('store_currency', e.target.value)}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <div className="form-text" style={{ fontSize: 11 }}>Used for product prices, order settlements, and accounting reports.</div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>System Timezone</label>
                  <select
                    className="form-select"
                    value={form.store_timezone || 'Africa/Lagos'}
                    onChange={e => fld('store_timezone', e.target.value)}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Operating Hours</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted"><i className="ri-time-line"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mon - Sat: 8:00 AM - 7:00 PM"
                      value={form.store_opening_hours || ''}
                      onChange={e => fld('store_opening_hours', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Store Operations & Inventory Defaults */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-settings-4-line text-primary fs-17"></i>
                Store Operations &amp; Inventory Rules
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Low Stock Alert Threshold</label>
                <div className="input-group">
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="10"
                    value={form.low_stock_default_threshold || '10'}
                    onChange={e => fld('low_stock_default_threshold', e.target.value)}
                  />
                  <span className="input-group-text bg-light text-muted">units</span>
                </div>
                <div className="form-text" style={{ fontSize: 11 }}>Triggers alert notifications when inventory dips below this count.</div>
              </div>

              <div className="pt-2 border-top">
                <div className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
                  <div>
                    <label className="form-check-label text-dark fw-medium d-block" style={{ fontSize: 13 }} htmlFor="order_auto_confirm">
                      Auto-Confirm Paid Online Orders
                    </label>
                    <span className="text-muted d-block" style={{ fontSize: 11 }}>
                      Instantly moves successfully paid card/transfer orders to processing.
                    </span>
                  </div>
                  <input
                    className="form-check-input ms-2"
                    type="checkbox"
                    role="switch"
                    id="order_auto_confirm"
                    style={{ width: 44, height: 22, cursor: 'pointer' }}
                    checked={form.order_auto_confirm !== 'false'}
                    onChange={e => fld('order_auto_confirm', e.target.checked ? 'true' : 'false')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
