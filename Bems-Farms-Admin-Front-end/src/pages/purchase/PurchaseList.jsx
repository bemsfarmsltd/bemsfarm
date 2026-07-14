import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })

function StatusBadge({ status }) {
  const map = {
    draft: { cls: 'bg-secondary-subtle text-secondary border-secondary-subtle', label: 'Draft' },
    ordered: { cls: 'bg-primary-subtle text-primary border-primary-subtle', label: 'Ordered' },
    received: { cls: 'bg-success-subtle text-success border-success-subtle', label: 'Received' },
    partial: { cls: 'bg-warning-subtle text-warning border-warning-subtle', label: 'Partial' },
    cancelled: { cls: 'bg-danger-subtle text-danger border-danger-subtle', label: 'Cancelled' },
  }
  const s = map[status] || { cls: 'bg-light text-muted', label: status }
  return <span className={`badge border ${s.cls}`}>{s.label}</span>
}

export default function PurchaseList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [meta, setMeta] = useState({ total: 0, pages: 1 })
  const searchTimer = useRef(null)

  // View modal
  const [viewOrder, setViewOrder] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [viewLoading, setViewLoading] = useState(false)

  // Receive modal
  const [receiveOrder, setReceiveOrder] = useState(null)
  const [receiveItems, setReceiveItems] = useState([])
  const [receiving, setReceiving] = useState(false)

  // Cancel
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, search }
      if (statusFilter) params.status = statusFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await api.get('/admin/purchases', { params })
      setOrders(res.data.orders || [])
      setMeta({ total: res.data.total, pages: res.data.pages || 1 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load purchases')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, fromDate, toDate])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(e.target.value)
      setPage(1)
    }, 400)
  }

  const openView = async (order) => {
    setViewOrder(order)
    setViewItems([])
    setViewLoading(true)
    try {
      const res = await api.get(`/admin/purchases/${order.id}`)
      setViewItems(res.data.items || [])
    } catch {
      // non-fatal
    } finally {
      setViewLoading(false)
    }
  }

  const openReceive = async (order) => {
    setReceiveOrder(order)
    setViewLoading(true)
    try {
      const res = await api.get(`/admin/purchases/${order.id}`)
      setReceiveItems((res.data.items || []).map(item => ({
        ...item,
        new_received_qty: '',
      })))
    } catch {
      setReceiveItems([])
    } finally {
      setViewLoading(false)
    }
  }

  const handleReceiveSubmit = async (e) => {
    e.preventDefault()
    setReceiving(true)
    try {
      const items = receiveItems
        .filter(i => i.new_received_qty !== '' && Number(i.new_received_qty) >= 0)
        .map(i => ({ item_id: i.id, received_qty: Number(i.new_received_qty) }))
      await api.patch(`/admin/purchases/${receiveOrder.id}/receive`, { items })
      toast.success('Items marked as received')
      setReceiveOrder(null)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update received quantities')
    } finally {
      setReceiving(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await api.delete(`/admin/purchases/${cancelTarget.id}`)
      toast.success('Purchase order cancelled')
      setCancelTarget(null)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel purchase order')
    } finally {
      setCancelling(false)
    }
  }

  const startIdx = (page - 1) * 20 + 1
  const endIdx = Math.min(page * 20, meta.total)

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Purchase Orders</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Purchase</a></li>
          <li className="breadcrumb-item active">Purchase List</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="d-flex flex-wrap gap-4 align-items-center justify-content-between mb-4">
            <div>
              <h5 className="card-title mb-1">Purchases List</h5>
              <p className="text-muted mb-0">View and manage all purchase orders.</p>
            </div>
            <Link to="/purchase/add" className="btn btn-primary">
              <i data-lucide="plus" className="size-4 me-1"></i>Add Purchase
            </Link>
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div className="position-relative">
              <input
                type="text"
                className="form-control ps-10"
                placeholder="Search purchases..."
                value={searchInput}
                onChange={handleSearchChange}
              />
              <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
            </div>
            <select
              className="form-select"
              style={{ minWidth: 160 }}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="partial">Partial</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" className="form-control" style={{ width: 160 }} value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }} placeholder="From" />
            <input type="date" className="form-control" style={{ width: 160 }} value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }} placeholder="To" />
            {(statusFilter || fromDate || toDate) && (
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); setPage(1) }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-card table-responsive">
            <table className="table text-nowrap align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Reference</th>
                  <th className="fw-medium text-muted">Supplier</th>
                  <th className="fw-medium text-muted">Order Date</th>
                  <th className="fw-medium text-muted">Expected Date</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Total</th>
                  <th className="fw-medium text-muted">Balance Due</th>
                  <th className="fw-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading...
                  </td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-5">No purchase orders found.</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="fw-medium link-custom-primary">{o.reference}</span></td>
                    <td>{o.supplier_name || '—'}</td>
                    <td>{o.order_date ? new Date(o.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>{o.expected_date ? new Date(o.expected_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{fmt(o.total)}</td>
                    <td className={Number(o.balance_due) > 0 ? 'text-danger fw-medium' : ''}>{fmt(o.balance_due)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sub-primary size-8 btn-icon" title="View" onClick={() => openView(o)}>
                          <i className="ri-eye-line"></i>
                        </button>
                        {(o.status === 'ordered' || o.status === 'partial') && (
                          <button className="btn btn-sub-success size-8 btn-icon" title="Receive Items" onClick={() => openReceive(o)}>
                            <i className="ri-truck-line"></i>
                          </button>
                        )}
                        {o.status !== 'cancelled' && o.status !== 'received' && (
                          <button className="btn btn-sub-danger size-8 btn-icon" title="Cancel" onClick={() => setCancelTarget(o)}>
                            <i className="ri-close-circle-line"></i>
                          </button>
                        )}
                      </div>
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

      {/* View Modal */}
      {viewOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Purchase Order — {viewOrder.reference}</h6>
                <button className="btn-close" onClick={() => setViewOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Supplier</p>
                    <p className="fw-medium mb-0">{viewOrder.supplier_name || '—'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Status</p>
                    <StatusBadge status={viewOrder.status} />
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Order Date</p>
                    <p className="fw-medium mb-0">{viewOrder.order_date ? new Date(viewOrder.order_date).toLocaleDateString('en-GB') : '—'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Expected Date</p>
                    <p className="fw-medium mb-0">{viewOrder.expected_date ? new Date(viewOrder.expected_date).toLocaleDateString('en-GB') : '—'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Subtotal</p>
                    <p className="fw-medium mb-0">{fmt(viewOrder.subtotal)}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Tax</p>
                    <p className="fw-medium mb-0">{fmt(viewOrder.tax_amount)}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Total</p>
                    <p className="fw-bold mb-0">{fmt(viewOrder.total)}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1 text-muted small">Balance Due</p>
                    <p className={`fw-bold mb-0 ${Number(viewOrder.balance_due) > 0 ? 'text-danger' : 'text-success'}`}>{fmt(viewOrder.balance_due)}</p>
                  </div>
                  {viewOrder.notes && (
                    <div className="col-12">
                      <p className="mb-1 text-muted small">Notes</p>
                      <p className="mb-0">{viewOrder.notes}</p>
                    </div>
                  )}
                </div>

                <h6 className="mb-3">Line Items</h6>
                {viewLoading ? (
                  <p className="text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading items...</p>
                ) : viewItems.length === 0 ? (
                  <p className="text-muted text-center">No items found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Product</th>
                          <th>Qty Ordered</th>
                          <th>Qty Received</th>
                          <th>Unit Cost</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewItems.map((item, i) => (
                          <tr key={item.id || i}>
                            <td>{item.product_name || '—'}</td>
                            <td>{item.quantity}</td>
                            <td>
                              {item.received_qty < item.quantity
                                ? <span className="text-warning fw-medium">{item.received_qty}</span>
                                : <span className="text-success fw-medium">{item.received_qty}</span>
                              }
                            </td>
                            <td>{fmt(item.unit_cost)}</td>
                            <td>{fmt(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewOrder(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receiveOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Receive Items — {receiveOrder.reference}</h6>
                <button className="btn-close" onClick={() => setReceiveOrder(null)}></button>
              </div>
              <form onSubmit={handleReceiveSubmit}>
                <div className="modal-body">
                  {viewLoading ? (
                    <p className="text-center"><span className="spinner-border spinner-border-sm me-2" />Loading...</p>
                  ) : receiveItems.length === 0 ? (
                    <p className="text-muted text-center">No items to receive.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle">
                        <thead className="bg-light">
                          <tr>
                            <th>Product</th>
                            <th>Ordered</th>
                            <th>Already Received</th>
                            <th>Receiving Now</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiveItems.map((item, i) => (
                            <tr key={item.id || i}>
                              <td>{item.product_name || '—'}</td>
                              <td>{item.quantity}</td>
                              <td>{item.received_qty}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  style={{ width: 90 }}
                                  min="0"
                                  max={item.quantity - (item.received_qty || 0)}
                                  placeholder="0"
                                  value={item.new_received_qty}
                                  onChange={e => setReceiveItems(items =>
                                    items.map((it, idx) => idx === i ? { ...it, new_received_qty: e.target.value } : it)
                                  )}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light w-50" onClick={() => setReceiveOrder(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success w-50" disabled={receiving}>
                    {receiving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Mark Received'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelTarget && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content p-4 text-center">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                  <i className="ri-close-circle-line text-danger fs-2xl"></i>
                </div>
              </div>
              <h5 className="mb-3 lh-base">Cancel purchase order <strong>{cancelTarget.reference}</strong>?</h5>
              <p className="text-muted small mb-4">This action cannot be undone.</p>
              <div className="d-flex justify-content-center gap-2">
                <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <span className="spinner-border spinner-border-sm" /> : 'Yes, Cancel'}
                </button>
                <button className="btn btn-link text-reset" onClick={() => setCancelTarget(null)}>Go Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
