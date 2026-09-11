import { useState, useMemo } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  paid:               { label: 'New Order',          color: '#0ea5e9', bg: '#e0f2fe', icon: 'ri-money-dollar-circle-line' },
  processing:         { label: 'Processing',         color: '#f59e0b', bg: '#fef3c7', icon: 'ri-loader-line'              },
  packed:             { label: 'Packed & Ready',     color: '#8b5cf6', bg: '#ede9fe', icon: 'ri-archive-line'             },
  assigned:           { label: 'Driver Assigned',    color: '#06b6d4', bg: '#cffafe', icon: 'ri-user-location-line'       },
  shipped:            { label: 'Out for Delivery',   color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'               },
  delivery_attempted: { label: 'Delivery Attempted', color: '#f97316', bg: '#ffedd5', icon: 'ri-route-line'               },
  delivered:          { label: 'Delivered',          color: '#22c55e', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'     },
  dispute:            { label: 'Dispute',            color: '#ef4444', bg: '#fee2e2', icon: 'ri-alert-line'               },
  cancelled:          { label: 'Cancelled',          color: '#6b7280', bg: '#f3f4f6', icon: 'ri-close-circle-line'        },
}

const CHANNEL_CFG = {
  online:    { label: 'Online',         icon: 'ri-global-line',     color: '#3b82f6' },
  mobile_app:{ label: 'Mobile App',     icon: 'ri-smartphone-line', color: '#8b5cf6' },
  chef_bems: { label: 'Chef Bems AI',   icon: 'ri-robot-line',      color: '#a855f7' },
  physical:  { label: 'Physical Store', icon: 'ri-store-2-line',    color: '#10b981' },
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DRIVERS = [
  { id: 1, name: 'Tunde Adeyemi', phone: '08031234567', bike: 'LAG-234-AB', active: true  },
  { id: 2, name: 'Emeka Okafor',  phone: '08045678901', bike: 'LAG-567-CD', active: true  },
  { id: 3, name: 'Bola Akinwale', phone: '08056789012', bike: 'LAG-890-EF', active: true  },
  { id: 4, name: 'Chidi Eze',     phone: '08067890123', bike: 'LAG-123-GH', active: false },
  { id: 5, name: 'Femi Adeleye',  phone: '08078901234', bike: 'LAG-456-IJ', active: true  },
]

const STAFF = ['Kayode Afolabi', 'Amina Bello', 'Segun Oladele', 'Fatima Umar']

const PRODUCTS_CATALOG = [
  { id: 1,  name: 'Fresh Tomatoes',        unit: 'kg',    price: 2800 },
  { id: 2,  name: 'Red Bell Pepper',       unit: 'kg',    price: 3500 },
  { id: 3,  name: 'Scotch Bonnet',         unit: 'kg',    price: 4200 },
  { id: 4,  name: 'Fresh Spinach',         unit: 'bunch', price: 800  },
  { id: 5,  name: 'Ugwu (Fluted Pumpkin)',unit: 'bunch', price: 600  },
  { id: 6,  name: 'Plantain',              unit: 'hand',  price: 2500 },
  { id: 7,  name: 'Yam (White)',           unit: 'tuber', price: 3200 },
  { id: 8,  name: 'Ginger',               unit: 'kg',    price: 5500 },
  { id: 9,  name: 'Garlic',               unit: 'kg',    price: 4800 },
  { id: 10, name: 'Palm Oil',             unit: 'litre', price: 2100 },
  { id: 11, name: 'Onion (Red)',          unit: 'kg',    price: 1800 },
  { id: 12, name: 'Sweet Corn',          unit: 'cob',   price: 400  },
]

const p = (id, qty) => {
  const prod = PRODUCTS_CATALOG.find(x => x.id === id)
  return { ...prod, qty, total: prod.price * qty }
}

const ORDERS_INIT = [
  {
    id: 'ORD-2026-0142', date: '2026-06-27 09:14', channel: 'online', status: 'paid',
    customer: { name: 'Ngozi Obi', phone: '08123456789', email: 'ngozi@email.com', address: '14 Ikeja GRA, Lagos' },
    items: [p(1,5), p(11,3), p(3,2)], deliveryFee: 800, payment: 'paystack', notes: '', driver: null, attempts: 0,
    timeline: [{ status: 'paid', time: '2026-06-27 09:14', note: 'Payment confirmed. Ref: PST-9938422', by: 'System' }],
  },
  {
    id: 'ORD-2026-0141', date: '2026-06-27 08:45', channel: 'chef_bems', status: 'processing',
    customer: { name: 'Adaeze Nwosu', phone: '07098765432', email: 'adaeze@email.com', address: '7 Lekki Phase 1, Lagos' },
    items: [p(1,8), p(2,4), p(6,3), p(5,5)], deliveryFee: 1200, payment: 'paystack',
    notes: 'Jollof rice party for 25 people — Nancy AI order', driver: null, attempts: 0,
    timeline: [
      { status: 'paid',       time: '2026-06-27 08:45', note: 'Payment confirmed. Ref: PST-9937100', by: 'System' },
      { status: 'processing', time: '2026-06-27 08:52', note: 'Order sent to picking queue. Picking staff: Kayode Afolabi', by: 'Amara Okonkwo (Admin)' },
    ],
  },
  {
    id: 'ORD-2026-0140', date: '2026-06-27 07:30', channel: 'mobile_app', status: 'packed',
    customer: { name: 'Bimpe Fashola', phone: '08055566677', email: 'bimpe@gmail.com', address: '22 Agege Motor Road, Lagos' },
    items: [p(4,4), p(7,2), p(10,2)], deliveryFee: 600, payment: 'paystack', notes: '', driver: null, attempts: 0,
    timeline: [
      { status: 'paid',       time: '2026-06-27 07:30', note: 'Payment confirmed', by: 'System' },
      { status: 'processing', time: '2026-06-27 07:38', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',     time: '2026-06-27 08:15', note: 'Goods picked, packed and labelled. Ready for driver collection. Staff: Amina Bello', by: 'Amina Bello' },
    ],
  },
  {
    id: 'ORD-2026-0139', date: '2026-06-26 16:22', channel: 'online', status: 'assigned',
    customer: { name: 'Seun Adesanya', phone: '09012341234', email: 'seun.a@email.com', address: '5 Victoria Island, Lagos' },
    items: [p(8,1), p(9,1), p(12,6)], deliveryFee: 1500, payment: 'paystack', notes: '', driver: DRIVERS[0], attempts: 0,
    timeline: [
      { status: 'paid',       time: '2026-06-26 16:22', note: 'Payment confirmed', by: 'System' },
      { status: 'processing', time: '2026-06-26 16:30', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',     time: '2026-06-26 17:05', note: 'Goods picked, packed and labelled', by: 'Segun Oladele' },
      { status: 'assigned',   time: '2026-06-26 17:20', note: 'Driver assigned: Tunde Adeyemi. Push notification sent to driver app.', by: 'Amara Okonkwo (Admin)' },
    ],
  },
  {
    id: 'ORD-2026-0138', date: '2026-06-26 14:10', channel: 'online', status: 'shipped',
    customer: { name: 'Kemi Balogun', phone: '08167891234', email: 'kemi.b@gmail.com', address: '18 Surulere, Lagos' },
    items: [p(1,3), p(2,2)], deliveryFee: 700, payment: 'paystack', notes: '', driver: DRIVERS[1], attempts: 0,
    timeline: [
      { status: 'paid',      time: '2026-06-26 14:10', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',time: '2026-06-26 14:18', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',    time: '2026-06-26 14:55', note: 'Goods picked, packed and labelled', by: 'Fatima Umar' },
      { status: 'assigned',  time: '2026-06-26 15:10', note: 'Driver assigned: Emeka Okafor', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',   time: '2026-06-26 15:45', note: 'Driver confirmed pickup at store. Customer app updated to SHIPPED tab.', by: 'Emeka Okafor (Driver App)' },
    ],
  },
  {
    id: 'ORD-2026-0137', date: '2026-06-26 11:05', channel: 'mobile_app', status: 'delivery_attempted',
    customer: { name: 'Tobi Adekunle', phone: '07056781234', email: 'tobi@email.com', address: '3 Ojota Estate, Lagos' },
    items: [p(6,4), p(5,3)], deliveryFee: 600, payment: 'paystack', notes: '', driver: DRIVERS[2], attempts: 1,
    timeline: [
      { status: 'paid',               time: '2026-06-26 11:05', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',         time: '2026-06-26 11:12', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',             time: '2026-06-26 11:50', note: 'Goods picked, packed and labelled', by: 'Kayode Afolabi' },
      { status: 'assigned',           time: '2026-06-26 12:05', note: 'Driver assigned: Bola Akinwale', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',            time: '2026-06-26 12:40', note: 'Driver confirmed pickup at store', by: 'Bola Akinwale (Driver App)' },
      { status: 'delivery_attempted', time: '2026-06-26 13:30', note: 'Customer did not respond within 15 minutes. Push notification and SMS sent. Attempt 1 of 2. Admin notified.', by: 'Driver App' },
    ],
  },
  {
    id: 'ORD-2026-0136', date: '2026-06-26 09:00', channel: 'online', status: 'delivered',
    customer: { name: 'Funmi Ogundele', phone: '08123450987', email: 'funmi@email.com', address: '9 Gbagada, Lagos' },
    items: [p(1,6), p(3,1), p(11,2)], deliveryFee: 800, payment: 'paystack', notes: '', driver: DRIVERS[0], attempts: 0,
    timeline: [
      { status: 'paid',      time: '2026-06-26 09:00', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',time: '2026-06-26 09:08', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',    time: '2026-06-26 09:45', note: 'Goods picked, packed and labelled', by: 'Amina Bello' },
      { status: 'assigned',  time: '2026-06-26 10:00', note: 'Driver assigned: Tunde Adeyemi', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',   time: '2026-06-26 10:35', note: 'Driver confirmed pickup at store', by: 'Tunde Adeyemi (Driver App)' },
      { status: 'delivered', time: '2026-06-26 11:20', note: 'Customer inspected goods and confirmed delivery. Driver confirmed. Order complete. No returns accepted after this point.', by: 'Customer App' },
    ],
  },
  {
    id: 'ORD-2026-0135', date: '2026-06-25 15:30', channel: 'chef_bems', status: 'dispute',
    customer: { name: 'Chukwuemeka Nze', phone: '08098761234', email: 'emeka.n@email.com', address: '11 Isolo, Lagos' },
    items: [p(8,2), p(9,2), p(4,6)], deliveryFee: 1000, payment: 'paystack',
    notes: 'Soup base ingredients — Nancy AI order', driver: DRIVERS[4], attempts: 0,
    disputeReason: 'Damaged on delivery',
    disputeNote: 'Ginger was mouldy and spinach was wilted. Items not fit for use.',
    timeline: [
      { status: 'paid',      time: '2026-06-25 15:30', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',time: '2026-06-25 15:38', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',    time: '2026-06-25 16:15', note: 'Goods picked, packed and labelled', by: 'Segun Oladele' },
      { status: 'assigned',  time: '2026-06-25 16:30', note: 'Driver assigned: Femi Adeleye', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',   time: '2026-06-25 17:10', note: 'Driver confirmed pickup at store', by: 'Femi Adeleye (Driver App)' },
      { status: 'dispute',   time: '2026-06-25 18:05', note: 'Customer tapped REPORT ISSUE. Reason: Damaged on delivery. Photo evidence attached. Admin and Dispatch Manager alerted.', by: 'Customer App' },
    ],
  },
  {
    id: 'ORD-2026-0134', date: '2026-06-25 11:00', channel: 'mobile_app', status: 'cancelled',
    customer: { name: 'Hauwa Musa', phone: '08134561234', email: 'hauwa@email.com', address: '4 Fadeyi, Lagos' },
    items: [p(6,2), p(7,1)], deliveryFee: 600, payment: 'paystack', notes: '', driver: DRIVERS[2], attempts: 2,
    cancelReason: 'Customer unavailable after 2 delivery attempts. Goods returned to store. Stock restored.',
    timeline: [
      { status: 'paid',               time: '2026-06-25 11:00', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',         time: '2026-06-25 11:08', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',             time: '2026-06-25 11:45', note: 'Goods picked, packed and labelled', by: 'Fatima Umar' },
      { status: 'assigned',           time: '2026-06-25 12:00', note: 'Driver assigned: Bola Akinwale', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',            time: '2026-06-25 12:35', note: 'Driver confirmed pickup at store', by: 'Bola Akinwale (Driver App)' },
      { status: 'delivery_attempted', time: '2026-06-25 13:20', note: 'Attempt 1: Customer unavailable. 15-min timer expired. Push + SMS sent.', by: 'Driver App' },
      { status: 'delivery_attempted', time: '2026-06-25 15:00', note: 'Attempt 2: Customer still unavailable.', by: 'Driver App' },
      { status: 'cancelled',          time: '2026-06-25 15:30', note: 'Order cancelled after 2 failed delivery attempts. Refund triggered. Driver returned goods to store. Stock restored.', by: 'Amara Okonkwo (Admin)' },
    ],
  },
  {
    id: 'ORD-2026-0133', date: '2026-06-25 08:20', channel: 'physical', status: 'delivered',
    customer: { name: 'Walk-in Customer', phone: '—', email: '—', address: 'Physical Store' },
    items: [p(4,2), p(12,4), p(10,1)], deliveryFee: 0, payment: 'cash',
    notes: 'Physical store sale', driver: null, attempts: 0,
    timeline: [{ status: 'delivered', time: '2026-06-25 08:20', note: 'Physical store sale completed. Stock decremented.', by: 'Kayode Afolabi (Store Staff)' }],
  },
  {
    id: 'ORD-2026-0132', date: '2026-06-24 17:45', channel: 'online', status: 'delivered',
    customer: { name: 'Yetunde Adeniyi', phone: '08056781234', email: 'yetunde@email.com', address: '20 Ikorodu Road, Lagos' },
    items: [p(1,4), p(2,3), p(5,4)], deliveryFee: 700, payment: 'paystack', notes: '', driver: DRIVERS[1], attempts: 0,
    timeline: [
      { status: 'paid',      time: '2026-06-24 17:45', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',time: '2026-06-24 17:53', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',    time: '2026-06-24 18:30', note: 'Goods picked, packed and labelled', by: 'Amina Bello' },
      { status: 'assigned',  time: '2026-06-24 18:45', note: 'Driver assigned: Emeka Okafor', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',   time: '2026-06-24 19:20', note: 'Driver confirmed pickup at store', by: 'Emeka Okafor (Driver App)' },
      { status: 'delivered', time: '2026-06-24 20:05', note: 'Customer confirmed delivery. Driver confirmed.', by: 'Customer App' },
    ],
  },
  {
    id: 'ORD-2026-0131', date: '2026-06-24 14:00', channel: 'chef_bems', status: 'delivered',
    customer: { name: 'Rasheedat Lawal', phone: '07023456789', email: 'rasheedat@email.com', address: '15 Maryland, Lagos' },
    items: [p(1,10), p(2,5), p(3,3), p(11,4)], deliveryFee: 1500, payment: 'paystack',
    notes: 'Egusi soup for 30 people — Nancy AI order', driver: DRIVERS[4], attempts: 0,
    timeline: [
      { status: 'paid',      time: '2026-06-24 14:00', note: 'Payment confirmed', by: 'System' },
      { status: 'processing',time: '2026-06-24 14:08', note: 'Order sent to picking queue', by: 'Amara Okonkwo (Admin)' },
      { status: 'packed',    time: '2026-06-24 14:50', note: 'Goods picked, packed and labelled', by: 'Segun Oladele' },
      { status: 'assigned',  time: '2026-06-24 15:05', note: 'Driver assigned: Femi Adeleye', by: 'Amara Okonkwo (Admin)' },
      { status: 'shipped',   time: '2026-06-24 15:45', note: 'Driver confirmed pickup at store', by: 'Femi Adeleye (Driver App)' },
      { status: 'delivered', time: '2026-06-24 17:10', note: 'Customer confirmed delivery. Driver confirmed.', by: 'Customer App' },
    ],
  },
  {
    id: 'ORD-2026-0130', date: '2026-06-27 10:05', channel: 'online', status: 'paid',
    customer: { name: 'Olufemi Adeleke', phone: '08012345678', email: 'femi.ade@email.com', address: '33 Yaba, Lagos' },
    items: [p(7,3), p(6,2)], deliveryFee: 700, payment: 'paystack', notes: '', driver: null, attempts: 0,
    timeline: [{ status: 'paid', time: '2026-06-27 10:05', note: 'Payment confirmed. Ref: PST-9939100', by: 'System' }],
  },
  {
    id: 'ORD-2026-0129', date: '2026-06-27 08:00', channel: 'physical', status: 'delivered',
    customer: { name: 'Walk-in Customer', phone: '—', email: '—', address: 'Physical Store' },
    items: [p(8,1), p(9,1)], deliveryFee: 0, payment: 'pos',
    notes: 'Physical store sale — POS card payment', driver: null, attempts: 0,
    timeline: [{ status: 'delivered', time: '2026-06-27 08:00', note: 'Physical store sale. POS payment. Stock decremented.', by: 'Fatima Umar (Store Staff)' }],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt        = (n) => `₦${Number(n).toLocaleString()}`
const calcSub    = (items) => items.reduce((s, i) => s + i.total, 0)
const calcTotal  = (items, fee) => calcSub(items) + fee
const PIPELINE   = ['paid','processing','packed','assigned','shipped','delivered']
const pipelineIdx = (s) => ['delivery_attempted'].includes(s) ? PIPELINE.indexOf('shipped') : PIPELINE.indexOf(s)

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersList() {
  const [orders, setOrders]           = useState(ORDERS_INIT)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [filterChannel, setFilterChannel] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [selected, setSelected]       = useState(null)

  // Modal form state
  const [pickingStaff, setPickingStaff]     = useState(STAFF[0])
  const [assignDriverId, setAssignDriverId] = useState('')
  const [disputeDecision, setDisputeDecision] = useState('')
  const [disputeNote, setDisputeNote]       = useState('')
  const [disputeAmount, setDisputeAmount]   = useState('')
  const [cancelReason, setCancelReason]     = useState('')
  const [rescheduleNote, setRescheduleNote] = useState('')
  const [assignType, setAssignType]         = useState('initial') // 'initial' | 'manual_reassign'

  const openModal = (type, order, meta = {}) => {
    setSelected(order); setActiveModal(type)
    setAssignDriverId(''); setDisputeDecision(''); setDisputeNote('')
    setDisputeAmount(''); setCancelReason(''); setRescheduleNote('')
    setPickingStaff(STAFF[0])
    if (type === 'assign') setAssignType(meta.assignType || 'initial')
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:             orders.length,
    newOrders:         orders.filter(o => o.status === 'paid').length,
    inProgress:        orders.filter(o => ['processing','packed','assigned'].includes(o.status)).length,
    outForDelivery:    orders.filter(o => o.status === 'shipped').length,
    deliveryAttempted: orders.filter(o => o.status === 'delivery_attempted').length,
    delivered:         orders.filter(o => o.status === 'delivered').length,
    disputes:          orders.filter(o => o.status === 'dispute').length,
    revenue:           orders.filter(o => o.status === 'delivered').reduce((s,o) => s + calcTotal(o.items, o.deliveryFee), 0),
  }), [orders])

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders
      .filter(o => {
        const okStatus  = filterStatus  === 'all' || o.status  === filterStatus
        const okChannel = filterChannel === 'all' || o.channel === filterChannel
        const okSearch  = !q || o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q)
        return okStatus && okChannel && okSearch
      })
      .sort((a,b) => new Date(b.date) - new Date(a.date))
  }, [orders, search, filterStatus, filterChannel])

  // ── Order mutations ────────────────────────────────────────────────────────

  const pushEvent = (orderId, patch) => {
    const now = new Date().toISOString().replace('T',' ').slice(0,16)
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const { _note, _by, ...rest } = patch
      return { ...o, ...rest, timeline: [...o.timeline, { status: rest.status, time: now, note: _note, by: _by || 'Admin' }] }
    }))
  }

  const processOrder  = ()  => { pushEvent(selected.id, { status:'processing', _note:`Order sent to picking queue. Picking staff: ${pickingStaff}`, _by: pickingStaff }); closeModal() }
  const markPacked    = ()  => { pushEvent(selected.id, { status:'packed',     _note:`Goods picked, packed and labelled. Ready for driver. Staff: ${pickingStaff}`, _by: pickingStaff }); closeModal() }
  const assignDriver  = ()  => {
    if (!assignDriverId) return
    const driver = DRIVERS.find(d => d.id === Number(assignDriverId))
    if (assignType === 'manual_reassign') {
      pushEvent(selected.id, {
        status: 'assigned', driver,
        _note: `Manual driver reassignment by Admin. Previous driver: ${selected.driver?.name || 'none'} → New driver: ${driver.name}. Push notification sent to ${driver.name}.`,
        _by: 'Admin (Manual Reassign)',
      })
    } else {
      pushEvent(selected.id, { status:'assigned', driver, _note:`Driver assigned: ${driver.name}. Push notification sent to driver app.`, _by:'Admin' })
    }
    closeModal()
  }
  const resolveDispute = () => {
    if (!disputeDecision) return
    const total = calcTotal(selected.items, selected.deliveryFee)
    const noteMap = {
      full_refund:    `Admin decision: Full refund of ${fmt(total)} processed via Paystack.`,
      partial_refund: `Admin decision: Partial refund of ${fmt(disputeAmount || 0)} via Paystack. Notes: ${disputeNote}`,
      replacement:    `Admin decision: Replacement arranged. Driver instructed to collect goods from customer on the spot.`,
      reject:         `Admin decision: Claim rejected. Reason: ${disputeNote}. Customer notified with written reason.`,
    }
    pushEvent(selected.id, { status:'delivered', _note: noteMap[disputeDecision], _by:'Admin' })
    closeModal()
  }
  const cancelOrder = () => {
    pushEvent(selected.id, { status:'cancelled', cancelReason, _note:`Order cancelled. Reason: ${cancelReason}. Refund triggered.`, _by:'Admin' })
    closeModal()
  }
  const rescheduleDelivery = () => {
    pushEvent(selected.id, { status:'assigned', attempts: selected.attempts, _note:`Delivery rescheduled (attempt ${selected.attempts + 1}). ${rescheduleNote}. Driver: ${selected.driver?.name}`, _by:'Admin' })
    closeModal()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">All Orders</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Orders</a></li>
          <li className="breadcrumb-item active">All Orders</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Orders',       value: stats.total,             color:'#6366f1', icon:'ri-shopping-bag-3-line',    filter:'all'                },
          { label:'New Orders',         value: stats.newOrders,         color:'#0ea5e9', icon:'ri-money-dollar-circle-line',filter:'paid'               },
          { label:'In Progress',        value: stats.inProgress,        color:'#f59e0b', icon:'ri-loader-line',             filter:'processing'         },
          { label:'Out for Delivery',   value: stats.outForDelivery,    color:'#3b82f6', icon:'ri-truck-line',              filter:'shipped'            },
          { label:'Delivery Attempted', value: stats.deliveryAttempted, color:'#f97316', icon:'ri-route-line',              filter:'delivery_attempted' },
          { label:'Delivered',          value: stats.delivered,         color:'#22c55e', icon:'ri-checkbox-circle-line',    filter:'delivered'          },
          { label:'Disputes',           value: stats.disputes,          color:'#ef4444', icon:'ri-alert-line',              filter:'dispute'            },
          { label:'Total Revenue',      value: fmt(stats.revenue),      color:'#10b981', icon:'ri-bar-chart-2-line',        filter: null                },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card p-3" style={{ borderLeft:`3px solid ${c.color}`, cursor: c.filter ? 'pointer' : 'default' }}
              onClick={() => c.filter && setFilterStatus(c.filter)}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:40, height:40, background:c.color+'20' }}>
                  <i className={`${c.icon} fs-18`} style={{ color:c.color }}/>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize:11 }}>{c.label}</div>
                  <div className="fw-bold fs-18">{c.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth:280 }}>
            <span className="input-group-text"><i className="ri-search-line"/></span>
            <input className="form-control" placeholder="Order ref, name, phone..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{ maxWidth:160 }} value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
            <option value="all">All Channels</option>
            {Object.entries(CHANNEL_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1"/>Clear Filter
            </button>
          )}
          <div className="ms-auto text-muted small">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        {/* Status Tab Strip */}
        <div className="border-top px-3" style={{ overflowX:'auto' }}>
          <div className="d-flex" style={{ whiteSpace:'nowrap' }}>
            {[{ key:'all', label:'All Orders' }, ...Object.entries(STATUS_CFG).map(([k,v]) => ({ key:k, label:v.label }))].map(t => (
              <button key={t.key} className="btn btn-sm border-0 rounded-0 py-2 px-3"
                style={{
                  borderBottom: filterStatus === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  color:        filterStatus === t.key ? '#6366f1' : '#6b7280',
                  fontWeight:   filterStatus === t.key ? 600 : 400,
                  background:   'transparent',
                }}
                onClick={() => setFilterStatus(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Order Ref</th><th>Date</th><th>Customer</th><th>Channel</th>
                <th>Items</th><th>Total</th><th>Driver</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted py-5">No orders found</td></tr>
              )}
              {filtered.map(order => {
                const cfg   = STATUS_CFG[order.status]
                const chCfg = CHANNEL_CFG[order.channel]
                const total = calcTotal(order.items, order.deliveryFee)
                return (
                  <tr key={order.id}>
                    <td>
                      <div className="fw-medium text-primary" style={{ cursor:'pointer' }} onClick={() => openModal('view', order)}>{order.id}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>
                        {order.payment === 'paystack' ? '💳 Paystack' : order.payment === 'cash' ? '💵 Cash' : '💳 POS'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize:13 }}>{order.date.split(' ')[0]}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{order.date.split(' ')[1]}</div>
                    </td>
                    <td>
                      <div className="fw-medium">{order.customer.name}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{order.customer.phone}</div>
                    </td>
                    <td>
                      <span className="badge rounded-pill" style={{ background:chCfg.color+'20', color:chCfg.color, fontSize:11 }}>
                        <i className={`${chCfg.icon} me-1`}/>{chCfg.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize:13 }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                      <div className="text-muted" style={{ fontSize:11, maxWidth:180 }}>
                        {order.items.slice(0,2).map(i => i.name).join(', ')}{order.items.length > 2 ? ` +${order.items.length-2} more` : ''}
                      </div>
                    </td>
                    <td className="fw-bold">{fmt(total)}</td>
                    <td>
                      {order.driver
                        ? <><div style={{ fontSize:13 }}>{order.driver.name}</div><div className="text-muted" style={{ fontSize:11 }}>{order.driver.phone}</div></>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className="badge" style={{ background:cfg.bg, color:cfg.color, fontSize:11 }}>
                        <i className={`${cfg.icon} me-1`}/>{cfg.label}
                      </span>
                      {order.status === 'delivery_attempted' &&
                        <div className="text-muted" style={{ fontSize:10 }}>Attempt {order.attempts}/2</div>}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <button className="btn btn-sm btn-outline-secondary" title="View" onClick={() => openModal('view', order)}><i className="ri-eye-line"/></button>
                        {order.status === 'paid'       && <button className="btn btn-sm btn-outline-primary" title="Process"         onClick={() => openModal('process',  order)}><i className="ri-play-circle-line"/></button>}
                        {order.status === 'processing' && <button className="btn btn-sm btn-outline-success" title="Mark Packed"     onClick={() => openModal('pack',     order)}><i className="ri-archive-line"/></button>}
                        {order.status === 'packed'     && <button className="btn btn-sm btn-outline-success" title="Assign Driver"   onClick={() => openModal('assign',   order, { assignType:'initial' })}><i className="ri-user-add-line"/></button>}
                        {['assigned','shipped','delivery_attempted'].includes(order.status) && order.driver &&
                          <button className="btn btn-sm btn-outline-warning" title="Reassign Driver" onClick={() => openModal('assign', order, { assignType:'manual_reassign' })}>
                            <i className="ri-user-follow-line"/>
                          </button>}
                        {order.status === 'dispute'    && <button className="btn btn-sm btn-outline-danger"  title="Resolve"          onClick={() => openModal('dispute',  order)}><i className="ri-shield-check-line"/></button>}
                        {order.status === 'delivery_attempted' && <button className="btn btn-sm btn-outline-secondary" title="Reschedule" onClick={() => openModal('reschedule', order)}><i className="ri-calendar-line"/></button>}
                        {['paid','processing','packed','assigned'].includes(order.status) &&
                          <button className="btn btn-sm btn-outline-danger" title="Cancel" onClick={() => openModal('cancel', order)}><i className="ri-close-circle-line"/></button>}
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
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── VIEW ORDER ─────────────────────────────── */}
          {activeModal === 'view' && (() => {
            const total = calcTotal(selected.items, selected.deliveryFee)
            const cfg   = STATUS_CFG[selected.status]
            const idx   = pipelineIdx(selected.status)
            return (
              <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:880, maxHeight:'90vh', overflowY:'auto' }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                  <div>
                    <h5 className="mb-0">{selected.id}</h5>
                    <div className="text-muted small">{selected.date} · {CHANNEL_CFG[selected.channel].label}</div>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <span className="badge" style={{ background:cfg.bg, color:cfg.color, fontSize:13 }}>
                      <i className={`${cfg.icon} me-1`}/>{cfg.label}
                    </span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
                  </div>
                </div>

                {/* Pipeline progress (online / app / chef orders only) */}
                {!['physical'].includes(selected.channel) && !['dispute','cancelled'].includes(selected.status) && (
                  <div className="px-4 py-3 border-bottom bg-light">
                    <div className="d-flex align-items-center">
                      {PIPELINE.map((step, i) => {
                        const c    = STATUS_CFG[step]
                        const done = i <= idx
                        const now  = i === idx
                        return (
                          <div key={step} className="d-flex align-items-center flex-grow-1" style={{ minWidth:0 }}>
                            <div className="d-flex flex-column align-items-center flex-shrink-0" style={{ gap:4 }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width:28, height:28, background: done ? c.color : '#e5e7eb',
                                  boxShadow: now ? `0 0 0 4px ${c.color}35` : 'none' }}>
                                <i className={c.icon} style={{ color: done ? '#fff' : '#9ca3af', fontSize:11 }}/>
                              </div>
                              <div style={{ fontSize:9, color: done ? c.color : '#9ca3af', whiteSpace:'nowrap', fontWeight: now ? 700 : 400 }}>
                                {c.label}
                              </div>
                            </div>
                            {i < PIPELINE.length - 1 &&
                              <div className="flex-grow-1 mx-1" style={{ height:2, background: i < idx ? '#22c55e' : '#e5e7eb', borderRadius:1 }}/>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="row g-4">
                    {/* Left col */}
                    <div className="col-md-7">
                      <div className="card border mb-3 p-3">
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="text-muted small mb-1">Customer</div>
                            <div className="fw-medium">{selected.customer.name}</div>
                            <div className="small">{selected.customer.phone}</div>
                            <div className="small text-muted">{selected.customer.email}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Delivery Address</div>
                            <div className="small">{selected.customer.address}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Channel</div>
                            {(() => { const c = CHANNEL_CFG[selected.channel]; return (
                              <span className="badge" style={{ background:c.color+'20', color:c.color }}>
                                <i className={`${c.icon} me-1`}/>{c.label}
                              </span>)})()}
                          </div>
                          <div className="col-6">
                            <div className="text-muted small mb-1">Payment</div>
                            <div className="small">
                              {selected.payment === 'paystack' ? '💳 Paystack' : selected.payment === 'cash' ? '💵 Cash' : '💳 POS'}
                            </div>
                          </div>
                          {selected.driver && (
                            <div className="col-12">
                              <div className="text-muted small mb-1">Assigned Driver</div>
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white flex-shrink-0"
                                  style={{ width:32, height:32, fontSize:11 }}>
                                  {selected.driver.name.split(' ').map(n=>n[0]).join('')}
                                </div>
                                <div>
                                  <div className="fw-medium small">{selected.driver.name}</div>
                                  <div className="text-muted" style={{ fontSize:11 }}>{selected.driver.phone} · {selected.driver.bike}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          {selected.notes && (
                            <div className="col-12">
                              <div className="text-muted small mb-1">Notes</div>
                              <div className="small">{selected.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="card border mb-3 p-3">
                        <div className="fw-medium mb-2 small">Order Items</div>
                        <table className="table table-sm mb-0">
                          <thead className="table-light">
                            <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th className="text-end">Total</th></tr>
                          </thead>
                          <tbody>
                            {selected.items.map((item, i) => (
                              <tr key={i}>
                                <td>{item.name}</td>
                                <td>{item.qty} {item.unit}</td>
                                <td>{fmt(item.price)}</td>
                                <td className="text-end">{fmt(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="border-top pt-2 mt-2">
                          <div className="d-flex justify-content-between small text-muted"><span>Subtotal</span><span>{fmt(calcSub(selected.items))}</span></div>
                          <div className="d-flex justify-content-between small text-muted"><span>Delivery Fee</span><span>{fmt(selected.deliveryFee)}</span></div>
                          <div className="d-flex justify-content-between fw-bold mt-1"><span>Total</span><span>{fmt(total)}</span></div>
                        </div>
                      </div>

                      {selected.disputeReason && (
                        <div className="alert alert-danger p-3 mb-2 small">
                          <div className="fw-medium mb-1"><i className="ri-alert-line me-1"/>Dispute Raised</div>
                          <div><strong>Reason:</strong> {selected.disputeReason}</div>
                          {selected.disputeNote && <div><strong>Customer note:</strong> {selected.disputeNote}</div>}
                        </div>
                      )}
                      {selected.cancelReason && (
                        <div className="alert alert-secondary p-3 mb-2 small">
                          <div className="fw-medium mb-1"><i className="ri-close-circle-line me-1"/>Cancelled</div>
                          <div>{selected.cancelReason}</div>
                        </div>
                      )}
                    </div>

                    {/* Right col — Timeline */}
                    <div className="col-md-5">
                      <div className="fw-medium mb-3 small">Order Timeline</div>
                      <div style={{ position:'relative' }}>
                        <div style={{ position:'absolute', left:15, top:8, bottom:8, width:2, background:'#e5e7eb', zIndex:0 }}/>
                        {selected.timeline.map((ev, i) => {
                          const c = STATUS_CFG[ev.status]
                          return (
                            <div key={i} className="d-flex gap-3 mb-3" style={{ position:'relative', zIndex:1 }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width:32, height:32, background:c?.bg||'#f3f4f6', border:`2px solid ${c?.color||'#d1d5db'}` }}>
                                <i className={c?.icon||'ri-circle-line'} style={{ color:c?.color||'#6b7280', fontSize:11 }}/>
                              </div>
                              <div>
                                <div className="fw-medium" style={{ fontSize:13 }}>{c?.label||ev.status}</div>
                                <div className="text-muted" style={{ fontSize:10 }}>{ev.time} · {ev.by}</div>
                                <div className="small mt-1 text-muted">{ev.note}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Action shortcuts */}
                      <div className="border-top pt-3 mt-2 d-flex flex-column gap-2">
                        {selected.status === 'paid'       && <button className="btn btn-primary btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('process', selected), 100) }}><i className="ri-play-circle-line me-1"/>Process Order</button>}
                        {selected.status === 'processing' && <button className="btn btn-success btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('pack', selected), 100) }}><i className="ri-archive-line me-1"/>Mark as Packed</button>}
                        {selected.status === 'packed'     && <button className="btn btn-success btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('assign', selected, { assignType:'initial' }), 100) }}><i className="ri-user-add-line me-1"/>Assign Driver</button>}
                        {['assigned','shipped','delivery_attempted'].includes(selected.status) && selected.driver && (
                          <button className="btn btn-warning btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('assign', selected, { assignType:'manual_reassign' }), 100) }}>
                            <i className="ri-user-follow-line me-1"/>Reassign Driver
                          </button>
                        )}
                        {selected.status === 'dispute'    && <button className="btn btn-danger btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('dispute', selected), 100) }}><i className="ri-shield-check-line me-1"/>Resolve Dispute</button>}
                        {selected.status === 'delivery_attempted' && <button className="btn btn-outline-secondary btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('reschedule', selected), 100) }}><i className="ri-calendar-line me-1"/>Reschedule / Cancel</button>}
                        {['paid','processing','packed','assigned'].includes(selected.status) && <button className="btn btn-outline-danger btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('cancel', selected), 100) }}><i className="ri-close-circle-line me-1"/>Cancel Order</button>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── PROCESS ORDER ──────────────────────────── */}
          {activeModal === 'process' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:480 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Process Order</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-info mb-3 small">
                  <i className="ri-information-line me-1"/>
                  This moves the order into the <strong>picking queue</strong>. A picking list will be generated for the assigned staff member.
                </div>
                <div className="card border p-3 mb-3">
                  <div className="fw-medium mb-1">{selected.id}</div>
                  <div className="small text-muted mb-2">{selected.customer.name} · {fmt(calcTotal(selected.items, selected.deliveryFee))}</div>
                  <div className="border-top pt-2">
                    {selected.items.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between small py-1 border-bottom">
                        <span>{item.name}</span><span className="fw-medium text-muted">{item.qty} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Assign Picking Staff</label>
                  <select className="form-select" value={pickingStaff} onChange={e => setPickingStaff(e.target.value)}>
                    {STAFF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={processOrder}>
                    <i className="ri-send-plane-line me-1"/>Start Processing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MARK AS PACKED ─────────────────────────── */}
          {activeModal === 'pack' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:440 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Mark as Packed</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-success mb-3 small">
                  <i className="ri-archive-line me-1"/>
                  Confirm all items have been picked, packed and labelled. The order will be ready for driver collection.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Packed by</label>
                  <select className="form-select" value={pickingStaff} onChange={e => setPickingStaff(e.target.value)}>
                    {STAFF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={markPacked}>
                    <i className="ri-checkbox-circle-line me-1"/>Confirm Packed & Ready
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ASSIGN / REASSIGN DRIVER ───────────────── */}
          {activeModal === 'assign' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:480 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <div>
                  <h5 className="mb-0">
                    {assignType === 'manual_reassign'
                      ? <><i className="ri-user-follow-line me-2 text-warning"/>Manual Driver Reassignment</>
                      : <><i className="ri-user-add-line me-2 text-success"/>Assign Driver</>}
                  </h5>
                  <div className="text-muted small mt-1">{selected.id} · {selected.customer.name}</div>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">

                {/* Context info */}
                <div className="p-3 border rounded mb-3" style={{ background:'#f8fafc' }}>
                  <div className="d-flex gap-2 mb-1">
                    <i className="ri-map-pin-line text-muted mt-1"/>
                    <div className="small">{selected.customer.address}</div>
                  </div>
                  {assignType === 'manual_reassign' && selected.driver && (
                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                      <span className="text-muted small">Current driver:</span>
                      <div className="rounded-circle d-flex align-items-center justify-content-center bg-secondary text-white flex-shrink-0"
                        style={{ width:24, height:24, fontSize:9 }}>
                        {selected.driver.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <span className="small fw-medium">{selected.driver.name}</span>
                      <span className="badge bg-warning text-dark ms-auto" style={{ fontSize:10 }}>Being replaced</span>
                    </div>
                  )}
                </div>

                {assignType === 'manual_reassign' && (
                  <div className="alert alert-warning small p-2 mb-3">
                    <i className="ri-alert-line me-1"/>
                    This is a <strong>manual override</strong>. A reassignment event will be logged on the order timeline.
                  </div>
                )}

                <label className="form-label fw-medium small">
                  {assignType === 'manual_reassign' ? 'Select New Driver' : 'Select Available Driver'}
                </label>
                {DRIVERS.filter(d => d.active && (assignType !== 'manual_reassign' || d.id !== selected.driver?.id)).map(driver => (
                  <div key={driver.id}
                    className="d-flex align-items-center gap-3 p-3 border rounded mb-2"
                    style={{ cursor:'pointer',
                      background:   Number(assignDriverId) === driver.id ? (assignType === 'manual_reassign' ? '#fef3c7' : '#ede9fe') : '#fff',
                      borderColor:  Number(assignDriverId) === driver.id ? (assignType === 'manual_reassign' ? '#f59e0b' : '#8b5cf6') : '#dee2e6' }}
                    onClick={() => setAssignDriverId(String(driver.id))}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                      style={{ width:36, height:36, fontSize:11, background: assignType === 'manual_reassign' ? '#f59e0b' : '#6366f1' }}>
                      {driver.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium small">{driver.name}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{driver.phone} · {driver.bike}</div>
                    </div>
                    {Number(assignDriverId) === driver.id &&
                      <i className={`ri-checkbox-circle-fill fs-18 ${assignType === 'manual_reassign' ? 'text-warning' : 'text-primary'}`}/>}
                  </div>
                ))}
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button
                    className={`btn flex-fill ${assignType === 'manual_reassign' ? 'btn-warning' : 'btn-success'}`}
                    onClick={assignDriver} disabled={!assignDriverId}>
                    <i className={`${assignType === 'manual_reassign' ? 'ri-user-follow-line' : 'ri-user-add-line'} me-1`}/>
                    {assignType === 'manual_reassign' ? 'Reassign & Notify New Driver' : 'Assign & Notify Driver'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── RESOLVE DISPUTE ────────────────────────── */}
          {activeModal === 'dispute' && (() => {
            const total = calcTotal(selected.items, selected.deliveryFee)
            return (
              <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:540 }}>
                <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                  <h5 className="mb-0 text-danger"><i className="ri-alert-line me-2"/>Resolve Dispute</h5>
                  <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
                <div className="p-4">
                  <div className="alert alert-danger mb-3 small">
                    <strong>{selected.id}</strong> · {selected.customer.name}<br/>
                    <strong>Reason:</strong> {selected.disputeReason || 'Issue reported at delivery'}<br/>
                    {selected.disputeNote && <><strong>Customer note:</strong> {selected.disputeNote}</>}
                  </div>
                  <label className="form-label fw-medium small mb-2">Admin Decision — Case by Case</label>
                  {[
                    { key:'full_refund',    label:'Full Refund',     desc:`Refund ${fmt(total)} to customer`,                        color:'#22c55e', icon:'ri-refund-2-line'              },
                    { key:'partial_refund', label:'Partial Refund',  desc:'Specify refund amount',                                    color:'#f59e0b', icon:'ri-money-dollar-circle-line'    },
                    { key:'replacement',    label:'Replacement',     desc:'Driver collects goods. Replacement order arranged.',       color:'#f97316', icon:'ri-refresh-line'                },
                    { key:'reject',         label:'Reject Claim',    desc:'Customer receives written rejection reason.',              color:'#6b7280', icon:'ri-close-circle-line'           },
                  ].map(d => (
                    <div key={d.key}
                      className="d-flex align-items-center gap-3 p-3 border rounded mb-2"
                      style={{ cursor:'pointer', background: disputeDecision===d.key ? d.color+'15' : '#fff',
                        borderColor: disputeDecision===d.key ? d.color : '#dee2e6' }}
                      onClick={() => setDisputeDecision(d.key)}>
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width:36, height:36, background:d.color+'20' }}>
                        <i className={`${d.icon} fs-16`} style={{ color:d.color }}/>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-medium small">{d.label}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{d.desc}</div>
                      </div>
                      {disputeDecision===d.key && <i className="ri-checkbox-circle-fill fs-18" style={{ color:d.color }}/>}
                    </div>
                  ))}
                  {disputeDecision === 'partial_refund' && (
                    <div className="mb-3 mt-2">
                      <label className="form-label fw-medium small">Refund Amount (₦)</label>
                      <input type="number" className="form-control" placeholder="e.g. 5000"
                        value={disputeAmount} onChange={e => setDisputeAmount(e.target.value)}/>
                    </div>
                  )}
                  {['reject','partial_refund'].includes(disputeDecision) && (
                    <div className="mb-3 mt-2">
                      <label className="form-label fw-medium small">
                        {disputeDecision === 'reject' ? 'Rejection Reason (sent to customer)' : 'Admin Notes'}
                      </label>
                      <textarea className="form-control" rows={3} placeholder="Write reason..."
                        value={disputeNote} onChange={e => setDisputeNote(e.target.value)}/>
                    </div>
                  )}
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-danger flex-fill" onClick={resolveDispute}
                      disabled={!disputeDecision
                        || (disputeDecision==='partial_refund' && !disputeAmount)
                        || (['reject','partial_refund'].includes(disputeDecision) && !disputeNote)}>
                      <i className="ri-shield-check-line me-1"/>Confirm Resolution
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── CANCEL ORDER ───────────────────────────── */}
          {activeModal === 'cancel' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:440 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Cancel Order</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  <i className="ri-alert-line me-1"/>
                  Cancelling <strong>{selected.id}</strong> for <strong>{selected.customer.name}</strong>.
                  A refund of <strong>{fmt(calcTotal(selected.items, selected.deliveryFee))}</strong> will be triggered.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Cancellation Reason</label>
                  <textarea className="form-control" rows={3} placeholder="Why is this order being cancelled?"
                    value={cancelReason} onChange={e => setCancelReason(e.target.value)}/>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Go Back</button>
                  <button className="btn btn-danger flex-fill" onClick={cancelOrder} disabled={!cancelReason}>
                    <i className="ri-close-circle-line me-1"/>Cancel & Trigger Refund
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CUSTOMER UNAVAILABLE — ADMIN DECISION ──── */}
          {activeModal === 'reschedule' && (() => {
            const isFinal = selected.attempts >= 2
            return (
              <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:540 }}>
                {/* Dark header */}
                <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold fs-15">
                        <i className="ri-route-line me-2 text-warning"/>Customer Unavailable — Admin Decision Required
                      </div>
                      <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.id} · {selected.customer.name}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                  </div>
                </div>

                <div className="p-4">

                  {/* What happened — flow context */}
                  <div className="border rounded p-3 mb-4" style={{ background:'#f8fafc', fontSize:12 }}>
                    <div className="fw-medium small mb-2 text-muted">What happened:</div>
                    {[
                      { icon:'ri-truck-line',         color:'#6b7280', text:`Driver (${selected.driver?.name || '—'}) arrived at customer location` },
                      { icon:'ri-tap-line',            color:'#f97316', text:'Driver tapped CUSTOMER UNAVAILABLE on Driver App' },
                      { icon:'ri-notification-3-line', color:'#3b82f6', text:'System sent push notification + SMS to customer' },
                      { icon:'ri-timer-line',          color:'#f59e0b', text:'15-minute countdown timer started' },
                      { icon:'ri-close-circle-line',   color:'#ef4444', text:'Timer expired — customer did not respond' },
                    ].map((s, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 py-1">
                        <i className={`${s.icon} flex-shrink-0`} style={{ color:s.color, fontSize:13 }}/>
                        <span>{s.text}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-top">
                      <span className="badge" style={{ background: isFinal ? '#fee2e2' : '#ffedd5', color: isFinal ? '#ef4444' : '#f97316', fontSize:11 }}>
                        {isFinal
                          ? '⚠️ ATTEMPT 2 of 2 — Maximum reached. Order must be cancelled.'
                          : `Attempt ${selected.attempts} of 2 — One more re-attempt allowed.`}
                      </span>
                    </div>
                  </div>

                  {/* Admin Decision */}
                  <div className="fw-medium small mb-3">Admin Decision — What would you like to do?</div>

                  {/* Option A: Schedule Retry */}
                  {!isFinal && (
                    <div className="border rounded p-3 mb-2"
                      style={{ cursor:'pointer', background: rescheduleNote !== '' ? '#fef3c715' : '#fff',
                        borderColor: rescheduleNote !== '' ? '#f59e0b' : '#dee2e6' }}>
                      <div className="d-flex align-items-center gap-3 mb-2">
                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width:36, height:36, background:'#fef3c7' }}>
                          <i className="ri-calendar-line" style={{ color:'#f59e0b', fontSize:16 }}/>
                        </div>
                        <div>
                          <div className="fw-medium small">Schedule New Delivery Attempt</div>
                          <div className="text-muted" style={{ fontSize:11 }}>Driver will attempt delivery again. Max 2 total.</div>
                        </div>
                      </div>
                      <div>
                        <label className="form-label fw-medium small">Re-attempt Notes <span className="text-muted">(e.g. customer said call first, available after 5pm)</span></label>
                        <textarea className="form-control" rows={2}
                          placeholder="e.g. Customer confirmed available after 5pm. Called and verified."
                          value={rescheduleNote} onChange={e => setRescheduleNote(e.target.value)}/>
                        <button className="btn btn-warning w-100 mt-2" onClick={rescheduleDelivery} disabled={!rescheduleNote}>
                          <i className="ri-calendar-line me-1"/>Confirm — Schedule New Attempt
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Option B: Cancel */}
                  <div className="border rounded p-3" style={{ borderColor: isFinal ? '#ef4444' : '#dee2e6', background: isFinal ? '#fff5f5' : '#fff' }}>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width:36, height:36, background:'#fee2e2' }}>
                        <i className="ri-close-circle-line" style={{ color:'#ef4444', fontSize:16 }}/>
                      </div>
                      <div>
                        <div className="fw-medium small text-danger">
                          {isFinal ? 'Cancel Order (Mandatory — 2 attempts exhausted)' : 'Cancel Order & Trigger Refund'}
                        </div>
                        <div className="text-muted" style={{ fontSize:11 }}>
                          Refund of <strong>{fmt(calcTotal(selected.items, selected.deliveryFee))}</strong> triggered via Paystack. Driver returns goods to store. Stock restored.
                        </div>
                      </div>
                    </div>

                    {/* Stock return steps */}
                    <div className="border rounded p-3 mb-3" style={{ background:'#fafafa', fontSize:12 }}>
                      <div className="fw-medium small mb-2 text-muted">Actions that will follow cancellation:</div>
                      {[
                        'Refund triggered via Paystack',
                        'Driver instructed to return goods to store',
                        'Admin / IMS checks goods back in',
                        'Stock quantities restored in system',
                      ].map((step, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 py-1">
                          <i className="ri-arrow-right-s-line text-muted"/>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium small">Cancellation Reason</label>
                      <textarea className="form-control" rows={2}
                        placeholder={isFinal ? 'Customer unreachable after 2 delivery attempts. Goods returned to store.' : 'Reason for cancellation...'}
                        value={cancelReason} onChange={e => setCancelReason(e.target.value)}/>
                    </div>
                    <button className="btn btn-danger w-100" onClick={cancelOrder} disabled={!cancelReason}>
                      <i className="ri-close-circle-line me-1"/>Cancel Order & Trigger Refund
                    </button>
                  </div>

                </div>
              </div>
            )
          })()}

        </div>
      )}
    </div>
  )
}
