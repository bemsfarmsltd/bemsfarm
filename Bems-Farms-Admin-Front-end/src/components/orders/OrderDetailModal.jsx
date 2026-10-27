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

const getInitials = (name = '') => {
  if (!name) return 'BF'
  const parts = String(name).trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function OrderDetailModal({
  orderId,
  initialData = null,
  onClose,
  onOpenFleetMap,
  onOpenChat,
  onDriverUpdated,
  onAction,
  availableDrivers = [],
}) {
  const { user } = useAuth()
  const receiptRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [expandModalItems, setExpandModalItems] = useState(false)
  const [activeReceiptModal, setActiveReceiptModal] = useState(null) // null | 'invoice' | 'receipt' | 'reassign'
  const [activePhotoModal, setActivePhotoModal] = useState(null) // null | { url, index, total }
  const [uploadingProof, setUploadingProof] = useState(false)
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
              note: `Order registered via ${channelKey.replace('_', ' ')}`,
              by: 'System',
            },
          ]
        }

        setOrder({
          numericId: d.id,
          id: d.order_ref || `ORD-${d.id}`,
          date: safeFormatDate(d.created_at, '—'),
          channel: channelKey,
          status: d.status || 'pending',
          customer: {
            name: d.customer_name || d.shipping_name || d.name || 'Walk-in Customer',
            phone: d.customer_phone || d.shipping_phone || d.phone || '—',
            email: d.customer_email || d.email || '—',
            address: d.shipping_address || d.customer_address || d.address || 'In-store / Pick-up',
          },
          items: orderItems,
          total: parseFloat(d.total_amount || d.total || 0),
          deliveryFee: parseFloat(d.delivery_fee || 0),
          payment: d.payment_method || d.payment || 'POS Terminal',
          notes: d.notes || d.special_instructions || '',
          driver: (d.driver_name || d.driver_id) ? {
            id: d.driver_id,
            name: d.driver_name || 'Assigned Courier',
            phone: d.driver_phone || '—',
            bike: d.vehicle_plate || d.vehicle_type || 'Vehicle',
          } : null,
          timeline: timelineEvents,
          lat: d.delivery_lat || d.customer_lat,
          lng: d.delivery_lng || d.customer_lng,
          deliveryAddress: d.shipping_address || d.address,
          proof_photo: d.proof_photo,
          proof_photos: d.proof_photos,
          item_proofs: d.item_proofs,
          deliveryNotes: d.delivery_notes,
          proof_note: d.proof_note,
          deliveredAt: d.delivered_at,
          disputeReason: d.dispute_reason,
          disputeNote: d.dispute_note,
          cancelReason: d.cancel_reason,
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
    if (['delivered', 'completed', 'cancelled', 'returned'].includes(order.status)) {
      toast.error(`Cannot unassign courier: Order #${order.id} is already ${order.status}.`)
      return
    }
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
    if (['delivered', 'completed', 'cancelled', 'returned'].includes(order.status)) {
      toast.error(`Cannot reassign courier: Order #${order.id} is already ${order.status}.`)
      return
    }
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

  // Admin upload/attach proof photo handler
  const handleUploadProofPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const orderRef = order?.numericId || order?.id
    if (!orderRef) return
    setUploadingProof(true)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('proof_note', order.proof_note || order.deliveryNotes || 'Admin confirmed handover photo')
    try {
      await api.post(`/admin/orders/${orderRef}/proof-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Proof of delivery photo attached successfully!')
      await fetchOrderDetail()
      if (onDriverUpdated) onDriverUpdated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to attach delivery photo')
    } finally {
      setUploadingProof(false)
      e.target.value = ''
    }
  }

  // Internal status update helper if onAction is not passed
  const handleUpdateStatus = async (newStatus, label) => {
    if (!order) return
    setActionLoading(true)
    try {
      const targetId = order.numericId || order.id
      await api.patch(`/admin/orders/${targetId}/status`, { status: newStatus })
      toast.success(`Order #${order.id} status updated to ${label}`)
      await fetchOrderDetail()
      if (onDriverUpdated) onDriverUpdated()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update status to ${label}`)
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
        <div style={{ background: '#fff', borderRadius: 24, padding: '36px 48px', textAlign: 'center', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.45)' }}>
          <div className="spinner-border text-success mb-3" role="status" style={{ width: 40, height: 40 }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Bems Order Command &amp; Fulfillment Dossier
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Loading live order telemetry, produce manifest &amp; tracking timeline…
          </div>
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
          background: '#F1F5F9',
          borderRadius: 24,
          width: '100%',
          maxWidth: 1240,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.45)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Bar / Cockpit Header (Sticky) ── */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10,
            gap: 16,
          }}
        >
          {/* Brand & Order Identifiers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px rgba(5, 150, 105, 0.25)',
                flexShrink: 0,
              }}
            >
              <i className="ri-file-list-3-fill" style={{ fontSize: 22 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A', whiteSpace: 'nowrap' }}>
                  Bems Order Command &amp; Fulfillment Dossier
                </h2>
                <span
                  style={{
                    background: '#ECFDF5',
                    color: '#065F46',
                    border: '1px solid #A7F3D0',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 10.5,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10B981',
                      display: 'inline-block',
                      boxShadow: '0 0 6px #10B981',
                    }}
                  />
                  REAL-TIME STREAM
                </span>
                <span
                  onClick={() => {
                    navigator.clipboard?.writeText(order.id)
                    toast.success(`Order ID #${order.id} copied!`)
                  }}
                  style={{
                    background: '#F8FAFC',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Click to copy ID"
                >
                  #{order.id}
                  <i className="ri-file-copy-line" style={{ fontSize: 10, color: '#94A3B8' }} />
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.date} · {channelCfg.label} · Active order tracking &amp; dispatch operations
              </p>
            </div>
          </div>

          {/* Header Action Controls (Unified & Aligned) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Status Pill */}
            <span
              style={{
                background: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}35`,
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <i className={cfg.icon} />
              {cfg.label}
            </span>

            {/* Quick Action Toolbar Capsule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '3px 4px',
                borderRadius: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onOpenFleetMap) onOpenFleetMap(order)
                  else if (onClose) onClose()
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 9,
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease',
                }}
                title="Focus in Live Fleet Command & GPS Tracking"
              >
                <i className="ri-map-pin-2-line" />
                <span>Fleet Map</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReceiptModal('invoice')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 9,
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
                title="Print Warehouse Invoice & Packing List"
              >
                <i className="ri-file-text-line" style={{ color: '#059669' }} />
                <span>Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReceiptModal('receipt')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 9,
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
                title="Print Customer Payment Receipt"
              >
                <i className="ri-printer-line" style={{ color: '#6366F1' }} />
                <span>Receipt</span>
              </button>
            </div>

            {/* Circular Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#F8FAFC',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEE2E2'
                e.currentTarget.style.color = '#DC2626'
                e.currentTarget.style.borderColor = '#FCA5A5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8FAFC'
                e.currentTarget.style.color = '#64748B'
                e.currentTarget.style.borderColor = '#E2E8F0'
              }}
              title="Close Order Dossier"
            >
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        {/* ── 7-Stage Mathematically Symmetrical Progress Stepper ── */}
        {!['physical'].includes(order.channel) && !['dispute', 'cancelled'].includes(order.status) && (() => {
          const STAGES = [
            { key: 'paid',           label: 'Confirmed',        sub: 'Payment Done',     icon: 'ri-checkbox-circle-fill' },
            { key: 'processing',     label: 'Packaging',        sub: 'Produce Prep',     icon: 'ri-box-3-fill' },
            { key: 'packed',         label: 'Packed & Ready',   sub: 'At Dispatch',      icon: 'ri-archive-fill' },
            { key: 'assigned',       label: 'Courier Assigned', sub: 'Awaiting Pickup',  icon: 'ri-user-location-fill' },
            { key: 'shipped',        label: 'In Transit',       sub: 'En Route',         icon: 'ri-truck-fill' },
            { key: 'driver_arrived', label: 'Courier Arrived',  sub: 'At Destination',   icon: 'ri-map-pin-user-fill' },
            { key: 'delivered',      label: 'Delivered',        sub: 'Handover Settled', icon: 'ri-shield-check-fill' },
          ]
          const progressPercent = Math.min(100, Math.max(0, (idx / (STAGES.length - 1)) * 100))

          return (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '16px 20px 14px',
                margin: '14px 24px 0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {/* Background Continuous Rail */}
              <div
                style={{
                  position: 'absolute',
                  top: 29,
                  left: 'calc(100% / 14)',
                  right: 'calc(100% / 14)',
                  height: 3,
                  background: '#E2E8F0',
                  borderRadius: 2,
                  zIndex: 1,
                }}
              >
                {/* Active Progress Fill */}
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                    borderRadius: 2,
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>

              {/* 7-Column Grid of Centered Nodes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {STAGES.map((stage, i) => {
                  const isDone = i <= idx
                  const isCurrent = i === idx
                  const isDelivered = order.status === 'delivered' || order.status === 'completed'

                  return (
                    <div
                      key={stage.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '0 4px',
                      }}
                    >
                      {/* Node Circle */}
                      <div
                        style={{
                          width: isCurrent && !isDelivered ? 30 : 26,
                          height: isCurrent && !isDelivered ? 30 : 26,
                          borderRadius: '50%',
                          background: isDone
                            ? '#10B981'
                            : '#FFFFFF',
                          border: isDone
                            ? 'none'
                            : '2px solid #CBD5E1',
                          color: isDone ? '#FFFFFF' : '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isCurrent && !isDelivered
                            ? '0 0 0 4px rgba(16, 185, 129, 0.25), 0 4px 10px rgba(5, 150, 105, 0.3)'
                            : isDone
                            ? '0 2px 6px rgba(16, 185, 129, 0.25)'
                            : 'none',
                          transition: 'all 0.25s ease',
                          marginBottom: 6,
                        }}
                      >
                        {isDone ? (
                          <i className="ri-check-line" style={{ fontSize: 14, fontWeight: 900 }} />
                        ) : (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#CBD5E1',
                            }}
                          />
                        )}
                      </div>

                      {/* Primary Label */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: isCurrent ? 800 : isDone ? 700 : 600,
                          color: isCurrent ? '#059669' : isDone ? '#0F172A' : '#94A3B8',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stage.label}
                      </div>

                      {/* Subtitle Details */}
                      <div
                        style={{
                          fontSize: 9,
                          color: isCurrent || isDone ? '#059669' : '#CBD5E1',
                          fontWeight: isCurrent ? 700 : 500,
                          marginTop: 2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stage.sub}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Scrollable Body Grid ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {loading && (
            <div className="alert alert-info py-2 small mb-3" style={{ borderRadius: 12 }}>
              <i className="ri-loader-line ri-spin me-1" />
              Refreshing live order telemetry &amp; dispatch status…
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.95fr', gap: 16 }}>
            {/* ── Left Column: Customer, Driver, Goods, Proof of Delivery ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card 1: Customer Profile & Fulfillment Details */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ri-user-smile-line text-primary fs-16" />
                    Customer &amp; Delivery Destination
                  </span>
                  <span className={`badge rounded-pill ${channelCfg.badgeClass || ''}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                    <i className={`${channelCfg.icon} me-1`} />
                    {channelCfg.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Customer details */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #059669, #10B981)',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(order.customer?.name)}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Recipient</span>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{order.customer?.name}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                        <a href={`tel:${order.customer?.phone}`} style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                          📞 {order.customer?.phone}
                        </a>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{order.customer?.email}</div>
                    </div>
                  </div>

                  {/* Destination Address */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Fulfillment Address</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 2, lineHeight: 1.4 }}>
                      📍 {order.customer?.address}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Payment Method: </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                        {String(order.payment).toLowerCase().includes('cash')
                          ? '💵 Cash on Delivery'
                          : String(order.payment).toLowerCase().includes('pos')
                          ? '💳 POS Terminal'
                          : '💳 Paystack / Online Card'}
                      </span>
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 14px', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}>
                    <strong style={{ color: '#0F172A' }}>📝 Special Delivery Instructions: </strong>
                    {order.notes}
                  </div>
                )}
              </div>

              {/* Card 2: Assigned Courier & Dispatch Status */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ri-truck-line text-success fs-16" />
                    Assigned Fleet Courier &amp; Vehicle
                  </span>
                  {['delivered', 'completed'].includes(order.status) ? (
                    <span
                      className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1"
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 700 }}
                    >
                      <i className="ri-checkbox-circle-fill" /> Delivered &amp; Settled
                    </span>
                  ) : ['cancelled', 'returned'].includes(order.status) ? (
                    <span
                      className="badge bg-secondary-subtle text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1"
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 700 }}
                    >
                      <i className="ri-close-circle-line" /> Order Finalized
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setActiveReceiptModal('reassign')}
                        className="btn btn-sm btn-outline-warning fw-bold px-2 py-1"
                        style={{ fontSize: 11, borderRadius: 8 }}
                        title="Reassign to another driver"
                      >
                        <i className="ri-user-follow-line me-1" />
                        {order.driver ? 'Reassign' : 'Assign Courier'}
                      </button>
                      {order.driver && (
                        <button
                          type="button"
                          onClick={handleUnassignDriver}
                          disabled={actionLoading}
                          className="btn btn-sm btn-outline-danger fw-bold px-2 py-1"
                          style={{ fontSize: 11, borderRadius: 8 }}
                          title="Unassign courier from order"
                        >
                          <i className="ri-user-unfollow-line me-1" />
                          Unassign
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {order.driver ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: '#059669',
                          color: '#FFFFFF',
                          fontSize: 16,
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        {getInitials(order.driver.name)}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: -3,
                            right: -3,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '2px solid #FFFFFF',
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{order.driver.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span>📞 {order.driver.phone}</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{order.driver.bike}</span>
                        </div>
                      </div>
                    </div>

                    {onOpenChat && order.driver?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose && onClose()
                          onOpenChat(order.driver.id)
                        }}
                        className="btn btn-sm btn-success fw-bold px-3 py-1.5"
                        style={{ borderRadius: 8, fontSize: 11 }}
                      >
                        💬 Courier Chat
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>
                      ⚠️ No courier dispatched yet. Order is awaiting assignment.
                    </div>
                    {!['delivered', 'completed', 'cancelled', 'returned'].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => setActiveReceiptModal('reassign')}
                        className="btn btn-sm btn-warning fw-bold px-3 py-1"
                        style={{ fontSize: 11, borderRadius: 8 }}
                      >
                        + Assign Courier Now
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: Order Goods & Itemized Manifest */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {(() => {
                  const items = order.items || []
                  const previewLimit = 4
                  const hasMore = items.length > previewLimit
                  const visibleItems = hasMore && !expandModalItems ? items.slice(0, previewLimit) : items

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📦 Order Goods Manifest ({items.length})</span>
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
                              <tr style={{ fontSize: 11, color: '#64748B' }}>
                                <th>PRODUCT ITEM</th>
                                <th>QTY</th>
                                <th>UNIT PRICE</th>
                                <th className="text-end">SUBTOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleItems.map((it, idx) => (
                                <tr key={it.id || idx}>
                                  <td>
                                    <div className="fw-bold small" style={{ color: '#0F172A' }}>{it.name}</div>
                                    {it.sku && <div className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>SKU: {it.sku}</div>}
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

                {/* Subtotal & Gross Financials */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                    <span>Goods Subtotal:</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{fmt(calcSub(order.items) || order.total)}</span>
                  </div>
                  {order.deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                      <span>Logistics &amp; Delivery Fee:</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{fmt(order.deliveryFee)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Total Gross Settlement</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{fmt(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Proof of Delivery (POD) & Handover Confirmation */}
              {Boolean(
                order.proof_photo ||
                (Array.isArray(order.proof_photos) && order.proof_photos.length > 0) ||
                (Array.isArray(order.item_proofs) && order.item_proofs.length > 0) ||
                order.deliveryNotes ||
                order.proof_note ||
                order.status === 'delivered'
              ) && (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '20px 22px',
                    border: '1px solid #A7F3D0',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ECFDF5', paddingBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ri-camera-lens-line fs-16 text-success" />
                      Proof of Delivery (Handover Confirmed)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label
                        className="btn btn-sm btn-outline-success fw-bold px-2.5 py-1"
                        style={{ fontSize: 11, borderRadius: 8, cursor: 'pointer', margin: 0 }}
                        title="Upload/Attach delivery confirmation photo"
                      >
                        <i className="ri-upload-cloud-line me-1" />
                        {uploadingProof ? 'Uploading…' : 'Attach Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleUploadProofPhoto}
                          disabled={uploadingProof}
                        />
                      </label>
                      <span className="badge bg-success text-white" style={{ fontSize: 10, padding: '4px 8px', borderRadius: 20 }}>
                        <i className="ri-checkbox-circle-line me-1" />
                        Courier Snapped
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const rawPhotos = [
                      order.proof_photo,
                      ...(Array.isArray(order.proof_photos) ? order.proof_photos : []),
                      ...(Array.isArray(order.item_proofs) ? order.item_proofs.map(p => typeof p === 'string' ? p : p?.photo_url || p?.url) : []),
                    ].filter(Boolean)

                    const uniquePhotos = Array.from(new Set(rawPhotos))
                    if (uniquePhotos.length === 0) {
                      return (
                        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', border: '1px dashed #CBD5E1', textAlign: 'center' }}>
                          <i className="ri-image-line fs-24 text-muted" style={{ display: 'block', marginBottom: 4 }} />
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>No Delivery Picture Attached Yet</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            The driver completed handover with a note. Click <strong>Attach Photo</strong> above to upload confirmation proof.
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Verified Delivery Snapshots ({uniquePhotos.length} {uniquePhotos.length === 1 ? 'Photo' : 'Photos'}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {uniquePhotos.map((url, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => setActivePhotoModal({ url, index: pIdx + 1, total: uniquePhotos.length })}
                              style={{
                                width: 150,
                                height: 150,
                                borderRadius: 14,
                                overflow: 'hidden',
                                border: '2px solid #10B981',
                                position: 'relative',
                                cursor: 'pointer',
                                boxShadow: '0 6px 14px rgba(16, 185, 129, 0.15)',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.3)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(16, 185, 129, 0.15)'
                              }}
                              title="Click to inspect full photo in high-definition Lightbox viewer"
                            >
                              <img
                                src={url}
                                alt={`Delivery Confirmation Proof ${pIdx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  if (url.includes('/uploads/proofs/')) {
                                    const pathOnly = url.substring(url.indexOf('/uploads/proofs/'))
                                    if (e.currentTarget.src !== window.location.origin + pathOnly) {
                                      e.currentTarget.src = pathOnly
                                    }
                                  }
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  background: 'rgba(5, 150, 105, 0.95)',
                                  color: '#FFFFFF',
                                  borderRadius: '50%',
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                }}
                              >
                                ✓
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  color: '#FFFFFF',
                                  textAlign: 'center',
                                  padding: '8px 4px 6px',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5,
                                }}
                              >
                                <i className="ri-zoom-in-line" /> Inspect Photo #{pIdx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {(order.deliveryNotes || order.proof_note) && (
                    <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COURIER HANDOVER NOTE:</div>
                      <div style={{ color: '#0F172A', marginTop: 3, fontWeight: 600 }}>{order.deliveryNotes || order.proof_note}</div>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#64748B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                    <span>Delivered by: <strong>{order.driver?.name || 'Assigned Courier'}</strong> ({order.driver?.phone || 'No Phone'})</span>
                    {order.deliveredAt && (
                      <span>Time: <strong style={{ color: '#059669' }}>{safeFormatDate(order.deliveredAt, '')}</strong></span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Column: Interactive Map, Timeline & Action Shortcuts ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card 1: Interactive Location & Route Map */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '18px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📍 Order Location &amp; Dispatch Map
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenFleetMap) onOpenFleetMap(order)
                      else if (onClose) onClose()
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#2563EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>Full Screen ↗</span>
                  </button>
                </div>
                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <AdminOrderMap order={order} height="220px" />
                </div>
              </div>

              {/* Card 2: Status & Tracking Audit Log */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                  <i className="ri-history-line text-primary fs-16" />
                  Status &amp; Tracking Audit Log
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: '#E2E8F0', zIndex: 0 }} />
                  {order.timeline && order.timeline.map((ev, i) => {
                    const c = getStatusCfg(ev.status)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, position: 'relative', zIndex: 1 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: c?.bg || '#F1F5F9',
                            border: `2px solid ${c?.color || '#CBD5E1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <i className={c?.icon || 'ri-circle-line'} style={{ color: c?.color || '#64748B', fontSize: 12 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{c?.label || ev.status}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{ev.time} · {ev.by || 'System'}</div>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{ev.note}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Card 3: Quick Dispatch Actions */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                  <i className="ri-flashlight-line text-warning fs-16" />
                  Order Dispatch &amp; Fulfillment Actions
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {order.status === 'cancelled' && (
                    <div className="alert alert-secondary py-2 small mb-0 d-flex align-items-center gap-2" style={{ borderRadius: 10 }}>
                      <i className="ri-close-circle-line fs-5 text-danger" />
                      <div>
                        <div className="fw-bold text-danger">Order Cancelled</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>No further processing or dispatch actions are permitted.</div>
                      </div>
                    </div>
                  )}

                  {order.status === 'paid' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        if (onAction) onAction('process', order)
                        else handleUpdateStatus('processing', 'Packaging & Picking')
                      }}
                    >
                      <i className="ri-play-circle-line me-1" />
                      Process Order (Picking)
                    </button>
                  )}

                  {['processing', 'packaging'].includes(order.status) && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        if (onAction) onAction('pack', order)
                        else handleUpdateStatus('packed_ready', 'Packed & Ready')
                      }}
                    >
                      <i className="ri-archive-line me-1" />
                      Confirm Packed &amp; Ready
                    </button>
                  )}

                  {['packed', 'packed_ready'].includes(order.status) && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        if (onAction) onAction('assign', order)
                        else setActiveReceiptModal('reassign')
                      }}
                    >
                      <i className="ri-user-add-line me-1" />
                      Assign Delivery Driver
                    </button>
                  )}

                  {['delivered', 'completed'].includes(order.status) && (
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065F46', fontWeight: 800, fontSize: 13 }}>
                        <i className="ri-checkbox-circle-fill text-success fs-18" />
                        Order Fulfillment Complete
                      </div>
                      <div style={{ fontSize: 11, color: '#047857', lineHeight: 1.5 }}>
                        This order has been verified and delivered to the recipient. Driver handover, ledger entries, and payout commissions are complete.
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setActiveReceiptModal('receipt')}
                          className="btn btn-sm btn-outline-success fw-bold px-3 py-1.5 flex-fill"
                          style={{ borderRadius: 8, fontSize: 11 }}
                        >
                          <i className="ri-receipt-line me-1" /> Customer Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReceiptModal('invoice')}
                          className="btn btn-sm btn-outline-secondary fw-bold px-3 py-1.5 flex-fill"
                          style={{ borderRadius: 8, fontSize: 11 }}
                        >
                          <i className="ri-printer-line me-1" /> Packing Invoice
                        </button>
                      </div>
                    </div>
                  )}

                  {['assigned', 'shipped', 'driver_arrived', 'arrived', 'delivery_attempted'].includes(order.status) && order.driver && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        if (onAction) onAction('assign', order)
                        else setActiveReceiptModal('reassign')
                      }}
                    >
                      <i className="ri-user-follow-line me-1" />
                      Reassign Driver
                    </button>
                  )}

                  {['in_transit', 'out_for_delivery', 'shipped', 'driver_arrived', 'arrived'].includes(order.status) && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => handleUpdateStatus('delivered', 'Delivered')}
                    >
                      <i className="ri-checkbox-circle-line me-1" />
                      Mark Order as Delivered
                    </button>
                  )}

                  {order.status === 'dispute' && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => onAction && onAction('dispute', order)}
                    >
                      <i className="ri-shield-check-line me-1" />
                      Resolve Dispute
                    </button>
                  )}

                  {['paid', 'processing', 'packed', 'assigned'].includes(order.status) && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm fw-bold py-2"
                      style={{ borderRadius: 10 }}
                      onClick={() => {
                        if (onAction) onAction('cancel', order)
                        else if (window.confirm(`Are you sure you want to cancel order #${order.id}?`)) {
                          handleUpdateStatus('cancelled', 'Cancelled')
                        }
                      }}
                    >
                      <i className="ri-close-circle-line me-1" />
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom Bar ── */}
        <div
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (onOpenFleetMap) onOpenFleetMap(order)
                else if (onClose) onClose()
              }}
              className="btn btn-sm btn-outline-primary fw-bold"
              style={{ borderRadius: 8, fontSize: 11 }}
            >
              <i className="ri-map-pin-2-line me-1" />
              Live Fleet Map
            </button>
            <button
              type="button"
              onClick={() => setActiveReceiptModal('invoice')}
              className="btn btn-sm btn-outline-success fw-bold"
              style={{ borderRadius: 8, fontSize: 11 }}
            >
              <i className="ri-file-text-line me-1" />
              Reprint Invoice
            </button>
            <button
              type="button"
              onClick={() => setActiveReceiptModal('receipt')}
              className="btn btn-sm btn-outline-secondary fw-bold"
              style={{ borderRadius: 8, fontSize: 11 }}
            >
              <i className="ri-printer-line me-1" />
              Customer Receipt
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Order Value: <strong style={{ fontSize: 16, color: '#059669', marginLeft: 4 }}>{fmt(order.total)}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-danger fw-bold px-3 py-1.5"
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              ✕ Close Dossier
            </button>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom d-print-none">
              <div>
                <h6 className="mb-0 fw-bold">📄 Warehouse Invoice &amp; Packing List</h6>
                <span className="text-muted" style={{ fontSize: 11 }}>Official Picking &amp; Delivery Slip</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-success fw-bold" onClick={handlePrint}>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
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
                style={{ borderRadius: 8, padding: '8px 12px' }}
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
                style={{ borderRadius: 8 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary fw-bold"
                disabled={!reassignDriverId || actionLoading}
                onClick={handleReassignDriver}
                style={{ borderRadius: 8 }}
              >
                {actionLoading ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submodal 4: High-Definition Delivery Proof Photo Lightbox ── */}
      {activePhotoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setActivePhotoModal(null)}
        >
          <div
            style={{
              background: '#0F172A',
              borderRadius: 20,
              maxWidth: 780,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid #1E293B',
                background: '#1E293B',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge bg-success" style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20 }}>
                  <i className="ri-shield-check-line me-1" /> Verified Proof of Delivery
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                  Photo {activePhotoModal.index} of {activePhotoModal.total}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={activePhotoModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light"
                  style={{ fontSize: 11, borderRadius: 8, padding: '4px 10px' }}
                  title="Open original file in new tab"
                >
                  <i className="ri-external-link-line me-1" /> Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  className="btn btn-sm btn-outline-secondary text-white"
                  style={{ borderRadius: 8 }}
                >
                  <i className="ri-close-line fs-16" />
                </button>
              </div>
            </div>

            {/* Photo Container */}
            <div
              style={{
                background: '#020617',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 380,
                maxHeight: '65vh',
                overflow: 'hidden',
              }}
            >
              <img
                src={activePhotoModal.url}
                alt="Delivery Proof"
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Footer with Courier Metadata */}
            <div style={{ padding: '14px 20px', background: '#0F172A', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                <div>Delivered by: <strong style={{ color: '#F1F5F9' }}>{order.driver?.name || 'Assigned Courier'}</strong> ({order.driver?.phone || 'No phone'})</div>
                {(order.deliveryNotes || order.proof_note) && (
                  <div style={{ marginTop: 2, color: '#CBD5E1' }}>Handover Note: <em>"{order.deliveryNotes || order.proof_note}"</em></div>
                )}
              </div>
              {order.deliveredAt && (
                <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>
                  <i className="ri-time-line me-1" />
                  {safeFormatDate(order.deliveredAt, '')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
