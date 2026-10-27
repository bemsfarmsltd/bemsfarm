import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import AdminOrderMap from '../ui/AdminOrderMap'
import ThermalReceipt, { printThermalReceipt } from '../ui/ThermalReceipt'

// ─── Status & Channel Configurations ─────────────────────────────────────────

const STATUS_CFG = {
  paid:                         { label: 'Confirmed',                  color: '#0284c7', bg: '#e0f2fe', icon: 'ri-checkbox-circle-line'     },
  new_order:                    { label: 'Confirmed',                  color: '#0284c7', bg: '#e0f2fe', icon: 'ri-checkbox-circle-line'     },
  pending:                      { label: 'Pending Payment',            color: '#64748b', bg: '#f1f5f9', icon: 'ri-time-line'                },
  pending_payment:              { label: 'Pending Payment',            color: '#64748b', bg: '#f1f5f9', icon: 'ri-time-line'                },
  confirmed:                    { label: 'Confirmed',                  color: '#0284c7', bg: '#e0f2fe', icon: 'ri-checkbox-circle-line'     },
  packaging:                    { label: 'Packaging',                  color: '#d97706', bg: '#fef3c7', icon: 'ri-box-3-line'               },
  processing:                   { label: 'Packaging',                  color: '#d97706', bg: '#fef3c7', icon: 'ri-box-3-line'               },
  partially_packed:             { label: 'Partially Packed',           color: '#d97706', bg: '#fef3c7', icon: 'ri-loader-4-line'            },
  packaging_exception:          { label: 'Packaging Exception',        color: '#dc2626', bg: '#fee2e2', icon: 'ri-error-warning-line'       },
  packed:                       { label: 'Packed & Ready',             color: '#7c3aed', bg: '#ede9fe', icon: 'ri-archive-line'             },
  packed_ready:                 { label: 'Packed & Ready',             color: '#7c3aed', bg: '#ede9fe', icon: 'ri-archive-line'             },
  awaiting_driver_confirmation: { label: 'Awaiting Driver',            color: '#e11d48', bg: '#ffe4e6', icon: 'ri-user-search-line'         },
  assigned:                     { label: 'Driver Assigned (Awaiting Pickup)', color: '#0891b2', bg: '#cffafe', icon: 'ri-user-location-line' },
  driver_assigned:              { label: 'Driver Assigned (Awaiting Pickup)', color: '#0891b2', bg: '#cffafe', icon: 'ri-user-location-line' },
  picked_up:                    { label: 'Goods Picked Up',            color: '#10b981', bg: '#d1fae5', icon: 'ri-hand-coin-line'          },
  in_transit:                   { label: 'In Transit',                 color: '#2563eb', bg: '#dbeafe', icon: 'ri-truck-line'               },
  shipped:                      { label: 'In Transit',                 color: '#2563eb', bg: '#dbeafe', icon: 'ri-truck-line'               },
  out_for_delivery:             { label: 'Out for Delivery',           color: '#2563eb', bg: '#dbeafe', icon: 'ri-truck-line'               },
  arrived:                      { label: 'Courier Arrived',            color: '#059669', bg: '#d1fae5', icon: 'ri-map-pin-user-line'        },
  driver_arrived:               { label: 'Courier Arrived',            color: '#059669', bg: '#d1fae5', icon: 'ri-map-pin-user-line'        },
  delivery_attempted:           { label: 'Delivery Exception',         color: '#ea580c', bg: '#ffedd5', icon: 'ri-route-line'               },
  delivery_exception:           { label: 'Delivery Exception',         color: '#ea580c', bg: '#ffedd5', icon: 'ri-alert-line'               },
  customer_unreachable:         { label: 'Customer Unreachable',       color: '#ea580c', bg: '#ffedd5', icon: 'ri-phone-missed-line'        },
  delivered:                    { label: 'Delivered',                  color: '#16a34a', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'     },
  completed:                    { label: 'Delivered',                  color: '#16a34a', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'     },
  dispute:                      { label: 'Dispute',                    color: '#dc2626', bg: '#fee2e2', icon: 'ri-alert-line'               },
  cancelled:                    { label: 'Cancelled',                  color: '#4b5563', bg: '#f3f4f6', icon: 'ri-close-circle-line'        },
  refunded:                     { label: 'Refunded',                   color: '#4b5563', bg: '#f3f4f6', icon: 'ri-refund-2-line'            },
  failed:                       { label: 'Failed',                     color: '#dc2626', bg: '#fee2e2', icon: 'ri-close-circle-line'        },
}

const getStatusCfg = (status) => STATUS_CFG[status] || { label: status || 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: 'ri-question-line' }

const CHANNEL_CFG = {
  online:       { label: 'Online Store',     icon: 'ri-global-line',     color: '#2563eb', badgeClass: 'bg-primary-subtle text-primary' },
  web:          { label: 'Online Store',     icon: 'ri-global-line',     color: '#2563eb', badgeClass: 'bg-primary-subtle text-primary' },
  mobile_app:   { label: 'Mobile App',       icon: 'ri-smartphone-line', color: '#7c3aed', badgeClass: 'bg-purple-subtle text-purple' },
  mobile:       { label: 'Mobile App',       icon: 'ri-smartphone-line', color: '#7c3aed', badgeClass: 'bg-purple-subtle text-purple' },
  chef_bems:    { label: 'Chef Bems AI',     icon: 'ri-robot-line',      color: '#9333ea', badgeClass: 'bg-info-subtle text-info' },
  chef_bems_ai: { label: 'Chef Bems AI',     icon: 'ri-robot-line',      color: '#9333ea', badgeClass: 'bg-info-subtle text-info' },
  ai:           { label: 'Chef Bems AI',     icon: 'ri-robot-line',      color: '#9333ea', badgeClass: 'bg-info-subtle text-info' },
  physical:     { label: 'Physical Store (POS)', icon: 'ri-store-2-line', color: '#059669', badgeClass: 'bg-success-subtle text-success' },
  pos:          { label: 'POS Terminal',     icon: 'ri-store-2-line',    color: '#059669', badgeClass: 'bg-success-subtle text-success' },
  store:        { label: 'Physical Store',   icon: 'ri-store-2-line',    color: '#059669', badgeClass: 'bg-success-subtle text-success' },
}

const getChannelCfg = (ch) => CHANNEL_CFG[String(ch || '').toLowerCase()] || { label: 'Online Store', icon: 'ri-global-line', color: '#2563eb', badgeClass: 'bg-primary-subtle text-primary' }

const PIPELINE = ['paid', 'processing', 'packed', 'assigned', 'shipped', 'driver_arrived', 'delivered']

const pipelineIdx = (s) => {
  if (s === 'delivery_attempted') return PIPELINE.indexOf('shipped')
  if (s === 'arrived') return PIPELINE.indexOf('driver_arrived')
  if (s === 'in_transit' || s === 'out_for_delivery') return PIPELINE.indexOf('shipped')
  if (s === 'driver_assigned') return PIPELINE.indexOf('assigned')
  if (s === 'packed_ready') return PIPELINE.indexOf('packed')
  if (s === 'packaging') return PIPELINE.indexOf('processing')
  if (s === 'confirmed' || s === 'new_order') return PIPELINE.indexOf('paid')
  if (s === 'completed') return PIPELINE.indexOf('delivered')
  return PIPELINE.indexOf(s)
}

const fmt = (n) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const calcSub = (items = []) => items.reduce((s, i) => s + (Number(i.total) || (Number(i.price || 0) * Number(i.qty || 1))), 0)

const safeFormatDate = (d, fallback = '—') => {
  if (!d) return fallback
  const date = new Date(d)
  return isNaN(date.getTime()) ? fallback : date.toISOString().replace('T', ' ').slice(0, 16)
}

export default function OrderDetailModal({
  orderId,
  initialData = null,
  onClose,
  onOpenFleetMap,
  onDriverUpdated,
  availableDrivers = [],
}) {
  const { user } = useAuth()
  const receiptRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [expandModalItems, setExpandModalItems] = useState(false)
  const [activeReceiptModal, setActiveReceiptModal] = useState(null) // null | 'invoice' | 'receipt' | 'reassign'
  const [driversList, setDriversList] = useState(availableDrivers || [])
  const [reassignDriverId, setReassignDriverId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch full deep order detail & driver list
  const fetchOrderDetail = async () => {
    if (!orderId) return
    try {
      setLoading(true)
      const cleanId = String(orderId).replace(/^#/, '').trim()
      const [res, driversRes] = await Promise.allSettled([
        api.get(`/admin/orders/${cleanId}`),
        driversList.length === 0 ? api.get('/admin/orders/form-data/drivers') : Promise.resolve(null),
      ])

      if (driversRes.status === 'fulfilled' && driversRes.value?.data?.drivers) {
        setDriversList(driversRes.value.data.drivers)
      }

      if (res.status === 'fulfilled' && res.value?.data) {
        const d = res.value.data

        // Determine channel
        let channelKey = 'online'
        const src = (d.channel || d.source || '').toLowerCase().trim()
        const orderIdStr = String(d.id || d.order_ref || '')
        if (src.includes('chef') || src.includes('ai')) {
          channelKey = 'chef_bems'
        } else if (src.includes('mobile') || src.includes('app')) {
          channelKey = 'mobile_app'
        } else if (src.includes('pos') || src.includes('counter') || orderIdStr.startsWith('POS-') || (src.includes('physical') && !src.includes('storefront'))) {
          channelKey = 'physical'
        } else if (src.includes('storefront') || src.includes('web') || src.includes('online')) {
          channelKey = 'online'
        }

        // Map items
        let orderItems = []
        if (Array.isArray(d.items) && d.items.length > 0) {
          orderItems = d.items.map((it, idx) => ({
            id: it.id || idx + 1,
            name: it.name || it.product_name || 'Item',
            sku: it.sku || '',
            qty: Number(it.quantity || it.qty || 1),
            unit: it.unit || 'pcs',
            price: parseFloat(it.unit_price || it.price || 0),
            total: parseFloat(it.subtotal || it.total || ((it.quantity || it.qty || 1) * (it.unit_price || it.price || 0))),
          }))
        }

        // Map timeline
        let timelineEvents = []
        if (Array.isArray(d.timeline) && d.timeline.length > 0) {
          timelineEvents = d.timeline.map((t) => ({
            status: t.to_status || t.status || 'updated',
            time: safeFormatDate(t.created_at, ''),
            note: t.notes || `Status changed to ${t.to_status || t.status}`,
            by: t.changed_by_name || 'Admin',
          }))
        } else {
          timelineEvents = [
            {
              status: d.status || 'confirmed',
              time: safeFormatDate(d.created_at, ''),
              note: 'Order registered in system',
              by: 'System',
            },
          ]
        }

        const deliveryFee = parseFloat(d.delivery_fee) || 0
        const computedTotal = parseFloat(d.total) || (calcSub(orderItems) + deliveryFee)

        setOrder({
          ...d,
          id: d.order_ref || String(d.id),
          numericId: d.id,
          date: safeFormatDate(d.created_at, '—'),
          channel: channelKey,
          status: d.status || 'confirmed',
          customer: {
            name: d.customer_name || 'Customer',
            phone: d.customer_phone || '',
            email: d.customer_email || '',
            address: d.address || d.delivery_address || 'Abia State, Nigeria',
          },
          driver: d.driver_name ? {
            id: d.driver_id,
            name: d.driver_name,
            phone: d.driver_phone,
            bike: d.driver_plate || 'Vehicle',
          } : null,
          items: orderItems,
          deliveryFee,
          total: computedTotal,
          payment: d.payment_method || 'POS Terminal',
          notes: d.notes || '',
          timeline: timelineEvents,
          proof_photo: d.proof_photo || null,
          proof_photos: Array.isArray(d.proof_photos) ? d.proof_photos : [],
          item_proofs: Array.isArray(d.item_proofs) ? d.item_proofs : [],
          deliveryNotes: d.delivery_notes || d.proof_note || null,
          deliveredAt: d.delivered_at || null,
        })
      } else if (initialData) {
        setOrder(initialData)
      }
    } catch (err) {
      console.warn('Could not fetch deep order detail:', err.message)
      if (initialData) setOrder(initialData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetail()
  }, [orderId])

  // Unassign Driver action
  const handleUnassignDriver = async () => {
    if (!order) return
    const orderRef = order.numericId || order.id
    if (!window.confirm(`Are you sure you want to unassign the courier from Order #${order.id}? The order will be reset to processing.`)) {
      return
    }
    setActionLoading(true)
    try {
      await api.post(`/admin/dispatch/unassign/${orderRef}`)
      toast.success(`Driver unassigned from Order #${order.id}`)
      await fetchOrderDetail()
      if (onDriverUpdated) onDriverUpdated()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to unassign courier')
    } finally {
      setActionLoading(false)
    }
  }

  // Reassign Driver action
  const handleReassignDriver = async () => {
    if (!order || !reassignDriverId) return
    setActionLoading(true)
    try {
      const targetId = order.numericId || order.id
      await api.patch(`/admin/orders/${targetId}/assign-driver`, {
        driver_id: parseInt(reassignDriverId),
        reassign: true,
      })
      const selectedD = driversList.find(d => String(d.id) === String(reassignDriverId))
      toast.success(`Courier ${selectedD?.name || ''} successfully assigned to Order #${order.id}`)
      setActiveReceiptModal(null)
      setReassignDriverId('')
      await fetchOrderDetail()
      if (onDriverUpdated) onDriverUpdated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reassign courier')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = () => {
    printThermalReceipt()
    toast.success(`Printed invoice/receipt for #${order?.id || ''}`)
  }

  if (!order && loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
      >
        <div style={{ background: '#fff', borderRadius: 16, padding: '32px 40px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: 36, height: 36 }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>Fetching Live Order Details</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Loading telemetry, goods items and tracking timeline…</div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const cfg = getStatusCfg(order.status)
  const idx = pipelineIdx(order.status)
  const channelCfg = getChannelCfg(order.channel)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          className="d-flex align-items-center justify-content-between p-4 border-bottom"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}
        >
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: '#0F172A', fontSize: 18, letterSpacing: '-0.01em' }}>
              {order.id}
            </h5>
            <div className="text-muted small" style={{ fontSize: 12, marginTop: 2 }}>
              {order.date} · {channelCfg.label}
            </div>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            <span
              className="badge"
              style={{
                background: cfg.bg,
                color: cfg.color,
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 8,
              }}
            >
              <i className={`${cfg.icon} me-1`} />
              {cfg.label}
            </span>

            {/* Live Fleet Map Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenFleetMap) onOpenFleetMap(order)
                else if (onClose) onClose()
              }}
              className="btn btn-sm btn-outline-primary"
              style={{ fontWeight: 600, fontSize: 12, padding: '5px 10px', borderRadius: 8 }}
              title="Focus in Live Fleet Command & GPS Tracking"
            >
              <i className="ri-map-pin-2-line me-1" />
              Live Fleet Map
            </button>

            {/* Reprint Invoice */}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setActiveReceiptModal('invoice')}
              style={{ fontWeight: 600, fontSize: 12, padding: '5px 10px', borderRadius: 8 }}
              title="Print Warehouse Invoice & Packing List"
            >
              <i className="ri-file-text-line me-1" />
              Reprint Invoice
            </button>

            {/* Customer Receipt */}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setActiveReceiptModal('receipt')}
              style={{ fontWeight: 600, fontSize: 12, padding: '5px 10px', borderRadius: 8 }}
              title="Print Customer Payment Receipt"
            >
              <i className="ri-printer-line me-1" />
              Customer Receipt
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              style={{ padding: '5px 8px', borderRadius: 8 }}
              title="Close Order Modal"
            >
              <i className="ri-close-line" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ── 7-Stage Pipeline Progress Stepper ── */}
        {!['physical'].includes(order.channel) && !['dispute', 'cancelled'].includes(order.status) && (
          <div className="px-4 py-3 border-bottom" style={{ background: '#F8FAFC' }}>
            <div className="d-flex align-items-center">
              {PIPELINE.map((step, i) => {
                const c = getStatusCfg(step)
                const done = i <= idx
                const now = i === idx
                return (
                  <div key={step} className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex flex-column align-items-center flex-shrink-0" style={{ gap: 4 }}>
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 28,
                          height: 28,
                          background: done ? c.color : '#E2E8F0',
                          boxShadow: now ? `0 0 0 4px ${c.color}35` : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <i className={c.icon} style={{ color: done ? '#FFFFFF' : '#94A3B8', fontSize: 12 }} />
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          color: done ? c.color : '#94A3B8',
                          whiteSpace: 'nowrap',
                          fontWeight: now ? 800 : 500,
                        }}
                      >
                        {c.label}
                      </div>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div
                        className="flex-grow-1 mx-1"
                        style={{
                          height: 2,
                          background: i < idx ? '#22C55E' : '#E2E8F0',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading && (
            <div className="alert alert-info py-2 small mb-3">
              <i className="ri-loader-line ri-spin me-1" />
              Refreshing live order telemetry & dispatch status…
            </div>
          )}

          <div className="row g-4">
            {/* ── Left Column: Customer, Items, Delivery info ── */}
            <div className="col-md-7">
              {/* Customer & Address Details Card */}
              <div className="card border mb-3 p-3 bg-light-subtle" style={{ borderRadius: 12 }}>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-muted small mb-1" style={{ fontSize: 11, fontWeight: 700 }}>CUSTOMER</div>
                    <div className="fw-bold" style={{ color: '#0F172A', fontSize: 13 }}>{order.customer?.name}</div>
                    <div className="small text-muted" style={{ fontSize: 11 }}>{order.customer?.phone}</div>
                    <div className="small text-muted" style={{ fontSize: 11 }}>{order.customer?.email}</div>
                  </div>

                  <div className="col-6">
                    <div className="text-muted small mb-1" style={{ fontSize: 11, fontWeight: 700 }}>FULFILLMENT ADDRESS</div>
                    <div className="small" style={{ color: '#334155', lineHeight: 1.35 }}>{order.customer?.address}</div>
                  </div>

                  <div className="col-6">
                    <div className="text-muted small mb-1" style={{ fontSize: 11, fontWeight: 700 }}>CHANNEL</div>
                    <span className={`badge rounded-pill ${channelCfg.badgeClass || ''}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                      <i className={`${channelCfg.icon} me-1`} />
                      {channelCfg.label}
                    </span>
                  </div>

                  <div className="col-6">
                    <div className="text-muted small mb-1" style={{ fontSize: 11, fontWeight: 700 }}>PAYMENT METHOD</div>
                    <div className="small fw-semibold" style={{ color: '#0F172A' }}>
                      {String(order.payment).toLowerCase().includes('cash')
                        ? '💵 Cash'
                        : String(order.payment).toLowerCase().includes('pos')
                        ? '💳 POS Terminal'
                        : '💳 Paystack / Online Card'}
                    </div>
                  </div>

                  {/* Assigned Driver Row */}
                  <div className="col-12 border-top pt-2 mt-2">
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <div className="text-muted small fw-bold" style={{ fontSize: 11 }}>ASSIGNED DRIVER</div>
                      <div className="d-flex gap-1.5">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-warning"
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          title="Reassign to another courier"
                          onClick={() => setActiveReceiptModal('reassign')}
                        >
                          <i className="ri-user-follow-line me-1" />
                          Reassign
                        </button>
                        {order.driver && (
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-danger"
                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                            title="Unassign courier from order"
                            disabled={actionLoading}
                            onClick={handleUnassignDriver}
                          >
                            <i className="ri-user-unfollow-line me-1" />
                            Unassign
                          </button>
                        )}
                      </div>
                    </div>

                    {order.driver ? (
                      <div className="d-flex align-items-center gap-2.5">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                          style={{ width: 34, height: 34, fontSize: 11, fontWeight: 800, background: '#059669' }}
                        >
                          {order.driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold small" style={{ color: '#0F172A' }}>{order.driver.name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {order.driver.phone} · {order.driver.bike}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small fst-italic py-1">
                        No courier assigned yet. Click Reassign to dispatch an active vehicle.
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="col-12 border-top pt-2 mt-2">
                      <div className="text-muted small mb-1" style={{ fontSize: 11, fontWeight: 700 }}>ORDER NOTES</div>
                      <div className="small text-muted">{order.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown with Dropdown Toggle */}
              <div className="card border mb-3 p-3" style={{ borderRadius: 12 }}>
                {(() => {
                  const items = order.items || []
                  const previewLimit = 4
                  const hasMore = items.length > previewLimit
                  const visibleItems = hasMore && !expandModalItems ? items.slice(0, previewLimit) : items

                  return (
                    <>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="fw-bold small d-flex align-items-center gap-1.5" style={{ color: '#0F172A' }}>
                          <span>Order Items ({items.length})</span>
                          {hasMore && !expandModalItems && (
                            <span className="badge bg-light text-secondary border fw-normal" style={{ fontSize: 10 }}>
                              Showing 4 of {items.length}
                            </span>
                          )}
                        </div>
                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => setExpandModalItems(!expandModalItems)}
                            className="btn btn-sm btn-link text-decoration-none p-0 fw-bold text-primary"
                            style={{ fontSize: 12 }}
                          >
                            {expandModalItems ? '▲ Collapse Goods' : `▼ View Complete Goods (${items.length})`}
                          </button>
                        )}
                      </div>

                      {items.length > 0 ? (
                        <>
                          <table className="table table-sm mb-0 align-middle">
                            <thead className="table-light">
                              <tr style={{ fontSize: 11 }}>
                                <th>ITEM</th>
                                <th>QTY</th>
                                <th>PRICE</th>
                                <th className="text-end">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleItems.map((it, idx) => (
                                <tr key={it.id || idx}>
                                  <td>
                                    <div className="fw-medium small" style={{ color: '#0F172A' }}>{it.name}</div>
                                    {it.sku && <div className="text-muted" style={{ fontSize: 10 }}>SKU: {it.sku}</div>}
                                  </td>
                                  <td className="small">{it.qty} {it.unit || ''}</td>
                                  <td className="small">{fmt(it.price)}</td>
                                  <td className="text-end small fw-bold" style={{ color: '#0F172A' }}>{fmt(it.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => setExpandModalItems(!expandModalItems)}
                              className="btn btn-sm btn-outline-primary w-100 mt-2 py-1.5 d-flex align-items-center justify-content-center gap-1 shadow-none"
                              style={{ fontSize: 12, fontWeight: 600, borderRadius: 8 }}
                            >
                              <span>
                                {expandModalItems
                                  ? `▲ Collapse Goods List (Showing all ${items.length})`
                                  : `▼ Click to View Complete Goods (${items.length} items · ${items.length - previewLimit} more)`}
                              </span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-muted small py-2">No individual product items specified (Direct POS transaction).</div>
                      )}
                    </>
                  )
                })()}

                <div className="border-top pt-2 mt-3">
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Subtotal</span>
                    <span>{fmt(calcSub(order.items) || order.total)}</span>
                  </div>
                  {order.deliveryFee > 0 && (
                    <div className="d-flex justify-content-between small text-muted">
                      <span>Delivery Fee</span>
                      <span>{fmt(order.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold mt-1 fs-15">
                    <span style={{ color: '#0F172A' }}>Total</span>
                    <span className="text-primary fw-bolder" style={{ fontSize: 16 }}>{fmt(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Proof of Delivery (POD) Image & Handover Notes */}
              {Boolean(
                order.proof_photo ||
                (Array.isArray(order.proof_photos) && order.proof_photos.length > 0) ||
                (Array.isArray(order.item_proofs) && order.item_proofs.length > 0) ||
                order.deliveryNotes ||
                order.proof_note
              ) && (
                <div className="card border mb-3 p-3 bg-success-subtle border-success-subtle shadow-xs" style={{ borderRadius: 12 }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-bold small text-success-emphasis d-flex align-items-center gap-1">
                      <i className="ri-camera-lens-line fs-15 text-success" />
                      <span>Proof of Delivery (Handover Confirmed)</span>
                    </div>
                    <span className="badge bg-success text-white" style={{ fontSize: 10 }}>
                      <i className="ri-checkbox-circle-line me-1" />Courier Snapped
                    </span>
                  </div>

                  {(() => {
                    const rawPhotos = [
                      order.proof_photo,
                      ...(Array.isArray(order.proof_photos) ? order.proof_photos : []),
                      ...(Array.isArray(order.item_proofs) ? order.item_proofs.map(p => typeof p === 'string' ? p : p?.photo_url || p?.url) : []),
                    ].filter(Boolean)

                    const uniquePhotos = Array.from(new Set(rawPhotos))
                    if (uniquePhotos.length === 0) return null

                    return (
                      <div className="d-flex flex-wrap gap-2 my-2">
                        {uniquePhotos.map((url, pIdx) => (
                          <a
                            key={pIdx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="d-block position-relative rounded-3 overflow-hidden border shadow-xs text-decoration-none"
                            style={{ width: 120, height: 120, background: '#0f172a' }}
                            title="Click to view full image in high resolution"
                          >
                            <img
                              src={url}
                              alt={`Proof ${pIdx + 1}`}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                            <div
                              className="position-absolute bottom-0 start-0 end-0 text-white text-center py-1 fw-medium"
                              style={{ fontSize: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                            >
                              <i className="ri-zoom-in-line me-1" />Photo #{pIdx + 1}
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  })()}

                  {(order.deliveryNotes || order.proof_note) && (
                    <div className="bg-white p-2.5 rounded border border-success-subtle mt-2 small">
                      <div className="text-muted fw-bold" style={{ fontSize: 10, letterSpacing: '0.03em' }}>DRIVER HANDOVER NOTE:</div>
                      <div className="text-dark mt-0.5">{order.deliveryNotes || order.proof_note}</div>
                    </div>
                  )}

                  <div className="text-muted mt-2 d-flex align-items-center justify-content-between" style={{ fontSize: 11 }}>
                    <span>Courier: <strong>{order.driver?.name || 'Delivery Driver'}</strong></span>
                    {order.deliveredAt && (
                      <span>Delivered: {safeFormatDate(order.deliveredAt, '')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Column: Interactive Map, Timeline & Action shortcuts ── */}
            <div className="col-md-5">
              {/* Interactive Location & Telemetry Map */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold small" style={{ color: '#0F172A' }}>📍 Order Location &amp; Dispatch Map</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenFleetMap) onOpenFleetMap(order)
                      else if (onClose) onClose()
                    }}
                    className="btn btn-link p-0 small text-primary text-decoration-none fw-semibold"
                    style={{ fontSize: 12 }}
                  >
                    Full Screen <i className="ri-arrow-right-up-line" />
                  </button>
                </div>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <AdminOrderMap order={order} height="200px" />
                </div>
              </div>

              {/* Status & Tracking Timeline */}
              <div className="fw-bold mb-3 small" style={{ color: '#0F172A' }}>Status &amp; Tracking Timeline</div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: '#E2E8F0', zIndex: 0 }} />
                {order.timeline && order.timeline.map((ev, i) => {
                  const c = getStatusCfg(ev.status)
                  return (
                    <div key={i} className="d-flex gap-3 mb-3" style={{ position: 'relative', zIndex: 1 }}>
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          background: c?.bg || '#F1F5F9',
                          border: `2px solid ${c?.color || '#CBD5E1'}`,
                        }}
                      >
                        <i className={c?.icon || 'ri-circle-line'} style={{ color: c?.color || '#64748B', fontSize: 12 }} />
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 13, color: '#0F172A' }}>{c?.label || ev.status}</div>
                        <div className="text-muted" style={{ fontSize: 10 }}>{ev.time} · {ev.by || 'System'}</div>
                        <div className="small mt-1 text-muted">{ev.note}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submodal 1: Invoice Printable Thermal Receipt ── */}
      {activeReceiptModal === 'invoice' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setActiveReceiptModal(null)}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom d-print-none">
              <div>
                <h6 className="mb-0 fw-bold">📄 Warehouse Invoice &amp; Packing List</h6>
                <span className="text-muted" style={{ fontSize: 11 }}>Official Picking &amp; Delivery Slip</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary fw-bold" onClick={handlePrint}>
                  <i className="ri-printer-line me-1" />Print Invoice
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveReceiptModal(null)}>
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="thermal-receipt-preview">
              <ThermalReceipt
                receiptType="invoice"
                receiptNumber={order.order_ref || order.id}
                date={order.date}
                customer={order.customer?.name}
                customerPhone={order.customer?.phone}
                channel={channelCfg.label}
                cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                fulfillment="Delivery"
                deliveryAddress={order.customer?.address}
                driverName={order.driver?.name}
                status={cfg.label}
                items={order.items}
                subtotal={calcSub(order.items) || order.total}
                deliveryFee={order.deliveryFee}
                total={order.total}
                paymentMethod={String(order.payment).toUpperCase()}
                note={order.notes}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Submodal 2: Customer Printable Thermal Receipt ── */}
      {activeReceiptModal === 'receipt' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setActiveReceiptModal(null)}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom d-print-none">
              <div>
                <h6 className="mb-0 fw-bold">🧾 Customer Payment Receipt</h6>
                <span className="text-muted" style={{ fontSize: 11 }}>Customer Copy · Handover upon delivery</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary fw-bold" onClick={handlePrint}>
                  <i className="ri-printer-line me-1" />Print Receipt
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveReceiptModal(null)}>
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="thermal-receipt-preview">
              <ThermalReceipt
                receiptType={order.channel === 'physical' ? 'pos' : 'online'}
                receiptNumber={order.order_ref || order.id}
                date={order.date}
                customer={order.customer?.name}
                customerPhone={order.customer?.phone}
                channel={channelCfg.label}
                cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                fulfillment="Delivery"
                deliveryAddress={order.customer?.address}
                driverName={order.driver?.name}
                status={cfg.label}
                items={order.items}
                subtotal={calcSub(order.items) || order.total}
                deliveryFee={order.deliveryFee}
                total={order.total}
                paymentMethod={String(order.payment).toUpperCase()}
                note={order.notes}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Submodal 3: Courier Assignment Modal ── */}
      {activeReceiptModal === 'reassign' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setActiveReceiptModal(null)}
        >
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="mb-0 fw-bold" style={{ color: '#0F172A' }}>Assign Courier to Order</h6>
                <div className="text-muted" style={{ fontSize: 11 }}>Order #{order.id}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setActiveReceiptModal(null)}
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted" style={{ fontSize: 11 }}>
                SELECT AVAILABLE FLEET COURIER:
              </label>
              <select
                className="form-select form-select-sm"
                value={reassignDriverId}
                onChange={(e) => setReassignDriverId(e.target.value)}
              >
                <option value="">-- Choose Courier --</option>
                {driversList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.vehicle_type || 'Vehicle'} ({d.phone || 'No Phone'})
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setActiveReceiptModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary fw-bold"
                disabled={!reassignDriverId || actionLoading}
                onClick={handleReassignDriver}
              >
                {actionLoading ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
