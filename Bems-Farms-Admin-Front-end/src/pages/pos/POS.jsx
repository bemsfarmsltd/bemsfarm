import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// ── Categories & Definitions ────────────────────────────────────────────────
const CATEGORY_DEFINITIONS = [
  { id: 'all',        label: 'All Items',           emoji: '🛒', key: 'all' },
  { id: 'popular',    label: '⭐ Top Picks',          emoji: '⭐', key: 'popular' },
  { id: 'oils',       label: 'Oils & Sauces',       emoji: '🫒', key: 'oils' },
  { id: 'grains',     label: 'Grains & Flours',     emoji: '🌾', key: 'grains' },
  { id: 'seasoning',  label: 'Spices & Seasoning',  emoji: '🧂', key: 'seasoning' },
  { id: 'household',  label: 'Household & Soaps',   emoji: '🧼', key: 'household' },
  { id: 'canned',     label: 'Canned & Tomatoes',   emoji: '🥫', key: 'canned' },
  { id: 'beverages',  label: 'Drinks & Beverages',  emoji: '🧃', key: 'beverages' },
  { id: 'vegetables', label: 'Fresh Produce',       emoji: '🥬', key: 'vegetables' },
  { id: 'meat',       label: 'Meat & Seafood',      emoji: '🥩', key: 'meat' },
  { id: 'meals',      label: 'Cooked Meals',        emoji: '🍲', key: 'meals' },
  { id: 'dairy',      label: 'Dairy & Eggs',        emoji: '🥛', key: 'dairy' },
]

const CAT_COLORS = {
  all: '#10b981',
  popular: '#f59e0b',
  oils: '#d97706',
  grains: '#f59e0b',
  seasoning: '#ec4899',
  household: '#06b6d4',
  canned: '#ef4444',
  beverages: '#3b82f6',
  vegetables: '#10b981',
  meat: '#f43f5e',
  meals: '#8b5cf6',
  dairy: '#6366f1',
}

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Amara Obi',     phone: '0810 000 1234', tier: 'Platinum', points: 2450, wallet: 5000,  orders: 24 },
  { id: 2, name: 'Tunde Adeyemi', phone: '0802 345 6789', tier: 'Gold',     points: 1200, wallet: 1200,  orders: 12 },
  { id: 3, name: 'Mrs. Okonkwo',  phone: '0706 789 0123', tier: 'Platinum', points: 3800, wallet: 8500,  orders: 38 },
  { id: 4, name: 'Kemi Balogun',  phone: '0817 234 5678', tier: 'Silver',   points: 620,  wallet: 0,     orders: 4  },
  { id: 5, name: 'Seun Abiodun',  phone: '0803 456 7890', tier: 'Gold',     points: 1700, wallet: 3000,  orders: 17 },
]

const HISTORY_MOCK = [
  { inv: 'BF-INV-1023', cust: 'Walk-in',      method: 'Cash',       time: '10:45 AM', amount: 3500 },
  { inv: 'BF-INV-1024', cust: 'Amara Obi',    method: 'Transfer',   time: '11:10 AM', amount: 14200 },
  { inv: 'BF-INV-1025', cust: 'Mrs. Okonkwo', method: 'Card / POS', time: '12:05 PM', amount: 8750 },
  { inv: 'BF-INV-1026', cust: 'Walk-in',      method: 'Cash',       time: '01:20 PM', amount: 2400 },
  { inv: 'BF-INV-1027', cust: 'Tunde Adeyemi',method: 'QR / USSD',  time: '02:05 PM', amount: 6600 },
  { inv: 'BF-INV-1028', cust: 'Kemi Balogun', method: 'Card / POS', time: '02:40 PM', amount: 5100 },
]

const ONLINE_ORDERS = [
  {
    id: 'ORD-WEB-4421', channel: 'website', customer: 'Amara Obi', phone: '0810 000 1234',
    time: '09:14 AM', status: 'new', note: 'Please pack neatly, delivery by 12pm',
    items: [
      { productId: 1,  qty: 2 },
      { productId: 35, qty: 4 },
      { productId: 9,  qty: 1 },
    ],
  },
  {
    id: 'ORD-WA-4422', channel: 'whatsapp', customer: 'Mrs. Okonkwo', phone: '0706 789 0123',
    time: '10:02 AM', status: 'new', note: '',
    items: [
      { productId: 2, qty: 1 },
      { productId: 4, qty: 1 },
      { productId: 33,qty: 2 },
    ],
  },
  {
    id: 'ORD-IG-4423', channel: 'instagram', customer: 'Kemi Balogun', phone: '0817 234 5678',
    time: '10:45 AM', status: 'pending', note: 'Call before dispatch',
    items: [
      { productId: 16, qty: 2 },
      { productId: 19, qty: 1 },
      { productId: 28, qty: 1 },
    ],
  },
  {
    id: 'ORD-WEB-4424', channel: 'website', customer: 'Tunde Adeyemi', phone: '0802 345 6789',
    time: '11:30 AM', status: 'pending', note: '',
    items: [
      { productId: 13, qty: 2 },
      { productId: 15, qty: 1 },
      { productId: 37, qty: 3 },
    ],
  },
  {
    id: 'ORD-WA-4425', channel: 'whatsapp', customer: 'Seun Abiodun', phone: '0803 456 7890',
    time: '12:10 PM', status: 'new', note: 'Add extra pepper please',
    items: [
      { productId: 3, qty: 3 },
      { productId: 33,qty: 6 },
    ],
  },
]

