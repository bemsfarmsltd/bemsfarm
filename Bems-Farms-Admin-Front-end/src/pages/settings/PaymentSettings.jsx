import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const KNOWN_GATEWAYS = [
  { slug: 'paystack', name: 'Paystack', description: 'Debit/Credit Cards, USSD, Bank Transfer, Apple Pay', icon: 'ri-secure-payment-line', isOnline: true },
  { slug: 'flutterwave', name: 'Flutterwave', description: 'Cards, Mobile Money, Barter, USSD, Bank Transfer', icon: 'ri-wallet-3-line', isOnline: true },
  { slug: 'moniepoint', name: 'Moniepoint POS & Terminal', description: 'In-store POS card swiping and dynamic virtual accounts', icon: 'ri-terminal-box-line', isOnline: true },
  { slug: 'bank_transfer', name: 'Direct Bank Transfer', description: 'Manual bank deposit to corporate account (Manual receipt upload)', icon: 'ri-bank-line', isManual: true },
  { slug: 'cod', name: 'Cash on Delivery (COD)', description: 'Customer pays cash or POS on arrival with delivery driver', icon: 'ri-hand-coin-line', isOffline: true },
]

const BLANK_FORM = {
  slug: '',
  name: '',
  public_key: '',
  secret_key: '',
  webhook_url: '',
  account_number: '',
  bank_name: '',
  account_name: '',
  is_live: true,
  is_enabled: false,
}

const BLANK_TAX = {
  tax_enabled: 'false',
  tax_rate: '7.5',
  tax_label: 'VAT',
  tax_inclusive: 'false',
}

