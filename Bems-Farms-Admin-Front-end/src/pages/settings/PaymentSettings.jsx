import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const KNOWN_GATEWAYS = [
  {
    slug: 'paystack',
    name: 'Paystack',
    desc: 'Accept Cards, USSD, Bank Transfers, and Apple Pay seamlessly across Nigeria.',
    color: '#00c3f7',
    icon: 'ri-bank-card-2-line',
    currencies: 'NGN, USD, GHS, KES, ZAR',
  },
  {
    slug: 'flutterwave',
    name: 'Flutterwave',
    desc: 'Multi-currency payments covering Cards, Mobile Money, and Bank Accounts across Africa & globally.',
    color: '#fb9129',
    icon: 'ri-global-line',
    currencies: 'NGN, USD, GBP, EUR',
  },
  {
    slug: 'monnify',
    name: 'Monnify',
    desc: 'Direct reserved account bank transfers and automated settlement for Nigerian merchants.',
    color: '#0066f5',
    icon: 'ri-building-4-line',
    currencies: 'NGN',
  },
  {
    slug: 'bank_transfer',
    name: 'Direct Manual Bank Transfer',
    desc: 'Customers transfer directly into your official corporate bank account and upload proof of payment.',
    color: '#059669',
    icon: 'ri-exchange-dollar-line',
    currencies: 'NGN',
  },
]

