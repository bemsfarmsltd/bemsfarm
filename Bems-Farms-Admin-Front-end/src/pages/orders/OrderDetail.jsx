import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ThermalReceipt, { printThermalReceipt } from '../../components/ui/ThermalReceipt'
import BemsOfficialDocument from '../../components/documents/BemsOfficialDocument'
import { useAuth } from '../../context/AuthContext'
import AdminOrderMap from '../../components/ui/AdminOrderMap'

const STATUS_COLOR = {
  pending_payment: 'warning',
  payment_failed: 'danger',
  payment_cancelled: 'secondary',
  payment_verification_pending: 'warning',
  paid: 'primary',
  new_order: 'primary',
  pending: 'warning',
  confirmed: 'primary',
  packaging: 'warning',
  processing: 'warning',
  partially_packed: 'warning',
  packaging_exception: 'danger',
  packed: 'info',
  packed_ready: 'info',
  awaiting_driver_confirmation: 'danger',
  assigned: 'info',
  driver_assigned: 'info',
  in_transit: 'primary',
  shipped: 'primary',
  out_for_delivery: 'primary',
  arrived: 'info',
  delivery_attempted: 'warning',
  delivery_exception: 'danger',
  customer_unreachable: 'warning',
  delivered: 'success',
  completed: 'success',
  return_requested: 'warning',
  return_approved: 'info',
  return_rejected: 'secondary',
  cancelled: 'danger',
  dispute: 'danger',
}

const ORDER_STAGES = [
  { key: 'confirmed', label: '1. Confirmed', icon: 'ri-file-check-line', desc: 'Payment / COD Verified' },
  { key: 'packing', label: '2. Preparation', icon: 'ri-box-3-line', desc: 'Weighing, Picking & Warehouse Packing' },
  { key: 'dispatch', label: '3. Courier Dispatch', icon: 'ri-e-bike-2-line', desc: 'Driver Proximity Search & Assignment' },
  { key: 'in_transit', label: '4. In Transit', icon: 'ri-roadster-line', desc: 'Store Handover Confirmed & En Route' },
  { key: 'delivered', label: '5. Delivered', icon: 'ri-checkbox-circle-line', desc: 'Customer Confirmation & Proof Recorded' },
]

