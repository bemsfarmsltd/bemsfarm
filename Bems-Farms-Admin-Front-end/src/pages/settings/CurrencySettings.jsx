import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SettingsTabs from './SettingsTabs'

const BLANK = { code: '', name: '', symbol: '', exchange_rate: '1', is_default: false, is_enabled: true }

export default function CurrencySettings() {
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const load = () => {
    setLoading(true)
    api.get('/admin/settings/currencies')
      .then(res => setCurrencies(res.data.currencies || []))
      .catch(() => toast.error('Failed to load currencies'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openAdd() { setEditing(null); setForm(BLANK); setModalOpen(true) }
  function openEdit(c) {
    setEditing(c)
    setForm({ code: c.code, name: c.name, symbol: c.symbol || '', exchange_rate: c.exchange_rate, is_default: c.is_default, is_enabled: c.is_enabled })
    setModalOpen(true)
  }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) return toast.error('Code and name are required')
    setSaving(true)
    try {
      await api.post('/admin/settings/currencies', form)
      toast.success(editing ? 'Currency updated' : 'Currency added')
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save currency')
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(c) {
    try {
      await api.post('/admin/settings/currencies', { code: c.code, name: c.name, is_enabled: !c.is_enabled })
      load()
    } catch {
      toast.error('Failed to update currency')
    }
  }

  return (
    <div className="container-fluid">
      <SettingsTabs />

      <div className="card">
        <div className="card-header d-flex flex-wrap gap-4 align-items-center justify-content-between">
          <h5 className="card-title mb-1">Currencies</h5>
          <button type="button" className="btn btn-primary" onClick={openAdd}><i className="ri-add-line me-1"></i>Add Currency</button>
        </div>
        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table table-borderless text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Currency Name</th>
                  <th className="fw-medium text-muted">Code</th>
                  <th className="fw-medium text-muted">Symbol</th>
                  <th className="fw-medium text-muted">Exchange Rate</th>
                  <th className="fw-medium text-muted">Default</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">Loading currencies…</td></tr>
                )}
                {!loading && currencies.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">No currencies configured yet.</td></tr>
                )}
                {!loading && currencies.map(c => (
                  <tr key={c.code}>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>{c.symbol || '—'}</td>
                    <td>{c.is_default ? 'Base Currency' : Number(c.exchange_rate).toLocaleString()}</td>
                    <td>{c.is_default ? <span className="badge bg-primary-subtle text-primary">Default</span> : '—'}</td>
                    <td>
                      <span className={`badge ${c.is_enabled ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                        {c.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sub-secondary size-8 btn-icon" onClick={() => openEdit(c)}><i className="ri-edit-line"></i></button>
                        <button type="button" className="btn btn-sub-danger size-8 btn-icon" onClick={() => toggleEnabled(c)}>
                          <i className={c.is_enabled ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <h6 className="mb-0">{editing ? 'Edit Currency' : 'Add Currency'}</h6>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-12">
                    <label className="form-label">Currency Name</label>
                    <input className="form-control" placeholder="e.g. US Dollar" value={form.name} onChange={e => fld('name', e.target.value)} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Currency Code</label>
                    <input className="form-control text-uppercase" placeholder="e.g. USD" maxLength={3} value={form.code} disabled={!!editing}
                      onChange={e => fld('code', e.target.value.toUpperCase())} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Symbol</label>
                    <input className="form-control" placeholder="$" value={form.symbol} onChange={e => fld('symbol', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Exchange Rate (to NGN)</label>
                    <input type="number" step="0.0001" className="form-control" placeholder="1.00" value={form.exchange_rate} onChange={e => fld('exchange_rate', e.target.value)} />
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_default" checked={form.is_default} onChange={e => fld('is_default', e.target.checked)} />
                      <label className="form-check-label" htmlFor="is_default">Set as default currency</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 p-4 pt-0">
                <button type="button" className="btn btn-light w-100" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Currency')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
