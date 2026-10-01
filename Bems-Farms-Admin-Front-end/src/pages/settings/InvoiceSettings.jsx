import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'
import BemsOfficialStamp from '../../components/documents/BemsOfficialStamp'

const BLANK = {
  invoice_prefix: 'INV-',
  invoice_next_number: '1001',
  invoice_bank_name: 'Moniepoint MFB / Zenith Bank',
  invoice_account_name: 'Bems Farms Limited',
  invoice_account_number: '1023849502',
  invoice_secondary_bank: 'Zenith Bank',
  invoice_secondary_account_number: '1223849502',
  invoice_company_name: 'Bems Farms Limited',
  invoice_company_address: 'Central Farm Settlement Hub, Umuahia, Abia State',
  invoice_rc_number: 'RC 1849204',
  invoice_tin: 'TIN 24819402-0001',
  invoice_phone: '+234 800 236 7326 / +234 814 000 0000',
  invoice_email: 'corporate@bemsfarms.com',
  invoice_footer: 'Thank you for choosing Bems Farms. Premium farm produce from Abia State to your table.',
  invoice_payment_terms: 'Payment is due within 7 days of invoice issue date. Goods are released on confirmation of payment.',
  company_signature_url: '',
}

export default function InvoiceSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const sigInputRef = useRef(null)

  useEffect(() => {
    api.get('/admin/settings/invoices')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load invoice settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'invoice_account_name') next.account_name = v
    if (k === 'invoice_bank_name') next.bank_name = v
    if (k === 'invoice_account_number') next.account_number = v
    if (k === 'invoice_secondary_bank') next.secondary_bank = v
    if (k === 'invoice_secondary_account_number') next.secondary_account = v
    if (k === 'invoice_company_name') next.company_name = v
    return next
  })

  // Convert uploaded file to base64 and store in form
  function handleSignatureFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Signature image must be under 1.5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => fld('company_signature_url', ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        bank_name: form.invoice_bank_name,
        account_name: form.invoice_account_name,
        account_number: form.invoice_account_number,
        secondary_bank: form.invoice_secondary_bank,
        secondary_account: form.invoice_secondary_account_number,
      }
      const res = await api.post('/admin/settings/invoices', payload)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Bems Farms invoice templates and bank details saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container-fluid py-5 text-center text-muted">Loading invoice configuration…</div>

  return (
    <div className="container-fluid">
      <SettingsTabs />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Invoice &amp; Official Billing Settings</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure official Bems Farms bank accounts, RC &amp; TIN credentials, numbering, and payment remittance instructions.
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
          <i className="ri-save-line"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          {/* Bank Remittance Account Details */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-success">
                <i className="ri-bank-card-line"></i>
                Official Remittance Bank Accounts
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Account Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Bems Farms Limited"
                    value={form.invoice_account_name || ''}
                    onChange={e => fld('invoice_account_name', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Primary Bank Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Moniepoint MFB / Zenith Bank"
                    value={form.invoice_bank_name || ''}
                    onChange={e => fld('invoice_bank_name', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Primary Account Number *</label>
                  <input
                    type="text"
                    className="form-control font-monospace fw-bold"
                    placeholder="1023849502"
                    value={form.invoice_account_number || ''}
                    onChange={e => fld('invoice_account_number', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Secondary Bank (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Zenith Bank"
                    value={form.invoice_secondary_bank || ''}
                    onChange={e => fld('invoice_secondary_bank', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Secondary Account Number</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="1223849502"
                    value={form.invoice_secondary_account_number || ''}
                    onChange={e => fld('invoice_secondary_account_number', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legal Credentials & Contact Details */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-government-line text-primary"></i>
                Corporate Credentials &amp; Contacts
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Company Legal Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Bems Farms Limited"
                    value={form.invoice_company_name || ''}
                    onChange={e => fld('invoice_company_name', e.target.value)}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>RC Number</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="RC 1849204"
                    value={form.invoice_rc_number || ''}
                    onChange={e => fld('invoice_rc_number', e.target.value)}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>TIN Number</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="TIN 24819402-0001"
                    value={form.invoice_tin || ''}
                    onChange={e => fld('invoice_tin', e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Farm Hub / Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Central Farm Settlement Hub, Umuahia, Abia State"
                    value={form.invoice_company_address || ''}
                    onChange={e => fld('invoice_company_address', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Billing &amp; Corporate Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="corporate@bemsfarms.com"
                    value={form.invoice_email || ''}
                    onChange={e => fld('invoice_email', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Support Phone Numbers</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+234 800 236 7326 / +234 814 000 0000"
                    value={form.invoice_phone || ''}
                    onChange={e => fld('invoice_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Numbering & Terms */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-file-text-line text-primary"></i>
                Invoice Numbering &amp; Payment Terms
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Invoice Prefix</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="INV-"
                    value={form.invoice_prefix || ''}
                    onChange={e => fld('invoice_prefix', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Next Sequence Number</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control font-monospace"
                    placeholder="1001"
                    value={form.invoice_next_number || ''}
                    onChange={e => fld('invoice_next_number', e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Payment Terms &amp; Policies</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Payment terms, due dates..."
                    value={form.invoice_payment_terms || ''}
                    onChange={e => fld('invoice_payment_terms', e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Invoice Footer Slogan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Thank you for choosing Bems Farms..."
                    value={form.invoice_footer || ''}
                    onChange={e => fld('invoice_footer', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info & Assets Column */}
        <div className="col-lg-5">
          {/* 1. Official Authorized Signature Upload */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-quill-pen-line text-success fs-5"></i>
                Authorized Company Signature
              </h6>
              {form.company_signature_url && (
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  Active System-Wide
                </span>
              )}
            </div>
            <div className="card-body p-4">
              <p className="text-muted small mb-3">
                Upload the authorized executive signature (e.g. Managing Director, Financial Controller, or Head of Accounts). This signature is automatically affixed to all official invoices, receipts, waybills, and driver statements.
              </p>

              <input
                type="file"
                ref={sigInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleSignatureFile}
              />

              {form.company_signature_url ? (
                <div className="border rounded-3 p-3 bg-light text-center">
                  <div
                    className="p-3 bg-white rounded-2 border d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{
                      minHeight: 110,
                      maxWidth: 280,
                      backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                      backgroundSize: '12px 12px'
                    }}
                  >
                    <img
                      src={form.company_signature_url}
                      alt="Authorized Signature"
                      style={{ maxHeight: 85, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5"
                      onClick={() => sigInputRef.current?.click()}
                    >
                      <i className="ri-upload-2-line"></i> Replace Signature
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5"
                      onClick={() => fld('company_signature_url', '')}
                    >
                      <i className="ri-delete-bin-line"></i> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="border border-2 border-dashed rounded-3 p-4 text-center cursor-pointer bg-light hover-bg-white transition-all"
                  style={{ cursor: 'pointer', borderColor: '#94a3b8' }}
                  onClick={() => sigInputRef.current?.click()}
                >
                  <div className="text-muted mb-2">
                    <i className="ri-signature-line fs-1 text-secondary opacity-75"></i>
                  </div>
                  <div className="fw-semibold text-dark mb-1">Click to Upload Signature Image</div>
                  <div className="text-muted small">PNG with transparent background recommended (max 1.5MB)</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-success mt-3 px-3 d-inline-flex align-items-center gap-1.5"
                  >
                    <i className="ri-upload-cloud-line"></i> Select Image File
                  </button>
                </div>
              )}

              <div className="alert alert-info py-2 px-3 mt-3 mb-0 d-flex align-items-center gap-2 small">
                <i className="ri-information-line fs-5 text-info flex-shrink-0"></i>
                <span>Remember to click <strong>Save Changes</strong> at the top to save the updated signature across all documents.</span>
              </div>
            </div>
          </div>

          {/* 2. Permanent Official Company Stamp Preview */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <i className="ri-shield-check-line text-success fs-5"></i>
                Official Company Seal / Stamp
              </h6>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                Permanent Built-in
              </span>
            </div>
            <div className="card-body p-4 text-center">
              <p className="text-muted small mb-3 text-start">
                This executive corporate stamp is permanently rendered by code on every official document, featuring verified registration numbers and corporate seals.
              </p>
              <div
                className="p-4 bg-light rounded-3 border d-flex flex-column align-items-center justify-content-center mx-auto"
                style={{ maxWidth: 300 }}
              >
                <BemsOfficialStamp
                  size={120}
                  companyName={form.invoice_company_name || 'BEMS FARMS LIMITED'}
                />
                <div className="mt-3">
                  <span className="badge bg-success text-white px-2.5 py-1" style={{ fontSize: 11 }}>
                    Official Corporate Seal
                  </span>
                  <div className="text-muted small mt-1 font-monospace" style={{ fontSize: 11 }}>
                    Federal Republic of Nigeria
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Live Remittance Preview */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-eye-line text-primary"></i>
                Live Remittance Preview
              </h6>
            </div>
            <div className="card-body p-4 bg-light">
              <div className="p-4 bg-white rounded border shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">{form.invoice_company_name || 'Bems Farms Limited'}</h5>
                    <small className="text-muted">{form.invoice_company_address || 'Central Farm Settlement Hub, Umuahia'}</small>
                    <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                      {form.invoice_email || 'corporate@bemsfarms.com'} · {form.invoice_phone || '+234 800 236 7326'}
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success-subtle text-success font-monospace px-2.5 py-1.5 fs-12 fw-bold">
                      {form.invoice_prefix || 'INV-'}{form.invoice_next_number || '1001'}
                    </span>
                  </div>
                </div>

                <div className="border-top pt-3 mt-3 fs-12 text-muted">
                  <div className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                    <i className="ri-bank-line text-success"/>Official Remittance Bank Details:
                  </div>
                  <div className="bg-light p-3 rounded text-dark font-monospace fs-12 border">
                    <div><strong>Bank:</strong> {form.invoice_bank_name || 'Moniepoint MFB / Zenith Bank'}</div>
                    <div><strong>Account Name:</strong> {form.invoice_account_name || 'Bems Farms Limited'}</div>
                    <div><strong>Account Number:</strong> <span className="text-primary fw-bold">{form.invoice_account_number || '1023849502'}</span></div>
                    {form.invoice_secondary_bank && form.invoice_secondary_account_number && (
                      <div className="mt-1 pt-1 border-top text-muted">
                        <strong>Alt:</strong> {form.invoice_secondary_bank} ({form.invoice_secondary_account_number})
                      </div>
                    )}
                  </div>
                  <div className="fst-italic text-center text-muted mt-3">
                    "{form.invoice_footer || 'Thank you for choosing Bems Farms.'}"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