const fmt = (n) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [printModalType, setPrintModalType] = useState(null) // null | 'invoice' | 'receipt'
  const [printFormat, setPrintFormat] = useState('a4') // 'a4' | 'thermal'

  // Driver Assignment & Supervisor Controls
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [driverSearch, setDriverSearch] = useState('')
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [assigningDriver, setAssigningDriver] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState(null)
  const [showSupervisorControls, setShowSupervisorControls] = useState(false)

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

  const handleConfirmDriverPickup = async () => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await api.post(`/admin/orders/${id}/confirm-driver-pickup`, {
        notes: 'Handover verified at store counter by admin / dispatch supervisor',
      })
      toast.success(res.data?.message || 'Driver pickup confirmed successfully!')
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm driver pickup')
    } finally {
      setUpdating(false)
    }
  }

  const openDriverModal = () => {
    setShowDriverModal(true)
    fetchDrivers()
  }

  const fetchDrivers = async () => {
    setLoadingDrivers(true)
    try {
      const res = await api.get('/admin/deliveries/drivers')
      const list = res.data?.drivers || res.data || []
      setDrivers(Array.isArray(list) ? list : [])
    } catch (err) {
      toast.error('Could not load drivers list')
    } finally {
      setLoadingDrivers(false)
    }
  }

  const handleAssignDriver = async (driverId) => {
    if (!driverId || !order) return
    setAssigningDriver(true)
    try {
      await api.patch(`/admin/orders/${id}/assign-driver`, { driver_id: driverId })
      toast.success('Driver assigned successfully!')
      setShowDriverModal(false)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign driver')
    } finally {
      setAssigningDriver(false)
    }
  }

  const handleFastPackAndDispatch = async () => {
    if (!order) return
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: 'packed_ready', notes: 'Packed and verified by admin' })
      toast.success('Order marked as Packed & Ready!')
      try {
        const res = await api.post(`/orders/${id}/auto-assign-driver`)
        toast.success(res.data?.message || 'Courier proximity dispatch initiated!')
      } catch (dispErr) {
        console.warn('Auto dispatch notice:', dispErr.response?.data?.message)
      }
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pack order')
    } finally {
      setUpdating(false)
    }
  }

  const handleSupervisorOverride = async (targetStatus, label) => {
    if (['driver_assigned', 'picked_up', 'out_for_delivery'].includes(targetStatus) && !order.driver_id) {
      toast.error(`Please assign a driver first before moving to "${label}".`)
      return
    }
    const confirmed = window.confirm(`Are you sure you want to administratively override the status to "${label}"? This action is recorded in the audit log.`)
    if (!confirmed) return
    handleUpdateStatus(targetStatus)
  }

  const handlePrintInvoice = async () => {
    if (printFormat === 'thermal') {
      printThermalReceipt()
    } else {
      window.print()
    }
    try {
      await api.post(`/admin/orders/${id}/print-invoice`)
      toast.success('Official Invoice printed! Order moved to Packaging.')
      fetchOrder()
    } catch (e) {
      console.warn('Could not register invoice print:', e)
      try {
        await api.patch(`/admin/orders/${id}/status`, { status: 'processing', notes: 'Invoice printed - handed to packaging' })
        fetchOrder()
      } catch (_) {}
    }
  }

  const handlePrintReceipt = () => {
    if (printFormat === 'thermal') {
      printThermalReceipt()
    } else {
      window.print()
    }
    toast.success('Customer payment receipt printed.')
  }

  const handleAdminDeliveryOverride = async () => {
    if (!order) return
    const reason = window.prompt('Enter reason for administrative delivery override (required for audit):')
    if (!reason || !reason.trim()) return
    setUpdating(true)
    try {
      await api.post(`/admin/orders/${id}/override-delivery`, { reason: reason.trim() })
      toast.success('Order marked as Delivered via authorized administrative override.')
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delivery override failed.')
    } finally {
      setUpdating(false)
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
  const isInvoicePrinted = Boolean(order.invoice_printed)
  const canPrintInvoice = !['delivered', 'cancelled', 'completed'].includes(statusKey)

  const driverEarning = Number(order.driver_earning || Math.round(deliveryFee * 0.70) || (order.driver_id ? 700 : 0))
  const companyMargin = Math.max(0, deliveryFee - driverEarning)

  const getStageIndex = () => {
    if (['delivered', 'completed'].includes(statusKey)) return 4
    if (['picked_up', 'in_transit', 'shipped', 'out_for_delivery', 'driver_arrived', 'arrived'].includes(statusKey)) return 3
    if (order.driver_id || ['assigned', 'driver_assigned', 'awaiting_pickup'].includes(statusKey)) return 2
    if (statusKey === 'awaiting_driver_confirmation' || ['packed', 'packed_ready'].includes(statusKey)) return 2
    if (['processing', 'packaging', 'partially_packed'].includes(statusKey) || isInvoicePrinted) return 1
    return 0 // Confirmed / Placed
  }

  const currentStageIndex = getStageIndex()
  const isTerminal = ['cancelled', 'dispute'].includes(statusKey)
  const isAwaitingDriver = statusKey === 'awaiting_driver_confirmation' || (['packed', 'packed_ready'].includes(statusKey) && !order.driver_id)
  const isDriverAssigned = Boolean(order.driver_id) && !order.driver_picked_up && !['delivered', 'completed', 'cancelled'].includes(statusKey)
  const isOutForDelivery = ['picked_up', 'out_for_delivery', 'in_transit', 'shipped', 'driver_arrived', 'arrived'].includes(statusKey)
  const isDelivered = ['delivered', 'completed'].includes(statusKey)
  const isProcessing = ['processing', 'packaging', 'partially_packed'].includes(statusKey) || (isInvoicePrinted && !['packed', 'packed_ready', 'awaiting_driver_confirmation', 'driver_assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(statusKey))
  const isNewOrConfirmed = ['paid', 'confirmed', 'new_order', 'pending'].includes(statusKey) && !isInvoicePrinted

  const filteredDrivers = drivers.filter(d => {
    if (!driverSearch) return true
    const q = driverSearch.toLowerCase()
    return (
      d.name?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.vehicle_type?.toLowerCase().includes(q) ||
      d.vehicle_plate?.toLowerCase().includes(q)
    )
  })

  const orderDocData = {
    id: order.order_ref || `INV-${order.id}`,
    invoice_ref: order.order_ref || `INV-${order.id}`,
    receiptNo: order.receipt_ref || `REC-${String(order.order_ref || order.id).replace(/[^0-9A-Za-z]/g, '')}`,
    transactionRef: order.payment_reference || order.payment_ref || `TXN-${order.id}`,
    status: order.payment_status === 'paid' || ['paid', 'completed', 'delivered'].includes(statusKey) ? 'paid' : (order.status || 'draft'),
    paymentStatus: order.payment_status || (['paid', 'completed', 'delivered'].includes(statusKey) ? 'paid' : 'unpaid'),
    paymentMethod: order.payment_method?.toUpperCase() || 'Bank Transfer',
    salesChannel: order.channel || (order.source?.toLowerCase().includes('pos') ? 'physical' : 'online'),
    issuedDate: order.created_at,
    dueDate: order.created_at,
    paidDate: order.paid_at || order.created_at,
    customer: {
      name: order.customer_name || 'Walk-in Customer',
      phone: order.customer_phone || '',
      email: order.customer_email || '',
      address: order.delivery_address || order.shipping_address || '',
    },
    items: items.map(it => ({
      name: it.product_name || it.name || 'Agro Commodity',
      sku: it.sku || '',
      barcode: it.barcode || '',
      unit: it.unit || 'unit',
      qty: it.quantity || it.qty || 1,
      price: it.unit_price || it.price || 0,
      total: it.subtotal || ((it.quantity || it.qty || 1) * (it.unit_price || it.price || 0))
    })),
    subtotal,
    deliveryFee,
    discount,
    amount: total,
    notes: order.notes
  }

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
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className={`badge bg-${color}-subtle text-${color} px-3 py-2 text-uppercase fs-xs`}>
            {order.status}
          </span>

          {['in_transit', 'shipped', 'out_for_delivery', 'delivery_attempted', 'delivery_exception', 'customer_unreachable'].includes(statusKey) && (
            <button
              className="btn btn-warning btn-sm fw-bold d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={handleAdminDeliveryOverride}
              disabled={updating}
              title="Audited Administrative Override to mark Order as Delivered"
            >
              <i className="ri-shield-check-line" />
              <span>Override Delivery</span>
            </button>
          )}

          {isInvoicePrinted ? (
            <>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-xs d-inline-flex align-items-center gap-1">
                <i className="ri-check-double-line" />
                Invoice Printed
              </span>
              <button
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => setPrintModalType('invoice')}
                title="Reprint Warehouse Invoice & Packing List"
              >
                <i className="ri-file-text-line" />
                <span>Reprint Invoice</span>
              </button>
              <button
                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={() => setPrintModalType('receipt')}
                title="Print Customer Payment Receipt"
              >
                <i className="ri-printer-line" />
                <span>Print Customer Receipt</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-success btn-sm px-3 fw-bold d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={() => setPrintModalType('invoice')}
                title="Print Official Invoice (Packing List) first to begin packing and trigger dispatch"
              >
                <i className="ri-file-text-line" />
                <span>Print Invoice (Packing List)</span>
              </button>
              <button
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => setPrintModalType('receipt')}
                title="Print Customer Payment Receipt"
              >
                <i className="ri-printer-line" />
                <span>Customer Receipt</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── VISUAL ORDER LIFECYCLE STEPPER ── */}
      <div className="card mb-4 border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <span className="text-uppercase tracking-wider fw-bold text-muted" style={{ fontSize: '11px' }}>
                Order Fulfillment Pipeline
              </span>
              <h5 className="fw-bold mb-0 text-dark">
                {isTerminal ? (
                  <span className="text-danger"><i className="ri-close-circle-line me-1" />Order {order.status?.toUpperCase()}</span>
                ) : (
                  <span>Stage {currentStageIndex + 1} of 5 · {ORDER_STAGES[currentStageIndex]?.label}</span>
                )}
              </h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge bg-${color}-subtle text-${color} px-3 py-1.5 text-uppercase fs-xs fw-bold rounded-pill border border-${color}-subtle`}>
                {order.status?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="position-relative my-3 pt-1">
            <div className="progress" style={{ height: 4, backgroundColor: '#e2e8f0', margin: '0 20px' }}>
              <div
                className="progress-bar bg-success"
                style={{
                  width: `${Math.min(100, Math.max(5, (currentStageIndex / (ORDER_STAGES.length - 1)) * 100))}%`,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div className="d-flex justify-content-between position-relative" style={{ marginTop: -19 }}>
              {ORDER_STAGES.map((stg, idx) => {
                const isCompleted = idx < currentStageIndex || isDelivered
                const isCurrent = idx === currentStageIndex && !isDelivered && !isTerminal
                return (
                  <div key={stg.key} className="text-center" style={{ width: 110 }}>
                    <div
                      className={`rounded-circle d-inline-flex align-items-center justify-content-center mx-auto shadow-xs ${
                        isCompleted
                          ? 'bg-success text-white'
                          : isCurrent
                          ? 'bg-primary text-white shadow'
                          : 'bg-white text-muted border'
                      }`}
                      style={{
                        width: 36,
                        height: 36,
                        fontSize: 15,
                        boxShadow: isCurrent ? '0 0 0 4px rgba(13, 110, 253, 0.25)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className={isCompleted ? 'ri-check-line fw-bold' : stg.icon} />
                    </div>
                    <div className="mt-1.5">
                      <div className={`fs-xs fw-bold ${isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted'}`}>
                        {stg.label}
                      </div>
                      <div className="text-muted d-none d-md-block" style={{ fontSize: 10 }}>
                        {isCompleted ? 'Completed' : isCurrent ? 'Active Now' : 'Pending'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIFIED ORDER PROCESSING COMMAND CENTER ── */}
      <div
        className="card mb-4 border-0 shadow-sm overflow-hidden"
        style={{
          borderRadius: '1rem',
          background: isAwaitingDriver
            ? 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)'
            : isDelivered
            ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
            : isProcessing
            ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)'
            : isDriverAssigned
            ? 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)'
            : isOutForDelivery
            ? 'linear-gradient(135deg, #fdf4ff 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
          borderLeft: isAwaitingDriver
            ? '6px solid #ef4444'
            : isDelivered
            ? '6px solid #10b981'
            : isProcessing
            ? '6px solid #3b82f6'
            : isDriverAssigned
            ? '6px solid #8b5cf6'
            : isOutForDelivery
            ? '6px solid #d946ef'
            : '6px solid #f59e0b'
        }}
      >
        <div className="card-body p-3 p-md-4">
          <div className="row align-items-center g-3">
            {/* Left: Context, Stage Description & Checklist */}
            <div className="col-lg-7">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className={`badge ${
                  isAwaitingDriver ? 'bg-danger text-white' :
                  isDelivered ? 'bg-success text-white' :
                  isProcessing ? 'bg-primary text-white' :
                  isDriverAssigned ? 'bg-purple text-white' :
                  isOutForDelivery ? 'bg-fuchsia text-white' :
                  'bg-warning text-dark'
                } px-2.5 py-1 fw-bold fs-xs text-uppercase`}>
                  {isAwaitingDriver ? '⚠️ Action Required' :
                   isDelivered ? '✓ Completed' :
                   isProcessing ? '📦 In Packaging' :
                   isDriverAssigned ? '🤝 Driver Handover' :
                   isOutForDelivery ? '🚀 In Transit' :
                   '🛍️ Order Received'}
                </span>
                <span className="text-muted fs-xs">
                  Source: <strong>{order.source || (order.channel === 'physical' ? 'POS Counter' : 'Online Store')}</strong> · Ref: <code>#{order.order_ref || order.id}</code>
                </span>
              </div>

              <h5 className="fw-bold text-dark mb-1">
                {isAwaitingDriver && 'Courier Driver Required · Automated Dispatch Timed Out'}
                {isNewOrConfirmed && 'New Order Ready for Preparation & Packaging'}
                {isProcessing && 'Order Currently in Physical Packaging / Verification'}
                {isDriverAssigned && `Driver Assigned (${order.driver_name || 'Courier'}) · Awaiting Store Collection`}
                {isOutForDelivery && `Out for Delivery · Courier Handover Completed`}
                {isDelivered && 'Order Successfully Delivered & Reconciled'}
                {isTerminal && `Order Marked as ${order.status?.toUpperCase()}`}
              </h5>

              <p className="text-muted small mb-3" style={{ lineHeight: '1.5' }}>
                {isAwaitingDriver && 'All automatic proximity searches timed out or no drivers accepted. You can restart the automated dispatch engine, quickly pick an active courier, or open the dispatch console.'}
                {isNewOrConfirmed && 'Print the Official Invoice & Packing List so warehouse staff can assemble commodities. Inventory will be verified and deducted via POS or marked packed.'}
                {isProcessing && 'Items are currently being picked and boxed. Once complete, click "Mark as Packed & Ready" to automatically trigger proximity driver dispatch, or open the POS packing terminal to scan barcodes.'}
                {isDriverAssigned && `Driver ${order.driver_name} is en route to the store. Once the driver arrives and collects the commodities, confirm store handover.`}
                {isOutForDelivery && 'The courier has collected the order and is on the way to the customer address. Live location is tracked on the map.'}
                {isDelivered && 'The customer has received their goods and the transaction has been closed.'}
                {isTerminal && (order.cancel_reason || 'This order has been cancelled or disputed. No further fulfillment actions are required.')}
              </p>

              {/* Quick Status Checklist Chips */}
              <div className="d-flex flex-wrap gap-2 pt-1">
                <span className={`badge ${isInvoicePrinted ? 'bg-success-subtle text-success' : 'bg-light text-muted border'} px-2.5 py-1.5 fs-xs d-flex align-items-center gap-1`}>
                  <i className={isInvoicePrinted ? 'ri-checkbox-circle-fill text-success' : 'ri-time-line text-muted'} />
                  Invoice Printed
                </span>
                <span className={`badge ${['packed', 'packed_ready', 'driver_assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(statusKey) ? 'bg-success-subtle text-success' : 'bg-light text-muted border'} px-2.5 py-1.5 fs-xs d-flex align-items-center gap-1`}>
                  <i className={['packed', 'packed_ready', 'driver_assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(statusKey) ? 'ri-checkbox-circle-fill text-success' : 'ri-time-line text-muted'} />
                  Items Packed
                </span>
                <span className={`badge ${order.driver_id ? 'bg-success-subtle text-success' : 'bg-light text-muted border'} px-2.5 py-1.5 fs-xs d-flex align-items-center gap-1`}>
                  <i className={order.driver_id ? 'ri-checkbox-circle-fill text-success' : 'ri-time-line text-muted'} />
                  Driver Assigned {order.driver_name ? `(${order.driver_name})` : ''}
                </span>
                <span className={`badge ${order.driver_picked_up ? 'bg-success-subtle text-success' : 'bg-light text-muted border'} px-2.5 py-1.5 fs-xs d-flex align-items-center gap-1`}>
                  <i className={order.driver_picked_up ? 'ri-checkbox-circle-fill text-success' : 'ri-time-line text-muted'} />
                  Store Handover Confirmed
                </span>
              </div>
            </div>

            {/* Right: Contextual Primary & Secondary Actions */}
            <div className="col-lg-5">
              <div className="p-3 rounded-3 bg-white border shadow-xs d-flex flex-column gap-2.5">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-uppercase fw-bold text-muted fs-xxs">Recommended Action</span>
                  {updating && <span className="spinner-border spinner-border-sm text-primary" />}
                </div>

                {/* Scenario 1: Awaiting Driver / No Driver Found */}
                {isAwaitingDriver && (
                  <>
                    <button
                      className="btn btn-primary fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleAutoAssignDriver}
                      disabled={updating}
                    >
                      <i className="ri-radar-line fs-16" />
                      <span>⚡ Auto-Assign Nearest Driver</span>
                    </button>
                    <button
                      className="btn btn-outline-danger fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
                      onClick={openDriverModal}
                      disabled={updating}
                    >
                      <i className="ri-user-add-line fs-16" />
                      <span>👤 Quick-Assign Driver (Modal)</span>
                    </button>
                    <div className="d-flex gap-2">
                      <Link
                        to={`/pos?orderId=${order.id}`}
                        className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                      >
                        <i className="ri-qr-scan-line" />Pack in POS
                      </Link>
                      <Link
                        to="/fleet/dispatch"
                        className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                      >
                        <i className="ri-steering-2-line" />Dispatch Hub
                      </Link>
                    </div>
                  </>
                )}

                {/* Scenario 2: Brand New / Confirmed Order */}
                {isNewOrConfirmed && (
                  <>
                    <button
                      className="btn btn-success fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={() => setPrintModalType('invoice')}
                      disabled={updating}
                    >
                      <i className="ri-printer-line fs-16" />
                      <span>🖨️ Print Invoice & Start Packing</span>
                    </button>
                    <button
                      className="btn btn-primary fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleFastPackAndDispatch}
                      disabled={updating}
                    >
                      <i className="ri-box-3-line fs-16" />
                      <span>📦 Fast-Pack & Initiate Dispatch</span>
                    </button>
                    <Link
                      to={`/pos?orderId=${order.id}`}
                      className="btn btn-outline-secondary btn-sm py-1.5 d-flex align-items-center justify-content-center gap-1"
                    >
                      <i className="ri-qr-scan-line text-primary" />
                      <span>Scan & Pack on POS Terminal</span>
                    </Link>
                  </>
                )}

                {/* Scenario 3: In Processing / Packaging */}
                {isProcessing && (
                  <>
                    <button
                      className="btn btn-primary fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={() => handleUpdateStatus('packed_ready')}
                      disabled={updating}
                    >
                      <i className="ri-checkbox-circle-line fs-16" />
                      <span>📦 Mark as Packed & Ready</span>
                    </button>
                    <Link
                      to={`/pos?orderId=${order.id}`}
                      className="btn btn-outline-primary fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
                    >
                      <i className="ri-qr-scan-line fs-16" />
                      <span>Scan Barcodes on POS Terminal</span>
                    </Link>
                    <button
                      className="btn btn-outline-secondary btn-sm py-1.5 d-flex align-items-center justify-content-center gap-1"
                      onClick={() => setPrintModalType('invoice')}
                    >
                      <i className="ri-printer-line" />Reprint Packing Invoice
                    </button>
                  </>
                )}

                {/* Scenario 4: Driver Assigned - Ready for Counter Handover */}
                {isDriverAssigned && (
                  <>
                    <button
                      className="btn btn-success fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleConfirmDriverPickup}
                      disabled={updating}
                    >
                      <i className="ri-hand-coin-line fs-16" />
                      <span>🤝 Confirm Store Handover to Driver</span>
                    </button>
                    <div className="d-flex gap-2">
                      {order.driver_phone && (
                        <a
                          href={`tel:${order.driver_phone}`}
                          className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        >
                          <i className="ri-phone-line text-success" />Call Driver
                        </a>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        onClick={openDriverModal}
                        disabled={updating}
                      >
                        <i className="ri-user-shared-line" />Reassign Driver
                      </button>
                    </div>
                  </>
                )}

                {/* Scenario 5: Out for Delivery */}
                {isOutForDelivery && (
                  <>
                    <div className="p-2 rounded bg-light border text-center fs-xs text-muted">
                      <i className="ri-roadster-line text-primary me-1 fs-14" />
                      Driver {order.driver_name || 'Courier'} has custody of commodities.
                    </div>
                    <button
                      className="btn btn-warning fw-bold py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleAdminDeliveryOverride}
                      disabled={updating}
                    >
                      <i className="ri-shield-check-line fs-16" />
                      <span>🛡️ Authorized Delivery Override</span>
                    </button>
                    <div className="d-flex gap-2">
                      {order.driver_phone && (
                        <a href={`tel:${order.driver_phone}`} className="btn btn-sm btn-outline-secondary flex-grow-1 text-center">
                          <i className="ri-phone-line me-1" />Driver
                        </a>
                      )}
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} className="btn btn-sm btn-outline-secondary flex-grow-1 text-center">
                          <i className="ri-user-line me-1" />Customer
                        </a>
                      )}
                    </div>
                  </>
                )}

                {/* Scenario 6: Delivered / Completed */}
                {isDelivered && (
                  <>
                    <div className="alert alert-success border-0 mb-0 py-2.5 px-3 text-center fs-xs fw-bold">
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-checkbox-circle-fill text-success" />
                        <span>Fulfillment Complete · Ledger Reconciled</span>
                      </div>
                      {(order.driver_name || order.driver_id) && (
                        <div className="mt-2 pt-2 border-top border-success-subtle d-flex justify-content-between align-items-center">
                          <span className="text-muted fw-normal fs-xxs">Courier Payout ({order.driver_name || 'Driver'}):</span>
                          <span className="badge bg-success text-white fs-xs px-2.5 py-1">
                            {fmt(driverEarning)} (Credited)
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-sm py-1.5 fw-bold d-flex align-items-center justify-content-center gap-1"
                      onClick={() => setPrintModalType('receipt')}
                    >
                      <i className="ri-printer-line" />Print Customer Receipt
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm py-1.5 d-flex align-items-center justify-content-center gap-1"
                      onClick={() => setPrintModalType('invoice')}
                    >
                      <i className="ri-file-text-line" />Reprint Official Invoice
                    </button>
                  </>
                )}

                {/* Scenario 7: Terminal / Cancelled */}
                {isTerminal && (
                  <div className="alert alert-danger border-0 mb-0 py-2.5 px-3 text-center fs-xs fw-bold">
                    <i className="ri-close-circle-fill me-1" />
                    Order Cancelled or Disputed
                  </div>
                )}
              </div>
            </div>
          </div>
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
                      <th>SKU / Barcode</th>
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
                            <td className="small">
                              {item.barcode && (
                                <div className="font-monospace text-dark d-flex align-items-center gap-1">
                                  <i className="ri-barcode-line text-muted"></i>
                                  <span>{item.barcode}</span>
                                </div>
                              )}
                              {item.sku ? (
                                <div className="text-muted fs-xs">{item.sku}</div>
                              ) : (!item.barcode ? <span className="text-muted">—</span> : null)}
                            </td>
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

          {/* Supervisor Emergency Status Override (Collapsible Accordion) */}
          <div className="card mb-4 shadow-sm border-0" style={{ borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div
              className="card-header bg-light d-flex justify-content-between align-items-center py-2.5 cursor-pointer"
              onClick={() => setShowSupervisorControls(!showSupervisorControls)}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="ri-shield-user-line text-secondary fs-16" />
                <span className="fw-bold fs-13 text-dark">Supervisor Controls: Manual Status Override</span>
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>Audit Logged</span>
              </div>
              <div className="d-flex align-items-center gap-2 text-muted">
                <span className="fs-xs d-none d-md-inline">{showSupervisorControls ? 'Hide overrides' : 'Show overrides'}</span>
                <i className={`ri-arrow-${showSupervisorControls ? 'up' : 'down'}-s-line fs-18`} />
              </div>
            </div>
            {showSupervisorControls && (
              <div className="card-body bg-light-subtle p-3 border-top">
                <div className="p-2.5 rounded-2 bg-warning-subtle text-warning-emphasis fs-xs mb-3 border border-warning-subtle d-flex align-items-start gap-2">
                  <i className="ri-alert-line fs-16 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Administrative Override Notice:</strong> Standard fulfillment updates automatically via POS scanning and the Driver mobile app. Use manual overrides only for in-house fulfillment, phone orders, or resolving edge cases.
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    { key: 'processing', label: 'Processing' },
                    { key: 'packed_ready', label: 'Packed & Ready' },
                    { key: 'picked_up', label: 'Driver Picked Up' },
                    { key: 'out_for_delivery', label: 'Out for Delivery' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      className={`btn btn-sm ${statusKey === s.key ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => handleSupervisorOverride(s.key, s.label)}
                      disabled={updating}
                    >
                      {statusKey === s.key ? `✓ Current: ${s.label}` : `Set ${s.label}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            {/* Live Interactive Delivery Map */}
            <div className="p-2 border-bottom bg-light">
              <AdminOrderMap order={order} height="220px" />
            </div>
            <div className="card-body d-flex flex-column gap-2 small">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Driver</span>
                <span className="fw-bold">{order.driver_name || <span className="text-danger">Unassigned</span>}</span>
              </div>
              {order.driver_lat && order.driver_lng ? (
                <div className="d-flex justify-content-between align-items-center bg-light p-1.5 rounded border">
                  <span className="text-muted d-flex align-items-center gap-1">
                    <span className="badge bg-success p-1 rounded-circle" style={{ width: 8, height: 8, display: 'inline-block' }} />
                    Live Driver GPS
                  </span>
                  <span className="font-monospace text-dark" style={{ fontSize: 11 }}>
                    {Number(order.driver_lat).toFixed(4)}, {Number(order.driver_lng).toFixed(4)}
                  </span>
                </div>
              ) : order.driver_name ? (
                <div className="d-flex justify-content-between align-items-center bg-light p-1.5 rounded border">
                  <span className="text-muted d-flex align-items-center gap-1">
                    <span className="badge bg-secondary p-1 rounded-circle" style={{ width: 8, height: 8, display: 'inline-block' }} />
                    Courier Telemetry
                  </span>
                  <span className="text-muted" style={{ fontSize: 10.5 }}>
                    Offline (&gt;30m no signal)
                  </span>
                </div>
              ) : null}

              {(!order.latitude && !order.customer_lat) && (
                <div className="d-flex justify-content-between align-items-center p-1.5 rounded border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                  <span className="text-dark d-flex align-items-center gap-1" style={{ fontSize: 10.5 }}>
                    <i className="ri-map-pin-line text-warning" />
                    Destination GPS
                  </span>
                  <span className="text-muted" style={{ fontSize: 10.5 }}>
                    Address unpinned
                  </span>
                </div>
              )}
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

              {/* Courier Delivery Compensation & Economics */}
              {(order.driver_id || order.driver_name) && (
                <div className="p-2.5 rounded-3 border mt-2" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted fs-xs">Courier Remuneration</span>
                    <span className={`badge ${['delivered', 'completed'].includes(statusKey) ? 'bg-success text-white' : 'bg-warning-subtle text-warning-emphasis'} fs-xxs`}>
                      {['delivered', 'completed'].includes(statusKey) ? '✓ Credited to Wallet' : 'Estimated Payout'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-baseline">
                    <span className="fw-bold text-dark fs-13">Driver Earned:</span>
                    <span className="fw-bold text-success fs-15">{fmt(driverEarning)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="d-flex justify-content-between text-muted fs-xxs mt-1 pt-1 border-top" style={{ borderColor: '#dcfce7' }}>
                      <span>Zone Fee: {fmt(deliveryFee)}</span>
                      <span>Company Cut: {fmt(companyMargin)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Specification Dual Confirmation Badges */}
              <div className="pt-2 border-top mt-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Store Goods Pickup</span>
                  {order.driver_picked_up || order.picked_up_at ? (
                    <span className="badge bg-success-subtle text-success">✓ Picked Up at Store</span>
                  ) : (
                    <span className="badge bg-warning-subtle text-warning-emphasis">Awaiting Store Handover</span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Customer Confirmation</span>
                  {order.customer_confirmed ? (
                    <span className="badge bg-success-subtle text-success">✓ Confirmed</span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary">Awaiting</span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Driver Delivery Handover</span>
                  {order.driver_confirmed ? (
                    <span className="badge bg-success-subtle text-success">✓ Confirmed</span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary">Awaiting</span>
                  )}
                </div>
                {order.delivery_override_by && (
                  <div className="p-2 rounded bg-warning-subtle text-warning-emphasis fs-xs mt-2 border border-warning-subtle">
                    <div className="fw-bold">⚡ Administrative Override</div>
                    <div>By: {order.delivery_override_by}</div>
                    <div>Reason: "{order.delivery_override_reason || 'Manual Verification'}"</div>
                  </div>
                )}
              </div>

              {order.driver_id && !order.driver_picked_up && order.status !== 'delivered' && order.status !== 'cancelled' && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success w-100 mt-2 d-flex align-items-center justify-content-center gap-1.5 fw-bold"
                  onClick={handleConfirmDriverPickup}
                  disabled={updating}
                  title="Confirm driver has arrived at the store and collected the packed goods"
                >
                  <i className="ri-hand-coin-line" />
                  <span>Confirm Driver Store Handover</span>
                </button>
              )}

              {['in_transit', 'shipped', 'out_for_delivery', 'delivery_attempted', 'delivery_exception', 'customer_unreachable'].includes(statusKey) && (
                <button
                  type="button"
                  className="btn btn-sm btn-warning w-100 mt-2 d-flex align-items-center justify-content-center gap-1.5 fw-bold"
                  onClick={handleAdminDeliveryOverride}
                  disabled={updating}
                >
                  <i className="ri-shield-check-line" />
                  <span>Authorized Delivery Override</span>
                </button>
              )}

              {['packed', 'awaiting_driver_confirmation'].includes(statusKey) && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-1.5"
                  onClick={handleAutoAssignDriver}
                  disabled={updating}
                >
                  <i className="ri-gps-line" />
                  <span>⚡ Auto-Assign Closest Driver</span>
                </button>
              )}
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
              {(order.driver_id || order.driver_name) && (
                <div className="d-flex justify-content-between pt-1 border-top mt-1">
                  <span className="text-muted">Courier Commission</span>
                  <span className="fw-bold text-success">{fmt(driverEarning)}</span>
                </div>
              )}
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
          receiptType={printModalType === 'invoice' ? 'invoice' : (order.channel === 'physical' || order.source?.toLowerCase().includes('pos') ? 'pos' : 'online')}
          receiptNumber={order.order_ref || order.id}
          date={order.created_at ? new Date(order.created_at).toLocaleString('en-NG') : new Date().toLocaleString('en-NG')}
          customer={order.customer_name || 'Walk-in Customer'}
          customerPhone={order.customer_phone}
          channel={order.source || (order.channel === 'physical' ? 'POS Terminal' : 'Online Store')}
          cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
          fulfillment={order.fulfillment_type || (order.delivery_address ? 'Delivery' : 'Store pickup')}
          deliveryAddress={order.delivery_address || order.shipping_address || order.address}
          deliveryZone={order.zone_name || order.delivery_zone}
          driverName={order.driver?.name || order.driver_name}
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

      {/* Printable Receipt / Invoice Preview Modal */}
      {printModalType && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
          onClick={() => setPrintModalType(null)}
        >
          {printFormat === 'a4' && (
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                .bems-doc-print-target, .bems-doc-print-target * {
                  visibility: visible !important;
                }
                .bems-doc-print-target {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                }
                .no-print, .no-print * {
                  display: none !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
              }
            `}</style>
          )}

          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            style={{ maxWidth: printFormat === 'a4' ? 880 : 460, transition: 'max-width 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
              <div className="modal-header py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between bg-light">
                <div>
                  <h6 className="modal-title fw-bold mb-0">
                    {printModalType === 'invoice' ? '📄 Official Invoice' : '🧾 Customer Payment Receipt'} #{order.order_ref || order.id}
                  </h6>
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {printFormat === 'a4' ? 'Executive A4 Brand Document · Security Stamps & QR Verification' : '80mm POS Thermal Slip'}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${printFormat === 'a4' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => setPrintFormat('a4')}
                    >
                      A4 Document
                    </button>
                    <button
                      type="button"
                      className={`btn ${printFormat === 'thermal' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => setPrintFormat('thermal')}
                    >
                      Thermal POS
                    </button>
                  </div>

                  {printModalType === 'invoice' ? (
                    <button className="btn btn-sm btn-primary fw-bold" onClick={handlePrintInvoice}>
                      <i className="ri-printer-line me-1" />Print Invoice
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-primary fw-bold" onClick={handlePrintReceipt}>
                      <i className="ri-printer-line me-1" />Print Receipt
                    </button>
                  )}
                  <button className="btn-close" onClick={() => setPrintModalType(null)} />
                </div>
              </div>

              <div className="modal-body p-3" style={{ maxHeight: '80vh', overflowY: 'auto', background: printFormat === 'a4' ? '#f1f5f9' : '#ffffff' }}>
                {printFormat === 'a4' ? (
                  <div className="bems-doc-print-target d-flex justify-content-center">
                    <BemsOfficialDocument
                      documentType={printModalType === 'invoice' ? 'tax_invoice' : 'receipt'}
                      data={orderDocData}
                    />
                  </div>
                ) : (
                  <div className="thermal-receipt-preview d-flex justify-content-center">
                    <ThermalReceipt
                      receiptType={printModalType === 'invoice' ? 'invoice' : (order.channel === 'physical' || order.source?.toLowerCase().includes('pos') ? 'pos' : 'online')}
                      receiptNumber={order.order_ref || order.id}
                      date={order.created_at ? new Date(order.created_at).toLocaleString('en-NG') : new Date().toLocaleString('en-NG')}
                      customer={order.customer_name || 'Walk-in Customer'}
                      customerPhone={order.customer_phone}
                      channel={order.source || (order.channel === 'physical' ? 'POS Terminal' : 'Online Store')}
                      cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                      fulfillment={order.fulfillment_type || (order.delivery_address ? 'Delivery' : 'Store pickup')}
                      deliveryAddress={order.delivery_address || order.shipping_address || order.address}
                      deliveryZone={order.zone_name || order.delivery_zone}
                      driverName={order.driver?.name || order.driver_name}
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK DRIVER ASSIGNMENT MODAL ── */}
      {showDriverModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          onClick={() => setShowDriverModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4 border-bottom bg-light d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="modal-title fw-bold mb-0 text-dark">
                    <i className="ri-steering-2-line text-primary me-2" />
                    Assign Delivery Driver to Order #{order.order_ref || order.id}
                  </h6>
                  <span className="text-muted fs-xs">
                    Assign delivery custody to an active courier. The driver will receive an instant assignment notification.
                  </span>
                </div>
                <button className="btn-close" onClick={() => setShowDriverModal(false)} />
              </div>

              <div className="p-3 border-bottom bg-white">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-search-line text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search available drivers by name, phone, or vehicle..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    autoFocus
                  />
                  {driverSearch && (
                    <button className="btn btn-outline-secondary" onClick={() => setDriverSearch('')}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="modal-body p-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {loadingDrivers ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status" />
                    <span className="text-muted">Loading fleet...</span>
                  </div>
                ) : filteredDrivers.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="ri-user-unfollow-line fs-32 text-muted mb-2 d-block" />
                    <div className="fw-semibold">No active drivers found matching search</div>
                    <div className="fs-xs mt-1">Ensure drivers are registered and logged into the BEMS Driver Mobile App.</div>
                    <div className="mt-3">
                      <Link to="/fleet/dispatch" className="btn btn-sm btn-outline-primary" onClick={() => setShowDriverModal(false)}>
                        <i className="ri-external-link-line me-1" />Open Full Dispatch Console
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {filteredDrivers.map((drv) => {
                      const isOnline = drv.is_available === true || drv.status === 'active'
                      const isSelected = selectedDriverId === drv.id
                      return (
                        <div
                          key={drv.id}
                          className={`p-3 rounded-3 border transition-all d-flex align-items-center justify-content-between ${
                            isSelected ? 'border-primary bg-primary-subtle shadow-xs' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedDriverId(drv.id)}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs"
                              style={{ width: 42, height: 42, background: isOnline ? '#10b981' : '#94a3b8' }}
                            >
                              {drv.name ? drv.name.charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-dark">{drv.name}</span>
                                <span className={`badge ${isOnline ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} fs-xxs`}>
                                  {isOnline ? '● Online' : 'Off-duty'}
                                </span>
                                {drv.vehicle_type && (
                                  <span className="badge bg-light text-muted border fs-xxs text-capitalize">
                                    <i className="ri-e-bike-2-line me-1" />{drv.vehicle_type}
                                  </span>
                                )}
                              </div>
                              <div className="text-muted fs-xs mt-0.5 d-flex align-items-center gap-3">
                                <span><i className="ri-phone-line me-1" />{drv.phone || 'No phone'}</span>
                                {drv.vehicle_plate && <span><i className="ri-car-line me-1" />{drv.vehicle_plate}</span>}
                                {drv.active_deliveries_count != null && (
                                  <span><i className="ri-box-3-line me-1" />{drv.active_deliveries_count} active orders</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              className="btn btn-sm btn-primary fw-bold px-3 text-nowrap"
                              disabled={assigningDriver}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssignDriver(drv.id)
                              }}
                            >
                              {assigningDriver && selectedDriverId === drv.id ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Assigning...
                                </>
                              ) : (
                                <>
                                  <i className="ri-user-add-line me-1" />Assign Driver
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer py-2.5 px-3 bg-light d-flex justify-content-between align-items-center">
                <Link to="/fleet/dispatch" className="text-primary text-decoration-none fs-xs fw-semibold" onClick={() => setShowDriverModal(false)}>
                  <i className="ri-external-link-line me-1" />Open Full Dispatch Console
                </Link>
                <button className="btn btn-sm btn-secondary" onClick={() => setShowDriverModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