export default function PaymentSettings() {
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    slug: '',
    name: '',
    public_key: '',
    secret_key: '',
    webhook_url: '',
    account_number: '',
    bank_name: '',
    account_name: '',
    is_live: true,
    is_enabled: false
  })

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
    setForm({
      slug: g.slug,
      name: g.name || g.slug,
      public_key: '',
      secret_key: '',
      webhook_url: g.webhook_url || '',
      account_number: g.account_number || '',
      bank_name: g.bank_name || '',
      account_name: g.account_name || '',
      is_live: g.is_live ?? true,
      is_enabled: g.is_enabled ?? false
    })
    setModalOpen(true)
  }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const configured = KNOWN_GATEWAYS.map(k => ({ ...k, ...gateways.find(g => g.slug === k.slug) }))

  async function handleToggleQuick(g, currentState) {
    try {
      await api.post(`/admin/settings/payment/${g.slug}`, {
        ...g,
        is_enabled: !currentState,
      })
      toast.success(`${g.name} ${!currentState ? 'enabled' : 'disabled'}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update gateway status')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/admin/settings/payment/${form.slug}`, {
        name: form.name,
        public_key: form.public_key || undefined,
        secret_key: form.secret_key || undefined,
        webhook_url: form.webhook_url || undefined,
        account_number: form.account_number || undefined,
        bank_name: form.bank_name || undefined,
        account_name: form.account_name || undefined,
        is_live: form.is_live,
        is_enabled: form.is_enabled,
      })
      toast.success(`${form.name} configuration saved!`)
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

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Payment Gateways &amp; Settlement</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure active payment processors for storefront checkout, mobile orders, and in-store POS.
          </p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-bank-card-line text-primary"></i>
                Supported Payment Processors
              </h6>
              <span className="badge bg-white text-muted border px-2 py-1 fs-12">
                {configured.filter(g => g.is_enabled).length} Active
              </span>
            </div>

            <div className="card-body p-0">
              {loading && <div className="text-center text-muted py-5">Loading gateway configurations…</div>}

              {!loading && (
                <div className="divide-y">
                  {configured.map((g) => (
                    <div key={g.slug} className="p-4 border-bottom last-border-none d-flex flex-wrap align-items-center justify-content-between gap-3 hover-bg-light transition-all">
                      <div className="d-flex align-items-start gap-3" style={{ maxWidth: 460 }}>
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                          style={{ width: 48, height: 48, background: `${g.color}18`, border: `1px solid ${g.color}35` }}
                        >
                          <i className={`${g.icon} fs-22`} style={{ color: g.color }}></i>
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <h6 className="mb-0 fw-bold text-dark">{g.name}</h6>
                            {g.is_enabled ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 fw-medium">
                                ● Enabled {g.is_live ? '(Live)' : '(Test Mode)'}
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary border px-2 py-0.5 fs-11">
                                ○ Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-muted mb-1" style={{ fontSize: 12 }}>{g.desc}</p>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            Currencies: <span className="font-monospace fw-medium text-dark">{g.currencies}</span>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 px-3"
                          onClick={() => openConfig(g)}
                        >
                          <i className="ri-settings-3-line"></i> Configure Keys
                        </button>
                        <div className="form-check form-switch m-0 ms-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            title={g.is_enabled ? 'Disable gateway' : 'Enable gateway'}
                            checked={!!g.is_enabled}
                            onChange={() => handleToggleQuick(g, !!g.is_enabled)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="col-lg-4">
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-shield-keyhole-line text-primary"></i>
                Security &amp; Webhooks
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted fs-13 mb-3">
                All API secret keys are encrypted at rest with AES-256 and never logged or exposed in client bundles.
              </p>
              <div className="p-3 bg-light rounded border mb-3">
                <div className="fw-semibold text-dark mb-1" style={{ fontSize: 12 }}>Paystack Webhook Endpoint:</div>
                <code className="text-primary bg-white p-1.5 rounded border d-block text-break" style={{ fontSize: 11 }}>
                  https://bemsfarms.com/api/webhooks/paystack
                </code>
              </div>
              <div className="p-3 bg-light rounded border">
                <div className="fw-semibold text-dark mb-1" style={{ fontSize: 12 }}>Flutterwave Webhook Endpoint:</div>
                <code className="text-primary bg-white p-1.5 rounded border d-block text-break" style={{ fontSize: 11 }}>
                  https://bemsfarms.com/api/webhooks/flutterwave
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configure Modal */}
      {modalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded p-1.5 bg-primary-subtle text-primary">
                      <i className="ri-bank-card-line fs-18"></i>
                    </div>
                    <h6 className="modal-title fw-bold mb-0">Configure {form.name}</h6>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
                </div>

                <form onSubmit={handleSave}>
                  <div className="modal-body p-4">
                    {form.slug === 'bank_transfer' ? (
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Bank Name</label>
                          <input
                            className="form-control"
                            placeholder="e.g. Access Bank / Zenith Bank"
                            value={form.bank_name}
                            onChange={e => fld('bank_name', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Account Number</label>
                          <input
                            className="form-control font-monospace"
                            placeholder="0123456789"
                            value={form.account_number}
                            onChange={e => fld('account_number', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Account Name</label>
                          <input
                            className="form-control"
                            placeholder="Bems Farms Limited"
                            value={form.account_name}
                            onChange={e => fld('account_name', e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Public / Client Key</label>
                          <input
                            className="form-control font-monospace"
                            placeholder={editing?.public_key ? '•••••••••••••••• (Leave blank to keep existing)' : 'pk_live_...'}
                            value={form.public_key}
                            onChange={e => fld('public_key', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Secret API Key</label>
                          <input
                            type="password"
                            className="form-control font-monospace"
                            placeholder={editing?.secret_key ? '•••••••••••••••• (Leave blank to keep existing)' : 'sk_live_...'}
                            value={form.secret_key}
                            onChange={e => fld('secret_key', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Custom Webhook URL (Optional)</label>
                          <input
                            className="form-control font-monospace"
                            placeholder="https://bemsfarms.com/api/webhooks/..."
                            value={form.webhook_url}
                            onChange={e => fld('webhook_url', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <hr className="my-4" />

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="is_enabled_modal"
                            checked={form.is_enabled}
                            onChange={e => fld('is_enabled', e.target.checked)}
                          />
                          <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="is_enabled_modal">
                            Enable this gateway at checkout
                          </label>
                        </div>
                      </div>
                      {form.slug !== 'bank_transfer' && (
                        <div className="col-md-6">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="is_live_modal"
                              checked={form.is_live}
                              onChange={e => fld('is_live', e.target.checked)}
                            />
                            <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="is_live_modal">
                              Live Production Mode (Real charges)
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer border-top bg-light-subtle py-3">
                    <button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={() => setModalOpen(false)}></div>
        </>
      )}
    </div>
  )
}
