import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

export default function SupplierBalance() {
  const navigate = useNavigate()
  const [balances, setBalances] = useState([])
  const [totalPayable, setTotalPayable] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Record payment modal
  const [showPayment, setShowPayment] = useState(false)
  const [paymentSupplier, setPaymentSupplier] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    supplier_id: '', amount: '', payment_method: 'bank_transfer', reference: '', date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/suppliers/balance')
      setBalances(res.data.suppliers || [])
      setTotalPayable(res.data.total_payable || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load balance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  const openPaymentModal = (supplier) => {
    setPaymentSupplier(supplier)
    setPaymentForm({
      supplier_id: supplier.id || '',
      amount: '',
      payment_method: 'bank_transfer',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowPayment(true)
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/suppliers/payments', paymentForm)
      toast.success('Payment recorded successfully')
      setShowPayment(false)
      fetchBalances()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const filtered = balances.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Supplier Balance Reports</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
          <li className="breadcrumb-item active">Balance Reports</li>
        </ul>
      </div>

      {/* Summary Card */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card border-0 bg-danger-subtle">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="bg-danger text-white rounded d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="ri-money-dollar-circle-line fs-4"></i>
              </div>
              <div>
                <p className="text-muted mb-1 small">Total Payable to Suppliers</p>
                <h4 className="mb-0 text-danger">{fmt(totalPayable)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="bg-primary text-white rounded d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="ri-group-line fs-4"></i>
              </div>
              <div>
                <p className="text-muted mb-1 small">Total Suppliers</p>
                <h4 className="mb-0">{balances.length}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="bg-warning text-white rounded d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                <i className="ri-alert-line fs-4"></i>
              </div>
              <div>
                <p className="text-muted mb-1 small">Suppliers with Outstanding</p>
                <h4 className="mb-0">{balances.filter(s => Number(s.balance_due) > 0).length}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row g-2 justify-content-between align-items-center">
            <div className="col-md-5">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control ps-10"
                  placeholder="Search supplier..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
              </div>
            </div>
            <div className="col-md-3 text-end">
              <button className="btn btn-primary" onClick={() => navigate('/suppliers/payments')}>
                <i className="ri-add-line me-1"></i>Record Payment
              </button>
            </div>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="bg-light">
                <tr>
                  <th className="fw-medium text-muted">Supplier Name</th>
                  <th className="fw-medium text-muted">Total Purchased</th>
                  <th className="fw-medium text-muted">Amount Paid</th>
                  <th className="fw-medium text-muted">Balance Due</th>
                  <th className="fw-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-5">No records found.</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id || i}>
                    <td className="fw-medium">{s.name}</td>
                    <td>{fmt(s.total_purchased)}</td>
                    <td>{fmt(s.amount_paid)}</td>
                    <td>
                      {Number(s.balance_due) > 0
                        ? <span className="fw-bold text-danger">{fmt(s.balance_due)}</span>
                        : <span className="text-success">{fmt(s.balance_due)}</span>
                      }
                    </td>
                    <td>
                      {Number(s.balance_due) > 0 && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openPaymentModal(s)}
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length > 0 && (
                  <tr className="bg-light fw-bold">
                    <td>Total</td>
                    <td>{fmt(filtered.reduce((a, s) => a + Number(s.total_purchased || 0), 0))}</td>
                    <td>{fmt(filtered.reduce((a, s) => a + Number(s.amount_paid || 0), 0))}</td>
                    <td className="text-danger">{fmt(filtered.reduce((a, s) => a + Number(s.balance_due || 0), 0))}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Record Payment — {paymentSupplier?.name}</h6>
                <button className="btn-close" onClick={() => setShowPayment(false)}></button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <p className="text-muted small mb-0">Balance Due</p>
                      <h5 className="text-danger">{fmt(paymentSupplier?.balance_due)}</h5>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Amount (₦) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Payment Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={paymentForm.date}
                        onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Payment Method</label>
                      <select className="form-select" value={paymentForm.payment_method} onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Reference</label>
                      <input className="form-control" placeholder="e.g. TXN-001" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows="2" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light w-50" onClick={() => setShowPayment(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-50" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Record Payment'}
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
