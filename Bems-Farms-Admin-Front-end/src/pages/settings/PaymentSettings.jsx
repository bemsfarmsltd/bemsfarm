import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const KNOWN_GATEWAYS = [
  { slug: 'paystack', name: 'Paystack' },
  { slug: 'flutterwave', name: 'Flutterwave' },
  { slug: 'bank_transfer', name: 'Bank Transfer' },
]

export default function PaymentSettings() {
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ slug: '', name: '', public_key: '', secret_key: '', webhook_url: '', is_live: false, is_enabled: false })

  const load = () => {
    setLoading(true)
    api.get('/admin/settings/payment')
      .then(res => setGateways(res.data.gateways || []))
      .catch(() => toast.error('Failed to load payment gateways'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openConfig(g) {
    setEditing(g)
    setForm({ slug: g.slug, name: g.name || g.slug, public_key: '', secret_key: '', webhook_url: g.webhook_url || '', is_live: g.is_live, is_enabled: g.is_enabled })
    setModalOpen(true)
  }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const configured = KNOWN_GATEWAYS.map(k => ({ ...k, ...gateways.find(g => g.slug === k.slug) }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/admin/settings/payment/${form.slug}`, {
        name: form.name, public_key: form.public_key || undefined, secret_key: form.secret_key || undefined,
        webhook_url: form.webhook_url || undefined, is_live: form.is_live, is_enabled: form.is_enabled,
      })
      toast.success(`${form.name} settings saved`)
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gateway')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid">
      <SettingsTabs />

      <div className="card mb-5">
        <div className="card-body">
          <h6 className="mb-1 fs-16">Payment Gateways</h6>
          <p className="text-muted mb-5">Configure the payment methods available at checkout and in POS.</p>

          {loading && <div className="text-center text-muted py-4">Loading gateways…</div>}

          {!loading && (
            <div className="d-flex flex-column gap-4">
              {configured.map(g => (
                <div key={g.slug} className="d-flex align-items-center justify-content-between border rounded p-3">
                  <div>
                    <div className="fw-medium">{g.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {g.is_enabled
                        ? <span className="text-success"><i className="ri-checkbox-circle-line me-1"></i>Enabled{g.is_live ? ' · Live mode' : ' · Test mode'}</span>
                        : <span className="text-muted"><i className="ri-close-circle-line me-1"></i>Not configured</span>}
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openConfig(g)}>
                    <i className="ri-settings-3-line me-1"></i>Configure
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <h6 className="mb-0">Configure {form.name}</h6>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-12">
                    <label className="form-label">Public Key</label>
                    <input className="form-control" placeholder={editing?.public_key ? 'Configured — leave blank to keep' : 'pk_live_...'} value={form.public_key} onChange={e => fld('public_key', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Secret Key</label>
                    <input type="password" className="form-control" placeholder="Configured — leave blank to keep" value={form.secret_key} onChange={e => fld('secret_key', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Webhook URL</label>
                    <input className="form-control" placeholder="https://api.bemsfarms.com/webhooks/..." value={form.webhook_url} onChange={e => fld('webhook_url', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_enabled" checked={form.is_enabled} onChange={e => fld('is_enabled', e.target.checked)} />
                      <label className="form-check-label" htmlFor="is_enabled">Enabled</label>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_live" checked={form.is_live} onChange={e => fld('is_live', e.target.checked)} />
                      <label className="form-check-label" htmlFor="is_live">Live mode</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 p-4 pt-0">
                <button type="button" className="btn btn-light w-100" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
