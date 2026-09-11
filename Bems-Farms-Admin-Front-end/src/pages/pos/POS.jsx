import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// ── Categories & Default Mock Fallbacks ──────────────────────────────────────
const CATEGORY_DEFINITIONS = [
  { id: 'all',        label: 'All Products',        emoji: '🛒', key: 'all' },
  { id: 'popular',    label: '⭐ Top Picks',          emoji: '⭐', key: 'popular' },
  { id: 'oils',       label: 'Oils & Sauces',       emoji: '🫒', key: 'oils' },
  { id: 'grains',     label: 'Grains & Flours',     emoji: '🌾', key: 'grains' },
  { id: 'seasoning',  label: 'Seasonings & Spices', emoji: '🧂', key: 'seasoning' },
  { id: 'household',  label: 'Household & Soaps',   emoji: '🧼', key: 'household' },
  { id: 'canned',     label: 'Canned & Tomatoes',   emoji: '🥫', key: 'canned' },
  { id: 'beverages',  label: 'Beverages & Drinks',  emoji: '🧃', key: 'beverages' },
  { id: 'vegetables', label: 'Produce & Veggies',   emoji: '🥬', key: 'vegetables' },
  { id: 'meat',       label: 'Meat & Seafood',      emoji: '🥩', key: 'meat' },
  { id: 'meals',      label: 'Cooked Meals',        emoji: '🍲', key: 'meals' },
  { id: 'dairy',      label: 'Dairy & Eggs',        emoji: '🥛', key: 'dairy' },
]

const CAT_COLORS = {
  all: '#0ab39c',
  popular: '#f7b84b',
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
  website:   { label: 'Website',   icon: 'ri-global-line',    color: '#405189' },
  whatsapp:  { label: 'WhatsApp',  icon: 'ri-whatsapp-line',  color: '#25d366' },
  instagram: { label: 'Instagram', icon: 'ri-instagram-line', color: '#e1306c' },
  phone:     { label: 'Phone',     icon: 'ri-phone-line',     color: '#f7b84b' },
}
const STATUS_META = {
  new:        { label: 'New',        color: '#0ab39c', bg: 'rgba(10,179,156,.12)' },
  pending:    { label: 'Pending',    color: '#f7b84b', bg: 'rgba(247,184,75,.12)' },
  processing: { label: 'Processing', color: '#299cdb', bg: 'rgba(41,156,219,.12)' },
}

