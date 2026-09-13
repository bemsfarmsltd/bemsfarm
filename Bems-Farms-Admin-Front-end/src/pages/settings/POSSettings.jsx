import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = { pos_receipt_header: '', pos_receipt_footer: '', pos_print_receipt: 'true', pos_low_stock_threshold: '' }

export default function POSSettings() {
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings/pos')
      .then(res => setForm(f => ({ ...f, ...res.data.settings })))
      .catch(() => toast.error('Failed to load POS settings'))
      .finally(() => setLoading(false))
  }, [])

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isOn = (k) => form[k] === 'true'

  async function handleSave() {
    setSaving(true)
    try {
      const res = await api.post('/admin/settings/pos', form)
      setForm(f => ({ ...f, ...res.data.settings }))
      toast.success('POS settings saved')
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
          <h6 className="mb-1">POS Configuration</h6>
          <p className="text-muted mb-5">Manage receipt content and stock alert threshold used by the register.</p>
          <div className="d-flex flex-column gap-6">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <label htmlFor="pos_receipt_header" className="form-label mb-0 fs-15">Receipt Header</label>
              </div>
              <div className="col-md-8">
                <input id="pos_receipt_header" className="form-control w-56" placeholder="Bems Farms" value={form.pos_receipt_header || ''} onChange={e => fld('pos_receipt_header', e.target.value)} />
              </div>
            </div>
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <label htmlFor="pos_receipt_footer" className="form-label mb-0 fs-15">Receipt Footer</label>
              </div>
              <div className="col-md-8">
                <input id="pos_receipt_footer" className="form-control w-56" placeholder="Thank you!" value={form.pos_receipt_footer || ''} onChange={e => fld('pos_receipt_footer', e.target.value)} />
              </div>
            </div>
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <label className="form-label mb-0 fs-15">Auto Print Receipt</label>
              </div>
              <div className="col-md-8">
                <div className="form-switch switch-light-primary">
                  <input type="checkbox" id="pos_print_receipt" checked={isOn('pos_print_receipt')} onChange={() => fld('pos_print_receipt', isOn('pos_print_receipt') ? 'false' : 'true')} />
                  <label className="label" htmlFor="pos_print_receipt"></label>
                </div>
              </div>
            </div>
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <label htmlFor="pos_low_stock_threshold" className="form-label mb-0 fs-15">Low Stock Alert Threshold</label>
              </div>
              <div className="col-md-8">
                <input type="number" className="form-control w-28" id="pos_low_stock_threshold" placeholder="5" value={form.pos_low_stock_threshold || ''} onChange={e => fld('pos_low_stock_threshold', e.target.value)} />
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