export default function PaymentSettings() {
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  // Tax & VAT State
  const [taxForm, setTaxForm] = useState(BLANK_TAX)
  const [taxSaving, setTaxSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/settings/payment').then(res => setGateways(res.data.gateways || [])).catch(() => toast.error('Failed to load gateways')),
      api.get('/admin/settings/tax').then(res => setTaxForm(f => ({ ...f, ...res.data.settings }))).catch(() => {})
    ]).finally(() => setLoading(false))
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
      is_enabled: g.is_enabled ?? false,
    })
    setModalOpen(true)
  }

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const taxFld = (k, v) => setTaxForm(f => ({ ...f, [k]: v }))

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

  async function handleSaveTax(e) {
    if (e) e.preventDefault()
    setTaxSaving(true)
    try {
      const res = await api.post('/admin/settings/tax', taxForm)
      setTaxForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Tax and VAT settings saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save tax settings')
    } finally {
      setTaxSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        Loading payment &amp; tax settings…
      </div>
    )
  }

  const cod = configured.find(g => g.slug === 'cod') || { slug: 'cod', name: 'Cash on Delivery', is_enabled: true }
  const isCodEnabled = !!cod.is_enabled
  const isTaxActive = taxForm.tax_enabled === 'true'

  return (
    <div className="container-fluid py-2">
      {/* Clean Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4 pb-2 border-bottom">
        <div>
          <h4 className="mb-1 fw-bold text-dark font-display">Payment &amp; Tax Settings</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Manage online payment gateways, Cash on Delivery (COD), and statutory VAT calculation rules.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-dark border px-3 py-2 fs-12 fw-medium">
            {configured.filter(g => g.is_enabled).length} Payment Methods Active
          </span>
        </div>
      </div>

      {/* Prominent Quick Switch for Cash on Delivery */}
      <div
        className="card shadow-sm border mb-4"
        style={{ borderLeft: isCodEnabled ? '4px solid #10b981' : '4px solid #ef4444' }}
      >
        <div className="card-body p-3 p-md-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-sm"
              style={{ width: 46, height: 46, background: isCodEnabled ? '#10b981' : '#6b7280' }}
            >
              <i className="ri-hand-coin-line fs-22"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h6 className="mb-0 fw-bold text-dark fs-15">Cash on Delivery (Doorstep Payment)</h6>
                {isCodEnabled ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 fw-bold">
                    ● COD Enabled (Storefront Active)
                  </span>
                ) : (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5 fs-11 fw-bold">
                    ○ COD Disabled (Prepaid Only)
                  </span>
                )}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>
                {isCodEnabled
                  ? 'Shoppers can select Cash on Delivery at checkout to pay upon arrival with cash or portable POS card terminal.'
                  : 'Cash on Delivery is turned OFF. Shoppers must pay online before placing an order.'}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3 ms-auto">
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold ${isCodEnabled ? 'btn-outline-danger' : 'btn-success text-white'}`}
              onClick={() => handleToggleQuick(cod, isCodEnabled)}
            >
              <i className={isCodEnabled ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'}></i>
              {isCodEnabled ? 'Disable COD' : 'Enable COD'}
            </button>
            <div className="form-check form-switch m-0 ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="cod-quick-switch"
                style={{ width: 44, height: 24, cursor: 'pointer' }}
                checked={isCodEnabled}
                onChange={() => handleToggleQuick(cod, isCodEnabled)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Supported Payment Gateways */}
        <div className="col-lg-7">
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-bank-card-line text-primary fs-17"></i>
                Supported Payment Processors
              </h6>
              <span className="badge bg-light text-muted border px-2 py-1 fs-11">
                Storefront &amp; POS
              </span>
            </div>

            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {configured.map(g => (
                  <div key={g.slug} className="list-group-item p-3 p-md-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar-md rounded-3 bg-light border d-flex align-items-center justify-content-center text-primary flex-shrink-0" style={{ width: 42, height: 42 }}>
                        <i className={`${g.icon} fs-20`}></i>
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: 14 }}>{g.name}</h6>
                          {g.is_enabled ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 fw-medium">
                              ● Enabled {g.isOffline ? '(Doorstep)' : g.is_live ? '(Live)' : '(Test)'}
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border px-2 py-0.5 fs-11">
                              ○ Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-muted mb-0 mt-0.5" style={{ fontSize: 12 }}>{g.description}</p>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 ms-auto">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 px-3 py-1.5"
                        style={{ fontSize: 12 }}
                        onClick={() => openConfig(g)}
                      >
                        <i className="ri-settings-3-line"></i> {g.slug === 'cod' ? 'Configure COD' : 'Configure'}
                      </button>
                      <div className="form-check form-switch m-0 ms-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          style={{ width: 40, height: 20, cursor: 'pointer' }}
                          title={g.is_enabled ? `Disable ${g.name}` : `Enable ${g.name}`}
                          checked={!!g.is_enabled}
                          onChange={() => handleToggleQuick(g, !!g.is_enabled)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tax & VAT Configuration (Integrated cleanly) */}
        <div className="col-lg-5">
          {/* Card: Tax & VAT */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-percent-line text-primary fs-17"></i>
                Statutory Tax &amp; VAT
              </h6>
              <span className={`badge ${isTaxActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'} px-2 py-0.5 fs-11 fw-medium`}>
                {isTaxActive ? 'VAT Active' : 'VAT Inactive'}
              </span>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-7">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Tax Label / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VAT"
                    value={taxForm.tax_label || ''}
                    onChange={e => taxFld('tax_label', e.target.value)}
                  />
                  <div className="form-text" style={{ fontSize: 11 }}>Appears on customer receipts.</div>
                </div>

                <div className="col-5">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Rate (%)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control fw-bold"
                      placeholder="7.5"
                      value={taxForm.tax_rate || ''}
                      onChange={e => taxFld('tax_rate', e.target.value)}
                    />
                    <span className="input-group-text bg-light text-muted fw-bold">%</span>
                  </div>
                  <div className="form-text" style={{ fontSize: 11 }}>Nigeria statutory: 7.5%.</div>
                </div>

                <div className="col-12 pt-2 border-top">
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="tax_enabled_switch"
                      style={{ cursor: 'pointer' }}
                      checked={isTaxActive}
                      onChange={e => taxFld('tax_enabled', e.target.checked ? 'true' : 'false')}
                    />
                    <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="tax_enabled_switch">
                      Enable Tax Calculation at Checkout
                    </label>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      Calculates VAT automatically on web cart and POS register orders.
                    </div>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="tax_inclusive_switch"
                      style={{ cursor: 'pointer' }}
                      checked={taxForm.tax_inclusive === 'true'}
                      onChange={e => taxFld('tax_inclusive', e.target.checked ? 'true' : 'false')}
                    />
                    <label className="form-check-label text-dark fw-medium" style={{ fontSize: 13 }} htmlFor="tax_inclusive_switch">
                      Product Prices Include Tax
                    </label>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      If checked, prices already contain VAT instead of adding on top.
                    </div>
                  </div>
                </div>

                <div className="col-12 pt-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-medium"
                    style={{ fontSize: 13 }}
                    disabled={taxSaving}
                    onClick={handleSaveTax}
                  >
                    <i className="ri-save-line"></i>
                    {taxSaving ? 'Saving Tax Rules…' : 'Save Tax & VAT Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice on Settlement */}
          <div className="card bg-light-subtle border shadow-sm">
            <div className="card-body p-3">
              <div className="d-flex align-items-start gap-2.5">
                <i className="ri-information-line fs-18 text-primary mt-0.5"></i>
                <div>
                  <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: 13 }}>Corporate Settlement Notice</h6>
                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                    Card payments via Paystack and Flutterwave settle directly into your registered corporate accounts according to your provider payout schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Configuration Modal */}
      {modalOpen && (
        <>
          <div className="modal fade show d-block" style={{ zIndex: 1055 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: form.slug === 'bank_transfer' ? 560 : 500 }}>
              <div className="modal-content shadow border-0 rounded-3">
                <div className="modal-header border-bottom py-3">
                  <h6 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="ri-settings-3-line text-primary"></i>
                    Configure {form.name}
                  </h6>
                  <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
                </div>

                <form onSubmit={handleSave}>
                  <div className="modal-body p-4">
                    {form.slug === 'cod' ? (
                      <div className="p-3 bg-light rounded border text-muted" style={{ fontSize: 13 }}>
                        <div className="d-flex align-items-center gap-2 mb-2 text-dark">
                          <i className="ri-hand-coin-line fs-20 text-success"></i>
                          <h6 className="fw-bold mb-0">Cash on Delivery &amp; Doorstep Payment Settings</h6>
                        </div>
                        <p className="mb-2 text-dark">
                          When this option is <strong>Enabled</strong>, shoppers on the web storefront and mobile app can complete their order without an upfront card or transfer payment, and settle directly with cash or portable POS upon delivery.
                        </p>
                        <div className="p-2.5 bg-white rounded border border-warning-subtle text-dark mb-0">
                          <div className="fw-semibold text-warning-emphasis mb-1">
                            <i className="ri-shield-check-line me-1"></i> Disabling Cash on Delivery:
                          </div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            Switching this off immediately removes Cash on Delivery from customer checkout, enforcing 100% upfront online payments.
                          </div>
                        </div>
                      </div>
                    ) : form.slug === 'bank_transfer' ? (
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Bank Name</label>
                          <input
                            className="form-control"
                            placeholder="Globus Bank"
                            value={form.bank_name || ''}
                            onChange={e => fld('bank_name', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Account Number</label>
                          <input
                            className="form-control font-monospace fw-bold"
                            placeholder="1000574564"
                            value={form.account_number || ''}
                            onChange={e => fld('account_number', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Account Name</label>
                          <input
                            className="form-control"
                            placeholder="Bems Farms Global LTD"
                            value={form.account_name || ''}
                            onChange={e => fld('account_name', e.target.value)}
                          />
                        </div>
                        <div className="col-12 mt-2">
                          <div className="p-2.5 rounded-3 bg-light border text-muted" style={{ fontSize: 12 }}>
                            <i className="ri-information-line text-success me-1"></i>
                            Synchronized with official company billing. Full remittance &amp; template options are in{' '}
                            <Link to="/settings/invoices" className="fw-semibold text-success text-decoration-underline" onClick={() => setModalOpen(false)}>
                              Invoice &amp; Bank Settings
                            </Link>.
                          </div>
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

                    <hr className="my-3" />

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
                            {form.slug === 'cod' ? 'Allow Cash on Delivery at checkout' : 'Enable this gateway'}
                          </label>
                        </div>
                      </div>
                      {form.slug !== 'bank_transfer' && form.slug !== 'cod' && (
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
                              Live Production Mode
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
