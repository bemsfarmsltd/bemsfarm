import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

function ReturnStatusBadge({ status }) {
  const map = {
    pending: { cls: 'bg-warning-subtle text-warning border-warning-subtle', label: 'Pending' },
    approved: { cls: 'bg-success-subtle text-success border-success-subtle', label: 'Approved' },
    rejected: { cls: 'bg-danger-subtle text-danger border-danger-subtle', label: 'Rejected' },
    completed: { cls: 'bg-primary-subtle text-primary border-primary-subtle', label: 'Completed' },
  }
  const s = map[status] || { cls: 'bg-light text-muted', label: status || '—' }
  return <span className={`badge border ${s.cls}`}>{s.label}</span>
}

export default function PurchaseReturns() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })

  // View modal
  const [viewReturn, setViewReturn] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [viewLoading, setViewLoading] = useState(false)

  // Add return modal
  const [showAdd, setShowAdd] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [poItems, setPoItems] = useState([])
  const [returnItems, setReturnItems] = useState([])
  const [addNotes, setAddNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPO, setLoadingPO] = useState(false)

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/purchases/returns', { params: { page, limit: 20 } })
      setReturns(res.data.returns || [])
      setMeta({ total: res.data.total, pages: res.data.pages || 1 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load returns')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get('/admin/purchases', { params: { limit: 200, status: 'received,partial' } })
      setPurchaseOrders(res.data.orders || [])
    } catch { setPurchaseOrders([]) }
  }

  const openAdd = async () => {
    setShowAdd(true)
    setSelectedPO(null)
    setPoItems([])
    setReturnItems([])
    setAddNotes('')
    await fetchPurchaseOrders()
  }

  const handlePOSelect = async (poId) => {
    if (!poId) { setSelectedPO(null); setPoItems([]); setReturnItems([]); return }
    setLoadingPO(true)
    try {
      const res = await api.get(`/admin/purchases/${poId}`)
      setSelectedPO(res.data.order || { id: poId })
      const items = res.data.items || []
      setPoItems(items)
      setReturnItems(items.map(item => ({ item_id: item.id, product_name: item.product_name, quantity: '', reason: '' })))
    } catch {
      toast.error('Failed to load PO items')
    } finally {
      setLoadingPO(false)
    }
  }

  const updateReturnItem = (index, field, value) => {
    setReturnItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPO) { toast.error('Please select a purchase order'); return }
    const validItems = returnItems.filter(i => Number(i.quantity) > 0)
    if (validItems.length === 0) { toast.error('Enter quantity for at least one item to return'); return }

    setSaving(true)
    try {
      await api.post('/admin/purchases/returns', {
        purchase_order_id: selectedPO.id,
        items: validItems.map(i => ({
          item_id: i.item_id,
          quantity: Number(i.quantity),
          reason: i.reason,
        })),
        notes: addNotes,
      })
      toast.success('Return created successfully')
      setShowAdd(false)
      fetchReturns()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create return')
    } finally {
      setSaving(false)
    }
  }

  const openView = async (ret) => {
    setViewReturn(ret)
    setViewItems([])
    setViewLoading(true)
    try {
      const res = await api.get(`/admin/purchases/returns/${ret.id}`)
      setViewItems(res.data.items || [])
    } catch { /* non-fatal */ }
    finally { setViewLoading(false) }
  }

  const startIdx = (page - 1) * 20 + 1
  const endIdx = Math.min(page * 20, meta.total)

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Purchase Returns</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Purchase</a></li>
          <li className="breadcrumb-item active">Returns</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="d-flex flex-wrap gap-4 align-items-center justify-content-between">
            <h5 className="card-title mb-0">Returns List</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-primary" onClick={openAdd}>
                <i data-lucide="plus" className="size-4 me-1"></i>Add Return
              </button>
            </div>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Reference</th>
                  <th className="fw-medium text-muted">PO Reference</th>
                  <th className="fw-medium text-muted">Supplier</th>
                  <th className="fw-medium text-muted">Return Date</th>
                  <th className="fw-medium text-muted">Total Amount</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Notes</th>
                  <th className="fw-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                  </td></tr>
                ) : returns.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No returns found.</td></tr>
                ) : returns.map(r => (
                  <tr key={r.id}>
                    <td className="fw-medium">{r.reference || `#RET-${r.id}`}</td>
                    <td>{r.purchase_order_id ? `#PO-${r.purchase_order_id}` : '—'}</td>
                    <td>{r.supplier_name || '—'}</td>
                    <td>{r.return_date ? new Date(r.return_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>{fmt(r.total_amount)}</td>
                    <td><ReturnStatusBadge status={r.status} /></td>
                    <td className="text-wrap" style={{ maxWidth: 180 }}>{r.notes || '—'}</td>
                    <td>
                      <button className="btn btn-sub-primary size-8 btn-icon" title="View" onClick={() => openView(r)}>
                        <i className="ri-eye-line"></i>
                      </button>
                    </td>
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

      {/* View Return Modal */}
      {viewReturn && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Return Details — {viewReturn.reference || `#RET-${viewReturn.id}`}</h6>
                <button className="btn-close" onClick={() => setViewReturn(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Supplier</p>
                    <p className="fw-medium mb-0">{viewReturn.supplier_name || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Status</p>
                    <ReturnStatusBadge status={viewReturn.status} />
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Return Date</p>
                    <p className="fw-medium mb-0">{viewReturn.return_date ? new Date(viewReturn.return_date).toLocaleDateString('en-GB') : '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Total Amount</p>
                    <p className="fw-bold mb-0 text-danger">{fmt(viewReturn.total_amount)}</p>
                  </div>
                  {viewReturn.notes && (
                    <div className="col-12">
                      <p className="mb-1 text-muted small">Notes</p>
                      <p className="mb-0">{viewReturn.notes}</p>
                    </div>
                  )}
                </div>

                <h6 className="mb-3">Return Items</h6>
                {viewLoading ? (
                  <p className="text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading...</p>
                ) : viewItems.length === 0 ? (
                  <p className="text-muted text-center">No items found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewItems.map((item, i) => (
                          <tr key={item.id || i}>
                            <td>{item.product_name || '—'}</td>
                            <td>{item.quantity}</td>
                            <td>{item.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewReturn(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Return Modal */}
      {showAdd && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Create Purchase Return</h6>
                <button className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Purchase Order <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      onChange={e => handlePOSelect(e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Select Purchase Order</option>
                      {purchaseOrders.map(po => (
                        <option key={po.id} value={po.id}>{po.reference} — {po.supplier_name}</option>
                      ))}
                    </select>
                  </div>

                  {loadingPO && (
                    <p className="text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading items...</p>
                  )}

                  {poItems.length > 0 && (
                    <>
                      <h6 className="mb-2">Select Items to Return</h6>
                      <div className="table-responsive mb-3">
                        <table className="table table-bordered align-middle">
                          <thead className="bg-light">
                            <tr>
                              <th>Product</th>
                              <th style={{ width: 100 }}>Return Qty</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {returnItems.map((item, i) => (
                              <tr key={i}>
                                <td>{item.product_name}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min="0"
                                    placeholder="0"
                                    value={item.quantity}
                                    onChange={e => updateReturnItem(i, 'quantity', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Reason for return"
                                    value={item.reason}
                                    onChange={e => updateReturnItem(i, 'reason', e.target.value)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Notes about this return..."
                      value={addNotes}
                      onChange={e => setAddNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light w-50" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-50" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Return'}
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
