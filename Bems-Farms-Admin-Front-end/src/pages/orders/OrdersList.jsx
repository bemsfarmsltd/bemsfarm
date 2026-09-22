import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ThermalReceipt, { printThermalReceipt } from '../../components/ui/ThermalReceipt'
import AdminOrderMap from '../../components/ui/AdminOrderMap'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  paid:               { label: 'New Order',          color: '#0ea5e9', bg: '#e0f2fe', icon: 'ri-money-dollar-circle-line' },
  new_order:          { label: 'New Order',          color: '#0ea5e9', bg: '#e0f2fe', icon: 'ri-money-dollar-circle-line' },
  pending:            { label: 'New Order',          color: '#0ea5e9', bg: '#e0f2fe', icon: 'ri-money-dollar-circle-line' },
  confirmed:          { label: 'Confirmed',          color: '#0284c7', bg: '#e0f2fe', icon: 'ri-checkbox-circle-line'     },
  processing:         { label: 'Processing',         color: '#d97706', bg: '#fef3c7', icon: 'ri-loader-line'              },
  packed:             { label: 'Packed & Ready',     color: '#7c3aed', bg: '#ede9fe', icon: 'ri-archive-line'             },
  packed_ready:       { label: 'Packed & Ready',     color: '#7c3aed', bg: '#ede9fe', icon: 'ri-archive-line'             },
  assigned:           { label: 'Driver Assigned',    color: '#0891b2', bg: '#cffafe', icon: 'ri-user-location-line'       },
  driver_assigned:    { label: 'Driver Assigned',    color: '#0891b2', bg: '#cffafe', icon: 'ri-user-location-line'       },
  shipped:            { label: 'Out for Delivery',   color: '#2563eb', bg: '#dbeafe', icon: 'ri-truck-line'               },
  out_for_delivery:   { label: 'Out for Delivery',   color: '#2563eb', bg: '#dbeafe', icon: 'ri-truck-line'               },
  delivery_attempted: { label: 'Delivery Attempted', color: '#ea580c', bg: '#ffedd5', icon: 'ri-route-line'               },
  delivered:          { label: 'Delivered',          color: '#16a34a', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'     },
  completed:          { label: 'Delivered',          color: '#16a34a', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'     },
  dispute:            { label: 'Dispute',            color: '#dc2626', bg: '#fee2e2', icon: 'ri-alert-line'               },
  cancelled:          { label: 'Cancelled',          color: '#4b5563', bg: '#f3f4f6', icon: 'ri-close-circle-line'        },
  refunded:           { label: 'Refunded',           color: '#4b5563', bg: '#f3f4f6', icon: 'ri-refund-2-line'            },
  failed:             { label: 'Failed',             color: '#dc2626', bg: '#fee2e2', icon: 'ri-close-circle-line'        },
}

const DEFAULT_STATUS_CFG = { label: 'Order Placed', color: '#0ea5e9', bg: '#e0f2fe', icon: 'ri-shopping-bag-3-line' }
const getStatusCfg = (status) => (status && STATUS_CFG[String(status).toLowerCase()]) || DEFAULT_STATUS_CFG

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

const DEFAULT_CHANNEL_CFG = { label: 'Online', icon: 'ri-global-line', color: '#2563eb', badgeClass: 'bg-primary-subtle text-primary' }
const getChannelCfg = (channel) => (channel && CHANNEL_CFG[String(channel).toLowerCase()]) || DEFAULT_CHANNEL_CFG

// Distinct status tabs (prevents duplicate labels)
const ORDER_STATUS_TABS = [
  { key: 'all',                label: 'All Orders' },
  { key: 'paid',               label: 'New Orders',         statuses: ['paid', 'new_order', 'pending'] },
  { key: 'confirmed',          label: 'Confirmed',          statuses: ['confirmed'] },
  { key: 'processing',         label: 'Processing',         statuses: ['processing'] },
  { key: 'packed',             label: 'Packed & Ready',     statuses: ['packed', 'packed_ready'] },
  { key: 'assigned',           label: 'Driver Assigned',    statuses: ['assigned', 'driver_assigned'] },
  { key: 'shipped',            label: 'Out for Delivery',   statuses: ['shipped', 'out_for_delivery'] },
  { key: 'delivery_attempted', label: 'Delivery Attempted', statuses: ['delivery_attempted'] },
  { key: 'delivered',          label: 'Delivered',          statuses: ['delivered', 'completed'] },
  { key: 'dispute',            label: 'Disputes',           statuses: ['dispute'] },
  { key: 'cancelled',          label: 'Cancelled',          statuses: ['cancelled', 'refunded', 'failed'] },
]

const PIPELINE = ['paid', 'processing', 'packed', 'assigned', 'shipped', 'delivered']
const pipelineIdx = (s) => (['delivery_attempted'].includes(s) ? PIPELINE.indexOf('shipped') : PIPELINE.indexOf(s))

const fmt = (n) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const calcSub = (items = []) => items.reduce((s, i) => s + (Number(i.total) || (Number(i.price || 0) * Number(i.qty || 1))), 0)
const safeFormatDate = (d, fallback = '—') => {
  if (!d) return fallback
  const date = new Date(d)
  return isNaN(date.getTime()) ? fallback : date.toISOString().replace('T', ' ').slice(0, 16)
}

const getPaymentBadge = (method, source, id) => {
  const m = String(method || '').toLowerCase().trim()
  const s = String(source || '').toLowerCase().trim()
  const orderId = String(id || '')
  if (m.includes('monnify')) return { label: 'Monnify', icon: 'ri-bank-card-line', color: '#0284c7', bg: '#e0f2fe' }
  if (m.includes('transfer') || m.includes('bank')) return { label: 'Bank Transfer', icon: 'ri-exchange-funds-line', color: '#0d9488', bg: '#ccfbf1' }
  if (m.includes('wallet')) return { label: 'Wallet Escrow', icon: 'ri-wallet-3-line', color: '#7c3aed', bg: '#ede9fe' }
  if (m.includes('card')) return { label: 'Debit Card', icon: 'ri-bank-card-2-line', color: '#2563eb', bg: '#dbeafe' }
  if (m.includes('cash')) return { label: 'Cash', icon: 'ri-money-dollar-circle-line', color: '#16a34a', bg: '#dcfce7' }
  if (m.includes('pos') || orderId.startsWith('POS-') || s.includes('pos')) return { label: 'POS Terminal', icon: 'ri-calculator-line', color: '#d97706', bg: '#fef3c7' }
  if (m.includes('paystack')) return { label: 'Paystack', icon: 'ri-secure-payment-line', color: '#059669', bg: '#dcfce7' }
  return { label: method ? method.toUpperCase() : (s.includes('pos') ? 'POS Terminal' : 'Online Payment'), icon: 'ri-bank-card-line', color: '#64748b', bg: '#f1f5f9' }
}

export default function OrdersList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const [orders, setOrders]             = useState([])
  const [drivers, setDrivers]           = useState([])
  const [staffList, setStaffList]       = useState([])
  const [serverStats, setServerStats]   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all')
  const [filterChannel, setFilterChannel] = useState(searchParams.get('channel') || 'orders')
  const [filterFulfillment, setFilterFulfillment] = useState(searchParams.get('fulfillment') || 'all')

  // Modals & selection
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)

  // Modal form inputs
  const [pickingStaff, setPickingStaff]     = useState('')
  const [assignDriverId, setAssignDriverId] = useState('')
  const [disputeDecision, setDisputeDecision] = useState('')
  const [disputeNote, setDisputeNote]       = useState('')
  const [disputeAmount, setDisputeAmount]   = useState('')
  const [cancelReason, setCancelReason]     = useState('')
  const [rescheduleNote, setRescheduleNote] = useState('')
  const [assignType, setAssignType]         = useState('initial')

  const receiptRef = useRef(null)

  // Sync URL search params
  useEffect(() => {
    const qStatus = searchParams.get('status')
    if (qStatus && qStatus !== filterStatus) {
      setFilterStatus(qStatus)
    }
    const qChannel = searchParams.get('channel')
    if (qChannel && qChannel !== filterChannel) {
      setFilterChannel(qChannel)
    }
  }, [searchParams])

  // ─── Fetch live orders from backend ─────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/orders?limit=200')
      if (res.data?.orders) {
        const mapped = res.data.orders.map((o) => {
          let parsedStatus = (o.status || 'paid').toLowerCase().trim()
          if (parsedStatus === 'pending' || parsedStatus === 'new_order') parsedStatus = 'paid'
          if (parsedStatus === 'packed_ready') parsedStatus = 'packed'
          if (parsedStatus === 'driver_assigned') parsedStatus = 'assigned'
          if (parsedStatus === 'out_for_delivery') parsedStatus = 'shipped'
          if (parsedStatus === 'completed') parsedStatus = 'delivered'

          let channelKey = 'online'
          const src = (o.channel || o.source || '').toLowerCase().trim()
          const orderIdStr = String(o.id || '')
          if (src.includes('chef') || src.includes('ai')) {
            channelKey = 'chef_bems'
          } else if (src.includes('mobile') || src.includes('app')) {
            channelKey = 'mobile_app'
          } else if (src.includes('pos') || src.includes('counter') || orderIdStr.startsWith('POS-') || (src.includes('physical') && !src.includes('storefront'))) {
            channelKey = 'physical'
          } else if (src.includes('storefront') || src.includes('web') || src.includes('online')) {
            channelKey = 'online'
          }

          // Real item parsing
          let orderItems = []
          if (Array.isArray(o.items) && o.items.length > 0) {
            orderItems = o.items.map((it, idx) => ({
              id: it.id || idx + 1,
              name: it.name || it.product_name || 'Item',
              sku: it.sku || '',
              qty: Number(it.quantity || it.qty || 1),
              unit: it.unit || 'pcs',
              price: parseFloat(it.unit_price || it.price || 0),
              total: parseFloat(it.total || it.subtotal || ((it.quantity || it.qty || 1) * (it.unit_price || it.price || 0))),
            }))
          } else if (o.item_names && String(o.item_names).trim()) {
            orderItems = o.item_names.split(',').map((name, idx) => ({
              id: idx + 1,
              name: name.trim(),
              sku: '',
              qty: 1,
              unit: 'item',
              price: 0,
              total: 0,
            }))
          }

          const deliveryFee = parseFloat(o.delivery_fee) || 0
          const computedTotal = parseFloat(o.total) || (calcSub(orderItems) + deliveryFee)

          // Delivery vs in-store detection
          const isPhysical = channelKey === 'physical'
          const hasDeliveryAddress = !!(o.address && o.address.trim().length > 3 && !isPhysical)
          const fulfillmentType = hasDeliveryAddress ? 'delivery' : (isPhysical ? 'in_store' : 'pickup')

          const customerName = o.customer_name && o.customer_name !== 'Walk-in' && o.customer_name !== 'null'
            ? o.customer_name
            : (isPhysical ? 'Walk-in Customer' : 'Online Customer')

          return {
            id: String(o.id),
            date: safeFormatDate(o.created_at, '—'),
            channel: channelKey,
            rawChannel: o.channel || o.source,
            status: parsedStatus,
            rawStatus: o.status,
            fulfillmentType,
            customer: {
              name: customerName,
              phone: o.customer_phone || '',
              email: o.customer_email || '',
              address: o.address ? `${o.address}${o.delivery_city ? `, ${o.delivery_city}` : ''}` : (isPhysical ? 'In-Store POS Counter' : 'Store Pickup / Abia State'),
            },
            items: orderItems,
            itemCount: Number(o.item_count) || orderItems.length,
            deliveryFee,
            total: computedTotal,
            payment: o.payment_method || (isPhysical ? 'cash' : 'monnify'),
            paymentRef: o.payment_ref || null,
            notes: o.notes || '',
            disputeReason: o.dispute_reason || null,
            disputeNote: o.dispute_notes || o.dispute_note || null,
            cancelReason: o.cancel_reason || null,
            driver: o.driver_name ? { id: o.driver_id, name: o.driver_name, phone: o.driver_phone, bike: o.driver_plate || 'Vehicle', active: true } : null,
            attempts: o.attempts || 0,
            timeline: [
              { status: parsedStatus, time: safeFormatDate(o.created_at, ''), note: `Order placed via ${getChannelCfg(channelKey).label}`, by: 'System' }
            ]
          }
        })
        setOrders(mapped)
        if (res.data.stats) {
          setServerStats(res.data.stats)
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
      toast.error('Unable to fetch live orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load auxiliary form data: Drivers & Staff
  useEffect(() => {
    async function loadFormData() {
      try {
        const [driversRes, staffRes] = await Promise.allSettled([
          api.get('/admin/orders/form-data/drivers'),
          api.get('/admin/orders/form-data/staff'),
        ])
        if (driversRes.status === 'fulfilled' && driversRes.value?.data?.drivers) {
          setDrivers(driversRes.value.data.drivers.map((d) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            bike: d.vehicle_plate || d.vehicle_type || 'Vehicle',
            active: d.status !== 'inactive',
          })))
        }
        if (staffRes.status === 'fulfilled' && staffRes.value?.data?.staff) {
          setStaffList(staffRes.value.data.staff)
          if (staffRes.value.data.staff.length > 0) {
            setPickingStaff(staffRes.value.data.staff[0])
          }
        }
      } catch (err) {
        console.warn('Form data loading notice:', err.message)
      }
    }

    fetchOrders()
    loadFormData()
  }, [fetchOrders])

  // Open modal with detail enrichment
  const openModal = async (type, order, meta = {}) => {
    setSelected(order)
    setActiveModal(type)
    setAssignDriverId('')
    setDisputeDecision('')
    setDisputeNote('')
    setDisputeAmount('')
    setCancelReason('')
    setRescheduleNote('')
    if (staffList.length > 0) setPickingStaff(staffList[0])
    if (type === 'assign') setAssignType(meta.assignType || 'initial')

    // If viewing or printing, fetch full order timeline & items from GET /admin/orders/:id
    if (type === 'view' || type === 'receipt') {
      try {
        setDetailLoading(true)
        const targetId = order.id || order.order_ref
        const res = await api.get(`/admin/orders/${targetId}`)
        if (res.data) {
          const d = res.data
          setSelected((prev) => {
            if (!prev || (prev.id !== order.id && prev.order_ref !== order.id)) return prev
            return {
              ...prev,
              ...d,
              items: (d.items && d.items.length)
                ? d.items.map((it, i) => ({
                    id: it.id || i + 1,
                    name: it.name || it.product_name || 'Item',
                    sku: it.sku || '',
                    qty: Number(it.quantity || it.qty || 1),
                    unit: it.unit || 'pcs',
                    price: parseFloat(it.unit_price || it.price || 0),
                    total: parseFloat(it.subtotal || ((it.quantity || it.qty || 1) * (it.unit_price || it.price || 0))),
                  }))
                : prev.items,
              timeline: (d.timeline && d.timeline.length)
                ? d.timeline.map((t) => ({
                    status: t.to_status || t.status || 'updated',
                    time: safeFormatDate(t.created_at, ''),
                    note: t.notes || `Status changed to ${t.to_status || t.status}`,
                    by: t.changed_by_name || 'Admin',
                  }))
                : prev.timeline,
            }
          })
        }
      } catch (err) {
        console.warn('Could not fetch deep order detail:', err.message)
      } finally {
        setDetailLoading(false)
      }
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelected(null)
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (serverStats) {
      return {
        total:             Number(serverStats.total || 0),
        newOrders:         Number(serverStats.new_orders || 0),
        inProgress:        Number(serverStats.in_progress || 0),
        outForDelivery:    Number(serverStats.out_for_delivery || 0),
        deliveryAttempted: Number(serverStats.delivery_attempted || 0),
        delivered:         Number(serverStats.delivered || 0),
        disputes:          Number(serverStats.disputes || 0),
        revenue:           Number(serverStats.revenue || 0),
      }
    }
    return {
      total:             orders.length,
      newOrders:         orders.filter(o => ['paid', 'new_order', 'pending', 'confirmed'].includes(o.status)).length,
      inProgress:        orders.filter(o => ['processing', 'packed', 'assigned', 'packed_ready', 'driver_assigned'].includes(o.status)).length,
      outForDelivery:    orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.status)).length,
      deliveryAttempted: orders.filter(o => o.status === 'delivery_attempted').length,
      delivered:         orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
      disputes:          orders.filter(o => o.status === 'dispute').length,
      revenue:           orders.filter(o => ['delivered', 'completed'].includes(o.status)).reduce((s, o) => s + (Number(o.total) || 0), 0),
    }
  }, [orders, serverStats])

  // ─── Filtered orders list ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const activeTabObj = ORDER_STATUS_TABS.find(t => t.key === filterStatus)

    return orders
      .filter((o) => {
        // Status filter
        let okStatus = true
        if (filterStatus !== 'all') {
          if (activeTabObj?.statuses) {
            okStatus = activeTabObj.statuses.includes(o.status)
          } else {
            okStatus = o.status === filterStatus
          }
        }

        // Channel filter
        let okChannel = true
        if (filterChannel === 'orders') {
          okChannel = o.channel !== 'physical' && !String(o.id).startsWith('POS-')
        } else if (filterChannel !== 'all') {
          okChannel = o.channel === filterChannel
        }

        // Fulfillment sub-category filter
        let okFulfillment = true
        if (filterFulfillment === 'delivery') {
          okFulfillment = o.fulfillmentType === 'delivery'
        } else if (filterFulfillment === 'pickup') {
          okFulfillment = o.fulfillmentType === 'pickup'
        }

        // Search filter
        const okSearch =
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.phone?.includes(q) ||
          (o.items && o.items.some(i => i.name.toLowerCase().includes(q)))

        return okStatus && okChannel && okFulfillment && okSearch
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [orders, search, filterStatus, filterChannel, filterFulfillment])

  // ─── Operational Mutations (Connected to Endpoints) ─────────────────────────

  const processOrder = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/status`, {
        status: 'processing',
        picking_staff: pickingStaff,
        notes: `Order moved to picking queue. Staff: ${pickingStaff || 'Warehouse Team'}`
      })
      toast.success(`Order ${selected.id} set to Processing`)
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status')
    } finally {
      setActionLoading(false)
    }
  }

  const markPacked = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/status`, {
        status: 'packed_ready',
        picking_staff: pickingStaff,
        notes: `Items packed and labelled. Ready for driver. Staff: ${pickingStaff || 'Packer'}`
      })
      toast.success(`Order ${selected.id} marked as Packed & Ready`)
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark order as packed')
    } finally {
      setActionLoading(false)
    }
  }

  const assignDriver = async () => {
    if (!assignDriverId || !selected) return
    setActionLoading(true)
    const driver = drivers.find(d => String(d.id) === String(assignDriverId))
    try {
      await api.patch(`/admin/orders/${selected.id}/assign-driver`, {
        driver_id: parseInt(assignDriverId),
        reassign: assignType === 'manual_reassign'
      })
      toast.success(`Driver ${driver?.name || ''} assigned to order ${selected.id}`)
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign driver')
    } finally {
      setActionLoading(false)
    }
  }

  const resolveDispute = async () => {
    if (!disputeDecision || !selected) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/resolve-dispute`, {
        decision: disputeDecision,
        notes: disputeNote,
        refund_amount: disputeAmount ? parseFloat(disputeAmount) : undefined
      })
      toast.success('Dispute resolved successfully')
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve dispute')
    } finally {
      setActionLoading(false)
    }
  }

  const cancelOrder = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/cancel`, {
        reason: cancelReason || 'Cancelled by Admin'
      })
      toast.success(`Order ${selected.id} cancelled`)
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order')
    } finally {
      setActionLoading(false)
    }
  }

  const rescheduleDelivery = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/orders/${selected.id}/reschedule`, {
        notes: rescheduleNote || 'Re-attempt scheduled by admin'
      })
      toast.success(`Delivery attempt rescheduled for ${selected.id}`)
      closeModal()
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule delivery')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = async () => {
    printThermalReceipt()
    if (selected?.id) {
      try {
        await api.post(`/admin/orders/${selected.id}/print-invoice`)
        toast.success(`Invoice printed. Order #${selected.id} moved to Packaging!`)
        fetchOrders()
      } catch (e) {
        console.warn('Invoice print tracking notification:', e.message)
      }
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">All Orders</h6>
          <small className="text-muted">Manage multi-channel order fulfillment, picking, driver dispatch, and receipts</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchOrders} title="Refresh orders">
            <i className={`ri-refresh-line me-1 ${loading ? 'ri-spin' : ''}`} />Refresh
          </button>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/orders">Orders</Link></li>
            <li className="breadcrumb-item active">All Orders</li>
          </ul>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Orders',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-shopping-bag-3-line',
            filter: 'all',
            subLeft: 'All Channels',
            subRight: `${stats.total} Orders`
          },
          {
            label: 'New & Paid',
            value: stats.newOrders,
            glow: 'bg-card-glow-cyan',
            iconBg: '#F0F9FF',
            iconColor: '#0284C7',
            icon: 'ri-money-dollar-circle-line',
            filter: 'paid',
            subLeft: 'Awaiting Fulfillment',
            subRight: `${stats.newOrders} New`
          },
          {
            label: 'In Picking / Pack',
            value: stats.inProgress,
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-loader-line',
            filter: 'processing',
            subLeft: 'Warehouse Queue',
            subRight: 'Processing'
          },
          {
            label: 'Out for Delivery',
            value: stats.outForDelivery,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-truck-line',
            filter: 'shipped',
            subLeft: 'Couriers En Route',
            subRight: `${stats.outForDelivery} Active`
          },
          {
            label: 'Delivery Attempted',
            value: stats.deliveryAttempted,
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-route-line',
            filter: 'delivery_attempted',
            subLeft: 'Customer Contacted',
            subRight: stats.deliveryAttempted > 0 ? `${stats.deliveryAttempted} Retry` : 'None'
          },
          {
            label: 'Delivered',
            value: stats.delivered,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            filter: 'delivered',
            subLeft: 'Successfully Handed Over',
            subRight: `${stats.delivered} Complete`
          },
          {
            label: 'Disputes / Issues',
            value: stats.disputes,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-alert-line',
            filter: 'dispute',
            subLeft: 'Requires Review',
            subRight: stats.disputes > 0 ? `${stats.disputes} Open` : 'Resolved'
          },
          {
            label: 'Total Revenue',
            value: fmt(stats.revenue),
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-bar-chart-2-line',
            filter: null,
            subLeft: 'Aggregate Value',
            subRight: 'Gross Sales'
          },
        ].map((c) => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-3">
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}
              style={{ cursor: c.filter ? 'pointer' : 'default' }}
              onClick={() => c.filter && setFilterStatus(c.filter)}
            >
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-22 fw-bolder text-dark mb-1 font-display text-truncate">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Main Filter & Category Bar */}
      <div className="card mb-3 shadow-sm border-0">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
            {/* Search Input */}
            <div className="input-group" style={{ maxWidth: 280 }}>
              <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted" /></span>
              <input
                className="form-control border-start-0 ps-0"
                placeholder="Order ref, customer, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Channel Sub-category Dropdown */}
            <select
              className="form-select"
              style={{ maxWidth: 220 }}
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
            >
              <option value="orders">Online & App Orders</option>
              <option value="online">Online Store</option>
              <option value="chef_bems">Chef Bems AI</option>
              <option value="mobile_app">Mobile App</option>
              <option value="physical">In-Store POS Purchases</option>
              <option value="all">All Channels & POS</option>
            </select>

            {(filterStatus !== 'all' || filterChannel !== 'orders' || search) && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setFilterStatus('all')
                  setFilterChannel('orders')
                  setSearch('')
                }}
              >
                <i className="ri-close-line me-1" />Reset Filters
              </button>
            )}

            <div className="text-muted small ms-auto">
              Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> orders
            </div>
          </div>
        </div>

        {/* Clean Status Tab Strip (No duplicate tabs) */}
        <div className="border-top px-3 bg-light-subtle" style={{ overflowX: 'auto' }}>
          <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
            {ORDER_STATUS_TABS.map((t) => {
              const count = t.key === 'all'
                ? orders.length
                : orders.filter((o) => t.statuses?.includes(o.status)).length

              const isActive = filterStatus === t.key
              return (
                <button
                  key={t.key}
                  className={`btn btn-sm border-0 rounded-0 py-2 px-3 d-inline-flex align-items-center gap-2 ${isActive ? 'fw-bold' : 'text-muted'}`}
                  style={{
                    borderBottom: isActive ? '2px solid #143C2D' : '2px solid transparent',
                    color: isActive ? '#143C2D' : '#6b7280',
                    background: 'transparent',
                  }}
                  onClick={() => setFilterStatus(t.key)}
                >
                  <span>{t.label}</span>
                  <span
                    className="badge rounded-pill"
                    style={{
                      fontSize: 10,
                      background: isActive ? '#143C2D' : '#e2e8f0',
                      color: isActive ? '#fff' : '#475569',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ minWidth: 150 }}>Order & Payment</th>
                <th style={{ minWidth: 120 }}>Date & Time</th>
                <th style={{ minWidth: 180 }}>Customer & Destination</th>
                <th style={{ minWidth: 140 }}>Channel / Type</th>
                <th style={{ minWidth: 200 }}>Items Breakdown</th>
                <th style={{ minWidth: 110 }}>Total Amount</th>
                <th style={{ minWidth: 140 }}>Courier / Driver</th>
                <th style={{ minWidth: 130 }}>Fulfillment Status</th>
                <th style={{ minWidth: 120 }} className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                    <span className="text-muted">Loading live orders...</span>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-5">
                    <i className="ri-inbox-line fs-2 d-block mb-2 text-muted" />
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}

              {filtered.map((order) => {
                const cfg   = getStatusCfg(order.status)
                const chCfg = getChannelCfg(order.channel)
                const payCfg = getPaymentBadge(order.payment, order.rawChannel, order.id)
                const isDelivery = order.fulfillmentType === 'delivery'

                return (
                  <tr key={order.id}>
                    <td>
                      <div
                        className="fw-bold text-primary font-monospace fs-13"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openModal('view', order)}
                        title="Click to view full order breakdown"
                      >
                        {order.id}
                      </div>
                      <div className="mt-1">
                        <span
                          className="badge d-inline-flex align-items-center gap-1 shadow-xs"
                          style={{
                            fontSize: 10,
                            background: payCfg.bg,
                            color: payCfg.color,
                            border: `1px solid ${payCfg.color}30`,
                            padding: '3px 7px',
                            borderRadius: 6
                          }}
                        >
                          <i className={payCfg.icon} style={{ fontSize: 11 }} />
                          <span>{payCfg.label}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark" style={{ fontSize: 12 }}>
                        {order.date.split(' ')[0]}
                      </div>
                      <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                        <i className="ri-time-line text-muted" style={{ fontSize: 11 }} />
                        <span>{order.date.split(' ')[1] || '12:00'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark" style={{ fontSize: 13 }}>
                        {order.customer.name}
                      </div>
                      {order.customer.phone && order.customer.phone !== '—' && (
                        <div className="text-muted d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: 11 }}>
                          <i className="ri-phone-line text-primary" style={{ fontSize: 11 }} />
                          <span>{order.customer.phone}</span>
                        </div>
                      )}
                      <div className="text-muted text-truncate d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: 11, maxWidth: 190 }} title={order.customer.address}>
                        <i className={`ri-${isDelivery ? 'map-pin-2-fill text-success' : 'store-line text-secondary'}`} style={{ fontSize: 11 }} />
                        <span className="text-truncate">{order.customer.address}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`badge rounded-pill ${chCfg.badgeClass || ''}`} style={{ fontSize: 11, padding: '4px 9px' }}>
                          <i className={`${chCfg.icon} me-1`} />{chCfg.label}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className={`badge ${isDelivery ? 'bg-light text-success border border-success-subtle' : (order.channel === 'physical' ? 'bg-light text-warning-emphasis border border-warning-subtle' : 'bg-light text-secondary border')}`} style={{ fontSize: 10 }}>
                          <i className={`ri-${isDelivery ? 'e-bike-2-line' : (order.channel === 'physical' ? 'store-2-line' : 'building-2-line')} me-1`} />
                          {isDelivery ? 'Doorstep Delivery' : (order.channel === 'physical' ? 'In-Store POS Sale' : 'Online Store Pickup')}
                        </span>
                      </div>
                    </td>
                    <td>
                      {order.items.length > 0 ? (
                        <>
                          <div className="fw-semibold text-dark d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                            <span className="badge bg-secondary-subtle text-secondary px-1.5 py-0.5" style={{ fontSize: 10 }}>
                              {order.itemCount} Item{order.itemCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-muted text-truncate mt-0.5" style={{ fontSize: 11, maxWidth: 220 }} title={order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}>
                            {order.items.slice(0, 2).map((i) => `${i.qty}x ${i.name}`).join(', ')}
                            {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted fst-italic" style={{ fontSize: 12 }}>Direct POS Sale</span>
                      )}
                    </td>
                    <td>
                      <div className="fw-bolder text-dark" style={{ fontSize: 13 }}>{fmt(order.total)}</div>
                      {order.deliveryFee > 0 && (
                        <div className="text-muted" style={{ fontSize: 10 }}>
                          +{fmt(order.deliveryFee)} delivery
                        </div>
                      )}
                    </td>
                    <td>
                      {order.driver ? (
                        <div>
                          <div style={{ fontSize: 12 }} className="fw-semibold text-dark d-flex align-items-center gap-1">
                            <i className="ri-user-star-line text-primary" style={{ fontSize: 12 }} />
                            <span>{order.driver.name}</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: 10 }}>{order.driver.phone}</div>
                          {order.driver.bike && (
                            <div className="text-muted font-monospace" style={{ fontSize: 9 }}>{order.driver.bike}</div>
                          )}
                        </div>
                      ) : order.status === 'cancelled' ? (
                        <span className="text-muted" style={{ fontSize: 11 }}>— (Cancelled)</span>
                      ) : isDelivery ? (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: 10 }}>
                          <i className="ri-truck-line me-1" />Awaiting Courier
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 11 }}>— (In-Store POS)</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: order.channel === 'physical' ? '#ECFDF5' : cfg.bg, color: order.channel === 'physical' ? '#059669' : cfg.color, fontSize: 11, padding: '4px 8px', borderRadius: 6 }}>
                        <i className={`${order.channel === 'physical' ? 'ri-checkbox-circle-line' : cfg.icon} me-1`} />
                        {order.channel === 'physical' ? 'Completed Sale' : cfg.label}
                      </span>
                      {order.status === 'delivery_attempted' && (
                        <div className="text-danger fw-medium mt-0.5" style={{ fontSize: 10 }}>Attempt {order.attempts}/2</div>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          title="View Details"
                          onClick={() => openModal('view', order)}
                        >
                          <i className="ri-eye-line" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          title="Print Receipt"
                          onClick={() => openModal('receipt', order)}
                        >
                          <i className="ri-printer-line" />
                        </button>

                        {/* Status workflow triggers */}
                        {order.status === 'paid' && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Process Order"
                            onClick={() => openModal('process', order)}
                          >
                            <i className="ri-play-circle-line" />
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Mark Packed"
                            onClick={() => openModal('pack', order)}
                          >
                            <i className="ri-archive-line" />
                          </button>
                        )}
                        {order.status === 'packed' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Assign Driver"
                            onClick={() => openModal('assign', order, { assignType: 'initial' })}
                          >
                            <i className="ri-user-add-line" />
                          </button>
                        )}
                        {['assigned', 'shipped', 'delivery_attempted'].includes(order.status) && order.driver && (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            title="Reassign Driver"
                            onClick={() => openModal('assign', order, { assignType: 'manual_reassign' })}
                          >
                            <i className="ri-user-follow-line" />
                          </button>
                        )}
                        {order.status === 'dispute' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Resolve Dispute"
                            onClick={() => openModal('dispute', order)}
                          >
                            <i className="ri-shield-check-line" />
                          </button>
                        )}
                        {order.status === 'delivery_attempted' && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="Reschedule Attempt"
                            onClick={() => openModal('reschedule', order)}
                          >
                            <i className="ri-calendar-line" />
                          </button>
                        )}
                        {['paid', 'processing', 'packed', 'assigned'].includes(order.status) && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Cancel Order"
                            onClick={() => openModal('cancel', order)}
                          >
                            <i className="ri-close-circle-line" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════ */}

      {activeModal && selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >

          {/* ── 1. VIEW ORDER DETAILS ─────────────────────────────── */}
          {activeModal === 'view' && (() => {
            const cfg = getStatusCfg(selected.status)
            const idx = pipelineIdx(selected.status)

            return (
              <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                  <div>
                    <h5 className="mb-0 fw-bold">{selected.id}</h5>
                    <div className="text-muted small">{selected.date} · {getChannelCfg(selected.channel).label}</div>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 13 }}>
                      <i className={`${cfg.icon} me-1`} />{cfg.label}
                    </span>
                    <Link
                      to={`/deliveries/map?orderId=${selected.id}`}
                      className="btn btn-sm btn-outline-primary"
                      title="Open Full Screen Live Fleet Dispatch Map"
                    >
                      <i className="ri-map-pin-2-line me-1" />Live Fleet Map
                    </Link>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => openModal('receipt', selected)} title="Print Sales Receipt">
                      <i className="ri-printer-line me-1" />Print Receipt
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
                  </div>
                </div>

                {/* Pipeline Progress */}
                {!['physical'].includes(selected.channel) && !['dispute', 'cancelled'].includes(selected.status) && (
                  <div className="px-4 py-3 border-bottom bg-light">
                    <div className="d-flex align-items-center">
                      {PIPELINE.map((step, i) => {
                        const c    = getStatusCfg(step)
                        const done = i <= idx
                        const now  = i === idx
                        return (
                          <div key={step} className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="d-flex flex-column align-items-center flex-shrink-0" style={{ gap: 4 }}>
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: 28,
                                  height: 28,
                                  background: done ? c.color : '#e5e7eb',
                                  boxShadow: now ? `0 0 0 4px ${c.color}35` : 'none',
                                }}
                              >
                                <i className={c.icon} style={{ color: done ? '#fff' : '#9ca3af', fontSize: 11 }} />
                              </div>
                              <div style={{ fontSize: 9, color: done ? c.color : '#9ca3af', whiteSpace: 'nowrap', fontWeight: now ? 700 : 400 }}>
                                {c.label}
                              </div>
                            </div>
                            {i < PIPELINE.length - 1 && (
                              <div className="flex-grow-1 mx-1" style={{ height: 2, background: i < idx ? '#22c55e' : '#e5e7eb', borderRadius: 1 }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  {detailLoading && (
                    <div className="alert alert-info py-2 small mb-3">
                      <i className="ri-loader-line ri-spin me-1" />Refreshing live order history from database...
                    </div>
                  )}

                  <div className="row g-4">
                    {/* Left Column: Customer, Items, Delivery info */}
                    <div className="col-md-7">
                      <div className="card border mb-3 p-3 bg-light-subtle">
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="text-muted small mb-1">Customer</div>
                            <div className="fw-medium">{selected.customer.name}</div>
                            <div className="small text-muted">{selected.customer.phone}</div>
                            <div className="small text-muted">{selected.customer.email}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Fulfillment Address</div>
                            <div className="small">{selected.customer.address}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Channel</div>
                            {(() => {
                              const c = getChannelCfg(selected.channel)
                              return (
                                <span className={`badge rounded-pill ${c.badgeClass || ''}`} style={{ fontSize: 11 }}>
                                  <i className={`${c.icon} me-1`} />{c.label}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Payment Method</div>
                            <div className="small fw-medium">
                              {selected.payment === 'paystack' ? '💳 Paystack' : selected.payment === 'cash' ? '💵 Cash' : '💳 POS Terminal'}
                            </div>
                          </div>

                          {selected.driver && (
                            <div className="col-12 border-top pt-2 mt-2">
                              <div className="text-muted small mb-1">Assigned Driver</div>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white flex-shrink-0"
                                  style={{ width: 32, height: 32, fontSize: 11 }}
                                >
                                  {selected.driver.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="fw-medium small">{selected.driver.name}</div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>{selected.driver.phone} · {selected.driver.bike}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {selected.notes && (
                            <div className="col-12 border-top pt-2 mt-2">
                              <div className="text-muted small mb-1">Order Notes</div>
                              <div className="small text-muted">{selected.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items breakdown */}
                      <div className="card border mb-3 p-3">
                        <div className="fw-bold mb-2 small">Order Items ({selected.items?.length || 0})</div>
                        {selected.items && selected.items.length > 0 ? (
                          <table className="table table-sm mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th className="text-end">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selected.items.map((it, idx) => (
                                <tr key={it.id || idx}>
                                  <td>
                                    <div className="fw-medium small">{it.name}</div>
                                    {it.sku && <div className="text-muted" style={{ fontSize: 10 }}>SKU: {it.sku}</div>}
                                  </td>
                                  <td className="small">{it.qty} {it.unit || ''}</td>
                                  <td className="small">{fmt(it.price)}</td>
                                  <td className="text-end small fw-medium">{fmt(it.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-muted small py-2">No individual product items specified (Direct POS transaction).</div>
                        )}

                        <div className="border-top pt-2 mt-3">
                          <div className="d-flex justify-content-between small text-muted">
                            <span>Subtotal</span>
                            <span>{fmt(calcSub(selected.items) || selected.total)}</span>
                          </div>
                          {selected.deliveryFee > 0 && (
                            <div className="d-flex justify-content-between small text-muted">
                              <span>Delivery Fee</span>
                              <span>{fmt(selected.deliveryFee)}</span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between fw-bold mt-1 fs-15">
                            <span>Total</span>
                            <span className="text-primary">{fmt(selected.total)}</span>
                          </div>
                        </div>
                      </div>

                      {selected.disputeReason && (
                        <div className="alert alert-danger p-3 mb-2 small">
                          <div className="fw-medium mb-1"><i className="ri-alert-line me-1" />Dispute Logged</div>
                          <div><strong>Reason:</strong> {selected.disputeReason}</div>
                          {selected.disputeNote && <div><strong>Note:</strong> {selected.disputeNote}</div>}
                        </div>
                      )}
                      {selected.cancelReason && (
                        <div className="alert alert-secondary p-3 mb-2 small">
                          <div className="fw-medium mb-1"><i className="ri-close-circle-line me-1" />Cancelled</div>
                          <div>{selected.cancelReason}</div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Interactive Map, Timeline & Action shortcuts */}
                    <div className="col-md-5">
                      {/* Interactive Location & Telemetry Map */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-bold small">📍 Order Location &amp; Dispatch Map</span>
                          <Link
                            to={`/deliveries/map?orderId=${selected.id}`}
                            className="small text-primary text-decoration-none fw-semibold"
                          >
                            Full Screen <i className="ri-arrow-right-up-line" />
                          </Link>
                        </div>
                        <AdminOrderMap order={selected} height="200px" />
                      </div>

                      <div className="fw-bold mb-3 small">Status &amp; Tracking Timeline</div>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: '#e5e7eb', zIndex: 0 }} />
                        {selected.timeline && selected.timeline.map((ev, i) => {
                          const c = getStatusCfg(ev.status)
                          return (
                            <div key={i} className="d-flex gap-3 mb-3" style={{ position: 'relative', zIndex: 1 }}>
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 32, height: 32, background: c?.bg || '#f3f4f6', border: `2px solid ${c?.color || '#d1d5db'}` }}
                              >
                                <i className={c?.icon || 'ri-circle-line'} style={{ color: c?.color || '#6b7280', fontSize: 11 }} />
                              </div>
                              <div>
                                <div className="fw-medium" style={{ fontSize: 13 }}>{c?.label || ev.status}</div>
                                <div className="text-muted" style={{ fontSize: 10 }}>{ev.time} · {ev.by || 'System'}</div>
                                <div className="small mt-1 text-muted">{ev.note}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Action Shortcuts */}
                      <div className="border-top pt-3 mt-4 d-flex flex-column gap-2">
                        {selected.status === 'cancelled' && (
                          <div className="alert alert-secondary py-2 small mb-0 d-flex align-items-center gap-2">
                            <i className="ri-close-circle-line fs-5 text-danger" />
                            <div>
                              <div className="fw-bold text-danger">Order Cancelled</div>
                              <div className="text-muted">This order is cancelled. No further processing or dispatch actions are permitted.</div>
                            </div>
                          </div>
                        )}
                        {selected.status === 'paid' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('process', selected), 100) }}
                          >
                            <i className="ri-play-circle-line me-1" />Process Order (Picking)
                          </button>
                        )}
                        {selected.status === 'processing' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('pack', selected), 100) }}
                          >
                            <i className="ri-archive-line me-1" />Confirm Packed & Ready
                          </button>
                        )}
                        {selected.status === 'packed' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('assign', selected, { assignType: 'initial' }), 100) }}
                          >
                            <i className="ri-user-add-line me-1" />Assign Delivery Driver
                          </button>
                        )}
                        {['assigned', 'shipped', 'delivery_attempted'].includes(selected.status) && selected.driver && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('assign', selected, { assignType: 'manual_reassign' }), 100) }}
                          >
                            <i className="ri-user-follow-line me-1" />Reassign Driver
                          </button>
                        )}
                        {selected.status === 'dispute' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('dispute', selected), 100) }}
                          >
                            <i className="ri-shield-check-line me-1" />Resolve Dispute
                          </button>
                        )}
                        {selected.status === 'delivery_attempted' && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('reschedule', selected), 100) }}
                          >
                            <i className="ri-calendar-line me-1" />Reschedule Delivery Attempt
                          </button>
                        )}
                        {['paid', 'processing', 'packed', 'assigned'].includes(selected.status) && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => { closeModal(); setTimeout(() => openModal('cancel', selected), 100) }}
                          >
                            <i className="ri-close-circle-line me-1" />Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── 2. PRINTABLE RECEIPT MODAL ────────────────────────── */}
          {activeModal === 'receipt' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-3 border-bottom d-print-none">
                <h6 className="mb-0 fw-bold">Sales Receipt</h6>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={handlePrint} disabled={detailLoading}>
                    <i className={`${detailLoading ? 'ri-loader-4-line ri-spin' : 'ri-printer-line'} me-1`} />
                    {detailLoading ? 'Loading items…' : 'Print'}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
                </div>
              </div>

              <div ref={receiptRef} className="thermal-receipt-preview">
                <ThermalReceipt
                  receiptType={selected.channel === 'physical' ? 'pos' : 'online'}
                  receiptNumber={selected.id}
                  date={selected.date}
                  customer={selected.customer?.name}
                  customerPhone={selected.customer?.phone}
                  channel={getChannelCfg(selected.channel).label}
                  cashier={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name : 'Cashier'}
                  fulfillment={selected.fulfillmentType === 'delivery' ? 'Delivery' : 'Store pickup'}
                  status={getStatusCfg(selected.status).label}
                  items={selected.items}
                  subtotal={calcSub(selected.items) || selected.total}
                  deliveryFee={selected.deliveryFee}
                  total={selected.total}
                  paymentMethod={selected.payment?.toUpperCase()}
                  note={selected.notes}
                />
              </div>
            </div>
          )}

          {/* ── 3. PROCESS ORDER MODAL ──────────────────────────── */}
          {activeModal === 'process' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 460 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Process Order</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-info mb-3 small">
                  <i className="ri-information-line me-1" />
                  Moves order into the warehouse picking queue. Assign a staff member responsible for gathering produce.
                </div>
                <div className="card border p-3 mb-3 bg-light">
                  <div className="fw-bold">{selected.id}</div>
                  <div className="small text-muted">{selected.customer.name} · {fmt(selected.total)}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Assign Picking Staff</label>
                  <select
                    className="form-select"
                    value={pickingStaff}
                    onChange={(e) => setPickingStaff(e.target.value)}
                  >
                    {staffList.length > 0 ? (
                      staffList.map((s) => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                        <option value="Warehouse Staff">Warehouse Staff</option>
                        <option value="Store Manager">Store Manager</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={processOrder} disabled={actionLoading}>
                    {actionLoading ? 'Processing...' : 'Start Picking'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. MARK PACKED MODAL ─────────────────────────── */}
          {activeModal === 'pack' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Mark as Packed & Ready</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-success mb-3 small">
                  <i className="ri-checkbox-circle-line me-1" />
                  Confirm all goods have been inspected, weighed, packed, and labelled for dispatch.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Packed By</label>
                  <select
                    className="form-select"
                    value={pickingStaff}
                    onChange={(e) => setPickingStaff(e.target.value)}
                  >
                    {staffList.length > 0 ? (
                      staffList.map((s) => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <option value="Fulfillment Team">Fulfillment Team</option>
                    )}
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={markPacked} disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Confirm Packed'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. ASSIGN DRIVER MODAL ───────────────── */}
          {activeModal === 'assign' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <div>
                  <h5 className="mb-0 fw-bold">
                    {assignType === 'manual_reassign' ? 'Reassign Driver' : 'Assign Delivery Driver'}
                  </h5>
                  <div className="text-muted small mt-1">{selected.id} · {selected.customer.name}</div>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="p-3 border rounded mb-3 bg-light">
                  <div className="d-flex gap-2 mb-1">
                    <i className="ri-map-pin-line text-muted mt-1" />
                    <div className="small">{selected.customer.address}</div>
                  </div>
                  {selected.driver && assignType === 'manual_reassign' && (
                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                      <span className="text-muted small">Current:</span>
                      <span className="small fw-bold">{selected.driver.name}</span>
                      <span className="badge bg-warning text-dark ms-auto" style={{ fontSize: 10 }}>Being replaced</span>
                    </div>
                  )}
                </div>

                <label className="form-label fw-medium small mb-2">Available Fleet Drivers</label>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {drivers.length > 0 ? (
                    drivers
                      .filter((d) => d.active && (assignType !== 'manual_reassign' || d.id !== selected.driver?.id))
                      .map((d) => (
                        <div
                          key={d.id}
                          className="d-flex align-items-center gap-3 p-2 border rounded mb-2"
                          style={{
                            cursor: 'pointer',
                            background: Number(assignDriverId) === d.id ? '#ecfdf5' : '#fff',
                            borderColor: Number(assignDriverId) === d.id ? '#10b981' : '#e5e7eb',
                          }}
                          onClick={() => setAssignDriverId(String(d.id))}
                        >
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                            style={{ width: 34, height: 34, fontSize: 11, background: '#10b981' }}
                          >
                            {d.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-medium small">{d.name}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>{d.phone} · {d.bike}</div>
                          </div>
                          {Number(assignDriverId) === d.id && <i className="ri-checkbox-circle-fill text-success fs-18" />}
                        </div>
                      ))
                  ) : (
                    <div className="text-muted small p-3 text-center border rounded">
                      No active fleet drivers registered. Check Fleet & Deliveries settings.
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                  <button
                    className={`btn flex-fill ${assignType === 'manual_reassign' ? 'btn-warning' : 'btn-success'}`}
                    onClick={assignDriver}
                    disabled={!assignDriverId || actionLoading}
                  >
                    {actionLoading ? 'Assigning...' : 'Confirm Driver Assignment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 6. RESOLVE DISPUTE MODAL ────────────────────────── */}
          {activeModal === 'dispute' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 text-danger fw-bold"><i className="ri-alert-line me-2" />Resolve Customer Dispute</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-danger mb-3 small">
                  <strong>{selected.id}</strong> · {selected.customer.name}<br />
                  <strong>Reason:</strong> {selected.disputeReason || 'Produce issue or delivery problem reported.'}
                </div>

                <label className="form-label fw-medium small mb-2">Resolution Decision</label>
                {[
                  { key: 'full_refund',    label: 'Full Refund',    desc: `Refund ${fmt(selected.total)} to customer`, color: '#22c55e', icon: 'ri-refund-2-line' },
                  { key: 'partial_refund', label: 'Partial Refund', desc: 'Specify refund amount for affected items', color: '#f59e0b', icon: 'ri-money-dollar-circle-line' },
                  { key: 'replacement',    label: 'Replacement',    desc: 'Send fresh replacement produce to customer', color: '#f97316', icon: 'ri-refresh-line' },
                  { key: 'reject',         label: 'Reject Claim',   desc: 'Customer receives written rejection explanation', color: '#6b7280', icon: 'ri-close-circle-line' },
                ].map((d) => (
                  <div
                    key={d.key}
                    className="d-flex align-items-center gap-3 p-2 border rounded mb-2"
                    style={{
                      cursor: 'pointer',
                      background: disputeDecision === d.key ? `${d.color}15` : '#fff',
                      borderColor: disputeDecision === d.key ? d.color : '#dee2e6',
                    }}
                    onClick={() => setDisputeDecision(d.key)}
                  >
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32, background: `${d.color}20` }}>
                      <i className={`${d.icon} fs-16`} style={{ color: d.color }} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium small">{d.label}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{d.desc}</div>
                    </div>
                    {disputeDecision === d.key && <i className="ri-checkbox-circle-fill fs-18" style={{ color: d.color }} />}
                  </div>
                ))}

                {disputeDecision === 'partial_refund' && (
                  <div className="mb-2 mt-2">
                    <label className="form-label fw-medium small">Refund Amount (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 2000"
                      value={disputeAmount}
                      onChange={(e) => setDisputeAmount(e.target.value)}
                    />
                  </div>
                )}

                {['reject', 'partial_refund', 'full_refund'].includes(disputeDecision) && (
                  <div className="mb-3 mt-2">
                    <label className="form-label fw-medium small">Resolution Notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Notes for the customer and audit log..."
                      value={disputeNote}
                      onChange={(e) => setDisputeNote(e.target.value)}
                    />
                  </div>
                )}

                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                  <button
                    className="btn btn-danger flex-fill"
                    onClick={resolveDispute}
                    disabled={!disputeDecision || actionLoading}
                  >
                    {actionLoading ? 'Submitting...' : 'Confirm Resolution'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 7. CANCEL ORDER MODAL ───────────────────────────── */}
          {activeModal === 'cancel' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Cancel Order</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  Cancelling order <strong>{selected.id}</strong>. Produce items will be automatically restocked into inventory.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Cancellation Reason</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Reason for order cancellation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Go Back</button>
                  <button
                    className="btn btn-danger flex-fill"
                    onClick={cancelOrder}
                    disabled={!cancelReason || actionLoading}
                  >
                    {actionLoading ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 8. RESCHEDULE DELIVERY MODAL ──── */}
          {activeModal === 'reschedule' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold"><i className="ri-calendar-line me-2 text-warning" />Reschedule Delivery</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  Delivery was attempted {selected.attempts || 1} time(s). Customer will be notified of the new attempt.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Reschedule Notes / Instructions</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="e.g. Customer requested redelivery after 4pm, call before arriving..."
                    value={rescheduleNote}
                    onChange={(e) => setRescheduleNote(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={actionLoading}>Cancel</button>
                  <button
                    className="btn btn-warning flex-fill"
                    onClick={rescheduleDelivery}
                    disabled={!rescheduleNote || actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Reschedule Attempt'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