const CHANNEL_META = {
  website:   { label: 'Website',   icon: 'ri-global-line',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  whatsapp:  { label: 'WhatsApp',  icon: 'ri-whatsapp-line',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  instagram: { label: 'Instagram', icon: 'ri-instagram-line', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  phone:     { label: 'Phone',     icon: 'ri-phone-line',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
}

const STATUS_META = {
  new:        { label: 'New Order',  color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  processing: { label: 'In Cart',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
}

const TIER_COLOR = {
  Platinum: { text: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' },
  Gold:     { text: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  Silver:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
  Bronze:   { text: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' }
}

const fmt = n => '₦' + Math.round(n || 0).toLocaleString()
const genOrderId = () => 'BF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5)

// Audio Beep Synthesizer for POS Scan & Actions
function playBeep(type = 'scan') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'scan') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    } else if (type === 'success') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.22)
    } else if (type === 'error') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
  } catch {
    // Audio muted if blocked
  }
}

// ── Smart Category / Icon Classifier ────────────────────────────────────────
function getProductCat(p) {
  const catName = (p.category || p.category_name || p.cat || '').toLowerCase()
  const name = (p.name || '').toLowerCase()

  if (catName.includes('oil') || catName.includes('sauce') || name.includes('oil') || name.includes('kings') || name.includes('emperor') || name.includes('mayonnaise') || name.includes('bama') || name.includes('whippy') || name.includes('vinegar') || name.includes('ketchup') || name.includes('butter')) return 'oils'
  if (catName.includes('grain') || catName.includes('flour') || catName.includes('carb') || name.includes('rice') || name.includes('bean') || name.includes('yam') || name.includes('poundo') || name.includes('plantain') || name.includes('semovita') || name.includes('wheat') || name.includes('flour') || name.includes('garri') || name.includes('cassava') || name.includes('potato') || name.includes('noodle') || name.includes('pasta') || name.includes('spaghetti') || name.includes('indomie') || name.includes('custard')) return 'grains'
  if (catName.includes('season') || catName.includes('spice') || name.includes('maggi') || name.includes('knorr') || name.includes('royco') || name.includes('salt') || name.includes('curry') || name.includes('thyme') || name.includes('crayfish') || name.includes('ginger') || name.includes('garlic')) return 'seasoning'
  if (catName.includes('soap') || catName.includes('clean') || catName.includes('detergent') || catName.includes('house') || name.includes('soap') || name.includes('mama') || name.includes('viva') || name.includes('so klin') || name.includes('detergent') || name.includes('hypo') || name.includes('ariel') || name.includes('bleach') || name.includes('tissue') || name.includes('sponge')) return 'household'
  if (catName.includes('can') || catName.includes('paste') || name.includes('tomato') || name.includes('tin') || name.includes('sardine') || name.includes('geisha') || name.includes('corned') || name.includes('gino') || name.includes('sonia') || name.includes('derica')) return 'canned'
  if (catName.includes('bev') || catName.includes('drink') || catName.includes('juice') || name.includes('milo') || name.includes('zobo') || name.includes('kunu') || name.includes('water') || name.includes('juice') || name.includes('tea') || name.includes('drink') || name.includes('chivita') || name.includes('coke') || name.includes('malt') || name.includes('milk') || name.includes('peak') || name.includes('dano') || name.includes('cowbell')) return 'beverages'
  if (catName.includes('veg') || catName.includes('fruit') || catName.includes('fresh') || name.includes('onion') || name.includes('spinach') || name.includes('efo') || name.includes('ugu') || name.includes('pepper') || name.includes('rodo') || name.includes('tatashe') || name.includes('carrot') || name.includes('cucumber') || name.includes('cabbage')) return 'vegetables'
  if (catName.includes('fish') || catName.includes('sea') || catName.includes('meat') || catName.includes('poultry') || name.includes('tilapia') || name.includes('catfish') || name.includes('mackerel') || name.includes('stockfish') || name.includes('goat') || name.includes('chicken') || name.includes('turkey') || name.includes('beef') || name.includes('prawn')) return 'meat'
  if (catName.includes('meal') || catName.includes('soup') || catName.includes('food') || name.includes('soup') || name.includes('jollof') || name.includes('fried rice') || name.includes('egusi') || name.includes('ofada') || name.includes('afang') || name.includes('banga')) return 'meals'
  if (catName.includes('dairy') || catName.includes('egg') || name.includes('egg') || name.includes('yogurt') || name.includes('cheese')) return 'dairy'
  return 'grains'
}

function getProductIcon(name = '', cat = '') {
  const n = name.toLowerCase()
  if (n.includes('oil') || n.includes('kings') || n.includes('emperor') || n.includes('mayonnaise') || n.includes('bama') || n.includes('whippy')) return '🫒'
  if (n.includes('rice') || n.includes('wheat') || n.includes('semovita') || n.includes('flour') || n.includes('garri')) return '🌾'
  if (n.includes('bean') || n.includes('oloyin')) return '🫘'
  if (n.includes('yam') || n.includes('poundo') || n.includes('cassava') || n.includes('potato')) return '🍠'
  if (n.includes('plantain') || n.includes('banana')) return '🍌'
  if (n.includes('soup') || n.includes('egusi') || n.includes('ofada') || n.includes('afang') || n.includes('banga')) return '🍲'
  if (n.includes('chicken') || n.includes('turkey') || n.includes('fowl')) return '🍗'
  if (n.includes('beef') || n.includes('meat') || n.includes('goat')) return '🥩'
  if (n.includes('fish') || n.includes('tilapia') || n.includes('catfish') || n.includes('mackerel') || n.includes('crayfish') || n.includes('prawn') || n.includes('stockfish')) return '🐟'
  if (n.includes('egg')) return '🥚'
  if (n.includes('milk') || n.includes('peak') || n.includes('dano') || n.includes('cowbell') || n.includes('yogurt') || n.includes('custard')) return '🥛'
  if (n.includes('tomato') || n.includes('tatashe') || n.includes('pepper') || n.includes('rodo') || n.includes('gino') || n.includes('derica')) return '🍅'
  if (n.includes('onion')) return '🧅'
  if (n.includes('spinach') || n.includes('efo') || n.includes('ugu') || n.includes('vegetable')) return '🥬'
  if (n.includes('salt') || n.includes('maggi') || n.includes('knorr') || n.includes('spice') || n.includes('seasoning')) return '🧂'
  if (n.includes('milo') || n.includes('beverage') || n.includes('juice') || n.includes('drink') || n.includes('zobo') || n.includes('water')) return '🧃'
  if (n.includes('soap') || n.includes('mama') || n.includes('viva') || n.includes('so klin') || n.includes('detergent') || n.includes('hypo')) return '🧼'
  return '🌾'
}

// ── Main POS Component ────────────────────────────────────────────────────────
export default function POS() {
  const { user } = useAuth()

  // ── Live Backend State ─────────────────────────────────────────────────────
  const [productsList, setProductsList] = useState([])
  const [customersList, setCustomersList] = useState(MOCK_CUSTOMERS)
  const [historyList, setHistoryList] = useState(HISTORY_MOCK)
  const [loadingPOS, setLoadingPOS] = useState(true)

  // Dynamic Lookup Maps
  const { byBarcode, bySku } = useMemo(() => {
    const bc = {}, sk = {}
    productsList.forEach(p => {
      if (p.barcode) bc[p.barcode.toUpperCase()] = p
      if (p.sku) sk[p.sku.toUpperCase()] = p
    })
    return { byBarcode: bc, bySku: sk }
  }, [productsList])

  // UI State
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]                 = useState('')
  const [toast, setToast]                   = useState(null)
  const [toastTimer, setToastTimer]         = useState(null)

  // Online orders
  const [onlineOrders, setOnlineOrders]     = useState(ONLINE_ORDERS)
  const [onlineFilter, setOnlineFilter]     = useState('all')
  const [expandedOrder, setExpandedOrder]   = useState(null)

  // Customer
  const [customer, setCustomer]             = useState(null)
  const [custSearch, setCustSearch]         = useState('')
  const [showCustPanel, setShowCustPanel]   = useState(false)

  // Cart
  const [cart, setCart]                     = useState([])
  const [discountPct, setDiscountPct]       = useState(0)
  const [orderNote, setOrderNote]           = useState('')
  const [highlightId, setHighlightId]       = useState(null)

  // Held orders
  const [heldOrders, setHeldOrders]         = useState([])
  const [orderId, setOrderId]               = useState(genOrderId)

  // Modals
  const [activeModal, setActiveModal]       = useState(null)
  const closeModal = () => setActiveModal(null)

  // Scanner basket modal
  const [scanCart, setScanCart]             = useState([])
  const [scanCode, setScanCode]             = useState('')
  const scanModalInputRef                   = useRef(null)

  // Cash modal
  const [cashReceived, setCashReceived]     = useState('')
  // Card modal
  const [cardTab, setCardTab]               = useState('visa')
  // Transfer modal
  const [bankName, setBankName]             = useState('')
  const [txnRef, setTxnRef]                 = useState('')
  const [transferDate, setTransferDate]     = useState('')
  // Split modal
  const [splitRows, setSplitRows]           = useState([
    { method: 'Cash',          amount: '' },
    { method: 'Bank Transfer', amount: '' },
  ])
  // Hold modal
  const [holdRef, setHoldRef]               = useState('')
  const [holdNote, setHoldNote]             = useState('')
  // Pay later modal
  const [payLaterCust, setPayLaterCust]     = useState('')
  const [payLaterDate, setPayLaterDate]     = useState('')
  // Success data
  const [successData, setSuccessData]       = useState(null)

  // Goods Return modal
  const POS_RETURN_REASONS = [
    'Damaged on delivery',
    'Wrong item sent',
    'Quality below standard',
    'Spoiled / Already expired',
    'Item missing from order',
    'Incorrect quantity',
    'Customer changed mind',
    'Packaging damaged'
  ]
  const [returnForm, setReturnForm] = useState({
    customer: 'Walk-in', phone: '', product: null, qty: 1, unitPrice: 0,
    reason: POS_RETURN_REASONS[0], notes: '', condition: 'resalable', refundMethod: 'Cash',
  })
  const [returnStep, setReturnStep]         = useState(1)
  const [returnLogs, setReturnLogs]         = useState([])
  const [returnSuccess, setReturnSuccess]   = useState(null)

  const scanInputRef = useRef(null)

  // ── Load Live Backend Data ─────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    async function loadPOSData() {
      setLoadingPOS(true)
      try {
        let prods = []
        try {
          const res = await api.get('/products?limit=250')
          prods = res.data?.products || res.data?.data || res.data || []
        } catch {
          try {
            const raw = await fetch('/api/products?limit=250')
            const json = await raw.json()
            prods = json.products || json.data || []
          } catch {
            const res = await api.get('/admin/pos/products?limit=250').catch(() => null)
            prods = res?.data?.products || res?.data || []
          }
        }

        if (Array.isArray(prods) && prods.length > 0 && isMounted) {
          const mapped = prods.map(p => {
            const rawPrice = Number(p.price || p.unit_price || 0)
            const sanitizedPrice = rawPrice >= 500000 ? Math.round(rawPrice / 1500) : Math.round(rawPrice)
            return {
              id: p.id,
              barcode: p.barcode || `BF-${p.sku || p.id}`,
              sku: p.sku || `SKU-${p.id}`,
              name: p.name,
              cat: getProductCat(p),
              price: sanitizedPrice,
              stock: p.stock != null ? Number(p.stock) : (p.stock_quantity != null ? Number(p.stock_quantity) : 25),
              unit: p.unit || 'unit',
              image: p.image_url || p.image || null,
              icon: p.icon || getProductIcon(p.name, p.category || p.cat)
            }
          })
          setProductsList(mapped)
          setReturnForm(f => ({
            ...f,
            product: f.product || mapped[0],
            unitPrice: f.unitPrice || mapped[0]?.price || 0
          }))
        }
      } catch (e) {
        console.warn('Live products fallback', e)
      }

      try {
        const custRes = await api.get('/admin/pos/customers').catch(() => api.get('/admin/customers'))
        const custs = custRes?.data?.customers || custRes?.data || []
        if (Array.isArray(custs) && custs.length > 0 && isMounted) {
          const mappedCusts = custs.map(c => ({
            id: c.id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Customer',
            phone: c.phone || '—',
            tier: c.tier || 'Silver',
            points: c.loyalty_points || 0,
            wallet: c.wallet_balance || 0,
            orders: c.total_orders || 0
          }))
          setCustomersList(mappedCusts)
        }
      } catch (e) {
        console.warn('Live customers fallback', e)
      }

      try {
        const ordRes = await api.get('/admin/orders?status=pending&limit=15').catch(() => null)
        const ords = ordRes?.data?.orders || []
        if (Array.isArray(ords) && ords.length > 0 && isMounted) {
          const mappedOrders = ords.map(o => ({
            id: o.order_ref || `ORD-${o.id}`,
            channel: o.channel || 'website',
            customer: o.customer_name || `${o.user?.first_name || ''} ${o.user?.last_name || ''}`.trim() || 'Online Customer',
            phone: o.customer_phone || o.phone || '—',
            time: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            status: o.status || 'pending',
            note: o.delivery_note || o.notes || '',
            items: (o.items || []).map(it => ({
              productId: it.product_id,
              qty: it.quantity || 1
            }))
          }))
          setOnlineOrders(mappedOrders)
        }
      } catch (e) {
        console.warn('Live online orders fallback', e)
      }

      try {
        const rcptRes = await api.get('/admin/pos/receipts').catch(() => null)
        const rcpts = rcptRes?.data?.receipts || []
        if (Array.isArray(rcpts) && rcpts.length > 0 && isMounted) {
          const mappedHistory = rcpts.map(r => ({
            inv: r.order_ref || `INV-${r.id}`,
            cust: r.customer_name || 'Walk-in',
            method: r.payment_method || 'Cash',
            time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            amount: Number(r.total_amount || r.total || 0)
          }))
          setHistoryList(mappedHistory)
        }
      } catch (e) {
        console.warn('Live POS receipts fallback', e)
      }

      if (isMounted) setLoadingPOS(false)
    }

    loadPOSData()
    return () => { isMounted = false }
  }, [])

  // ── Toast Helper ───────────────────────────────────────────────────────────
  function showToast(msg, type = 'success', icon = '✅') {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ msg, type, icon })
    setToastTimer(setTimeout(() => setToast(null), 2400))
  }

  // ── Cart & Product Methods ─────────────────────────────────────────────────
  function addProductToCart(product) {
    playBeep('scan')
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) {
        showToast(`${product.name} (Qty ${ex.qty + 1})`, 'success', product.icon || '🌾')
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      showToast(`${product.name} added`, 'success', product.icon || '🌾')
      return [...prev, { ...product, qty: 1, note: '' }]
    })
    setHighlightId(product.id)
    setTimeout(() => setHighlightId(null), 500)
  }

  function updateQty(id, qty) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id))
      return
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  function updateNote(id, note) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i))
  }

  function clearCart() {
    setCart([])
    setDiscountPct(0)
    setOrderNote('')
    setCustomer(null)
    setOrderId(genOrderId())
    setCashReceived('')
  }

  // ── Barcode Scanner Hardware Listener ──────────────────────────────────────
  const scanBuffer  = useRef('')
  const lastKeyTime = useRef(0)
  const onScanRef   = useRef(null)

  const handleBarcodeScan = useCallback((code) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = byBarcode[trimmed] || byBarcode['BF-' + trimmed] || bySku[trimmed]
    if (!product) {
      playBeep('error')
      showToast(`Item not found: ${trimmed}`, 'error', '❌')
      return
    }
    addProductToCart(product)
    setSearch('')
    if (scanInputRef.current) scanInputRef.current.focus()
  }, [byBarcode, bySku])

  onScanRef.current = handleBarcodeScan

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const id  = document.activeElement?.id
      const isInput = (tag === 'input' || tag === 'textarea') && id !== 'scan-field'

      if (e.key === 'F1') {
        e.preventDefault()
        scanInputRef.current?.focus()
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        setShowCustPanel(p => !p)
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setActiveModal('online')
        return
      }
      if (e.key === 'F4') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('hold')
        return
      }
      if (e.key === 'F8') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('cash')
        return
      }
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('card')
        return
      }
      if (e.key === 'Escape') {
        if (activeModal) {
          closeModal()
        } else if (search) {
          setSearch('')
        }
        return
      }

      if (isInput) return

      const now = Date.now()
      if (e.key === 'Enter') {
        if (scanBuffer.current.length >= 3) {
          onScanRef.current(scanBuffer.current)
        }
        scanBuffer.current = ''
        return
      }
      if (e.key.length === 1) {
        if (now - lastKeyTime.current > 300) scanBuffer.current = ''
        scanBuffer.current += e.key
        lastKeyTime.current = now
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeModal, search, cart.length])

  useEffect(() => {
    document.body.classList.add('sidebar-hidden')
    return () => document.body.classList.remove('sidebar-hidden')
  }, [])

  // ── Scanner basket helpers ─────────────────────────────────────────────────
  function scannerAddProduct(code) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = byBarcode[trimmed] || byBarcode['BF-' + trimmed] || bySku[trimmed]
    if (!product) {
      playBeep('error')
      showToast(`Item not found: ${trimmed}`, 'error', '❌')
      return
    }
    playBeep('scan')
    setScanCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    showToast(`${product.name} scanned`, 'success', product.icon || '🌾')
    setScanCode('')
    setTimeout(() => scanModalInputRef.current?.focus(), 50)
  }

  function scannerUpdateQty(id, qty) {
    if (qty <= 0) {
      setScanCart(prev => prev.filter(i => i.id !== id))
      return
    }
    setScanCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  function scannerAddToOrder() {
    scanCart.forEach(item => {
      setCart(prev => {
        const ex = prev.find(i => i.id === item.id)
        if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i)
        return [...prev, { ...item, note: '' }]
      })
    })
    playBeep('success')
    showToast(`${scanCart.length} item(s) merged into order`, 'success', '🛒')
    setScanCart([])
    closeModal()
  }

  function scannerQuickPay() {
    scannerAddToOrder()
    setTimeout(() => setActiveModal('cash'), 60)
  }

  // ── Online orders → cart ───────────────────────────────────────────────────
  function loadOnlineOrderToCart(order) {
    let loaded = 0
    order.items.forEach(({ productId, qty }) => {
      const product = productsList.find(p => p.id === productId)
      if (!product) return
      setCart(prev => {
        const ex = prev.find(i => i.id === product.id)
        if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
        return [...prev, { ...product, qty, note: '' }]
      })
      loaded++
    })
    const matched = customersList.find(c => c.name === order.customer)
    if (matched) setCustomer(matched)
    setOnlineOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'processing' } : o))
    playBeep('success')
    showToast(`${loaded} item(s) loaded from ${order.id}`, 'success', '📥')
    closeModal()
  }

  // ── Order Holding ──────────────────────────────────────────────────────────
  function doHold() {
    if (cart.length === 0) return
    setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote, ref: holdRef, note: holdNote }])
    showToast(`Order held · ${holdRef || orderId}`, 'info', '⏸️')
    setHoldRef('')
    setHoldNote('')
    closeModal()
    clearCart()
  }

  function recallOrder(idx) {
    const held = heldOrders[idx]
    if (cart.length > 0) {
      setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote }])
    }
    setCart(held.cart)
    setCustomer(held.customer)
    setDiscountPct(held.discountPct)
    setOrderNote(held.orderNote)
    setOrderId(held.orderId)
    setHeldOrders(prev => prev.filter((_, i) => i !== idx))
    playBeep('success')
    showToast(`Order ${held.orderId} recalled`, 'success', '▶️')
  }

  // ── Financial Totals ───────────────────────────────────────────────────────
  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = Math.round(subtotal * discountPct / 100)
  const taxable     = subtotal - discountAmt
  const vat         = Math.round(taxable * 0.075)
  const total       = taxable + vat
  const itemCount   = cart.reduce((s, i) => s + i.qty, 0)
  const cashChange  = cashReceived ? Math.max(0, Number(cashReceived) - total) : 0

  // ── Dynamic Quick Cash Presets ─────────────────────────────────────────────
  const quickCashOptions = useMemo(() => {
    if (total <= 0) return [500, 1000, 2000, 5000, 10000]
    const opts = new Set()
    opts.add(total)

    const next1k = Math.ceil(total / 1000) * 1000
    if (next1k > total) opts.add(next1k)

    const next5k = Math.ceil(total / 5000) * 5000
    if (next5k > total) opts.add(next5k)

    const next10k = Math.ceil(total / 10000) * 10000
    if (next10k > total) opts.add(next10k)

    if (total < 10000) opts.add(10000)
    if (total < 20000) opts.add(20000)
    if (total < 50000) opts.add(50000)

    return Array.from(opts).sort((a, b) => a - b).slice(0, 6)
  }, [total])

  // ── Live Server Sale Execution ─────────────────────────────────────────────
  async function confirmPayment(method) {
    let finalOrderId = orderId
    try {
      const payload = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.qty,
          unit_price: item.price
        })),
        customer_id: customer?.id || null,
        customer_name: customer?.name || 'Walk-in Customer',
        payment_method: method === 'Split' ? 'Split Payment' : (method || 'Cash'),
        amount_tendered: method === 'Cash' ? (Number(cashReceived) || total) : total,
        discount_amount: discountAmt,
        notes: orderNote || undefined,
        split_payments: method === 'Split'
          ? splitRows.filter(r => r.amount > 0).map(r => ({ method: r.method, amount: Number(r.amount) }))
          : undefined
      }

      const res = await api.post('/admin/pos/sale', payload)
      if (res.data?.order?.order_ref || res.data?.invoice?.invoice_ref) {
        finalOrderId = res.data.order?.order_ref || res.data.invoice?.invoice_ref
      }
      playBeep('success')
      showToast('Sale recorded on server!', 'success', '✅')
    } catch (err) {
      console.warn('POS sale API offline or errored, recorded locally:', err)
      playBeep('success')
      showToast('Sale recorded locally', 'success', '✅')
    }

    setSuccessData({
      orderId: finalOrderId,
      customer,
      cart: [...cart],
      subtotal,
      discountAmt,
      vat,
      total,
      discountPct,
      method,
      amountTendered: method === 'Cash' ? (Number(cashReceived) || total) : total,
      change: method === 'Cash' ? cashChange : 0,
      paidAt: new Date()
    })

    setHistoryList(prev => [
      {
        inv: finalOrderId,
        cust: customer?.name || 'Walk-in',
        method,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: total
      },
      ...prev
    ])

    closeModal()
    setTimeout(() => setActiveModal('success'), 80)
  }

  function newOrder() {
    closeModal()
    clearCart()
  }

  // ── Dynamic Category Counts & Filtering ────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts = { all: productsList.length, popular: Math.min(12, productsList.length) }
    CATEGORY_DEFINITIONS.forEach(c => {
      if (c.id !== 'all' && c.id !== 'popular') {
        counts[c.id] = productsList.filter(p => p.cat === c.id).length
      }
    })
    return counts
  }, [productsList])

  const filteredProducts = useMemo(() => {
    let list = productsList
    if (activeCategory === 'popular') {
      list = productsList.slice(0, 12)
    } else if (activeCategory !== 'all') {
      list = productsList.filter(p => p.cat === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeCategory, search, productsList])

  const filteredCustomers = custSearch.trim()
    ? customersList.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(custSearch))
      )
    : customersList

  // ── Clock ──────────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Split Helpers ──────────────────────────────────────────────────────────
  function addSplitRow() {
    setSplitRows(r => [...r, { method: 'Cash', amount: '' }])
  }
  function updateSplit(i, field, val) {
    setSplitRows(r => r.map((row, ri) => ri === i ? { ...row, [field]: val } : row))
  }

  // ── UI Render ──────────────────────────────────────────────────────────────
  return (
    <div className="pos-master-container">

      {/* ═══ TOPBAR / HEADER ═════════════════════════════════════════════ */}
      <header className="pos-topbar">
        {/* Brand & Status */}
        <div className="pos-brand-group">
          <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="pos-logo-img" />
          <div className="pos-status-pill">
            <span className="pos-status-dot"></span>
            <span className="pos-status-text">FLAGSHIP TERMINAL</span>
          </div>
        </div>

        {/* Global Omnibar / Barcode Scanner */}
        <div className="pos-omnibar-wrapper">
          <i className="ri-search-line pos-search-icon"></i>
          <input
            id="scan-field"
            ref={scanInputRef}
            type="text"
            className="pos-omnibar-input"
            placeholder="Scan barcode [F1] or search grocery items (Rice, Oil, Soap)..."
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim()) {
                handleBarcodeScan(search)
              }
            }}
          />
          {search ? (
            <button onClick={() => setSearch('')} className="pos-clear-btn">✕</button>
          ) : (
            <div className="pos-hotkey-badge">
              <i className="ri-barcode-line"></i>
              <span>F1 SCAN</span>
            </div>
          )}
        </div>

        {/* Right HUD: Held, Time, Exit, Cashier */}
        <div className="pos-header-actions">
          {heldOrders.length > 0 && (
            <button onClick={() => recallOrder(0)} className="pos-held-btn">
              <i className="ri-pause-circle-fill"></i>
              <span>{heldOrders.length} HELD</span>
            </button>
          )}

          <div className="pos-clock-widget">
            <div className="pos-time">{now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div className="pos-date">{now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>

          <Link to="/dashboard" className="pos-exit-btn">
            <i className="ri-dashboard-2-line"></i>
            <span>Exit</span>
          </Link>

          <div
            className="pos-cashier-avatar"
            title={`Active Cashier: ${user ? `${user.first_name || ''} ${user.last_name || ''}` : 'Admin'}`}>
            {user ? (user.first_name?.[0] || 'B') + (user.last_name?.[0] || 'F') : 'BF'}
          </div>
        </div>
      </header>

      {/* ═══ WORKSPACE BODY ═══════════════════════════════════════════════ */}
      <div className="pos-main-body">

        {/* ─── LEFT: CATALOG & ACTIONS ─────────────────────────────────── */}
        <div className="pos-catalog-panel">

          {/* Action Strip: Scan Basket, Online Orders, Goods Return */}
          <div className="pos-action-strip">
            {/* Scan Basket */}
            <button
              onClick={() => { setScanCart([]); setScanCode(''); setActiveModal('scanner') }}
              className="pos-action-card pos-card-scan">
              <div className="pos-action-icon pos-icon-emerald">
                <i className="ri-barcode-box-line"></i>
              </div>
              <div className="pos-action-meta">
                <div className="pos-action-title">Scan Basket</div>
                <div className="pos-action-sub">Batch Barcode Scanner</div>
              </div>
              <span className="pos-action-tag">F1</span>
            </button>

            {/* Online Orders */}
            {(() => {
              const newCount = onlineOrders.filter(o => o.status === 'new').length
              return (
                <button
                  onClick={() => setActiveModal('online')}
                  className="pos-action-card pos-card-online">
                  <div className="pos-action-icon pos-icon-sapphire">
                    <i className="ri-shopping-bag-3-line"></i>
                  </div>
                  <div className="pos-action-meta">
                    <div className="pos-action-title">Online Orders</div>
                    <div className="pos-action-sub">Web & WhatsApp</div>
                  </div>
                  {newCount > 0 ? (
                    <span className="pos-badge-new">{newCount} NEW</span>
                  ) : (
                    <span className="pos-action-tag">F3</span>
                  )}
                </button>
              )
            })()}

            {/* Goods Return */}
            <button
              onClick={() => {
                setReturnForm(f => ({
                  ...f,
                  product: productsList[0] || null,
                  unitPrice: productsList[0]?.price || 0,
                  qty: 1,
                  customer: 'Walk-in',
                  phone: '',
                  notes: '',
                  condition: 'resalable',
                  refundMethod: 'Cash',
                  reason: POS_RETURN_REASONS[0]
                }))
                setReturnStep(1)
                setReturnSuccess(null)
                setActiveModal('return')
              }}
              className="pos-action-card pos-card-return">
              <div className="pos-action-icon pos-icon-rose">
                <i className="ri-arrow-go-back-line"></i>
              </div>
              <div className="pos-action-meta">
                <div className="pos-action-title">Goods Return</div>
                <div className="pos-action-sub">Customer Refund Desk</div>
              </div>
              {returnLogs.length > 0 && (
                <span className="pos-badge-return">{returnLogs.length}</span>
              )}
            </button>
          </div>

          {/* Category Filter Pills with Item Counters */}
          <div className="pos-category-bar">
            {CATEGORY_DEFINITIONS.map(cat => {
              const active = activeCategory === cat.id
              const count = categoryCounts[cat.id] || 0
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`pos-category-pill ${active ? 'active' : ''}`}>
                  <span className="pos-cat-emoji">{cat.emoji}</span>
                  <span className="pos-cat-label">{cat.label}</span>
                  <span className="pos-cat-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Product Grid */}
          <div className="pos-product-scroll">
            {loadingPOS ? (
              <div className="pos-empty-state">
                <div className="spinner-border text-emerald mb-3" role="status" style={{ width: 42, height: 42, color: '#10b981' }}></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Syncing PostgreSQL Live Catalog...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty-state">
                <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>No matching items found</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Try searching for rice, oil, soap, or custard</div>
                <button
                  className="btn btn-emerald mt-3"
                  onClick={() => { setSearch(''); setActiveCategory('all') }}>
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="pos-product-grid">
                {filteredProducts.map(p => {
                  const color = CAT_COLORS[p.cat] || '#10b981'
                  const inCart = cart.find(i => i.id === p.id)
                  const isLowStock = p.stock > 0 && p.stock <= 5

                  return (
                    <div
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      className={`pos-product-card ${inCart ? 'in-cart' : ''}`}
                      style={{ '--accent': color }}>
                      {/* Top Badges */}
                      <div className="pos-card-header">
                        <span className={`pos-stock-pill ${isLowStock ? 'low' : ''}`}>
                          {isLowStock ? `LOW (${p.stock})` : (p.stock > 0 ? `${p.stock} in stock` : 'In Stock')}
                        </span>
                        {inCart && (
                          <span className="pos-cart-badge">{inCart.qty}</span>
                        )}
                      </div>

                      {/* Photo or Studio Emoji */}
                      <div className="pos-img-container">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="pos-product-photo"
                            onError={e => {
                              e.target.style.display = 'none'
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'
                            }}
                          />
                        ) : null}
                        <span className="pos-product-fallback-icon" style={{ display: p.image ? 'none' : 'block' }}>
                          {p.icon || getProductIcon(p.name, p.cat)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="pos-card-info">
                        <div className="pos-card-name" title={p.name}>{p.name}</div>
                        <div className="pos-card-sku">{p.sku} · per {p.unit}</div>
                      </div>

                      {/* Price & On-Card Stepper */}
                      <div className="pos-card-bottom">
                        <div className="pos-card-price">{fmt(p.price)}</div>

                        {inCart ? (
                          <div className="pos-oncard-stepper" onClick={e => e.stopPropagation()}>
                            <button onClick={() => updateQty(p.id, inCart.qty - 1)} className="pos-stepper-btn">−</button>
                            <span className="pos-stepper-val">{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, inCart.qty + 1)} className="pos-stepper-btn add">+</button>
                          </div>
                        ) : (
                          <div className="pos-add-icon">
                            <i className="ri-add-line"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: DIGITAL CHECKOUT TERMINAL ─────────────────────────── */}
        <div className="pos-checkout-sidebar">

          {/* Held Orders Quick Strip */}
          {heldOrders.length > 0 && (
            <div className="pos-held-strip">
              <span className="pos-held-title">HELD:</span>
              {heldOrders.map((h, i) => (
                <button key={i} onClick={() => recallOrder(i)} className="pos-held-pill">
                  #{i + 1} · {fmt(h.cart.reduce((s, ci) => s + ci.price * ci.qty, 0))}
                </button>
              ))}
            </div>
          )}

          {/* Order Header & Customer Selector Trigger */}
          <div className="pos-order-header">
            <div>
              <div className="pos-order-ref">{orderId}</div>
              <div className="pos-order-count">{itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</div>
            </div>

            <div className="pos-header-btns">
              <button
                onClick={() => setShowCustPanel(!showCustPanel)}
                className={`pos-cust-btn ${customer ? 'active' : ''}`}>
                <i className="ri-user-3-line"></i>
                <span>{customer ? customer.name.split(' ')[0] : 'Customer [F2]'}</span>
              </button>

              {cart.length > 0 && (
                <button onClick={clearCart} className="pos-clear-cart-btn">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection Drawer */}
          {showCustPanel && (
            <div className="pos-cust-drawer">
              <input
                type="text"
                className="pos-cust-input"
                placeholder="Search registered customer..."
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
                autoFocus
              />
              <div className="pos-cust-list">
                {filteredCustomers.map(c => {
                  const tierMeta = TIER_COLOR[c.tier] || TIER_COLOR.Silver
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                      className={`pos-cust-item ${customer?.id === c.id ? 'selected' : ''}`}>
                      <div>
                        <div className="pos-cust-name">{c.name}</div>
                        <div className="pos-cust-phone">{c.phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="pos-tier-pill" style={{ color: tierMeta.text, background: tierMeta.bg, border: `1px solid ${tierMeta.border}` }}>
                          {c.tier}
                        </span>
                        <div className="pos-points-text">{c.points.toLocaleString()} pts</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {customer && (
                <button onClick={() => { setCustomer(null); setShowCustPanel(false) }} className="pos-remove-cust-btn">
                  Switch to Walk-in Customer
                </button>
              )}
            </div>
          )}

          {/* Active Customer Badge Strip */}
          {customer && !showCustPanel && (
            <div className="pos-active-cust-strip">
              <div className="pos-cust-avatar" style={{ background: TIER_COLOR[customer.tier]?.text || '#10b981' }}>
                {customer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div className="pos-active-name">{customer.name}</div>
                <div className="pos-active-sub">
                  <span style={{ color: TIER_COLOR[customer.tier]?.text || '#10b981', fontWeight: 800 }}>{customer.tier}</span>
                  {' · '}{customer.points.toLocaleString()} pts
                  {' · '}<span style={{ color: '#10b981', fontWeight: 700 }}>Wallet {fmt(customer.wallet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cart Item Rows */}
          <div className="pos-cart-items-scroll">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <div style={{ fontSize: 46, marginBottom: 12 }}>🛒</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Cart is Ready</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Scan or select grocery items to tender</div>
                <div className="pos-scanner-tip">
                  ⚡ Physical USB scanners auto-register in real-time
                </div>
              </div>
            ) : (
              cart.map(item => {
                const color = CAT_COLORS[item.cat] || '#10b981'
                const isHighlit = highlightId === item.id

                return (
                  <div key={item.id} className={`pos-cart-row ${isHighlit ? 'highlight' : ''}`} style={{ '--item-accent': color }}>
                    <div className="pos-row-top">
                      <span className="pos-row-icon">{item.icon}</span>
                      <div className="pos-row-details">
                        <div className="pos-row-name">{item.name}</div>
                        <div className="pos-row-rate">{fmt(item.price)} / {item.unit}</div>
                      </div>

                      {/* Stepper */}
                      <div className="pos-row-stepper">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="pos-step-btn">−</button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateQty(item.id, parseInt(e.target.value) || 1)}
                          className="pos-step-input"
                        />
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="pos-step-btn">+</button>
                      </div>

                      {/* Total & Delete */}
                      <div className="pos-row-total-group">
                        <div className="pos-row-total">{fmt(item.price * item.qty)}</div>
                        <button onClick={() => updateQty(item.id, 0)} className="pos-row-del">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>

                    {/* Item Note */}
                    <input
                      type="text"
                      placeholder="+ Add packing note..."
                      value={item.note || ''}
                      onChange={e => updateNote(item.id, e.target.value)}
                      className="pos-row-note"
                    />
                  </div>
                )
              })
            )}
          </div>

          {/* Order Note */}
          {cart.length > 0 && (
            <div className="pos-order-note-wrapper">
              <input
                type="text"
                placeholder="📝 Order dispatch note / instructions..."
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                className="pos-order-note-input"
              />
            </div>
          )}

          {/* Discount Preset Chips */}
          <div className="pos-discount-bar">
            <span className="pos-discount-label">Discount:</span>
            {[0, 5, 10, 15, 20].map(d => (
              <button
                key={d}
                onClick={() => setDiscountPct(d)}
                className={`pos-discount-chip ${discountPct === d ? 'active' : ''}`}>
                {d === 0 ? 'None' : `${d}%`}
              </button>
            ))}
          </div>

          {/* Glowing Digital HUD & Total Screen */}
          <div className="pos-hud-screen">
            <div className="pos-hud-row">
              <span>Subtotal ({itemCount} items)</span>
              <strong>{fmt(subtotal)}</strong>
            </div>

            {discountPct > 0 && (
              <div className="pos-hud-row discount">
                <span>Discount ({discountPct}%)</span>
                <strong>− {fmt(discountAmt)}</strong>
              </div>
            )}

            <div className="pos-hud-row">
              <span>VAT (7.5%)</span>
              <strong>{fmt(vat)}</strong>
            </div>

            <div className="pos-hud-total-banner">
              <div>
                <span className="pos-total-title">Total Payable</span>
                <div className="pos-total-sub">TAX INCLUSIVE</div>
              </div>
              <span className="pos-total-amount">{fmt(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector (1-Tap Tender) */}
          <div className="pos-payment-deck">
            <div className="pos-deck-header">
              <span className="pos-deck-title">SELECT PAYMENT METHOD</span>
              <span className="pos-deck-hotkey">Hotkeys: [F8] Cash · [F9] Card</span>
            </div>

            <div className="pos-payment-grid">
              {[
                { id: 'cash',     label: 'Cash [F8]',       icon: 'ri-money-dollar-circle-line', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                { id: 'card',     label: 'Card / POS [F9]', icon: 'ri-bank-card-line',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
                { id: 'transfer', label: 'Bank Transfer',   icon: 'ri-bank-line',                color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                { id: 'qr',       label: 'QR / USSD',       icon: 'ri-qr-code-line',             color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'  },
                { id: 'split',    label: 'Split Tender',    icon: 'ri-layout-column-line',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
              ].map(m => (
                <button
                  key={m.id}
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (cart.length > 0) {
                      if (m.id === 'cash') setCashReceived(String(total))
                      setActiveModal(m.id)
                    }
                  }}
                  className="pos-pay-btn"
                  style={{ '--btn-color': m.color, '--btn-bg': m.bg }}>
                  <div className="pos-pay-icon">
                    <i className={m.icon}></i>
                  </div>
                  <div className="pos-pay-label">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Utility Bar: Hold, Invoice, Pay Later, History */}
          <div className="pos-utility-bar">
            {[
              { label: 'Hold [F4]', icon: 'ri-pause-circle-line',   color: '#10b981', modal: 'hold' },
              { label: 'Invoice',   icon: 'ri-file-text-line',      color: '#f43f5e', modal: 'invoice' },
              { label: 'Pay Later', icon: 'ri-time-line',           color: '#f59e0b', modal: 'paylater' },
              { label: 'Receipts',  icon: 'ri-folder-history-line', color: '#3b82f6', modal: 'history' },
            ].map(b => (
              <button
                key={b.label}
                disabled={b.modal === 'hold' && cart.length === 0}
                onClick={() => setActiveModal(b.modal)}
                className="pos-util-btn">
                <span className="pos-util-icon-bg" style={{ background: b.color + '20' }}>
                  <i className={b.icon} style={{ color: b.color }}></i>
                </span>
                <span className="pos-util-label">{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODALS & WORKFLOWS ═══════════════════════════════════════════ */}
      {activeModal && activeModal !== 'success' && (
        <div className="modal-backdrop show pos-modal-backdrop" onClick={closeModal} />
      )}

      {/* ─── Scanner Basket Modal ───────────────────────────────────────── */}
      {activeModal === 'scanner' && (() => {
        const scSub   = scanCart.reduce((s, i) => s + i.price * i.qty, 0)
        const scVat   = Math.round(scSub * 0.075)
        const scTotal = scSub + scVat

        return (
          <div className="modal show d-block pos-modal-container" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 760 }}>
              <div className="modal-content pos-glass-modal">
                <div className="modal-header pos-modal-header emerald">
                  <div className="d-flex align-items-center gap-3">
                    <div className="pos-modal-header-icon">🛒</div>
                    <div>
                      <h5 className="modal-title mb-0 text-white fw-bold">Scan Basket Terminal</h5>
                      <div className="pos-modal-header-sub">High-Speed Barcode Checkout · Type or Scan + Enter</div>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => { setScanCart([]); closeModal() }}></button>
                </div>

                <div className="modal-body p-0">
                  <div className="p-3 border-bottom border-secondary-subtle" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-emerald text-white border-0">
                        <i className="ri-barcode-line fs-20"></i>
                      </span>
                      <input
                        ref={scanModalInputRef}
                        type="text"
                        className="form-control"
                        placeholder="Scan barcode or SKU + Enter..."
                        value={scanCode}
                        autoFocus
                        autoComplete="off"
                        onChange={e => setScanCode(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') scannerAddProduct(scanCode)
                        }}
                      />
                      <button className="btn btn-emerald px-4 fw-bold" onClick={() => scannerAddProduct(scanCode)}>
                        <i className="ri-add-line me-1"></i> Add
                      </button>
                    </div>
                  </div>

                  <div style={{ minHeight: 260, maxHeight: '45vh', overflowY: 'auto', padding: '8px 16px' }}>
                    {scanCart.length === 0 ? (
                      <div className="pos-empty-state">
                        <div style={{ fontSize: 54, marginBottom: 10 }}>📦</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>No items in scanner basket</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Point barcode scanner at physical products</div>
                      </div>
                    ) : (
                      scanCart.map(item => (
                        <div key={item.id} className="pos-scan-item-row">
                          <span className="fs-24">{item.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div className="fw-bold text-white fs-14">{item.name}</div>
                            <div className="text-muted fs-11">{item.sku} · {fmt(item.price)} / {item.unit}</div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => scannerUpdateQty(item.id, item.qty - 1)}>−</button>
                            <span className="fw-bold px-2 text-white">{item.qty}</span>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => scannerUpdateQty(item.id, item.qty + 1)}>+</button>
                          </div>
                          <div className="fw-bold text-emerald fs-15 text-end" style={{ minWidth: 90 }}>
                            {fmt(item.price * item.qty)}
                          </div>
                          <button className="btn btn-link text-danger p-0 ms-2" onClick={() => scannerUpdateQty(item.id, 0)}>
                            <i className="ri-delete-bin-line fs-18"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {scanCart.length > 0 && (
                    <div className="p-4 border-top border-secondary-subtle" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="d-flex justify-content-between mb-2 fs-13 text-muted">
                        <span>Subtotal ({scanCart.reduce((s, i) => s + i.qty, 0)} items)</span>
                        <span>{fmt(scSub)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3 fs-13 text-muted">
                        <span>VAT (7.5%)</span>
                        <span>{fmt(scVat)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-4">
                        <span className="fw-bold fs-18 text-white">Total Payable</span>
                        <span className="fw-bolder fs-24 text-emerald">{fmt(scTotal)}</span>
                      </div>
                      <div className="d-flex gap-3">
                        <button className="btn btn-outline-emerald flex-fill py-3 fw-bold" onClick={scannerAddToOrder}>
                          <i className="ri-add-circle-line me-2"></i> Add to Current Order
                        </button>
                        <button className="btn btn-emerald flex-fill py-3 fw-bold" onClick={scannerQuickPay}>
                          <i className="ri-secure-payment-line me-2"></i> Instant Quick Pay
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─── Online Orders Modal ────────────────────────────────────────── */}
      {activeModal === 'online' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 840 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header sapphire">
                <div className="d-flex align-items-center gap-3">
                  <div className="pos-modal-header-icon">📥</div>
                  <div>
                    <h5 className="modal-title mb-0 text-white fw-bold">Online & WhatsApp Orders</h5>
                    <div className="pos-modal-header-sub">
                      {onlineOrders.filter(o => o.status === 'new').length} New Orders · {onlineOrders.length} Total Incoming
                    </div>
                  </div>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>

              <div className="d-flex border-bottom border-secondary-subtle" style={{ background: 'rgba(255,255,255,0.02)' }}>
                {[
                  { key: 'all',        label: 'All Orders',  count: onlineOrders.length },
                  { key: 'new',        label: '🔴 New',       count: onlineOrders.filter(o => o.status === 'new').length },
                  { key: 'pending',    label: '🟡 Pending',   count: onlineOrders.filter(o => o.status === 'pending').length },
                  { key: 'processing', label: '🔵 Loaded',    count: onlineOrders.filter(o => o.status === 'processing').length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOnlineFilter(tab.key)}
                    className={`pos-tab-btn ${onlineFilter === tab.key ? 'active' : ''}`}>
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '55vh', padding: '10px 20px' }}>
                {onlineOrders
                  .filter(o => onlineFilter === 'all' || o.status === onlineFilter)
                  .map(order => {
                    const ch = CHANNEL_META[order.channel] || CHANNEL_META.website
                    const st = STATUS_META[order.status] || STATUS_META.pending
                    const orderTotal = order.items.reduce((s, { productId, qty }) => {
                      const p = productsList.find(x => x.id === productId)
                      return s + (p ? p.price * qty : 0)
                    }, 0)
                    const isExpanded = expandedOrder === order.id

                    return (
                      <div key={order.id} className="pos-online-order-card">
                        <div className="d-flex align-items-center gap-3">
                          <div className="pos-channel-badge" style={{ color: ch.color, background: ch.bg }}>
                            <i className={ch.icon}></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold text-white fs-14">{order.id}</span>
                              <span className="pos-badge-status" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                                {st.label}
                              </span>
                              <span className="text-muted fs-11">{ch.label}</span>
                            </div>
                            <div className="fs-13 text-white mt-1">
                              <strong>{order.customer}</strong> · <span className="text-muted">{order.phone}</span>
                            </div>
                            <div className="text-muted fs-11 mt-1">
                              🕐 {order.time} · {order.items.reduce((s, i) => s + i.qty, 0)} items · <strong className="text-emerald">{fmt(orderTotal)}</strong>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                              <i className={isExpanded ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                            </button>
                            {order.status !== 'processing' ? (
                              <button className="btn btn-sm btn-emerald px-3 fw-bold" onClick={() => loadOnlineOrderToCart(order)}>
                                <i className="ri-shopping-cart-2-line me-1"></i> Load to Cart
                              </button>
                            ) : (
                              <span className="text-sapphire fw-bold fs-12">
                                <i className="ri-check-double-line me-1"></i> Loaded
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pos-expanded-box mt-3">
                            {order.note && (
                              <div className="pos-order-note-alert mb-2">
                                <strong>Note:</strong> {order.note}
                              </div>
                            )}
                            {order.items.map(({ productId, qty }) => {
                              const p = productsList.find(x => x.id === productId)
                              if (!p) return null
                              return (
                                <div key={productId} className="d-flex justify-content-between fs-12 py-1">
                                  <span className="text-white">{p.icon} {p.name} × {qty}</span>
                                  <strong className="text-emerald">{fmt(p.price * qty)}</strong>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cash Payment Modal (with 1-Tap Quick Tenders) ───────────────── */}
      {activeModal === 'cash' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header emerald">
                <div className="d-flex align-items-center gap-2 text-white">
                  <i className="ri-money-dollar-circle-line fs-22"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Cash Tender & Change</h6>
                </div>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <div className="modal-body p-4">
                <div className="pos-cash-total-display mb-3">
                  <div>
                    <span className="pos-cash-total-lbl">Total Payable</span>
                    <div className="pos-cash-total-val">{fmt(total)}</div>
                  </div>
                  <span className="pos-cash-tag">CASH</span>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">AMOUNT TENDERED (₦)</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-dark text-emerald border-secondary fw-bold fs-20">₦</span>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-secondary fw-bold fs-22"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      autoFocus
                    />
                    {cashReceived && (
                      <button className="btn btn-outline-secondary" onClick={() => setCashReceived('')}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="pos-quick-tender-lbl">Quick Denomination Chips</div>
                  <div className="pos-quick-tender-grid">
                    {quickCashOptions.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="pos-quick-chip"
                        onClick={() => setCashReceived(String(amt))}>
                        {amt === total ? `Exact (${fmt(amt)})` : fmt(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {cashReceived && Number(cashReceived) >= total && (
                  <div className="pos-change-alert success mb-4">
                    <span className="fw-bold">Change to Return</span>
                    <span className="fw-bolder fs-20 text-emerald">{fmt(cashChange)}</span>
                  </div>
                )}
                {cashReceived && Number(cashReceived) < total && (
                  <div className="pos-change-alert danger mb-4">
                    <span className="fw-bold">Amount Remaining</span>
                    <span className="fw-bolder fs-20 text-danger">{fmt(total - Number(cashReceived))}</span>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-emerald w-50 py-3 fw-bolder fs-15"
                    disabled={!cashReceived || Number(cashReceived) < total}
                    onClick={() => confirmPayment('Cash')}>
                    Complete Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Card / POS Terminal Modal ───────────────────────────────────── */}
      {activeModal === 'card' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header sapphire">
                <h6 className="modal-title text-white fw-bold d-flex align-items-center gap-2">
                  <i className="ri-bank-card-line"></i> External POS Machine
                </h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary-subtle">
                  <span className="text-muted">Terminal Charge Amount</span>
                  <span className="fw-bolder fs-22 text-sapphire">{fmt(total)}</span>
                </div>

                <div className="pos-terminal-instruction mb-4">
                  <i className="ri-bank-card-2-line fs-32 text-sapphire"></i>
                  <div className="text-white fs-12 lh-base">
                    Charge <strong className="text-emerald">{fmt(total)}</strong> on the physical POS machine.<br/>
                    Once payment approves, click <strong>Confirm Payment</strong> below.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">CARD TYPE (OPTIONAL)</label>
                  <div className="d-flex gap-2">
                    {['Visa', 'Mastercard', 'Verve', 'Other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardTab(t.toLowerCase())}
                        className={`pos-card-tab ${cardTab === t.toLowerCase() ? 'active' : ''}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-sapphire w-50 py-3 fw-bold" onClick={() => confirmPayment('Card / POS')}>
                    <i className="ri-check-double-line me-1"></i> Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bank Transfer Modal ────────────────────────────────────────── */}
      {activeModal === 'transfer' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header amber">
                <h6 className="modal-title text-dark fw-bold">Direct Bank Transfer</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Total Transfer Amount</span>
                  <span className="fw-bolder fs-20 text-amber">{fmt(total)}</span>
                </div>

                <div className="pos-bank-box mb-3">
                  <div className="fw-bold text-white mb-1">Transfer to: Bems Farms Ltd</div>
                  <div className="text-emerald fs-14">GTBank · <strong>0123456789</strong></div>
                  <div className="text-muted fs-11 mt-1">Ref ID: <strong>{orderId}</strong></div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">CUSTOMER BANK NAME</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. GTBank, Access, Zenith, Kuda"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">SESSION ID / TRANSACTION REF</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Enter bank reference number"
                    value={txnRef}
                    onChange={e => setTxnRef(e.target.value)}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-amber w-50 py-3 fw-bold text-dark" onClick={() => confirmPayment('Bank Transfer')}>
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── QR / USSD Modal ────────────────────────────────────────────── */}
      {activeModal === 'qr' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 360 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-body text-center p-4">
                <div className="text-muted small fw-bold text-uppercase">QR & USSD Payment</div>
                <div className="fs-26 fw-bolder text-cyan my-2">{fmt(total)}</div>

                <div className="pos-qr-box my-3">
                  <i className="ri-qr-code-line fs-72 text-cyan"></i>
                  <div className="text-muted fs-10 fw-bold">SCAN WITH ANY BANK APP</div>
                </div>

                <div className="pos-ussd-code mb-4">
                  *737*000*{total}#
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-cyan w-50 py-2 fw-bold text-dark" onClick={() => confirmPayment('QR / USSD')}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Split Tender Modal ─────────────────────────────────────────── */}
      {activeModal === 'split' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header purple">
                <h6 className="modal-title text-white fw-bold">Split Payment Tender</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom border-secondary-subtle">
                  <span className="text-muted">Total Bill</span>
                  <span className="fw-bolder fs-20 text-purple">{fmt(total)}</span>
                </div>

                <div className="d-flex flex-column gap-2 mb-3">
                  {splitRows.map((row, i) => (
                    <div key={i} className="p-2 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="row g-2 align-items-center">
                        <div className="col-5">
                          <select className="form-select form-select-sm bg-dark text-white border-secondary" value={row.method} onChange={e => updateSplit(i, 'method', e.target.value)}>
                            {['Cash', 'Card / POS', 'Bank Transfer', 'QR / USSD', 'Wallet'].map(m => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-5">
                          <input
                            type="number"
                            className="form-control form-control-sm bg-dark text-white border-secondary"
                            placeholder="Amount (₦)"
                            value={row.amount}
                            onChange={e => updateSplit(i, 'amount', e.target.value)}
                          />
                        </div>
                        <div className="col-2 text-end">
                          {splitRows.length > 2 && (
                            <button type="button" className="btn btn-sm btn-outline-danger py-1 px-2" onClick={() => setSplitRows(r => r.filter((_, ri) => ri !== i))}>
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4 fs-12">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addSplitRow}>
                    <i className="ri-add-line me-1"></i> Add Method
                  </button>
                  <span className="text-white">
                    Allocated: <strong className="text-emerald">{fmt(splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</strong> / {fmt(total)}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-purple w-50 py-3 fw-bold text-white" onClick={() => confirmPayment('Split Payment')}>
                    Submit Split Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hold Order Modal ───────────────────────────────────────────── */}
      {activeModal === 'hold' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header emerald">
                <h6 className="modal-title text-white fw-bold">Hold Bill [F4]</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Held Bill Amount</span>
                    <strong className="fs-18 text-emerald">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">HOLD REFERENCE</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Table 4 / Mrs Okonkwo"
                    value={holdRef}
                    onChange={e => setHoldRef(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">HOLD NOTE</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows="2"
                    placeholder="Optional remarks..."
                    value={holdNote}
                    onChange={e => setHoldNote(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-emerald w-50 py-2 fw-bold" onClick={doHold}>
                    Confirm Hold
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice Preview Modal ──────────────────────────────────────── */}
      {activeModal === 'invoice' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 660 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header sapphire">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-file-text-line fs-22 text-white"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Receipt & Invoice · {orderId}</h6>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3 border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="d-flex justify-content-between mb-2">
                    <div>
                      <div className="fs-18 fw-bolder text-emerald">🌾 BEMS FARMS LTD</div>
                      <div className="text-muted fs-11">Fresh Grocery & Agricultural Retail</div>
                    </div>
                    <div className="text-end fs-11 text-muted">
                      <div><strong>Date:</strong> {new Date().toLocaleDateString('en-NG')}</div>
                      <div><strong>Bill ID:</strong> {orderId}</div>
                    </div>
                  </div>
                  <div className="fs-12 text-white mt-2">
                    <strong>Customer:</strong> {customer?.name || 'Walk-in Customer'} {customer?.phone && `(${customer.phone})`}
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-sm table-dark align-middle">
                    <thead>
                      <tr className="text-muted fs-11">
                        <th>ITEM</th>
                        <th className="text-center">QTY</th>
                        <th className="text-end">PRICE</th>
                        <th className="text-end">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="fs-12">
                      {cart.map(i => (
                        <tr key={i.id}>
                          <td>{i.icon} {i.name}</td>
                          <td className="text-center">{i.qty}</td>
                          <td className="text-end">{fmt(i.price)}</td>
                          <td className="text-end fw-bold text-white">{fmt(i.price * i.qty)}</td>
                        </tr>
                      ))}
                      {discountPct > 0 && (
                        <tr className="text-danger">
                          <td colSpan="3" className="text-end">Discount ({discountPct}%)</td>
                          <td className="text-end fw-bold">− {fmt(discountAmt)}</td>
                        </tr>
                      )}
                      <tr className="text-muted">
                        <td colSpan="3" className="text-end">VAT (7.5%)</td>
                        <td className="text-end">{fmt(vat)}</td>
                      </tr>
                      <tr className="border-top fs-15 fw-bold">
                        <td colSpan="3" className="text-end text-white">Total Payable</td>
                        <td className="text-end text-emerald fw-bolder">{fmt(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={() => window.print()}>
                    <i className="ri-printer-line me-1"></i> Print
                  </button>
                  <button className="btn btn-emerald w-50 py-2 fw-bold" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pay Later Modal ────────────────────────────────────────────── */}
      {activeModal === 'paylater' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header amber">
                <h6 className="modal-title text-dark fw-bold">Pay Later / Customer Credit</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Credit Amount</span>
                    <strong className="fs-18 text-amber">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">CUSTOMER NAME / PHONE</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Enter customer name"
                    value={payLaterCust || customer?.name || ''}
                    onChange={e => setPayLaterCust(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">DUE DATE</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={payLaterDate}
                    onChange={e => setPayLaterDate(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-amber w-50 py-2 fw-bold text-dark"
                    onClick={() => {
                      showToast('Credit sale logged successfully!', 'success', '⏰')
                      closeModal()
                      clearCart()
                    }}>
                    Save Credit Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Billing History Modal ──────────────────────────────────────── */}
      {activeModal === 'history' && (
        <div className="modal show d-block pos-modal-container" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 740 }}>
            <div className="modal-content pos-glass-modal">
              <div className="modal-header pos-modal-header sapphire">
                <h6 className="modal-title text-white fw-bold">Recent POS Receipts & Sales</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0 fs-12">
                    <thead>
                      <tr className="text-muted border-bottom">
                        <th>INVOICE</th>
                        <th>CUSTOMER</th>
                        <th>METHOD</th>
                        <th>TIME</th>
                        <th className="text-end">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map(h => (
                        <tr key={h.inv}>
                          <td className="fw-bold text-sapphire">{h.inv}</td>
                          <td className="text-white">{h.cust}</td>
                          <td>
                            <span className="badge bg-secondary-subtle text-white border border-secondary">
                              {h.method}
                            </span>
                          </td>
                          <td className="text-muted">{h.time}</td>
                          <td className="text-end fw-bold text-emerald">{fmt(h.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer p-3 border-secondary-subtle">
                <button className="btn btn-outline-secondary w-100 py-2 fw-bold" onClick={closeModal}>Close History</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Success Modal ──────────────────────────────────────── */}
      {activeModal === 'success' && successData && (
        <div className="pos-success-overlay">
          <div className="pos-success-card">
            <div className="pos-success-ring">
              ✓
            </div>

            <h5 className="pos-success-title">Sale Complete!</h5>
            <div className="pos-success-ref">Receipt ID: {successData.orderId}</div>

            <div className="pos-success-details">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Customer</span>
                <strong className="text-white">{successData.customer?.name || 'Walk-in Customer'}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Payment Tender</span>
                <strong className="text-emerald">{successData.method}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total Charged</span>
                <strong className="text-white fs-15">{fmt(successData.total)}</strong>
              </div>
              {successData.method === 'Cash' && successData.change > 0 && (
                <div className="d-flex justify-content-between pt-2 border-top border-secondary">
                  <span className="text-amber fw-bold">Change Returned</span>
                  <strong className="text-amber fs-15">{fmt(successData.change)}</strong>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button className="btn btn-outline-secondary flex-fill py-2 fw-bold" onClick={() => window.print()}>
                <i className="ri-printer-line me-1"></i> Print Receipt
              </button>
            </div>

            <button className="btn btn-emerald w-100 py-3 fw-bolder fs-15" onClick={newOrder}>
              <i className="ri-add-circle-line me-1"></i> Next Customer [Enter]
            </button>
          </div>
        </div>
      )}

      {/* ─── Goods Return Modal ─────────────────────────────────────────── */}
      {activeModal === 'return' && (() => {
        const retTotal = Number(returnForm.qty) * Number(returnForm.unitPrice)

        async function submitReturn() {
          const ref = 'RTN-POS-' + String(Date.now()).slice(-5)
          try {
            await api.post('/admin/pos/returns', {
              ref,
              product_id: returnForm.product?.id,
              quantity: Number(returnForm.qty),
              unit_price: Number(returnForm.unitPrice),
              reason: returnForm.reason,
              condition: returnForm.condition,
              refund_method: returnForm.refundMethod,
              customer_name: returnForm.customer,
              phone: returnForm.phone,
              notes: returnForm.notes,
            }).catch(e => console.warn('Online return fallback', e))
          } catch (e) {
            console.warn('POS return request error', e)
          }

          setReturnLogs(prev => [...prev, { ...returnForm, ref, total: retTotal, date: new Date().toLocaleString('en-NG') }])
          setReturnSuccess({ ref, total: retTotal, method: returnForm.refundMethod, condition: returnForm.condition })
        }

        if (returnSuccess) {
          return (
            <div className="pos-success-overlay">
              <div className="pos-success-card" style={{ maxWidth: 380 }}>
                <div className="pos-success-ring" style={{ background: '#f43f5e' }}>
                  ✓
                </div>
                <h6 className="fw-bold text-white mb-1 fs-17">Return Processed</h6>
                <div className="text-muted fs-12 mb-3">Ref: {returnSuccess.ref}</div>
                <div className="pos-success-details mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Refund Amount</span>
                    <strong className="text-danger fs-14">{fmt(returnSuccess.total)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Method</span>
                    <span className="text-white">{returnSuccess.method}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Goods Condition</span>
                    <span className="text-emerald">{{ resalable: 'Restocked', damaged: 'Written off', partial: 'Split' }[returnSuccess.condition]}</span>
                  </div>
                </div>
                <button className="btn btn-emerald w-100 py-2 fw-bold" onClick={closeModal}>Done</button>
              </div>
            </div>
          )
        }

        return (
          <div className="modal show d-block pos-modal-container" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 580 }}>
              <div className="modal-content pos-glass-modal">
                <div className="modal-header pos-modal-header rose">
                  <div className="d-flex align-items-center gap-2">
                    <i className="ri-arrow-go-back-line fs-22 text-white"></i>
                    <div>
                      <h6 className="modal-title mb-0 text-white fw-bold">Goods Return & Customer Refund</h6>
                      <div className="pos-modal-header-sub">Step {returnStep} of 2</div>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
                </div>

                <div className="modal-body p-4">
                  {returnStep === 1 ? (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-muted small fw-bold">SELECT PRODUCT</label>
                        <select
                          className="form-select bg-dark text-white border-secondary"
                          value={returnForm.product?.id || ''}
                          onChange={e => {
                            const p = productsList.find(x => x.id === Number(e.target.value))
                            if (p) setReturnForm(f => ({ ...f, product: p, unitPrice: p.price }))
                          }}>
                          {productsList.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.icon} {p.name} — {fmt(p.price)} / {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">CUSTOMER NAME</label>
                        <input
                          className="form-control bg-dark text-white border-secondary"
                          placeholder="Walk-in / Customer"
                          value={returnForm.customer}
                          onChange={e => setReturnForm(f => ({ ...f, customer: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">PHONE NUMBER</label>
                        <input
                          className="form-control bg-dark text-white border-secondary"
                          placeholder="0800 000 0000"
                          value={returnForm.phone}
                          onChange={e => setReturnForm(f => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">QUANTITY</label>
                        <input
                          type="number"
                          className="form-control bg-dark text-white border-secondary"
                          min="1"
                          value={returnForm.qty}
                          onChange={e => setReturnForm(f => ({ ...f, qty: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">UNIT PRICE (₦)</label>
                        <input
                          type="number"
                          className="form-control bg-dark text-white border-secondary"
                          min="0"
                          value={returnForm.unitPrice}
                          onChange={e => setReturnForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">REFUND VALUE</label>
                        <input
                          className="form-control bg-dark text-danger border-secondary fw-bolder"
                          readOnly
                          value={fmt(retTotal)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted small fw-bold">RETURN REASON</label>
                        <select
                          className="form-select bg-dark text-white border-secondary"
                          value={returnForm.reason}
                          onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}>
                          {POS_RETURN_REASONS.map(r => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 d-flex gap-2 pt-2">
                        <button className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                        <button
                          className="btn btn-danger w-50 py-2 fw-bold"
                          onClick={() => setReturnStep(2)}
                          disabled={!returnForm.product || returnForm.qty < 1}>
                          Next: Inspect Goods
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="p-3 rounded mb-3 border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Item</span>
                          <strong className="text-white">{returnForm.product?.name} × {returnForm.qty}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Total Refund</span>
                          <strong className="text-danger fs-15">{fmt(retTotal)}</strong>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label text-muted small fw-bold">CONDITION OF GOODS</label>
                        <div className="row g-2">
                          {[
                            { val: 'resalable', title: 'Resalable', desc: 'Restock immediately', color: '#10b981' },
                            { val: 'damaged',   title: 'Damaged',   desc: 'Write off loss',      color: '#f43f5e' },
                            { val: 'partial',   title: 'Partial',   desc: 'Partially good',      color: '#f59e0b' },
                          ].map(opt => (
                            <div className="col-4" key={opt.val}>
                              <div
                                onClick={() => setReturnForm(f => ({ ...f, condition: opt.val }))}
                                className={`pos-condition-card ${returnForm.condition === opt.val ? 'active' : ''}`}
                                style={{ '--cond-color': opt.color }}>
                                <div className="fw-bold" style={{ color: opt.color, fontSize: 11 }}>{opt.title}</div>
                                <div className="text-muted fs-9 mt-1">{opt.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label text-muted small fw-bold">REFUND METHOD</label>
                        <div className="d-flex gap-2">
                          {['Cash', 'Wallet Credit', 'Bank Transfer'].map(m => (
                            <button
                              key={m}
                              type="button"
                              className={`btn btn-sm flex-grow-1 ${returnForm.refundMethod === m ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                              onClick={() => setReturnForm(f => ({ ...f, refundMethod: m }))}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary py-2" onClick={() => setReturnStep(1)}>Back</button>
                        <button className="btn btn-danger flex-grow-1 py-2 fw-bold" onClick={submitReturn}>
                          Complete Refund {fmt(retTotal)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ SCAN TOAST NOTIFICATION ══════════════════════════════════════ */}
      {toast && (
        <div className={`pos-toast ${toast.type}`}>
          <span className="pos-toast-icon">{toast.icon}</span>
          <span className="pos-toast-msg">{toast.msg}</span>
        </div>
      )}

      {/* ═══ LUXURY OBSIDIAN DESIGN SYSTEM STYLES ═════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        :root {
          --pos-bg: #0b0f19;
          --pos-surface: #111827;
          --pos-card: rgba(22, 30, 49, 0.75);
          --pos-border: rgba(255, 255, 255, 0.08);
          --pos-emerald: #10b981;
          --pos-sapphire: #3b82f6;
          --pos-amber: #f59e0b;
          --pos-rose: #f43f5e;
          --pos-purple: #8b5cf6;
          --pos-cyan: #06b6d4;
        }

        body.sidebar-hidden {
          background: var(--pos-bg) !important;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
          margin: 0;
          overflow: hidden;
        }
        body.sidebar-hidden .page-wrapper { display: none !important; }
        body.sidebar-hidden #main-sidebar { display: none !important; }
        body.sidebar-hidden #main-topbar  { display: none !important; }

        .pos-master-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: radial-gradient(ellipse at 30% 0%, rgba(16, 185, 129, 0.08), transparent 60%),
                      radial-gradient(ellipse at 85% 10%, rgba(59, 130, 246, 0.06), transparent 50%),
                      var(--pos-bg);
          color: #e2e8f0;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        /* ── Header ── */
        .pos-topbar {
          height: 56px;
          display: flex;
          align-items: center;
          padding: 0 18px;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--pos-border);
          gap: 16px;
          z-index: 100;
        }
        .pos-brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-logo-img {
          height: 36px;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
        }
        .pos-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 10px;
          font-weight: 800;
          color: var(--pos-emerald);
          letter-spacing: 0.5px;
        }
        .pos-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--pos-emerald);
          box-shadow: 0 0 10px var(--pos-emerald);
          animation: pulse 2s infinite;
        }

        /* ── Omnibar ── */
        .pos-omnibar-wrapper {
          flex: 1;
          max-width: 560px;
          position: relative;
          margin: 0 auto;
        }
        .pos-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--pos-emerald);
          font-size: 17px;
          pointer-events: none;
        }
        .pos-omnibar-input {
          width: 100%;
          height: 40px;
          padding-left: 42px;
          padding-right: 100px;
          background: rgba(22, 30, 49, 0.8);
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
          transition: all 0.2s ease;
        }
        .pos-omnibar-input:focus {
          border-color: var(--pos-emerald);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(0,0,0,0.3);
          background: rgba(22, 30, 49, 0.95);
        }
        .pos-clear-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
        }
        .pos-hotkey-badge {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.15);
          color: var(--pos-emerald);
          font-size: 10px;
          font-weight: 800;
          pointer-events: none;
        }

        /* ── Header Actions ── */
        .pos-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-held-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
        }
        .pos-clock-widget {
          text-align: right;
          line-height: 1.2;
        }
        .pos-time {
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.5px;
        }
        .pos-date {
          font-size: 10px;
          color: #94a3b8;
        }
        .pos-exit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .pos-exit-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .pos-cashier-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        /* ── Workspace ── */
        .pos-main-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .pos-catalog-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid var(--pos-border);
        }

        /* ── Action Strip ── */
        .pos-action-strip {
          padding: 10px 16px;
          display: flex;
          gap: 12px;
          background: rgba(17, 24, 39, 0.4);
          border-bottom: 1px solid var(--pos-border);
        }
        .pos-action-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--pos-card);
          border: 1px solid var(--pos-border);
          backdrop-filter: blur(16px);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .pos-action-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .pos-action-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #fff;
          flex-shrink: 0;
        }
        .pos-icon-emerald { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); }
        .pos-icon-sapphire { background: linear-gradient(135deg, #3b82f6, #1d4ed8); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
        .pos-icon-rose { background: linear-gradient(135deg, #f43f5e, #be123c); box-shadow: 0 4px 12px rgba(244, 63, 94, 0.35); }

        .pos-action-meta { flex: 1; min-width: 0; }
        .pos-action-title { font-size: 12px; font-weight: 800; color: #fff; line-height: 1.2; }
        .pos-action-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        .pos-action-tag {
          font-size: 10px;
          font-weight: 800;
          color: var(--pos-emerald);
          background: rgba(16, 185, 129, 0.15);
          padding: 2px 7px;
          border-radius: 4px;
        }
        .pos-badge-new {
          background: #f43f5e;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 12px;
          animation: pulse 2s infinite;
        }
        .pos-badge-return {
          background: #f43f5e;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 12px;
        }

        /* ── Category Bar ── */
        .pos-category-bar {
          padding: 10px 16px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          background: rgba(11, 15, 25, 0.6);
          border-bottom: 1px solid var(--pos-border);
        }
        .pos-category-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--pos-border);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .pos-category-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .pos-category-pill.active {
          background: var(--pos-emerald);
          color: #fff;
          border-color: var(--pos-emerald);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
          font-weight: 800;
        }
        .pos-cat-count {
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.25);
        }

        /* ── Product Scroll & Grid ── */
        .pos-product-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .pos-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
          gap: 14px;
        }
        .pos-product-card {
          background: var(--pos-card);
          border: 1px solid var(--pos-border);
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          backdrop-filter: blur(16px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        .pos-product-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 12px 30px rgba(0,0,0,0.35);
        }
        .pos-product-card.in-cart {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent), 0 8px 24px rgba(0,0,0,0.3);
          background: rgba(22, 30, 49, 0.9);
        }
        .pos-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pos-stock-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.15);
          color: var(--pos-emerald);
          letter-spacing: 0.3px;
        }
        .pos-stock-pill.low {
          background: rgba(245, 158, 11, 0.18);
          color: var(--pos-amber);
        }
        .pos-cart-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .pos-img-container {
          height: 85px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
          margin-bottom: 10px;
          overflow: hidden;
        }
        .pos-product-photo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.2s ease;
        }
        .pos-product-card:hover .pos-product-photo {
          transform: scale(1.05);
        }
        .pos-product-fallback-icon {
          font-size: 40px;
        }
        .pos-card-info {
          margin-bottom: 10px;
        }
        .pos-card-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          line-height: 1.3;
          margin-bottom: 3px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          min-height: 34px;
        }
        .pos-card-sku {
          font-size: 10px;
          color: #94a3b8;
        }
        .pos-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--pos-border);
        }
        .pos-card-price {
          font-size: 15px;
          font-weight: 900;
          color: var(--accent);
          letter-spacing: -0.3px;
        }
        .pos-oncard-stepper {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 4px;
          border-radius: 8px;
        }
        .pos-stepper-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pos-stepper-btn.add {
          background: var(--accent);
          border-color: var(--accent);
        }
        .pos-stepper-val {
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          min-width: 18px;
          text-align: center;
        }
        .pos-add-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.15s ease;
        }
        .pos-product-card:hover .pos-add-icon {
          background: var(--accent);
          color: #fff;
        }

        /* ── Checkout Sidebar ── */
        .pos-checkout-sidebar {
          width: 480px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(24px);
          border-left: 1px solid var(--pos-border);
        }
        .pos-held-strip {
          padding: 8px 14px;
          background: rgba(245, 158, 11, 0.12);
          border-bottom: 1px solid rgba(245, 158, 11, 0.25);
          display: flex;
          gap: 8px;
          align-items: center;
          overflow-x: auto;
        }
        .pos-held-title {
          font-size: 10px;
          font-weight: 900;
          color: var(--pos-amber);
        }
        .pos-held-pill {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--pos-amber);
          background: transparent;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .pos-order-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--pos-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(16, 185, 129, 0.06);
        }
        .pos-order-ref {
          font-size: 13px;
          font-weight: 900;
          color: var(--pos-emerald);
          letter-spacing: 0.5px;
        }
        .pos-order-count {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 1px;
        }
        .pos-header-btns {
          display: flex;
          gap: 8px;
        }
        .pos-cust-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .pos-cust-btn.active {
          border-color: var(--pos-emerald);
          background: rgba(16, 185, 129, 0.15);
          color: var(--pos-emerald);
        }
        .pos-clear-cart-btn {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(244, 63, 94, 0.4);
          background: transparent;
          color: var(--pos-rose);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ── Customer Drawer ── */
        .pos-cust-drawer {
          padding: 12px 16px;
          border-bottom: 1px solid var(--pos-border);
          background: rgba(22, 30, 49, 0.95);
        }
        .pos-cust-input {
          width: 100%;
          height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--pos-border);
          color: #fff;
          font-size: 12px;
          margin-bottom: 10px;
          outline: none;
        }
        .pos-cust-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
        }
        .pos-cust-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          text-align: left;
        }
        .pos-cust-item.selected {
          border-color: var(--pos-emerald);
          background: rgba(16, 185, 129, 0.12);
        }
        .pos-cust-name { font-size: 12px; font-weight: 800; color: #fff; }
        .pos-cust-phone { font-size: 10px; color: #94a3b8; }
        .pos-tier-pill { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .pos-points-text { font-size: 9px; color: #94a3b8; margin-top: 2px; }
        .pos-remove-cust-btn {
          width: 100%;
          margin-top: 8px;
          padding: 6px 0;
          border: 1px solid var(--pos-rose);
          border-radius: 6px;
          background: transparent;
          color: var(--pos-rose);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ── Active Customer Strip ── */
        .pos-active-cust-strip {
          padding: 10px 16px;
          background: rgba(16, 185, 129, 0.08);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-cust-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 900;
          font-size: 12px;
        }
        .pos-active-name { font-size: 13px; font-weight: 800; color: #fff; }
        .pos-active-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }

        /* ── Cart Rows ── */
        .pos-cart-items-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
        }
        .pos-cart-empty {
          text-align: center;
          padding: 60px 20px;
        }
        .pos-scanner-tip {
          margin-top: 20px;
          padding: 10px 16px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px dashed rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          font-size: 11px;
          color: var(--pos-emerald);
          font-weight: 600;
        }
        .pos-cart-row {
          padding: 10px 16px;
          border-bottom: 1px solid var(--pos-border);
          transition: background 0.3s ease;
        }
        .pos-cart-row.highlight {
          background: rgba(16, 185, 129, 0.15);
        }
        .pos-row-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pos-row-icon { font-size: 22px; flex-shrink: 0; }
        .pos-row-details { flex: 1; overflow: hidden; }
        .pos-row-name {
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pos-row-rate { font-size: 11px; color: #94a3b8; }
        .pos-row-stepper {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(0, 0, 0, 0.35);
          padding: 2px 4px;
          border-radius: 8px;
        }
        .pos-step-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pos-step-input {
          width: 34px;
          height: 22px;
          border: none;
          background: transparent;
          color: #fff;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          outline: none;
        }
        .pos-row-total-group {
          min-width: 70px;
          text-align: right;
        }
        .pos-row-total {
          font-size: 13px;
          font-weight: 900;
          color: var(--item-accent);
        }
        .pos-row-del {
          background: none;
          border: none;
          color: var(--pos-rose);
          font-size: 14px;
          cursor: pointer;
          padding: 0;
          margin-top: 2px;
        }
        .pos-row-note {
          width: 100%;
          height: 24px;
          margin-top: 6px;
          padding: 0 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px dashed var(--pos-border);
          color: #94a3b8;
          font-size: 10px;
          outline: none;
        }

        /* ── Order Note & Discount ── */
        .pos-order-note-wrapper {
          padding: 8px 16px;
          border-top: 1px solid var(--pos-border);
        }
        .pos-order-note-input {
          width: 100%;
          height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--pos-border);
          color: #fff;
          font-size: 11px;
          outline: none;
        }
        .pos-discount-bar {
          padding: 8px 16px;
          border-top: 1px solid var(--pos-border);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pos-discount-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .pos-discount-chip {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 6px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-discount-chip.active {
          background: var(--pos-emerald);
          color: #fff;
          border-color: var(--pos-emerald);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        /* ── Digital HUD Total ── */
        .pos-hud-screen {
          padding: 12px 16px;
          border-top: 1px solid var(--pos-border);
          background: rgba(0, 0, 0, 0.35);
        }
        .pos-hud-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .pos-hud-row.discount { color: var(--pos-rose); font-weight: 700; }
        .pos-hud-total-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.08));
          border: 1.5px solid rgba(16, 185, 129, 0.35);
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        }
        .pos-total-title {
          font-size: 13px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .pos-total-sub {
          font-size: 9px;
          font-weight: 800;
          color: var(--pos-emerald);
          letter-spacing: 0.5px;
        }
        .pos-total-amount {
          font-size: 22px;
          font-weight: 900;
          color: var(--pos-emerald);
          letter-spacing: -0.5px;
        }

        /* ── Payment Grid ── */
        .pos-payment-deck {
          padding: 12px 16px;
          border-top: 2px solid var(--pos-border);
          background: rgba(17, 24, 39, 0.5);
        }
        .pos-deck-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pos-deck-title { font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px; }
        .pos-deck-hotkey { font-size: 9px; color: #64748b; }
        .pos-payment-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .pos-pay-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 4px;
          border-radius: 10px;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          background: var(--btn-bg);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-pay-btn:not(:disabled):hover {
          border-color: var(--btn-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }
        .pos-pay-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .pos-pay-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--btn-color);
        }
        .pos-pay-label {
          font-size: 11px;
          font-weight: 800;
          color: #fff;
        }

        /* ── Bottom Utilities ── */
        .pos-utility-bar {
          display: flex;
          border-top: 1px solid var(--pos-border);
          background: rgba(11, 15, 25, 0.85);
        }
        .pos-util-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 2px;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .pos-util-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pos-util-icon-bg {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }
        .pos-util-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
        }

        /* ── Modals ── */
        .pos-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 800;
        }
        .pos-modal-container {
          z-index: 810;
        }
        .pos-glass-modal {
          background: #111827 !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 20px !important;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6) !important;
        }
        .pos-modal-header {
          padding: 16px 20px;
        }
        .pos-modal-header.emerald { background: linear-gradient(135deg, #10b981, #059669); }
        .pos-modal-header.sapphire { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .pos-modal-header.amber { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .pos-modal-header.purple { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
        .pos-modal-header.rose { background: linear-gradient(135deg, #f43f5e, #be123c); }

        .pos-modal-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .pos-modal-header-sub { font-size: 11px; color: rgba(255, 255, 255, 0.85); margin-top: 2px; }

        /* ── Cash Modal Specifics ── */
        .pos-cash-total-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .pos-cash-total-lbl { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .pos-cash-total-val { font-size: 24px; font-weight: 900; color: var(--pos-emerald); }
        .pos-cash-tag {
          font-size: 12px;
          font-weight: 900;
          color: var(--pos-emerald);
          background: rgba(16, 185, 129, 0.2);
          padding: 4px 10px;
          border-radius: 6px;
        }
        .pos-quick-tender-lbl { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
        .pos-quick-tender-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .pos-quick-chip {
          padding: 10px 4px;
          border-radius: 10px;
          border: 1px solid var(--pos-border);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-quick-chip:hover {
          background: var(--pos-emerald);
          border-color: var(--pos-emerald);
          transform: translateY(-2px);
        }
        .pos-change-alert {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
        }
        .pos-change-alert.success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #fff; }
        .pos-change-alert.danger { background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #fff; }

        /* ── Success Screen ── */
        .pos-success-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pos-success-card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          width: 100%;
          maxWidth: 420px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        }
        .pos-success-ring {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 34px;
          color: #fff;
          box-shadow: 0 8px 28px rgba(16, 185, 129, 0.4);
        }
        .pos-success-title { font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 4px; }
        .pos-success-ref { font-size: 12px; color: #94a3b8; margin-bottom: 20px; }
        .pos-success-details {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--pos-border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
          font-size: 13px;
        }

        /* ── Button Tokens ── */
        .btn-emerald { background: var(--pos-emerald); color: #fff; border: none; }
        .btn-emerald:hover { background: #059669; color: #fff; }
        .btn-outline-emerald { border: 1.5px solid var(--pos-emerald); color: var(--pos-emerald); background: transparent; }
        .btn-outline-emerald:hover { background: var(--pos-emerald); color: #fff; }
        .btn-sapphire { background: var(--pos-sapphire); color: #fff; border: none; }
        .btn-amber { background: var(--pos-amber); color: #000; border: none; }
        .btn-purple { background: var(--pos-purple); color: #fff; border: none; }
        .btn-cyan { background: var(--pos-cyan); color: #000; border: none; }
        .text-emerald { color: var(--pos-emerald) !important; }
        .text-sapphire { color: var(--pos-sapphire) !important; }
        .text-amber { color: var(--pos-amber) !important; }
        .text-purple { color: var(--pos-purple) !important; }
        .text-cyan { color: var(--pos-cyan) !important; }

        /* ── Toast ── */
        .pos-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 999;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 12px 36px rgba(0,0,0,0.5);
          animation: toastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pos-toast.success { background: var(--pos-emerald); color: #fff; }
        .pos-toast.error { background: var(--pos-rose); color: #fff; }
        .pos-toast.info { background: var(--pos-sapphire); color: #fff; }

        @keyframes toastSlide { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
