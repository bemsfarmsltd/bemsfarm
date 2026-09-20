import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ThermalReceipt, { printThermalReceipt } from '../../components/ui/ThermalReceipt'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLOR = {
  paid: 'info',
  new_order: 'info',
  pending: 'warning',
  confirmed: 'primary',
  processing: 'warning',
  packed: 'info',
  packed_ready: 'info',
  assigned: 'info',
  driver_assigned: 'info',
  shipped: 'primary',
  out_for_delivery: 'primary',
  delivery_attempted: 'warning',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  dispute: 'danger',
}

const fmt = (n) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/orders/${id}`)
      if (res.data) {
        setOrder(res.data)
      } else {
        toast.error('Order not found')
      }
    } catch (err) {
      console.error('Failed to load order:', err)
      toast.error(err.response?.data?.message || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchOrder()
  }, [id, fetchOrder])

  const handleUpdateStatus = async (newStatus) => {
    if (!order) return
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: newStatus })
      toast.success(`Order status updated to ${newStatus}`)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleAutoAssignDriver = async () => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await api.post(`/orders/${id}/auto-assign-driver`)
      toast.success(res.data?.message || 'Closest driver assigned successfully!')
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to auto-assign driver')
    } finally {
      setUpdating(false)
    }
  }

  const handlePrintReceipt = async () => {
    printThermalReceipt()
    // If order was in new_order, pending or paid, transition to packed_ready (Packaging)
    if (['paid', 'new_order', 'pending', 'confirmed'].includes(order.status)) {
      try {
        await api.patch(`/admin/orders/${id}/status`, { status: 'packed_ready', notes: 'Invoice printed - handed to packaging' })
        toast.success('Invoice printed! Order transitioned to Packaging.')
        fetchOrder()
      } catch (e) {
        console.warn('Could not auto-advance status on print:', e)
      }
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary me-2" role="status" />
        <span className="text-muted">Loading live order details...</span>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="alert alert-warning d-inline-block">
          Order <strong>{id}</strong> could not be found.
        </div>
        <div className="mt-3">
          <Link to="/orders" className="btn btn-primary btn-sm">
            <i className="ri-arrow-left-line me-1" />Back to All Orders
          </Link>
        </div>
      </div>
    )
  }

  const items = Array.isArray(order.items) ? order.items : []
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.subtotal) || (parseFloat(i.price || i.unit_price || 0) * (i.quantity || i.qty || 1))), 0)
  const deliveryFee = parseFloat(order.delivery_fee) || 0
  const discount = parseFloat(order.discount_amount) || 0
  const total = parseFloat(order.total) || (subtotal + deliveryFee - discount)
  const statusKey = String(order.status || 'paid').toLowerCase()
  const color = STATUS_COLOR[statusKey] || 'primary'

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <Link to="/orders" className="btn btn-sm btn-outline-secondary">
            <i className="ri-arrow-left-line" />
          </Link>
          <div>
            <h4 className="fw-bold mb-0">Order {order.id}</h4>
            <p className="text-muted mb-0 small">
              {order.created_at ? new Date(order.created_at).toLocaleString() : '—'} · Source: {order.source || order.channel || 'Online'}
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge bg-${color}-subtle text-${color} px-3 py-2 text-uppercase fs-xs`}>
            {order.status}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReceipt(true)}>
            <i className="ri-printer-line me-1" />Print Receipt
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Items and Status Actions */}
        <div className="col-xl-8">
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-light">
              <h6 className="fw-bold mb-0">Order Items ({items.length})</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">
                          No individual item breakdown available for this transaction.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const itemQty = item.quantity || item.qty || 1
                        const itemPrice = parseFloat(item.unit_price || item.price || 0)
                        const itemTotal = parseFloat(item.subtotal || (itemPrice * itemQty))
                        return (
                          <tr key={item.id || idx}>
                            <td>
                              <div className="fw-medium">{item.name || item.product_name || 'Produce Item'}</div>
                            </td>
                            <td className="text-muted small">{item.sku || '—'}</td>
                            <td className="text-center">{itemQty} {item.unit || ''}</td>
                            <td className="text-end">{fmt(itemPrice)}</td>
                            <td className="text-end fw-bold">{fmt(itemTotal)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer bg-light-subtle">
              <div className="row justify-content-end">
                <div className="col-md-5">
                  <div className="d-flex flex-column gap-1 small">
                    <div className="d-flex justify-content-between text-muted">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal || total)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="d-flex justify-content-between text-muted">
                        <span>Delivery Fee</span>
                        <span>{fmt(deliveryFee)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="d-flex justify-content-between text-success">
                        <span>Discount</span>
                        <span>-{fmt(discount)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-1 fs-15">
                      <span>Total Amount</span>
                      <span className="text-primary">{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick status controls */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-light">
              <h6 className="fw-bold mb-0">Workflow Status Transition</h6>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {[
                  { key: 'processing', label: 'Processing' },
                  { key: 'packed_ready', label: 'Packed & Ready' },
                  { key: 'out_for_delivery', label: 'Out for Delivery' },
                  { key: 'delivered', label: 'Delivered' },
                  { key: 'cancelled', label: 'Cancelled' },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={`btn btn-sm ${statusKey === s.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => handleUpdateStatus(s.key)}
                    disabled={updating}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer, Delivery, Payment info */}
        <div className="col-xl-4">
          {/* Customer */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-light"><h6 className="fw-bold mb-0">Customer Details</h6></div>
            <div className="card-body d-flex flex-column gap-2 small">
              <div className="fw-bold fs-15">{order.customer_name || 'Walk-in Customer'}</div>
              {order.customer_email && (
                <div className="d-flex gap-2 align-items-center text-muted">
                  <i className="ri-mail-line" />{order.customer_email}
                </div>
              )}
              {order.customer_phone && (
                <div className="d-flex gap-2 align-items-center text-muted">
                  <i className="ri-phone-line" />{order.customer_phone}
                </div>
              )}
              <div className="d-flex gap-2 align-items-start text-muted mt-1">
                <i className="ri-map-pin-line mt-1" />
                <span>{order.address || order.delivery_address || 'Store Pickup / Counter Sale'}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Delivery / Fleet</h6>
              {order.delivery_status && (
                <span className="badge bg-primary-subtle text-primary text-uppercase fs-xs">
                  {order.delivery_status}
                </span>
              )}
            </div>
            <div className="card-body d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Driver</span>
                <span className="fw-bold">{order.driver_name || <span className="text-danger">Unassigned</span>}</span>
              </div>
              {order.driver_phone && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Phone</span>
                  <span>{order.driver_phone}</span>
                </div>
              )}
              {order.driver_plate && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Vehicle</span>
                  <span>{order.driver_plate} ({order.vehicle_type || 'Motorbike'})</span>
                </div>
              )}
              {order.picked_up_at && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Picked Up</span>
                  <span className="text-success">{new Date(order.picked_up_at).toLocaleTimeString()}</span>
                </div>
              )}
              {order.arrived_at && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Arrived at Customer</span>
                  <span className="text-primary fw-bold">{new Date(order.arrived_at).toLocaleTimeString()}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Delivered Time</span>
                  <span className="text-success fw-bold">{new Date(order.delivered_at).toLocaleTimeString()}</span>
                </div>
              )}

              <button
                type="button"
                className="btn btn-sm btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-1.5"
                onClick={handleAutoAssignDriver}
                disabled={updating}
              >
                <i className="ri-gps-line" />
                <span>⚡ Auto-Assign Closest Driver</span>
              </button>
            </div>
          </div>

          {/* Proof of Delivery Photo Gallery */}
          {((order.item_proofs && order.item_proofs.length > 0) || (order.proof_photos && order.proof_photos.length > 0)) && (
            <div className="card mb-4 shadow-sm border-0 border-start border-4 border-success">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-success">
                  <i className="ri-camera-lens-line me-1.5" />Item Delivery Proofs
                </h6>
                <span className="badge bg-success-subtle text-success">Verified</span>
              </div>
              <div className="card-body">
                <p className="text-muted fs-xs mb-3">
                  The delivery driver snapped photos of each item at customer handover:
                </p>
                <div className="row g-2">
                  {(order.item_proofs || order.proof_photos || []).map((proof, pIdx) => {
                    const photoSrc = typeof proof === 'string' ? proof : proof.photo_url || proof.url
                    const itemName = typeof proof === 'object' ? proof.product_name || `Item #${proof.item_id || pIdx + 1}` : `Delivery Proof #${pIdx + 1}`
                    return (
                      <div key={pIdx} className="col-6">
                        <div className="border rounded-2 overflow-hidden bg-white shadow-2xs">
                          <img
                            src={photoSrc}
                            alt={itemName}
                            className="w-100 object-fit-cover"
                            style={{ height: '90px' }}
                          />
                          <div className="p-1.5 text-center">
                            <span className="d-block text-truncate fw-bold fs-xs text-dark">{itemName}</span>
                            <span className="text-success fs-xs fw-semibold">✓ Snapped</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header bg-light"><h6 className="fw-bold mb-0">Payment Summary</h6></div>
            <div className="card-body d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Method</span>
                <span className="fw-medium text-capitalize">{order.payment_method || 'Paystack'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Status</span>
                <span className="badge bg-success-subtle text-success">
                  {order.payment_status || 'Paid'}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Total Paid</span>
                <span className="fw-bold text-primary fs-15">{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card mb-0 shadow-sm border-0">
              <div className="card-header bg-light"><h6 className="fw-bold mb-0">Order Notes</h6></div>
              <div className="card-body">
                <p className="text-muted small mb-0 fst-italic">"{order.notes}"</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Background Thermal Print Target */}
      <div className="pos-thermal-print-container" aria-hidden="true">
        <ThermalReceipt
          receiptType={order.channel === 'physical' || order.source?.toLowerCase().includes('pos') ? 'pos' : 'online'}
          receiptNumber={order.order_ref || order.id}
          date={order.created_at ? new Date(order.created_at).toLocaleString('en-NG') : new Date().toLocaleString('en-NG')}
          customer={order.customer_name || 'Walk-in Customer'}
          customerPhone={order.customer_phone}
          channel={order.source || (order.channel === 'physical' ? 'POS Terminal' : 'Online Store')}
          cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
          fulfillment={order.fulfillment_type || (order.delivery_address ? 'Delivery' : 'Store pickup')}
          status={order.status?.toUpperCase()}
          items={items}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          discount={discount}
          total={total}
          paymentMethod={order.payment_method?.toUpperCase()}
          note={order.notes}
        />
      </div>

      {/* Printable Receipt Preview Modal */}
      {showReceipt && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowReceipt(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
                <h6 className="modal-title fw-bold mb-0">Sales Receipt #{order.order_ref || order.id}</h6>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={handlePrintReceipt}>
                    <i className="ri-printer-line me-1" />Print Receipt
                  </button>
                  <button className="btn-close" onClick={() => setShowReceipt(false)} />
                </div>
              </div>
              <div className="modal-body p-3 thermal-receipt-preview" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <ThermalReceipt
                  receiptType={order.channel === 'physical' || order.source?.toLowerCase().includes('pos') ? 'pos' : 'online'}
                  receiptNumber={order.order_ref || order.id}
                  date={order.created_at ? new Date(order.created_at).toLocaleString('en-NG') : new Date().toLocaleString('en-NG')}
                  customer={order.customer_name || 'Walk-in Customer'}
                  customerPhone={order.customer_phone}
                  channel={order.source || (order.channel === 'physical' ? 'POS Terminal' : 'Online Store')}
                  cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                  fulfillment={order.fulfillment_type || (order.delivery_address ? 'Delivery' : 'Store pickup')}
                  status={order.status?.toUpperCase()}
                  items={items}
                  subtotal={subtotal}
                  deliveryFee={deliveryFee}
                  discount={discount}
                  total={total}
                  paymentMethod={order.payment_method?.toUpperCase()}
                  note={order.notes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
