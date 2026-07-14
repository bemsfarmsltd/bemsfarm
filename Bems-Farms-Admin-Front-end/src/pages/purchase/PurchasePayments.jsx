import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

export default function PurchasePayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })

  // Filters
  const [poFilter, setPoFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Add payment modal
  const [showAdd, setShowAdd] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [form, setForm] = useState({
    purchase_order_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: '',
    reference: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await api.get('/admin/purchases', { params: { limit: 200 } })
      setPurchaseOrders(res.data.orders || [])
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { fetchPurchaseOrders() }, [fetchPurchaseOrders])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (poFilter) params.purchase_order_id = poFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await api.get('/admin/purchases/payments', { params })
      setPayments(res.data.payments || [])
      setMeta({ total: res.data.total, pages: res.data.pages || 1 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [page, poFilter, fromDate, toDate])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.purchase_order_id) { toast.error('Please select a purchase order'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.payment_date) { toast.error('Please select a payment date'); return }

    setSaving(true)
    try {
      await api.post('/admin/purchases/payments', form)
      toast.success('Payment recorded successfully')
      setShowAdd(false)
      setForm({ purchase_order_id: '', amount: '', payment_method: 'bank_transfer', payment_date: '', reference: '', notes: '' })
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const applyFilters = () => { setPage(1); fetchPayments() }
  const clearFilters = () => { setPoFilter(''); setFromDate(''); setToDate(''); setPage(1) }

  const fmtMethod = (m) => m ? m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

  const startIdx = (page - 1) * 20 + 1
  const endIdx = Math.min(page * 20, meta.total)

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Purchase Payments</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Purchase</a></li>
          <li className="breadcrumb-item active">Payments</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="d-flex flex-wrap gap-4 align-items-center justify-content-between mb-4">
            <h5 className="card-title mb-0">All Purchase Payments</h5>
            <button
              className="btn btn-primary"
              onClick={() => {
                setForm({
                  purchase_order_id: '',
                  amount: '',
                  payment_method: 'bank_transfer',
                  payment_date: new Date().toISOString().split('T')[0],
                  reference: '',
                  notes: '',
                })
                setShowAdd(true)
              }}
            >
              <i data-lucide="plus" className="size-4 me-1"></i>Record Payment
            </button>
          </div>

          {/* Filters */}
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label className="form-label small mb-1">Purchase Order</label>
              <select
                className="form-select"
                style={{ minWidth: 200 }}
                value={poFilter}
                onChange={e => setPoFilter(e.target.value)}
              >
                <option value="">All Orders</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>{po.reference} — {po.supplier_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1">From Date</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label small mb-1">To Date</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="d-flex gap-2 align-self-end">
              <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
              <button className="btn btn-outline-secondary" onClick={clearFilters}>Clear</button>
            </div>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Payment Date</th>
                  <th className="fw-medium text-muted">PO Reference</th>
                  <th className="fw-medium text-muted">Supplier</th>
                  <th className="fw-medium text-muted">Amount</th>
                  <th className="fw-medium text-muted">Method</th>
                  <th className="fw-medium text-muted">Reference</th>
                  <th className="fw-medium text-muted">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                  </td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-5">No payments found.</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="fw-medium">{p.po_reference || p.reference || '—'}</td>
                    <td>{p.supplier_name || '—'}</td>
                    <td className="fw-medium text-success">{fmt(p.amount)}</td>
                    <td>{fmtMethod(p.payment_method)}</td>
                    <td>{p.reference || '—'}</td>
                    <td className="text-wrap" style={{ maxWidth: 200 }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.total > 0 && (
            <div className="row align-items-center g-3 mt-3">
              <div className="col-md-6">
                <p className="text-muted text-center text-md-start mb-0">
                  Showing <b className="me-1">{startIdx}-{endIdx}</b> of <b className="ms-1">{meta.total}</b> Results
                </p>
              </div>
              <div className="col-md-6">
                <nav>
                  <ul className="pagination justify-content-center justify-content-md-end mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                    </li>
                    {Array.from({ length: meta.pages }, (_, i) => i + 1).map(p => (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${page === meta.pages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAdd && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Record Purchase Payment</h6>
                <button className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Purchase Order <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.purchase_order_id}
                        onChange={e => setForm(f => ({ ...f, purchase_order_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Purchase Order</option>
                        {purchaseOrders.map(po => (
                          <option key={po.id} value={po.id}>
                            {po.reference} — {po.supplier_name} (Due: {fmt(po.balance_due)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Amount (₦) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Payment Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.payment_date}
                        onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-select"
                        value={form.payment_method}
                        onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. TXN-001"
                        value={form.reference}
                        onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Optional payment notes..."
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light w-50" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-50" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
