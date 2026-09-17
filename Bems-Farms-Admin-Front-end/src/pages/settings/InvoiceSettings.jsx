import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = {
  invoice_prefix: 'INV-',
  invoice_next_number: '1001',
  invoice_footer: 'Thank you for your business with Bems Farms!',
  invoice_payment_terms: 'Payment is due within 7 days of invoice issue date. Goods remain property of Bems Farms Ltd until fully settled.',
  invoice_bank_info: 'Bank: Access Bank / Zenith Bank\nAccount Name: Bems Farms Limited\nAccount Number: 0123456789',
}

export default function InvoiceSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/invoices')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load invoice settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/invoices', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Invoice templates and numbering saved successfully!')
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
          <h5 className="mb-1 fw-bold">Invoice &amp; Billing Templates</h5>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Configure auto-generated invoice numbering, payment terms, and remittance bank instructions.
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={saving} onClick={handleSave}>
          <i className="ri-save-line"></i>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          {/* Invoice Numbering & Content */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-file-text-line text-primary"></i>
                Invoice Numbering &amp; Messages
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Invoice Number Prefix</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="INV-"
                    value={form.invoice_prefix || ''}
                    onChange={e => fld('invoice_prefix', e.target.value)}
                  />
                  <div className="form-text" style={{ fontSize: 11 }}>e.g. INV-, BF-2026-</div>
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
                  <div className="form-text" style={{ fontSize: 11 }}>Next generated invoice will be: <strong className="text-primary">{form.invoice_prefix || 'INV-'}{form.invoice_next_number || '1001'}</strong></div>
                </div>

                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Invoice Footer Slogan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Thank you for your business with Bems Farms!"
                    value={form.invoice_footer || ''}
                    onChange={e => fld('invoice_footer', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Remittance Info */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-bank-card-line text-primary"></i>
                Payment Terms &amp; Bank Remittance
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Standard Payment Terms &amp; Policies</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Payment terms, due dates, return constraints..."
                    value={form.invoice_payment_terms || ''}
                    onChange={e => fld('invoice_payment_terms', e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-medium text-dark" style={{ fontSize: 13 }}>Bank Account &amp; Wire Details (Printed on Invoices)</label>
                  <textarea
                    className="form-control font-monospace"
                    rows={4}
                    placeholder="Bank Name, Account Name, Account Number..."
                    value={form.invoice_bank_info || ''}
                    onChange={e => fld('invoice_bank_info', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Card */}
        <div className="col-lg-5">
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light-subtle py-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ri-eye-line text-primary"></i>
                Sample Invoice Header Preview
              </h6>
            </div>
            <div className="card-body p-4 bg-light">
              <div className="p-4 bg-white rounded border shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Bems Farms Ltd</h5>
                    <small className="text-muted">Fresh Farm Produce &amp; Groceries</small>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-primary-subtle text-primary font-monospace px-2 py-1 fs-12 fw-bold">
                      {form.invoice_prefix || 'INV-'}{form.invoice_next_number || '1001'}
                    </span>
                  </div>
                </div>

                <div className="border-top pt-3 mt-3 fs-12 text-muted">
                  <div className="fw-semibold text-dark mb-1">Payment Instructions:</div>
                  <pre className="mb-2 bg-light p-2 rounded text-dark font-monospace fs-11" style={{ whiteSpace: 'pre-wrap' }}>
                    {form.invoice_bank_info || 'Bank: Access Bank\nAccount: 0123456789'}
                  </pre>
                  <div className="fst-italic text-center text-muted mt-3">
                    "{form.invoice_footer || 'Thank you for your business!'}"
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
