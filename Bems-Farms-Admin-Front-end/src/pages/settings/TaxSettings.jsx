import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = { tax_enabled: 'false', tax_rate: '7.5', tax_label: 'VAT', tax_inclusive: 'false' }

export default function TaxSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/tax')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load tax settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isOn = (k) => form[k] === 'true'
  const toggle = (k) => fld(k, isOn(k) ? 'false' : 'true')

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/tax', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Tax and VAT settings saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading tax configuration…</div>

  return (
    <div className="container-fluid">
      <SettingsTabs />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Tax &amp; VAT Configuration</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure sales tax, VAT calculation, and display rules for checkout and POS receipts.
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
          <i className="ri-save-line"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Main Tax Config */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-percent-line text-primary"></i>
                Tax Calculation &amp; Rates
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Tax Label / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VAT"
                    value={form.tax_label || ''}
                    onChange={e => fld('tax_label', e.target.value)}
                  />
                  <div className="form-text" style={{ fontSize: 11 }}>Appears on customer receipts and invoices (e.g., VAT, Sales Tax, GST).</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Tax Rate (%)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      placeholder="7.5"
                      value={form.tax_rate || ''}
                      onChange={e => fld('tax_rate', e.target.value)}
                    />
                    <span className="input-group-text bg-light text-dark fw-bold">%</span>
                  </div>
                  <div className="form-text" style={{ fontSize: 11 }}>Standard Nigeria statutory VAT is 7.5%.</div>
                </div>

                <div className="col-12">
                  <hr className="my-1" />
                </div>

                <div className="col-md-6">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="tax_enabled"
                      checked={isOn('tax_enabled')}
                      onChange={() => toggle('tax_enabled')}
                    />
                    <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="tax_enabled">
                      Enable Tax Calculation
                    </label>
                  </div>
                  <p className="text-muted mt-1 mb-0" style={{ fontSize: 12 }}>
                    When enabled, tax is calculated automatically at checkout and on POS terminals.
                  </p>
                </div>

                <div className="col-md-6">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="tax_inclusive"
                      checked={isOn('tax_inclusive')}
                      onChange={() => toggle('tax_inclusive')}
                    />
                    <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="tax_inclusive">
                      Product Prices Include Tax
                    </label>
                  </div>
                  <p className="text-muted mt-1 mb-0" style={{ fontSize: 12 }}>
                    If enabled, product prices are displayed tax-inclusive (tax is extracted rather than added on top).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status Card */}
        <div className="col-lg-4">
          <div className={`card shadow-sm border ${isOn('tax_enabled') ? 'bg-success-subtle border-success-subtle' : 'bg-light border'}`}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className={`fs-20 ${isOn('tax_enabled') ? 'ri-checkbox-circle-fill text-success' : 'ri-close-circle-line text-muted'}`}></i>
                <h6 className="mb-0 fw-bold">{isOn('tax_enabled') ? 'Tax System Active' : 'Tax System Disabled'}</h6>
              </div>
              <p className="text-muted fs-13 mb-0">
                {isOn('tax_enabled')
                  ? `Transactions will automatically compute ${form.tax_rate || 7.5}% ${form.tax_label || 'VAT'} across POS and digital orders.`
                  : 'No tax is currently charged on products or orders.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
