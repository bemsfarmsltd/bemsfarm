import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = { tax_enabled: 'false', tax_rate: '', tax_label: 'VAT', tax_inclusive: 'false' }

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

  async function handleSave() {
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/tax', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Tax settings saved')
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
        <div className="card-body">
          {!isOn('tax_enabled') && (
            <div className="alert alert-sub-warning mb-5">
              <span className="fw-medium">Note:</span> Tax is currently disabled — the rate below will not be applied to POS transactions or invoices until you turn it on.
            </div>
          )}

          <div className="pb-6 mb-5 border-bottom">
            <h6 className="mb-1">Tax Controls</h6>
            <p className="text-muted mb-4">Manage how tax is applied and displayed across the store.</p>
            <div className="d-flex flex-column gap-5">
              <div className="row align-items-center">
                <div className="col-md-5 col-lg-4">
                  <h6 className="mb-1 fw-medium">Enable Tax System</h6>
                </div>
                <div className="col-md-7 col-xxl-4">
                  <div className="form-switch switch-solid-primary mb-1">
                    <input type="checkbox" id="tax_enabled" checked={isOn('tax_enabled')} onChange={() => toggle('tax_enabled')} />
                    <label className="label" htmlFor="tax_enabled"></label>
                  </div>
                  <p className="text-muted">Turn tax calculation on or off for all transactions.</p>
                </div>
              </div>
              <div className="row align-items-center">
                <div className="col-md-5 col-lg-4">
                  <h6 className="mb-1 fw-medium">Prices Include Tax</h6>
                </div>
                <div className="col-md-7 col-xxl-4">
                  <div className="form-switch switch-solid-primary">
                    <input type="checkbox" id="tax_inclusive" checked={isOn('tax_inclusive')} onChange={() => toggle('tax_inclusive')} />
                    <label className="label" htmlFor="tax_inclusive"></label>
                  </div>
                  <p className="text-muted">Whether entered product prices already include tax.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h6 className="mb-1">Tax Rate</h6>
            <p className="text-muted mb-5">Applied automatically to taxable items during billing.</p>
            <div className="d-flex flex-column gap-5">
              <div className="row align-items-center gap-2">
                <div className="col-md-5 col-lg-4">
                  <label htmlFor="tax_label" className="form-label fs-15 mb-0">Tax Display Name</label>
                </div>
                <div className="col-md-5 col-lg-4 col-xxl-3">
                  <input id="tax_label" type="text" className="form-control" placeholder="VAT" value={form.tax_label || ''} onChange={e => fld('tax_label', e.target.value)} />
                </div>
              </div>
              <div className="row align-items-center gap-2">
                <div className="col-md-5 col-lg-4">
                  <label htmlFor="tax_rate" className="form-label fs-15 mb-0">Tax Rate (%)</label>
                </div>
                <div className="col-md-5 col-lg-4 col-xxl-3">
                  <input id="tax_rate" type="number" step="0.1" className="form-control" placeholder="7.5" value={form.tax_rate || ''} onChange={e => fld('tax_rate', e.target.value)} />
                </div>
              </div>
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
