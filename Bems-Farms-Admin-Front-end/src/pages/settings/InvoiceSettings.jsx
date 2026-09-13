import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = { invoice_prefix: '', invoice_next_number: '', invoice_footer: '', invoice_payment_terms: '', invoice_bank_info: '' }

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

  async function handleSave() {
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/invoices', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('Invoice settings saved')
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
          <h6 className="mb-1">Invoice Settings</h6>
          <p className="text-muted mb-5">Default invoice numbering and content used across POS and invoices.</p>
          <div className="d-flex flex-column gap-6">
            <div className="row align-items-center gap-2">
              <div className="col-md-5 col-lg-4">
                <label htmlFor="invoice_prefix" className="form-label fs-15 mb-0">Invoice Number Prefix</label>
              </div>
              <div className="col-md-5 col-lg-4 col-xxl-3">
                <input id="invoice_prefix" type="text" className="form-control w-56" placeholder="INV" value={form.invoice_prefix || ''} onChange={e => fld('invoice_prefix', e.target.value)} />
              </div>
            </div>
            <div className="row align-items-center gap-2">
              <div className="col-md-5 col-lg-4">
                <label htmlFor="invoice_next_number" className="form-label fs-15 mb-0">Next Invoice Number</label>
              </div>
              <div className="col-md-5 col-lg-4 col-xxl-3">
                <input id="invoice_next_number" type="number" className="form-control w-56" placeholder="1000" value={form.invoice_next_number || ''} onChange={e => fld('invoice_next_number', e.target.value)} />
              </div>
            </div>
            <div className="row align-items-center gap-2">
              <div className="col-md-5 col-lg-4">
                <label htmlFor="invoice_footer" className="form-label fs-15 mb-0">Invoice Footer</label>
              </div>
              <div className="col-md-6 col-xxl-5">
                <input id="invoice_footer" type="text" className="form-control" placeholder="Thank you for your business!" value={form.invoice_footer || ''} onChange={e => fld('invoice_footer', e.target.value)} />
              </div>
            </div>
            <div className="row align-items-center gap-2">
              <div className="col-md-5 col-lg-4">
                <label htmlFor="invoice_payment_terms" className="form-label fs-15 mb-0">Payment Terms</label>
              </div>
              <div className="col-md-6 col-xxl-5">
                <textarea id="invoice_payment_terms" className="form-control" rows="4" placeholder="Optional notes about payment terms..." value={form.invoice_payment_terms || ''} onChange={e => fld('invoice_payment_terms', e.target.value)} />
              </div>
            </div>
            <div className="row align-items-center gap-2">
              <div className="col-md-5 col-lg-4">
                <label htmlFor="invoice_bank_info" className="form-label fs-15 mb-0">Payment Information</label>
              </div>
              <div className="col-md-6 col-xxl-5">
                <textarea id="invoice_bank_info" className="form-control" rows="4" placeholder="Bank name, account number, etc..." value={form.invoice_bank_info || ''} onChange={e => fld('invoice_bank_info', e.target.value)} />
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