const TIER_COLOR = { Platinum: '#a78bfa', Gold: '#f7b84b', Silver: '#94a3b8', Bronze: '#f97316' }
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
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    } else if (type === 'success') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08) // A5
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
    // AudioContext silenced if blocked by browser autoplay
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
    setTimeout(() => setHighlightId(null), 600)
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

      // Global Keyboard Hotkeys
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
    opts.add(total) // Exact

    // Next round 1000
    const next1k = Math.ceil(total / 1000) * 1000
    if (next1k > total) opts.add(next1k)

    // Next round 5000
    const next5k = Math.ceil(total / 5000) * 5000
    if (next5k > total) opts.add(next5k)

    // Next round 10000
    const next10k = Math.ceil(total / 10000) * 10000
    if (next10k > total) opts.add(next10k)

    // Common large denominations
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
      showToast('Sale synced to server!', 'success', '✅')
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

    // Prepend to live history
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

  // ── Numpad (Cash Modal) ────────────────────────────────────────────────────
  function numpadPress(v) {
    setCashReceived(prev => {
      if (v === '⌫') return prev.slice(0, -1)
      if (v === 'C') return ''
      if (v === '.' && prev.includes('.')) return prev
      return prev + v
    })
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
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bs-body-bg, #0f172a)',
      color: 'var(--bs-body-color, #e2e8f0)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>

      {/* ═══ TOPBAR / HEADER ═════════════════════════════════════════════ */}
      <header style={{
        height: 54,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 200,
        background: 'var(--bs-body-bg, #0f172a)',
        borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
        gap: 16
      }}>
        {/* Brand Logo & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: 34, objectFit: 'contain' }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 20,
            background: 'rgba(10,179,156,0.12)',
            border: '1px solid rgba(10,179,156,0.25)',
            fontSize: 11,
            fontWeight: 700,
            color: '#0ab39c'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ab39c', display: 'inline-block', boxShadow: '0 0 8px #0ab39c' }}></span>
            <span>POS TERMINAL</span>
          </div>
        </div>

        {/* Global Barcode & Search Field */}
        <div style={{ flex: 1, maxWidth: 540, position: 'relative', margin: '0 auto' }}>
          <i className="ri-search-line" style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#0ab39c',
            fontSize: 16,
            pointerEvents: 'none'
          }}></i>
          <input
            id="scan-field"
            ref={scanInputRef}
            type="text"
            placeholder="Scan barcode [F1] or search grocery items (e.g. Rice, Oil, Soap)..."
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim()) {
                handleBarcodeScan(search)
              }
            }}
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 38,
              paddingRight: search ? 36 : 105,
              border: '1.5px solid #0ab39c',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.05))',
              color: 'var(--bs-body-color, #fff)',
              outline: 'none',
              boxShadow: '0 0 0 3px rgba(10,179,156,0.15)'
            }}
          />
          {search ? (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--bs-secondary-color, #94a3b8)',
                fontSize: 16
              }}>✕</button>
          ) : (
            <div style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              color: '#0ab39c',
              pointerEvents: 'none',
              background: 'rgba(10,179,156,0.12)',
              padding: '2px 6px',
              borderRadius: 4
            }}>
              <i className="ri-barcode-line"></i>
              <span>F1 SCAN</span>
            </div>
          )}
        </div>

        {/* Right Controls: Clock, Quick Status, Exit, Cashier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Held Orders Badge */}
          {heldOrders.length > 0 && (
            <button
              onClick={() => recallOrder(0)}
              style={{
                background: '#f7b84b',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                animation: 'pulse 2s infinite'
              }}>
              <i className="ri-pause-circle-fill"></i>
              <span>{heldOrders.length} HELD</span>
            </button>
          )}

          {/* Clock */}
          <div style={{ fontSize: 12, textAlign: 'right', color: 'var(--bs-secondary-color, #94a3b8)', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, color: 'var(--bs-body-color, #fff)' }}>
              {now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: 10 }}>
              {now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <Link
            to="/dashboard"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6 }}>
            <i className="ri-dashboard-2-line"></i>
            <span>Exit</span>
          </Link>

          {/* Cashier Avatar */}
          <div
            title={`Active Cashier: ${user ? `${user.first_name || ''} ${user.last_name || ''}` : 'Admin'}`}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ab39c, #405189)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 12,
              border: '2px solid rgba(255,255,255,0.15)'
            }}>
            {user ? (user.first_name?.[0] || 'B') + (user.last_name?.[0] || 'F') : 'BF'}
          </div>
        </div>
      </header>

      {/* ═══ WORKSPACE BODY ═══════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bs-body-bg)' }}>

        {/* ─── LEFT: CATALOG & ACTIONS ─────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))'
        }}>

          {/* Action Strip: Scan Basket, Online Orders, Goods Return */}
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.02))',
            flexShrink: 0,
            display: 'flex',
            gap: 10
          }}>
            {/* Scan Basket */}
            <button
              onClick={() => { setScanCart([]); setScanCode(''); setActiveModal('scanner') }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid rgba(10,179,156,0.3)',
                background: 'var(--bs-body-bg, #0f172a)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0ab39c, #2ec4b0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
                fontSize: 16
              }}>
                <i className="ri-barcode-line"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--bs-body-color, #fff)', lineHeight: 1.2 }}>
                  Scan Basket
                </div>
                <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                  Batch barcode scanning
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0ab39c', background: 'rgba(10,179,156,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                F1
              </span>
            </button>

            {/* Online Orders */}
            {(() => {
              const newCount = onlineOrders.filter(o => o.status === 'new').length
              return (
                <button
                  onClick={() => setActiveModal('online')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(64,81,137,0.3)',
                    background: 'var(--bs-body-bg, #0f172a)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #405189, #5a6fc4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff',
                    fontSize: 16
                  }}>
                    <i className="ri-shopping-bag-3-line"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--bs-body-color, #fff)', lineHeight: 1.2 }}>
                      Online Orders
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                      Import Web & WhatsApp
                    </div>
                  </div>
                  {newCount > 0 ? (
                    <span style={{ background: '#f06548', color: '#fff', borderRadius: 12, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>
                      {newCount} New
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#405189', background: 'rgba(64,81,137,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                      F3
                    </span>
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
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid rgba(240,101,72,0.3)',
                background: 'var(--bs-body-bg, #0f172a)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f06548, #e04b2f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
                fontSize: 16
              }}>
                <i className="ri-arrow-go-back-line"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--bs-body-color, #fff)', lineHeight: 1.2 }}>
                  Goods Return
                </div>
                <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                  Process customer refund
                </div>
              </div>
              {returnLogs.length > 0 && (
                <span style={{ background: '#f06548', color: '#fff', borderRadius: 12, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>
                  {returnLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Category Filter Pills with Item Counters */}
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
            background: 'var(--bs-body-bg, #0f172a)'
          }}>
            {CATEGORY_DEFINITIONS.map(cat => {
              const active = activeCategory === cat.id
              const color = CAT_COLORS[cat.id] || '#0ab39c'
              const count = categoryCounts[cat.id] || 0
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: active ? `1.5px solid ${color}` : '1px solid var(--bs-border-color, rgba(255,255,255,0.1))',
                    background: active ? color : 'var(--bs-body-secondary-bg, rgba(255,255,255,0.04))',
                    color: active ? '#fff' : 'var(--bs-body-color, #cbd5e1)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: active ? `0 2px 8px ${color}40` : 'none',
                    transition: 'all 0.15s ease'
                  }}>
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: active ? '#fff' : 'var(--bs-secondary-color, #94a3b8)',
                    fontWeight: 700
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Product Grid */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.02))'
          }}>
            {loadingPOS ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--bs-secondary-color, #94a3b8)' }}>
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: 36, height: 36 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Loading live inventory catalog...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--bs-secondary-color, #94a3b8)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--bs-body-color, #fff)' }}>No products found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Try clearing the search or switching category filter</div>
                <button
                  className="btn btn-sm btn-primary mt-3"
                  onClick={() => { setSearch(''); setActiveCategory('all') }}>
                  Reset Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12
              }}>
                {filteredProducts.map(p => {
                  const color = CAT_COLORS[p.cat] || '#0ab39c'
                  const inCart = cart.find(i => i.id === p.id)
                  const isLowStock = p.stock > 0 && p.stock <= 5

                  return (
                    <div
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      style={{
                        border: inCart ? `2px solid ${color}` : '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
                        borderRadius: 12,
                        padding: 10,
                        background: 'var(--bs-body-bg, #0f172a)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        boxShadow: inCart ? `0 0 0 3px ${color}30, 0 4px 12px rgba(0,0,0,0.15)` : '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}>
                      {/* Top Badges: In Cart Qty & Stock */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isLowStock ? 'rgba(247,184,75,0.15)' : 'rgba(10,179,156,0.12)',
                          color: isLowStock ? '#f7b84b' : '#0ab39c'
                        }}>
                          {isLowStock ? `LOW (${p.stock})` : (p.stock > 0 ? `${p.stock} in stock` : 'Available')}
                        </span>

                        {inCart && (
                          <span style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: color,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}>
                            {inCart.qty}
                          </span>
                        )}
                      </div>

                      {/* Product Image or Icon */}
                      <div style={{
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        background: color + '12',
                        fontSize: 36,
                        marginBottom: 8,
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
                            onError={e => {
                              e.target.style.display = 'none'
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'
                            }}
                          />
                        ) : null}
                        <span style={{ display: p.image ? 'none' : 'block' }}>
                          {p.icon || getProductIcon(p.name, p.cat)}
                        </span>
                      </div>

                      {/* Product Details */}
                      <div>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          marginBottom: 3,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          minHeight: 31,
                          color: 'var(--bs-body-color, #fff)'
                        }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)', marginBottom: 8 }}>
                          {p.sku} · per {p.unit}
                        </div>
                      </div>

                      {/* Price & Quick Stepper */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 6,
                        borderTop: '1px solid var(--bs-border-color, rgba(255,255,255,0.06))'
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: color }}>
                          {fmt(p.price)}
                        </span>

                        {inCart ? (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              onClick={() => updateQty(p.id, inCart.qty - 1)}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                border: '1px solid var(--bs-border-color, rgba(255,255,255,0.2))',
                                background: 'transparent',
                                color: 'var(--bs-body-color, #fff)',
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}>
                              −
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => updateQty(p.id, inCart.qty + 1)}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                border: '1px solid var(--bs-border-color, rgba(255,255,255,0.2))',
                                background: color,
                                color: '#fff',
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}>
                              +
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: color + '20',
                            color: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14
                          }}>
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: CHECKOUT TERMINAL SIDEBAR ─────────────────────────── */}
        <div style={{
          width: 460,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bs-body-bg, #0f172a)'
        }}>

          {/* Held Orders Quick Access Bar */}
          {heldOrders.length > 0 && (
            <div style={{
              padding: '6px 14px',
              background: 'rgba(247,184,75,0.15)',
              borderBottom: '1px solid rgba(247,184,75,0.3)',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 10, color: '#f7b84b', fontWeight: 800, flexShrink: 0 }}>
                HELD ORDERS:
              </span>
              {heldOrders.map((h, i) => (
                <button
                  key={i}
                  onClick={() => recallOrder(i)}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid #f7b84b',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--bs-body-color, #fff)',
                    whiteSpace: 'nowrap',
                    fontWeight: 600
                  }}>
                  #{i + 1} · {fmt(h.cart.reduce((s, ci) => s + ci.price * ci.qty, 0))}
                </button>
              ))}
            </div>
          )}

          {/* Order Header & Customer Trigger */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10,179,156,0.08)'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0ab39c' }}>
                {orderId}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} · {fmt(total)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowCustPanel(!showCustPanel)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '5px 10px',
                  border: customer ? '1px solid #0ab39c' : '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                  borderRadius: 6,
                  background: customer ? 'rgba(10,179,156,0.15)' : 'transparent',
                  cursor: 'pointer',
                  color: customer ? '#0ab39c' : 'var(--bs-body-color, #fff)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                <i className="ri-user-3-line"></i>
                <span>{customer ? customer.name.split(' ')[0] : 'Customer [F2]'}</span>
              </button>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '5px 10px',
                    border: '1px solid rgba(240,101,72,0.4)',
                    borderRadius: 6,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#f06548'
                  }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection Dropdown Panel */}
          {showCustPanel && (
            <div style={{
              padding: 12,
              borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
              background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.04))'
            }}>
              <input
                type="text"
                placeholder="Search customer name or phone..."
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  border: '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 8,
                  background: 'var(--bs-body-bg, #0f172a)',
                  color: 'var(--bs-body-color, #fff)'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      border: customer?.id === c.id ? '1.5px solid #0ab39c' : '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
                      borderRadius: 6,
                      background: customer?.id === c.id ? 'rgba(10,179,156,0.12)' : 'var(--bs-body-bg, #0f172a)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--bs-body-color, #fff)'
                    }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>{c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: TIER_COLOR[c.tier] || '#0ab39c' }}>{c.tier}</div>
                      <div style={{ fontSize: 9, color: 'var(--bs-secondary-color, #94a3b8)' }}>{c.points.toLocaleString()} pts</div>
                    </div>
                  </button>
                ))}
              </div>
              {customer && (
                <button
                  onClick={() => { setCustomer(null); setShowCustPanel(false) }}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '4px 0',
                    fontSize: 11,
                    border: '1px solid #f06548',
                    borderRadius: 6,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#f06548'
                  }}>
                  Remove Customer (Walk-in)
                </button>
              )}
            </div>
          )}

          {/* Active Customer Strip */}
          {customer && !showCustPanel && (
            <div style={{
              padding: '8px 14px',
              background: 'rgba(10,179,156,0.08)',
              borderBottom: '1px solid rgba(10,179,156,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: TIER_COLOR[customer.tier] || '#0ab39c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 11,
                flexShrink: 0
              }}>
                {customer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{customer.name}</div>
                <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                  <span style={{ color: TIER_COLOR[customer.tier] || '#0ab39c', fontWeight: 700 }}>{customer.tier}</span>
                  {' · '}{customer.points.toLocaleString()} pts
                  {' · '}<span style={{ color: '#0ab39c', fontWeight: 600 }}>Wallet {fmt(customer.wallet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cart Item List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--bs-secondary-color, #94a3b8)' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🛒</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bs-body-color, #fff)' }}>
                  Cart is Empty
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Scan barcode [F1] or tap any item to add
                </div>
                <div style={{
                  marginTop: 16,
                  padding: '8px 14px',
                  background: 'rgba(10,179,156,0.08)',
                  borderRadius: 8,
                  border: '1px dashed rgba(10,179,156,0.3)',
                  fontSize: 11,
                  color: '#0ab39c'
                }}>
                  💡 USB Scanner auto-detects barcodes directly
                </div>
              </div>
            ) : (
              cart.map(item => {
                const color = CAT_COLORS[item.cat] || '#0ab39c'
                const isHighlit = highlightId === item.id

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--bs-border-color, rgba(255,255,255,0.06))',
                      background: isHighlit ? `${color}20` : 'transparent',
                      transition: 'background 0.3s ease'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--bs-body-color, #fff)'
                        }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                          {fmt(item.price)} per {item.unit}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--bs-body-color, #fff)'
                          }}>
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateQty(item.id, parseInt(e.target.value) || 1)}
                          style={{
                            width: 36,
                            height: 24,
                            textAlign: 'center',
                            border: '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 800,
                            background: 'var(--bs-body-bg, #0f172a)',
                            color: 'var(--bs-body-color, #fff)'
                          }}
                        />
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--bs-body-color, #fff)'
                          }}>
                          +
                        </button>
                      </div>

                      {/* Price & Delete */}
                      <div style={{ minWidth: 65, textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: color }}>
                          {fmt(item.price * item.qty)}
                        </div>
                        <button
                          onClick={() => updateQty(item.id, 0)}
                          style={{ fontSize: 10, color: '#f06548', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <i className="ri-delete-bin-line"></i> remove
                        </button>
                      </div>
                    </div>

                    {/* Item Specific Note */}
                    <input
                      type="text"
                      placeholder="+ Add item note / instruction..."
                      value={item.note || ''}
                      onChange={e => updateNote(item.id, e.target.value)}
                      style={{
                        width: '100%',
                        height: 24,
                        marginTop: 4,
                        padding: '0 8px',
                        fontSize: 10,
                        border: '1px dashed var(--bs-border-color, rgba(255,255,255,0.15))',
                        borderRadius: 4,
                        background: 'transparent',
                        color: 'var(--bs-secondary-color, #94a3b8)'
                      }}
                    />
                  </div>
                )
              })
            )}
          </div>

          {/* Order Note */}
          {cart.length > 0 && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--bs-border-color, rgba(255,255,255,0.06))' }}>
              <input
                type="text"
                placeholder="📝 Order note / dispatch instructions..."
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                style={{
                  width: '100%',
                  height: 28,
                  padding: '0 10px',
                  fontSize: 11,
                  border: '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                  borderRadius: 6,
                  background: 'var(--bs-body-bg, #0f172a)',
                  color: 'var(--bs-body-color, #fff)'
                }}
              />
            </div>
          )}

          {/* Discount Preset Chips */}
          <div style={{
            padding: '6px 14px',
            borderTop: '1px solid var(--bs-border-color, rgba(255,255,255,0.06))',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--bs-secondary-color, #94a3b8)', textTransform: 'uppercase' }}>
              Discount:
            </span>
            {[0, 5, 10, 15, 20].map(d => (
              <button
                key={d}
                onClick={() => setDiscountPct(d)}
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: discountPct === d ? 'none' : '1px solid var(--bs-border-color, rgba(255,255,255,0.15))',
                  background: discountPct === d ? '#0ab39c' : 'transparent',
                  color: discountPct === d ? '#fff' : 'var(--bs-body-color, #fff)',
                  cursor: 'pointer',
                  fontWeight: discountPct === d ? 800 : 500
                }}>
                {d === 0 ? 'None' : `${d}%`}
              </button>
            ))}
          </div>

          {/* Financial Breakdown & Total Payable */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.03))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
              <span style={{ color: 'var(--bs-secondary-color, #94a3b8)' }}>Subtotal ({itemCount} items)</span>
              <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
            </div>

            {discountPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: '#f06548' }}>Discount ({discountPct}%)</span>
                <span style={{ fontWeight: 700, color: '#f06548' }}>− {fmt(discountAmt)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: 'var(--bs-secondary-color, #94a3b8)' }}>VAT (7.5% Standard)</span>
              <span style={{ fontWeight: 600 }}>{fmt(vat)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 8,
              borderTop: '2px solid var(--bs-border-color, rgba(255,255,255,0.1))',
              marginTop: 4
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Payable
                </span>
                <div style={{ fontSize: 9, color: 'var(--bs-secondary-color, #94a3b8)' }}>VAT Inclusive</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#0ab39c' }}>
                {fmt(total)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (1-Tap Tender) */}
          <div style={{
            padding: '10px 14px',
            borderTop: '2px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.03))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--bs-secondary-color, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tender Payment
              </span>
              <span style={{ fontSize: 9, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                Hotkeys [F8] Cash · [F9] Card
              </span>
            </div>

            {/* Payment Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
              {[
                { id: 'cash',     label: 'Cash [F8]',       icon: 'ri-money-dollar-circle-line', color: '#0ab39c', bg: 'rgba(10,179,156,0.12)' },
                { id: 'card',     label: 'Card / POS [F9]', icon: 'ri-bank-card-line',           color: '#405189', bg: 'rgba(64,81,137,0.12)'  },
                { id: 'transfer', label: 'Bank Transfer',   icon: 'ri-bank-line',                color: '#f7b84b', bg: 'rgba(247,184,75,0.12)' },
                { id: 'qr',       label: 'QR / USSD',       icon: 'ri-qr-code-line',             color: '#299cdb', bg: 'rgba(41,156,219,0.12)' },
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
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `1.5px solid ${cart.length === 0 ? 'var(--bs-border-color, rgba(255,255,255,0.08))' : m.color + '50'}`,
                    background: cart.length === 0 ? 'var(--bs-body-bg, #0f172a)' : m.bg,
                    cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: cart.length === 0 ? 0.4 : 1,
                    transition: 'all 0.15s ease'
                  }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: m.color + '25',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={m.icon} style={{ fontSize: 16, color: m.color }}></i>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bs-body-color, #fff)', textAlign: 'center', lineHeight: 1.1 }}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Utility Bar: Hold, Invoice, Pay Later, History */}
          <div style={{
            display: 'flex',
            borderTop: '1px solid var(--bs-border-color, rgba(255,255,255,0.08))',
            background: 'var(--bs-body-bg, #0f172a)'
          }}>
            {[
              { label: 'Hold [F4]', icon: 'ri-pause-circle-line',   color: '#0ab39c', modal: 'hold' },
              { label: 'Invoice',   icon: 'ri-file-text-line',      color: '#f06548', modal: 'invoice' },
              { label: 'Pay Later', icon: 'ri-time-line',           color: '#f7b84b', modal: 'paylater' },
              { label: 'History',   icon: 'ri-folder-history-line', color: '#299cdb', modal: 'history' },
            ].map(b => (
              <button
                key={b.label}
                disabled={b.modal === 'hold' && cart.length === 0}
                onClick={() => setActiveModal(b.modal)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 2px',
                  background: 'transparent',
                  border: 'none',
                  cursor: (b.modal === 'hold' && cart.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (b.modal === 'hold' && cart.length === 0) ? 0.4 : 1
                }}>
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: b.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className={b.icon} style={{ fontSize: 14, color: b.color }}></i>
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--bs-secondary-color, #94a3b8)' }}>
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODALS & WORKFLOWS ═══════════════════════════════════════════ */}
      {activeModal && activeModal !== 'success' && (
        <div className="modal-backdrop show" style={{ zIndex: 800 }} onClick={closeModal} />
      )}

      {/* ─── Scanner Basket Modal ───────────────────────────────────────── */}
      {activeModal === 'scanner' && (() => {
        const scSub   = scanCart.reduce((s, i) => s + i.price * i.qty, 0)
        const scVat   = Math.round(scSub * 0.075)
        const scTotal = scSub + scVat

        return (
          <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 760 }}>
              <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #0ab39c, #405189)' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      🛒
                    </div>
                    <div>
                      <h5 className="modal-title mb-0" style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>
                        Scan Basket Terminal
                      </h5>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        High-speed barcode scanner mode · Type or scan + Enter
                      </div>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => { setScanCart([]); closeModal() }}></button>
                </div>

                <div className="modal-body p-0">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bs-border-color)', background: 'var(--bs-body-secondary-bg)' }}>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text" style={{ background: '#0ab39c', border: 'none', color: '#fff', fontSize: 18, paddingInline: 14 }}>
                        <i className="ri-barcode-line"></i>
                      </span>
                      <input
                        ref={scanModalInputRef}
                        type="text"
                        className="form-control"
                        placeholder="Scan barcode or type SKU + Enter..."
                        value={scanCode}
                        autoFocus
                        autoComplete="off"
                        onChange={e => setScanCode(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') scannerAddProduct(scanCode)
                        }}
                        style={{ fontSize: 14, fontWeight: 600 }}
                      />
                      <button
                        className="btn btn-primary px-4"
                        onClick={() => scannerAddProduct(scanCode)}
                        style={{ fontSize: 13, fontWeight: 700 }}>
                        <i className="ri-add-line me-1"></i> Add
                      </button>
                    </div>
                  </div>

                  <div style={{ minHeight: 260, maxHeight: '42vh', overflowY: 'auto' }}>
                    {scanCart.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--bs-secondary-color)' }}>
                        <div style={{ fontSize: 54, marginBottom: 10 }}>📦</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>No items scanned yet</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Point barcode scanner at products to populate basket</div>
                      </div>
                    ) : (
                      scanCart.map((item) => {
                        const color = CAT_COLORS[item.cat] || '#0ab39c'
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '12px 20px',
                              borderBottom: '1px solid var(--bs-border-color)'
                            }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                              {item.icon}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>
                                {item.sku} · {fmt(item.price)} per {item.unit}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
                              <button
                                className="btn btn-outline-secondary"
                                style={{ width: 32, height: 32, padding: 0, fontSize: 16, lineHeight: 1 }}
                                onClick={() => scannerUpdateQty(item.id, item.qty - 1)}>
                                −
                              </button>
                              <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
                                {item.qty}
                              </span>
                              <button
                                className="btn btn-outline-secondary"
                                style={{ width: 32, height: 32, padding: 0, fontSize: 16, lineHeight: 1 }}
                                onClick={() => scannerUpdateQty(item.id, item.qty + 1)}>
                                +
                              </button>
                            </div>
                            <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                              {fmt(item.price * item.qty)}
                            </div>
                            <button
                              className="btn btn-link text-danger p-0"
                              onClick={() => scannerUpdateQty(item.id, 0)}>
                              <i className="ri-delete-bin-6-line" style={{ fontSize: 18 }}></i>
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {scanCart.length > 0 && (
                    <div style={{ padding: '16px 20px', borderTop: '2px solid var(--bs-border-color)', background: 'var(--bs-body-secondary-bg)' }}>
                      <div className="d-flex justify-content-between mb-2" style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                        <span>Subtotal ({scanCart.reduce((s, i) => s + i.qty, 0)} items)</span>
                        <span>{fmt(scSub)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3" style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                        <span>VAT (7.5%)</span>
                        <span>{fmt(scVat)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-4">
                        <span style={{ fontWeight: 800, fontSize: 17 }}>Total Payable</span>
                        <span style={{ fontWeight: 900, fontSize: 22, color: '#0ab39c' }}>{fmt(scTotal)}</span>
                      </div>
                      <div className="d-flex gap-3">
                        <button
                          className="btn btn-outline-primary flex-fill py-2"
                          style={{ fontSize: 14, fontWeight: 700 }}
                          onClick={scannerAddToOrder}>
                          <i className="ri-add-circle-line me-2"></i> Add to Current Order
                        </button>
                        <button
                          className="btn btn-primary flex-fill py-2"
                          style={{ fontSize: 14, fontWeight: 700 }}
                          onClick={scannerQuickPay}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 820 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header px-4 py-3" style={{ background: 'linear-gradient(135deg, #405189, #0ab39c)', flexShrink: 0 }}>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    📥
                  </div>
                  <div>
                    <h5 className="modal-title mb-0" style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>
                      Online & WhatsApp Orders
                    </h5>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                      {onlineOrders.filter(o => o.status === 'new').length} New · {onlineOrders.length} Total Incoming
                    </div>
                  </div>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--bs-border-color)', background: 'var(--bs-body-bg)', flexShrink: 0 }}>
                {[
                  { key: 'all',        label: 'All Orders',  count: onlineOrders.length },
                  { key: 'new',        label: '🔴 New',       count: onlineOrders.filter(o => o.status === 'new').length },
                  { key: 'pending',    label: '🟡 Pending',   count: onlineOrders.filter(o => o.status === 'pending').length },
                  { key: 'processing', label: '🔵 Loaded',    count: onlineOrders.filter(o => o.status === 'processing').length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOnlineFilter(tab.key)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: 'none',
                      borderBottom: onlineFilter === tab.key ? '3px solid #405189' : '3px solid transparent',
                      background: 'transparent',
                      fontWeight: onlineFilter === tab.key ? 700 : 500,
                      fontSize: 12,
                      color: onlineFilter === tab.key ? '#405189' : 'var(--bs-secondary-color)',
                      cursor: 'pointer'
                    }}>
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Order List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
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
                      <div key={order.id} style={{ borderBottom: '1px solid var(--bs-border-color)', padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: ch.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={ch.icon} style={{ fontSize: 20, color: ch.color }}></i>
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: 13 }}>{order.id}</span>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: st.bg, color: st.color, fontWeight: 700 }}>
                                {st.label}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>
                                {ch.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, marginTop: 2 }}>
                              <span style={{ fontWeight: 700 }}>{order.customer}</span>
                              <span style={{ color: 'var(--bs-secondary-color)', marginLeft: 8 }}>{order.phone}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
                              🕐 {order.time} · {order.items.reduce((s, i) => s + i.qty, 0)} items · <strong style={{ color: 'var(--bs-body-color)' }}>{fmt(orderTotal)}</strong>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                              <i className={isExpanded ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                            </button>
                            {order.status !== 'processing' ? (
                              <button
                                className="btn btn-sm btn-primary px-3"
                                onClick={() => loadOnlineOrderToCart(order)}
                                style={{ fontSize: 11, fontWeight: 700 }}>
                                <i className="ri-shopping-cart-2-line me-1"></i> Load to Cart
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#299cdb', fontWeight: 700 }}>
                                <i className="ri-check-double-line me-1"></i> Loaded
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: 10, background: 'var(--bs-body-secondary-bg)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--bs-border-color)', padding: 10 }}>
                            {order.note && (
                              <div style={{ padding: '6px 10px', background: '#f7b84b18', borderRadius: 6, marginBottom: 8, fontSize: 11, color: '#8b6914' }}>
                                <strong>Note:</strong> {order.note}
                              </div>
                            )}
                            {order.items.map(({ productId, qty }) => {
                              const p = productsList.find(x => x.id === productId)
                              if (!p) return null
                              return (
                                <div key={productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                                  <span>{p.icon} {p.name} × {qty}</span>
                                  <span style={{ fontWeight: 700 }}>{fmt(p.price * qty)}</span>
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

      {/* ─── Cash Payment Modal (with 1-Tap Quick Tenders & Numpad) ───────── */}
      {activeModal === 'cash' && (
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #0ab39c, #099885)' }}>
                <div className="d-flex align-items-center gap-2 text-white">
                  <i className="ri-money-dollar-circle-line fs-20"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Cash Tender & Change</h6>
                </div>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <div className="modal-body p-4">
                {/* Total Display */}
                <div className="d-flex justify-content-between align-items-center p-3 rounded mb-3" style={{ background: 'rgba(10,179,156,0.1)' }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', fontWeight: 700 }}>Total Payable</span>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0ab39c' }}>{fmt(total)}</div>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-12 fw-bold">
                    CASH
                  </span>
                </div>

                {/* Cash Received Input */}
                <div className="mb-3">
                  <label className="form-label fw-bold small">Amount Tendered (₦)</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text fw-bold">₦</span>
                    <input
                      type="number"
                      className="form-control fw-bold"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      autoFocus
                      style={{ fontSize: 20 }}
                    />
                    {cashReceived && (
                      <button className="btn btn-outline-secondary" onClick={() => setCashReceived('')}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Tap Quick Tender Buttons */}
                <div className="mb-3">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Quick Tender Options
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {quickCashOptions.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-outline-secondary btn-sm fw-bold py-2"
                        onClick={() => setCashReceived(String(amt))}>
                        {amt === total ? `Exact (${fmt(amt)})` : fmt(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change or Shortage Alert */}
                {cashReceived && Number(cashReceived) >= total && (
                  <div className="alert alert-success d-flex justify-content-between align-items-center mb-4 py-2">
                    <span className="fw-bold">Change Due to Customer</span>
                    <span className="fw-bolder fs-18">{fmt(cashChange)}</span>
                  </div>
                )}
                {cashReceived && Number(cashReceived) < total && (
                  <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4 py-2">
                    <span className="fw-bold">Amount Remaining</span>
                    <span className="fw-bolder fs-18">{fmt(total - Number(cashReceived))}</span>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary w-50 py-2 fw-bold"
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #405189, #2b3a67)' }}>
                <h6 className="modal-title text-white fw-bold d-flex align-items-center gap-2">
                  <i className="ri-bank-card-line"></i> Card / External POS Terminal
                </h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                  <span className="text-muted">Charge on POS Terminal</span>
                  <span className="fw-bolder fs-20 text-primary">{fmt(total)}</span>
                </div>

                <div style={{ background: 'rgba(64,81,137,0.08)', border: '1px solid rgba(64,81,137,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className="ri-bank-card-2-line" style={{ fontSize: 32, color: '#405189', flexShrink: 0 }}></i>
                  <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', lineHeight: 1.5 }}>
                    Swipe/insert customer card on the physical POS machine for <strong style={{ color: 'var(--bs-body-color)' }}>{fmt(total)}</strong>.<br/>
                    Once approved on terminal, click <strong>Confirm Payment</strong> below.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small">Card Type (Optional Record)</label>
                  <div className="d-flex gap-2">
                    {['Visa', 'Mastercard', 'Verve', 'Other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardTab(t.toLowerCase())}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 6,
                          border: cardTab === t.toLowerCase() ? '2px solid #405189' : '1px solid var(--bs-border-color)',
                          background: cardTab === t.toLowerCase() ? 'rgba(64,81,137,0.15)' : 'transparent',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: cardTab === t.toLowerCase() ? '#405189' : 'var(--bs-body-color)'
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50 py-2 fw-bold" onClick={() => confirmPayment('Card / POS')}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #f7b84b, #e09f3e)' }}>
                <h6 className="modal-title text-dark fw-bold">Direct Bank Transfer</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Total Transfer Amount</span>
                  <span className="fw-bolder fs-18">{fmt(total)}</span>
                </div>

                <div className="alert alert-primary mb-3" style={{ fontSize: 12 }}>
                  <div className="fw-bold mb-1">Transfer to: Bems Farms Ltd</div>
                  <div>GTBank · <strong>0123456789</strong></div>
                  <div className="text-muted mt-1">Ref ID: <strong>{orderId}</strong></div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Customer Bank Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. GTBank, Access, Zenith, Kuda"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-bold">Transaction Reference / Session ID</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Enter bank reference number"
                    value={txnRef}
                    onChange={e => setTxnRef(e.target.value)}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50 py-2 fw-bold" onClick={() => confirmPayment('Bank Transfer')}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 360 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-body text-center p-4">
                <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', textTransform: 'uppercase', fontWeight: 700 }}>
                  QR & USSD Payment
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, margin: '6px 0 16px', color: '#0ab39c' }}>
                  {fmt(total)}
                </div>

                <div style={{
                  width: 150,
                  height: 150,
                  margin: '0 auto 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid var(--bs-border-color)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 4
                }}>
                  <i className="ri-qr-code-line" style={{ fontSize: 68, color: '#0ab39c' }}></i>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>SCAN WITH BANK APP</div>
                </div>

                <div style={{
                  background: 'rgba(64,81,137,0.15)',
                  color: 'var(--bs-body-color)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 16,
                  display: 'inline-block'
                }}>
                  *737*000*{total}#
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50 py-2 fw-bold" onClick={() => confirmPayment('QR / USSD')}>
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Split Tender Modal ─────────────────────────────────────────── */}
      {activeModal === 'split' && (
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}>
                <h6 className="modal-title text-white fw-bold">Split Payment Tender</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                  <span className="text-muted">Total Bill</span>
                  <span className="fw-bolder fs-18">{fmt(total)}</span>
                </div>

                <div className="d-flex flex-column gap-2 mb-3">
                  {splitRows.map((row, i) => (
                    <div key={i} className="border rounded p-2" style={{ background: 'var(--bs-body-secondary-bg)' }}>
                      <div className="row g-2 align-items-center">
                        <div className="col-5">
                          <select className="form-select form-select-sm" value={row.method} onChange={e => updateSplit(i, 'method', e.target.value)}>
                            {['Cash', 'Card / POS', 'Bank Transfer', 'QR / USSD', 'Wallet'].map(m => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-5">
                          <input
                            type="number"
                            className="form-control form-control-sm"
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

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addSplitRow}>
                    <i className="ri-add-line me-1"></i> Add Split Method
                  </button>
                  <div style={{ fontSize: 12 }}>
                    Allocated: <strong>{fmt(splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</strong> / {fmt(total)}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50 py-2 fw-bold" onClick={() => confirmPayment('Split Payment')}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #0ab39c, #405189)' }}>
                <h6 className="modal-title text-white fw-bold">Hold Bill [F4]</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3" style={{ background: 'var(--bs-body-secondary-bg)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Held Amount</span>
                    <strong className="fs-16">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Hold Reference / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Table 4 / Mrs Okonkwo"
                    value={holdRef}
                    onChange={e => setHoldRef(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-bold">Hold Note</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Optional details..."
                    value={holdNote}
                    onChange={e => setHoldNote(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50 py-2 fw-bold" onClick={doHold}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 660 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #405189, #0ab39c)' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-file-text-line fs-20 text-white"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Invoice Preview · {orderId}</h6>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="border p-3 rounded mb-3" style={{ background: 'var(--bs-body-secondary-bg)' }}>
                  <div className="d-flex justify-content-between mb-2">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0ab39c' }}>🌾 BEMS FARMS LTD</div>
                      <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>Fresh Grocery & Agricultural Retail</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11 }}>
                      <div><strong>Date:</strong> {new Date().toLocaleDateString('en-NG')}</div>
                      <div><strong>Bill:</strong> {orderId}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <strong>Customer:</strong> {customer?.name || 'Walk-in Customer'} {customer?.phone && `(${customer.phone})`}
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-sm table-borderless align-middle">
                    <thead>
                      <tr className="border-bottom text-muted" style={{ fontSize: 11 }}>
                        <th>ITEM</th>
                        <th className="text-center">QTY</th>
                        <th className="text-end">PRICE</th>
                        <th className="text-end">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: 12 }}>
                      {cart.map(i => (
                        <tr key={i.id}>
                          <td>{i.icon} {i.name}</td>
                          <td className="text-center">{i.qty}</td>
                          <td className="text-end">{fmt(i.price)}</td>
                          <td className="text-end fw-bold">{fmt(i.price * i.qty)}</td>
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
                      <tr className="border-top fs-14 fw-bold">
                        <td colSpan="3" className="text-end">Total Payable</td>
                        <td className="text-end text-success fw-bolder">{fmt(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary w-50" onClick={() => window.print()}>
                    <i className="ri-printer-line me-1"></i> Print
                  </button>
                  <button className="btn btn-primary w-50" onClick={closeModal}>
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #f7b84b, #d97706)' }}>
                <h6 className="modal-title text-dark fw-bold">Pay Later / Credit Sale</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3" style={{ background: 'var(--bs-body-secondary-bg)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Credit Amount</span>
                    <strong className="fs-16">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Customer Name / Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter customer name"
                    value={payLaterCust || customer?.name || ''}
                    onChange={e => setPayLaterCust(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-bold">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={payLaterDate}
                    onChange={e => setPayLaterDate(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-50 py-2 fw-semibold" onClick={closeModal}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-warning w-50 py-2 fw-bold text-dark"
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
        <div className="modal show d-block" style={{ zIndex: 810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 740 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header py-3 px-4" style={{ background: 'linear-gradient(135deg, #299cdb, #405189)' }}>
                <h6 className="modal-title text-white fw-bold">Recent POS Sales & Receipts</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
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
                          <td className="fw-bold text-primary">{h.inv}</td>
                          <td>{h.cust}</td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {h.method}
                            </span>
                          </td>
                          <td className="text-muted">{h.time}</td>
                          <td className="text-end fw-bold">{fmt(h.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer p-3">
                <button className="btn btn-secondary w-100" onClick={closeModal}>Close History</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Success Modal ──────────────────────────────────────── */}
      {activeModal === 'success' && successData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{
            backgroundColor: 'var(--bs-modal-bg, #1e293b)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 390,
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            border: '1px solid var(--bs-modal-border-color, rgba(255,255,255,0.1))',
            padding: 24,
            textAlign: 'center'
          }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ab39c, #2ec4b0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: 32,
              color: '#fff',
              boxShadow: '0 8px 24px rgba(10,179,156,0.35)'
            }}>
              ✓
            </div>

            <h5 style={{ fontWeight: 800, marginBottom: 4, color: 'var(--bs-body-color, #fff)' }}>
              Payment Completed!
            </h5>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color, #94a3b8)', marginBottom: 16 }}>
              Receipt {successData.orderId}
            </div>

            <div style={{
              background: 'var(--bs-body-secondary-bg, rgba(255,255,255,0.04))',
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              textAlign: 'left',
              fontSize: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--bs-secondary-color)' }}>Customer</span>
                <strong style={{ color: 'var(--bs-body-color)' }}>{successData.customer?.name || 'Walk-in'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--bs-secondary-color)' }}>Payment Method</span>
                <strong style={{ color: '#0ab39c' }}>{successData.method}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--bs-secondary-color)' }}>Total Charged</span>
                <strong style={{ fontSize: 14, color: 'var(--bs-body-color)' }}>{fmt(successData.total)}</strong>
              </div>
              {successData.method === 'Cash' && successData.change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--bs-border-color)' }}>
                  <span style={{ color: '#f7b84b', fontWeight: 700 }}>Change Returned</span>
                  <strong style={{ color: '#f7b84b', fontSize: 13 }}>{fmt(successData.change)}</strong>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button className="btn btn-outline-secondary flex-fill btn-sm py-2" onClick={() => window.print()}>
                <i className="ri-printer-line me-1"></i> Print Receipt
              </button>
            </div>

            <button className="btn btn-primary w-100 py-2 fw-bold" onClick={newOrder}>
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
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 820, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: 'var(--bs-modal-bg, #1e293b)', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0ab39c', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28, color: '#fff' }}>
                  ✓
                </div>
                <h6 className="fw-bold mb-1" style={{ color: 'var(--bs-body-color, #fff)' }}>Return Processed</h6>
                <div className="text-muted mb-3" style={{ fontSize: 12 }}>Ref: {returnSuccess.ref}</div>
                <div className="rounded p-3 mb-3" style={{ background: 'var(--bs-body-secondary-bg)', fontSize: 12, textAlign: 'left' }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Refund Amount</span>
                    <span className="fw-bold text-danger">{fmt(returnSuccess.total)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Method</span>
                    <span>{returnSuccess.method}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Goods Condition</span>
                    <span>{{ resalable: 'Back to stock', damaged: 'Written off', partial: 'Split' }[returnSuccess.condition]}</span>
                  </div>
                </div>
                <button className="btn btn-primary w-100 py-2 fw-bold" onClick={closeModal}>Done</button>
              </div>
            </div>
          )
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 820, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--bs-modal-bg, #1e293b)', borderRadius: 16, maxWidth: 580, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bs-border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bs-body-secondary-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #f06548, #e04b2f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <i className="ri-arrow-go-back-line"></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Goods Return & Refund</div>
                    <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>Step {returnStep} of 2</div>
                  </div>
                </div>
                <button className="btn-close" onClick={closeModal}></button>
              </div>

              <div style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>
                {returnStep === 1 ? (
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-bold small">Product Being Returned</label>
                      <select
                        className="form-select form-select-sm"
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
                      <label className="form-label fw-bold small">Customer Name</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Walk-in / Customer name"
                        value={returnForm.customer}
                        onChange={e => setReturnForm(f => ({ ...f, customer: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone (optional)</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="0800 000 0000"
                        value={returnForm.phone}
                        onChange={e => setReturnForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Quantity</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="1"
                        value={returnForm.qty}
                        onChange={e => setReturnForm(f => ({ ...f, qty: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Unit Price (₦)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="0"
                        value={returnForm.unitPrice}
                        onChange={e => setReturnForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Refund Value</label>
                      <input
                        className="form-control form-control-sm fw-bold text-danger"
                        readOnly
                        value={fmt(retTotal)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Reason for Return</label>
                      <select
                        className="form-select form-select-sm"
                        value={returnForm.reason}
                        onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}>
                        {POS_RETURN_REASONS.map(r => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Customer Notes</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Customer remarks..."
                        value={returnForm.notes}
                        onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 d-flex gap-2 pt-2">
                      <button className="btn btn-light w-50 py-2" onClick={closeModal}>Cancel</button>
                      <button
                        className="btn btn-danger w-50 py-2 fw-bold"
                        onClick={() => setReturnStep(2)}
                        disabled={!returnForm.product || returnForm.qty < 1}>
                        Next: Condition & Refund
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="p-3 rounded mb-3" style={{ background: 'var(--bs-body-secondary-bg)', fontSize: 12 }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Item</span>
                        <strong>{returnForm.product?.name} × {returnForm.qty}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Total Refund</span>
                        <strong className="text-danger fs-14">{fmt(retTotal)}</strong>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small">Condition of Goods</label>
                      <div className="row g-2">
                        {[
                          { val: 'resalable', title: 'Resalable', desc: 'Restock immediately', color: '#0ab39c' },
                          { val: 'damaged',   title: 'Damaged',   desc: 'Write off loss',      color: '#f06548' },
                          { val: 'partial',   title: 'Partial',   desc: 'Partially good',      color: '#f7b84b' },
                        ].map(opt => (
                          <div className="col-4" key={opt.val}>
                            <div
                              onClick={() => setReturnForm(f => ({ ...f, condition: opt.val }))}
                              style={{
                                padding: '10px 6px',
                                borderRadius: 8,
                                border: `2px solid ${returnForm.condition === opt.val ? opt.color : 'var(--bs-border-color)'}`,
                                background: returnForm.condition === opt.val ? `${opt.color}15` : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'center'
                              }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: opt.color }}>{opt.title}</div>
                              <div className="text-muted mt-1" style={{ fontSize: 9 }}>{opt.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-bold small">Refund Payment Method</label>
                      <div className="d-flex gap-2">
                        {['Cash', 'Wallet Credit', 'Bank Transfer'].map(m => (
                          <button
                            key={m}
                            type="button"
                            className={`btn btn-sm flex-grow-1 ${returnForm.refundMethod === m ? 'btn-danger' : 'btn-outline-secondary'}`}
                            onClick={() => setReturnForm(f => ({ ...f, refundMethod: m }))}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-light py-2" onClick={() => setReturnStep(1)}>Back</button>
                      <button className="btn btn-danger flex-grow-1 py-2 fw-bold" onClick={submitReturn}>
                        Complete Return & Refund {fmt(retTotal)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ SCAN TOAST NOTIFICATION ══════════════════════════════════════ */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 999,
          padding: '10px 16px',
          borderRadius: 8,
          background: toast.type === 'error' ? '#f06548' : '#0ab39c',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease',
          maxWidth: 320
        }}>
          <span style={{ fontSize: 18 }}>{toast.icon}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Global POS CSS overrides */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        body.sidebar-hidden { background: var(--bs-body-bg, #0f172a) !important; }
        body.sidebar-hidden .page-wrapper { display: none !important; }
        body.sidebar-hidden #main-sidebar { display: none !important; }
        body.sidebar-hidden #main-topbar  { display: none !important; }
      `}</style>
    </div>
  )
}
